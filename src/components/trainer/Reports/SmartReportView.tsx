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
  RefreshCw,
  Smartphone,
  Wallet
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
  workout_dates: string[]; // All workout dates for this trainee in the month
  workout_numbers: Map<string, number>; // Map of workout_date to workout number
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

export default function SmartReportView() {
  const { user } = useAuth();
  const { data: traineesData, loading: traineesLoading, refetch } = useTrainees(user?.id || null);
  
  // Ensure trainees is always an array
  const trainees = Array.isArray(traineesData) ? traineesData : [];
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
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

  // Calculate workout number for a trainee
  const getWorkoutNumber = useCallback(async (traineeId: string, workoutDate: string): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('get_trainee_workout_number', {
        p_trainee_id: traineeId,
        p_workout_date: workoutDate,
      });

      if (error) {
        // Fallback: count manually
        const { data: workouts } = await supabase
          .from('workouts')
          .select('id, workout_date')
          .eq('trainer_id', user?.id)
          .lt('workout_date', workoutDate);

        if (workouts) {
          const { data: links } = await supabase
            .from('workout_trainees')
            .select('workout_id')
            .eq('trainee_id', traineeId)
            .in('workout_id', workouts.map(w => w.id));

          return (links?.length || 0) + 1;
        }
        return 1;
      }

      return data || 1;
    } catch (err) {
      logger.error('Error getting workout number', err, 'SmartReportView');
      return 1;
    }
  }, [user]);

  // Load workout counts and dates for the selected month
  const loadReportData = useCallback(async () => {
    if (!user || trainees.length === 0) {
      setReportData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

      // Get all workouts for the month (not just synced)
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, workout_date')
        .eq('trainer_id', user.id)
        .gte('workout_date', startOfMonth.toISOString())
        .lte('workout_date', endOfMonth.toISOString())
        .order('workout_date', { ascending: true });

      if (workoutsError) {
        logger.error('Error loading workouts data', workoutsError, 'SmartReportView');
      }

      const workoutIds = workoutsData?.map(w => w.id) || [];
      
      // Get trainee links for these workouts
      let workoutData: { trainee_id: string; workout_id: string; workout_date: string }[] = [];
      if (workoutIds.length > 0) {
        const { data: traineeLinks, error: linksError } = await supabase
          .from('workout_trainees')
          .select('trainee_id, workout_id')
          .in('workout_id', workoutIds);

        if (linksError) {
          logger.error('Error loading workout trainee links', linksError, 'SmartReportView');
        }

        // Map workout dates
        const workoutDateMap = new Map(workoutsData?.map(w => [w.id, w.workout_date]) || []);
        workoutData = (traineeLinks || []).map(link => ({
          trainee_id: link.trainee_id,
          workout_id: link.workout_id,
          workout_date: workoutDateMap.get(link.workout_id) || '',
        }));
      }

      // Group workouts by trainee and calculate numbers
      const traineeWorkouts = new Map<string, { dates: string[]; numbers: Map<string, number> }>();
      
      for (const workout of workoutData) {
        if (!traineeWorkouts.has(workout.trainee_id)) {
          traineeWorkouts.set(workout.trainee_id, { dates: [], numbers: new Map() });
        }
        const traineeData = traineeWorkouts.get(workout.trainee_id)!;
        if (!traineeData.dates.includes(workout.workout_date)) {
          traineeData.dates.push(workout.workout_date);
        }
      }

      // Calculate workout numbers for each trainee
      for (const [traineeId, data] of traineeWorkouts.entries()) {
        const sortedDates = [...data.dates].sort();
        for (let i = 0; i < sortedDates.length; i++) {
          const workoutNumber = await getWorkoutNumber(traineeId, sortedDates[i]);
          data.numbers.set(sortedDates[i], workoutNumber);
        }
      }

      // Build report data
      const report: TraineeReportRow[] = trainees.map((trainee) => {
        const traineeWorkoutData = traineeWorkouts.get(trainee.id) || { dates: [], numbers: new Map() };
        const workoutsThisMonth = traineeWorkoutData.dates.length;
        const paymentMethod = (trainee as { payment_method?: PaymentMethod }).payment_method || null;
        const countingMethod = (trainee as { counting_method?: CountingMethod }).counting_method || null;
        const monthlyPrice = (trainee as { monthly_price?: number }).monthly_price || 0;
        const cardSessionsTotal = (trainee as { card_sessions_total?: number }).card_sessions_total || 0;
        const cardSessionsUsed = (trainee as { card_sessions_used?: number }).card_sessions_used || 0;

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
            // כרטיסיה - תשלום מראש, לא נספר כחיוב חודשי
            totalDue = 0;
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
          card_sessions_total: cardSessionsTotal,
          card_sessions_used: cardSessionsUsed,
          workouts_this_month: workoutsThisMonth,
          total_due: totalDue,
          workout_dates: traineeWorkoutData.dates.sort(),
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
          workout_numbers: Object.fromEntries(row.workout_numbers), // Convert Map to object
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
      console.error('SmartReportView error details:', err);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [user, trainees, selectedMonth, getWorkoutNumber, getMonthKey, loadSavedReport, autoSave]);

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
  const filteredData = useMemo(() => {
    if (!searchQuery) return reportData;
    const query = searchQuery.toLowerCase();
    return reportData.filter(row => 
      row.full_name.toLowerCase().includes(query)
    );
  }, [reportData, searchQuery]);

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

      const { error } = await supabase
        .from('trainees')
        .update(updateData)
        .eq('id', editing.traineeId);

      if (error) {
        throw error;
      }

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
      
      // Also refresh from server in background
      refetch();
    } catch (err) {
      logger.error('Error saving trainee payment data', err, 'SmartReportView');
      toast.error('שגיאה בשמירת הנתונים');
    } finally {
      setSaving(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['שם', 'שיטת תשלום', 'שיטת ספירה', 'מחיר', 'אימונים החודש', 'סה"כ לחיוב', 'כרטיסיה נותר'];
    const rows = filteredData.map(row => [
      row.full_name,
      row.payment_method ? PAYMENT_METHOD_LABELS[row.payment_method] : '',
      row.counting_method ? COUNTING_METHOD_LABELS[row.counting_method] : '',
      row.monthly_price.toString(),
      row.workouts_this_month.toString(),
      row.total_due.toString(),
      row.counting_method === 'card_ticket' ? (row.card_sessions_total - row.card_sessions_used).toString() : '',
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
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-purple-500/15 border border-purple-500/30">
              <FileSpreadsheet className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">דוח חכם</h1>
              <p className="text-zinc-400 text-lg">ניהול תשלומים וסיכום חודשי של מתאמנים</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
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
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all flex items-center gap-2 border border-emerald-500/30 disabled:opacity-50"
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
              className="p-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl transition-all text-zinc-400 hover:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
              <Calendar className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-white">{formatMonth(selectedMonth)}</span>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl transition-all text-zinc-400 hover:text-white disabled:opacity-50"
              disabled={selectedMonth >= new Date()}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Search and Export */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="חיפוש מתאמן..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 pl-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:border-purple-500/50 focus:outline-none w-48"
              />
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl transition-all text-zinc-300 border border-zinc-700/50"
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
            <div className="text-sm text-zinc-500 mb-1">סה"כ הכנסה חודשית</div>
            <div className="text-2xl font-bold text-emerald-400">₪{monthlyReport.total_income.toLocaleString()}</div>
            {monthlyReport.income_goal > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                  <span>מטרה: ₪{monthlyReport.income_goal.toLocaleString()}</span>
                  <span>{Math.round((monthlyReport.total_income / monthlyReport.income_goal) * 100)}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((monthlyReport.total_income / monthlyReport.income_goal) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  נותר: ₪{Math.max(0, monthlyReport.income_goal - monthlyReport.total_income).toLocaleString()}
                </div>
              </div>
            )}
          </div>
          <div className="premium-card-static p-5">
            <div className="text-sm text-zinc-500 mb-1">סה"כ אימונים החודש</div>
            <div className="text-2xl font-bold text-purple-400">{monthlyReport.total_workouts}</div>
          </div>
          <div className="premium-card-static p-5">
            <div className="text-sm text-zinc-500 mb-1 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              חודש קודם
            </div>
            <div className="text-2xl font-bold text-blue-400">₪{monthlyReport.previous_month_income.toLocaleString()}</div>
          </div>
          <div className="premium-card-static p-5">
            <div className="text-sm text-zinc-500 mb-1 flex items-center gap-2">
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
          <h3 className="text-lg font-semibold text-white mb-4">התפלגות לפי סוג תשלום</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(monthlyReport.payment_distribution).map(([method, amount]) => {
              if (amount === 0) return null;
              const PaymentIcon = PAYMENT_METHOD_ICONS[method as PaymentMethod];
              return (
                <div key={method} className="flex flex-col items-center p-3 bg-zinc-800/50 rounded-lg">
                  {PaymentIcon && <PaymentIcon className="w-5 h-5 text-zinc-400 mb-2" />}
                  <div className="text-xs text-zinc-500 mb-1">{PAYMENT_METHOD_LABELS[method as PaymentMethod]}</div>
                  <div className="text-lg font-bold text-white">₪{amount.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Income Goal Setting */}
      <div className="premium-card-static p-4 mb-6">
        <div className="flex items-center gap-4">
          <Target className="w-5 h-5 text-purple-400" />
          <label className="text-sm text-zinc-400">מטרת הכנסה חודשית:</label>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">₪</span>
            <input
              type="number"
              value={incomeGoal}
              onChange={(e) => setIncomeGoal(parseFloat(e.target.value) || 0)}
              className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-white w-32"
              min="0"
            />
            <button
              onClick={async () => {
                if (monthlyReport) {
                  const updatedReport = { ...monthlyReport, income_goal: incomeGoal };
                  setMonthlyReport(updatedReport);
                  // Save immediately
                  const reportMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
                  const reportDataToSave = {
                    trainer_id: user?.id,
                    report_month: reportMonth.toISOString().split('T')[0],
                    total_income: updatedReport.total_income,
                    total_workouts: updatedReport.total_workouts,
                    income_goal: incomeGoal,
                    payment_distribution: updatedReport.payment_distribution,
                    report_data: reportData,
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
              className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm"
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
              <h3 className="text-xl font-bold text-white">
                תאריכי אימונים - {selectedTraineeData.full_name}
              </h3>
              <button
                onClick={() => setSelectedTrainee(null)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-all text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {selectedTraineeData.workout_dates.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">אין אימונים בחודש זה</div>
              ) : (
                selectedTraineeData.workout_dates.map((date, index) => {
                  const workoutNumber = selectedTraineeData.workout_numbers.get(date) || index + 1;
                  return (
                    <div
                      key={date}
                      className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                          {workoutNumber}
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {selectedTraineeData.full_name} {workoutNumber}
                          </div>
                          <div className="text-sm text-zinc-500">{formatDate(date)}</div>
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
          <div className="text-sm text-zinc-500 mb-1">סה"כ מתאמנים</div>
          <div className="text-2xl font-bold text-white">{filteredData.length}</div>
        </div>
        <div className="premium-card-static p-5">
          <div className="text-sm text-zinc-500 mb-1">סה"כ אימונים החודש</div>
          <div className="text-2xl font-bold text-purple-400">
            {filteredData.reduce((sum, row) => sum + row.workouts_this_month, 0)}
          </div>
        </div>
        <div className="premium-card-static p-5">
          <div className="text-sm text-zinc-500 mb-1">סה"כ לחיוב</div>
          <div className="text-2xl font-bold text-emerald-400">
            ₪{filteredData.reduce((sum, row) => sum + row.total_due, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="premium-card-static overflow-hidden">
        {loading || traineesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            אין מתאמנים להצגה
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-right p-4 text-sm font-semibold text-zinc-400">שם מתאמן</th>
                  <th className="text-right p-4 text-sm font-semibold text-zinc-400">שיטת תשלום</th>
                  <th className="text-right p-4 text-sm font-semibold text-zinc-400">שיטת ספירה</th>
                  <th className="text-right p-4 text-sm font-semibold text-zinc-400">מחיר</th>
                  <th className="text-right p-4 text-sm font-semibold text-zinc-400">אימונים החודש</th>
                  <th className="text-right p-4 text-sm font-semibold text-zinc-400">סה"כ לחיוב</th>
                  <th className="text-right p-4 text-sm font-semibold text-zinc-400">כרטיסיה</th>
                  <th className="text-center p-4 text-sm font-semibold text-zinc-400">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row) => {
                  const isEditing = editing?.traineeId === row.id;
                  const PaymentIcon = row.payment_method ? PAYMENT_METHOD_ICONS[row.payment_method] : null;
                  const CountingIcon = row.counting_method ? COUNTING_METHOD_ICONS[row.counting_method] : null;

                  return (
                    <tr key={row.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-all">
                      {/* Name - Clickable to show workout dates */}
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedTrainee(row.id)}
                          className="font-medium text-white hover:text-purple-400 transition-colors flex items-center gap-2"
                        >
                          {row.full_name}
                          <Eye className="w-4 h-4" />
                        </button>
                        {row.counting_method === 'card_ticket' && (
                          <div className="text-xs text-zinc-500 mt-1">
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
                            className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm w-full"
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
                            {PaymentIcon && <PaymentIcon className="w-4 h-4 text-zinc-400" />}
                            <span className={row.payment_method ? 'text-white' : 'text-zinc-500'}>
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
                            className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm w-full"
                          >
                            <option value="">לא הוגדר</option>
                            <option value="subscription">מנוי מתחדש</option>
                            <option value="monthly_count">כמות חודשית</option>
                            <option value="card_ticket">כרטיסיה</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            {CountingIcon && <CountingIcon className="w-4 h-4 text-zinc-400" />}
                            <span className={row.counting_method ? 'text-white' : 'text-zinc-500'}>
                              {row.counting_method ? COUNTING_METHOD_LABELS[row.counting_method] : 'לא הוגדר'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Price */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-500">₪</span>
                            <input
                              type="number"
                              value={editing.monthly_price}
                              onChange={(e) => setEditing({ 
                                ...editing, 
                                monthly_price: parseFloat(e.target.value) || 0 
                              })}
                              className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm w-24"
                              min="0"
                            />
                          </div>
                        ) : (
                          <span className="text-white">
                            {row.monthly_price > 0 ? `₪${row.monthly_price}` : '-'}
                          </span>
                        )}
                      </td>

                      {/* Workouts */}
                      <td className="p-4">
                        <span className={`font-semibold ${row.workouts_this_month > 0 ? 'text-purple-400' : 'text-zinc-500'}`}>
                          {row.workouts_this_month}
                        </span>
                      </td>

                      {/* Total Due */}
                      <td className="p-4">
                        <span className={`font-semibold ${row.total_due > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {row.total_due > 0 ? `₪${row.total_due}` : '-'}
                        </span>
                      </td>

                      {/* Card Status */}
                      <td className="p-4">
                        {row.counting_method === 'card_ticket' ? (
                          isEditing ? (
                            <input
                              type="number"
                              value={editing?.card_sessions_total || 0}
                              onChange={(e) => setEditing({ 
                                ...editing!, 
                                card_sessions_total: parseInt(e.target.value) || 0 
                              })}
                              className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm w-20"
                              min="0"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-medium">
                                {row.card_sessions_total - row.card_sessions_used}
                              </span>
                              <span className="text-zinc-500 text-sm">/ {row.card_sessions_total}</span>
                            </div>
                          )
                        ) : (
                          <span className="text-zinc-500">-</span>
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
                                className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-all text-emerald-400"
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
                                className="p-2 bg-zinc-700/50 hover:bg-zinc-700 rounded-lg transition-all text-zinc-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEditing(row)}
                              className="p-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg transition-all text-zinc-400 hover:text-white"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
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
    </div>
  );
}
