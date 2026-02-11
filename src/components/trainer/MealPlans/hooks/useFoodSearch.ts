import { useState, useMemo } from 'react';
import { FOOD_CATALOG, FOOD_CATEGORIES } from '../../../../data/foodCatalog';
import type { FoodCatalogItem } from '../../../../data/foodCatalog';

export interface UseFoodSearchOptions {
  /** מקסימום תוצאות להחזיר (ברירת מחדל: כל התוצאות) */
  limit?: number;
}

export function useFoodSearch(options: UseFoodSearchOptions = {}) {
  const { limit } = options;
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [proteinEnrichedOnly, setProteinEnrichedOnly] = useState(false);

  const filteredItems = useMemo(() => {
    let items = FOOD_CATALOG;

    if (activeCategory) {
      items = items.filter((item) => item.category === activeCategory);
    }

    if (proteinEnrichedOnly) {
      items = items.filter((item) => item.protein_enriched);
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      items = items.filter((item) => {
        const nameLower = item.name.toLowerCase();
        const brandLower = item.brand.toLowerCase();

        if (nameLower.startsWith(query) || brandLower.startsWith(query)) {
          return true;
        }

        const nameWords = nameLower.split(/\s+/);
        if (nameWords.some((word) => word.startsWith(query))) {
          return true;
        }

        if (nameLower.includes(query) || brandLower.includes(query)) {
          return true;
        }

        return false;
      });
    }

    if (limit !== undefined && limit > 0) {
      return items.slice(0, limit);
    }

    return items;
  }, [search, activeCategory, proteinEnrichedOnly, limit]);

  const categoryLabel = (cat: string): string => {
    return FOOD_CATEGORIES.find((c) => c.value === cat)?.label || cat;
  };

  const resetFilters = () => {
    setSearch('');
    setActiveCategory(null);
    setProteinEnrichedOnly(false);
  };

  return {
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    proteinEnrichedOnly,
    setProteinEnrichedOnly,
    filteredItems,
    categoryLabel,
    resetFilters,
    totalCount: FOOD_CATALOG.length,
  };
}
