import { describe, it, expect, beforeEach, vi } from 'vitest';
import { habitsApi } from './habitsApi';
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

describe('habitsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTraineeHabits', () => {
    it('should get trainee habits successfully', async () => {
      const mockHabits = [
        { id: '1', trainee_id: '1', habit_name: 'Habit 1' },
        { id: '2', trainee_id: '1', habit_name: 'Habit 2' },
      ];
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockHabits,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await habitsApi.getTraineeHabits('trainee-1');

      expect(result).toEqual(mockHabits);
    });

    it('should return empty array for table not found error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST205', message: 'Table not found' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await habitsApi.getTraineeHabits('trainee-1');

      expect(result).toEqual([]);
    });
  });

  describe('createHabit', () => {
    it('should create habit successfully', async () => {
      const mockHabit = { id: '1', trainee_id: '1', habit_name: 'New Habit' };
      const input = { trainee_id: '1', habit_name: 'New Habit', habit_type: 'water' as const };
      
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockHabit,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await habitsApi.createHabit(input);

      expect(result).toEqual(mockHabit);
    });
  });

  describe('logHabit', () => {
    it('should log habit successfully', async () => {
      const mockLog = { id: '1', habit_id: '1', log_date: '2024-01-01' };
      const input = { habit_id: '1', log_date: '2024-01-01', actual_value: 100 };
      
      const mockChain = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockLog,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await habitsApi.logHabit(input);

      expect(result).toEqual(mockLog);
    });
  });
});
