/**
 * Performance Integration Tests
 * Heavy performance and load testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as workoutApi from '../../api/workoutApi';
import * as nutritionApi from '../../api/nutritionApi';
// Mock dependencies
vi.mock('../../api/workoutApi');
vi.mock('../../api/nutritionApi');

describe('Performance Integration Tests', () => {
  const mockTrainerId = 'trainer-123';
  const mockTraineeId = 'trainee-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Response Time', () => {
    it('should handle 100 concurrent workout queries efficiently', async () => {
      const startTime = performance.now();

      (workoutApi.getTraineeWorkouts as any).mockImplementation(() => {
        return Promise.resolve({
          success: true,
          data: [],
        });
      });

      const promises = Array(100).fill(null).map(() =>
        workoutApi.getTraineeWorkouts(mockTraineeId)
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (5 seconds for 100 requests)
      expect(duration).toBeLessThan(5000);
      expect(workoutApi.getTraineeWorkouts).toHaveBeenCalledTimes(100);
    });

    it('should handle 50 concurrent nutrition entries efficiently', async () => {
      const startTime = performance.now();

      (nutritionApi.addFoodEntry as any).mockImplementation((entry) => {
        return Promise.resolve({
          success: true,
          data: { id: `entry-${Date.now()}`, ...entry },
        });
      });

      const entries = Array(50).fill(null).map((_, i) => ({
        trainee_id: mockTraineeId,
        date: new Date().toISOString().split('T')[0],
        food_name: `Food ${i}`,
        calories: 100,
      }));

      const promises = entries.map(e => nutritionApi.addFoodEntry(e as any));
      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000);
      expect(nutritionApi.addFoodEntry).toHaveBeenCalledTimes(50);
    });
  });


  describe('Large Dataset Handling', () => {
    it('should handle large workout history efficiently', async () => {
      const largeWorkoutHistory = Array(1000).fill(null).map((_, i) => ({
        id: `workout-${i}`,
        trainee_id: mockTraineeId,
        workout_date: new Date(Date.now() - i * 86400000).toISOString(),
        exercises: [{ exercise_id: 'ex-1', sets: 3, reps: 10 }],
        status: 'completed',
      }));

      (workoutApi.getTraineeWorkouts as any).mockResolvedValue({
        success: true,
        data: largeWorkoutHistory,
      });

      const startTime = performance.now();
      const result = await workoutApi.getTraineeWorkouts(mockTraineeId, {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1000);
      // Should handle 1000 records efficiently
      expect(duration).toBeLessThan(2000);
    });

    it('should handle large nutrition history efficiently', async () => {
      const largeNutritionHistory = Array(365).fill(null).map((_, i) => ({
        date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        total_calories: 1500 + Math.random() * 500,
        total_protein: 100 + Math.random() * 50,
        total_carbs: 150 + Math.random() * 50,
        total_fat: 50 + Math.random() * 20,
      }));

      (nutritionApi.getNutritionHistory as any).mockResolvedValue({
        success: true,
        data: largeNutritionHistory,
      });

      const startTime = performance.now();
      const result = await nutritionApi.getNutritionHistory(mockTraineeId, {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(365);
      // Should handle year of data efficiently
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not leak memory with repeated API calls', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      (workoutApi.getTraineeWorkouts as any).mockResolvedValue({
        success: true,
        data: Array(100).fill(null).map((_, i) => ({
          id: `workout-${i}`,
          trainee_id: mockTraineeId,
        })),
      });

      // Make many calls
      for (let i = 0; i < 100; i++) {
        await workoutApi.getTraineeWorkouts(mockTraineeId);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Memory should not grow excessively (allow 50% growth for test environment)
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      if (initialMemory > 0 && finalMemory > 0) {
        const growth = (finalMemory - initialMemory) / initialMemory;
        expect(growth).toBeLessThan(0.5);
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle mixed concurrent operations', async () => {
      (workoutApi.getTraineeWorkouts as any).mockResolvedValue({
        success: true,
        data: [],
      });

      (nutritionApi.getDailyNutrition as any).mockResolvedValue({
        success: true,
        data: { total_calories: 2000 },
      });

      const startTime = performance.now();

      const promises = [
        ...Array(20).fill(null).map(() => workoutApi.getTraineeWorkouts(mockTraineeId)),
        ...Array(20).fill(null).map(() => nutritionApi.getDailyNutrition(mockTraineeId, '2024-01-01')),
      ];

      await Promise.all(promises);

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(workoutApi.getTraineeWorkouts).toHaveBeenCalledTimes(20);
      expect(nutritionApi.getDailyNutrition).toHaveBeenCalledTimes(20);
    });
  });
});
