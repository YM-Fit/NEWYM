/**
 * SmartReportView - Monthly trainee report with payment management
 * Shows all trainees, their workouts, and payment information
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
  Search
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTrainees } from '../../../hooks/useSupabaseQuery';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';

type PaymentMethod = 'standing_order' | 'credit' | 'monthly_count' | 'card_ticket';

interface TraineeReportRow {
  id: string;
  full_name: string;
  payment_method: PaymentMethod | null;
  monthly_price: number;
  card_sessions_total: number;
  card_sessions_used: number;
  workouts_this_month: number;
  total_due: number;
}

interface EditingState {
  traineeId: string;
  payment_method: PaymentMethod | null;
  monthly_price: number;
  card_sessions_total: number;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  standing_order: 'הוראת קבע',
  credit: 'אשראי',
  monthly_count: 'כמות חודשית',
  card_ticket: 'כרטיסיה',
};

const PAYMENT_METHOD_ICONS: Record<PaymentMethod, typeof CreditCard> = {
  standing_order: Repeat,
  credit: CreditCard,
  monthly_count: Banknote,
  card_ticket: Ticket,
};

export default function SmartReportView() {
  const { user } = useAuth();
  const { data: traineesData, loading: traineesLoading, refetch } = useTrainees(user?.id || null);
  
  // Ensure trainees is always an array
  const trainees = Array.isArray(traineesData) ? traineesData : [];
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [reportData, setReportData] = useState<TraineeReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load workout counts for the selected month
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

      // Get workout counts for each trainee in the month - ONLY from calendar synced workouts
      // First get all synced workouts for this month
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('id')
        .eq('trainer_id', user.id)
        .eq('synced_from_google', true)
        .eq('is_completed', true)
        .gte('workout_date', startOfMonth.toISOString())
        .lte('workout_date', endOfMonth.toISOString());

      if (workoutsError) {
        logger.error('Error loading workouts data', workoutsError, 'SmartReportView');
      }

      const workoutIds = workoutsData?.map(w => w.id) || [];
      
      // Now get the trainee links for these workouts
      let workoutData: { trainee_id: string }[] = [];
      if (workoutIds.length > 0) {
        const { data: traineeLinks, error: linksError } = await supabase
          .from('workout_trainees')
          .select('trainee_id, workout_id')
          .in('workout_id', workoutIds);

        if (linksError) {
          logger.error('Error loading workout trainee links', linksError, 'SmartReportView');
        }
        workoutData = traineeLinks || [];
      }

      // Count workouts per trainee (only calendar-synced workouts)
      const workoutCounts = new Map<string, number>();
      
      // Count from workouts table
      workoutData.forEach((w: { trainee_id: string }) => {
        const current = workoutCounts.get(w.trainee_id) || 0;
        workoutCounts.set(w.trainee_id, current + 1);
      });

      // Build report data
      const report: TraineeReportRow[] = trainees.map((trainee) => {
        const workoutsThisMonth = workoutCounts.get(trainee.id) || 0;
        const paymentMethod = (trainee as { payment_method?: PaymentMethod }).payment_method || null;
        const monthlyPrice = (trainee as { monthly_price?: number }).monthly_price || 0;
        const cardSessionsTotal = (trainee as { card_sessions_total?: number }).card_sessions_total || 0;
        const cardSessionsUsed = (trainee as { card_sessions_used?: number }).card_sessions_used || 0;

        // Calculate total due based on payment method
        let totalDue = 0;
        switch (paymentMethod) {
          case 'standing_order':
          case 'credit':
            totalDue = monthlyPrice; // Fixed monthly amount
            break;
          case 'monthly_count':
            totalDue = workoutsThisMonth * monthlyPrice; // Per workout
            break;
          case 'card_ticket':
            // Card doesn't have a monthly due - it's prepaid
            totalDue = 0;
            break;
          default:
            totalDue = 0;
        }

        return {
          id: trainee.id,
          full_name: trainee.full_name,
          payment_method: paymentMethod,
          monthly_price: monthlyPrice,
          card_sessions_total: cardSessionsTotal,
          card_sessions_used: cardSessionsUsed,
          workouts_this_month: workoutsThisMonth,
          total_due: totalDue,
        };
      });

      // Sort by name
      report.sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
      
      setReportData(report);
    } catch (err) {
      logger.error('Error loading report data', err, 'SmartReportView');
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [user, trainees, selectedMonth]);

  useEffect(() => {
    if (!traineesLoading) {
      loadReportData();
    }
  }, [loadReportData, traineesLoading]);

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
  };

  // Start editing a trainee
  const startEditing = (row: TraineeReportRow) => {
    setEditing({
      traineeId: row.id,
      payment_method: row.payment_method,
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
        monthly_price: editing.monthly_price,
      };

      // Only update card fields if payment method is card_ticket
      if (editing.payment_method === 'card_ticket') {
        updateData.card_sessions_total = editing.card_sessions_total;
      }

      const { error } = await supabase
        .from('trainees')
        .update(updateData)
        .eq('id', editing.traineeId);

      if (error) {
        throw error;
      }

      toast.success('הנתונים עודכנו בהצלחה');
      setEditing(null);
      
      // Refresh data
      await refetch();
      await loadReportData();
    } catch (err) {
      logger.error('Error saving trainee payment data', err, 'SmartReportView');
      toast.error('שגיאה בשמירת הנתונים');
    } finally {
      setSaving(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['שם', 'שיטת תשלום', 'מחיר', 'אימונים החודש', 'סה"כ לחיוב', 'כרטיסיה נותר'];
    const rows = filteredData.map(row => [
      row.full_name,
      row.payment_method ? PAYMENT_METHOD_LABELS[row.payment_method] : '',
      row.monthly_price.toString(),
      row.workouts_this_month.toString(),
      row.total_due.toString(),
      row.payment_method === 'card_ticket' ? (row.card_sessions_total - row.card_sessions_used).toString() : '',
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

  // Calculate totals
  const totals = useMemo(() => {
    const totalWorkouts = filteredData.reduce((sum, row) => sum + row.workouts_this_month, 0);
    const totalDue = filteredData.reduce((sum, row) => sum + row.total_due, 0);
    return { totalWorkouts, totalDue };
  }, [filteredData]);

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="premium-card-static p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-purple-500/15 border border-purple-500/30">
            <FileSpreadsheet className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">דוח חכם</h1>
            <p className="text-zinc-400 text-lg">ניהול תשלומים וסיכום חודשי של מתאמנים</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="premium-card-static p-5">
          <div className="text-sm text-zinc-500 mb-1">סה"כ מתאמנים</div>
          <div className="text-2xl font-bold text-white">{filteredData.length}</div>
        </div>
        <div className="premium-card-static p-5">
          <div className="text-sm text-zinc-500 mb-1">סה"כ אימונים החודש</div>
          <div className="text-2xl font-bold text-purple-400">{totals.totalWorkouts}</div>
        </div>
        <div className="premium-card-static p-5">
          <div className="text-sm text-zinc-500 mb-1">סה"כ לחיוב</div>
          <div className="text-2xl font-bold text-emerald-400">₪{totals.totalDue.toLocaleString()}</div>
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

                  return (
                    <tr key={row.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-all">
                      {/* Name */}
                      <td className="p-4">
                        <div className="font-medium text-white">{row.full_name}</div>
                        {row.payment_method === 'card_ticket' && (
                          <div className="text-xs text-zinc-500 mt-1">
                            כרטיסיה #{row.card_sessions_total}
                          </div>
                        )}
                      </td>

                      {/* Payment Method */}
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
                            <option value="monthly_count">כמות חודשית</option>
                            <option value="card_ticket">כרטיסיה</option>
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
                        {row.payment_method === 'card_ticket' ? (
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
