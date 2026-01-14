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

export default function TraineeFoodDiaryView({ traineeId, traineeName, onBack }: TraineeFoodDiaryViewProps) {
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
    loadWeekData();
  }, [currentWeekStart]);

  const loadWeekData = async () => {
    setLoading(true);

    const weekDates = getWeekDates();
    const startDate = weekDates[0].toISOString().split('T')[0];
    const endDate = weekDates[6].toISOString().split('T')[0];

    const { meals: mealsData, waterLogs: waterData, diaryEntries: diaryData } =
      await getWeekDiaryData(traineeId, startDate, endDate);

    const mealsMap = new Map<string, Meal[]>();
    mealsData?.forEach((meal) => {
      const dateKey = meal.meal_date;
      if (!mealsMap.has(dateKey)) {
        mealsMap.set(dateKey, []);
      }
      mealsMap.get(dateKey)!.push(meal);
    });

    const waterMap = new Map<string, DailyLog>();
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <span className="text-gray-600 font-medium">טוען יומן אכילה...</span>
        </div>
      </div>
    );
  }

  const weekDates = getWeekDates();
  const unseenCount = Array.from(diaryEntries.values()).filter(
    (entry) => entry.completed && !entry.is_seen_by_trainer
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-6">
      {/* Premium Header */}
      <div className="bg-white rounded-2xl shadow-xl p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={onBack}
              className="p-3 lg:p-4 hover:bg-gray-100 rounded-xl transition-all duration-300"
            >
              <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7 text-gray-600" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105">
                <BookOpen className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl lg:text-3xl font-bold text-gray-900">יומן אכילה</h1>
                <p className="text-base lg:text-lg text-gray-600">{traineeName}</p>
              </div>
            </div>
          </div>
          {unseenCount > 0 && (
            <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-300 hover:scale-105">
              {unseenCount} חדשים
            </div>
          )}
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 transition-all duration-300">
          <button
            onClick={() => navigateWeek('next')}
            className="p-3 hover:bg-white rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">{getWeekRangeText()}</p>
          </div>
          <button
            onClick={() => navigateWeek('prev')}
            className="p-3 hover:bg-white rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              filter === 'all'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            הכל
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              filter === 'completed'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            הושלמו
          </button>
          <button
            onClick={() => setFilter('unseen')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 relative ${
              filter === 'unseen'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

      {/* Day Cards */}
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
              className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                isToday(date) ? 'ring-2 ring-emerald-500' : ''
              } ${!isSeen && isCompleted ? 'ring-2 ring-red-400' : ''}`}
            >
              {/* Day Header */}
              <div
                className={`px-5 py-4 transition-all duration-300 ${
                  !isSeen && isCompleted
                    ? 'bg-gradient-to-br from-red-50 to-rose-100'
                    : isToday(date)
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                    : isCompleted
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {isCompleted && (
                      <div className={`rounded-full p-1.5 shadow-md transition-all duration-300 ${
                        isToday(date) ? 'bg-white/20' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                      }`}>
                        <Check className={`w-4 h-4 ${isToday(date) ? 'text-white' : 'text-white'}`} />
                      </div>
                    )}
                    <div>
                      <span className={`font-bold text-lg ${!isSeen && isCompleted && !isToday(date) ? 'text-gray-900' : ''}`}>
                        יום {getHebrewDayName(date)}
                      </span>
                      <span className={`text-sm mr-2 opacity-80 ${!isSeen && isCompleted && !isToday(date) ? 'text-gray-700' : ''}`}>
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
                            ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md'
                            : isToday(date)
                            ? 'bg-white/20'
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md'
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
              <div className="p-4 border-b bg-gradient-to-br from-blue-50/50 to-sky-50/50 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-sky-500 rounded-xl flex items-center justify-center shadow-md">
                    <Droplets className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">מעקב מים</span>
                  <span className="text-sm text-gray-500 font-medium">
                    {waterAmount} / {WATER_GOAL} מ"ל
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-sky-500 transition-all duration-500 rounded-full"
                    style={{ width: `${waterProgress}%` }}
                  />
                </div>
              </div>

              {/* Meals */}
              <div className="p-4">
                {dayMeals.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">
                    לא נרשמו ארוחות
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dayMeals.map((meal) => {
                      const typeInfo = getMealTypeInfo(meal.meal_type);
                      const Icon = typeInfo.icon;
                      const description = meal.description || '';

                      return (
                        <div
                          key={meal.id}
                          className={`${typeInfo.color} rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`${typeInfo.iconBg} p-3 rounded-xl shadow-md`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-base">
                                  {typeInfo.label}
                                </span>
                                {meal.meal_time && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg">
                                    <Clock className="w-3 h-3" />
                                    {meal.meal_time.slice(0, 5)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
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
            </div>
          );
        })}
      </div>

      {weekDates.filter((date) => shouldShowDay(date.toISOString().split('T')[0])).length === 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center transition-all duration-300">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg font-medium">אין ימים להצגה בפילטר הנוכחי</p>
        </div>
      )}
    </div>
  );
}
