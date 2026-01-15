import { describe, it, expect, beforeEach, vi } from 'vitest';
import { goalsApi } from './goalsApi';
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

describe('goalsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTraineeGoals', () => {
    it('should get trainee goals successfully', async () => {
      const mockGoals = [
        { id: '1', trainee_id: '1', title: 'Goal 1' },
        { id: '2', trainee_id: '1', title: 'Goal 2' },
      ];
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockGoals,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await goalsApi.getTraineeGoals('trainee-1');

      expect(result).toEqual(mockGoals);
    });

    it('should handle query error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await expect(goalsApi.getTraineeGoals('trainee-1')).rejects.toThrow();
      expect(handleApiError).toHaveBeenCalled();
    });
  });

  describe('createGoal', () => {
    it('should create goal successfully', async () => {
      const mockGoal = { id: '1', trainee_id: '1', title: 'New Goal' };
      const input = { trainee_id: '1', goal_type: 'weight' as const, title: 'New Goal' };
      
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockGoal,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await goalsApi.createGoal(input);

      expect(result).toEqual(mockGoal);
    });
  });

  describe('updateGoal', () => {
    it('should update goal successfully', async () => {
      const mockGoal = { id: '1', title: 'Updated Goal' };
      
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockGoal,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await goalsApi.updateGoal('goal-1', { title: 'Updated Goal' });

      expect(result).toEqual(mockGoal);
    });
  });

  describe('deleteGoal', () => {
    it('should delete goal successfully', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await expect(goalsApi.deleteGoal('goal-1')).resolves.not.toThrow();
    });
  });

  describe('updateGoalProgress', () => {
    it('should update goal progress successfully', async () => {
      const mockGoal = { id: '1', current_value: 50 };
      
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockGoal,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await goalsApi.updateGoalProgress('goal-1', 50);

      expect(result.current_value).toBe(50);
    });
  });
});
