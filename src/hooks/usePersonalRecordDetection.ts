import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { TvWorkout, TvWorkoutExercise } from './useCurrentTvSession';

export interface PersonalRecordEvent {
  exerciseId: string;
  exerciseName: string;
  type: 'max_weight' | 'max_reps' | 'max_volume';
  oldValue: number;
  newValue: number;
  timestamp: string;
}

interface PersonalRecordState {
  records: PersonalRecordEvent[];
  latestRecord: PersonalRecordEvent | null;
}

export function usePersonalRecordDetection(
  traineeId: string | null,
  workout: TvWorkout | null
): PersonalRecordState {
  const [records, setRecords] = useState<PersonalRecordEvent[]>([]);
  const [latestRecord, setLatestRecord] = useState<PersonalRecordEvent | null>(null);
  const processedSetsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!traineeId || !workout || !workout.exercises) {
      processedSetsRef.current.clear();
      setRecords([]);
      setLatestRecord(null);
      return;
    }

    const checkForPersonalRecords = async () => {
      try {
        // Get current personal records from database
        const { data: existingRecords } = await supabase
          .from('personal_records')
          .select('*')
          .eq('trainee_id', traineeId);

        if (!existingRecords) return;

        const newRecords: PersonalRecordEvent[] = [];

        // Check each exercise in the current workout
        for (const exercise of workout.exercises) {
          if (!exercise.sets || exercise.sets.length === 0) continue;

          // Find the best set for this exercise (max weight, max reps, max volume)
          let maxWeight = 0;
          let maxReps = 0;
          let maxVolume = 0;
          let bestSet: { weight: number; reps: number } | null = null;

          exercise.sets.forEach(set => {
            const weight = set.weight || 0;
            const reps = set.reps || 0;
            const volume = weight * reps;

            if (weight > maxWeight) maxWeight = weight;
            if (reps > maxReps) maxReps = reps;
            if (volume > maxVolume) {
              maxVolume = volume;
              bestSet = { weight, reps };
            }
          });

          if (!bestSet || bestSet.weight === 0 || bestSet.reps === 0) continue;

          const setKey = `${exercise.id}-${bestSet.weight}-${bestSet.reps}`;
          if (processedSetsRef.current.has(setKey)) continue;

          // Check against existing records
          const exerciseRecords = existingRecords.filter(
            r => r.exercise_id === exercise.id
          );

          // Check max weight
          const weightRecord = exerciseRecords.find(r => r.record_type === 'max_weight');
          if (!weightRecord || bestSet.weight > (weightRecord.weight || 0)) {
            newRecords.push({
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              type: 'max_weight',
              oldValue: weightRecord?.weight || 0,
              newValue: bestSet.weight,
              timestamp: new Date().toISOString(),
            });
          }

          // Check max reps
          const repsRecord = exerciseRecords.find(r => r.record_type === 'max_reps');
          if (!repsRecord || bestSet.reps > (repsRecord.reps || 0)) {
            newRecords.push({
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              type: 'max_reps',
              oldValue: repsRecord?.reps || 0,
              newValue: bestSet.reps,
              timestamp: new Date().toISOString(),
            });
          }

          // Check max volume
          const volumeRecord = exerciseRecords.find(r => r.record_type === 'max_volume');
          const currentVolume = bestSet.weight * bestSet.reps;
          if (!volumeRecord || currentVolume > (volumeRecord.volume || 0)) {
            newRecords.push({
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              type: 'max_volume',
              oldValue: volumeRecord?.volume || 0,
              newValue: currentVolume,
              timestamp: new Date().toISOString(),
            });
          }

          processedSetsRef.current.add(setKey);
        }

        if (newRecords.length > 0) {
          // Add new records to the list
          setRecords(prev => {
            const combined = [...prev, ...newRecords];
            // Keep only the last 10 records
            return combined.slice(-10);
          });

          // Set the latest record
          const latest = newRecords[newRecords.length - 1];
          setLatestRecord(latest);

          // Clear latest record after 5 seconds
          setTimeout(() => {
            setLatestRecord(null);
          }, 5000);
        }
      } catch (err) {
        logger.error('Error detecting personal records:', err, 'usePersonalRecordDetection');
      }
    };

    // Check for records whenever workout exercises change
    checkForPersonalRecords();

    // Also set up a periodic check (every 3 seconds) to catch new sets
    const interval = setInterval(checkForPersonalRecords, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [traineeId, workout?.id, workout?.exercises]);

  return useMemo(() => ({
    records,
    latestRecord,
  }), [records, latestRecord]);
}
