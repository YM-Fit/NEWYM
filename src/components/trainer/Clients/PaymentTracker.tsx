/**
 * Payment Tracker Component
 * מעקב תשלומים
 */

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Plus, CheckCircle2, Clock, AlertCircle, Download } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { PaymentService, type Payment } from '../../../services/paymentService';
import { getTrainees } from '../../../api/traineeApi';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import { Modal } from '../../ui/Modal';
import { PAYMENT_STATUS, PAYMENT_STATUS_LABELS } from '../../../constants/crmConstants';

interface PaymentTrackerProps {
  traineeId?: string;
  onClose?: () => void;
}

export default function PaymentTracker({ traineeId, onClose }: PaymentTrackerProps) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [paymentsResult, traineesResult, statsResult] = await Promise.all([
        PaymentService.getPayments(user.id, traineeId ? { traineeId } : undefined),
        getTrainees(user.id),
        PaymentService.getPaymentStats(user.id),
      ]);

      if (paymentsResult.success && paymentsResult.data) {
        setPayments(paymentsResult.data);
      }

      if (traineesResult.success && traineesResult.data) {
        setTrainees(traineesResult.data);
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      logger.error('Error loading payments', error, 'PaymentTracker');
      toast.error('שגיאה בטעינת תשלומים');
    } finally {
      setLoading(false);
    }
  }, [user, traineeId]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const result = await PaymentService.markPaymentAsPaid(paymentId, 'cash');
      if (result.success) {
        toast.success('תשלום סומן כמשולם');
        await loadData();
      } else {
        toast.error(result.error || 'שגיאה בעדכון תשלום');
      }
    } catch (error) {
      logger.error('Error marking payment as paid', error, 'PaymentTracker');
      toast.error('שגיאה בעדכון תשלום');
    }
  };

  const handleGenerateInvoice = async (payment: Payment) => {
    try {
      const result = await PaymentService.generateInvoicePDF(payment);
      if (result.success && result.data) {
        // Create download link
        const url = URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${payment.invoice_number || payment.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('חשבונית הורדה');
      } else {
        toast.error(result.error || 'שגיאה ביצירת חשבונית');
      }
    } catch (error) {
      logger.error('Error generating invoice', error, 'PaymentTracker');
      toast.error('שגיאה ביצירת חשבונית');
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true;
    return payment.status === filter;
  });

  if (loading) {
    return (
      <div className="premium-card p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="premium-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">מעקב תשלומים</h1>
              <p className="text-sm text-zinc-400">ניהול ותשלומים</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingPayment(null);
                setShowEditor(true);
              }}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              תשלום חדש
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-all"
              >
                סגור
              </button>
            )}
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
              <div className="text-sm text-zinc-400 mb-1">סה"כ הכנסות</div>
              <div className="text-2xl font-bold text-emerald-400">
                ₪{stats.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <div className="text-sm text-zinc-400 mb-1">הכנסות חודשיות</div>
              <div className="text-2xl font-bold text-blue-400">
                ₪{stats.monthlyRevenue.toLocaleString()}
              </div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
              <div className="text-sm text-zinc-400 mb-1">ממתינים</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.pendingPayments}</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
              <div className="text-sm text-zinc-400 mb-1">מעוכבים</div>
              <div className="text-2xl font-bold text-red-400">{stats.overduePayments}</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
              <div className="text-sm text-zinc-400 mb-1">שולמו</div>
              <div className="text-2xl font-bold text-green-400">{stats.paidPayments}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(['all', 'pending', 'paid', 'overdue'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === status
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
              }`}
            >
              {status === 'all' ? 'הכל' : PAYMENT_STATUS_LABELS[status as keyof typeof PAYMENT_STATUS_LABELS]}
            </button>
          ))}
        </div>

        {/* Payments List */}
        <div className="space-y-3">
          {filteredPayments.map((payment) => {
            const trainee = trainees.find(t => t.id === payment.trainee_id);
            const isOverdue = payment.status === 'overdue' || 
              (payment.status === 'pending' && new Date(payment.due_date) < new Date());

            return (
              <div
                key={payment.id}
                className={`premium-card p-4 ${
                  isOverdue ? 'border-l-4 border-red-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white">
                        {trainee ? trainee.full_name : 'מתאמן לא נמצא'}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs ${
                        payment.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                        payment.status === 'overdue' || isOverdue ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {PAYMENT_STATUS_LABELS[payment.status as keyof typeof PAYMENT_STATUS_LABELS]}
                      </span>
                      {payment.invoice_number && (
                        <span className="text-xs text-zinc-500">#{payment.invoice_number}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-zinc-400 mb-1">סכום</div>
                        <div className="text-emerald-400 font-semibold">
                          ₪{Number(payment.amount).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-400 mb-1">תאריך תשלום</div>
                        <div className="text-white">
                          {new Date(payment.due_date).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                      {payment.paid_date && (
                        <div>
                          <div className="text-zinc-400 mb-1">שולם ב</div>
                          <div className="text-white">
                            {new Date(payment.paid_date).toLocaleDateString('he-IL')}
                          </div>
                        </div>
                      )}
                      {payment.payment_method && (
                        <div>
                          <div className="text-zinc-400 mb-1">אמצעי תשלום</div>
                          <div className="text-white">{payment.payment_method}</div>
                        </div>
                      )}
                    </div>
                    {payment.notes && (
                      <div className="mt-2 text-sm text-zinc-400">
                        {payment.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {payment.status !== 'paid' && (
                      <button
                        onClick={() => handleMarkAsPaid(payment.id)}
                        className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                        aria-label="סמן כמשולם"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    {payment.invoice_number && (
                      <button
                        onClick={() => handleGenerateInvoice(payment)}
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        aria-label="הורד חשבונית"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredPayments.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              אין תשלומים. צור תשלום חדש כדי להתחיל.
            </div>
          )}
        </div>
      </div>

      {/* Payment Editor Modal */}
      {showEditor && (
        <PaymentEditor
          payment={editingPayment}
          traineeId={traineeId}
          trainees={trainees}
          onClose={() => {
            setShowEditor(false);
            setEditingPayment(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Payment Editor Component
function PaymentEditor({
  payment,
  traineeId,
  trainees,
  onClose,
}: {
  payment: Payment | null;
  traineeId?: string;
  trainees: any[];
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [selectedTraineeId, setSelectedTraineeId] = useState(traineeId || payment?.trainee_id || '');
  const [amount, setAmount] = useState(payment?.amount?.toString() || '');
  const [dueDate, setDueDate] = useState(
    payment?.due_date ? new Date(payment.due_date).toISOString().split('T')[0] : ''
  );
  const [notes, setNotes] = useState(payment?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !selectedTraineeId || !amount || !dueDate) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    try {
      setSaving(true);

      if (payment) {
        const result = await PaymentService.updatePayment(payment.id, {
          amount: Number(amount),
          due_date: dueDate,
          notes,
        });

        if (result.success) {
          toast.success('תשלום עודכן בהצלחה');
          onClose();
        } else {
          toast.error(result.error || 'שגיאה בעדכון תשלום');
        }
      } else {
        const result = await PaymentService.createPayment({
          trainee_id: selectedTraineeId,
          trainer_id: user.id,
          amount: Number(amount),
          due_date: dueDate,
          notes,
          status: 'pending',
        });

        if (result.success) {
          toast.success('תשלום נוצר בהצלחה');
          onClose();
        } else {
          toast.error(result.error || 'שגיאה ביצירת תשלום');
        }
      }
    } catch (error) {
      logger.error('Error saving payment', error, 'PaymentEditor');
      toast.error('שגיאה בשמירת תשלום');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={payment ? 'ערוך תשלום' : 'תשלום חדש'}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">מתאמן</label>
          <select
            value={selectedTraineeId}
            onChange={(e) => setSelectedTraineeId(e.target.value)}
            disabled={!!traineeId}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">בחר מתאמן</option>
            {trainees.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">סכום (₪)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">תאריך תשלום</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">הערות (אופציונלי)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="הערות..."
          />
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-all"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all disabled:opacity-50"
          >
            {saving ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
