import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveWorkout, getTraineeWorkouts, getWorkoutDetails } from './workoutApi';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('./config', () => ({
  API_CONFIG: {
    SUPABASE_URL: 'https://test.supabase.co',
  },
}));

describe('workoutApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('saveWorkout', () => {
    it('should save workout successfully', async () => {
      const workoutData = {
        workout_id: '1',
        trainee_id: '1',
        exercises: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ workout_id: '1' }),
      });

      const result = await saveWorkout(workoutData, 'token');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ workout_id: '1' });
    });

    it('should handle save error', async () => {
      const workoutData = {
        workout_id: '1',
        trainee_id: '1',
        exercises: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Save failed' }),
      });

      const result = await saveWorkout(workoutData, 'token');

      expect(result.error).toBe('Save failed');
    });
  });

  describe('getTraineeWorkouts', () => {
    it('should get trainee workouts successfully', async () => {
      const mockData = [{ id: '1', workout_date: '2024-01-01' }];
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      
      // Mock the chain so eq().eq() works
      mockChain.eq = vi.fn()
        .mockReturnValueOnce(mockChain)
        .mockResolvedValueOnce({
          data: mockData,
          error: null,
        });

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getTraineeWorkouts('trainee-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should handle query error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      
      mockChain.eq = vi.fn()
        .mockReturnValueOnce(mockChain)
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Query failed' },
        });

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getTraineeWorkouts('trainee-1');

      expect(result.error).toBe('Query failed');
    });
  });

  describe('getWorkoutDetails', () => {
    it('should get workout details successfully', async () => {
      const mockData = [{ id: '1', exercise_id: '1', exercises: [] }];
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getWorkoutDetails('workout-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeUndefined();
    });
  });
});
