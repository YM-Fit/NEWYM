import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import {
  useTraineesQuery,
  useTrainerProfileQuery,
  useUnseenWeightsCountsQuery,
  useLastWorkoutsMapQuery,
  useCreateTraineeMutation,
  useDeleteTraineeMutation,
} from '../../../hooks/queries/useTraineeQueries';
import {
  useWorkoutsByTraineeQuery,
  useWorkoutExercisesQuery,
  useDeleteWorkoutMutation,
  useDuplicateWorkoutMutation,
} from '../../../hooks/queries/useWorkoutQueries';
import {
  useMeasurementsQuery,
  useSelfWeightsQuery,
  useSaveScaleMeasurementMutation,
  useMarkSelfWeightsSeenMutation,
} from '../../../hooks/queries/useMeasurementQueries';
import { queryKeys } from '../../../lib/queryClient';

interface Trainee {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  gender: 'male' | 'female' | null;
  birth_date: string | null;
  height: number | null;
  start_date: string;
  notes: string;
  is_pair?: boolean;
  pair_name_1?: string;
  pair_name_2?: string;
  pair_phone_1?: string;
  pair_phone_2?: string;
  pair_email_1?: string;
  pair_email_2?: string;
  pair_gender_1?: 'male' | 'female';
  pair_gender_2?: 'male' | 'female';
  pair_birth_date_1?: string;
  pair_birth_date_2?: string;
  pair_height_1?: number;
  pair_height_2?: number;
  [key: string]: unknown;
}

export function useTrainerAppData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);

  const { data: rawTrainees, isLoading: traineesLoading } = useTraineesQuery(user?.id ?? null);
  const { data: trainerProfile, isLoading: profileLoading } = useTrainerProfileQuery(user?.id ?? null);
  const { data: unseenWeightsCounts } = useUnseenWeightsCountsQuery(user?.id ?? null);

  const traineeIds = useMemo(() => (rawTrainees || []).map((t: any) => t.id), [rawTrainees]);
  const { data: lastWorkoutsMap } = useLastWorkoutsMapQuery(traineeIds);

  const trainees = useMemo(() => {
    if (!rawTrainees) return [];
    return rawTrainees.map((t: any) => ({
      ...t,
      lastWorkout: lastWorkoutsMap?.get(t.id) || null,
    }));
  }, [rawTrainees, lastWorkoutsMap]);

  const { data: workouts } = useWorkoutsByTraineeQuery(selectedTraineeId);
  const { data: measurements } = useMeasurementsQuery(selectedTraineeId);
  const { data: selfWeights } = useSelfWeightsQuery(selectedTraineeId);

  const formattedMeasurements = useMemo(() => {
    if (!measurements) return [];
    return measurements.map((m: any) => ({
      id: m.id,
      traineeId: m.trainee_id,
      date: m.measurement_date,
      weight: m.weight || 0,
      bodyFat: m.body_fat_percentage || undefined,
      muscleMass: m.muscle_mass || undefined,
      waterPercentage: m.water_percentage || undefined,
      bmr: m.bmr || undefined,
      bmi: m.bmi || undefined,
      metabolicAge: m.metabolic_age || undefined,
      source: m.source as 'tanita' | 'manual',
      notes: m.notes || undefined,
      pairMember: m.pair_member as 'member_1' | 'member_2' | null,
      measurements: {
        chestBack: m.chest_back || 0,
        belly: m.belly || 0,
        glutes: m.glutes || 0,
        thigh: m.thigh || 0,
        rightArm: m.right_arm || 0,
        leftArm: m.left_arm || 0,
      },
    }));
  }, [measurements]);

  const createTraineeMutation = useCreateTraineeMutation();
  const deleteTraineeMutation = useDeleteTraineeMutation();
  const deleteWorkoutMutation = useDeleteWorkoutMutation();
  const duplicateWorkoutMutation = useDuplicateWorkoutMutation();
  const saveScaleMeasurementMutation = useSaveScaleMeasurementMutation();
  const markSelfWeightsSeenMutation = useMarkSelfWeightsSeenMutation();

  const selectTrainee = useCallback((traineeId: string | null) => {
    setSelectedTraineeId(traineeId);
  }, []);

  const selectedTrainee = useMemo(() => {
    if (!selectedTraineeId || !trainees) return null;
    return trainees.find((t: Trainee) => t.id === selectedTraineeId) || null;
  }, [selectedTraineeId, trainees]);

  const handleSaveTrainee = useCallback(async (traineeData: Record<string, unknown>) => {
    if (!user) return null;
    const result = await createTraineeMutation.mutateAsync({ trainerId: user.id, traineeData });
    return result;
  }, [user, createTraineeMutation]);

  const handleDeleteTrainee = useCallback(async (traineeId: string) => {
    if (!user) return;
    await deleteTraineeMutation.mutateAsync({ traineeId, trainerId: user.id });
  }, [user, deleteTraineeMutation]);

  const handleDeleteWorkout = useCallback(async (workoutId: string) => {
    await deleteWorkoutMutation.mutateAsync(workoutId);
    if (selectedTraineeId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.workouts.byTrainee(selectedTraineeId) });
    }
  }, [deleteWorkoutMutation, selectedTraineeId, queryClient]);

  const handleDuplicateWorkout = useCallback(async (workoutId: string) => {
    if (!selectedTraineeId || !user) return;
    await duplicateWorkoutMutation.mutateAsync({
      workoutId,
      traineeId: selectedTraineeId,
      trainerId: user.id,
    });
  }, [duplicateWorkoutMutation, selectedTraineeId, user]);

  const handleSaveScaleMeasurement = useCallback(async (
    traineeId: string,
    traineeName: string,
    reading: any,
    customDate?: string
  ): Promise<boolean> => {
    try {
      await saveScaleMeasurementMutation.mutateAsync({ traineeId, traineeName, reading, customDate });
      return true;
    } catch {
      return false;
    }
  }, [saveScaleMeasurementMutation]);

  const handleMarkSelfWeightsSeen = useCallback(async () => {
    if (!selectedTraineeId || !user) return;
    await markSelfWeightsSeenMutation.mutateAsync({ traineeId: selectedTraineeId, trainerId: user.id });
  }, [markSelfWeightsSeenMutation, selectedTraineeId, user]);

  const refreshWorkouts = useCallback(() => {
    if (selectedTraineeId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.workouts.byTrainee(selectedTraineeId) });
    }
  }, [queryClient, selectedTraineeId]);

  const refreshMeasurements = useCallback(() => {
    if (selectedTraineeId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.measurements.byTrainee(selectedTraineeId) });
    }
  }, [queryClient, selectedTraineeId]);

  const refreshTrainees = useCallback(() => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: queryKeys.trainees.all(user.id) });
    }
  }, [queryClient, user]);

  const loading = traineesLoading || profileLoading;

  return {
    user,
    trainees: trainees as Trainee[],
    selectedTrainee: selectedTrainee as Trainee | null,
    selectedTraineeId,
    selectTrainee,
    trainerName: trainerProfile?.full_name || '',
    loading,
    workouts: workouts || [],
    measurements: formattedMeasurements,
    selfWeights: selfWeights || [],
    unseenWeightsCounts: unseenWeightsCounts || new Map<string, number>(),

    handleSaveTrainee,
    handleDeleteTrainee,
    handleDeleteWorkout,
    handleDuplicateWorkout,
    handleSaveScaleMeasurement,
    handleMarkSelfWeightsSeen,

    refreshWorkouts,
    refreshMeasurements,
    refreshTrainees,
  };
}
