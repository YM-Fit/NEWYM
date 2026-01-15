/**
 * CRM Reports View Component
 * תצוגת דוחות ואנליטיקה CRM
 */

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, AlertCircle, DollarSign } from 'lucide-react';
import { CrmReportsService } from '../../../services/crmReportsService';
import { useAuth } from '../../../contexts/AuthContext';
import { logger } from '../../../utils/logger';
import toast from 'react-hot-toast';
import type { 
  ClientPipelineStats, 
  RevenueStats, 
  ActivityStats,
  ClientReport 
} from '../../../services/crmReportsService';

export default function CrmReportsView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pipelineStats, setPipelineStats] = useState<ClientPipelineStats | null>(null);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [clientsNeedingFollowUp, setClientsNeedingFollowUp] = useState<ClientReport[]>([]);

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [pipelineResult, revenueResult, activityResult, followUpResult] = await Promise.all([
        CrmReportsService.getPipelineStats(user.id),
        CrmReportsService.getRevenueStats(user.id),
        CrmReportsService.getActivityStats(user.id),
        CrmReportsService.getClientsNeedingFollowUp(user.id),
      ]);

      if (pipelineResult.success && pipelineResult.data) {
        setPipelineStats(pipelineResult.data);
      } else if (pipelineResult.error) {
        logger.error('Error loading pipeline stats', pipelineResult.error, 'CrmReportsView');
        toast.error(pipelineResult.error);
      }

      if (revenueResult.success && revenueResult.data) {
        setRevenueStats(revenueResult.data);
      } else if (revenueResult.error) {
        logger.error('Error loading revenue stats', revenueResult.error, 'CrmReportsView');
        toast.error(revenueResult.error);
      }

      if (activityResult.success && activityResult.data) {
        setActivityStats(activityResult.data);
      } else if (activityResult.error) {
        logger.error('Error loading activity stats', activityResult.error, 'CrmReportsView');
        toast.error(activityResult.error);
      }

      if (followUpResult.success && followUpResult.data) {
        setClientsNeedingFollowUp(followUpResult.data);
      } else if (followUpResult.error) {
        logger.error('Error loading follow-up clients', followUpResult.error, 'CrmReportsView');
        toast.error(followUpResult.error);
      }
    } catch (error) {
      logger.error('Error loading reports', error, 'CrmReportsView');
      toast.error('שגיאה בטעינת דוחות');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="premium-card p-6">
        <div className="flex items-center justify-center py-12">
          <BarChart3 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="premium-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <BarChart3 className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">דוחות CRM</h1>
            <p className="text-sm text-zinc-400">אנליטיקה ומעקב לקוחות</p>
          </div>
        </div>
      </div>

      {/* Pipeline Stats */}
      {pipelineStats && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" />
            Pipeline Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">לידים</div>
              <div className="text-2xl font-bold text-blue-400">{pipelineStats.leads}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">מוסמכים</div>
              <div className="text-2xl font-bold text-purple-400">{pipelineStats.qualified}</div>
            </div>
            <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
              <div className="text-sm text-zinc-400 mb-1">פעילים</div>
              <div className="text-2xl font-bold text-emerald-400">{pipelineStats.active}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">לא פעילים</div>
              <div className="text-2xl font-bold text-yellow-400">{pipelineStats.inactive}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">נטשו</div>
              <div className="text-2xl font-bold text-red-400">{pipelineStats.churned}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">סה"כ</div>
              <div className="text-2xl font-bold text-white">{pipelineStats.total}</div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Stats */}
      {revenueStats && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            Revenue Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
              <div className="text-sm text-zinc-400 mb-1">סה"כ הכנסות</div>
              <div className="text-2xl font-bold text-emerald-400">
                ₪{revenueStats.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <div className="text-sm text-zinc-400 mb-1">הכנסות חודשיות</div>
              <div className="text-2xl font-bold text-blue-400">
                ₪{revenueStats.monthlyRevenue.toLocaleString()}
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">ערך חוזה ממוצע</div>
              <div className="text-2xl font-bold text-white">
                ₪{Math.round(revenueStats.averageContractValue).toLocaleString()}
              </div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
              <div className="text-sm text-zinc-400 mb-1">שולמו</div>
              <div className="text-2xl font-bold text-green-400">{revenueStats.paidContracts}</div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
              <div className="text-sm text-zinc-400 mb-1">ממתינים</div>
              <div className="text-2xl font-bold text-yellow-400">{revenueStats.pendingPayments}</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
              <div className="text-sm text-zinc-400 mb-1">מעוכבים</div>
              <div className="text-2xl font-bold text-red-400">{revenueStats.overduePayments}</div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Stats */}
      {activityStats && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Activity Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">סה"כ לקוחות</div>
              <div className="text-2xl font-bold text-white">{activityStats.totalClients}</div>
            </div>
            <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
              <div className="text-sm text-zinc-400 mb-1">לקוחות פעילים</div>
              <div className="text-2xl font-bold text-emerald-400">{activityStats.activeClients}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">לקוחות לא פעילים</div>
              <div className="text-2xl font-bold text-yellow-400">{activityStats.inactiveClients}</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
              <div className="text-sm text-zinc-400 mb-1">זקוקים למעקב</div>
              <div className="text-2xl font-bold text-red-400">
                {activityStats.clientsNeedingFollowUp}
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">אירועים ממוצעים</div>
              <div className="text-2xl font-bold text-white">
                {activityStats.averageEventsPerClient.toFixed(1)}
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">תדירות אימונים</div>
              <div className="text-2xl font-bold text-white">
                {activityStats.averageWorkoutFrequency.toFixed(1)}/שבוע
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clients Needing Follow-Up */}
      {clientsNeedingFollowUp.length > 0 && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            לקוחות הזקוקים למעקב ({clientsNeedingFollowUp.length})
          </h2>
          <div className="space-y-3">
            {clientsNeedingFollowUp.slice(0, 10).map((report) => (
              <div
                key={report.client.id}
                className={`p-4 rounded-lg border ${
                  report.isOverdue
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-yellow-500/10 border-yellow-500/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{report.client.client_name}</h3>
                    <p className="text-sm text-zinc-400">
                      {report.daysSinceLastContact === Infinity
                        ? 'לא היה קשר'
                        : `${report.daysSinceLastContact} ימים מאז הקשר האחרון`}
                    </p>
                  </div>
                  <div className="text-right">
                    {report.isOverdue && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">
                        מעוכב
                      </span>
                    )}
                    {report.needsFollowUp && !report.isOverdue && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-semibold">
                        נדרש מעקב
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {clientsNeedingFollowUp.length > 10 && (
              <p className="text-sm text-zinc-400 text-center pt-2">
                ועוד {clientsNeedingFollowUp.length - 10} לקוחות...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
