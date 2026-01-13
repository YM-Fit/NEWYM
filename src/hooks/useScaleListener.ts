import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export interface ScaleReading {
  id: number;
  created_at: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  fat_mass_kg: number | null;
  fat_free_mass_kg: number | null;
  water_kg: number | null;
  water_percent: number | null;
  bmi: number | null;
  device_id?: string;
  is_stable?: boolean;
  notes?: string;
}

export interface ScriptStatus {
  isOnline: boolean;
  lastHeartbeat: Date | null;
  deviceName: string;
}

export interface TraineeMatch {
  traineeId: string;
  traineeName: string;
  lastWeight: number;
  lastBodyFat: number | null;
  weightDiff: number;
  confidenceScore: number;
}

export type ConnectionStatus = 'connected' | 'stale' | 'disconnected';

export interface UseScaleListenerResult {
  latestReading: ScaleReading | null;
  isListening: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  scriptStatus: ScriptStatus;
  lastDataReceived: Date | null;
  refreshConnection: () => void;
  isStabilizing: boolean;
  retryAttempt: number;
  maxRetries: number;
}

const RECENT_THRESHOLD_SECONDS = 5;
const STALE_THRESHOLD_SECONDS = 30;
const HEARTBEAT_CHECK_INTERVAL_MS = 5000;
const MAX_RETRY_ATTEMPTS = 5;
const DEBOUNCE_WINDOW_MS = 3000;
const SCRIPT_OFFLINE_THRESHOLD_SECONDS = 30;

function getRetryDelay(attempt: number): number {
  return Math.min(2000 * Math.pow(2, attempt - 1), 16000);
}

