import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getActiveMealPlanWithMeals,
  createFoodItem,
  updateFoodItem,
} from './nutritionApi';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('nutritionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveMealPlanWithMeals', () => {
    it('should return null when traineeId is empty', async () => {
      const result = await getActiveMealPlanWithMeals('');

      expect(result.plan).toBe(null);
      expect(result.meals).toEqual([]);
    });

    it('should get active meal plan successfully', async () => {
      const mockPlan = { id: '1', trainee_id: '1', is_active: true };
      const mockMeals = [{ id: '1', plan_id: '1' }];
      const mockFoodItems = [{ id: '1', meal_id: '1', calories: 100 }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockFoodItems,
        error: null,
      });

      (supabase.from as any)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockPlan,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: mockSelect,
          eq: mockEq,
          order: vi.fn().mockResolvedValue({
            data: mockMeals,
            error: null,
          }),
        })
        .mockReturnValue({
          select: mockSelect,
          eq: mockEq,
          order: mockOrder,
        });

      const result = await getActiveMealPlanWithMeals('trainee-1');

      expect(result.plan).toEqual(mockPlan);
      expect(result.meals.length).toBeGreaterThan(0);
    });

    it('should handle plan error', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Plan error' },
        }),
      });

      const result = await getActiveMealPlanWithMeals('trainee-1');

      expect(result.plan).toBe(null);
      expect(result.meals).toEqual([]);
    });
  });

  describe('createFoodItem', () => {
    it('should create food item successfully', async () => {
      const mockFoodItem = {
        id: '1',
        meal_id: '1',
        name: 'Apple',
        calories: 100,
      };

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockFoodItem,
          error: null,
        }),
      });

      const result = await createFoodItem('meal-1', {
        name: 'Apple',
        calories: 100,
      });

      expect(result).toEqual(mockFoodItem);
    });

    it('should handle creation error', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Creation failed' },
        }),
      });

      const result = await createFoodItem('meal-1', {
        name: 'Apple',
        calories: 100,
      });

      expect(result).toBe(null);
    });
  });

  describe('updateFoodItem', () => {
    it('should update food item successfully', async () => {
      const mockFoodItem = {
        id: '1',
        meal_id: '1',
        name: 'Updated Apple',
        calories: 120,
      };

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockFoodItem,
          error: null,
        }),
      });

      const result = await updateFoodItem('item-1', {
        calories: 120,
      });

      expect(result).toEqual(mockFoodItem);
    });
  });
});
