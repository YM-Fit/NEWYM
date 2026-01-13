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
  loadingInitial: boolean;
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
  const [loadingInitial, setLoadingInitial] = useState(true);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewReadingRef = useRef(onNewReading);
  const processedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    onNewReadingRef.current = onNewReading;
  }, [onNewReading]);

  const processReading = useCallback(async (
    reading: ScaleReading,
    isNew: boolean = false
  ): Promise<IdentifiedReading | null> => {
    if (!reading.weight_kg || reading.weight_kg <= 0) return null;
    if (reading.is_stable === false) return null;

    if (processedIdsRef.current.has(reading.id)) return null;
    processedIdsRef.current.add(reading.id);

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

    if (isNew) {
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
    }

    return identifiedReading;
  }, [trainerId]);

  const loadRecentReadings = useCallback(async () => {
    if (!trainerId) return;

    setLoadingInitial(true);
    try {
      const oneDayAgo = new Date(Date.now() - READING_TTL_MS).toISOString();
      const { data, error } = await supabase
        .from('scale_readings')
        .select('*')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(MAX_READINGS_TO_KEEP);

      if (error) {
        console.error('Error loading scale readings:', error);
        return;
      }

      if (data && data.length > 0) {
        // Process readings in parallel for better performance
        const identifiedReadingsPromises = data.map((reading) =>
          processReading(reading as ScaleReading, false)
        );
        const identifiedReadings = (await Promise.all(identifiedReadingsPromises)).filter(
          (reading): reading is IdentifiedReading => reading !== null
        );

        setRecentReadings(identifiedReadings);
        if (identifiedReadings.length > 0) {
          setLatestReading(identifiedReadings[0]);
        }
      }
    } finally {
      setLoadingInitial(false);
    }
  }, [trainerId, processReading]);

  const clearReadings = useCallback(() => {
    setRecentReadings([]);
    setLatestReading(null);
    processedIdsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!trainerId) {
      setIsListening(false);
      return;
    }

    loadRecentReadings();

    const channel = supabase
      .channel(`global-scale-readings-${trainerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scale_readings',
        },
        (payload) => {
          const newReading = payload.new as ScaleReading;
          processReading(newReading, true);
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
      // Clear processed IDs when trainer changes
      processedIdsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainerId]); // Only depend on trainerId to avoid unnecessary re-subscriptions

  return {
    recentReadings,
    latestReading,
    isListening,
    clearReadings,
    loadingInitial,
  };
}
