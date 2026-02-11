/**
 * SmartReportView - Enhanced Monthly trainee report with payment management
 * Features:
 * - Click on trainee to see all workout dates
 * - Payment methods: bit, paybox, cash, standing_order, credit, monthly_count, card_ticket
 * - Monthly summary: total income, workout count, payment distribution, income goal
 * - Auto/manual save categorized by month
 * - Forecast for next month and previous month income
 * - Auto-sync when workouts are added/cancelled
 * - Workout numbering per trainee (e.g., עדי 1, עדי 2)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  CalendarDays,
  Edit2,
  Save,
  X,
  CreditCard,
  Banknote,
  Ticket,
  Repeat,
  Loader2,
  Download,
  Search,
  Target,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  RefreshCw,
  Smartphone,
  Wallet,
  Plus,
  History
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTrainees } from '../../../hooks/useSupabaseQuery';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';

// שיטת תשלום - איך משלמים
type PaymentMethod = 'standing_order' | 'credit' | 'cash' | 'paybox' | 'bit';

// שיטת ספירת אימונים - איך מחשבים את התשלום
type CountingMethod = 'card_ticket' | 'subscription' | 'monthly_count';

// Card/ticket data interface
interface TraineeCard {
  id: string;
  trainee_id: string;
  purchase_date: string;
  sessions_purchased: number;
  price_paid: number;
  sessions_used: number;
  is_active: boolean;
}

interface TraineeReportRow {
  id: string;
  full_name: string;
  payment_method: PaymentMethod | null;
  counting_method: CountingMethod | null;
  monthly_price: number;
  card_sessions_total: number;
  card_sessions_used: number;
  workouts_this_month: number;
  total_due: number;
  workout_dates: string[]; // All workout dates for this trainee in the month (derived from workout_items for compat)
  workout_items: { date: string; workout_id: string }[]; // Date and id per workout for stable numbering
  workout_numbers: Map<string, number>; // Map of workout_id to workout number (1-based position in history)
  // Card-specific fields
  active_card: TraineeCard | null; // Current active card
  card_purchased_this_month: boolean; // Whether card was purchased in selected month
  card_remaining: number; // Remaining sessions on active card
  card_forecast_weeks?: number; // Estimated weeks until card runs out (based on avg workouts/week)
}

interface EditingState {
  traineeId: string;
  payment_method: PaymentMethod | null;
  counting_method: CountingMethod | null;
  monthly_price: number;
  card_sessions_total: number;
}

interface MonthlyReport {
  total_income: number;
  total_workouts: number;
  income_goal: number;
  payment_distribution: Record<PaymentMethod, number>;
  counting_distribution: Record<CountingMethod, number>;
  previous_month_income: number;
  next_month_forecast: number;
}

// תוויות שיטת תשלום
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  standing_order: 'הוראת קבע',
  credit: 'אשראי',
  cash: 'מזומן',
  paybox: 'PayBox',
  bit: 'ביט',
};

// תוויות שיטת ספירה
const COUNTING_METHOD_LABELS: Record<CountingMethod, string> = {
  card_ticket: 'כרטיסיה',
  subscription: 'מנוי מתחדש',
  monthly_count: 'כמות חודשית',
};

// אייקונים לשיטת תשלום
const PAYMENT_METHOD_ICONS: Record<PaymentMethod, typeof CreditCard> = {
  standing_order: Repeat,
  credit: CreditCard,
  cash: Banknote,
  paybox: Wallet,
  bit: Smartphone,
};

// אייקונים לשיטת ספירה
const COUNTING_METHOD_ICONS: Record<CountingMethod, typeof CreditCard> = {
  card_ticket: Ticket,
  subscription: Repeat,
  monthly_count: Banknote,
};

interface SmartReportViewProps {
  initialMonth?: Date;
  onBackToCalendar?: (month: Date) => void;
}

export default function SmartReportView({ initialMonth, onBackToCalendar }: SmartReportViewProps = {}) {
  const { user } = useAuth();
  const { data: traineesData, loading: traineesLoading, refetch } = useTrainees(user?.id || null);
  
  // Ensure trainees is always an array
  const trainees = Array.isArray(traineesData) ? traineesData : [];
  
  const [selectedMonth, setSelectedMonth] = useState(initialMonth ?? new Date());
  const [reportData, setReportData] = useState<TraineeReportRow[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrainee, setSelectedTrainee] = useState<string | null>(null);
  const [incomeGoal, setIncomeGoal] = useState(0);
  const [autoSave, setAutoSave] = useState(true);
  const [savingReport, setSavingReport] = useState(false);
  
  // Card management state
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showCardHistoryModal, setShowCardHistoryModal] = useState(false);
  const [selectedTraineeForCard, setSelectedTraineeForCard] = useState<{ id: string; name: string } | null>(null);
  const [cardHistory, setCardHistory] = useState<TraineeCard[]>([]);
  const [newCard, setNewCard] = useState({
    sessions_purchased: 10,
    price_paid: 0,
    purchase_date: new Date().toISOString().split('T')[0],
  });
  const [savingCard, setSavingCard] = useState(false);
  
  // Hidden trainees state - hide trainees from current month's report view
  const [hiddenTrainees, setHiddenTrainees] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);

  // Get month key for storage
  const getMonthKey = useCallback((date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Load saved monthly report
  const loadSavedReport = useCallback(async () => {
    if (!user) return null;

    const monthKey = getMonthKey(selectedMonth);
    const reportMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);

    const { data, error } = await supabase
      .from('monthly_reports')
      .select('*')
      .eq('trainer_id', user.id)
      .eq('report_month', reportMonth.toISOString().split('T')[0])
      .maybeSingle();

    if (error) {
      logger.error('Error loading saved report', error, 'SmartReportView');
      return null;
    }

    return data;
  }, [user, selectedMonth, getMonthKey]);

  // Save monthly report
  const saveMonthlyReport = useCallback(async (isAuto: boolean = false) => {
    if (!user || !monthlyReport) return;

    setSavingReport(true);
    try {
      const reportMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      
      // Convert Maps to plain objects for JSON serialization
      const serializableReport = reportData.map(row => ({
        ...row,
        workout_numbers: Object.fromEntries(row.workout_numbers),
        workout_items: row.workout_items,
      }));
      
      const reportDataToSave = {
        trainer_id: user.id,
        report_month: reportMonth.toISOString().split('T')[0],
        total_income: monthlyReport.total_income,
        total_workouts: monthlyReport.total_workouts,
        income_goal: incomeGoal,
        payment_distribution: monthlyReport.payment_distribution,
        report_data: serializableReport,
        is_auto_saved: isAuto,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('monthly_reports')
        .upsert(reportDataToSave, { onConflict: 'trainer_id,report_month' });

      if (error) throw error;

      if (!isAuto) {
        toast.success('הדוח נשמר בהצלחה');
      }
    } catch (err) {
      logger.error('Error saving monthly report', err, 'SmartReportView');
      toast.error('שגיאה בשמירת הדוח');
    } finally {
      setSavingReport(false);
    }
  }, [user, monthlyReport, selectedMonth, incomeGoal, reportData]);

  // Calculate workout numbers locally: sort by (date, workout_id) for stable numbering when dates repeat
  const calculateWorkoutNumbersLocally = useCallback((
    items: { date: string; workout_id: string }[],
    historicalItems: { date: string; workout_id: string }[]
  ): Map<string, number> => {
    const result = new Map<string, number>();
    const sorted = [...historicalItems].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return cmp !== 0 ? cmp : a.workout_id.localeCompare(b.workout_id);
    });
    for (const item of items) {
      const idx = sorted.findIndex(h => h.workout_id === item.workout_id);
      result.set(item.workout_id, idx >= 0 ? idx + 1 : sorted.length + 1);
    }
    return result;
  }, []);

  // Load workout counts and dates for the selected month
  const loadReportData = useCallback(async () => {
    // Don't reset data if trainees are still loading
    if (!user || traineesLoading) {
      return;
    }
    
    // Only reset if we truly have no trainees (not just during refetch)
    if (trainees.length === 0) {
      setReportData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);
      // Use ISO timestamps for TIMESTAMPTZ field comparison
      const startOfMonthStr = startOfMonth.toISOString();
      const endOfMonthStr = endOfMonth.toISOString();

      // Workouts in last 30 days for forecast calculation
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

      // OPTIMIZATION: Load all data in parallel instead of sequentially
      const [workoutsResult, cardsResult, allWorkoutsResult, recentWorkoutsResult] = await Promise.all([
        // Get workouts for the selected month
        supabase
          .from('workouts')
          .select('id, workout_date')
          .eq('trainer_id', user.id)
          .gte('workout_date', startOfMonthStr)
          .lte('workout_date', endOfMonthStr)
          .order('workout_date', { ascending: true }),
        
        // Get all trainee cards for this trainer
        supabase
          .from('trainee_cards')
          .select('*')
          .eq('trainer_id', user.id)
          .order('purchase_date', { ascending: false }),
        
        // Get ALL workouts for workout number calculation (historical data)
        supabase
          .from('workouts')
          .select('id, workout_date')
          .eq('trainer_id', user.id)
          .lte('workout_date', endOfMonthStr)
          .order('workout_date', { ascending: true }),
        
        // Get workouts in last 30 days for card forecast
        supabase
          .from('workouts')
          .select('id, workout_date')
          .eq('trainer_id', user.id)
          .gte('workout_date', thirtyDaysAgoStr)
          .order('workout_date', { ascending: true })
      ]);

      const workoutsData = workoutsResult.data;
      const cardsData = cardsResult.data;
      const allWorkoutsData = allWorkoutsResult.data;

      if (workoutsResult.error) {
        logger.error('Error loading workouts data', workoutsResult.error, 'SmartReportView');
      }
      if (cardsResult.error) {
        logger.error('Error loading trainee cards', cardsResult.error, 'SmartReportView');
      }

      // Group cards by trainee (most recent first)
      const traineeCards = new Map<string, TraineeCard[]>();
      (cardsData || []).forEach((card: TraineeCard) => {
        if (!traineeCards.has(card.trainee_id)) {
          traineeCards.set(card.trainee_id, []);
        }
        traineeCards.get(card.trainee_id)!.push(card);
      });

      const workoutIds = workoutsData?.map(w => w.id) || [];
      const allWorkoutIds = allWorkoutsData?.map(w => w.id) || [];
      const recentWorkoutIds = (recentWorkoutsResult.data || []).map(w => (w as { id: string }).id) || [];

      // OPTIMIZATION: Load trainee links in parallel
      const [monthLinksResult, allLinksResult, recentLinksResult] = await Promise.all([
        // Get trainee links for this month's workouts
        workoutIds.length > 0 
          ? supabase
              .from('workout_trainees')
              .select('trainee_id, workout_id')
              .in('workout_id', workoutIds)
          : Promise.resolve({ data: [], error: null }),
        
        // Get trainee links for ALL workouts (for workout numbering)
        allWorkoutIds.length > 0
          ? supabase
              .from('workout_trainees')
              .select('trainee_id, workout_id')
              .in('workout_id', allWorkoutIds)
          : Promise.resolve({ data: [], error: null }),
        
        // Get trainee links for recent workouts (last 30 days - for card forecast)
        recentWorkoutIds.length > 0
          ? supabase
              .from('workout_trainees')
              .select('trainee_id, workout_id')
              .in('workout_id', recentWorkoutIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (monthLinksResult.error) {
        logger.error('Error loading workout trainee links', monthLinksResult.error, 'SmartReportView');
      }

      // Map workout dates for this month
      const workoutDateMap = new Map(workoutsData?.map(w => [w.id, w.workout_date]) || []);
      const workoutData = (monthLinksResult.data || []).map(link => ({
        trainee_id: link.trainee_id,
        workout_id: link.workout_id,
        workout_date: workoutDateMap.get(link.workout_id) || '',
      }));

      // Map ALL workout dates for historical numbering (with workout_id for stable sort)
      const allWorkoutDateMap = new Map(allWorkoutsData?.map(w => [w.id, w.workout_date]) || []);
      
      // Build historical (date, workout_id) per trainee for stable numbering (dedupe by workout_id)
      const traineeHistoricalItems = new Map<string, { date: string; workout_id: string }[]>();
      const seenHistoricalByTrainee = new Map<string, Set<string>>();
      (allLinksResult.data || []).forEach(link => {
        if (!traineeHistoricalItems.has(link.trainee_id)) {
          traineeHistoricalItems.set(link.trainee_id, []);
          seenHistoricalByTrainee.set(link.trainee_id, new Set());
        }
        const seen = seenHistoricalByTrainee.get(link.trainee_id)!;
        if (seen.has(link.workout_id)) return;
        seen.add(link.workout_id);
        const date = allWorkoutDateMap.get(link.workout_id);
        if (date) {
          traineeHistoricalItems.get(link.trainee_id)!.push({ date, workout_id: link.workout_id });
        }
      });

      // Group workouts by trainee for this month (dedupe by workout_id to handle edge-case duplicate workout_trainees)
      const traineeWorkouts = new Map<string, { items: { date: string; workout_id: string }[]; numbers: Map<string, number> }>();
      const seenWorkoutByTrainee = new Map<string, Set<string>>();
      
      for (const workout of workoutData) {
        if (!traineeWorkouts.has(workout.trainee_id)) {
          traineeWorkouts.set(workout.trainee_id, { items: [], numbers: new Map() });
          seenWorkoutByTrainee.set(workout.trainee_id, new Set());
        }
        const seen = seenWorkoutByTrainee.get(workout.trainee_id)!;
        if (seen.has(workout.workout_id)) continue;
        seen.add(workout.workout_id);
        traineeWorkouts.get(workout.trainee_id)!.items.push({
          date: workout.workout_date,
          workout_id: workout.workout_id,
        });
      }

      // OPTIMIZATION: Calculate workout numbers locally (sort by date, id for stable numbering)
      for (const [traineeId, data] of traineeWorkouts.entries()) {
        const historicalItems = traineeHistoricalItems.get(traineeId) || [];
        const numbers = calculateWorkoutNumbersLocally(data.items, historicalItems);
        data.numbers = numbers;
      }

      // Workouts per trainee in last 30 days (for card forecast)
      const traineeRecentWorkoutCount = new Map<string, number>();
      (recentLinksResult.data || []).forEach((link: { trainee_id: string }) => {
        traineeRecentWorkoutCount.set(link.trainee_id, (traineeRecentWorkoutCount.get(link.trainee_id) || 0) + 1);
      });

      // Build report data
      const report: TraineeReportRow[] = trainees.map((trainee) => {
        const traineeWorkoutData = traineeWorkouts.get(trainee.id) || { items: [], numbers: new Map() };
        const workoutsThisMonth = traineeWorkoutData.items.length;
        const paymentMethod = (trainee as { payment_method?: PaymentMethod }).payment_method || null;
        const countingMethod = (trainee as { counting_method?: CountingMethod }).counting_method || null;
        const monthlyPrice = (trainee as { monthly_price?: number }).monthly_price || 0;
        
        // Get card data for this trainee
        const cards = traineeCards.get(trainee.id) || [];
        const activeCard = cards.find(c => c.is_active) || null;
        
        // Check if card was purchased in the selected month
        let cardPurchasedThisMonth = false;
        let cardPurchasePrice = 0;
        if (activeCard) {
          const purchaseDate = activeCard.purchase_date;
          cardPurchasedThisMonth = purchaseDate >= startOfMonthStr && purchaseDate <= endOfMonthStr;
          if (cardPurchasedThisMonth) {
            cardPurchasePrice = activeCard.price_paid;
          }
        }
        
        // Calculate remaining sessions on active card
        const cardRemaining = activeCard 
          ? activeCard.sessions_purchased - activeCard.sessions_used 
          : 0;

        // Calculate forecast: weeks until card runs out (based on avg workouts/week in last 30 days)
        let cardForecastWeeks: number | undefined;
        if (countingMethod === 'card_ticket' && activeCard && cardRemaining > 0) {
          const recentWorkouts = traineeRecentWorkoutCount.get(trainee.id) || 0;
          const avgPerWeek = recentWorkouts / 4.3; // ~4.3 weeks in 30 days
          if (avgPerWeek > 0) {
            cardForecastWeeks = Math.ceil(cardRemaining / avgPerWeek);
          }
        }

        // Calculate total due based on counting method (not payment method)
        let totalDue = 0;
        switch (countingMethod) {
          case 'subscription':
            // מנוי מתחדש - סכום קבוע חודשי
            totalDue = monthlyPrice;
            break;
          case 'monthly_count':
            // כמות חודשית - לפי כמות אימונים
            totalDue = workoutsThisMonth * monthlyPrice;
            break;
          case 'card_ticket':
            // כרטיסיה - תשלום רק בחודש הרכישה
            totalDue = cardPurchasedThisMonth ? cardPurchasePrice : 0;
            break;
          default:
            totalDue = 0;
        }

        return {
          id: trainee.id,
          full_name: trainee.full_name,
          payment_method: paymentMethod,
          counting_method: countingMethod,
          monthly_price: monthlyPrice,
          card_sessions_total: activeCard?.sessions_purchased || 0,
          card_sessions_used: activeCard?.sessions_used || 0,
          workouts_this_month: workoutsThisMonth,
          total_due: totalDue,
          // Card-specific fields
          active_card: activeCard,
          card_purchased_this_month: cardPurchasedThisMonth,
          card_remaining: cardRemaining,
          card_forecast_weeks: cardForecastWeeks,
          workout_dates: traineeWorkoutData.items.map(i => i.date).sort(),
          workout_items: traineeWorkoutData.items.sort((a, b) => a.date.localeCompare(b.date) || a.workout_id.localeCompare(b.workout_id)),
          workout_numbers: traineeWorkoutData.numbers,
        };
      });

      // Sort by name
      report.sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
      
      setReportData(report);

      // Calculate monthly summary
      const totalIncome = report.reduce((sum, row) => sum + row.total_due, 0);
      const totalWorkouts = report.reduce((sum, row) => sum + row.workouts_this_month, 0);
      
      // Calculate payment distribution (by payment method)
      const paymentDistribution: Record<PaymentMethod, number> = {
        standing_order: 0,
        credit: 0,
        cash: 0,
        paybox: 0,
        bit: 0,
      };

      // Calculate counting distribution (by counting method)
      const countingDistribution: Record<CountingMethod, number> = {
        card_ticket: 0,
        subscription: 0,
        monthly_count: 0,
      };

      report.forEach(row => {
        if (row.payment_method) {
          paymentDistribution[row.payment_method] += row.total_due;
        }
        if (row.counting_method) {
          countingDistribution[row.counting_method] += row.total_due;
        }
      });

      // Get previous month income
      const prevMonth = new Date(selectedMonth);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
      
      const { data: prevReport } = await supabase
        .from('monthly_reports')
        .select('total_income')
        .eq('trainer_id', user.id)
        .eq('report_month', prevMonthStart.toISOString().split('T')[0])
        .maybeSingle();

      const previousMonthIncome = prevReport?.total_income || 0;

      // Calculate next month forecast (simple: average of last 3 months or current month)
      const nextMonthForecast = totalIncome; // Simplified - can be enhanced

      // Load saved income goal
      const savedReport = await loadSavedReport();
      const goal = savedReport?.income_goal || incomeGoal;
      if (savedReport?.income_goal) {
        setIncomeGoal(savedReport.income_goal);
      }

      const newMonthlyReport: MonthlyReport = {
        total_income: totalIncome,
        total_workouts: totalWorkouts,
        income_goal: goal,
        payment_distribution: paymentDistribution,
        counting_distribution: countingDistribution,
        previous_month_income: previousMonthIncome,
        next_month_forecast: nextMonthForecast,
      };

      setMonthlyReport(newMonthlyReport);

      // Auto-save if enabled (async, don't wait)
      if (autoSave) {
        // Save with the new report data (convert Maps to plain objects for JSON serialization)
        const reportMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        const serializableReport = report.map(row => ({
          ...row,
          workout_numbers: Object.fromEntries(row.workout_numbers),
          workout_items: row.workout_items,
        }));
        const reportDataToSave = {
          trainer_id: user.id,
          report_month: reportMonth.toISOString().split('T')[0],
          total_income: newMonthlyReport.total_income,
          total_workouts: newMonthlyReport.total_workouts,
          income_goal: goal,
          payment_distribution: newMonthlyReport.payment_distribution,
          report_data: serializableReport,
          is_auto_saved: true,
          updated_at: new Date().toISOString(),
        };

        // Don't await - save in background
        supabase
          .from('monthly_reports')
          .upsert(reportDataToSave, { onConflict: 'trainer_id,report_month' })
          .then(({ error }) => {
            if (error) {
              logger.error('Error auto-saving report', error, 'SmartReportView');
            }
          })
          .catch((err) => {
            logger.error('Error auto-saving report', err, 'SmartReportView');
          });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error('Error loading report data', { 
        error: err, 
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined 
      }, 'SmartReportView');
      logger.error('SmartReportView error details', err, 'SmartReportView');
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [user, trainees, traineesLoading, selectedMonth, calculateWorkoutNumbersLocally, getMonthKey, loadSavedReport, autoSave]);

  // Subscribe to workout changes for auto-sync
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('workouts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workouts',
          filter: `trainer_id=eq.${user.id}`,
        },
        () => {
          // Reload report data when workouts change
          loadReportData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_trainees',
        },
        () => {
          // Reload when trainee-workout links change
          loadReportData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadReportData]);

  useEffect(() => {
    if (!traineesLoading) {
      loadReportData();
    }
  }, [loadReportData, traineesLoading, selectedMonth]);

  // Filter trainees by search
  // Filter trainees by search and hidden status
  const filteredData = useMemo(() => {
    let data = reportData;
    
    // Filter out hidden trainees unless showHidden is true
    if (!showHidden) {
      data = data.filter(row => !hiddenTrainees.has(row.id));
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(row => row.full_name.toLowerCase().includes(query));
    }
    
    return data;
  }, [reportData, searchQuery, hiddenTrainees, showHidden]);

  // Toggle hide/show trainee
  const toggleHideTrainee = (traineeId: string) => {
    setHiddenTrainees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(traineeId)) {
        newSet.delete(traineeId);
      } else {
        newSet.add(traineeId);
      }
      return newSet;
    });
  };

  // Clear all hidden trainees
  const clearHiddenTrainees = () => {
    setHiddenTrainees(new Set());
    setShowHidden(false);
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
    setSelectedTrainee(null); // Clear selected trainee when changing months
  };

  // Start editing a trainee
  const startEditing = (row: TraineeReportRow) => {
    setEditing({
      traineeId: row.id,
      payment_method: row.payment_method,
      counting_method: row.counting_method,
      monthly_price: row.monthly_price,
      card_sessions_total: row.card_sessions_total,
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditing(null);
  };

  // Open add card modal
  const openAddCardModal = (traineeId: string, traineeName: string) => {
    setSelectedTraineeForCard({ id: traineeId, name: traineeName });
    setNewCard({
      sessions_purchased: 10,
      price_paid: 0,
      purchase_date: new Date().toISOString().split('T')[0],
    });
    setShowAddCardModal(true);
  };

  // Open card history modal
  const openCardHistoryModal = async (traineeId: string, traineeName: string) => {
    if (!user) return;
    
    setSelectedTraineeForCard({ id: traineeId, name: traineeName });
    
    // Fetch card history for this trainee
    const { data, error } = await supabase
      .from('trainee_cards')
      .select('*')
      .eq('trainee_id', traineeId)
      .eq('trainer_id', user.id)
      .order('purchase_date', { ascending: false });

    if (error) {
      logger.error('Error loading card history', error, 'SmartReportView');
      toast.error('שגיאה בטעינת היסטוריית כרטיסיות');
      return;
    }

    setCardHistory(data || []);
    setShowCardHistoryModal(true);
  };

  // Save new card
  const saveNewCard = async () => {
    if (!user || !selectedTraineeForCard) return;

    setSavingCard(true);
    try {
      // Deactivate any existing active cards for this trainee
      await supabase
        .from('trainee_cards')
        .update({ is_active: false })
        .eq('trainee_id', selectedTraineeForCard.id)
        .eq('trainer_id', user.id)
        .eq('is_active', true);

      // Create new card
      const { error } = await supabase
        .from('trainee_cards')
        .insert({
          trainee_id: selectedTraineeForCard.id,
          trainer_id: user.id,
          purchase_date: newCard.purchase_date,
          sessions_purchased: newCard.sessions_purchased,
          price_paid: newCard.price_paid,
          sessions_used: 0,
          is_active: true,
        });

      if (error) throw error;

      toast.success(`כרטיסיה חדשה נוספה ל${selectedTraineeForCard.name}`);
      setShowAddCardModal(false);
      
      // Reload report data to reflect the new card
      loadReportData();
    } catch (err) {
      logger.error('Error saving new card', err, 'SmartReportView');
      toast.error('שגיאה בשמירת הכרטיסיה');
    } finally {
      setSavingCard(false);
    }
  };

  // Save edited trainee
  const saveEditing = async () => {
    if (!editing) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        payment_method: editing.payment_method,
        counting_method: editing.counting_method,
        monthly_price: editing.monthly_price,
      };

      // Only update card fields if counting method is card_ticket
      if (editing.counting_method === 'card_ticket') {
        updateData.card_sessions_total = editing.card_sessions_total;
      } else {
        // Clear card fields if not using card_ticket
        updateData.card_sessions_total = null;
        updateData.card_sessions_used = 0;
      }

      logger.info('Saving trainee data', { traineeId: editing.traineeId, updateData }, 'SmartReportView');
      
      const { data: updatedData, error } = await supabase
        .from('trainees')
        .update(updateData)
        .eq('id', editing.traineeId)
        .select()
        .single();

      if (error) {
        logger.error('Supabase update error', error, 'SmartReportView');
        throw error;
      }

      logger.info('Update successful', updatedData, 'SmartReportView');
      toast.success('הנתונים עודכנו בהצלחה');
      
      // Update local state immediately for better UX
      setReportData(prev => prev.map(row => {
        if (row.id === editing.traineeId) {
          const countingMethod = editing.counting_method;
          const monthlyPrice = editing.monthly_price;
          const workoutsThisMonth = row.workouts_this_month;
          
          // Recalculate total_due based on counting method
          let totalDue = 0;
          switch (countingMethod) {
            case 'subscription':
              totalDue = monthlyPrice;
              break;
            case 'monthly_count':
              totalDue = workoutsThisMonth * monthlyPrice;
              break;
            case 'card_ticket':
              totalDue = 0;
              break;
            default:
              totalDue = 0;
          }
          
          return {
            ...row,
            payment_method: editing.payment_method,
            counting_method: countingMethod,
            monthly_price: monthlyPrice,
            card_sessions_total: countingMethod === 'card_ticket' ? editing.card_sessions_total : 0,
            total_due: totalDue,
          };
        }
        return row;
      }));
      
      setEditing(null);
      
      // Refetch trainees data to ensure consistency
      // This ensures that if loadReportData is called again, it will have the updated data
      await refetch();
    } catch (err) {
      logger.error('Error saving trainee payment data', err, 'SmartReportView');
      toast.error('שגיאה בשמירת הנתונים');
    } finally {
      setSaving(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['שם', 'שיטת תשלום', 'שיטת ספירה', 'מחיר', 'אימונים החודש', 'סה"כ לחיוב', 'כרטיסיה נותר', 'נרכש החודש'];
    const rows = filteredData.map(row => [
      row.full_name,
      row.payment_method ? PAYMENT_METHOD_LABELS[row.payment_method] : '',
      row.counting_method ? COUNTING_METHOD_LABELS[row.counting_method] : '',
      row.monthly_price.toString(),
      row.workouts_this_month.toString(),
      row.total_due.toString(),
      row.counting_method === 'card_ticket' ? `${row.card_remaining}/${row.card_sessions_total}` : '',
      row.card_purchased_this_month ? 'כן' : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `דוח_חכם_${selectedMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}.csv`;
    link.click();

    toast.success('הקובץ הורד בהצלחה');
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
  };

  const selectedTraineeData = useMemo(() => {
    if (!selectedTrainee) return null;
    return reportData.find(row => row.id === selectedTrainee);
  }, [selectedTrainee, reportData]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="premium-card-static p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30">
              <FileSpreadsheet className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-1">דוח חכם</h1>
              <p className="text-[var(--color-text-muted)] text-lg">ניהול תשלומים וסיכום חודשי של מתאמנים</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-[var(--color-text-muted)]" title="הנתונים מבוססים על אימונים מהיומן (Google Calendar)">
                <span>יומן</span>
                <span className="opacity-60">›</span>
                <span>אימונים</span>
                <span className="opacity-60">›</span>
                <span>דוח תשלומים</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onBackToCalendar && (
              <button
                onClick={() => onBackToCalendar(selectedMonth)}
                className="px-4 py-2 bg-surface hover:bg-elevated/50 text-[var(--color-text-secondary)] rounded-lg transition-all flex items-center gap-2 border border-border"
                title="צפה ביומן לחודש זה"
              >
                <CalendarDays className="w-4 h-4" />
                צפה ביומן
              </button>
            )}
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="rounded"
              />
              שמירה אוטומטית
            </label>
            <button
              onClick={() => saveMonthlyReport(false)}
              disabled={savingReport || !monthlyReport}
              className="px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-lg transition-all flex items-center gap-2 border border-primary-500/30 disabled:opacity-50"
            >
              {savingReport ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              שמור דוח
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="premium-card-static p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 bg-surface hover:bg-elevated/50 rounded-xl transition-all text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-xl border border-border">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-[var(--color-text-primary)]">{formatMonth(selectedMonth)}</span>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 bg-surface hover:bg-elevated/50 rounded-xl transition-all text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
              disabled={selectedMonth >= new Date()}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Search, Hidden Toggle, and Export */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="חיפוש מתאמן..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 pl-4 py-2 bg-surface border border-border rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-amber-500/50 focus:outline-none w-48"
              />
            </div>
            
            {/* Hidden trainees toggle */}
            {hiddenTrainees.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHidden(!showHidden)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm ${
                    showHidden
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-surface text-[var(--color-text-muted)] border border-border hover:text-[var(--color-text-secondary)]'
                  }`}
                  title={showHidden ? 'הסתר מוסתרים' : 'הצג מוסתרים'}
                >
                  {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span>{hiddenTrainees.size} מוסתרים</span>
                </button>
                <button
                  onClick={clearHiddenTrainees}
                  className="p-2 bg-surface hover:bg-elevated/50 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] rounded-lg transition-all"
                  title="נקה את כל המוסתרים"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-elevated/50 rounded-xl transition-all text-[var(--color-text-secondary)] border border-border"
            >
              <Download className="w-4 h-4" />
              ייצוא CSV
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      {monthlyReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="premium-card-static p-5">
            <div className="text-sm text-[var(--color-text-muted)] mb-1">סה"כ הכנסה חודשית</div>
            <div className="text-2xl font-bold text-primary-400">₪{monthlyReport.total_income.toLocaleString()}</div>
            {monthlyReport.income_goal > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-1">
                  <span>מטרה: ₪{monthlyReport.income_goal.toLocaleString()}</span>
                  <span>{Math.round((monthlyReport.total_income / monthlyReport.income_goal) * 100)}%</span>
                </div>
                <div className="w-full bg-surface rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((monthlyReport.total_income / monthlyReport.income_goal) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">
                  נותר: ₪{Math.max(0, monthlyReport.income_goal - monthlyReport.total_income).toLocaleString()}
                </div>
              </div>
            )}
          </div>
          <div className="premium-card-static p-5">
            <div className="text-sm text-[var(--color-text-muted)] mb-1">סה"כ אימונים החודש</div>
            <div className="text-2xl font-bold text-amber-400">{monthlyReport.total_workouts}</div>
          </div>
          <div className="premium-card-static p-5">
            <div className="text-sm text-[var(--color-text-muted)] mb-1 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              חודש קודם
            </div>
            <div className="text-2xl font-bold text-blue-400">₪{monthlyReport.previous_month_income.toLocaleString()}</div>
          </div>
          <div className="premium-card-static p-5">
            <div className="text-sm text-[var(--color-text-muted)] mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              צפי חודש הבא
            </div>
            <div className="text-2xl font-bold text-amber-400">₪{monthlyReport.next_month_forecast.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Payment Distribution */}
      {monthlyReport && (
        <div className="premium-card-static p-5 mb-6">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">התפלגות לפי סוג תשלום</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(monthlyReport.payment_distribution).map(([method, amount]) => {
              if (amount === 0) return null;
              const PaymentIcon = PAYMENT_METHOD_ICONS[method as PaymentMethod];
              return (
                <div key={method} className="flex flex-col items-center p-3 bg-surface rounded-lg">
                  {PaymentIcon && <PaymentIcon className="w-5 h-5 text-[var(--color-text-muted)] mb-2" />}
                  <div className="text-xs text-[var(--color-text-muted)] mb-1">{PAYMENT_METHOD_LABELS[method as PaymentMethod]}</div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">₪{amount.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Income Goal Setting */}
      <div className="premium-card-static p-4 mb-6">
        <div className="flex items-center gap-4">
          <Target className="w-5 h-5 text-amber-400" />
          <label className="text-sm text-[var(--color-text-muted)]">מטרת הכנסה חודשית:</label>
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-muted)]">₪</span>
            <input
              type="number"
              value={incomeGoal}
              onChange={(e) => setIncomeGoal(parseFloat(e.target.value) || 0)}
              className="px-3 py-1 bg-surface border border-border rounded-lg text-[var(--color-text-primary)] w-32"
              min="0"
            />
            <button
              onClick={async () => {
                if (monthlyReport) {
                  const updatedReport = { ...monthlyReport, income_goal: incomeGoal };
                  setMonthlyReport(updatedReport);
                  // Save immediately
                  const reportMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
                  const serializableReport = reportData.map(row => ({
                    ...row,
                    workout_numbers: Object.fromEntries(row.workout_numbers),
                    workout_items: row.workout_items,
                  }));
                  const reportDataToSave = {
                    trainer_id: user?.id,
                    report_month: reportMonth.toISOString().split('T')[0],
                    total_income: updatedReport.total_income,
                    total_workouts: updatedReport.total_workouts,
                    income_goal: incomeGoal,
                    payment_distribution: updatedReport.payment_distribution,
                    report_data: serializableReport,
                    is_auto_saved: false,
                    updated_at: new Date().toISOString(),
                  };
                  try {
                    await supabase
                      .from('monthly_reports')
                      .upsert(reportDataToSave, { onConflict: 'trainer_id,report_month' });
                    toast.success('מטרת הכנסה עודכנה');
                  } catch (err) {
                    logger.error('Error updating income goal', err, 'SmartReportView');
                    toast.error('שגיאה בעדכון המטרה');
                  }
                }
              }}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm"
            >
              עדכן מטרה
            </button>
          </div>
        </div>
      </div>

      {/* Trainee Workout Dates Modal */}
      {selectedTraineeData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="premium-card-static p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">
                תאריכי אימונים - {selectedTraineeData.full_name}
              </h3>
              <button
                onClick={() => setSelectedTrainee(null)}
                className="p-2 hover:bg-surface rounded-lg transition-all text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {selectedTraineeData.workout_items.length === 0 ? (
                <div className="text-center text-muted py-8">אין אימונים בחודש זה</div>
              ) : (
                selectedTraineeData.workout_items.map((item, index) => {
                  const workoutNumber = selectedTraineeData.workout_numbers.get(item.workout_id) ?? index + 1;
                  return (
                    <div
                      key={item.workout_id}
                      className="flex items-center justify-between p-3 bg-surface rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                          {workoutNumber}
                        </div>
                        <div>
                          <div className="text-foreground font-medium">
                            {selectedTraineeData.full_name} {workoutNumber}
                          </div>
                          <div className="text-sm text-muted">{formatDate(item.date)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="premium-card-static p-5">
          <div className="text-sm text-muted mb-1">סה"כ מתאמנים</div>
          <div className="text-2xl font-bold text-foreground">{filteredData.length}</div>
        </div>
        <div className="premium-card-static p-5">
          <div className="text-sm text-muted mb-1">סה"כ אימונים החודש</div>
          <div className="text-2xl font-bold text-amber-400">
            {filteredData.reduce((sum, row) => sum + row.workouts_this_month, 0)}
          </div>
        </div>
        <div className="premium-card-static p-5">
          <div className="text-sm text-muted mb-1">סה"כ לחיוב</div>
          <div className="text-2xl font-bold text-primary-400">
            ₪{filteredData.reduce((sum, row) => sum + row.total_due, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="premium-card-static overflow-hidden">
        {loading || traineesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20 text-muted">
            אין מתאמנים להצגה
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right p-4 text-sm font-semibold text-[var(--color-text-muted)]">שם מתאמן</th>
                  <th className="text-right p-4 text-sm font-semibold text-[var(--color-text-muted)]">שיטת תשלום</th>
                  <th className="text-right p-4 text-sm font-semibold text-[var(--color-text-muted)]">שיטת ספירה</th>
                  <th className="text-right p-4 text-sm font-semibold text-[var(--color-text-muted)]">מחיר</th>
                  <th className="text-right p-4 text-sm font-semibold text-[var(--color-text-muted)]">אימונים החודש</th>
                  <th className="text-right p-4 text-sm font-semibold text-[var(--color-text-muted)]">סה"כ לחיוב</th>
                  <th className="text-right p-4 text-sm font-semibold text-[var(--color-text-muted)]">כרטיסיה</th>
                  <th className="text-center p-4 text-sm font-semibold text-[var(--color-text-muted)]">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row) => {
                  const isEditing = editing?.traineeId === row.id;
                  const PaymentIcon = row.payment_method ? PAYMENT_METHOD_ICONS[row.payment_method] : null;
                  const CountingIcon = row.counting_method ? COUNTING_METHOD_ICONS[row.counting_method] : null;

                  return (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-surface/30 transition-all">
                      {/* Name - Clickable to show workout dates */}
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedTrainee(row.id)}
                          className="font-medium text-[var(--color-text-primary)] hover:text-amber-400 transition-colors flex items-center gap-2"
                        >
                          {row.full_name}
                          <Eye className="w-4 h-4" />
                        </button>
                        {row.counting_method === 'card_ticket' && (
                          <div className="text-xs text-[var(--color-text-muted)] mt-1">
                            כרטיסיה #{row.card_sessions_total}
                          </div>
                        )}
                      </td>

                      {/* Payment Method - איך משלמים */}
                      <td className="p-4">
                        {isEditing ? (
                          <select
                            value={editing.payment_method || ''}
                            onChange={(e) => setEditing({ 
                              ...editing, 
                              payment_method: e.target.value as PaymentMethod || null 
                            })}
                            className="p-2 bg-surface border border-border rounded-lg text-[var(--color-text-primary)] text-sm w-full"
                          >
                            <option value="">לא הוגדר</option>
                            <option value="standing_order">הוראת קבע</option>
                            <option value="credit">אשראי</option>
                            <option value="cash">מזומן</option>
                            <option value="paybox">PayBox</option>
                            <option value="bit">ביט</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            {PaymentIcon && <PaymentIcon className="w-4 h-4 text-[var(--color-text-muted)]" />}
                            <span className={row.payment_method ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}>
                              {row.payment_method ? PAYMENT_METHOD_LABELS[row.payment_method] : 'לא הוגדר'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Counting Method - איך סופרים */}
                      <td className="p-4">
                        {isEditing ? (
                          <select
                            value={editing.counting_method || ''}
                            onChange={(e) => setEditing({ 
                              ...editing, 
                              counting_method: e.target.value as CountingMethod || null 
                            })}
                            className="p-2 bg-surface border border-border rounded-lg text-[var(--color-text-primary)] text-sm w-full"
                          >
                            <option value="">לא הוגדר</option>
                            <option value="subscription">מנוי מתחדש</option>
                            <option value="monthly_count">כמות חודשית</option>
                            <option value="card_ticket">כרטיסיה</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            {CountingIcon && <CountingIcon className="w-4 h-4 text-[var(--color-text-muted)]" />}
                            <span className={row.counting_method ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}>
                              {row.counting_method ? COUNTING_METHOD_LABELS[row.counting_method] : 'לא הוגדר'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Price */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[var(--color-text-muted)]">₪</span>
                            <input
                              type="number"
                              value={editing.monthly_price}
                              onChange={(e) => setEditing({ 
                                ...editing, 
                                monthly_price: parseFloat(e.target.value) || 0 
                              })}
                              className="p-2 bg-surface border border-border rounded-lg text-[var(--color-text-primary)] text-sm w-24"
                              min="0"
                            />
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-primary)]">
                            {row.monthly_price > 0 ? `₪${row.monthly_price}` : '-'}
                          </span>
                        )}
                      </td>

                      {/* Workouts */}
                      <td className="p-4">
                        <span className={`font-semibold ${row.workouts_this_month > 0 ? 'text-amber-400' : 'text-[var(--color-text-muted)]'}`}>
                          {row.workouts_this_month}
                        </span>
                      </td>

                      {/* Total Due */}
                      <td className="p-4">
                        <span className={`font-semibold ${row.total_due > 0 ? 'text-primary-400' : 'text-[var(--color-text-muted)]'}`}>
                          {row.total_due > 0 ? `₪${row.total_due}` : '-'}
                        </span>
                      </td>

                      {/* Card Status */}
                      <td className="p-4">
                        {row.counting_method === 'card_ticket' ? (
                          <div className="flex items-center gap-2">
                            {row.active_card ? (
                              <button
                                onClick={() => openCardHistoryModal(row.id, row.full_name)}
                                className="flex flex-col gap-1 text-right hover:bg-surface p-2 -m-2 rounded-lg transition-all"
                                title={row.card_forecast_weeks ? `החבילה תסתיים בעוד ${row.card_remaining} אימונים (צפי: ~${row.card_forecast_weeks} שבועות)` : undefined}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-medium ${row.card_remaining > 2 ? 'text-primary-400' : row.card_remaining > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {row.card_remaining}
                                  </span>
                                  <span className="text-[var(--color-text-muted)] text-sm">/ {row.card_sessions_total}</span>
                                  {row.card_forecast_weeks !== undefined && row.card_remaining > 0 && (
                                    <span className="text-xs text-[var(--color-text-muted)]">
                                      (צפי: ~{row.card_forecast_weeks} שבועות)
                                    </span>
                                  )}
                                  {row.card_remaining > 0 && row.card_remaining <= 2 && (
                                    <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                                      נגמר בקרוב
                                    </span>
                                  )}
                                </div>
                                {row.card_purchased_this_month && (
                                  <span className="text-xs text-primary-400 bg-primary-400/10 px-2 py-0.5 rounded">
                                    נרכש החודש - ₪{row.active_card.price_paid}
                                  </span>
                                )}
                                {row.card_remaining === 0 && (
                                  <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
                                    הכרטיסיה נגמרה
                                  </span>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => openAddCardModal(row.id, row.full_name)}
                                className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm transition-all"
                              >
                                <Plus className="w-4 h-4" />
                                הוסף כרטיסיה
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={saveEditing}
                                disabled={saving}
                                className="p-2 bg-primary-500/20 hover:bg-primary-500/30 rounded-lg transition-all text-primary-400"
                              >
                                {saving ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={cancelEditing}
                                disabled={saving}
                                className="p-2 bg-elevated/50 hover:bg-elevated rounded-lg transition-all text-muted"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(row)}
                                className="p-2 bg-surface hover:bg-elevated/50 rounded-lg transition-all text-muted hover:text-foreground"
                                title="עריכה"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleHideTrainee(row.id)}
                                className={`p-2 rounded-lg transition-all ${
                                  hiddenTrainees.has(row.id)
                                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                    : 'bg-surface text-muted hover:bg-elevated/50 hover:text-foreground'
                                }`}
                                title={hiddenTrainees.has(row.id) ? 'הצג בדוח' : 'הסתר מהדוח'}
                              >
                                {hiddenTrainees.has(row.id) ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Card Modal */}
      {showAddCardModal && selectedTraineeForCard && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-surface)] rounded-2xl max-w-md w-full p-6 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Ticket className="w-6 h-6 text-amber-400" />
                כרטיסיה חדשה - {selectedTraineeForCard.name}
              </h2>
              <button
                onClick={() => setShowAddCardModal(false)}
                className="p-2 hover:bg-[var(--color-bg-elevated)] rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-[var(--color-text-muted)]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-2">כמות אימונים</label>
                <input
                  type="number"
                  value={newCard.sessions_purchased}
                  onChange={(e) => setNewCard({ ...newCard, sessions_purchased: parseInt(e.target.value) || 0 })}
                  className="w-full p-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)]"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-2">מחיר הכרטיסיה (₪)</label>
                <input
                  type="number"
                  value={newCard.price_paid}
                  onChange={(e) => setNewCard({ ...newCard, price_paid: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)]"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-2">תאריך רכישה</label>
                <input
                  type="date"
                  value={newCard.purchase_date}
                  onChange={(e) => setNewCard({ ...newCard, purchase_date: e.target.value })}
                  className="w-full p-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveNewCard}
                disabled={savingCard || newCard.sessions_purchased < 1}
                className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 rounded-lg text-foreground font-medium transition-all flex items-center justify-center gap-2"
              >
                {savingCard ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    הוסף כרטיסיה
                  </>
                )}
              </button>
              <button
                onClick={() => setShowAddCardModal(false)}
                className="px-6 py-3 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-surface)] rounded-lg text-[var(--color-text-muted)] transition-all"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card History Modal */}
      {showCardHistoryModal && selectedTraineeForCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="premium-card-static rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col border border-border shadow-2xl animate-scale-in overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-border">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30">
                    <History className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                      היסטוריית כרטיסיות
                    </h2>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                      {selectedTraineeForCard.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCardHistoryModal(false)}
                  className="p-2 hover:bg-surface rounded-xl transition-all text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  aria-label="סגור"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              {cardHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-2xl bg-surface/50 mb-4">
                    <Ticket className="w-12 h-12 text-[var(--color-text-muted)] opacity-50" />
                  </div>
                  <p className="text-[var(--color-text-muted)] font-medium">אין היסטוריית כרטיסיות</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">הוסף כרטיסיה ראשונה למתאמן</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute right-5 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {cardHistory.map((card, index) => (
                      <div key={card.id} className="relative flex gap-4">
                        {/* Timeline dot */}
                        <div className={`relative z-10 flex-shrink-0 w-3 h-3 rounded-full mt-1.5 ${
                          card.is_active 
                            ? 'bg-amber-400 ring-4 ring-amber-400/30' 
                            : 'bg-surface border-2 border-border'
                        }`} />
                        {/* Card */}
                        <div className={`flex-1 min-w-0 rounded-xl border p-4 transition-all ${
                          card.is_active 
                            ? 'bg-amber-500/5 border-amber-500/30 shadow-sm' 
                            : 'bg-surface/30 border-border/50'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[var(--color-text-primary)]">
                                {card.sessions_purchased} אימונים
                              </span>
                              {card.is_active && (
                                <span className="text-xs font-medium bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg">
                                  פעילה
                                </span>
                              )}
                              {!card.is_active && card.sessions_used === card.sessions_purchased && (
                                <span className="text-xs font-medium bg-surface text-[var(--color-text-muted)] px-2.5 py-1 rounded-lg">
                                  הושלמה
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-primary-400">₪{card.price_paid.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] mb-2">
                            <span>נרכש: {new Date(card.purchase_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="font-medium">{card.sessions_used}/{card.sessions_purchased} נוצלו</span>
                          </div>
                          <div className="h-2 bg-surface rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                card.is_active 
                                  ? 'bg-gradient-to-l from-amber-500 to-amber-400' 
                                  : 'bg-[var(--color-text-muted)]/30'
                              }`}
                              style={{ width: `${Math.min(100, (card.sessions_used / card.sessions_purchased) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-border bg-surface/30">
              <button
                onClick={() => {
                  setShowCardHistoryModal(false);
                  openAddCardModal(selectedTraineeForCard.id, selectedTraineeForCard.name);
                }}
                className="w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-5 h-5" />
                הוסף כרטיסיה חדשה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
