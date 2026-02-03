import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Star, Clock, Dumbbell, Wheat, Droplets } from 'lucide-react';
import { searchFoods, getRecentlyUsedFoods, getFavoriteFoods, getCommonFoods } from '../../../api/foodApi';
import type { Food, FoodCategory } from '../../../types/nutritionTypes';

interface FoodSearchInputProps {
  onSelect: (food: Food) => void;
  trainerId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

const CATEGORY_CONFIG: Record<FoodCategory, { label: string; icon: React.ElementType; color: string }> = {
  protein: { label: 'חלבון', icon: Dumbbell, color: 'text-red-500' },
  carbs: { label: 'פחמימה', icon: Wheat, color: 'text-amber-500' },
  fat: { label: 'שומן', icon: Droplets, color: 'text-blue-500' },
};

export const FoodSearchInput: React.FC<FoodSearchInputProps> = ({
  onSelect,
  trainerId,
  placeholder = 'חפש מזון...',
  autoFocus = false,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<Food[]>([]);
  const [commonFoods, setCommonFoods] = useState<Food[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load recent and favorite foods on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (trainerId) {
        const [recent, favorites] = await Promise.all([
          getRecentlyUsedFoods(trainerId, 5),
          getFavoriteFoods(trainerId),
        ]);
        setRecentFoods(recent);
        setFavoriteFoods(favorites);
      }
      const common = await getCommonFoods(10);
      setCommonFoods(common);
    };
    loadInitialData();
  }, [trainerId]);

  // Search with debounce
  const performSearch = useCallback(async (searchQuery: string, category: FoodCategory | null) => {
    if (!searchQuery.trim() && !category) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const foods = await searchFoods(searchQuery, {
        category: category || undefined,
        trainerId,
        limit: 15,
      });
      setResults(foods);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [trainerId]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query, selectedCategory);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, selectedCategory, performSearch]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const displayedFoods = getDisplayedFoods();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < displayedFoods.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && displayedFoods[highlightedIndex]) {
          handleSelect(displayedFoods[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (food: Food) => {
    onSelect(food);
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedCategory(null);
    setResults([]);
    inputRef.current?.focus();
  };

  const getDisplayedFoods = (): Food[] => {
    if (query.trim() || selectedCategory) {
      return results;
    }

    // Show recent, favorites, then common
    const displayed: Food[] = [];
    const addedIds = new Set<string>();

    recentFoods.forEach((food) => {
      if (!addedIds.has(food.id)) {
        displayed.push(food);
        addedIds.add(food.id);
      }
    });

    favoriteFoods.forEach((food) => {
      if (!addedIds.has(food.id)) {
        displayed.push(food);
        addedIds.add(food.id);
      }
    });

    commonFoods.forEach((food) => {
      if (!addedIds.has(food.id) && displayed.length < 10) {
        displayed.push(food);
        addedIds.add(food.id);
      }
    });

    return displayed;
  };

  const displayedFoods = getDisplayedFoods();
  const isFavorite = (foodId: string) => favoriteFoods.some((f) => f.id === foodId);
  const isRecent = (foodId: string) => recentFoods.some((f) => f.id === foodId);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pr-10 pl-10 py-3 bg-slate-800/50 border border-slate-700 rounded-xl
                     text-white placeholder-slate-400 focus:outline-none focus:ring-2
                     focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          dir="rtl"
        />
        {(query || selectedCategory) && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 left-0 pl-3 flex items-center"
          >
            <X className="h-5 w-5 text-slate-400 hover:text-white transition-colors" />
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 mt-2">
        {(Object.keys(CATEGORY_CONFIG) as FoodCategory[]).map((category) => {
          const { label, icon: Icon, color } = CATEGORY_CONFIG[category];
          const isSelected = selectedCategory === category;

          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(isSelected ? null : category)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all
                         ${isSelected
                           ? 'bg-slate-700 text-white'
                           : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'}`}
            >
              <Icon className={`h-4 w-4 ${color}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700
                     rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-slate-400">
              <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent
                            rounded-full mx-auto mb-2" />
              מחפש...
            </div>
          ) : displayedFoods.length > 0 ? (
            <div>
              {!query.trim() && !selectedCategory && (
                <>
                  {recentFoods.length > 0 && (
                    <div className="px-3 py-2 text-xs text-slate-500 bg-slate-800/50 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      אחרונים
                    </div>
                  )}
                </>
              )}
              {displayedFoods.map((food, index) => {
                const { icon: CategoryIcon, color } = CATEGORY_CONFIG[food.category];
                const highlighted = index === highlightedIndex;

                return (
                  <button
                    key={food.id}
                    onClick={() => handleSelect(food)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-right transition-colors
                               ${highlighted ? 'bg-slate-700' : 'hover:bg-slate-700/50'}`}
                  >
                    {/* Category Icon */}
                    <div className={`p-2 rounded-lg bg-slate-700/50 ${color}`}>
                      <CategoryIcon className="h-4 w-4" />
                    </div>

                    {/* Food Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium truncate">
                          {food.name}
                        </span>
                        {isFavorite(food.id) && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        )}
                        {isRecent(food.id) && !isFavorite(food.id) && (
                          <Clock className="h-3 w-3 text-slate-500" />
                        )}
                      </div>
                      {food.brand && (
                        <span className="text-xs text-slate-500">{food.brand}</span>
                      )}
                    </div>

                    {/* Nutrition Info */}
                    <div className="text-left text-xs">
                      <div className="text-amber-400 font-medium">
                        {food.calories_per_100g} קל'
                      </div>
                      <div className="text-slate-500">
                        {food.protein_per_100g}g ח'
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : query.trim() ? (
            <div className="p-4 text-center text-slate-400">
              לא נמצאו תוצאות עבור "{query}"
            </div>
          ) : (
            <div className="p-4 text-center text-slate-400">
              התחל להקליד לחיפוש מזון
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FoodSearchInput;
