import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTrainee,
  getTrainees,
  createTrainee,
  updateTrainee,
} from './traineeApi';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('traineeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTrainee', () => {
    it('should get trainee successfully', async () => {
      const mockTrainee = { id: '1', name: 'Test Trainee' };
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockTrainee,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getTrainee('trainee-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTrainee);
    });

    it('should handle query error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getTrainee('trainee-1');

      expect(result.error).toBe('Query failed');
    });
  });

  describe('getTrainees', () => {
    it('should get trainees successfully', async () => {
      const mockTrainees = [
        { id: '1', name: 'Trainee 1' },
        { id: '2', name: 'Trainee 2' },
      ];
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTrainees,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getTrainees('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTrainees);
    });
  });

  describe('createTrainee', () => {
    it('should create trainee successfully', async () => {
      const mockTrainee = { id: '1', name: 'New Trainee' };
      const traineeData = { name: 'New Trainee', phone: '0521234567' };
      
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTrainee,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await createTrainee('trainer-1', traineeData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTrainee);
    });
  });

  describe('updateTrainee', () => {
    it('should update trainee successfully', async () => {
      const mockTrainee = { id: '1', name: 'Updated Trainee' };
      
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTrainee,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await updateTrainee('trainee-1', { name: 'Updated Trainee' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTrainee);
    });
  });
});
