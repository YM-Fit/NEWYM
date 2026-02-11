import { useState, useMemo } from 'react';
import { ArrowLeftRight, Flame, Beef, Wheat, Droplet, ChevronDown } from 'lucide-react';
import { FOOD_CATALOG, FOOD_CATEGORIES } from '../../../../data/foodCatalog';
import type { FoodCatalogItem } from '../../../../data/foodCatalog';

const INITIAL_COUNT = 6;
const LOAD_MORE_COUNT = 6;
const MAX_ALTERNATIVES = 24;

interface FoodAlternativesPanelProps {
  foodName: string;
  category: string | null | undefined;
  caloriesPer100g: number | null | undefined;
  quantity?: number;
  currentCalories?: number | null;
  currentProtein?: number | null;
  currentCarbs?: number | null;
  currentFat?: number | null;
  onSwap: (item: FoodCatalogItem) => void;
}

export default function FoodAlternativesPanel({
  foodName,
  category,
  caloriesPer100g,
  quantity,
  currentCalories,
  currentProtein,
  currentCarbs,
  currentFat,
  onSwap,
}: FoodAlternativesPanelProps) {
  const [displayCount, setDisplayCount] = useState(INITIAL_COUNT);
  const [includeOtherCategories, setIncludeOtherCategories] = useState(false);

  const allAlternatives = useMemo(() => {
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
      score += Math.max(0, 1 - caloriesDiff / (targetCalories * 0.5));
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

    let effectiveCaloriesPer100g: number | null = caloriesPer100g || null;
    let effectiveProteinPer100g: number | null = null;
    let effectiveCarbsPer100g: number | null = null;
    let effectiveFatPer100g: number | null = null;

    if (quantity && quantity > 0) {
      if (currentCalories != null && currentCalories > 0) {
        effectiveCaloriesPer100g = Math.round(currentCalories * (100 / quantity));
      }
      if (currentProtein != null && currentProtein > 0) {
        effectiveProteinPer100g = Math.round(currentProtein * (100 / quantity));
      }
      if (currentCarbs != null && currentCarbs > 0) {
        effectiveCarbsPer100g = Math.round(currentCarbs * (100 / quantity));
      }
      if (currentFat != null && currentFat > 0) {
        effectiveFatPer100g = Math.round(currentFat * (100 / quantity));
      }
    }
    if (effectiveCaloriesPer100g === null || effectiveCaloriesPer100g === 0) {
      effectiveCaloriesPer100g = caloriesPer100g || null;
    }

    const hasValidCalories = (effectiveCaloriesPer100g != null && effectiveCaloriesPer100g > 0) ||
      (currentCalories != null && currentCalories > 0);

    const targetCalories = effectiveCaloriesPer100g || 0;
    const tolerance = targetCalories > 0 ? Math.max(targetCalories * 0.35, 20) : 50;

    function scoreAndSort(candidates: FoodCatalogItem[]) {
      return candidates
        .map(item => ({
          item,
          macroScore: macroSimilarity(
            item, targetCalories,
            effectiveProteinPer100g, effectiveCarbsPer100g, effectiveFatPer100g
          ),
          nameScore: nameSimilarity(foodName, item.name) * 0.2,
          caloriesScore: 1 - Math.abs(item.calories_per_100g - targetCalories) / (targetCalories * 0.5 || 1),
        }))
        .sort((a, b) => (b.macroScore + b.nameScore + b.caloriesScore) - (a.macroScore + a.nameScore + a.caloriesScore))
        .map(({ item }) => item);
    }

    if (!category) {
      return includeOtherCategories
        ? scoreAndSort(FOOD_CATALOG.filter(i => i.name !== foodName)).slice(0, MAX_ALTERNATIVES)
        : [];
    }

    const sameCategory = FOOD_CATALOG.filter(i => i.category === category && i.name !== foodName);
    if (!hasValidCalories) {
      const sorted = sameCategory
        .map(i => ({ item: i, score: nameSimilarity(foodName, i.name) }))
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);
      if (includeOtherCategories) {
        const other = FOOD_CATALOG.filter(i => i.category !== category && i.name !== foodName);
        return scoreAndSort([...sorted, ...other]).slice(0, MAX_ALTERNATIVES);
      }
      return sorted;
    }

    const sameCategoryFiltered = sameCategory.filter(
      i => Math.abs(i.calories_per_100g - targetCalories) <= tolerance
    );
    const sortedSame = scoreAndSort(sameCategoryFiltered);

    if (includeOtherCategories) {
      const otherCategory = FOOD_CATALOG.filter(
        i => i.category !== category && i.name !== foodName &&
          Math.abs(i.calories_per_100g - targetCalories) <= tolerance * 1.5
      );
      return scoreAndSort([...sortedSame, ...otherCategory]).slice(0, MAX_ALTERNATIVES);
    }

    return sortedSame;
  }, [foodName, category, caloriesPer100g, quantity, currentCalories, currentProtein, currentCarbs, currentFat, includeOtherCategories]);

  const alternatives = allAlternatives.slice(0, displayCount);
  const hasMore = allAlternatives.length > displayCount;
  const canLoadMore = displayCount < allAlternatives.length && displayCount < MAX_ALTERNATIVES;

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
    <div className="mt-2 p-3 bg-[var(--color-bg-surface)] rounded-xl border border-dashed border-primary-500/30">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-3.5 h-3.5 text-primary-400" />
          <span className="text-xs font-semibold text-primary-400">
            חלופות {category ? `(${categoryLabel})` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={includeOtherCategories}
              onChange={(e) => setIncludeOtherCategories(e.target.checked)}
              className="rounded border-[var(--color-border)]"
            />
            חלופות מקטגוריות אחרות
          </label>
          {canLoadMore && (
            <button
              type="button"
              onClick={() => setDisplayCount((c) => Math.min(c + LOAD_MORE_COUNT, MAX_ALTERNATIVES))}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-all"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              טען עוד
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {alternatives.map((item) => (
          <button
            key={item.id}
            onClick={() => onSwap(item)}
            className="flex-shrink-0 text-right p-2 rounded-lg border border-[var(--color-border)] hover:border-primary-400 hover:bg-primary-500/5 transition-all text-[11px] min-w-[140px]"
          >
            <p className="font-semibold text-[var(--color-text-primary)] mb-1 truncate">{item.name}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-0.5 text-primary-500">
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
      {hasMore && !canLoadMore && (
        <p className="text-[10px] text-[var(--color-text-muted)] mt-2">הצגת כל {allAlternatives.length} החלופות</p>
      )}
    </div>
  );
}
