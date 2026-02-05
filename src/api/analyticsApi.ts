import { supabase } from '../lib/supabase';
import { handleApiError } from '../utils/apiErrorHandler';
import { logger } from '../utils/logger';
import { rateLimiter } from '../utils/rateLimiter';

export interface AdherenceMetrics {
  trainee_id: string;
  trainee_name: string;
  workouts_completed: number;
  workouts_planned: number;
  adherence_percentage: number;
  last_workout_date: string | null;
  days_since_last_workout: number | null;
  streak_days: number;
}

export interface TraineeAnalytics {
  trainee_id: string;
  total_workouts: number;
  workouts_this_month: number;
  workouts_this_week: number;
  average_weekly_workouts: number;
  last_measurement_date: string | null;
  days_since_last_measurement: number | null;
  weight_trend: 'up' | 'down' | 'stable' | 'unknown';
  adherence_percentage: number;
  streak_days: number;
}

// Rate limiting helper for analytics API
function checkAnalyticsRateLimit(key: string, maxRequests: number = 100): void {
  const rateLimitResult = rateLimiter.check(key, maxRequests, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }
}

export const analyticsApi = {
  async getTraineeAdherence(trainerId: string): Promise<AdherenceMetrics[]> {
    checkAnalyticsRateLimit(`getTraineeAdherence:${trainerId}`, 100);
    try {
      // Get all trainees
      const { data: trainees, error: traineesError } = await supabase
        .from('trainees')
        .select('id, full_name')
        .eq('trainer_id', trainerId);

      if (traineesError) throw traineesError;
      if (!trainees || trainees.length === 0) return [];

      // Type assertion for TypeScript
      type TraineeRow = { id: string; full_name: string };
      const typedTrainees = trainees as TraineeRow[];

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      // Use ISO timestamp for TIMESTAMPTZ field comparison
      const weekAgoStr = weekAgo.toISOString();

      const metrics: AdherenceMetrics[] = [];

      for (const trainee of typedTrainees) {
        // Get workouts in the last 7 days
        const { data: workouts, error: workoutsError } = await supabase
          .from('workout_trainees')
          .select(`
            workouts!inner(
              workout_date,
              is_completed
            )
          `)
          .eq('trainee_id', trainee.id)
          .gte('workouts.workout_date', weekAgoStr);

        if (workoutsError) {
          logger.error(`Error fetching workouts for trainee ${trainee.id}:`, workoutsError, 'analyticsApi');
          continue;
        }

        type WorkoutTraineeRow = {
          workouts: {
            workout_date: string;
            is_completed: boolean;
          };
        };
        
        const completedWorkouts = (workouts as WorkoutTraineeRow[] | null)?.filter(
          (w) => w.workouts?.is_completed === true
        ) || [];

        // Get last workout date
        const { data: lastWorkout } = await supabase
          .from('workout_trainees')
          .select(`
            workouts!inner(
              workout_date,
              is_completed
            )
          `)
          .eq('trainee_id', trainee.id)
          .eq('workouts.is_completed', true)
          .order('workouts(workout_date)', { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastWorkoutDate = (lastWorkout as WorkoutTraineeRow | null)?.workouts?.workout_date || null;
        let daysSinceLastWorkout: number | null = null;
        if (lastWorkoutDate) {
          const lastDate = new Date(lastWorkoutDate);
          daysSinceLastWorkout = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Calculate streak
        const streakDays = await this.calculateStreak(trainee.id);

        // Estimate planned workouts (assuming 3-4 per week for active trainees)
        const plannedWorkouts = 3;
        const adherencePercentage = plannedWorkouts > 0
          ? Math.round((completedWorkouts.length / plannedWorkouts) * 100)
          : 0;

        metrics.push({
          trainee_id: trainee.id,
          trainee_name: trainee.full_name,
          workouts_completed: completedWorkouts.length,
          workouts_planned: plannedWorkouts,
          adherence_percentage: Math.min(adherencePercentage, 100),
          last_workout_date: lastWorkoutDate,
          days_since_last_workout: daysSinceLastWorkout,
          streak_days: streakDays,
        });
      }

      return metrics.sort((a, b) => {
        // Sort by adherence percentage (lowest first - those needing attention)
        if (a.adherence_percentage !== b.adherence_percentage) {
          return a.adherence_percentage - b.adherence_percentage;
        }
        // Then by days since last workout (most recent first)
        if (a.days_since_last_workout !== b.days_since_last_workout) {
          if (a.days_since_last_workout === null) return 1;
          if (b.days_since_last_workout === null) return -1;
          return b.days_since_last_workout - a.days_since_last_workout;
        }
        return 0;
      });
    } catch (error) {
      throw handleApiError(error, 'שגיאה בחישוב מדדי adherence');
    }
  },

  async getTraineeAnalytics(traineeId: string): Promise<TraineeAnalytics> {
    checkAnalyticsRateLimit(`getTraineeAnalytics:${traineeId}`, 100);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Use ISO timestamps for TIMESTAMPTZ field comparison
      const startOfMonthStr = startOfMonth.toISOString();
      const startOfWeekStr = startOfWeek.toISOString();

      // Total workouts
      const { count: totalWorkouts } = await supabase
        .from('workout_trainees')
        .select('workouts!inner(id, is_completed)', { count: 'exact', head: true })
        .eq('trainee_id', traineeId)
        .eq('workouts.is_completed', true);

      // This month
      const { count: workoutsThisMonth } = await supabase
        .from('workout_trainees')
        .select('workouts!inner(id, workout_date, is_completed)', { count: 'exact', head: true })
        .eq('trainee_id', traineeId)
        .eq('workouts.is_completed', true)
        .gte('workouts.workout_date', startOfMonthStr);

      // This week
      const { count: workoutsThisWeek } = await supabase
        .from('workout_trainees')
        .select('workouts!inner(id, workout_date, is_completed)', { count: 'exact', head: true })
        .eq('trainee_id', traineeId)
        .eq('workouts.is_completed', true)
        .gte('workouts.workout_date', startOfWeekStr);

      // Last measurement
      type MeasurementRow = {
        measurement_date: string;
        weight: number;
      };
      
      const { data: lastMeasurement } = await supabase
        .from('measurements')
        .select('measurement_date, weight')
        .eq('trainee_id', traineeId)
        .not('weight', 'is', null)
        .order('measurement_date', { ascending: false })
        .limit(2)
        .maybeSingle();
      
      const typedLastMeasurement = lastMeasurement as MeasurementRow | null;

      let daysSinceLastMeasurement: number | null = null;
      let weightTrend: 'up' | 'down' | 'stable' | 'unknown' = 'unknown';
      
      if (typedLastMeasurement) {
        const lastDate = new Date(typedLastMeasurement.measurement_date);
        daysSinceLastMeasurement = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get previous measurement for trend
        const { data: previousMeasurement } = await supabase
          .from('measurements')
          .select('weight')
          .eq('trainee_id', traineeId)
          .not('weight', 'is', null)
          .lt('measurement_date', typedLastMeasurement.measurement_date)
          .order('measurement_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        type PreviousMeasurementRow = { weight: number };
        const typedPreviousMeasurement = previousMeasurement as PreviousMeasurementRow | null;

        if (typedPreviousMeasurement && typedLastMeasurement.weight && typedPreviousMeasurement.weight) {
          const diff = typedLastMeasurement.weight - typedPreviousMeasurement.weight;
          if (Math.abs(diff) < 0.5) {
            weightTrend = 'stable';
          } else if (diff > 0) {
            weightTrend = 'up';
          } else {
            weightTrend = 'down';
          }
        }
      }

      const streakDays = await this.calculateStreak(traineeId);
      
      // Calculate average weekly workouts (last 4 weeks)
      const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
      // Use ISO timestamp for TIMESTAMPTZ field comparison
      const fourWeeksAgoStr = fourWeeksAgo.toISOString();

      const { data: recentWorkouts } = await supabase
        .from('workout_trainees')
        .select('workouts!inner(workout_date, is_completed)')
        .eq('trainee_id', traineeId)
        .eq('workouts.is_completed', true)
        .gte('workouts.workout_date', fourWeeksAgoStr);

      const averageWeeklyWorkouts = recentWorkouts
        ? Math.round((recentWorkouts.length / 4) * 10) / 10
        : 0;

      const plannedWeeklyWorkouts = 3;
      const adherencePercentage = plannedWeeklyWorkouts > 0
        ? Math.round((averageWeeklyWorkouts / plannedWeeklyWorkouts) * 100)
        : 0;

      return {
        trainee_id: traineeId,
        total_workouts: totalWorkouts || 0,
        workouts_this_month: workoutsThisMonth || 0,
        workouts_this_week: workoutsThisWeek || 0,
        average_weekly_workouts: averageWeeklyWorkouts,
        last_measurement_date: typedLastMeasurement?.measurement_date || null,
        days_since_last_measurement: daysSinceLastMeasurement,
        weight_trend: weightTrend,
        adherence_percentage: Math.min(adherencePercentage, 100),
        streak_days: streakDays,
      };
    } catch (error) {
      throw handleApiError(error, 'שגיאה בחישוב אנליטיקה');
    }
  },

  async calculateStreak(traineeId: string): Promise<number> {
    checkAnalyticsRateLimit(`calculateStreak:${traineeId}`, 100);
    try {
      const { data: workouts } = await supabase
        .from('workout_trainees')
        .select('workouts!inner(workout_date, is_completed)')
        .eq('trainee_id', traineeId)
        .eq('workouts.is_completed', true)
        .order('workouts(workout_date)', { ascending: false });

      if (!workouts || workouts.length === 0) return 0;

      const workoutDates = new Set(
        workouts.map((w: any) => w.workouts.workout_date)
      );

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i <= 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];

        if (workoutDates.has(dateStr)) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      return streak;
    } catch (error) {
      logger.error('Error calculating streak:', error, 'analyticsApi');
      return 0;
    }
  },

  async getInactiveTrainees(trainerId: string, daysThreshold: number = 7): Promise<AdherenceMetrics[]> {
    checkAnalyticsRateLimit(`getInactiveTrainees:${trainerId}`, 100);
    try {
      const adherence = await this.getTraineeAdherence(trainerId);
      return adherence.filter(
        (m) => m.days_since_last_workout !== null && m.days_since_last_workout >= daysThreshold
      );
    } catch (error) {
      throw handleApiError(error, 'שגיאה בטעינת מתאמנים רדומים');
    }
  },
};
