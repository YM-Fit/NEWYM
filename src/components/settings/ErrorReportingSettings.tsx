/**
 * Error Reporting Settings Component
 * הגדרות דיווח שגיאות
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { errorTracking, ErrorSeverity } from '../../utils/errorTracking';
import { logger } from '../../utils/logger';

export default function ErrorReportingSettings() {
  const [stats, setStats] = useState<{
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    recent: number;
  } | null>(null);
  const [recentErrors, setRecentErrors] = useState<any[]>([]);

  useEffect(() => {
    loadErrorStats();
  }, []);

  const loadErrorStats = () => {
    const errorStats = errorTracking.getStatistics();
    const recent = errorTracking.getRecentErrors(10);
    
    setStats(errorStats);
    setRecentErrors(recent);
  };

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'text-yellow-400';
      case ErrorSeverity.MEDIUM:
        return 'text-orange-400';
      case ErrorSeverity.HIGH:
        return 'text-red-400';
      case ErrorSeverity.CRITICAL:
        return 'text-red-600';
      default:
        return 'text-zinc-400';
    }
  };

  const getSeverityLabel = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'נמוך';
      case ErrorSeverity.MEDIUM:
        return 'בינוני';
      case ErrorSeverity.HIGH:
        return 'גבוה';
      case ErrorSeverity.CRITICAL:
        return 'קריטי';
      default:
        return severity;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-emerald-400" />
          דיווח שגיאות
        </h2>
        <p className="text-zinc-400 mt-1">
          סטטיסטיקות שגיאות וניטור ביצועים
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="premium-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">סטטיסטיקות שגיאות</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-zinc-800 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-zinc-400 text-sm">סה"כ שגיאות</div>
            </div>
            <div className="text-center p-4 bg-yellow-500/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">{stats.bySeverity[ErrorSeverity.LOW]}</div>
              <div className="text-zinc-400 text-sm">נמוך</div>
            </div>
            <div className="text-center p-4 bg-orange-500/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-400">{stats.bySeverity[ErrorSeverity.MEDIUM]}</div>
              <div className="text-zinc-400 text-sm">בינוני</div>
            </div>
            <div className="text-center p-4 bg-red-500/20 rounded-lg">
              <div className="text-2xl font-bold text-red-400">
                {stats.bySeverity[ErrorSeverity.HIGH] + stats.bySeverity[ErrorSeverity.CRITICAL]}
              </div>
              <div className="text-zinc-400 text-sm">גבוה/קריטי</div>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">שגיאות אחרונות (שעה)</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{stats.recent}</div>
          </div>
        </div>
      )}

      {/* Recent Errors */}
      {recentErrors.length > 0 && (
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">שגיאות אחרונות</h3>
            <button
              onClick={() => {
                errorTracking.clear();
                loadErrorStats();
              }}
              className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors text-sm"
            >
              נקה הכל
            </button>
          </div>

          <div className="space-y-3">
            {recentErrors.map((errorEntry, index) => (
              <div
                key={index}
                className="p-4 bg-zinc-800 rounded-lg border border-zinc-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${getSeverityColor(errorEntry.severity)}`}>
                        {getSeverityLabel(errorEntry.severity)}
                      </span>
                      <span className="text-zinc-500 text-sm">
                        {errorEntry.timestamp.toLocaleString('he-IL')}
                      </span>
                    </div>
                    <div className="text-white font-mono text-sm break-all">
                      {errorEntry.error.message}
                    </div>
                    {errorEntry.context.component && (
                      <div className="text-zinc-400 text-xs mt-1">
                        רכיב: {errorEntry.context.component}
                        {errorEntry.context.action && ` | פעולה: ${errorEntry.context.action}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentErrors.length === 0 && (
        <div className="premium-card p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">אין שגיאות</h3>
          <p className="text-zinc-400">המערכת פועלת ללא שגיאות</p>
        </div>
      )}

      {/* Info */}
      <div className="premium-card p-6 bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-zinc-300">
            <p className="font-medium text-white mb-2">אודות דיווח שגיאות</p>
            <p className="mb-2">
              המערכת משתמשת ב-Sentry לניטור שגיאות. כל שגיאה נשלחת אוטומטית לשרתי Sentry
              לניתוח וטיפול.
            </p>
            <p>
              שגיאות נשמרות גם מקומית למשך 100 שגיאות אחרונות לצורך ניתוח מקומי.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
