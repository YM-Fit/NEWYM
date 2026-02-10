import { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Trash2,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Droplets,
  ChevronDown,
  ChevronUp,
  Clock,
  Check,
  Utensils,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Copy,
  BarChart3,
  Calendar,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getActiveMealPlanWithMeals, getWeekDiaryData } from '../../api';
import type {
  MealPlan,
  MealPlanMeal,
  TraineeMeal,
  DailyWaterLog,
  FoodDiaryEntry,
} from '../../types/nutritionTypes';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

interface FoodDiaryProps {
  traineeId: string | null;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'ארוחת בוקר', icon: Coffee, color: 'bg-amber-100 text-amber-700' },
  { value: 'lunch', label: 'ארוחת צהריים', icon: Sun, color: 'bg-orange-100 text-orange-700' },
  { value: 'dinner', label: 'ארוחת ערב', icon: Moon, color: 'bg-blue-100 text-blue-700' },
  { value: 'snack', label: 'ארוחת ביניים', icon: Cookie, color: 'bg-green-100 text-green-700' },
];

const WATER_GOAL = 2000;

type ViewMode = 'day' | 'week' | 'month';

export default function FoodDiary({ traineeId }: FoodDiaryProps) {
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
  const [showModal, setShowModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<TraineeMeal | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [mealPlanMeals, setMealPlanMeals] = useState<MealPlanMeal[]>([]);
  const [showMealPlanCopy, setShowMealPlanCopy] = useState(false);
  const [showDailySummary, setShowDailySummary] = useState<Set<string>>(new Set());

  const [mealForm, setMealForm] = useState({
    meal_time: '08:00',
    meal_type: 'breakfast',
    description: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  useEffect(() => {
    if (traineeId) {
      loadData();
      loadMealPlan();
    }
  }, [traineeId, currentDate, currentWeekStart, viewMode]);

  const loadMealPlan = async () => {
    if (!traineeId) return;

    const { plan, meals } = await getActiveMealPlanWithMeals(traineeId);
    setMealPlan(plan);
    setMealPlanMeals(meals);
  };

  const loadData = async () => {
    if (!traineeId) return;
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

  const openAddMeal = (dateStr: string) => {
    setSelectedDate(dateStr);
    setEditingMeal(null);
    setMealForm({
      meal_time: '08:00',
      meal_type: 'breakfast',
      description: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
    });
    setShowModal(true);
  };

  const copyMealFromPlan = (planMeal: MealPlanMeal) => {
    const mealTypeMap: Record<string, string> = {
      breakfast: 'breakfast',
      morning_snack: 'snack',
      lunch: 'lunch',
      afternoon_snack: 'snack',
      dinner: 'dinner',
      evening_snack: 'snack',
    };

    setMealForm({
      meal_time: planMeal.meal_time || '08:00',
      meal_type: mealTypeMap[planMeal.meal_name] || 'breakfast',
      description: planMeal.description || '',
      calories: planMeal.total_calories?.toString() || '',
      protein: planMeal.total_protein?.toString() || '',
      carbs: planMeal.total_carbs?.toString() || '',
      fat: planMeal.total_fat?.toString() || '',
    });
    setShowMealPlanCopy(false);
  };

  const copyMealFromPreviousDay = (meal: TraineeMeal) => {
    setMealForm({
      meal_time: meal.meal_time || '08:00',
      meal_type: meal.meal_type,
      description: meal.description || '',
      calories: meal.calories?.toString() || '',
      protein: meal.protein?.toString() || '',
      carbs: meal.carbs?.toString() || '',
      fat: meal.fat?.toString() || '',
    });
  };

  const openEditMeal = (meal: TraineeMeal) => {
    setSelectedDate(meal.meal_date);
    setEditingMeal(meal);
    setMealForm({
      meal_time: meal.meal_time || '08:00',
      meal_type: meal.meal_type,
      description: meal.description || '',
      calories: meal.calories?.toString() || '',
      protein: meal.protein?.toString() || '',
      carbs: meal.carbs?.toString() || '',
      fat: meal.fat?.toString() || '',
    });
    setShowModal(true);
  };

  const saveMeal = async () => {
    if (!traineeId || !mealForm.description.trim()) {
      toast.error('נא להזין תיאור לארוחה');
      return;
    }

    const mealData: any = {
      meal_time: mealForm.meal_time,
      meal_type: mealForm.meal_type,
      description: mealForm.description,
      calories: mealForm.calories ? parseInt(mealForm.calories) : null,
      protein: mealForm.protein ? parseInt(mealForm.protein) : null,
      carbs: mealForm.carbs ? parseInt(mealForm.carbs) : null,
      fat: mealForm.fat ? parseInt(mealForm.fat) : null,
    };

    if (editingMeal) {
      const { error } = await supabase
        .from('meals')
        .update(mealData)
        .eq('id', editingMeal.id);

      if (error) {
        toast.error('שגיאה בעדכון הארוחה');
        return;
      }
      toast.success('הארוחה עודכנה');
    } else {
      const { error } = await supabase.from('meals').insert({
        trainee_id: traineeId,
        meal_date: selectedDate,
        ...mealData,
      });

      if (error) {
        toast.error('שגיאה בהוספת הארוחה');
        return;
      }
      toast.success('הארוחה נוספה');
    }

    setShowModal(false);
    loadData();
  };

  const calculateDailyTotals = (dateStr: string) => {
    const dayMeals = meals.get(dateStr) || [];
    return dayMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fat: acc.fat + (meal.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const toggleDailySummary = (dateStr: string) => {
    setShowDailySummary((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dateStr)) {
        newSet.delete(dateStr);
      } else {
        newSet.add(dateStr);
      }
      return newSet;
    });
  };

  const deleteMeal = async (mealId: string) => {
    if (!confirm('האם למחוק את הארוחה?')) return;

    const { error } = await supabase.from('meals').delete().eq('id', mealId);

    if (error) {
      toast.error('שגיאה במחיקת הארוחה');
      return;
    }

    toast.success('הארוחה נמחקה');
    loadData();
  };

  const addWater = async (dateStr: string, amount: number) => {
    if (!traineeId) return;

    const existingLog = waterLogs.get(dateStr);

    if (existingLog) {
      const newAmount = existingLog.water_ml + amount;
      const { error } = await supabase
        .from('daily_log')
        .update({ water_ml: newAmount })
        .eq('id', existingLog.id);

      if (error) {
        toast.error('שגיאה בעדכון כמות המים');
        return;
      }
    } else {
      const { error } = await supabase
        .from('daily_log')
        .insert({
          trainee_id: traineeId,
          log_date: dateStr,
          water_ml: amount,
        });

      if (error) {
        toast.error('שגיאה בהוספת מים');
        return;
      }
    }

    loadData();
  };

  const toggleMealExpand = (mealId: string) => {
    setExpandedMeals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
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

  const completeDay = async (dateStr: string) => {
    if (!traineeId) return;

    const dayMeals = meals.get(dateStr) || [];
    if (dayMeals.length === 0) {
      toast.error('נא להוסיף לפחות ארוחה אחת לפני סיום היום');
      return;
    }

    let diaryEntry = diaryEntries.get(dateStr);

    if (!diaryEntry) {
      const { data, error } = await supabase
        .from('food_diary')
        .insert({
          trainee_id: traineeId,
          diary_date: dateStr,
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        toast.error('שגיאה בסיום היום');
        return;
      }

      diaryEntry = data;
    } else {
      const { data, error } = await supabase
        .from('food_diary')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', diaryEntry.id)
        .select()
        .single();

      if (error) {
        toast.error('שגיאה בסיום היום');
        return;
      }

      diaryEntry = data;
    }

    // שליחת התראה למאמן
    const { data: traineeData, error: traineeError } = await supabase
      .from('trainees')
      .select('trainer_id, full_name')
      .eq('id', traineeId)
      .single();

    if (traineeError) {
      logger.error('Error fetching trainee data:', traineeError, 'FoodDiary');
    }

    if (traineeData) {
      const { error: notificationError } = await supabase.from('trainer_notifications').insert({
        trainer_id: traineeData.trainer_id,
        trainee_id: traineeId,
        notification_type: 'food_diary_completed',
        title: 'יומן אכילה הושלם',
        message: `${traineeData.full_name} סיים/ה לדווח את יומן האכילה ליום ${new Date(dateStr).toLocaleDateString('he-IL')}`,
      });

      if (notificationError) {
        logger.error('Error creating notification:', notificationError, 'FoodDiary');
        toast.error('היום הושלם אבל לא הצלחנו לשלוח התראה למאמן');
      } else {
        toast.success('היום הושלם! המאמן שלך קיבל התראה');
      }
    } else {
      toast.success('היום הושלם!');
    }

    loadData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg animate-pulse border-2 border-primary-400/30">
            <Utensils className="w-8 h-8 text-white" />
          </div>
          <span className="text-sm font-medium text-[var(--color-text-muted)]">טוען יומן אכילה...</span>
        </div>
      </div>
    );
  }

  const weekDates = getWeekDates();
  const monthDates = viewMode === 'month' ? getMonthDates() : [];
  const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  const renderDayView = () => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayMeals = meals.get(dateStr) || [];
    const dayWater = waterLogs.get(dateStr);
    const waterAmount = dayWater?.water_ml || 0;
    const waterGoal = mealPlan?.daily_water_ml || WATER_GOAL;
    const waterProgress = Math.min((waterAmount / waterGoal) * 100, 100);
    const diaryEntry = diaryEntries.get(dateStr);
    const isCompleted = diaryEntry?.completed || false;

    return (
      <div
        key={dateStr}
        className={`premium-card-static overflow-hidden transition-all duration-300 hover:shadow-card-hover ${
          isToday(currentDate) ? 'ring-2 ring-primary-500/50' : ''
        } ${isCompleted ? 'opacity-75' : ''}`}
      >
        {renderDayContent(currentDate, dateStr, dayMeals, waterAmount, waterGoal, waterProgress, isCompleted)}
      </div>
    );
  };

  const renderMonthView = () => {
    return (
      <div className="premium-card-static bg-white p-4">
        <div className="grid grid-cols-7 gap-2">
          {/* Week days header */}
          {weekDays.map((day, index) => (
            <div
              key={index}
              className="text-center text-sm font-semibold text-muted600 py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {monthDates.map((date, index) => {
            if (!date) {
              return <div key={index} className="min-h-[80px] p-2" />;
            }

            const dateStr = date.toISOString().split('T')[0];
            const dayMeals = meals.get(dateStr) || [];
            const diaryEntry = diaryEntries.get(dateStr);
            const isCompleted = diaryEntry?.completed || false;
            const hasMeals = dayMeals.length > 0;
            const isCurrentDay = isToday(date);

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={`min-h-[80px] p-2 border border-border200 rounded-lg cursor-pointer transition-all hover:border-primary-500/50 ${
                  isCurrentDay
                    ? 'bg-primary-500/10 border-primary-500/30'
                    : hasMeals
                    ? 'bg-surface50'
                    : 'bg-transparent'
                }`}
              >
                <div
                  className={`text-sm font-semibold mb-1 ${
                    isCurrentDay ? 'text-primary-600' : 'text-muted900'
                  }`}
                >
                  {date.getDate()}
                </div>
                {hasMeals && (
                  <div className="space-y-1">
                    <div className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded truncate">
                      {dayMeals.length} ארוחות
                    </div>
                    {isCompleted && (
                      <div className="text-xs bg-primary-500 text-white px-1.5 py-0.5 rounded">
                        ✓
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayContent = (
    date: Date,
    dateStr: string,
    dayMeals: TraineeMeal[],
    waterAmount: number,
    waterGoal: number,
    waterProgress: number,
    isCompleted: boolean
  ) => {
    return (
      <>
        <div
          className={`px-4 py-4 rounded-t-2xl transition-all duration-300 ${
            isToday(date) 
              ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg'
              : isCompleted
              ? 'bg-gradient-to-br from-primary-50 to-primary-100 border-b border-primary-200' 
              : 'bg-gradient-to-br from-gray-50 to-gray-100 border-b border-border200'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {isCompleted && (
                <div className={`rounded-full p-1 shadow-md transition-all duration-300 ${
                  isToday(date) ? 'bg-white/20' : 'bg-primary-500'
                }`}>
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              <div>
                <span className={`font-bold text-lg ${
                  isToday(date) ? 'text-white' : 'text-muted900'
                }`}>
                  יום {getHebrewDayName(date)}
                </span>
                <span className={`text-sm mr-2 ${
                  isToday(date) ? 'text-white/90' : 'text-muted600'
                }`}>
                  {formatDate(date)}
                </span>
                {isToday(date) && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full mr-2 font-medium">
                    היום
                  </span>
                )}
                {isCompleted && (
                  <span className={`text-xs px-2 py-0.5 rounded-full mr-2 font-medium ${
                    isToday(date) 
                      ? 'bg-white/20 text-white' 
                      : 'bg-primary-500 text-white shadow-sm'
                  }`}>
                    הושלם
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!isCompleted && dayMeals.length > 0 && (
                <button
                  onClick={() => completeDay(dateStr)}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium flex items-center gap-1 shadow-md hover:shadow-lg ${
                    isToday(date)
                      ? 'bg-white/20 hover:bg-white/30 text-white'
                      : 'bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  סיים יום
                </button>
              )}
              <button
                onClick={() => openAddMeal(dateStr)}
                disabled={isCompleted}
                className={`p-2 rounded-xl transition-all duration-300 ${
                  isCompleted
                    ? 'opacity-50 cursor-not-allowed bg-surface100 text-muted400'
                    : isToday(date)
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-primary-500/15 hover:bg-primary-500/20 text-primary-600 border border-primary-500/30 shadow-md hover:shadow-lg'
                }`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-b bg-gradient-to-br from-blue-50/80 to-blue-100/80 border-border200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-muted900 block">מעקב מים</span>
              <p className="text-sm text-muted600">
                {waterAmount} / {waterGoal} מ"ל
              </p>
            </div>
          </div>
          <div className="h-3 bg-surface200 rounded-full overflow-hidden mb-4 shadow-inner border border-border300">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out rounded-full shadow-sm"
              style={{ width: `${waterProgress}%` }}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => addWater(dateStr, 250)}
              className="flex-1 py-3 text-sm bg-blue-500/15 text-blue-700 border border-blue-500/30 rounded-xl hover:bg-blue-500/25 transition-all duration-300 font-medium shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              +250 מ"ל
            </button>
            <button
              onClick={() => addWater(dateStr, 500)}
              className="flex-1 py-3 text-sm bg-blue-500/15 text-blue-700 border border-blue-500/30 rounded-xl hover:bg-blue-500/25 transition-all duration-300 font-medium shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              +500 מ"ל
            </button>
          </div>
        </div>

        {dayMeals.length > 0 && (
          <div className="px-4 py-3 border-b border-border200 bg-gradient-to-br from-primary-50/50 to-primary-100/50">
            <button
              onClick={() => toggleDailySummary(dateStr)}
              className="w-full flex items-center justify-between hover:bg-primary-50/50 rounded-lg p-2 -m-2 transition-colors duration-200"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-bold text-muted900">סיכום יומי</span>
              </div>
              {showDailySummary.has(dateStr) ? (
                <ChevronUp className="w-4 h-4 text-muted600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted600" />
              )}
            </button>
            {showDailySummary.has(dateStr) && (
              <div className="mt-3 animate-fade-in">
                <DailySummaryCard
                  dateStr={dateStr}
                  totals={calculateDailyTotals(dateStr)}
                  mealPlan={mealPlan}
                  waterAmount={waterAmount}
                />
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-white">
          {dayMeals.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface100 flex items-center justify-center">
                <Utensils className="w-8 h-8 text-muted400" />
              </div>
              <p className="text-muted600 text-sm mb-4">לא נרשמו ארוחות</p>
              {mealPlanMeals.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setShowMealPlanCopy(true);
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 mx-auto font-medium transition-colors duration-200"
                >
                  <Copy className="w-4 h-4" />
                  העתק מתפריט
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {dayMeals.map((meal) => {
                const typeInfo = getMealTypeInfo(meal.meal_type);
                const Icon = typeInfo.icon;
                const isExpanded = expandedMeals.has(meal.id);
                const description = meal.description || '';
                const shouldTruncate = description.length > 60;
                const hasNutrition = meal.calories || meal.protein || meal.carbs || meal.fat;

                return (
                  <div
                    key={meal.id}
                    className="border-2 border-border200 rounded-xl p-4 hover:border-primary-500/50 transition-all duration-300 hover:shadow-lg bg-white shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${typeInfo.color} shadow-md`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-sm text-muted900">
                            {typeInfo.label}
                          </span>
                          {meal.meal_time && (
                            <span className="text-xs text-muted600 flex items-center gap-1 bg-surface100 px-2 py-0.5 rounded-full border border-border300">
                              <Clock className="w-3 h-3" />
                              {meal.meal_time.slice(0, 5)}
                            </span>
                          )}
                          {hasNutrition && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {meal.calories && (
                                <span className="text-xs text-amber-500 flex items-center gap-1 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                                  <Flame className="w-3 h-3" />
                                  {meal.calories} קל'
                                </span>
                              )}
                              {meal.protein && (
                                <span className="text-xs text-red-500 flex items-center gap-1 bg-red-500/15 px-2 py-0.5 rounded-full border border-red-500/30">
                                  <Beef className="w-3 h-3" />
                                  {meal.protein}ג'
                                </span>
                              )}
                              {meal.carbs && (
                                <span className="text-xs text-amber-500 flex items-center gap-1 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                                  <Wheat className="w-3 h-3" />
                                  {meal.carbs}ג'
                                </span>
                              )}
                              {meal.fat && (
                                <span className="text-xs text-blue-500 flex items-center gap-1 bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/30">
                                  <Droplet className="w-3 h-3" />
                                  {meal.fat}ג'
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <p
                          className={`text-sm text-muted700 leading-relaxed ${
                            !isExpanded && shouldTruncate ? 'line-clamp-2' : ''
                          }`}
                        >
                          {description}
                        </p>
                        {isExpanded && hasNutrition && (
                          <div className="flex gap-2 flex-wrap mt-2">
                            {meal.protein && (
                              <span className="text-xs text-red-500 bg-red-500/15 px-2 py-1 rounded-lg border border-red-500/30">
                                חלבון: {meal.protein}ג'
                              </span>
                            )}
                            {meal.carbs && (
                              <span className="text-xs text-amber-500 bg-amber-500/15 px-2 py-1 rounded-lg border border-amber-500/30">
                                פחמימות: {meal.carbs}ג'
                              </span>
                            )}
                            {meal.fat && (
                              <span className="text-xs text-blue-500 bg-blue-500/15 px-2 py-1 rounded-lg border border-blue-500/30">
                                שומן: {meal.fat}ג'
                              </span>
                            )}
                          </div>
                        )}
                        {shouldTruncate && (
                          <button
                            onClick={() => toggleMealExpand(meal.id)}
                            className="text-xs text-primary-600 flex items-center gap-1 mt-2 font-medium hover:text-primary-700 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                הצג פחות
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                הצג עוד
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      {!isCompleted && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditMeal(meal)}
                            className="p-2 text-muted600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-300"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteMeal(meal.id)}
                            className="p-2 text-muted600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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

  return (
    <div className="space-y-4 pb-4">
      <div className="premium-card-static rounded-2xl p-4 sm:p-6 shadow-xl sticky top-0 z-10 bg-gradient-to-br from-primary-500 to-primary-700">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => {
                if (viewMode === 'day') navigateDay('next');
                else if (viewMode === 'week') navigateWeek('next');
                else navigateMonth('next');
              }}
              className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 text-white flex-shrink-0 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="text-center text-white flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold">יומן אכילה</h2>
              <p className="text-xs sm:text-sm text-white/90 mt-1 truncate">{getViewTitle()}</p>
            </div>
            <button
              onClick={() => {
                if (viewMode === 'day') navigateDay('prev');
                else if (viewMode === 'week') navigateWeek('prev');
                else navigateMonth('prev');
              }}
              className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 text-white flex-shrink-0 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
        {/* View Mode Selector */}
        <div className="flex gap-1.5 sm:gap-2 mt-3 sm:mt-4">
          <button
            onClick={() => setViewMode('day')}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] active:scale-95 ${
              viewMode === 'day'
                ? 'bg-white/20 text-white shadow-lg'
                : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            <Calendar className="w-4 h-4" />
            יומי
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] active:scale-95 ${
              viewMode === 'week'
                ? 'bg-white/20 text-white shadow-lg'
                : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            שבועי
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] active:scale-95 ${
              viewMode === 'month'
                ? 'bg-white/20 text-white shadow-lg'
                : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            חודשי
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && (
        <>
          {weekDates.map((date) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayMeals = meals.get(dateStr) || [];
            const dayWater = waterLogs.get(dateStr);
            const waterAmount = dayWater?.water_ml || 0;
            const waterGoal = mealPlan?.daily_water_ml || WATER_GOAL;
            const waterProgress = Math.min((waterAmount / waterGoal) * 100, 100);
            const diaryEntry = diaryEntries.get(dateStr);
            const isCompleted = diaryEntry?.completed || false;

            return (
              <div
                key={dateStr}
                className={`premium-card-static overflow-hidden transition-all duration-300 hover:shadow-card-hover ${
                  isToday(date) ? 'ring-2 ring-primary-500/50' : ''
                } ${isCompleted ? 'opacity-75' : ''}`}
              >
                {renderDayContent(date, dateStr, dayMeals, waterAmount, waterGoal, waterProgress, isCompleted)}
              </div>
            );
          })}
        </>
      )}
      {viewMode === 'month' && renderMonthView()}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="premium-card-static w-full max-w-md max-h-[90vh] overflow-y-auto bg-white shadow-2xl animate-scale-in">
            <div className="sticky top-0 bg-gradient-to-br from-primary-500 to-primary-700 p-4 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="text-lg font-bold text-white">
                {editingMeal ? 'עריכת ארוחה' : 'הוספת ארוחה'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 bg-white">
              {mealPlanMeals.length > 0 && !editingMeal && (
                <div>
                  <label className="block text-sm font-bold text-muted900 mb-2">
                    העתק מתפריט
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {mealPlanMeals.slice(0, 3).map((planMeal) => (
                      <button
                        key={planMeal.id}
                        onClick={() => copyMealFromPlan(planMeal)}
                        className="p-3 rounded-xl border-2 border-primary-500/30 hover:border-primary-500/50 bg-primary-50 hover:bg-primary-100 transition-all text-right"
                      >
                        <div className="text-sm font-bold text-muted900">
                          {planMeal.meal_name === 'breakfast' ? 'ארוחת בוקר' :
                           planMeal.meal_name === 'lunch' ? 'ארוחת צהריים' :
                           planMeal.meal_name === 'dinner' ? 'ארוחת ערב' : planMeal.meal_name}
                        </div>
                        <div className="text-xs text-muted600 line-clamp-1">
                          {planMeal.description}
                        </div>
                        {planMeal.total_calories && (
                          <div className="text-xs text-amber-600 mt-1">
                            {planMeal.total_calories} קלוריות
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-muted900 mb-2">
                  שעה
                </label>
                <input
                  type="time"
                  value={mealForm.meal_time}
                  onChange={(e) =>
                    setMealForm({ ...mealForm, meal_time: e.target.value })
                  }
                  className="glass-input w-full p-4"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-muted900 mb-2">
                  סוג ארוחה
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {MEAL_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() =>
                          setMealForm({ ...mealForm, meal_type: type.value })
                        }
                        className={`p-4 rounded-xl border-2 flex items-center gap-2 transition-all duration-300 ${
                          mealForm.meal_type === type.value
                            ? 'border-primary-500 bg-primary-50 shadow-md'
                            : 'border-border300 hover:border-primary-500/50 hover:shadow-md bg-white'
                        }`}
                      >
                        <div className={`p-2 rounded-xl ${type.color} shadow-sm`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-muted900">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-muted900 mb-2">
                  תיאור האוכל
                </label>
                <textarea
                  value={mealForm.description}
                  onChange={(e) =>
                    setMealForm({ ...mealForm, description: e.target.value })
                  }
                  rows={4}
                  placeholder="מה אכלת? (לדוגמה: 2 ביצים, לחם מלא, גבינה צהובה)"
                  className="glass-input w-full p-4 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-muted900 mb-3">
                  ערכים תזונתיים (אופציונלי)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted600 mb-1">
                      <Flame className="w-3 h-3 inline ml-1" />
                      קלוריות
                    </label>
                    <input
                      type="number"
                      value={mealForm.calories}
                      onChange={(e) =>
                        setMealForm({ ...mealForm, calories: e.target.value })
                      }
                      placeholder="0"
                      className="glass-input w-full p-3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted600 mb-1">
                      <Beef className="w-3 h-3 inline ml-1" />
                      חלבון (גרם)
                    </label>
                    <input
                      type="number"
                      value={mealForm.protein}
                      onChange={(e) =>
                        setMealForm({ ...mealForm, protein: e.target.value })
                      }
                      placeholder="0"
                      className="glass-input w-full p-3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted600 mb-1">
                      <Wheat className="w-3 h-3 inline ml-1" />
                      פחמימות (גרם)
                    </label>
                    <input
                      type="number"
                      value={mealForm.carbs}
                      onChange={(e) =>
                        setMealForm({ ...mealForm, carbs: e.target.value })
                      }
                      placeholder="0"
                      className="glass-input w-full p-3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted600 mb-1">
                      <Droplet className="w-3 h-3 inline ml-1" />
                      שומן (גרם)
                    </label>
                    <input
                      type="number"
                      value={mealForm.fat}
                      onChange={(e) =>
                        setMealForm({ ...mealForm, fat: e.target.value })
                      }
                      placeholder="0"
                      className="glass-input w-full p-3"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white p-4 border-t border-border200 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 btn-secondary rounded-xl font-bold"
              >
                ביטול
              </button>
              <button
                onClick={saveMeal}
                className="flex-1 py-4 btn-primary rounded-xl font-bold"
              >
                {editingMeal ? 'עדכן' : 'הוסף'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMealPlanCopy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="premium-card-static w-full max-w-md max-h-[90vh] overflow-y-auto bg-white shadow-2xl animate-scale-in">
            <div className="sticky top-0 bg-gradient-to-br from-primary-500 to-primary-700 p-4 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="text-lg font-bold text-white">העתק מתפריט</h3>
              <button
                onClick={() => {
                  setShowMealPlanCopy(false);
                  setShowModal(true);
                }}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 bg-white">
              {mealPlanMeals.map((planMeal) => (
                <button
                  key={planMeal.id}
                  onClick={() => {
                    copyMealFromPlan(planMeal);
                    setShowMealPlanCopy(false);
                    setShowModal(true);
                  }}
                  className="w-full p-4 rounded-xl border-2 border-primary-500/30 hover:border-primary-500/50 bg-primary-50 hover:bg-primary-100 transition-all text-right"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-muted900">
                      {planMeal.meal_name === 'breakfast' ? 'ארוחת בוקר' :
                       planMeal.meal_name === 'lunch' ? 'ארוחת צהריים' :
                       planMeal.meal_name === 'dinner' ? 'ארוחת ערב' : planMeal.meal_name}
                    </div>
                    <span className="text-xs text-muted600">
                      {planMeal.meal_time}
                    </span>
                  </div>
                  <div className="text-xs text-muted700 mb-2">
                    {planMeal.description}
                  </div>
                  {(planMeal.total_calories || planMeal.total_protein || planMeal.total_carbs || planMeal.total_fat) && (
                    <div className="flex gap-2 flex-wrap">
                      {planMeal.total_calories && (
                        <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">
                          {planMeal.total_calories} קל'
                        </span>
                      )}
                      {planMeal.total_protein && (
                        <span className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded-lg">
                          {planMeal.total_protein}ג' חלבון
                        </span>
                      )}
                      {planMeal.total_carbs && (
                        <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">
                          {planMeal.total_carbs}ג' פחמימות
                        </span>
                      )}
                      {planMeal.total_fat && (
                        <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-lg">
                          {planMeal.total_fat}ג' שומן
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="sticky bottom-0 bg-white p-4 border-t border-border200">
              <button
                onClick={() => {
                  setShowMealPlanCopy(false);
                  setShowModal(true);
                }}
                className="w-full py-4 btn-secondary rounded-xl font-bold"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DailySummaryCard({
  dateStr,
  totals,
  mealPlan,
  waterAmount,
}: {
  dateStr: string;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  mealPlan: MealPlan | null;
  waterAmount: number;
}) {
  const waterGoal = mealPlan?.daily_water_ml || WATER_GOAL;

  return (
    <div className="mt-4 space-y-3 animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-center shadow-sm">
          <Flame className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-muted900">{totals.calories}</p>
          <p className="text-xs text-muted700">קלוריות</p>
          {mealPlan?.daily_calories && (
            <p className={`text-xs mt-1 ${totals.calories <= mealPlan.daily_calories ? 'text-primary-600' : 'text-red-600'}`}>
              מתוך {mealPlan.daily_calories}
            </p>
          )}
        </div>
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-center shadow-sm">
          <Beef className="w-5 h-5 text-red-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-muted900">{totals.protein}ג'</p>
          <p className="text-xs text-muted700">חלבון</p>
          {mealPlan?.protein_grams && (
            <p className={`text-xs mt-1 ${totals.protein >= mealPlan.protein_grams ? 'text-primary-600' : 'text-orange-600'}`}>
              מתוך {mealPlan.protein_grams}ג'
            </p>
          )}
        </div>
        <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-center shadow-sm">
          <Wheat className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-muted900">{totals.carbs}ג'</p>
          <p className="text-xs text-muted700">פחמימות</p>
          {mealPlan?.carbs_grams && (
            <p className="text-xs text-muted600 mt-1">מתוך {mealPlan.carbs_grams}ג'</p>
          )}
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 text-center shadow-sm">
          <Droplet className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-muted900">{totals.fat}ג'</p>
          <p className="text-xs text-muted700">שומן</p>
          {mealPlan?.fat_grams && (
            <p className="text-xs text-muted600 mt-1">מתוך {mealPlan.fat_grams}ג'</p>
          )}
        </div>
      </div>
      {mealPlan && (
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-700">מים</span>
            </div>
            <span className="text-lg font-bold text-blue-700">
              {waterAmount} / {waterGoal} מ"ל
            </span>
          </div>
          <div className="h-2 bg-blue-200 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${Math.min((waterAmount / waterGoal) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
