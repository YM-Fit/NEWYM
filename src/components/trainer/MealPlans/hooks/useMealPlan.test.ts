import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMealPlan } from './useMealPlan';
import { supabase } from '../../../../lib/supabase';
import type { Meal } from '../types/mealPlanTypes';

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('useMealPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateTotalMacros', () => {
    it('should calculate from total_calories when available', () => {
      const { result } = renderHook(() => 
        useMealPlan('trainee-1', 'trainer-1')
      );
      
      // Mock meals with total_calories
      const mockMeals: Meal[] = [
        { 
          total_calories: 500, 
          total_protein: 30, 
          total_carbs: 50, 
          total_fat: 20,
          meal_time: '08:00',
          meal_name: 'breakfast',
          description: '',
          alternatives: '',
          calories: null,
          protein: null,
          carbs: null,
          fat: null,
          notes: '',
          order_index: 0,
        },
        { 
          total_calories: 300, 
          total_protein: 20, 
          total_carbs: 30, 
          total_fat: 10,
          meal_time: '13:00',
          meal_name: 'lunch',
          description: '',
          alternatives: '',
          calories: null,
          protein: null,
          carbs: null,
          fat: null,
          notes: '',
          order_index: 1,
        },
      ];
      
      // Set meals directly
      result.current.setMeals(mockMeals);
      
      // Test calculation
      const totals = result.current.calculateTotalMacros();
      expect(totals.calories).toBe(800);
      expect(totals.protein).toBe(50);
      expect(totals.carbs).toBe(80);
      expect(totals.fat).toBe(30);
    });

    it('should calculate from food_items when total_calories is null', () => {
      const { result } = renderHook(() => 
        useMealPlan('trainee-1', 'trainer-1')
      );
      
      const mockMeals: Meal[] = [
        {
          total_calories: null,
          total_protein: null,
          total_carbs: null,
          total_fat: null,
          meal_time: '08:00',
          meal_name: 'breakfast',
          description: '',
          alternatives: '',
          calories: null,
          protein: null,
          carbs: null,
          fat: null,
          notes: '',
          order_index: 0,
          food_items: [
            { 
              id: '1',
              meal_id: 'meal-1',
              food_name: 'ביצה',
              quantity: 100,
              unit: 'g',
              calories: 200,
              protein: 15,
              carbs: 20,
              fat: 8,
              order_index: 0,
            },
            { 
              id: '2',
              meal_id: 'meal-1',
              food_name: 'לחם',
              quantity: 50,
              unit: 'g',
              calories: 150,
              protein: 10,
              carbs: 15,
              fat: 5,
              order_index: 1,
            },
          ],
        },
      ];
      
      result.current.setMeals(mockMeals);
      
      const totals = result.current.calculateTotalMacros();
      expect(totals.calories).toBe(350);
      expect(totals.protein).toBe(25);
      expect(totals.carbs).toBe(35);
      expect(totals.fat).toBe(13);
    });

    it('should return zeros for empty meals', () => {
      const { result } = renderHook(() => 
        useMealPlan('trainee-1', 'trainer-1')
      );
      
      result.current.setMeals([]);
      
      const totals = result.current.calculateTotalMacros();
      expect(totals.calories).toBe(0);
      expect(totals.protein).toBe(0);
      expect(totals.carbs).toBe(0);
      expect(totals.fat).toBe(0);
    });

    it('should prioritize total_calories over food_items', () => {
      const { result } = renderHook(() => 
        useMealPlan('trainee-1', 'trainer-1')
      );
      
      const mockMeals: Meal[] = [
        {
          total_calories: 500,
          total_protein: 30,
          total_carbs: 50,
          total_fat: 20,
          meal_time: '08:00',
          meal_name: 'breakfast',
          description: '',
          alternatives: '',
          calories: null,
          protein: null,
          carbs: null,
          fat: null,
          notes: '',
          order_index: 0,
          food_items: [
            { 
              id: '1',
              meal_id: 'meal-1',
              food_name: 'ביצה',
              quantity: 100,
              unit: 'g',
              calories: 200,
              protein: 15,
              carbs: 20,
              fat: 8,
              order_index: 0,
            },
          ],
        },
      ];
      
      result.current.setMeals(mockMeals);
      
      const totals = result.current.calculateTotalMacros();
      // Should use total_calories (500) not food_items (200)
      expect(totals.calories).toBe(500);
      expect(totals.protein).toBe(30);
    });

    it('should handle meals with no data', () => {
      const { result } = renderHook(() => 
        useMealPlan('trainee-1', 'trainer-1')
      );
      
      const mockMeals: Meal[] = [
        {
          total_calories: null,
          total_protein: null,
          total_carbs: null,
          total_fat: null,
          meal_time: '08:00',
          meal_name: 'breakfast',
          description: '',
          alternatives: '',
          calories: null,
          protein: null,
          carbs: null,
          fat: null,
          notes: '',
          order_index: 0,
          food_items: [],
        },
      ];
      
      result.current.setMeals(mockMeals);
      
      const totals = result.current.calculateTotalMacros();
      expect(totals.calories).toBe(0);
      expect(totals.protein).toBe(0);
    });
  });
});
