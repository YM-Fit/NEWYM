import { useState, useEffect } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Droplets,
  Check,
  Clock,
  Eye,
  BookOpen,
  Calendar,
  CalendarDays,
  CalendarRange,
  Utensils,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import { getWeekDiaryData } from '../../../api';
import type {
  TraineeMeal,
  DailyWaterLog,
  FoodDiaryEntry,
} from '../../../types/nutritionTypes';
import { supabase } from '../../../lib/supabase';

interface TraineeFoodDiaryViewProps {
  traineeId: string;
  traineeName: string;
  onBack: () => void;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'ארוחת בוקר', icon: Coffee, color: 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700', iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500' },
  { value: 'lunch', label: 'ארוחת צהריים', icon: Sun, color: 'bg-gradient-to-br from-orange-100 to-amber-100 text-orange-700', iconBg: 'bg-gradient-to-br from-orange-400 to-amber-500' },
  { value: 'dinner', label: 'ארוחת ערב', icon: Moon, color: 'bg-gradient-to-br from-blue-100 to-sky-100 text-blue-700', iconBg: 'bg-gradient-to-br from-blue-400 to-sky-500' },
  { value: 'snack', label: 'ארוחת ביניים', icon: Cookie, color: 'bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700', iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500' },
];

const WATER_GOAL = 2000;

type ViewMode = 'day' | 'week' | 'month';

