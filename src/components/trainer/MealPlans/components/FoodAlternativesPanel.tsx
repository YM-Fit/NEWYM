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

    // פונקציה לחישוב דמיון בשם (fuzzy matching פשוט)
    const nameSimilarity = (name1: string, name2: string): number => {
      const words1 = name1.toLowerCase().split(/\s+/);
      const words2 = name2.toLowerCase().split(/\s+/);
      const commonWords = words1.filter(w => words2.includes(w));
      return commonWords.length / Math.max(words1.length, words2.length);
    };

    // פונקציה לחישוב דמיון מקרו-נוטריינטים
    const macroSimilarity = (
      item: FoodCatalogItem,
      targetCalories: number | null,
      targetProtein?: number | null,
      targetCarbs?: number | null,
      targetFat?: number | null
    ): number => {
      if (!targetCalories) return 0;
      
      let score = 0;
      const caloriesDiff = Math.abs(item.calories_per_100g - targetCalories);
      score += Math.max(0, 1 - caloriesDiff / (targetCalories * 0.5)); // עד 50% הבדל
      
      if (targetProtein !== null && targetProtein !== undefined) {
        const proteinDiff = Math.abs((item.protein_per_100g || 0) - targetProtein);
        score += Math.max(0, 0.3 * (1 - proteinDiff / Math.max(targetProtein, 10)));
      }
      
      if (targetCarbs !== null && targetCarbs !== undefined) {
        const carbsDiff = Math.abs((item.carbs_per_100g || 0) - targetCarbs);
        score += Math.max(0, 0.2 * (1 - carbsDiff / Math.max(targetCarbs, 10)));
      }
      
      if (targetFat !== null && targetFat !== undefined) {
        const fatDiff = Math.abs((item.fat_per_100g || 0) - targetFat);
        score += Math.max(0, 0.2 * (1 - fatDiff / Math.max(targetFat, 10)));
      }
      
      return score;
    };

    // אם אין caloriesPer100g, מצא חלופות לפי קטגוריה בלבד
    if (caloriesPer100g === null || caloriesPer100g === undefined) {
      return FOOD_CATALOG
        .filter(item => item.category === category && item.name !== foodName)
        .map(item => ({
          item,
          score: nameSimilarity(foodName, item.name),
        }))
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item)
        .slice(0, 6);
    }

    const targetCalories = caloriesPer100g;
    const tolerance = targetCalories * 0.35;

    return FOOD_CATALOG
      .filter(item => {
        if (item.category !== category) return false;
        if (item.name === foodName) return false;
        const diff = Math.abs(item.calories_per_100g - targetCalories);
        return diff <= tolerance;
      })
      .map(item => ({
        item,
        macroScore: macroSimilarity(item, targetCalories),
        nameScore: nameSimilarity(foodName, item.name) * 0.2, // 20% משקל לדמיון בשם
        caloriesScore: 1 - Math.abs(item.calories_per_100g - targetCalories) / (targetCalories * 0.5),
      }))
      .sort((a, b) => {
        // מיון לפי סכום כל הציונים
        const totalScoreA = a.macroScore + a.nameScore + a.caloriesScore;
        const totalScoreB = b.macroScore + b.nameScore + b.caloriesScore;
        return totalScoreB - totalScoreA;
      })
      .map(({ item }) => item)
      .slice(0, 6);
  }, [foodName, category, caloriesPer100g]);

  if (alternatives.length === 0) {
    return (
      <div className="mt-2 p-3 bg-yellow-500/10 rounded-xl border border-dashed border-yellow-500/30">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-3.5 h-3.5 text-yellow-400" />
          <p className="text-xs text-yellow-400">
            לא נמצאו חלופות בקטגוריה זו
          </p>
        </div>
      </div>
    );
  }

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
