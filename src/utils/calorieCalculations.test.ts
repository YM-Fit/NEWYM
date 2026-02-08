import { describe, it, expect } from 'vitest';
import {
  calculateBMR,
  calculateTDEE,
  calculateCaloriesByGoal,
  calculateFullCalorieData,
  calculateMacros,
  estimateWeightChange,
  calculateWaterIntake,
  type ActivityLevel,
  type Goal,
} from './calorieCalculations';

describe('calorieCalculations', () => {
  describe('calculateBMR', () => {
    it('should calculate BMR for male', () => {
      // Example: 30 year old male, 80kg, 180cm
      // BMR = (10 × 80) + (6.25 × 180) - (5 × 30) + 5
      // BMR = 800 + 1125 - 150 + 5 = 1780
      const bmr = calculateBMR(80, 180, 30, 'male');
      expect(bmr).toBe(1780);
    });

    it('should calculate BMR for female', () => {
      // Example: 25 year old female, 65kg, 165cm
      // BMR = (10 × 65) + (6.25 × 165) - (5 × 25) - 161
      // BMR = 650 + 1031.25 - 125 - 161 = 1395.25
      const bmr = calculateBMR(65, 165, 25, 'female');
      expect(bmr).toBeCloseTo(1395.25, 1);
    });

    it('should handle edge cases', () => {
      expect(calculateBMR(50, 150, 18, 'male')).toBeGreaterThan(0);
      expect(calculateBMR(120, 200, 60, 'female')).toBeGreaterThan(0);
    });
  });

  describe('calculateTDEE', () => {
    const bmr = 1500;

    it('should calculate TDEE for sedentary', () => {
      const tdee = calculateTDEE(bmr, 'sedentary');
      expect(tdee).toBe(1800); // 1500 * 1.2
    });

    it('should calculate TDEE for light activity', () => {
      const tdee = calculateTDEE(bmr, 'light');
      expect(tdee).toBe(2063); // 1500 * 1.375
    });

    it('should calculate TDEE for moderate activity', () => {
      const tdee = calculateTDEE(bmr, 'moderate');
      expect(tdee).toBe(2325); // 1500 * 1.55
    });

    it('should calculate TDEE for active', () => {
      const tdee = calculateTDEE(bmr, 'active');
      expect(tdee).toBe(2588); // 1500 * 1.725
    });

    it('should calculate TDEE for very active', () => {
      const tdee = calculateTDEE(bmr, 'very_active');
      expect(tdee).toBe(2850); // 1500 * 1.9
    });
  });

  describe('calculateCaloriesByGoal', () => {
    const tdee = 2000;

    it('should calculate calories for cutting goal', () => {
      const calories = calculateCaloriesByGoal(tdee, 'cutting');
      expect(calories).toBe(1600); // 2000 * 0.8
    });

    it('should calculate calories for maintenance goal', () => {
      const calories = calculateCaloriesByGoal(tdee, 'maintenance');
      expect(calories).toBe(2000);
    });

    it('should calculate calories for bulking goal', () => {
      const calories = calculateCaloriesByGoal(tdee, 'bulking');
      expect(calories).toBe(2200); // 2000 * 1.1
    });
  });

  describe('calculateFullCalorieData', () => {
    it('should calculate all calorie data for male', () => {
      const data = calculateFullCalorieData(80, 180, 30, 'male', 'moderate');

      expect(data.bmr).toBeGreaterThan(0);
      expect(data.tdee).toBeGreaterThan(data.bmr);
      expect(data.weightLossAggressive).toBeLessThan(data.tdee);
      expect(data.weightLossModerate).toBeLessThan(data.tdee);
      expect(data.weightLossMild).toBeLessThan(data.tdee);
      expect(data.maintenance).toBe(data.tdee);
      expect(data.muscleGainMild).toBeGreaterThan(data.tdee);
      expect(data.muscleGainModerate).toBeGreaterThan(data.tdee);
    });

    it('should calculate all calorie data for female', () => {
      const data = calculateFullCalorieData(65, 165, 25, 'female', 'light');

      expect(data.bmr).toBeGreaterThan(0);
      expect(data.tdee).toBeGreaterThan(data.bmr);
      expect(data.recommendations).toBeDefined();
      expect(data.recommendations.cutting).toBeDefined();
      expect(data.recommendations.maintenance).toBeDefined();
      expect(data.recommendations.bulking).toBeDefined();
    });

    it('should have correct relationships between values', () => {
      const data = calculateFullCalorieData(75, 175, 35, 'male', 'active');

      // Weight loss values should be in descending order
      expect(data.weightLossAggressive).toBeLessThan(data.weightLossModerate);
      expect(data.weightLossModerate).toBeLessThan(data.weightLossMild);
      expect(data.weightLossMild).toBeLessThan(data.maintenance);

      // Muscle gain values should be in ascending order
      expect(data.maintenance).toBeLessThan(data.muscleGainMild);
      expect(data.muscleGainMild).toBeLessThan(data.muscleGainModerate);
    });

    it('should use default activity level when not provided', () => {
      const data1 = calculateFullCalorieData(75, 175, 35, 'male');
      const data2 = calculateFullCalorieData(75, 175, 35, 'male', 'moderate');
      expect(data1.tdee).toBe(data2.tdee);
    });

    it('should have recommendations with descriptions', () => {
      const data = calculateFullCalorieData(70, 170, 30, 'female', 'moderate');

      expect(data.recommendations.cutting.description).toBeTruthy();
      expect(data.recommendations.maintenance.description).toBeTruthy();
      expect(data.recommendations.bulking.description).toBeTruthy();

      expect(data.recommendations.cutting.calories).toBeLessThan(
        data.recommendations.maintenance.calories
      );
      expect(data.recommendations.maintenance.calories).toBeLessThan(
        data.recommendations.bulking.calories
      );
    });
  });

  describe('calculateMacros', () => {
    it('should calculate macros for cutting goal', () => {
      const result = calculateMacros(2000, 80, 'cutting');
      expect(result.protein.grams).toBe(176); // 80 * 2.2
      expect(result.protein.percentage).toBeGreaterThan(30);
      expect(result.fat.percentage).toBe(25);
    });

    it('should calculate macros for maintenance goal', () => {
      const result = calculateMacros(2000, 80, 'maintenance');
      expect(result.protein.grams).toBe(160); // 80 * 2.0
      expect(result.fat.percentage).toBe(25);
    });

    it('should calculate macros for bulking goal', () => {
      const result = calculateMacros(2000, 80, 'bulking');
      expect(result.protein.grams).toBe(160); // 80 * 2.0
      expect(result.fat.percentage).toBe(25);
    });

    it('should throw error for zero calories', () => {
      expect(() => calculateMacros(0, 80, 'cutting')).toThrow('totalCalories חייב להיות גדול מ-0');
    });

    it('should throw error for negative weight', () => {
      expect(() => calculateMacros(2000, -10, 'cutting')).toThrow('weight חייב להיות גדול מ-0');
    });

    it('should throw error for zero weight', () => {
      expect(() => calculateMacros(2000, 0, 'cutting')).toThrow('weight חייב להיות גדול מ-0');
    });

    it('should throw error for weight over 500kg', () => {
      expect(() => calculateMacros(2000, 501, 'cutting')).toThrow('weight לא יכול להיות גדול מ-500 ק"ג');
    });

    it('should throw error for calories over 20000', () => {
      expect(() => calculateMacros(20001, 80, 'cutting')).toThrow('totalCalories לא יכול להיות גדול מ-20000');
    });

    it('should have percentages sum to ~100%', () => {
      const result = calculateMacros(2000, 80, 'maintenance');
      const sum = result.protein.percentage + 
                  result.carbs.percentage + 
                  result.fat.percentage;
      expect(Math.abs(sum - 100)).toBeLessThan(2);
    });

    it('should handle edge cases - low weight', () => {
      const result = calculateMacros(1000, 40, 'cutting');
      expect(result.protein.grams).toBeGreaterThan(0);
      expect(result.protein.grams).toBe(88); // 40 * 2.2
    });

    it('should handle edge cases - high calories', () => {
      const result = calculateMacros(5000, 100, 'bulking');
      expect(result.carbs.grams).toBeGreaterThan(0);
      expect(result.protein.grams).toBe(200); // 100 * 2.0
    });
  });

  describe('estimateWeightChange', () => {
    it('should calculate weight loss correctly', () => {
      const result = estimateWeightChange(1500, 2000);
      expect(result.weeklyChange).toBeLessThan(0);
      expect(result.description).toContain('ירידה');
    });

    it('should calculate weight gain correctly', () => {
      const result = estimateWeightChange(2500, 2000);
      expect(result.weeklyChange).toBeGreaterThan(0);
      expect(result.description).toContain('עלייה');
    });

    it('should calculate maintenance correctly', () => {
      const result = estimateWeightChange(2000, 2000);
      expect(Math.abs(result.weeklyChange)).toBeLessThan(0.1);
      expect(result.description).toContain('שמירה');
    });

    it('should handle TDEE = 0', () => {
      const result = estimateWeightChange(1500, 0);
      expect(result.weeklyChange).toBe(0);
      expect(result.description).toContain('לא ניתן לחשב');
    });

    it('should handle negative TDEE', () => {
      const result = estimateWeightChange(1500, -100);
      expect(result.weeklyChange).toBe(0);
      expect(result.description).toContain('לא ניתן לחשב');
    });

    it('should handle negative current calories', () => {
      const result = estimateWeightChange(-100, 2000);
      expect(result.weeklyChange).toBeLessThan(0);
    });

    it('should calculate correct weekly change', () => {
      // 500 קלוריות גירעון ביום = 3500 בשבוע = 0.45 ק"ג
      const result = estimateWeightChange(1500, 2000);
      expect(result.weeklyChange).toBeCloseTo(-0.45, 1);
    });
  });

  describe('calculateWaterIntake', () => {
    it('should calculate water for sedentary', () => {
      const result = calculateWaterIntake(70, 'sedentary');
      expect(result).toBeGreaterThan(2000); // 70 * 33 = 2310
      expect(result).toBeLessThan(2500);
      expect(result).toBe(2310);
    });

    it('should calculate water for light activity', () => {
      const result = calculateWaterIntake(70, 'light');
      expect(result).toBe(2560); // 70 * 33 + 250
    });

    it('should calculate water for moderate activity', () => {
      const result = calculateWaterIntake(70, 'moderate');
      expect(result).toBe(2810); // 70 * 33 + 500
    });

    it('should calculate water for active', () => {
      const result = calculateWaterIntake(70, 'active');
      expect(result).toBe(3060); // 70 * 33 + 750
    });

    it('should calculate water for very active', () => {
      const result = calculateWaterIntake(70, 'very_active');
      expect(result).toBe(3310); // 70 * 33 + 1000
    });

    it('should add activity bonus', () => {
      const sedentary = calculateWaterIntake(70, 'sedentary');
      const veryActive = calculateWaterIntake(70, 'very_active');
      expect(veryActive).toBeGreaterThan(sedentary + 900);
    });

    it('should throw error for zero weight', () => {
      expect(() => calculateWaterIntake(0, 'moderate')).toThrow('weight חייב להיות גדול מ-0');
    });

    it('should throw error for negative weight', () => {
      expect(() => calculateWaterIntake(-10, 'moderate')).toThrow('weight חייב להיות גדול מ-0');
    });

    it('should throw error for weight over 500kg', () => {
      expect(() => calculateWaterIntake(501, 'moderate')).toThrow('weight לא יכול להיות גדול מ-500 ק"ג');
    });

    it('should enforce minimum water intake', () => {
      const result = calculateWaterIntake(1, 'sedentary');
      expect(result).toBeGreaterThanOrEqual(500);
    });

    it('should enforce maximum water intake', () => {
      const result = calculateWaterIntake(500, 'very_active');
      expect(result).toBeLessThanOrEqual(10000);
    });
  });
});
