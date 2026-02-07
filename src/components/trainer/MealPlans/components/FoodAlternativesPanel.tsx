import { useMemo } from 'react';
import { ArrowLeftRight, Flame, Beef, Wheat, Droplet } from 'lucide-react';
import { FOOD_CATALOG, FOOD_CATEGORIES } from '../../../../data/foodCatalog';
import type { FoodCatalogItem } from '../../../../data/foodCatalog';

interface FoodAlternativesPanelProps {
  foodName: string;
  category: string | null | undefined;
  caloriesPer100g: number | null | undefined;
  onSwap: (item: FoodCatalogItem) => void;
}

export default function FoodAlternativesPanel({
  foodName,
  category,
  caloriesPer100g,
  onSwap,
}: FoodAlternativesPanelProps) {
  const alternatives = useMemo(() => {
    if (!category) return [];

    const targetCalories = caloriesPer100g || 0;
    const tolerance = targetCalories * 0.35;

    return FOOD_CATALOG
      .filter(item => {
        if (item.category !== category) return false;
        if (item.name === foodName) return false;
        if (targetCalories > 0) {
          const diff = Math.abs(item.calories_per_100g - targetCalories);
          return diff <= tolerance;
        }
        return true;
      })
      .sort((a, b) => {
        if (!targetCalories) return 0;
        return Math.abs(a.calories_per_100g - targetCalories) - Math.abs(b.calories_per_100g - targetCalories);
      })
      .slice(0, 6);
  }, [foodName, category, caloriesPer100g]);

  if (alternatives.length === 0) return null;

  const categoryLabel = FOOD_CATEGORIES.find(c => c.value === category)?.label || '';

  return (
    <div className="mt-2 p-3 bg-[var(--color-bg-surface)] rounded-xl border border-dashed border-emerald-500/30">
      <div className="flex items-center gap-2 mb-2">
        <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-400">
          חלופות ({categoryLabel})
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {alternatives.map((item) => (
          <button
            key={item.id}
            onClick={() => onSwap(item)}
            className="flex-shrink-0 text-right p-2 rounded-lg border border-[var(--color-border)] hover:border-emerald-400 hover:bg-emerald-500/5 transition-all text-[11px] min-w-[140px]"
          >
            <p className="font-semibold text-[var(--color-text-primary)] mb-1 truncate">{item.name}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-0.5 text-emerald-500">
                <Flame className="w-2.5 h-2.5" />
                {item.calories_per_100g}
              </span>
              <span className="flex items-center gap-0.5 text-red-500">
                <Beef className="w-2.5 h-2.5" />
                {item.protein_per_100g}
              </span>
              <span className="flex items-center gap-0.5 text-blue-500">
                <Wheat className="w-2.5 h-2.5" />
                {item.carbs_per_100g}
              </span>
              <span className="flex items-center gap-0.5 text-amber-600">
                <Droplet className="w-2.5 h-2.5" />
                {item.fat_per_100g}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
