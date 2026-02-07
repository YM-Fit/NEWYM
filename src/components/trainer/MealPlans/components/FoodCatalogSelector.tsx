import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Beef, Wheat, Droplet, Flame, Filter } from 'lucide-react';
import { FOOD_CATALOG, FOOD_CATEGORIES } from '../../../../data/foodCatalog';
import type { FoodCatalogItem } from '../../../../data/foodCatalog';

interface FoodCatalogSelectorProps {
  onSelect: (item: FoodCatalogItem) => void;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  protein: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/30' },
  fat: { bg: 'bg-amber-500/15', text: 'text-amber-600', border: 'border-amber-500/30' },
  carb: { bg: 'bg-blue-500/15', text: 'text-blue-500', border: 'border-blue-500/30' },
};

export default function FoodCatalogSelector({ onSelect, onClose }: FoodCatalogSelectorProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [proteinEnrichedOnly, setProteinEnrichedOnly] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredItems = useMemo(() => {
    let items = FOOD_CATALOG;

    if (activeCategory) {
      items = items.filter(item => item.category === activeCategory);
    }

    if (proteinEnrichedOnly) {
      items = items.filter(item => item.protein_enriched);
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query)
      );
    }

    return items;
  }, [search, activeCategory, proteinEnrichedOnly]);

  const categoryLabel = (cat: string) => {
    return FOOD_CATEGORIES.find(c => c.value === cat)?.label || cat;
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="premium-card-static max-w-3xl w-full max-h-[85vh] flex flex-col">
        <div className="sticky top-0 bg-[var(--color-bg-base)] border-b border-[var(--color-border)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">בחר מזון מהקטלוג</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--color-bg-surface)] rounded-xl transition-all"
            >
              <X className="w-5 h-5 text-[var(--color-text-muted)]" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input w-full pr-10 pl-4 py-3 text-[var(--color-text-primary)]"
              placeholder="חפש מזון..."
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

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-[var(--color-text-muted)]" />
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                !activeCategory
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]'
              }`}
            >
              הכל ({FOOD_CATALOG.length})
            </button>
            {FOOD_CATEGORIES.map(cat => {
              const count = FOOD_CATALOG.filter(i => i.category === cat.value).length;
              const colors = CATEGORY_COLORS[cat.value];
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(activeCategory === cat.value ? null : cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    activeCategory === cat.value
                      ? `${colors.bg} ${colors.text} border ${colors.border}`
                      : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
            <button
              onClick={() => setProteinEnrichedOnly(!proteinEnrichedOnly)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                proteinEnrichedOnly
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]'
              }`}
            >
              מועשר בחלבון
            </button>
          </div>

          <p className="text-xs text-[var(--color-text-muted)]">
            {filteredItems.length} פריטים נמצאו
          </p>
        </div>

        <div ref={listRef} className="overflow-y-auto flex-1 p-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
              <p className="text-[var(--color-text-secondary)] font-medium">לא נמצאו פריטים</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">נסה חיפוש אחר</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredItems.map((item) => {
                const colors = CATEGORY_COLORS[item.category];
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className="w-full text-right p-3 rounded-xl border border-[var(--color-border)] hover:border-emerald-400 hover:bg-emerald-500/5 transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold text-[var(--color-text-primary)] text-sm group-hover:text-emerald-500 transition-colors">
                        {item.name}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${colors.bg} ${colors.text} border ${colors.border} whitespace-nowrap`}>
                        {categoryLabel(item.category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <span className="flex items-center gap-0.5 text-emerald-500">
                        <Flame className="w-3 h-3" />
                        {item.calories_per_100g}
                      </span>
                      <span className="flex items-center gap-0.5 text-red-500">
                        <Beef className="w-3 h-3" />
                        {item.protein_per_100g}ג
                      </span>
                      <span className="flex items-center gap-0.5 text-blue-500">
                        <Wheat className="w-3 h-3" />
                        {item.carbs_per_100g}ג
                      </span>
                      <span className="flex items-center gap-0.5 text-amber-600">
                        <Droplet className="w-3 h-3" />
                        {item.fat_per_100g}ג
                      </span>
                      {item.brand && (
                        <span className="text-[var(--color-text-muted)] mr-auto">{item.brand}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">ל-100 גרם</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
