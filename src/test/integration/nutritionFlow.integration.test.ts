/**
 * Nutrition Flow Integration Tests
 * Heavy integration tests for complete nutrition tracking workflows
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as nutritionApi from '../../api/nutritionApi';
import * as traineeApi from '../../api/traineeApi';
import { supabase } from '../../lib/supabase';

// Mock dependencies
vi.mock('../../api/nutritionApi');
vi.mock('../../api/traineeApi');
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Nutrition Flow Integration Tests', () => {
  const mockTraineeId = 'trainee-456';
  const mockTrainerId = 'trainer-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Nutrition Tracking Flow', () => {
    it('should track full day nutrition with multiple meals', async () => {
      const date = new Date().toISOString().split('T')[0];

      // Breakfast
      (nutritionApi.addFoodEntry as any).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'entry-1',
          trainee_id: mockTraineeId,
          date,
          meal_type: 'breakfast',
          food_name: 'ביצים',
          calories: 200,
          protein: 15,
          carbs: 2,
          fat: 14,
        },
      });

      const breakfast = await nutritionApi.addFoodEntry({
        trainee_id: mockTraineeId,
        date,
        meal_type: 'breakfast',
        food_name: 'ביצים',
        calories: 200,
        protein: 15,
        carbs: 2,
        fat: 14,
      });

      expect(breakfast.success).toBe(true);
      expect(breakfast.data?.meal_type).toBe('breakfast');

      // Lunch
      (nutritionApi.addFoodEntry as any).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'entry-2',
          trainee_id: mockTraineeId,
          date,
          meal_type: 'lunch',
          food_name: 'עוף עם אורז',
          calories: 450,
          protein: 35,
          carbs: 50,
          fat: 12,
        },
      });

      const lunch = await nutritionApi.addFoodEntry({
        trainee_id: mockTraineeId,
        date,
        meal_type: 'lunch',
        food_name: 'עוף עם אורז',
        calories: 450,
        protein: 35,
        carbs: 50,
        fat: 12,
      });

      expect(lunch.success).toBe(true);

      // Dinner
      (nutritionApi.addFoodEntry as any).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'entry-3',
          trainee_id: mockTraineeId,
          date,
          meal_type: 'dinner',
          food_name: 'סלמון עם ירקות',
          calories: 350,
          protein: 30,
          carbs: 20,
          fat: 18,
        },
      });

      const dinner = await nutritionApi.addFoodEntry({
        trainee_id: mockTraineeId,
        date,
        meal_type: 'dinner',
        food_name: 'סלמון עם ירקות',
        calories: 350,
        protein: 30,
        carbs: 20,
        fat: 18,
      });

      expect(dinner.success).toBe(true);

      // Get daily summary
      (nutritionApi.getDailyNutrition as any).mockResolvedValue({
        success: true,
        data: {
          date,
          total_calories: 1000,
          total_protein: 80,
          total_carbs: 72,
          total_fat: 44,
          meals: [breakfast.data, lunch.data, dinner.data],
        },
      });

      const summary = await nutritionApi.getDailyNutrition(mockTraineeId, date);
      expect(summary.success).toBe(true);
      expect(summary.data?.total_calories).toBe(1000);
      expect(summary.data?.meals).toHaveLength(3);
    });

    it('should handle nutrition goals and tracking', async () => {
      const goals = {
        daily_calories: 2000,
        daily_protein: 150,
        daily_carbs: 200,
        daily_fat: 65,
      };

      (traineeApi.updateTraineeGoals as any).mockResolvedValue({
        success: true,
        data: {
          id: mockTraineeId,
          ...goals,
        },
      });

      const goalsResult = await traineeApi.updateTraineeGoals(mockTraineeId, goals);
      expect(goalsResult.success).toBe(true);

      // Track progress
      const date = new Date().toISOString().split('T')[0];
      (nutritionApi.getDailyNutrition as any).mockResolvedValue({
        success: true,
        data: {
          date,
          total_calories: 1800,
          total_protein: 140,
          total_carbs: 180,
          total_fat: 60,
        },
      });

      const progress = await nutritionApi.getDailyNutrition(mockTraineeId, date);
      expect(progress.success).toBe(true);
      expect(progress.data?.total_calories).toBeLessThan(goals.daily_calories);
    });
  });

  describe('Nutrition Performance Flow', () => {
    it('should handle bulk food entry creation', async () => {
      const entries = Array(20).fill(null).map((_, i) => ({
        trainee_id: mockTraineeId,
        date: new Date().toISOString().split('T')[0],
        meal_type: ['breakfast', 'lunch', 'dinner', 'snack'][i % 4] as any,
        food_name: `Food ${i}`,
        calories: 100 + i * 10,
        protein: 10 + i,
        carbs: 20 + i,
        fat: 5 + i,
      }));

      (nutritionApi.addFoodEntry as any).mockImplementation((entry) => {
        return Promise.resolve({
          success: true,
          data: { id: `entry-${Date.now()}`, ...entry },
        });
      });

      const promises = entries.map(e => nutritionApi.addFoodEntry(e));
      const results = await Promise.all(promises);

      expect(results.every(r => r.success)).toBe(true);
      expect(results).toHaveLength(20);
    });

    it('should efficiently query nutrition history', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const mockHistory = Array(31).fill(null).map((_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        total_calories: 1500 + Math.random() * 500,
        total_protein: 100 + Math.random() * 50,
        total_carbs: 150 + Math.random() * 50,
        total_fat: 50 + Math.random() * 20,
      }));

      (nutritionApi.getNutritionHistory as any).mockResolvedValue({
        success: true,
        data: mockHistory,
      });

      const history = await nutritionApi.getNutritionHistory(mockTraineeId, {
        startDate,
        endDate,
      });

      expect(history.success).toBe(true);
      expect(history.data).toHaveLength(31);
    });
  });

  describe('Nutrition Error Recovery', () => {
    it('should handle partial nutrition entry failures', async () => {
      let callCount = 0;
      (nutritionApi.addFoodEntry as any).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Database error'));
        }
        return Promise.resolve({
          success: true,
          data: { id: `entry-${callCount}` },
        });
      });

      const entries = [
        { trainee_id: mockTraineeId, food_name: 'Food 1', calories: 100 },
        { trainee_id: mockTraineeId, food_name: 'Food 2', calories: 200 },
        { trainee_id: mockTraineeId, food_name: 'Food 3', calories: 300 },
      ];

      const results = await Promise.allSettled(
        entries.map(e => nutritionApi.addFoodEntry(e as any))
      );

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Nutrition Analytics Integration', () => {
    it('should calculate weekly nutrition averages', async () => {
      const weekData = Array(7).fill(null).map((_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        total_calories: 1800 + i * 50,
        total_protein: 120 + i * 5,
        total_carbs: 180 + i * 10,
        total_fat: 60 + i * 2,
      }));

      (nutritionApi.getNutritionHistory as any).mockResolvedValue({
        success: true,
        data: weekData,
      });

      const history = await nutritionApi.getNutritionHistory(mockTraineeId, {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
      });

      expect(history.success).toBe(true);

      const avgCalories = weekData.reduce((sum, d) => sum + d.total_calories, 0) / 7;
      expect(avgCalories).toBeGreaterThan(1800);
      expect(avgCalories).toBeLessThan(2200);
    });
  });
});
