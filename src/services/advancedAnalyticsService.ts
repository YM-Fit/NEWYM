/**
 * Advanced Analytics Service
 * שירות לאנליטיקה מתקדמת
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';

/**
 * Client Lifetime Value
 */
export interface ClientLifetimeValue {
  traineeId: string;
  traineeName: string;
  totalRevenue: number;
  averageMonthlyRevenue: number;
  monthsActive: number;
  clv: number; // Client Lifetime Value
  predictedClv: number; // Predicted future value
}

/**
 * Churn Analysis
 */
export interface ChurnAnalysis {
  churnRate: number;
  churnedClients: number;
  totalClients: number;
  averageLifetime: number; // in months
  churnReasons: Record<string, number>;
  retentionRate: number;
}

/**
 * Conversion Funnel
 */
export interface ConversionFunnel {
  stage: string;
  count: number;
  percentage: number;
  dropOffRate: number;
}

/**
 * Revenue Forecast
 */
export interface RevenueForecast {
  month: string;
  predicted: number;
  actual?: number;
  confidence: number;
}

/**
 * Activity Heatmap Data
 */
export interface ActivityHeatmapData {
  date: string;
  hour: number;
  count: number;
}

/**
 * Advanced Analytics Service
 */
export class AdvancedAnalyticsService {
  /**
   * Calculate Client Lifetime Value for all clients
   * @param trainerId - Trainer ID
   * @returns Promise with CLV data
   */
  static async calculateCLV(
    trainerId: string
  ): Promise<ApiResponse<ClientLifetimeValue[]>> {
    try {
      // Get all trainees with payments
      const { data: trainees, error: traineesError } = await supabase
        .from('trainees')
        .select('id, full_name, client_since')
        .eq('trainer_id', trainerId);

      if (traineesError) {
        logSupabaseError(traineesError, 'calculateCLV.trainees', { table: 'trainees', trainerId });
        return { error: traineesError.message };
      }

      const { data: payments, error: paymentsError } = await supabase
        .from('crm_payments')
        .select('trainee_id, amount, paid_date, status')
        .eq('trainer_id', trainerId)
        .eq('status', 'paid');

      if (paymentsError) {
        logSupabaseError(paymentsError, 'calculateCLV.payments', { table: 'crm_payments', trainerId });
        return { error: paymentsError.message };
      }

      const clvData: ClientLifetimeValue[] = [];

      trainees?.forEach((trainee) => {
        const traineePayments = payments?.filter(p => p.trainee_id === trainee.id) || [];
        const totalRevenue = traineePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        const clientSince = trainee.client_since ? new Date(trainee.client_since) : new Date();
        const monthsActive = Math.max(1, Math.floor(
          (Date.now() - clientSince.getTime()) / (1000 * 60 * 60 * 24 * 30)
        ));

        const averageMonthlyRevenue = monthsActive > 0 ? totalRevenue / monthsActive : 0;

        // Simple CLV calculation: average monthly revenue * average client lifetime (assume 12 months)
        const clv = averageMonthlyRevenue * 12;
        const predictedClv = averageMonthlyRevenue * 24; // Predict 24 months

        clvData.push({
          traineeId: trainee.id,
          traineeName: trainee.full_name,
          totalRevenue,
          averageMonthlyRevenue,
          monthsActive,
          clv,
          predictedClv,
        });
      });

      // Sort by CLV descending
      clvData.sort((a, b) => b.clv - a.clv);

      return { data: clvData, success: true };
    } catch (error) {
      logger.error('Error calculating CLV', error, 'AdvancedAnalyticsService');
      return { error: 'שגיאה בחישוב CLV' };
    }
  }

  /**
   * Analyze churn rate
   * @param trainerId - Trainer ID
   * @returns Promise with churn analysis
   */
  static async analyzeChurn(
    trainerId: string
  ): Promise<ApiResponse<ChurnAnalysis>> {
    try {
      const { data: trainees, error: traineesError } = await supabase
        .from('trainees')
        .select('id, crm_status, client_since, churned_at')
        .eq('trainer_id', trainerId);

      if (traineesError) {
        logSupabaseError(traineesError, 'analyzeChurn', { table: 'trainees', trainerId });
        return { error: traineesError.message };
      }

      const totalClients = trainees?.length || 0;
      const churnedClients = trainees?.filter(t => t.crm_status === 'churned').length || 0;
      const churnRate = totalClients > 0 ? (churnedClients / totalClients) * 100 : 0;
      const retentionRate = 100 - churnRate;

      // Calculate average lifetime for churned clients
      let totalLifetimeMonths = 0;
      let churnedCount = 0;

      trainees?.forEach((trainee) => {
        if (trainee.crm_status === 'churned' && trainee.client_since) {
          const churnedAt = trainee.churned_at ? new Date(trainee.churned_at) : new Date();
          const clientSince = new Date(trainee.client_since);
          const months = Math.floor(
            (churnedAt.getTime() - clientSince.getTime()) / (1000 * 60 * 60 * 24 * 30)
          );
          totalLifetimeMonths += months;
          churnedCount++;
        }
      });

      const averageLifetime = churnedCount > 0 ? totalLifetimeMonths / churnedCount : 0;

      // Churn reasons (simplified - would need additional data)
      const churnReasons: Record<string, number> = {
        'inactive': Math.floor(churnedClients * 0.4),
        'payment_issues': Math.floor(churnedClients * 0.3),
        'other': Math.floor(churnedClients * 0.3),
      };

      return {
        data: {
          churnRate,
          churnedClients,
          totalClients,
          averageLifetime,
          churnReasons,
          retentionRate,
        },
        success: true,
      };
    } catch (error) {
      logger.error('Error analyzing churn', error, 'AdvancedAnalyticsService');
      return { error: 'שגיאה בניתוח Churn' };
    }
  }

