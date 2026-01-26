/**
 * Cardio API layer
 */

import { supabase } from '../lib/supabase';
import { handleApiError } from '../utils/apiErrorHandler';
import { rateLimiter } from '../utils/rateLimiter';

export interface CardioType {
  id: string;
  trainer_id: string;
  name: string;
  created_at: string;
}

export interface CardioActivity {
  id: string;
  trainee_id: string;
  trainer_id: string;
  cardio_type_id: string;
  date: string;
  avg_weekly_steps: number;
  distance: number;
  duration: number;
  frequency: number;
  weekly_goal_steps: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  cardio_type?: {
    id: string;
    name: string;
  };
}

export interface CreateCardioActivityInput {
  trainee_id: string;
  trainer_id: string;
  cardio_type_id: string;
  date?: string;
  avg_weekly_steps?: number;
  distance?: number;
  duration?: number;
  frequency?: number;
  weekly_goal_steps?: number;
  notes?: string | null;
}

export interface UpdateCardioActivityInput {
  cardio_type_id?: string;
  date?: string;
  avg_weekly_steps?: number;
  distance?: number;
  duration?: number;
  frequency?: number;
  weekly_goal_steps?: number;
  notes?: string | null;
}

export interface CreateCardioTypeInput {
  trainer_id: string;
  name: string;
}

export interface CardioStats {
  avgSteps: number;
  avgGoal: number;
  goalProgress: number;
  stepsChange: number;
  totalActivities: number;
  successRate: number;
  currentStreak: number;
  longestStreak: number;
}

export interface CardioTrend {
  period: string;
  avgSteps: number;
  goalSteps: number;
  achievementRate: number;
}

/**
 * Validate cardio activity input
 */
function validateCardioActivity(input: CreateCardioActivityInput | UpdateCardioActivityInput): void {
  if ('cardio_type_id' in input && !input.cardio_type_id) {
    throw new Error('נא לבחור סוג אירובי');
  }
  
  if ('weekly_goal_steps' in input && input.weekly_goal_steps !== undefined) {
    if (input.weekly_goal_steps < 0) {
      throw new Error('יעד צעדים שבועי לא יכול להיות שלילי');
    }
    if (input.weekly_goal_steps > 1000000) {
      throw new Error('יעד צעדים שבועי לא יכול להיות מעל מיליון');
    }
  }
  
  if ('avg_weekly_steps' in input && input.avg_weekly_steps !== undefined) {
    if (input.avg_weekly_steps < 0) {
      throw new Error('ממוצע צעדים שבועי לא יכול להיות שלילי');
    }
  }
  
  if ('distance' in input && input.distance !== undefined) {
    if (input.distance < 0) {
      throw new Error('מרחק לא יכול להיות שלילי');
    }
    if (input.distance > 10000) {
      throw new Error('מרחק לא יכול להיות מעל 10,000 ק"מ');
    }
  }
  
  if ('duration' in input && input.duration !== undefined) {
    if (input.duration < 0) {
      throw new Error('משך זמן לא יכול להיות שלילי');
    }
    if (input.duration > 1440) {
      throw new Error('משך זמן לא יכול להיות מעל 24 שעות');
    }
  }
  
  if ('frequency' in input && input.frequency !== undefined) {
    if (input.frequency < 0) {
      throw new Error('תדירות לא יכולה להיות שלילית');
    }
    if (input.frequency > 7) {
      throw new Error('תדירות לא יכולה להיות מעל 7 פעמים בשבוע');
    }
  }
}

// Rate limiting helper for cardio API
function checkCardioRateLimit(key: string, maxRequests: number = 100): void {
  const rateLimitResult = rateLimiter.check(key, maxRequests, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }
}

