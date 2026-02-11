import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cardioApi } from './cardioApi';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mocks are not needed for these tests

describe('cardioApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCardioTypes', () => {
    it('should get cardio types successfully', async () => {
      const mockTypes = [
        { id: '1', trainer_id: '1', name: 'Running' },
        { id: '2', trainer_id: '1', name: 'Cycling' },
      ];
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTypes,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await cardioApi.getCardioTypes('trainer-1');

      expect(result).toEqual(mockTypes);
    });
  });

  describe('createCardioType', () => {
    it('should create cardio type successfully', async () => {
      const mockType = { id: '1', trainer_id: '1', name: 'Swimming' };
      const input = { trainer_id: '1', name: 'Swimming' };
      
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockType,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await cardioApi.createCardioType(input);

      expect(result).toEqual(mockType);
    });
  });

  describe('getTraineeActivities', () => {
    it('should get cardio activities successfully', async () => {
      const mockActivities = [
        { id: '1', trainee_id: '1', cardio_type_id: '1', date: '2024-01-01' },
      ];
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockActivities,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await cardioApi.getTraineeActivities('trainee-1');

      expect(result).toEqual(mockActivities);
    });
  });

  describe('createCardioActivity', () => {
    it('should create cardio activity successfully', async () => {
      const mockActivity = {
        id: '1',
        trainee_id: '1',
        trainer_id: '1',
        cardio_type_id: '1',
        date: '2024-01-01',
      };
      const input = {
        trainee_id: '1',
        trainer_id: '1',
        cardio_type_id: '1',
      };
      
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockActivity,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await cardioApi.createActivity(input);

      expect(result).toEqual(mockActivity);
    });
  });
});
