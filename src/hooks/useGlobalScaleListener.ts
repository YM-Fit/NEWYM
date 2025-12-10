import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { findTraineeByWeight, TraineeMatch, ScaleReading } from './useScaleListener';

export interface IdentifiedReading {
  reading: ScaleReading;
  matches: TraineeMatch[];
  bestMatch: TraineeMatch | null;
  timestamp: Date;
}

export interface UseGlobalScaleListenerResult {
  recentReadings: IdentifiedReading[];
  latestReading: IdentifiedReading | null;
  isListening: boolean;
  clearReadings: () => void;
}

const MAX_READINGS_TO_KEEP = 20;
const READING_TTL_MS = 24 * 60 * 60 * 1000;

export function useGlobalScaleListener(
  trainerId: string | null,
  onNewReading?: (reading: IdentifiedReading) => void
): UseGlobalScaleListenerResult {
  const [recentReadings, setRecentReadings] = useState<IdentifiedReading[]>([]);
  const [latestReading, setLatestReading] = useState<IdentifiedReading | null>(null);
  const [isListening, setIsListening] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewReadingRef = useRef(onNewReading);

  useEffect(() => {
    onNewReadingRef.current = onNewReading;
  }, [onNewReading]);

  const processNewReading = useCallback(async (reading: ScaleReading) => {
    if (!reading.weight_kg || reading.weight_kg <= 0) return;
    if (!reading.is_stable) return;

    const matches = await findTraineeByWeight(
      reading.weight_kg,
      reading.body_fat_percent,
      trainerId
    );

    const bestMatch = matches.length > 0 && matches[0].confidenceScore >= 50
      ? matches[0]
      : null;

    const identifiedReading: IdentifiedReading = {
      reading,
      matches,
      bestMatch,
      timestamp: new Date(reading.created_at),
    };

    setLatestReading(identifiedReading);
    setRecentReadings(prev => {
      const updated = [identifiedReading, ...prev];
      const filtered = updated
        .filter(r => Date.now() - r.timestamp.getTime() < READING_TTL_MS)
        .slice(0, MAX_READINGS_TO_KEEP);
      return filtered;
    });

    if (onNewReadingRef.current) {
      onNewReadingRef.current(identifiedReading);
    }
  }, [trainerId]);

  const clearReadings = useCallback(() => {
    setRecentReadings([]);
    setLatestReading(null);
  }, []);

  useEffect(() => {
    if (!trainerId) return;

    const channel = supabase
      .channel('global-scale-readings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scale_readings',
        },
        (payload) => {
          const newReading = payload.new as ScaleReading;
          processNewReading(newReading);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsListening(true);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsListening(false);
    };
  }, [trainerId, processNewReading]);

  return {
    recentReadings,
    latestReading,
    isListening,
    clearReadings,
  };
}
