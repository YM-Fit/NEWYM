/**
 * Health Check View Component
 * תצוגת בדיקת בריאות המערכת
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  Database,
  Server,
  HardDrive,
  Globe
} from 'lucide-react';
import { HealthCheckService, type HealthCheckResult } from '../../services/healthCheckService';
import toast from 'react-hot-toast';
import { logger } from '../../utils/logger';

export default function HealthCheckView() {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);
      const result = await HealthCheckService.checkHealth();
      
      if (result.success && result.data) {
        setHealth(result.data);
        setMetrics(HealthCheckService.getMetrics());
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      logger.error('Error checking health', error, 'HealthCheckView');
      toast.error('שגיאה בבדיקת בריאות המערכת');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Activity className="h-5 w-5 text-muted" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/20 border-green-500/30 text-green-400';
      case 'degraded':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
      case 'unhealthy':
        return 'bg-red-500/20 border-red-500/30 text-red-400';
      default:
        return 'bg-surface/20 border-border text-muted';
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ימים, ${hours % 24} שעות`;
    if (hours > 0) return `${hours} שעות, ${minutes % 60} דקות`;
    if (minutes > 0) return `${minutes} דקות, ${seconds % 60} שניות`;
    return `${seconds} שניות`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-400" />
            בדיקת בריאות המערכת
          </h2>
          <p className="text-muted mt-1">מצב המערכת ושירותיה</p>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 text-foreground rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          רענן
        </button>
      </div>

      {loading && !health && (
        <div className="premium-card p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto"></div>
          <p className="mt-4 text-muted">בודק בריאות המערכת...</p>
        </div>
      )}

      {health && (
        <>
          {/* Overall Status */}
          <div className={`premium-card p-6 border-2 ${getStatusColor(health.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(health.status)}
                <div>
                  <h3 className="text-xl font-bold">מצב כללי: {health.status === 'healthy' ? 'בריא' : health.status === 'degraded' ? 'מוחלש' : 'לא בריא'}</h3>
                  <p className="text-sm text-muted">
                    נבדק לאחרונה: {new Date(health.timestamp).toLocaleString('he-IL')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Service Checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Database */}
            <div className="premium-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-foreground">מסד הנתונים</h3>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(health.checks.database.status)}
                <span className={`font-medium ${getStatusColor(health.checks.database.status).split(' ')[2]}`}>
                  {health.checks.database.status === 'healthy' ? 'בריא' : health.checks.database.status === 'degraded' ? 'מוחלש' : 'לא בריא'}
                </span>
              </div>
              {health.checks.database.message && (
                <p className="text-sm text-muted mb-2">{health.checks.database.message}</p>
              )}
              {health.checks.database.responseTime && (
                <p className="text-xs text-muted">זמן תגובה: {health.checks.database.responseTime}ms</p>
              )}
              {health.checks.database.error && (
                <p className="text-xs text-red-400 mt-2">{health.checks.database.error}</p>
              )}
            </div>

            {/* Supabase */}
            <div className="premium-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Server className="h-6 w-6 text-purple-400" />
                <h3 className="text-lg font-semibold text-foreground">Supabase</h3>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(health.checks.supabase.status)}
                <span className={`font-medium ${getStatusColor(health.checks.supabase.status).split(' ')[2]}`}>
                  {health.checks.supabase.status === 'healthy' ? 'בריא' : health.checks.supabase.status === 'degraded' ? 'מוחלש' : 'לא בריא'}
                </span>
              </div>
              {health.checks.supabase.message && (
                <p className="text-sm text-muted mb-2">{health.checks.supabase.message}</p>
              )}
              {health.checks.supabase.responseTime && (
                <p className="text-xs text-muted">זמן תגובה: {health.checks.supabase.responseTime}ms</p>
              )}
            </div>

            {/* Cache */}
            {health.checks.cache && (
              <div className="premium-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <HardDrive className="h-6 w-6 text-green-400" />
                  <h3 className="text-lg font-semibold text-foreground">Cache</h3>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(health.checks.cache.status)}
                  <span className={`font-medium ${getStatusColor(health.checks.cache.status).split(' ')[2]}`}>
                    {health.checks.cache.status === 'healthy' ? 'בריא' : health.checks.cache.status === 'degraded' ? 'מוחלש' : 'לא בריא'}
                  </span>
                </div>
                {health.checks.cache.message && (
                  <p className="text-sm text-muted mb-2">{health.checks.cache.message}</p>
                )}
              </div>
            )}

            {/* External Services */}
            {health.checks.externalServices && Object.entries(health.checks.externalServices).map(([name, check]) => (
              <div key={name} className="premium-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="h-6 w-6 text-orange-400" />
                  <h3 className="text-lg font-semibold text-foreground">{name}</h3>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(check.status)}
                  <span className={`font-medium ${getStatusColor(check.status).split(' ')[2]}`}>
                    {check.status === 'healthy' ? 'בריא' : check.status === 'degraded' ? 'מוחלש' : 'לא בריא'}
                  </span>
                </div>
                {check.message && (
                  <p className="text-sm text-muted mb-2">{check.message}</p>
                )}
              </div>
            ))}
          </div>

          {/* Metrics */}
          {health.metrics && (
            <div className="premium-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">מדדים</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-muted text-sm mb-1">זמן תגובה</div>
                  <div className="text-2xl font-bold text-foreground">{health.metrics.responseTime}ms</div>
                </div>
                <div>
                  <div className="text-muted text-sm mb-1">זמן פעולה</div>
                  <div className="text-2xl font-bold text-foreground">{formatUptime(health.metrics.uptime)}</div>
                </div>
                <div>
                  <div className="text-muted text-sm mb-1">שיעור שגיאות</div>
                  <div className="text-2xl font-bold text-foreground">{(health.metrics.errorRate * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Metrics */}
          {metrics && (
            <div className="premium-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">מדדי ביצועים</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-muted text-sm mb-1">זמן פעולה כולל</div>
                  <div className="text-xl font-bold text-foreground">{formatUptime(metrics.uptime)}</div>
                </div>
                {metrics.memoryUsage && (
                  <div>
                    <div className="text-muted text-sm mb-1">שימוש בזיכרון</div>
                    <div className="text-xl font-bold text-foreground">{(metrics.memoryUsage * 100).toFixed(1)}%</div>
                  </div>
                )}
                {metrics.performanceMetrics && (
                  <>
                    {metrics.performanceMetrics.loadTime && (
                      <div>
                        <div className="text-muted text-sm mb-1">זמן טעינה</div>
                        <div className="text-xl font-bold text-foreground">{metrics.performanceMetrics.loadTime}ms</div>
                      </div>
                    )}
                    {metrics.performanceMetrics.renderTime && (
                      <div>
                        <div className="text-muted text-sm mb-1">זמן רינדור</div>
                        <div className="text-xl font-bold text-foreground">{metrics.performanceMetrics.renderTime}ms</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