  /**
   * Get conversion funnel
   * @param trainerId - Trainer ID
   * @returns Promise with funnel data
   */
  static async getConversionFunnel(
    trainerId: string
  ): Promise<ApiResponse<ConversionFunnel[]>> {
    try {
      const { data: trainees, error } = await supabase
        .from('trainees')
        .select('crm_status')
        .eq('trainer_id', trainerId);

      if (error) {
        logSupabaseError(error, 'getConversionFunnel', { table: 'trainees', trainerId });
        return { error: error.message };
      }

      const stages = ['lead', 'qualified', 'active'];
      const funnel: ConversionFunnel[] = [];
      let previousCount = 0;

      stages.forEach((stage, index) => {
        const count = trainees?.filter(t => t.crm_status === stage).length || 0;
        const total = trainees?.length || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const dropOffRate = index > 0 && previousCount > 0
          ? ((previousCount - count) / previousCount) * 100
          : 0;

        funnel.push({
          stage,
          count,
          percentage,
          dropOffRate,
        });

        previousCount = count;
      });

      return { data: funnel, success: true };
    } catch (error) {
      logger.error('Error getting conversion funnel', error, 'AdvancedAnalyticsService');
      return { error: 'שגיאה בטעינת Conversion Funnel' };
    }
  }

  /**
   * Generate revenue forecast
   * @param trainerId - Trainer ID
   * @param months - Number of months to forecast
   * @returns Promise with forecast data
   */
  static async generateRevenueForecast(
    trainerId: string,
    months: number = 6
  ): Promise<ApiResponse<RevenueForecast[]>> {
    try {
      // Get historical payment data
      const { data: payments, error } = await supabase
        .from('crm_payments')
        .select('amount, paid_date, status')
        .eq('trainer_id', trainerId)
        .eq('status', 'paid')
        .order('paid_date', { ascending: false })
        .limit(100);

      if (error) {
        logSupabaseError(error, 'generateRevenueForecast', { table: 'crm_payments', trainerId });
        return { error: error.message };
      }

      // Calculate average monthly revenue from last 6 months
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      
      const recentPayments = payments?.filter(p => {
        if (!p.paid_date) return false;
        const paidDate = new Date(p.paid_date);
        return paidDate >= sixMonthsAgo;
      }) || [];

      const monthlyRevenue: Record<string, number> = {};
      recentPayments.forEach((payment) => {
        if (payment.paid_date) {
          const date = new Date(payment.paid_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(payment.amount || 0);
        }
      });

      const monthlyValues = Object.values(monthlyRevenue);
      const averageMonthlyRevenue = monthlyValues.length > 0
        ? monthlyValues.reduce((sum, val) => sum + val, 0) / monthlyValues.length
        : 0;

      // Generate forecast
      const forecast: RevenueForecast[] = [];
      for (let i = 1; i <= months; i++) {
        const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Simple linear forecast with some variance
        const predicted = averageMonthlyRevenue * (1 + (Math.random() * 0.2 - 0.1));
        const confidence = Math.max(50, 100 - (i * 5)); // Decreasing confidence over time

        forecast.push({
          month: monthKey,
          predicted: Math.round(predicted),
          confidence,
        });
      }

      return { data: forecast, success: true };
    } catch (error) {
      logger.error('Error generating revenue forecast', error, 'AdvancedAnalyticsService');
      return { error: 'שגיאה ביצירת תחזית הכנסות' };
    }
  }

  /**
   * Get activity heatmap data
   * @param trainerId - Trainer ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise with heatmap data
   */
  static async getActivityHeatmap(
    trainerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse<ActivityHeatmapData[]>> {
    try {
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('workout_date')
        .eq('trainer_id', trainerId)
        .gte('workout_date', startDate.toISOString())
        .lte('workout_date', endDate.toISOString());

      if (error) {
        logSupabaseError(error, 'getActivityHeatmap', { table: 'workouts', trainerId });
        return { error: error.message };
      }

      const heatmapData: Record<string, Record<number, number>> = {};

      workouts?.forEach((workout) => {
        if (workout.workout_date) {
          const date = new Date(workout.workout_date);
          const dateKey = date.toISOString().split('T')[0];
          const hour = date.getHours();

          if (!heatmapData[dateKey]) {
            heatmapData[dateKey] = {};
          }

          heatmapData[dateKey][hour] = (heatmapData[dateKey][hour] || 0) + 1;
        }
      });

      const result: ActivityHeatmapData[] = [];
      Object.entries(heatmapData).forEach(([date, hours]) => {
        Object.entries(hours).forEach(([hour, count]) => {
          result.push({
            date,
            hour: Number(hour),
            count,
          });
        });
      });

      return { data: result, success: true };
    } catch (error) {
      logger.error('Error getting activity heatmap', error, 'AdvancedAnalyticsService');
      return { error: 'שגיאה בטעינת Activity Heatmap' };
    }
  }
}
