import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

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
}

export type ConnectionStatus = 'connected' | 'stale' | 'disconnected';

export interface UseScaleListenerResult {
  latestReading: ScaleReading | null;
  isListening: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  lastDataReceived: Date | null;
  refreshConnection: () => void;
}

const RECENT_THRESHOLD_SECONDS = 5;
const STALE_THRESHOLD_SECONDS = 30;
const HEARTBEAT_INTERVAL_MS = 10000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

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

export function useScaleListener(): UseScaleListenerResult {
  const [latestReading, setLatestReading] = useState<ScaleReading | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastDataReceived, setLastDataReceived] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      console.log('🔌 Unsubscribing from scale readings channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
  }, []);

  const setupRealtimeListener = useCallback(async (attempt: number = 1) => {
    try {
      cleanup();

      setIsListening(true);
      setError(null);
      setConnectionStatus('disconnected');

      console.log(`🔄 Setting up Tanita scale listener (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})...`);

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
            const now = new Date();

            console.log('📊 Tanita data received:', newReading, 'at:', now);

            const readingTime = new Date(newReading.created_at).getTime();
            const currentTime = now.getTime();
            const ageInSeconds = (currentTime - readingTime) / 1000;

            if (ageInSeconds <= RECENT_THRESHOLD_SECONDS) {
              const validation = validateScaleData(newReading);

              if (!validation.valid) {
                console.warn('⚠️ Tanita data validation warnings:', validation.warnings);
                validation.warnings.forEach(warning => {
                  console.warn(`  - ${warning}`);
                });
              }

              setLatestReading(newReading);
              setLastDataReceived(now);
              setConnectionStatus('connected');
              setRetryCount(0);

              console.log('✅ Scale data accepted:', {
                weight: newReading.weight_kg,
                bodyFat: newReading.body_fat_percent,
                age: ageInSeconds.toFixed(1) + 's',
                valid: validation.valid,
              });
            } else {
              console.log('⏰ Scale reading too old, ignoring:', ageInSeconds.toFixed(1), 'seconds');
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status:', status);

          if (status === 'SUBSCRIBED') {
            console.log('✅ Subscribed to Tanita scale readings channel');
            setConnectionStatus('connected');
            setRetryCount(0);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to scale readings');
            setError('Failed to subscribe to scale readings');
            setConnectionStatus('disconnected');

            if (attempt < MAX_RETRY_ATTEMPTS) {
              console.log(`🔄 Retrying in ${RETRY_DELAY_MS / 1000}s...`);
              setTimeout(() => {
                setRetryCount(attempt);
                setupRealtimeListener(attempt + 1);
              }, RETRY_DELAY_MS);
            } else {
              setIsListening(false);
              console.error('❌ Max retry attempts reached');
            }
          } else if (status === 'TIMED_OUT') {
            console.error('⏱️ Subscription timed out');
            setError('Subscription timed out');
            setConnectionStatus('disconnected');

            if (attempt < MAX_RETRY_ATTEMPTS) {
              console.log(`🔄 Retrying in ${RETRY_DELAY_MS / 1000}s...`);
              setTimeout(() => {
                setRetryCount(attempt);
                setupRealtimeListener(attempt + 1);
              }, RETRY_DELAY_MS);
            } else {
              setIsListening(false);
            }
          }
        });

      channelRef.current = channel;

      heartbeatIntervalRef.current = setInterval(() => {
        if (channelRef.current) {
          console.log('💓 Heartbeat check - channel active');
        }
      }, HEARTBEAT_INTERVAL_MS);

      statusCheckIntervalRef.current = setInterval(() => {
        if (lastDataReceived) {
          const secondsSinceLastData = (Date.now() - lastDataReceived.getTime()) / 1000;

          if (secondsSinceLastData > STALE_THRESHOLD_SECONDS) {
            console.warn(`⚠️ No data received for ${secondsSinceLastData.toFixed(0)}s`);
            setConnectionStatus('stale');
          }
        }
      }, 5000);

    } catch (err) {
      console.error('❌ Error setting up realtime listener:', err);
      setError('Failed to set up listener');
      setIsListening(false);
      setConnectionStatus('disconnected');

      if (attempt < MAX_RETRY_ATTEMPTS) {
        console.log(`🔄 Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        setTimeout(() => {
          setRetryCount(attempt);
          setupRealtimeListener(attempt + 1);
        }, RETRY_DELAY_MS);
      }
    }
  }, [cleanup, lastDataReceived]);

  const refreshConnection = useCallback(() => {
    console.log('🔄 Manual refresh requested');
    setRetryCount(0);
    setupRealtimeListener(1);
  }, [setupRealtimeListener]);

  useEffect(() => {
    setupRealtimeListener();
    return cleanup;
  }, [setupRealtimeListener, cleanup]);

  return {
    latestReading,
    isListening,
    error,
    connectionStatus,
    lastDataReceived,
    refreshConnection,
  };
}
