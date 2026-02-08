import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { supabase } from '../../lib/supabase';
import { handleApiError } from '../../utils/apiErrorHandler';

export function useDashboardStatsQuery(trainerId: string | null, traineeIds: string[]) {
  return useQuery({
    queryKey: [...queryKeys.workouts.today(trainerId || ''), traineeIds.length],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayStr = today.toISOString();
      const tomorrowStr = tomorrow.toISOString();

      if (traineeIds.length === 0) {
        return { todayWorkouts: 0, recentMeasurements: 0 };
      }

      const { data: workoutTrainees } = await supabase
        .from('workout_trainees')
        .select('workout_id')
        .in('trainee_id', traineeIds);

      const workoutIds = workoutTrainees?.map(wt => wt.workout_id) || [];
      let todayWorkouts = 0;

      if (workoutIds.length > 0) {
        const BATCH_SIZE = 100;
        for (let i = 0; i < workoutIds.length; i += BATCH_SIZE) {
          const batch = workoutIds.slice(i, i + BATCH_SIZE);
          const { count } = await supabase
            .from('workouts')
            .select('*', { count: 'exact', head: true })
            .in('id', batch)
            .gte('workout_date', todayStr)
            .lt('workout_date', tomorrowStr);
          todayWorkouts += count || 0;
        }
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: recentMeasurements } = await supabase
        .from('measurements')
        .select('*', { count: 'exact', head: true })
        .in('trainee_id', traineeIds)
        .gte('measurement_date', sevenDaysAgo.toISOString().split('T')[0]);

      return { todayWorkouts, recentMeasurements: recentMeasurements || 0 };
    },
    enabled: !!trainerId && traineeIds.length > 0,
    staleTime: 60_000,
  });
}

export function useRecentActivityQuery(trainerId: string | null) {
  return useQuery({
    queryKey: queryKeys.recentActivity.byTrainer(trainerId || ''),
    queryFn: async () => {
      const activities: Array<{
        id: string;
        type: 'workout' | 'measurement';
        trainee: string;
        description: string;
        time: string;
        sortDate: number;
      }> = [];

      const { data: workouts } = await supabase
        .from('workouts')
        .select(`
          id, workout_date, created_at,
          workout_trainees ( trainees ( full_name ) ),
          workout_exercises (
            exercise_sets (
              weight, reps, superset_weight, superset_reps,
              dropset_weight, dropset_reps,
              superset_dropset_weight, superset_dropset_reps
            )
          )
        `)
        .eq('trainer_id', trainerId!)
        .order('created_at', { ascending: false })
        .limit(5);

      if (workouts) {
        workouts.forEach((w: any) => {
          const trainee = w.workout_trainees?.[0]?.trainees?.full_name || 'מתאמן';
          let totalVolume = 0;
          w.workout_exercises?.forEach((ex: any) => {
            ex.exercise_sets?.forEach((set: any) => {
              let setVolume = (set.weight || 0) * (set.reps || 0);
              if (set.superset_weight && set.superset_reps) setVolume += set.superset_weight * set.superset_reps;
              if (set.dropset_weight && set.dropset_reps) setVolume += set.dropset_weight * set.dropset_reps;
              if (set.superset_dropset_weight && set.superset_dropset_reps) setVolume += set.superset_dropset_weight * set.superset_dropset_reps;
              totalVolume += setVolume;
            });
          });

          activities.push({
            id: w.id,
            type: 'workout',
            trainee,
            description: `השלים אימון - ${totalVolume.toLocaleString()} ק"ג`,
            time: new Date(w.created_at).toLocaleDateString('he-IL', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            }),
            sortDate: new Date(w.created_at).getTime(),
          });
        });
      }

      const { data: measurements } = await supabase
        .from('measurements')
        .select(`
          id,
          measurement_date,
          created_at,
          weight,
          trainee:trainees!trainee_id ( full_name, trainer_id )
        `)
        .eq('trainee.trainer_id', trainerId!)
        .order('created_at', { ascending: false })
        .limit(5);

      if (measurements) {
        measurements.forEach((m: any) => {
          const trainee = m.trainee?.full_name || 'מתאמן';
          activities.push({
            id: m.id,
            type: 'measurement',
            trainee,
            description: `נשקל - ${m.weight} ק״ג`,
            time: new Date(m.created_at).toLocaleDateString('he-IL', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            }),
            sortDate: new Date(m.created_at).getTime(),
          });
        });
      }

      activities.sort((a, b) => b.sortDate - a.sortDate);
      return activities.slice(0, 10).map(({ sortDate, ...rest }) => rest);
    },
    enabled: !!trainerId,
    staleTime: 60_000,
  });
}
