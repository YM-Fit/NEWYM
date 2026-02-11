import { describe, it, expect, beforeEach, vi } from 'vitest';
import { smartRecommendations, type Recommendation } from './smartRecommendations';

const createChainMock = (resolved: { data: unknown; error: null }) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
  };
  return chain;
};

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../api/nutritionApi', () => ({
  getActiveMealPlanWithMeals: vi.fn(),
}));

vi.mock('../api/analyticsApi', () => ({
  analyticsApi: { getTraineeAnalytics: vi.fn() },
}));

vi.mock('./calorieCalculations', () => ({
  calculateFullCalorieData: vi.fn().mockReturnValue({ tdee: 2000 }),
}));

import { supabase } from '../lib/supabase';
import { analyticsApi } from '../api/analyticsApi';

describe('smartRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(analyticsApi.getTraineeAnalytics).mockResolvedValue({
      adherence_percentage: 80,
    } as any);
    vi.mocked(supabase.from).mockReturnValue(createChainMock({ data: null, error: null }) as any);
  });

  describe('getTraineeRecommendations', () => {
    it('should return an array', async () => {
      const result = await smartRecommendations.getTraineeRecommendations('trainee-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return recommendations sorted by priority (high first)', async () => {
      vi.mocked(analyticsApi.getTraineeAnalytics).mockResolvedValue({
        adherence_percentage: 50,
      } as any);

      const result = await smartRecommendations.getTraineeRecommendations('trainee-1');
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      for (let i = 1; i < result.length; i++) {
        const prev = priorityOrder[result[i - 1].priority] ?? 0;
        const curr = priorityOrder[result[i].priority] ?? 0;
        expect(curr).toBeLessThanOrEqual(prev);
      }
    });

    it('should add workout recommendation when no workout for 3+ days', async () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      vi.mocked(supabase.from).mockReturnValue(
        createChainMock({
          data: { workouts: { workout_date: fourDaysAgo.toISOString().split('T')[0] } },
          error: null,
        }) as any
      );

      const result = await smartRecommendations.getTraineeRecommendations('trainee-1');
      const workoutRec = result.find((r) => r.type === 'workout' && r.title === 'זמן לאימון!');
      expect(workoutRec).toBeDefined();
      expect(workoutRec?.description).toMatch(/\d/);
    });

    it('should return Recommendation type with required fields', async () => {
      const result = await smartRecommendations.getTraineeRecommendations('trainee-1');
      result.forEach((r: Recommendation) => {
        expect(r).toHaveProperty('type');
        expect(r).toHaveProperty('priority');
        expect(r).toHaveProperty('title');
        expect(r).toHaveProperty('description');
      });
    });
  });
});
