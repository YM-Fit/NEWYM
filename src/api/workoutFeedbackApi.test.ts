import { describe, it, expect, beforeEach, vi } from 'vitest';
import { workoutFeedbackApi } from './workoutFeedbackApi';
import { supabase } from '../lib/supabase';
import { handleApiError } from './config';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('./config', () => ({
  handleApiError: vi.fn((error, message) => new Error(message)),
}));

describe('workoutFeedbackApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkoutFeedback', () => {
    it('should get workout feedback successfully', async () => {
      const mockFeedback = {
        id: '1',
        workout_id: '1',
        trainee_id: '1',
        overall_rpe: 7,
      };
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockFeedback,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await workoutFeedbackApi.getWorkoutFeedback('workout-1', 'trainee-1');

      expect(result).toEqual(mockFeedback);
    });

    it('should return null when no feedback exists', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await workoutFeedbackApi.getWorkoutFeedback('workout-1', 'trainee-1');

      expect(result).toBe(null);
    });
  });

  describe('submitFeedback', () => {
    it('should submit feedback successfully', async () => {
      const mockFeedback = {
        id: '1',
        workout_id: '1',
        trainee_id: '1',
        overall_rpe: 8,
      };
      const input = {
        workout_id: '1',
        trainee_id: '1',
        overall_rpe: 8,
      };
      
      const mockChain = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockFeedback,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await workoutFeedbackApi.submitFeedback(input);

      expect(result).toEqual(mockFeedback);
    });
  });

  describe('getTraineeFeedbackHistory', () => {
    it('should get feedback history successfully', async () => {
      const mockFeedback = [
        { id: '1', workout_id: '1', trainee_id: '1' },
        { id: '2', workout_id: '2', trainee_id: '1' },
      ];
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockFeedback,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await workoutFeedbackApi.getTraineeFeedbackHistory('trainee-1', 10);

      expect(result).toEqual(mockFeedback);
    });
  });
});
