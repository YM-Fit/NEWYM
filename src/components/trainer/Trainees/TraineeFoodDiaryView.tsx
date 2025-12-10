import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TraineeFoodDiaryViewProps {
  traineeId: string;
  traineeName: string;
  onBack: () => void;
}

interface Meal {
  id: string;
  trainee_id: string;
  meal_date: string;
  meal_type: string;
  meal_time: string | null;
  description: string | null;
}

interface DailyLog {
  id: string;
  trainee_id: string;
  log_date: string;
  water_ml: number;
}

interface FoodDiaryEntry {
  id: string;
  trainee_id: string;
  diary_date: string;
  completed: boolean;
  completed_at: string | null;
  is_seen_by_trainer: boolean;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'ארוחת בוקר', icon: Coffee, color: 'bg-amber-100 text-amber-700' },
  { value: 'lunch', label: 'ארוחת צהריים', icon: Sun, color: 'bg-orange-100 text-orange-700' },
  { value: 'dinner', label: 'ארוחת ערב', icon: Moon, color: 'bg-blue-100 text-blue-700' },
  { value: 'snack', label: 'ארוחת ביניים', icon: Cookie, color: 'bg-green-100 text-green-700' },
];

const WATER_GOAL = 2000;

export default function TraineeFoodDiaryView({ traineeId, traineeName, onBack }: TraineeFoodDiaryViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });
  const [meals, setMeals] = useState<Map<string, Meal[]>>(new Map());
  const [waterLogs, setWaterLogs] = useState<Map<string, DailyLog>>(new Map());
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

    const { data: mealsData } = await supabase
      .from('meals')
      .select('*')
      .eq('trainee_id', traineeId)
      .gte('meal_date', startDate)
      .lte('meal_date', endDate)
      .order('meal_time', { ascending: true });

    const { data: waterData } = await supabase
      .from('daily_log')
      .select('*')
      .eq('trainee_id', traineeId)
      .gte('log_date', startDate)
      .lte('log_date', endDate);

    const { data: diaryData } = await supabase
      .from('food_diary')
      .select('*')
      .eq('trainee_id', traineeId)
      .gte('diary_date', startDate)
      .lte('diary_date', endDate);

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
      console.error('Error marking diary as seen:', error);
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
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  const weekDates = getWeekDates();
  const unseenCount = Array.from(diaryEntries.values()).filter(
    (entry) => entry.completed && !entry.is_seen_by_trainer
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={onBack}
              className="p-3 lg:p-4 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7" />
            </button>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900">יומן אכילה</h1>
              <p className="text-base lg:text-lg text-gray-600">{traineeName}</p>
            </div>
          </div>
          {unseenCount > 0 && (
            <div className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-semibold">
              {unseenCount} חדשים
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="text-sm text-gray-500">{getWeekRangeText()}</p>
          </div>
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            הכל
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            הושלמו
          </button>
          <button
            onClick={() => setFilter('unseen')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors relative ${
              filter === 'unseen'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            לא נצפו
            {unseenCount > 0 && (
              <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unseenCount}
              </span>
            )}
          </button>
        </div>
      </div>

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
              className={`bg-white rounded-xl shadow-md overflow-hidden ${
                isToday(date) ? 'ring-2 ring-green-500' : ''
              } ${!isSeen && isCompleted ? 'ring-2 ring-red-400' : ''}`}
            >
              <div
                className={`px-4 py-3 ${
                  !isSeen && isCompleted
                    ? 'bg-red-50'
                    : isToday(date)
                    ? 'bg-green-500 text-white'
                    : isCompleted
                    ? 'bg-green-50'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {isCompleted && (
                      <div className="bg-green-500 text-white rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <span className={`font-bold ${!isSeen && isCompleted && !isToday(date) ? 'text-gray-900' : ''}`}>
                        יום {getHebrewDayName(date)}
                      </span>
                      <span className={`text-sm mr-2 opacity-80 ${!isSeen && isCompleted && !isToday(date) ? 'text-gray-700' : ''}`}>
                        {formatDate(date)}
                      </span>
                      {isToday(date) && (
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full mr-2">
                          היום
                        </span>
                      )}
                      {isCompleted && (
                        <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${
                          !isSeen
                            ? 'bg-red-500 text-white'
                            : isToday(date)
                            ? 'bg-white/20'
                            : 'bg-green-500 text-white'
                        }`}>
                          {isSeen ? 'נצפה' : 'חדש'}
                        </span>
                      )}
                    </div>
                  </div>
                  {isCompleted && !isSeen && (
                    <button
                      onClick={() => markAsSeen(dateStr)}
                      className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium flex items-center gap-1 ${
                        isToday(date)
                          ? 'bg-white/20 hover:bg-white/30 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      סמן כנצפה
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 border-b bg-blue-50/50">
                <div className="flex items-center gap-3 mb-2">
                  <Droplets className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">מעקב מים</span>
                  <span className="text-sm text-gray-500">
                    {waterAmount} / {WATER_GOAL} מ"ל
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${waterProgress}%` }}
                  />
                </div>
              </div>

              <div className="p-4">
                {dayMeals.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">
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
                          className="border rounded-lg p-3 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {typeInfo.label}
                                </span>
                                {meal.meal_time && (
                                  <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {meal.meal_time.slice(0, 5)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">
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
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-gray-400">אין ימים להצגה בפילטר הנוכחי</p>
        </div>
      )}
    </div>
  );
}
