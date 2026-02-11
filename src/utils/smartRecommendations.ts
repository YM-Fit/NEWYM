import { supabase } from '../lib/supabase';
import { analyticsApi } from '../api/analyticsApi';
import { getActiveMealPlanWithMeals } from '../api/nutritionApi';
import { calculateFullCalorieData } from './calorieCalculations';
import { logger } from './logger';

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

/** Get numeric calorie recommendation for weight plateau (14+ days stable, goal = cutting). */
async function getPlateauNutritionRecommendation(
  traineeId: string,
  currentWeight: number,
  daysBetween: number
): Promise<string> {
  try {
    const { plan, meals } = await getActiveMealPlanWithMeals(traineeId);
    const currentIntake =
      (plan as { daily_calories?: number | null })?.daily_calories ??
      meals.reduce(
        (sum, m) =>
          sum +
          (m.food_items || []).reduce(
            (s: number, i: { calories?: number | null }) => s + (i.calories || 0),
            0
          ),
        0
      );

    if (!currentIntake || currentIntake <= 0) {
      return `המשקל נשאר יציב ב-${daysBetween} הימים האחרונים. כדאי לבדוק את התזונה או התאמת התוכנית.`;
    }

    const { data: trainee } = await supabase
      .from('trainees')
      .select('height, birth_date, gender')
      .eq('id', traineeId)
      .maybeSingle();

    const height = Number((trainee as { height?: number })?.height) || 170;
    const birthDate = (trainee as { birth_date?: string })?.birth_date;
    const age = birthDate
      ? Math.floor(
          (Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        )
      : 30;
    const g = String((trainee as { gender?: string })?.gender || 'male').toLowerCase();
    const gender: 'male' | 'female' =
      g === 'female' || g === 'ז' || g === 'אישה' ? 'female' : 'male';

    const calorieData = calculateFullCalorieData(
      currentWeight,
      height,
      Math.max(14, Math.min(age, 100)),
      gender,
      'moderate'
    );
    const tdee = calorieData.tdee;

    const deficit = tdee - currentIntake;
    if (deficit <= 100) {
      return `המשקל יציב ב-${daysBetween} הימים. הורד 100–200 קלוריות ליום (יעד: ~${Math.max(1200, tdee - 200)} קל') להמשך ירידה.`;
    }
    if (currentIntake <= tdee * 0.7) {
      return `המשקל יציב ב-${daysBetween} הימים. הצריכה כבר נמוכה – כדאי לבדוק עם המאמן, ייתכן צורך בהפסקת דיאטה.`;
    }
    return `המשקל יציב ב-${daysBetween} הימים. אולי כדאי לבדוק את התזונה או התאמת התוכנית.`;
  } catch {
    return `המשקל נשאר יציב ב-${daysBetween} הימים האחרונים. כדאי לבדוק את התזונה או התאמת התוכנית.`;
  }
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

      // Check body composition (fat vs muscle) – only when we have body_fat_percentage or muscle_mass
      const { data: bodyMeasurements } = await supabase
        .from('measurements')
        .select('measurement_date, weight, body_fat_percentage, muscle_mass')
        .eq('trainee_id', traineeId)
        .order('measurement_date', { ascending: false })
        .limit(3);

      if (
        bodyMeasurements &&
        bodyMeasurements.length >= 2 &&
        bodyMeasurements.some(
          (m: { body_fat_percentage?: number | null; muscle_mass?: number | null }) =>
            (m.body_fat_percentage != null && m.body_fat_percentage > 0) ||
            (m.muscle_mass != null && m.muscle_mass > 0)
        )
      ) {
        const latest = bodyMeasurements[0] as {
          weight?: number | null;
          body_fat_percentage?: number | null;
          muscle_mass?: number | null;
          measurement_date: string;
        };
        const older = bodyMeasurements[bodyMeasurements.length - 1] as {
          weight?: number | null;
          body_fat_percentage?: number | null;
          muscle_mass?: number | null;
          measurement_date: string;
        };

        const weightDiff = (latest.weight ?? 0) - (older.weight ?? 0);
        const fatDiff =
          (latest.body_fat_percentage ?? 0) - (older.body_fat_percentage ?? 0);
        const hasMuscleData =
          latest.muscle_mass != null &&
          older.muscle_mass != null &&
          latest.muscle_mass > 0 &&
          older.muscle_mass > 0;
        const muscleDiff = hasMuscleData
          ? (latest.muscle_mass ?? 0) - (older.muscle_mass ?? 0)
          : 0;

        if (weightDiff < -0.5 && hasMuscleData && muscleDiff < -0.3) {
          recommendations.push({
            type: 'nutrition',
            priority: 'high',
            title: 'חשש לאיבוד שריר',
            description:
              'יש ירידה במסת השריר. מומלץ להגביר חלבון ל־2.4 גרם/ק"ג – יש חשש לאיבוד שריר.',
          });
        } else if (weightDiff < -0.5 && fatDiff < -0.5 && (muscleDiff >= -0.3 || muscleDiff === 0)) {
          recommendations.push({
            type: 'nutrition',
            priority: 'low',
            title: 'ירידה איכותית',
            description: 'הירידה במשקל כוללת בעיקר שומן. המשך כך – ירידה איכותית.',
          });
        }
      }

      // Check weight trend – plateau with numeric calorie recommendation
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
            const plateauDesc = await getPlateauNutritionRecommendation(
              traineeId,
              weights[0],
              daysBetween
            );
            recommendations.push({
              type: 'nutrition',
              priority: 'medium',
              title: 'משקל יציב',
              description: plateauDesc,
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
      logger.error('Error generating recommendations', error, 'smartRecommendations');
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  },
};
