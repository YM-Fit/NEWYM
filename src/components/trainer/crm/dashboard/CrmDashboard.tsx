/**
 * CRM Dashboard Component
 * Dashboard מרכזי ל-CRM
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  Calendar,
  MessageSquare,
  FileText,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { CrmReportsService } from '../../../../services/crmReportsService';
import { PaymentService } from '../../../../services/paymentService';
import { CrmAutomationService } from '../../../../services/crmAutomationService';
import { CrmPipelineService } from '../../../../services/crmPipelineService';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';
import type { ClientPipelineStats, RevenueStats, ActivityStats } from '../../../../services/crmReportsService';

interface CrmDashboardProps {
  onViewChange?: (view: string) => void;
}

export default function CrmDashboard({ onViewChange }: CrmDashboardProps) {
  const { user } = useAuth();
  const [pipelineStats, setPipelineStats] = useState<ClientPipelineStats | null>(null);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [pipelineResult, revenueResult, activityResult, tasksResult] = await Promise.all([
        CrmReportsService.getPipelineStats(user.id),
        PaymentService.getPaymentStats(user.id),
        CrmReportsService.getActivityStats(user.id),
        CrmAutomationService.getPendingTasks(user.id),
      ]);

      if (pipelineResult.success && pipelineResult.data) {
        setPipelineStats(pipelineResult.data);
      }

      if (revenueResult.success && revenueResult.data) {
        setRevenueStats(revenueResult.data);
      }

      if (activityResult.success && activityResult.data) {
        setActivityStats(activityResult.data);
      }

      if (tasksResult.success && tasksResult.data) {
        setPendingTasks(tasksResult.data);
      }
    } catch (error) {
      logger.error('Error loading CRM dashboard', error, 'CrmDashboard');
      toast.error('שגיאה בטעינת Dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  if (loading) {
    return (
      <div className="premium-card p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="premium-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg" aria-hidden="true">
              <BarChart3 className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CRM Dashboard</h1>
              <p className="text-sm text-zinc-400">סקירה כללית של מערכת ה-CRM</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            aria-label="רענן"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-label="סטטיסטיקות מהירות">
          {pipelineStats && (
            <>
              <article className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20" role="status" aria-label={`סה"כ לקוחות: ${pipelineStats.total}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  <div className="text-sm text-zinc-400">סה"כ לקוחות</div>
                </div>
                <div className="text-2xl font-bold text-blue-400">{pipelineStats.total}</div>
              </article>
              <article className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20" role="status" aria-label={`לקוחות פעילים: ${pipelineStats.active}`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  <div className="text-sm text-zinc-400">לקוחות פעילים</div>
                </div>
                <div className="text-2xl font-bold text-emerald-400">{pipelineStats.active}</div>
              </article>
            </>
          )}
          {revenueStats && (
            <>
              <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-purple-400" />
                  <div className="text-sm text-zinc-400">הכנסות חודשיות</div>
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  ₪{revenueStats.monthlyRevenue.toLocaleString()}
                </div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <div className="text-sm text-zinc-400">משימות ממתינות</div>
                </div>
                <div className="text-2xl font-bold text-yellow-400">{pendingTasks.length}</div>
              </div>
            </>
          )}
        </section>
      </header>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => onViewChange?.('crm-pipeline')}
          className="premium-card p-6 text-left hover:scale-[1.02] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white">Pipeline</h3>
          </div>
          <p className="text-sm text-zinc-400">ניהול Pipeline לקוחות</p>
        </button>

        <button
          onClick={() => onViewChange?.('crm-clients')}
          className="premium-card p-6 text-left hover:scale-[1.02] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white">לקוחות</h3>
          </div>
          <p className="text-sm text-zinc-400">ניהול לקוחות</p>
        </button>

        <button
          onClick={() => onViewChange?.('crm-reports')}
          className="premium-card p-6 text-left hover:scale-[1.02] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white">דוחות</h3>
          </div>
          <p className="text-sm text-zinc-400">דוחות ותשלומים</p>
        </button>

        <button
          onClick={() => onViewChange?.('crm-analytics')}
          className="premium-card p-6 text-left hover:scale-[1.02] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-yellow-400" />
            </div>
            <h3 className="font-semibold text-white">אנליטיקה</h3>
          </div>
          <p className="text-sm text-zinc-400">תובנות עסקיות</p>
        </button>
      </div>

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            משימות ממתינות ({pendingTasks.length})
          </h2>
          <div className="space-y-2">
            {pendingTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="premium-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{task.task_type}</h3>
                    <p className="text-sm text-zinc-400">
                      תאריך: {new Date(task.due_date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Overview */}
      {revenueStats && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            סקירת הכנסות
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-zinc-400 mb-1">סה"כ הכנסות</div>
              <div className="text-xl font-bold text-white">
                ₪{revenueStats.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-zinc-400 mb-1">הכנסות חודשיות</div>
              <div className="text-xl font-bold text-emerald-400">
                ₪{revenueStats.monthlyRevenue.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-zinc-400 mb-1">ממתינים</div>
              <div className="text-xl font-bold text-yellow-400">{revenueStats.pendingPayments}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-400 mb-1">מעוכבים</div>
              <div className="text-xl font-bold text-red-400">{revenueStats.overduePayments}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