function validateScaleData(reading: ScaleReading): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (reading.weight_kg !== null) {
    if (reading.weight_kg < 20 || reading.weight_kg > 300) {
      warnings.push(`משקל חריג: ${reading.weight_kg} ק"ג (טווח תקין: 20-300)`);
    }
  }

  if (reading.body_fat_percent !== null) {
    if (reading.body_fat_percent < 3 || reading.body_fat_percent > 60) {
      warnings.push(`אחוז שומן חריג: ${reading.body_fat_percent}% (טווח תקין: 3-60)`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

export function useScaleListener(deviceId: string = 'default'): UseScaleListenerResult {
  const [latestReading, setLatestReading] = useState<ScaleReading | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastDataReceived, setLastDataReceived] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [scriptStatus, setScriptStatus] = useState<ScriptStatus>({
    isOnline: false,
    lastHeartbeat: null,
    deviceName: 'Tanita Scale',
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatChannelRef = useRef<RealtimeChannel | null>(null);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingReadingsRef = useRef<ScaleReading[]>([]);
  const lastProcessedWeightRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (heartbeatChannelRef.current) {
      supabase.removeChannel(heartbeatChannelRef.current);
      heartbeatChannelRef.current = null;
    }

    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);

  const checkScriptStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_scale_device_status', { p_device_id: deviceId });

      if (!error && data && data.length > 0) {
        const status = data[0];
        setScriptStatus({
          isOnline: status.is_online,
          lastHeartbeat: status.last_heartbeat ? new Date(status.last_heartbeat) : null,
          deviceName: status.device_name || 'Tanita Scale',
        });
      } else {
        setScriptStatus(prev => ({
          ...prev,
          isOnline: false,
        }));
      }
    } catch (err) {
      logger.error('Error checking script status:', err, 'useScaleListener');
    }
  }, [deviceId]);

  const processReading = useCallback((reading: ScaleReading) => {
    const validation = validateScaleData(reading);

    if (!validation.valid) {
      logger.warn('Tanita data validation warnings:', validation.warnings, 'useScaleListener');
    }

    if (reading.weight_kg !== null && reading.weight_kg > 0) {
      if (lastProcessedWeightRef.current !== null) {
        const weightDiff = Math.abs(reading.weight_kg - lastProcessedWeightRef.current);
        if (weightDiff > 2) {
          logger.warn(`Large weight jump detected: ${weightDiff.toFixed(1)} kg`, undefined, 'useScaleListener');
        }
      }
      lastProcessedWeightRef.current = reading.weight_kg;
    }

    setLatestReading(reading);
    setLastDataReceived(new Date());
    setConnectionStatus('connected');
    setRetryCount(0);
    setIsStabilizing(false);
  }, []);

  const handleNewReading = useCallback((newReading: ScaleReading) => {
    const now = new Date();
    const readingTime = new Date(newReading.created_at).getTime();
    const currentTime = now.getTime();
    const ageInSeconds = (currentTime - readingTime) / 1000;

    if (ageInSeconds > RECENT_THRESHOLD_SECONDS) {
      return;
    }

    if (newReading.weight_kg === null || newReading.weight_kg <= 0) {
      return;
    }

    if (newReading.is_stable) {
      processReading(newReading);
      return;
    }

    pendingReadingsRef.current.push(newReading);
    setIsStabilizing(true);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const readings = pendingReadingsRef.current;
      if (readings.length > 0) {
        const latestPending = readings[readings.length - 1];
        processReading(latestPending);
      }
      pendingReadingsRef.current = [];
    }, DEBOUNCE_WINDOW_MS);
  }, [processReading]);

  const setupRealtimeListener = useCallback(async (attempt: number = 1) => {
    try {
      cleanup();

      setIsListening(true);
      setError(null);
      setConnectionStatus('disconnected');
      setRetryCount(attempt - 1);

      const channel = supabase
        .channel('scale-readings-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'scale_readings',
          },
          (payload) => {
            const newReading = payload.new as ScaleReading;

            if (newReading.device_id && newReading.device_id !== deviceId && deviceId !== 'default') {
              return;
            }

            handleNewReading(newReading);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            setRetryCount(0);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logger.error(`Subscription ${status === 'CHANNEL_ERROR' ? 'error' : 'timed out'}`, undefined, 'useScaleListener');
            setError(status === 'CHANNEL_ERROR' ? 'Failed to subscribe' : 'Subscription timed out');
            setConnectionStatus('disconnected');

            if (attempt < MAX_RETRY_ATTEMPTS) {
              const delay = getRetryDelay(attempt);
              setTimeout(() => {
                setRetryCount(attempt);
                setupRealtimeListener(attempt + 1);
              }, delay);
            } else {
              setIsListening(false);
              setError('הגעת למספר המקסימלי של ניסיונות חיבור. לחץ על רענן לניסיון נוסף.');
              logger.error('Max retry attempts reached', undefined, 'useScaleListener');
            }
          }
        });

      channelRef.current = channel;

      const heartbeatChannel = supabase
        .channel('scale-heartbeats-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'scale_heartbeats',
            filter: `device_id=eq.${deviceId}`,
          },
          (payload) => {
            const heartbeat = payload.new as { device_id: string; device_name: string; created_at: string };
            setScriptStatus({
              isOnline: true,
              lastHeartbeat: new Date(heartbeat.created_at),
              deviceName: heartbeat.device_name || 'Tanita Scale',
            });
          }
        )
        .subscribe();

      heartbeatChannelRef.current = heartbeatChannel;

      await checkScriptStatus();

      statusCheckIntervalRef.current = setInterval(() => {
        if (lastDataReceived) {
          const secondsSinceLastData = (Date.now() - lastDataReceived.getTime()) / 1000;
          if (secondsSinceLastData > STALE_THRESHOLD_SECONDS) {
            setConnectionStatus('stale');
          }
        }

        if (scriptStatus.lastHeartbeat) {
          const secondsSinceHeartbeat = (Date.now() - scriptStatus.lastHeartbeat.getTime()) / 1000;
          if (secondsSinceHeartbeat > SCRIPT_OFFLINE_THRESHOLD_SECONDS) {
            setScriptStatus(prev => ({ ...prev, isOnline: false }));
          }
        }
      }, HEARTBEAT_CHECK_INTERVAL_MS);

    } catch (err) {
      logger.error('Error setting up realtime listener:', err, 'useScaleListener');
      setError('Failed to set up listener');
      setIsListening(false);
      setConnectionStatus('disconnected');

      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = getRetryDelay(attempt);
        setTimeout(() => {
          setRetryCount(attempt);
          setupRealtimeListener(attempt + 1);
        }, delay);
      }
    }
  }, [cleanup, deviceId, handleNewReading, checkScriptStatus, lastDataReceived, scriptStatus.lastHeartbeat]);

  const refreshConnection = useCallback(() => {
    setRetryCount(0);
    setError(null);
    setupRealtimeListener(1);
  }, [setupRealtimeListener]);

  useEffect(() => {
    setupRealtimeListener();
    return cleanup;
  }, []);

  return {
    latestReading,
    isListening,
    error,
    connectionStatus,
    scriptStatus,
    lastDataReceived,
    refreshConnection,
    isStabilizing,
    retryAttempt: retryCount,
    maxRetries: MAX_RETRY_ATTEMPTS,
  };
}

export async function findTraineeByWeight(
  weight: number,
  bodyFat: number | null = null,
  trainerId: string | null = null
): Promise<TraineeMatch[]> {
  try {
    const { data, error } = await supabase.rpc('find_trainee_by_weight', {
      p_weight: weight,
      p_body_fat: bodyFat,
      p_trainer_id: trainerId,
    });

    if (error) {
      logger.error('Error finding trainee by weight:', error, 'useScaleListener');
      return [];
    }

    return (data || []).map((row: { trainee_id: string; trainee_name: string; last_weight: number; last_body_fat: number | null; weight_diff: number; confidence_score: number }) => ({
      traineeId: row.trainee_id,
      traineeName: row.trainee_name,
      lastWeight: row.last_weight,
      lastBodyFat: row.last_body_fat,
      weightDiff: row.weight_diff,
      confidenceScore: row.confidence_score,
    }));
  } catch (err) {
    logger.error('Error in findTraineeByWeight:', err, 'useScaleListener');
    return [];
  }
}
