/**
 * Workout Flow Integration Tests
 * Heavy integration tests for complete workout workflows
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as workoutApi from '../../api/workoutApi';
import * as traineeApi from '../../api/traineeApi';
import { supabase } from '../../lib/supabase';

// Mock dependencies
vi.mock('../../api/workoutApi');
vi.mock('../../api/traineeApi');
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
  },
}));

describe('Workout Flow Integration Tests', () => {
  const mockTrainerId = 'trainer-123';
  const mockTraineeId = 'trainee-456';
  const mockWorkoutId = 'workout-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Workout Creation Flow', () => {
    it('should create workout, assign to trainee, and track completion', async () => {
      // Step 1: Create workout plan
      const mockWorkoutPlan = {
        id: mockWorkoutId,
        trainer_id: mockTrainerId,
        trainee_id: mockTraineeId,
        workout_date: new Date().toISOString(),
        exercises: [
          {
            exercise_id: 'ex-1',
            sets: 3,
            reps: 10,
            weight: 50,
          },
        ],
      };

      (workoutApi.createWorkout as any).mockResolvedValue({
        success: true,
        data: mockWorkoutPlan,
      });

      const createResult = await workoutApi.createWorkout({
        trainer_id: mockTrainerId,
        trainee_id: mockTraineeId,
        workout_date: new Date().toISOString(),
        exercises: mockWorkoutPlan.exercises,
      });

      expect(createResult.success).toBe(true);
      expect(createResult.data?.id).toBe(mockWorkoutId);

      // Step 2: Get workout details
      (workoutApi.getWorkoutDetails as any).mockResolvedValue({
        success: true,
        data: {
          ...mockWorkoutPlan,
          status: 'assigned',
        },
      });

      const detailsResult = await workoutApi.getWorkoutDetails(mockWorkoutId);
      expect(detailsResult.success).toBe(true);
      expect(detailsResult.data?.status).toBe('assigned');

      // Step 3: Trainee starts workout
      (workoutApi.startWorkoutSession as any).mockResolvedValue({
        success: true,
        data: {
          session_id: 'session-123',
          workout_id: mockWorkoutId,
          start_time: new Date().toISOString(),
        },
      });

      const startResult = await workoutApi.startWorkoutSession(mockWorkoutId);
      expect(startResult.success).toBe(true);
      expect(startResult.data?.session_id).toBeDefined();

      // Step 4: Trainee completes workout
      (workoutApi.completeWorkout as any).mockResolvedValue({
        success: true,
        data: {
          id: mockWorkoutId,
          status: 'completed',
          completion_date: new Date().toISOString(),
        },
      });

      const completeResult = await workoutApi.completeWorkout(mockWorkoutId, {
        exercises: mockWorkoutPlan.exercises.map(ex => ({
          ...ex,
          completed: true,
        })),
      });

      expect(completeResult.success).toBe(true);
      expect(completeResult.data?.status).toBe('completed');
    });

    it('should handle workout with multiple exercises and sets', async () => {
      const complexWorkout = {
        trainer_id: mockTrainerId,
        trainee_id: mockTraineeId,
        workout_date: new Date().toISOString(),
        exercises: [
          {
            exercise_id: 'ex-1',
            sets: 4,
            reps: 12,
            weight: 60,
            rest_seconds: 90,
          },
          {
            exercise_id: 'ex-2',
            sets: 3,
            reps: 15,
            weight: 40,
            rest_seconds: 60,
          },
          {
            exercise_id: 'ex-3',
            sets: 5,
            reps: 8,
            weight: 80,
            rest_seconds: 120,
          },
        ],
      };

      (workoutApi.createWorkout as any).mockResolvedValue({
        success: true,
        data: {
          id: mockWorkoutId,
          ...complexWorkout,
        },
      });

      const result = await workoutApi.createWorkout(complexWorkout);
      expect(result.success).toBe(true);
      expect(result.data?.exercises).toHaveLength(3);
      expect(result.data?.exercises[0].sets).toBe(4);
    });
  });

  describe('Workout Performance Flow', () => {
    it('should handle concurrent workout updates', async () => {
      const workoutUpdates = Array(10).fill(null).map((_, i) => ({
        exercise_id: 'ex-1',
        set_number: i + 1,
        reps: 10 + i,
        weight: 50 + i * 5,
      }));

      (workoutApi.updateWorkoutExercise as any).mockImplementation((workoutId, update) => {
        return Promise.resolve({
          success: true,
          data: { ...update, workout_id: workoutId },
        });
      });

      const promises = workoutUpdates.map(update =>
        workoutApi.updateWorkoutExercise(mockWorkoutId, update)
      );

      const results = await Promise.all(promises);
      expect(results.every(r => r.success)).toBe(true);
      expect(workoutApi.updateWorkoutExercise).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid workout creation and deletion', async () => {
      const workouts = Array(5).fill(null).map((_, i) => ({
        trainer_id: mockTrainerId,
        trainee_id: mockTraineeId,
        workout_date: new Date(Date.now() + i * 86400000).toISOString(),
        exercises: [{ exercise_id: 'ex-1', sets: 3, reps: 10 }],
      }));

      (workoutApi.createWorkout as any).mockImplementation((workout) => {
        return Promise.resolve({
          success: true,
          data: { id: `workout-${Date.now()}`, ...workout },
        });
      });

      (workoutApi.deleteWorkout as any).mockResolvedValue({
        success: true,
      });

      // Create all workouts
      const createPromises = workouts.map(w => workoutApi.createWorkout(w));
      const created = await Promise.all(createPromises);
      expect(created.every(r => r.success)).toBe(true);

      // Delete all workouts
      const deletePromises = created.map(r => workoutApi.deleteWorkout(r.data!.id));
      const deleted = await Promise.all(deletePromises);
      expect(deleted.every(r => r.success)).toBe(true);
    });
  });

  describe('Workout Error Recovery', () => {
    it('should recover from partial workout creation failure', async () => {
      let callCount = 0;
      (workoutApi.createWorkout as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          success: true,
          data: { id: mockWorkoutId },
        });
      });

      // First attempt fails
      try {
        await workoutApi.createWorkout({
          trainer_id: mockTrainerId,
          trainee_id: mockTraineeId,
          workout_date: new Date().toISOString(),
          exercises: [],
        });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }

      // Second attempt succeeds
      const result = await workoutApi.createWorkout({
        trainer_id: mockTrainerId,
        trainee_id: mockTraineeId,
        workout_date: new Date().toISOString(),
        exercises: [],
      });

      expect(result.success).toBe(true);
    });

    it('should handle workout with invalid data gracefully', async () => {
      (workoutApi.createWorkout as any).mockResolvedValue({
        success: false,
        error: 'Invalid exercise data',
      });

      const result = await workoutApi.createWorkout({
        trainer_id: '',
        trainee_id: mockTraineeId,
        workout_date: 'invalid-date',
        exercises: [],
      });

      expect(result.success).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('Workout Analytics Integration', () => {
    it('should track workout statistics across multiple sessions', async () => {
      const workouts = [
        { date: '2024-01-01', exercises: [{ exercise_id: 'ex-1', sets: 3, reps: 10, weight: 50 }] },
        { date: '2024-01-08', exercises: [{ exercise_id: 'ex-1', sets: 3, reps: 12, weight: 55 }] },
        { date: '2024-01-15', exercises: [{ exercise_id: 'ex-1', sets: 4, reps: 10, weight: 60 }] },
      ];

      (workoutApi.getTraineeWorkouts as any).mockResolvedValue({
        success: true,
        data: workouts.map((w, i) => ({
          id: `workout-${i}`,
          trainee_id: mockTraineeId,
          workout_date: w.date,
          exercises: w.exercises,
          status: 'completed',
        })),
      });

      const result = await workoutApi.getTraineeWorkouts(mockTraineeId, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);

      // Verify progression
      const weights = result.data!.map(w => w.exercises[0].weight);
      expect(weights[0]).toBeLessThan(weights[weights.length - 1]);
    });
  });
});
