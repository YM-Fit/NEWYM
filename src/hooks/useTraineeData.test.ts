import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTraineeData } from './useTraineeData';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('useTraineeData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load trainee data successfully', async () => {
    const mockMeasurements = [{ id: '1', trainee_id: '1', weight: 70 }];
    const mockWorkouts = [
      {
        workouts: {
          id: '1',
          workout_date: '2024-01-01',
          is_completed: true,
          is_self_recorded: false,
          created_at: '2024-01-01',
          workout_exercises: [],
        },
      },
    ];
    const mockSelfWeights = [{ id: '1', trainee_id: '1', weight: 70 }];

    const mockChain1 = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockMeasurements,
        error: null,
      }),
    };

    const mockChain2 = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockWorkouts,
        error: null,
      }),
    };

    const mockChain3 = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockSelfWeights,
        error: null,
      }),
    };

    (supabase.from as any)
      .mockReturnValueOnce(mockChain1)
      .mockReturnValueOnce(mockChain2)
      .mockReturnValueOnce(mockChain3);

    const { result } = renderHook(() => useTraineeData());

    const data = await result.current.loadTraineeData('trainee-1');

    expect(data.measurements).toEqual(mockMeasurements);
    expect(data.workouts).toBeDefined();
    expect(data.selfWeights).toEqual(mockSelfWeights);
  });

  it('should handle errors', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      }),
    };

    (supabase.from as any).mockReturnValue(mockChain);

    const { result } = renderHook(() => useTraineeData());

    await expect(result.current.loadTraineeData('trainee-1')).rejects.toThrow();
    expect(logger.error).toHaveBeenCalled();
  });
});
