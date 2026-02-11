import { describe, it, expect } from 'vitest';
import { calculateNutrition, recalculateFromPer100g } from './nutritionCalculator';
import type { FoodCatalogItem } from '../../../../data/foodCatalog';

describe('nutritionCalculator', () => {
  const mockFoodItem: FoodCatalogItem = {
    id: '1',
    name: 'ביצה',
    category: 'protein',
    calories_per_100g: 155,
    protein_per_100g: 13,
    carbs_per_100g: 1.1,
    fat_per_100g: 11,
  };

  describe('calculateNutrition', () => {
    it('should calculate nutrition for 100g', () => {
      const result = calculateNutrition(mockFoodItem, 100);
      expect(result.calories).toBe(155);
      expect(result.protein).toBe(13);
      expect(result.carbs).toBe(1);
      expect(result.fat).toBe(11);
    });

    it('should calculate nutrition for 50g', () => {
      const result = calculateNutrition(mockFoodItem, 50);
      expect(result.calories).toBe(78); // 155 * 0.5 rounded
      expect(result.protein).toBe(7); // 13 * 0.5 rounded
      expect(result.carbs).toBe(1); // 1.1 * 0.5 rounded
      expect(result.fat).toBe(6); // 11 * 0.5 rounded
    });

    it('should handle zero quantity', () => {
      const result = calculateNutrition(mockFoodItem, 0);
      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
      expect(result.carbs).toBe(0);
      expect(result.fat).toBe(0);
    });

    it('should round values correctly', () => {
      const result = calculateNutrition(mockFoodItem, 33);
      // 155 * 0.33 = 51.15 -> 51
      expect(result.calories).toBe(51);
      // 13 * 0.33 = 4.29 -> 4
      expect(result.protein).toBe(4);
    });

    it('should calculate for large quantities', () => {
      const result = calculateNutrition(mockFoodItem, 200);
      expect(result.calories).toBe(310); // 155 * 2
      expect(result.protein).toBe(26); // 13 * 2
    });
  });

  describe('recalculateFromPer100g', () => {
    it('should recalculate from per 100g values', () => {
      const result = recalculateFromPer100g(155, 13, 1.1, 11, 200);
      expect(result.calories).toBe(310); // 155 * 2
      expect(result.protein).toBe(26); // 13 * 2
      expect(result.carbs).toBe(2); // 1.1 * 2 rounded
      expect(result.fat).toBe(22); // 11 * 2
    });

    it('should handle null values', () => {
      const result = recalculateFromPer100g(null, null, null, null, 100);
      expect(result.calories).toBeNull();
      expect(result.protein).toBeNull();
      expect(result.carbs).toBeNull();
      expect(result.fat).toBeNull();
    });

    it('should handle partial null values', () => {
      const result = recalculateFromPer100g(155, null, 1.1, null, 100);
      expect(result.calories).toBe(155);
      expect(result.protein).toBeNull();
      expect(result.carbs).toBe(1);
      expect(result.fat).toBeNull();
    });

    it('should handle undefined values', () => {
      const result = recalculateFromPer100g(undefined, 13, undefined, 11, 100);
      expect(result.calories).toBeNull();
      expect(result.protein).toBe(13);
      expect(result.carbs).toBeNull();
      expect(result.fat).toBe(11);
    });

    it('should round values correctly', () => {
      const result = recalculateFromPer100g(155, 13, 1.1, 11, 33);
      // 155 * 0.33 = 51.15 -> 51
      expect(result.calories).toBe(51);
      // 13 * 0.33 = 4.29 -> 4
      expect(result.protein).toBe(4);
    });

    it('should handle zero quantity', () => {
      const result = recalculateFromPer100g(155, 13, 1.1, 11, 0);
      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
      expect(result.carbs).toBe(0);
      expect(result.fat).toBe(0);
    });
  });
});