export default function TraineeFoodDiaryView({ traineeId, traineeName, onBack }: TraineeFoodDiaryViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });
  const [meals, setMeals] = useState<Map<string, TraineeMeal[]>>(new Map());
  const [waterLogs, setWaterLogs] = useState<Map<string, DailyWaterLog>>(new Map());
  const [diaryEntries, setDiaryEntries] = useState<Map<string, FoodDiaryEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'unseen'>('all');

  useEffect(() => {
    loadData();
  }, [currentDate, currentWeekStart, viewMode]);

  const loadData = async () => {
    setLoading(true);

    let startDate: string;
    let endDate: string;

    if (viewMode === 'day') {
      const dateStr = currentDate.toISOString().split('T')[0];
      startDate = dateStr;
      endDate = dateStr;
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates();
      startDate = weekDates[0].toISOString().split('T')[0];
      endDate = weekDates[6].toISOString().split('T')[0];
    } else {
      // month view
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      startDate = firstDay.toISOString().split('T')[0];
      endDate = lastDay.toISOString().split('T')[0];
    }

    const { meals: mealsData, waterLogs: waterData, diaryEntries: diaryData } =
      await getWeekDiaryData(traineeId, startDate, endDate);

    const mealsMap = new Map<string, TraineeMeal[]>();
    mealsData?.forEach((meal) => {
      const dateKey = meal.meal_date;
      if (!mealsMap.has(dateKey)) {
        mealsMap.set(dateKey, []);
      }
      mealsMap.get(dateKey)!.push(meal);
    });

    const waterMap = new Map<string, DailyWaterLog>();
    waterData?.forEach((log) => {
      waterMap.set(log.log_date, log);
    });

    const diaryMap = new Map<string, FoodDiaryEntry>();
    diaryData?.forEach((entry) => {
      diaryMap.set(entry.diary_date, entry);
    });

    setMeals(mealsMap);
    setWaterLogs(waterMap);
    setDiaryEntries(diaryMap);
    setLoading(false);
  };

  const getWeekDates = (): Date[] => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newStart);
    setCurrentDate(newStart);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const getMonthDates = (): (Date | null)[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const dates: (Date | null)[] = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      dates.push(null);
    }
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month, day));
    }
    return dates;
  };

  const getHebrewDayName = (date: Date): string => {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return days[date.getDay()];
  };

  const formatDate = (date: Date): string => {
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getMealTypeInfo = (type: string) => {
    return MEAL_TYPES.find((mt) => mt.value === type) || MEAL_TYPES[0];
  };

  const getWeekRangeText = (): string => {
    const weekDates = getWeekDates();
    const start = weekDates[0];
    const end = weekDates[6];
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const getViewTitle = (): string => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    } else if (viewMode === 'week') {
      return getWeekRangeText();
    } else {
      return currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    }
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  };

  const markAsSeen = async (dateStr: string) => {
    const diaryEntry = diaryEntries.get(dateStr);
    if (!diaryEntry || diaryEntry.is_seen_by_trainer) return;

    const { data, error } = await supabase
      .from('food_diary')
      .update({ is_seen_by_trainer: true })
      .eq('id', diaryEntry.id)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Error marking diary as seen', error, 'TraineeFoodDiaryView');
      return;
    }

    if (data) {
      setDiaryEntries((prev) => {
        const newMap = new Map(prev);
        newMap.set(dateStr, data);
        return newMap;
      });

      toast.success('נקרא ונרשם');
    }
  };

  const shouldShowDay = (dateStr: string): boolean => {
    const diaryEntry = diaryEntries.get(dateStr);
    const dayMeals = meals.get(dateStr) || [];

    if (filter === 'all') return dayMeals.length > 0;
    if (filter === 'completed') return diaryEntry?.completed || false;
    if (filter === 'unseen') return diaryEntry?.completed && !diaryEntry?.is_seen_by_trainer;
    return false;
  };

  const renderDayCard = (
    date: Date,
    dateStr: string,
    dayMeals: TraineeMeal[],
    waterAmount: number,
    waterProgress: number,
    isCompleted: boolean,
    isSeen: boolean
  ) => {
    return (
      <>
        {/* Day Header */}
        <div
          className={`px-5 py-4 rounded-t-2xl transition-all duration-300 ${
            !isSeen && isCompleted
              ? 'bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-500/10 dark:to-rose-500/10 border-b border-red-200 dark:border-red-500/20'
              : isToday(date)
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white shadow-lg'
              : isCompleted
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-b border-emerald-200 dark:border-emerald-500/20'
              : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[var(--color-bg-surface)] dark:to-[var(--color-bg-elevated)] border-b border-gray-200 dark:border-[var(--color-border)]/20'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {isCompleted && (
                <div className={`rounded-full p-1.5 shadow-md transition-all duration-300 ${
                  isToday(date) 
                    ? 'bg-white/20' 
                    : !isSeen 
                    ? 'bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700'
                }`}>
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              <div>
                <span className={`font-bold text-lg ${
                  isToday(date) 
                    ? 'text-white' 
                    : !isSeen && isCompleted 
                    ? 'text-gray-900 dark:text-[var(--color-text-primary)]' 
                    : 'text-gray-900 dark:text-[var(--color-text-primary)]'
                }`}>
                  יום {getHebrewDayName(date)}
                </span>
                <span className={`text-sm mr-2 ${
                  isToday(date) 
                    ? 'text-white/90' 
                    : !isSeen && isCompleted 
                    ? 'text-gray-700 dark:text-[var(--color-text-muted)]' 
                    : 'text-gray-600 dark:text-[var(--color-text-muted)]'
                }`}>
                  {formatDate(date)}
                </span>
                {isToday(date) && (
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full mr-2 font-semibold">
                    היום
                  </span>
                )}
                {isCompleted && (
                  <span className={`text-xs px-3 py-1 rounded-full mr-2 font-semibold transition-all duration-300 ${
                    !isSeen
                      ? 'bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700 text-white shadow-md'
                      : isToday(date)
                      ? 'bg-white/20 text-white'
                      : 'bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white shadow-md'
                  }`}>
                    {isSeen ? 'נצפה' : 'חדש'}
                  </span>
                )}
              </div>
            </div>
            {isCompleted && !isSeen && (
              <button
                onClick={() => markAsSeen(dateStr)}
                className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105 ${
                  isToday(date)
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white'
                }`}
              >
                <Eye className="w-4 h-4" />
                סמן כנצפה
              </button>
            )}
          </div>
        </div>

        {/* Water Tracking */}
        <div className="p-4 border-b border-gray-200 dark:border-[var(--color-border)]/30 bg-gradient-to-br from-blue-50/80 to-cyan-50/80 dark:from-blue-500/10 dark:to-cyan-500/10 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-sky-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-800 dark:text-[var(--color-text-primary)] block">מעקב מים</span>
              <span className="text-sm text-gray-600 dark:text-[var(--color-text-muted)] font-medium">
                {waterAmount} / {WATER_GOAL} מ"ל
              </span>
            </div>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-[var(--color-bg-surface)] rounded-full overflow-hidden shadow-inner border border-gray-300 dark:border-[var(--color-border)]/30">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-sky-500 transition-all duration-500 rounded-full shadow-sm"
              style={{ width: `${waterProgress}%` }}
            />
          </div>
        </div>

        {/* Meals */}
        <div className="p-4 bg-white dark:bg-[var(--color-bg-base)]">
          {dayMeals.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-[var(--color-bg-surface)] flex items-center justify-center">
                <Utensils className="w-8 h-8 text-gray-400 dark:text-[var(--color-text-muted)]" />
              </div>
              <p className="text-gray-600 dark:text-[var(--color-text-muted)] text-sm">
                לא נרשמו ארוחות
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayMeals.map((meal) => {
                const typeInfo = getMealTypeInfo(meal.meal_type);
                const Icon = typeInfo.icon;
                const description = meal.description || '';

                return (
                  <div
                    key={meal.id}
                    className={`${typeInfo.color} rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] shadow-sm`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`${typeInfo.iconBg} p-3 rounded-xl shadow-md flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-bold text-base">
                            {typeInfo.label}
                          </span>
                          {meal.meal_time && (
                            <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 bg-white/70 dark:bg-white/10 px-2 py-1 rounded-lg">
                              <Clock className="w-3 h-3" />
                              {meal.meal_time.slice(0, 5)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                          {description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[var(--color-bg-base)] dark:to-[var(--color-bg-elevated)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg animate-pulse border-2 border-emerald-400/30">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <span className="text-gray-700 dark:text-[var(--color-text-muted)] font-medium">טוען יומן אכילה...</span>
        </div>
      </div>
    );
  }

  const weekDates = getWeekDates();
  const unseenCount = Array.from(diaryEntries.values()).filter(
    (entry) => entry.completed && !entry.is_seen_by_trainer
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[var(--color-bg-base)] dark:to-[var(--color-bg-elevated)] p-4 lg:p-6">
      {/* Premium Header */}
      <div className="premium-card-static bg-white dark:bg-[var(--color-bg-elevated)] rounded-2xl shadow-xl p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={onBack}
              className="p-3 lg:p-4 hover:bg-gray-100 dark:hover:bg-[var(--color-bg-surface)] rounded-xl transition-all duration-300"
            >
              <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7 text-gray-700 dark:text-[var(--color-text-primary)]" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105">
                <BookOpen className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl lg:text-3xl font-bold text-gray-900 dark:text-[var(--color-text-primary)]">יומן אכילה</h1>
                <p className="text-base lg:text-lg text-gray-700 dark:text-[var(--color-text-secondary)]">{traineeName}</p>
              </div>
            </div>
          </div>
          {unseenCount > 0 && (
            <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-300 hover:scale-105">
              {unseenCount} חדשים
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[var(--color-bg-surface)] dark:to-[var(--color-bg-elevated)] rounded-xl p-3 transition-all duration-300 border border-gray-200 dark:border-[var(--color-border)]/20">
          <button
            onClick={() => {
              if (viewMode === 'day') navigateDay('next');
              else if (viewMode === 'week') navigateWeek('next');
              else navigateMonth('next');
            }}
            className="p-3 hover:bg-white dark:hover:bg-[var(--color-bg-surface)] rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-[var(--color-text-primary)]" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800 dark:text-[var(--color-text-primary)]">{getViewTitle()}</p>
          </div>
          <button
            onClick={() => {
              if (viewMode === 'day') navigateDay('prev');
              else if (viewMode === 'week') navigateWeek('prev');
              else navigateMonth('prev');
            }}
            className="p-3 hover:bg-white dark:hover:bg-[var(--color-bg-surface)] rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-[var(--color-text-primary)]" />
          </button>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('day')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              viewMode === 'day'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-[var(--color-bg-surface)] text-gray-700 dark:text-[var(--color-text-primary)] hover:bg-gray-200 dark:hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            יומי
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              viewMode === 'week'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-[var(--color-bg-surface)] text-gray-700 dark:text-[var(--color-text-primary)] hover:bg-gray-200 dark:hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            שבועי
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              viewMode === 'month'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-[var(--color-bg-surface)] text-gray-700 dark:text-[var(--color-text-primary)] hover:bg-gray-200 dark:hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            חודשי
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              filter === 'all'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-[var(--color-bg-surface)] text-gray-700 dark:text-[var(--color-text-primary)] hover:bg-gray-200 dark:hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            הכל
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              filter === 'completed'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-[var(--color-bg-surface)] text-gray-700 dark:text-[var(--color-text-primary)] hover:bg-gray-200 dark:hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            הושלמו
          </button>
          <button
            onClick={() => setFilter('unseen')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 relative ${
              filter === 'unseen'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-[var(--color-bg-surface)] text-gray-700 dark:text-[var(--color-text-primary)] hover:bg-gray-200 dark:hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            לא נצפו
            {unseenCount > 0 && (
              <span className="absolute -top-2 -left-2 bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-md">
                {unseenCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'day' && (
        <div className="space-y-4 pb-4">
          {(() => {
            const dateStr = currentDate.toISOString().split('T')[0];
            if (!shouldShowDay(dateStr)) {
              return (
                <div className="premium-card-static bg-white dark:bg-[var(--color-bg-elevated)] rounded-2xl shadow-xl p-10 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-[var(--color-bg-surface)] flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-gray-400 dark:text-[var(--color-text-muted)]" />
                  </div>
                  <p className="text-gray-600 dark:text-[var(--color-text-muted)] text-lg font-medium">אין נתונים ליום זה</p>
                </div>
              );
            }

            const dayMeals = meals.get(dateStr) || [];
            const dayWater = waterLogs.get(dateStr);
            const waterAmount = dayWater?.water_ml || 0;
            const waterProgress = Math.min((waterAmount / WATER_GOAL) * 100, 100);
            const diaryEntry = diaryEntries.get(dateStr);
            const isCompleted = diaryEntry?.completed || false;
            const isSeen = diaryEntry?.is_seen_by_trainer || false;

            return (
              <div
                key={dateStr}
                className={`premium-card-static bg-white dark:bg-[var(--color-bg-elevated)] rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                  isToday(currentDate) ? 'ring-2 ring-emerald-500' : ''
                } ${!isSeen && isCompleted ? 'ring-2 ring-red-400' : ''}`}
              >
                {renderDayCard(currentDate, dateStr, dayMeals, waterAmount, waterProgress, isCompleted, isSeen)}
              </div>
            );
          })()}
        </div>
      )}

      {viewMode === 'week' && (
        <div className="space-y-4 pb-4">
          {weekDates.map((date) => {
            const dateStr = date.toISOString().split('T')[0];
            if (!shouldShowDay(dateStr)) return null;

            const dayMeals = meals.get(dateStr) || [];
            const dayWater = waterLogs.get(dateStr);
            const waterAmount = dayWater?.water_ml || 0;
            const waterProgress = Math.min((waterAmount / WATER_GOAL) * 100, 100);
            const diaryEntry = diaryEntries.get(dateStr);
            const isCompleted = diaryEntry?.completed || false;
            const isSeen = diaryEntry?.is_seen_by_trainer || false;

            return (
              <div
                key={dateStr}
                className={`premium-card-static bg-white dark:bg-[var(--color-bg-elevated)] rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                  isToday(date) ? 'ring-2 ring-emerald-500' : ''
                } ${!isSeen && isCompleted ? 'ring-2 ring-red-400' : ''}`}
              >
                {renderDayCard(date, dateStr, dayMeals, waterAmount, waterProgress, isCompleted, isSeen)}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'month' && (
        <div className="premium-card-static bg-white dark:bg-[var(--color-bg-elevated)] rounded-2xl shadow-xl p-4">
          <div className="grid grid-cols-7 gap-2">
            {/* Week days header */}
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day, index) => (
              <div
                key={index}
                className="text-center text-sm font-semibold text-gray-600 dark:text-[var(--color-text-muted)] py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {getMonthDates().map((date, index) => {
              if (!date) {
                return <div key={index} className="min-h-[80px] p-2" />;
              }

              const dateStr = date.toISOString().split('T')[0];
              const dayMeals = meals.get(dateStr) || [];
              const diaryEntry = diaryEntries.get(dateStr);
              const isCompleted = diaryEntry?.completed || false;
              const hasMeals = dayMeals.length > 0;
              const isCurrentDay = isToday(date);
              const isSeen = diaryEntry?.is_seen_by_trainer || false;

              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(date)}
                  className={`min-h-[80px] p-2 border border-gray-200 dark:border-[var(--color-border)]/30 rounded-lg cursor-pointer transition-all hover:border-emerald-500/50 dark:hover:border-emerald-500/50 ${
                    isCurrentDay
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 dark:border-emerald-500/40'
                      : hasMeals
                      ? 'bg-gray-50 dark:bg-[var(--color-bg-surface)]'
                      : 'bg-transparent'
                  } ${!isSeen && isCompleted ? 'ring-2 ring-red-400' : ''}`}
                >
                  <div
                    className={`text-sm font-semibold mb-1 ${
                      isCurrentDay ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  {hasMeals && (
                    <div className="space-y-1">
                      <div className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded truncate">
                        {dayMeals.length} ארוחות
                      </div>
                      {isCompleted && (
                        <div className={`text-xs px-1.5 py-0.5 rounded ${
                          isSeen ? 'bg-emerald-500 dark:bg-emerald-600 text-white' : 'bg-red-500 dark:bg-red-600 text-white'
                        }`}>
                          {isSeen ? '✓' : 'חדש'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state for week view */}
      {viewMode === 'week' && weekDates.filter((date) => shouldShowDay(date.toISOString().split('T')[0])).length === 0 && (
        <div className="premium-card-static bg-white dark:bg-[var(--color-bg-elevated)] rounded-2xl shadow-xl p-10 text-center transition-all duration-300">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[var(--color-bg-surface)] dark:to-[var(--color-bg-elevated)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-gray-500 dark:text-[var(--color-text-muted)]" />
          </div>
          <p className="text-gray-600 dark:text-[var(--color-text-muted)] text-lg font-medium">אין ימים להצגה בפילטר הנוכחי</p>
        </div>
      )}
    </div>
  );
}