export const cardioApi = {
  /**
   * Get all cardio activities for a trainee
   */
  async getTraineeActivities(traineeId: string): Promise<CardioActivity[]> {
    checkCardioRateLimit(`getTraineeActivities:${traineeId}`, 100);
    try {
      const { data, error } = await supabase
        .from('cardio_activities')
        .select('*, cardio_type:cardio_types(id, name)')
        .eq('trainee_id', traineeId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleApiError(error, 'שגיאה בטעינת פעילויות אירוביות');
    }
  },

  /**
   * Get cardio activity by ID
   */
  async getActivityById(activityId: string): Promise<CardioActivity> {
    checkCardioRateLimit(`getActivityById:${activityId}`, 100);
    try {
      const { data, error } = await supabase
        .from('cardio_activities')
        .select('*, cardio_type:cardio_types(id, name)')
        .eq('id', activityId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('פעילות לא נמצאה');
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בטעינת פעילות');
    }
  },

  /**
   * Get latest cardio activity for a trainee
   */
  async getLatestActivity(traineeId: string): Promise<CardioActivity | null> {
    checkCardioRateLimit(`getLatestActivity:${traineeId}`, 100);
    try {
      const { data, error } = await supabase
        .from('cardio_activities')
        .select('*, cardio_type:cardio_types(id, name)')
        .eq('trainee_id', traineeId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // If no rows found, return null instead of throwing
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בטעינת פעילות אחרונה');
    }
  },

  /**
   * Create a new cardio activity
   */
  async createActivity(input: CreateCardioActivityInput): Promise<CardioActivity> {
    checkCardioRateLimit(`createActivity:${input.trainee_id}`, 50);
    try {
      validateCardioActivity(input);
      
      const { data, error } = await supabase
        .from('cardio_activities')
        .insert([{
          ...input,
          date: input.date || new Date().toISOString().split('T')[0],
          avg_weekly_steps: input.avg_weekly_steps ?? 0,
          distance: input.distance ?? 0,
          duration: input.duration ?? 0,
          frequency: input.frequency ?? 0,
          weekly_goal_steps: input.weekly_goal_steps ?? 0,
        }] as any)
        .select('*, cardio_type:cardio_types(id, name)')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה ביצירת פעילות אירובית');
    }
  },

  /**
   * Update a cardio activity
   */
  async updateActivity(activityId: string, updates: UpdateCardioActivityInput): Promise<CardioActivity> {
    checkCardioRateLimit(`updateActivity:${activityId}`, 50);
    try {
      validateCardioActivity(updates);
      
      const { data, error } = await supabase
        .from('cardio_activities')
        .update(updates as any)
        .eq('id', activityId)
        .select('*, cardio_type:cardio_types(id, name)')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בעדכון פעילות אירובית');
    }
  },

  /**
   * Delete a cardio activity
   */
  async deleteActivity(activityId: string): Promise<void> {
    checkCardioRateLimit(`deleteActivity:${activityId}`, 20);
    try {
      const { error } = await supabase
        .from('cardio_activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
    } catch (error) {
      throw handleApiError(error, 'שגיאה במחיקת פעילות אירובית');
    }
  },

  /**
   * Get all cardio types for a trainer
   */
  async getCardioTypes(trainerId: string): Promise<CardioType[]> {
    checkCardioRateLimit(`getCardioTypes:${trainerId}`, 100);
    try {
      const { data, error } = await supabase
        .from('cardio_types')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleApiError(error, 'שגיאה בטעינת סוגי אירובי');
    }
  },

  /**
   * Create a new cardio type
   */
  async createCardioType(input: CreateCardioTypeInput): Promise<CardioType> {
    checkCardioRateLimit(`createCardioType:${input.trainer_id}`, 20);
    try {
      if (!input.name.trim()) {
        throw new Error('שם סוג אירובי לא יכול להיות ריק');
      }

      const { data, error } = await supabase
        .from('cardio_types')
        .insert([{ ...input, name: input.name.trim() }] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה ביצירת סוג אירובי');
    }
  },

  /**
   * Update a cardio type
   */
  async updateCardioType(typeId: string, name: string): Promise<CardioType> {
    checkCardioRateLimit(`updateCardioType:${typeId}`, 20);
    try {
      if (!name.trim()) {
        throw new Error('שם סוג אירובי לא יכול להיות ריק');
      }

      const { data, error } = await supabase
        .from('cardio_types')
        .update({ name: name.trim() } as any)
        .eq('id', typeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בעדכון סוג אירובי');
    }
  },

  /**
   * Delete a cardio type
   */
  async deleteCardioType(typeId: string): Promise<void> {
    checkCardioRateLimit(`deleteCardioType:${typeId}`, 10);
    try {
      const { error } = await supabase
        .from('cardio_types')
        .delete()
        .eq('id', typeId);

      if (error) throw error;
    } catch (error) {
      throw handleApiError(error, 'שגיאה במחיקת סוג אירובי');
    }
  },

  /**
   * Get cardio statistics for a trainee
   */
  async getCardioStats(traineeId: string): Promise<CardioStats> {
    checkCardioRateLimit(`getCardioStats:${traineeId}`, 100);
    try {
      const activities = await this.getTraineeActivities(traineeId);
      
      if (activities.length === 0) {
        return {
          avgSteps: 0,
          avgGoal: 0,
          goalProgress: 0,
          stepsChange: 0,
          totalActivities: 0,
          successRate: 0,
          currentStreak: 0,
          longestStreak: 0,
        };
      }

      const totalSteps = activities.reduce((sum, a) => sum + a.avg_weekly_steps, 0);
      const totalGoal = activities.reduce((sum, a) => sum + a.weekly_goal_steps, 0);
      const avgSteps = Math.round(totalSteps / activities.length);
      const avgGoal = Math.round(totalGoal / activities.length);
      const goalProgress = avgGoal > 0 ? Math.round((avgSteps / avgGoal) * 100) : 0;
      
      const successCount = activities.filter(a => 
        a.weekly_goal_steps > 0 && a.avg_weekly_steps >= a.weekly_goal_steps
      ).length;
      const successRate = activities.length > 0 
        ? Math.round((successCount / activities.length) * 100) 
        : 0;

      const latestActivity = activities[0];
      const previousActivity = activities[1];
      const stepsChange = latestActivity && previousActivity
        ? latestActivity.avg_weekly_steps - previousActivity.avg_weekly_steps
        : 0;

      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      for (const activity of activities) {
        const achieved = activity.weekly_goal_steps > 0 && 
          activity.avg_weekly_steps >= activity.weekly_goal_steps;
        
        if (achieved) {
          tempStreak++;
          if (currentStreak === 0) currentStreak = tempStreak;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          if (currentStreak === tempStreak) currentStreak = 0;
          tempStreak = 0;
        }
      }

      return {
        avgSteps,
        avgGoal,
        goalProgress,
        stepsChange,
        totalActivities: activities.length,
        successRate,
        currentStreak,
        longestStreak,
      };
    } catch (error) {
      throw handleApiError(error, 'שגיאה בחישוב סטטיסטיקות אירובי');
    }
  },

  /**
   * Get cardio trends (weekly/monthly)
   */
  async getCardioTrends(traineeId: string, period: 'week' | 'month' = 'week'): Promise<CardioTrend[]> {
    checkCardioRateLimit(`getCardioTrends:${traineeId}`, 100);
    try {
      const activities = await this.getTraineeActivities(traineeId);
      
      if (activities.length === 0) return [];

      const trends: CardioTrend[] = [];
      const grouped = new Map<string, { steps: number[]; goals: number[] }>();

      activities.forEach(activity => {
        const date = new Date(activity.date);
        let key: string;

        if (period === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!grouped.has(key)) {
          grouped.set(key, { steps: [], goals: [] });
        }

        const group = grouped.get(key)!;
        group.steps.push(activity.avg_weekly_steps);
        group.goals.push(activity.weekly_goal_steps);
      });

      grouped.forEach((data, periodKey) => {
        const avgSteps = Math.round(
          data.steps.reduce((sum, s) => sum + s, 0) / data.steps.length
        );
        const avgGoal = Math.round(
          data.goals.reduce((sum, g) => sum + g, 0) / data.goals.length
        );
        const achievementRate = avgGoal > 0 
          ? Math.round((avgSteps / avgGoal) * 100) 
          : 0;

        trends.push({
          period: periodKey,
          avgSteps,
          goalSteps: avgGoal,
          achievementRate,
        });
      });

      return trends.sort((a, b) => a.period.localeCompare(b.period));
    } catch (error) {
      throw handleApiError(error, 'שגיאה בטעינת מגמות אירובי');
    }
  },

  /**
   * Get activities in date range
   */
  async getActivitiesInRange(
    traineeId: string,
    startDate: string,
    endDate: string
  ): Promise<CardioActivity[]> {
    checkCardioRateLimit(`getActivitiesInRange:${traineeId}`, 100);
    try {
      const { data, error } = await supabase
        .from('cardio_activities')
        .select('*, cardio_type:cardio_types(id, name)')
        .eq('trainee_id', traineeId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleApiError(error, 'שגיאה בטעינת פעילויות בתאריכים');
    }
  },
};
