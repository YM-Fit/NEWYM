/**
 * Advanced Analytics Component
 * אנליטיקה מתקדמת עם CLV, Churn, ו-Forecasts
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertTriangle,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  AdvancedAnalyticsService,
  type ClientLifetimeValue,
  type ChurnAnalysis,
  type ConversionFunnel,
  type RevenueForecast
} from '../../../services/advancedAnalyticsService';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';

export default function AdvancedAnalytics() {
  const { user } = useAuth();
  const [clvData, setClvData] = useState<ClientLifetimeValue[]>([]);
  const [churnAnalysis, setChurnAnalysis] = useState<ChurnAnalysis | null>(null);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel[]>([]);
  const [revenueForecast, setRevenueForecast] = useState<RevenueForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clv' | 'churn' | 'funnel' | 'forecast'>('clv');

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [clvResult, churnResult, funnelResult, forecastResult] = await Promise.all([
        AdvancedAnalyticsService.calculateCLV(user.id),
        AdvancedAnalyticsService.analyzeChurn(user.id),
        AdvancedAnalyticsService.getConversionFunnel(user.id),
        AdvancedAnalyticsService.generateRevenueForecast(user.id, 6),
      ]);

      if (clvResult.success && clvResult.data) {
        setClvData(clvResult.data);
      } else if (clvResult.error) {
        logger.error('Error loading CLV', clvResult.error, 'AdvancedAnalytics');
        toast.error(clvResult.error);
      }

      if (churnResult.success && churnResult.data) {
        setChurnAnalysis(churnResult.data);
      }

      if (funnelResult.success && funnelResult.data) {
        setConversionFunnel(funnelResult.data);
      }

      if (forecastResult.success && forecastResult.data) {
        setRevenueForecast(forecastResult.data);
      }
    } catch (error) {
      logger.error('Error loading analytics', error, 'AdvancedAnalytics');
      toast.error('שגיאה בטעינת אנליטיקה');
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
      <div className="premium-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <BarChart3 className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">אנליטיקה מתקדמת</h1>
              <p className="text-sm text-zinc-400">תובנות עסקיות מעמיקות</p>
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

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-800">
          {[
            { id: 'clv' as const, label: 'CLV', icon: DollarSign },
            { id: 'churn' as const, label: 'Churn', icon: AlertTriangle },
            { id: 'funnel' as const, label: 'Conversion', icon: TrendingUp },
            { id: 'forecast' as const, label: 'תחזית', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'border-b-2 border-emerald-500 text-emerald-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CLV Tab */}
      {activeTab === 'clv' && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            Client Lifetime Value
          </h2>
          <div className="space-y-3">
            {clvData.slice(0, 10).map((client) => (
              <div key={client.traineeId} className="premium-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{client.traineeName}</h3>
                    <div className="text-sm text-zinc-400 mt-1">
                      פעיל {client.monthsActive} חודשים
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">
                      ₪{Math.round(client.clv).toLocaleString()}
                    </div>
                    <div className="text-xs text-zinc-500">CLV</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-zinc-400">סה"כ הכנסות</div>
                    <div className="text-white font-semibold">
                      ₪{Math.round(client.totalRevenue).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400">ממוצע חודשי</div>
                    <div className="text-white font-semibold">
                      ₪{Math.round(client.averageMonthlyRevenue).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400">תחזית CLV</div>
                    <div className="text-purple-400 font-semibold">
                      ₪{Math.round(client.predictedClv).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {clvData.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                אין נתונים זמינים
              </div>
            )}
          </div>
        </div>
      )}

      {/* Churn Tab */}
      {activeTab === 'churn' && churnAnalysis && (
        <div className="space-y-6">
          <div className="premium-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Churn Analysis
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                <div className="text-sm text-zinc-400 mb-1">Churn Rate</div>
                <div className="text-2xl font-bold text-red-400">
                  {churnAnalysis.churnRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
                <div className="text-sm text-zinc-400 mb-1">Retention Rate</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {churnAnalysis.retentionRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <div className="text-sm text-zinc-400 mb-1">נטשו</div>
                <div className="text-2xl font-bold text-white">
                  {churnAnalysis.churnedClients}
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <div className="text-sm text-zinc-400 mb-1">ממוצע חיים</div>
                <div className="text-2xl font-bold text-white">
                  {churnAnalysis.averageLifetime.toFixed(1)} חודשים
                </div>
              </div>
            </div>
          </div>

          <div className="premium-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">סיבות נטישה</h3>
            <div className="space-y-2">
              {Object.entries(churnAnalysis.churnReasons).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between">
                  <span className="text-zinc-300">{reason}</span>
                  <span className="text-white font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conversion Funnel Tab */}
      {activeTab === 'funnel' && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Conversion Funnel
          </h2>
          <div className="space-y-4">
            {conversionFunnel.map((stage, index) => (
              <div key={stage.stage} className="premium-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white capitalize">{stage.stage}</h3>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">{stage.count}</div>
                    <div className="text-xs text-zinc-400">{stage.percentage.toFixed(1)}%</div>
                  </div>
                </div>
                {index > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-zinc-400 mb-1">Drop-off Rate</div>
                    <div className="text-sm text-red-400">{stage.dropOffRate.toFixed(1)}%</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Forecast Tab */}
      {activeTab === 'forecast' && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            Revenue Forecast
          </h2>
          <div className="space-y-3">
            {revenueForecast.map((forecast) => (
              <div key={forecast.month} className="premium-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{forecast.month}</h3>
                    <div className="text-xs text-zinc-400 mt-1">
                      Confidence: {forecast.confidence.toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">
                      ₪{forecast.predicted.toLocaleString()}
                    </div>
                    {forecast.actual && (
                      <div className="text-xs text-zinc-400">
                        Actual: ₪{forecast.actual.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
