import type { FoodCatalogItem } from '../../../../data/foodCatalog';

export function calculateNutrition(item: FoodCatalogItem, quantityGrams: number) {
  const ratio = quantityGrams / 100;
  return {
    calories: Math.round(item.calories_per_100g * ratio),
    protein: Math.round(item.protein_per_100g * ratio),
    carbs: Math.round(item.carbs_per_100g * ratio),
    fat: Math.round(item.fat_per_100g * ratio),
  };
}

export function recalculateFromPer100g(
  caloriesPer100g: number | null | undefined,
  proteinPer100g: number | null | undefined,
  carbsPer100g: number | null | undefined,
  fatPer100g: number | null | undefined,
  quantityGrams: number
) {
  const ratio = quantityGrams / 100;
  return {
    calories: caloriesPer100g ? Math.round(caloriesPer100g * ratio) : null,
    protein: proteinPer100g ? Math.round(proteinPer100g * ratio) : null,
    carbs: carbsPer100g ? Math.round(carbsPer100g * ratio) : null,
    fat: fatPer100g ? Math.round(fatPer100g * ratio) : null,
  };
}
