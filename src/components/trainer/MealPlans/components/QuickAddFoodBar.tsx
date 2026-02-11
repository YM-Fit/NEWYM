import { useState, useRef, useEffect } from 'react';
import { Search, X, Flame, Beef, Wheat, Droplet } from 'lucide-react';
import type { FoodCatalogItem } from '../../../../data/foodCatalog';
import { useFoodSearch } from '../hooks/useFoodSearch';
import { MEAL_NAMES } from '../constants/mealPlanConstants';

interface QuickAddFoodBarProps {
  meals: Array<{ id?: string; meal_name: string; meal_time: string }>;
  onAdd: (item: FoodCatalogItem, mealId: string) => void;
  onClose?: () => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  protein: { bg: 'bg-red-500/15', text: 'text-red-500' },
  fat: { bg: 'bg-amber-500/15', text: 'text-amber-600' },
  carb: { bg: 'bg-blue-500/15', text: 'text-blue-500' },
};

export function QuickAddFoodBar({ meals, onAdd, onClose }: QuickAddFoodBarProps) {
  const [showResults, setShowResults] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    proteinEnrichedOnly,
    setProteinEnrichedOnly,
    filteredItems,
    categoryLabel,
    totalCount,
  } = useFoodSearch({ limit: 15 });

  const mealsWithId = meals.filter((m) => m.id);
  const defaultMealId = mealsWithId[0]?.id ?? null;

  useEffect(() => {
    if (!selectedMealId && defaultMealId) {
      setSelectedMealId(defaultMealId);
    }
  }, [defaultMealId, selectedMealId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: FoodCatalogItem) => {
    const mealId = selectedMealId || defaultMealId;
    if (mealId) {
      onAdd(item, mealId);
      setSearch('');
      setShowResults(false);
    }
  };

  const getMealLabel = (mealName: string) => {
    const config = MEAL_NAMES.find((m) => m.value === mealName);
    return config ? `${config.icon} ${config.label}` : mealName;
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="premium-card-static p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:flex-wrap">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px] w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              className="glass-input w-full pr-10 pl-4 py-2.5 text-[var(--color-text-primary)]"
              placeholder="חפש מזון להוספה מהירה..."
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--color-bg-surface)] rounded-lg"
              >
                <X className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
            )}
          </div>

          {mealsWithId.length > 1 && (
            <select
              value={selectedMealId || defaultMealId || ''}
              onChange={(e) => setSelectedMealId(e.target.value || null)}
              className="glass-input px-4 py-2.5 text-[var(--color-text-primary)] min-w-[140px]"
            >
              {mealsWithId.map((meal) => (
                <option key={meal.id} value={meal.id}>
                  {getMealLabel(meal.meal_name)} ({meal.meal_time})
                </option>
              ))}
            </select>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-[var(--color-bg-surface)] rounded-xl transition-all"
              aria-label="סגור"
            >
              <X className="w-5 h-5 text-[var(--color-text-muted)]" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              !activeCategory
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
            }`}
          >
            הכל ({totalCount})
          </button>
          {(['protein', 'fat', 'carb'] as const).map((cat) => {
            const colors = CATEGORY_COLORS[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeCategory === cat
                    ? `${colors.bg} ${colors.text} border border-current`
                    : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                }`}
              >
                {categoryLabel(cat)}
              </button>
            );
          })}
          <button
            onClick={() => setProteinEnrichedOnly(!proteinEnrichedOnly)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              proteinEnrichedOnly
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
            }`}
          >
            מועשר בחלבון
          </button>
        </div>
      </div>

      {showResults && (search.trim() || filteredItems.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto premium-card-static py-2 z-40">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-[var(--color-text-muted)]">לא נמצאו פריטים</div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {filteredItems.map((item) => {
                const colors = CATEGORY_COLORS[item.category];
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full text-right p-3 hover:bg-[var(--color-accent-bg)] transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-[var(--color-text-primary)]">{item.name}</span>
                      <span className={`mr-2 px-2 py-0.5 rounded text-xs font-bold ${colors.bg} ${colors.text}`}>
                        {categoryLabel(item.category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] shrink-0">
                      <span className="flex items-center gap-0.5 text-primary-500">
                        <Flame className="w-3 h-3" />
                        {item.calories_per_100g}
                      </span>
                      <span className="flex items-center gap-0.5 text-red-500">
                        <Beef className="w-3 h-3" />
                        {item.protein_per_100g}ג
                      </span>
                      <span className="text-[var(--color-text-muted)]">ל-100ג</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
