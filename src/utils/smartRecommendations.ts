import { supabase } from '../lib/supabase';
import { analyticsApi } from '../api/analyticsApi';

export interface Recommendation {
  type: 'workout' | 'nutrition' | 'measurement' | 'habit' | 'general';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const smartRecommendations = {
  async getTraineeRecommendations(traineeId: string): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Check last workout date
      const { data: lastWorkout } = await supabase
        .from('workout_trainees')
        .select('workouts!inner(workout_date, is_completed)')
        .eq('trainee_id', traineeId)
        .eq('workouts.is_completed', true)
        .order('workouts(workout_date)', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastWorkout) {
        const lastWorkoutDate = new Date(lastWorkout.workouts.workout_date);
        const daysSinceLastWorkout = Math.floor(
          (new Date().getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastWorkout >= 3) {
          recommendations.push({
            type: 'workout',
            priority: 'high',
            title: 'זמן לאימון!',
            description: `עברו ${daysSinceLastWorkout} ימים מאז האימון האחרון. מומלץ לתזמן אימון בקרוב.`,
          });
        }
      }

      // Check last measurement date
      const { data: lastMeasurement } = await supabase
        .from('measurements')
        .select('measurement_date, weight')
        .eq('trainee_id', traineeId)
        .not('weight', 'is', null)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMeasurement) {
        const lastMeasurementDate = new Date(lastMeasurement.measurement_date);
        const daysSinceLastMeasurement = Math.floor(
          (new Date().getTime() - lastMeasurementDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastMeasurement >= 7) {
          recommendations.push({
            type: 'measurement',
            priority: 'medium',
            title: 'זמן למדידה',
            description: `עברו ${daysSinceLastMeasurement} ימים מאז המדידה האחרונה. מומלץ לעדכן מדידות.`,
          });
        }
      }

      // Check weight trend
      const { data: recentMeasurements } = await supabase
        .from('measurements')
        .select('measurement_date, weight')
        .eq('trainee_id', traineeId)
        .not('weight', 'is', null)
        .order('measurement_date', { ascending: false })
        .limit(3);

      if (recentMeasurements && recentMeasurements.length >= 2) {
        const weights = recentMeasurements.map(m => m.weight).filter(w => w !== null) as number[];
        if (weights.length >= 2) {
          const trend = weights[0] - weights[weights.length - 1];
          const daysBetween = Math.floor(
            (new Date(recentMeasurements[0].measurement_date).getTime() -
              new Date(recentMeasurements[recentMeasurements.length - 1].measurement_date).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (daysBetween >= 14 && Math.abs(trend) < 0.5) {
            recommendations.push({
              type: 'nutrition',
              priority: 'medium',
              title: 'משקל יציב',
              description: `המשקל נשאר יציב ב-${daysBetween} הימים האחרונים. אולי כדאי לבדוק את התזונה או התאמת התוכנית.`,
            });
          }
        }
      }

      // Check muscle group training frequency
      const { data: recentWorkouts } = await supabase
        .from('workout_trainees')
        .select(`
          workouts!inner(
            workout_date,
            workout_exercises(
              exercises(muscle_group_id)
            )
          )
        `)
        .eq('trainee_id', traineeId)
        .eq('workouts.is_completed', true)
        .order('workouts(workout_date)', { ascending: false })
        .limit(10);

      if (recentWorkouts) {
        const muscleGroupDates = new Map<string, Date[]>();

        recentWorkouts.forEach((wt: any) => {
          const workoutDate = new Date(wt.workouts.workout_date);
          if (wt.workouts.workout_exercises) {
            wt.workouts.workout_exercises.forEach((ex: any) => {
              const muscleGroupId = ex.exercises?.muscle_group_id;
              if (muscleGroupId) {
                if (!muscleGroupDates.has(muscleGroupId)) {
                  muscleGroupDates.set(muscleGroupId, []);
                }
                muscleGroupDates.get(muscleGroupId)!.push(workoutDate);
              }
            });
          }
        });

        // Check for muscle groups not trained recently
        const today = new Date();
        muscleGroupDates.forEach((dates, muscleGroupId) => {
          const lastDate = dates.sort((a, b) => b.getTime() - a.getTime())[0];
          const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSince >= 10) {
            recommendations.push({
              type: 'workout',
              priority: 'low',
              title: 'קבוצת שריר לא אומנה',
              description: `קבוצת שריר מסוימת לא אומנה ב-${daysSince} הימים האחרונים. כדאי לשלב אותה באימון הבא.`,
            });
          }
        });
      }

      // Check adherence
      const analytics = await analyticsApi.getTraineeAnalytics(traineeId);
      if (analytics.adherence_percentage < 60) {
        recommendations.push({
          type: 'workout',
          priority: 'high',
          title: 'Adherence נמוך',
          description: `ה-Adherence שלך הוא ${analytics.adherence_percentage}%. נסה להגדיל את תדירות האימונים.`,
        });
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  },
};
