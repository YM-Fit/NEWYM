import { useRef, useCallback, useEffect } from 'react';
import { updateFoodItem } from '../../../../api/nutritionApi';
import toast from 'react-hot-toast';
import type { NutritionFoodItem } from '../../../../types/nutritionTypes';

export function useMealPlanFoodItems(
  meals: any[],
  setMeals: React.Dispatch<React.SetStateAction<any[]>>
) {
  const updateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const debouncedUpdateFoodItem = useCallback((
    foodItemId: string,
    updates: Partial<NutritionFoodItem>,
    displayIndex: number,
    itemIndex: number
  ) => {
    // Update local state immediately for instant UI feedback
    setMeals((prevMeals) => {
      const updatedMeals = [...prevMeals];
      const updatedItems = [...(updatedMeals[displayIndex].food_items || [])];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updates };
      updatedMeals[displayIndex] = {
        ...updatedMeals[displayIndex],
        food_items: updatedItems,
      };
      return updatedMeals;
    });

    // Clear existing timer for this item
    const existingTimer = updateTimersRef.current.get(foodItemId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer to save to database after 500ms of inactivity
    const timer = setTimeout(async () => {
      try {
        const updated = await updateFoodItem(foodItemId, updates);
        if (!updated) {
          toast.error('שגיאה בעדכון פריט מזון');
        }
      } catch (error) {
        console.error('Error updating food item:', error);
        toast.error('שגיאה בעדכון פריט מזון');
      }
      updateTimersRef.current.delete(foodItemId);
    }, 500);

    updateTimersRef.current.set(foodItemId, timer);
  }, [setMeals]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      updateTimersRef.current.forEach((timer) => clearTimeout(timer));
      updateTimersRef.current.clear();
    };
  }, []);

  return {
    debouncedUpdateFoodItem,
  };
}
