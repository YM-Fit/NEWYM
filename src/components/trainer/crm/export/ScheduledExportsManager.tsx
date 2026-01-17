/**
 * Scheduled Exports Manager Component
 * ניהול ייצואים מתוזמנים
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Trash2, 
  Play, 
  Pause,
  Plus,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { DataExportService } from '../../../../services/dataExportService';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';

interface ScheduledExport {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  format: 'csv' | 'json' | 'excel';
  data_type: 'clients' | 'interactions' | 'reports' | 'all';
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  schedule_config?: {
    time?: string;
    day_of_week?: number;
    day_of_month?: number;
    [key: string]: any;
  };
  last_run_at?: string;
  last_run_status?: 'success' | 'failed' | 'pending';
  next_run_at?: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  created_at: string;
}

export default function ScheduledExportsManager() {
  const { user } = useAuth();
  const [exports, setExports] = useState<ScheduledExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadScheduledExports = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await DataExportService.getScheduledExports(user.id);
      
      if (result.success && result.data) {
        setExports(result.data);
      } else if (result.error) {
        logger.error('Error loading scheduled exports', result.error, 'ScheduledExportsManager');
        toast.error(result.error);
      }
    } catch (error) {
      logger.error('Error loading scheduled exports', error, 'ScheduledExportsManager');
      toast.error('שגיאה בטעינת ייצואים מתוזמנים');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadScheduledExports();
  }, [loadScheduledExports]);

  const handleToggle = async (exportId: string, currentEnabled: boolean) => {
    try {
      const result = await DataExportService.toggleScheduledExport(exportId, !currentEnabled);
      
      if (result.success) {
        toast.success(currentEnabled ? 'ייצוא הושבת' : 'ייצוא הופעל');
        loadScheduledExports();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      logger.error('Error toggling scheduled export', error, 'ScheduledExportsManager');
      toast.error('שגיאה בעדכון סטטוס ייצוא');
    }
  };

  const handleDelete = async (exportId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הייצוא המתוזמן הזה?')) {
      return;
    }

    try {
      const result = await DataExportService.deleteScheduledExport(exportId);
      
      if (result.success) {
        toast.success('ייצוא מתוזמן נמחק');
        loadScheduledExports();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      logger.error('Error deleting scheduled export', error, 'ScheduledExportsManager');
      toast.error('שגיאה במחיקת ייצוא מתוזמן');
    }
  };

  const formatSchedule = (exportItem: ScheduledExport) => {
    const time = exportItem.schedule_config?.time || '02:00';
    
    switch (exportItem.schedule_type) {
      case 'daily':
        return `יומי ב-${time}`;
      case 'weekly':
        const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        const day = exportItem.schedule_config?.day_of_week || 0;
        return `שבועי ביום ${days[day]} ב-${time}`;
      case 'monthly':
        const dayOfMonth = exportItem.schedule_config?.day_of_month || 1;
        return `חודשי ביום ${dayOfMonth} ב-${time}`;
      default:
        return 'מותאם אישית';
    }
  };

  const formatNextRun = (nextRunAt?: string) => {
    if (!nextRunAt) return 'לא מתוזמן';
    const date = new Date(nextRunAt);
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="premium-card p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto"></div>
        <p className="mt-4 text-zinc-400">טוען ייצואים מתוזמנים...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-emerald-400" />
            ייצואים מתוזמנים
          </h2>
          <p className="text-zinc-400 mt-1">נהל ייצואים אוטומטיים של נתוני CRM</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          ייצוא מתוזמן חדש
        </button>
      </div>

      {/* Exports List */}
      {exports.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <Calendar className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">אין ייצואים מתוזמנים</h3>
          <p className="text-zinc-400 mb-6">צור ייצוא מתוזמן חדש כדי להתחיל</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            צור ייצוא מתוזמן
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {exports.map((exportItem) => (
            <div key={exportItem.id} className="premium-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{exportItem.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      exportItem.enabled 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-zinc-500/20 text-zinc-400'
                    }`}>
                      {exportItem.enabled ? 'פעיל' : 'מושבת'}
                    </span>
                    {exportItem.last_run_status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    )}
                    {exportItem.last_run_status === 'failed' && (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  
                  {exportItem.description && (
                    <p className="text-zinc-400 text-sm mb-4">{exportItem.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-zinc-500 mb-1">פורמט</div>
                      <div className="text-white font-medium uppercase">{exportItem.format}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 mb-1">סוג נתונים</div>
                      <div className="text-white font-medium">
                        {exportItem.data_type === 'all' ? 'הכל' : 
                         exportItem.data_type === 'clients' ? 'לקוחות' :
                         exportItem.data_type === 'interactions' ? 'אינטראקציות' : 'דוחות'}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500 mb-1">תזמון</div>
                      <div className="text-white font-medium">{formatSchedule(exportItem)}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 mb-1">הרצה הבאה</div>
                      <div className="text-white font-medium">{formatNextRun(exportItem.next_run_at)}</div>
                    </div>
                  </div>

                  {exportItem.last_run_at && (
                    <div className="mt-4 pt-4 border-t border-zinc-700">
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-zinc-500">הרצה אחרונה: </span>
                          <span className="text-white">
                            {new Date(exportItem.last_run_at).toLocaleString('he-IL')}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500">סה"כ הרצות: </span>
                          <span className="text-white">{exportItem.total_runs}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">הצלחות: </span>
                          <span className="text-green-400">{exportItem.successful_runs}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">כישלונות: </span>
                          <span className="text-red-400">{exportItem.failed_runs}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggle(exportItem.id, exportItem.enabled)}
                    className={`p-2 rounded-lg transition-colors ${
                      exportItem.enabled
                        ? 'text-yellow-400 hover:bg-yellow-400/20'
                        : 'text-emerald-400 hover:bg-emerald-400/20'
                    }`}
                    title={exportItem.enabled ? 'השבת' : 'הפעל'}
                  >
                    {exportItem.enabled ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(exportItem.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-400/20 transition-colors"
                    title="מחק"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal - TODO: Implement full create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="premium-card p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">יצירת ייצוא מתוזמן חדש</h3>
            <p className="text-zinc-400 mb-6">
              פונקציונליות זו תושלם בקרוב. בינתיים, ניתן ליצור ייצוא מתוזמן דרך ה-API.
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
