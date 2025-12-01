import { useEffect, useState } from 'react';
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

export interface UseScaleListenerResult {
  latestReading: ScaleReading | null;
  isListening: boolean;
  error: string | null;
}

const RECENT_THRESHOLD_SECONDS = 30;

export function useScaleListener(): UseScaleListenerResult {
  const [latestReading, setLatestReading] = useState<ScaleReading | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtimeListener = async () => {
      try {
        setIsListening(true);
        setError(null);

        channel = supabase
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

              const readingTime = new Date(newReading.created_at).getTime();
              const currentTime = Date.now();
              const ageInSeconds = (currentTime - readingTime) / 1000;

              if (ageInSeconds <= RECENT_THRESHOLD_SECONDS) {
                console.log('📊 New scale reading received:', newReading);
                setLatestReading(newReading);
              } else {
                console.log('⏰ Scale reading too old, ignoring:', ageInSeconds, 'seconds');
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Subscribed to scale readings channel');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Error subscribing to scale readings');
              setError('Failed to subscribe to scale readings');
              setIsListening(false);
            } else if (status === 'TIMED_OUT') {
              console.error('⏱️ Subscription timed out');
              setError('Subscription timed out');
              setIsListening(false);
            }
          });
      } catch (err) {
        console.error('Error setting up realtime listener:', err);
        setError('Failed to set up listener');
        setIsListening(false);
      }
    };

    setupRealtimeListener();

    return () => {
      if (channel) {
        console.log('🔌 Unsubscribing from scale readings channel');
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    latestReading,
    isListening,
    error,
  };
}
