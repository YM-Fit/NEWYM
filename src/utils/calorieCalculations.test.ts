import { describe, it, expect } from 'vitest';
import {
  calculateBMR,
  calculateTDEE,
  calculateCaloriesByGoal,
  calculateFullCalorieData,
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
});
