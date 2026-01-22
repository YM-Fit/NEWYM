import { useState, useEffect, useRef } from 'react';
import { Calendar, CheckCircle2, XCircle, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getGoogleCalendarStatus, 
  disconnectGoogleCalendar,
  syncGoogleCalendar,
  updateGoogleCalendarSyncSettings,
  getGoogleCalendars,
  type GoogleCalendar
} from '../../../api/googleCalendarApi';
import { logger } from '../../../utils/logger';
import { Select } from '../../ui/Select';
import { Checkbox } from '../../ui/Checkbox';

interface GoogleCalendarSettingsProps {
  onClose?: () => void;
}

export default function GoogleCalendarSettings({ onClose }: GoogleCalendarSettingsProps) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncDirection, setSyncDirection] = useState<'to_google' | 'from_google' | 'bidirectional'>('bidirectional');
  const [syncFrequency, setSyncFrequency] = useState<'realtime' | 'hourly' | 'daily'>('realtime');
  const [defaultCalendarId, setDefaultCalendarId] = useState<string>('primary');
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const loadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const LOAD_DEBOUNCE_MS = 2000; // Don't load more than once every 2 seconds

  useEffect(() => {
    if (!user) return;
    
    loadStatus();
    
    // Check if we just returned from OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_calendar') === 'connected') {
      toast.success('יומן Google Calendar חובר בהצלחה!');
      // Remove query parameter from URL
      window.history.replaceState({}, '', window.location.pathname);
      // Reload status after a short delay to ensure DB is updated
      setTimeout(() => {
        loadStatus();
      }, 1000);
    }
  }, [user]);

  const loadStatus = async () => {
    if (!user) return;

    // Debounce: don't load if already loading or loaded recently
    const now = Date.now();
    if (loadingRef.current || (now - lastLoadTimeRef.current < LOAD_DEBOUNCE_MS)) {
      return;
    }

    try {
      loadingRef.current = true;
      lastLoadTimeRef.current = now;
      setLoading(true);
      
      const result = await getGoogleCalendarStatus(user.id);
      if (result.success && result.data) {
        setConnected(result.data.connected);
        setAutoSyncEnabled(result.data.autoSyncEnabled || false);
        setSyncDirection(result.data.syncDirection || 'bidirectional');
        setSyncFrequency(result.data.syncFrequency || 'realtime');
        setDefaultCalendarId(result.data.defaultCalendarId || 'primary');
        
        // Load calendars list if connected
        if (result.data.connected) {
          await loadCalendars();
        }
      } else if (result.error) {
        // Don't show error for expected errors (missing columns)
        if (!result.error.includes('does not exist') && !result.error.includes('42703')) {
          logger.error('Error loading Google Calendar status', result.error, 'GoogleCalendarSettings');
        }
      }
    } catch (error) {
      logger.error('Error loading Google Calendar status', error, 'GoogleCalendarSettings');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const loadCalendars = async () => {
    if (!user) return;

    try {
      setLoadingCalendars(true);
      const result = await getGoogleCalendars(user.id);
      if (result.success && result.data) {
        setCalendars(result.data);
      } else if (result.error) {
        logger.warn('Error loading calendars list', result.error, 'GoogleCalendarSettings');
      }
    } catch (error) {
      logger.error('Error loading calendars', error, 'GoogleCalendarSettings');
    } finally {
      setLoadingCalendars(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const result = await updateGoogleCalendarSyncSettings(user.id, {
        autoSyncEnabled,
        syncDirection,
        syncFrequency,
        defaultCalendarId,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('הגדרות הסנכרון נשמרו בהצלחה');
    } catch (error) {
      logger.error('Error saving sync settings', error, 'GoogleCalendarSettings');
      toast.error('שגיאה בשמירת הגדרות הסנכרון');
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: { session } } = await (await import('../../../lib/supabase')).supabase.auth.getSession();
      
      if (!session) {
        toast.error('נדרשת התחברות מחדש');
        return;
      }

      // Use popup for OAuth to avoid COEP issues with redirects in StackBlitz
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vqvczpxmvrwfkecpwovc.supabase.co';
      const redirectUrl = `${supabaseUrl}/functions/v1/google-oauth?trainer_id=${user.id}`;
      
      logger.info(`Opening Google OAuth popup: ${redirectUrl}`, 'GoogleCalendarSettings');
      
      // Open popup instead of full redirect to avoid COEP blocking
      const popup = window.open(
        redirectUrl,
        'google-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      
      if (!popup) {
        toast.error('חלון הקופץ נחסם. אפשר חלונות קופצים עבור האתר הזה ונסה שוב.');
        setLoading(false);
        return;
      }
      
      // Check if popup is closed (OAuth completed)
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setLoading(false);
          // Reload status after a delay to ensure DB is updated
          setTimeout(() => {
            loadStatus();
          }, 1000);
        }
      }, 500);
      
      // Also listen for message from popup if it sends one
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== supabaseUrl) return;
        if (event.data === 'google-oauth-completed') {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
          popup.close();
          // Load status and calendars after connection
          setTimeout(() => {
            loadStatus();
          }, 1000);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Cleanup after 5 minutes if popup is still open
      setTimeout(() => {
        if (!popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
        }
      }, 5 * 60 * 1000);
    } catch (error) {
      logger.error('Error initiating Google OAuth', error, 'GoogleCalendarSettings');
      toast.error('שגיאה בחיבור ל-Google Calendar');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;

    if (!confirm('האם אתה בטוח שברצונך לנתק את Google Calendar?')) {
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await (await import('../../../lib/supabase')).supabase.auth.getSession();
      
      if (!session) {
        toast.error('נדרשת התחברות מחדש');
        return;
      }

      const result = await disconnectGoogleCalendar(user.id, session.access_token);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setConnected(false);
      toast.success('Google Calendar נותק בהצלחה');
    } catch (error) {
      logger.error('Error disconnecting Google Calendar', error, 'GoogleCalendarSettings');
      toast.error('שגיאה בניתוק Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;

    try {
      setSyncing(true);
      const { data: { session } } = await (await import('../../../lib/supabase')).supabase.auth.getSession();
      
      if (!session) {
        toast.error('נדרשת התחברות מחדש');
        return;
      }

      const result = await syncGoogleCalendar(user.id, session.access_token);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('הסנכרון הושלם בהצלחה');
      await loadStatus();
    } catch (error) {
      logger.error('Error syncing Google Calendar', error, 'GoogleCalendarSettings');
      toast.error('שגיאה בסנכרון Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  const handleBulkSync = async () => {
    if (!user) return;

    if (!confirm('האם לעדכן את כל האירועים ביומן Google Calendar עם מספור אימונים? פעולה זו עשויה לקחת כמה דקות.')) {
      return;
    }

    try {
      setBulkSyncing(true);
      const { data: { session } } = await (await import('../../../lib/supabase')).supabase.auth.getSession();
      
      if (!session) {
        toast.error('נדרשת התחברות מחדש');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vqvczpxmvrwfkecpwovc.supabase.co';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/bulk-sync-all-calendar-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message || `עודכנו ${result.updated} אירועים בהצלחה!`);
    } catch (error) {
      logger.error('Error bulk syncing calendar events', error, 'GoogleCalendarSettings');
      toast.error('שגיאה בעדכון האירועים');
    } finally {
      setBulkSyncing(false);
    }
  };

  if (loading && !connected) {
    return (
      <div className="premium-card-static bg-white dark:bg-[var(--color-bg-elevated)] rounded-2xl shadow-xl p-6 transition-all duration-300">
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg animate-pulse border-2 border-emerald-400/30">
              <RefreshCw className="h-8 w-8 text-foreground animate-spin" />
            </div>
            <span className="text-sm font-medium text-muted600 dark:text-[var(--color-text-muted)]">טוען הגדרות...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-card-static bg-white dark:bg-[var(--color-bg-elevated)] rounded-2xl shadow-xl p-6 space-y-6 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/20 dark:to-teal-500/20 rounded-xl border border-emerald-500/30 dark:border-emerald-500/30">
            <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-muted900 dark:text-[var(--color-text-primary)]">הגדרות Google Calendar</h2>
            <p className="text-sm text-muted600 dark:text-[var(--color-text-muted)]">סנכרון אימונים עם Google Calendar</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-muted600 dark:text-[var(--color-text-muted)] hover:text-muted900 dark:hover:text-[var(--color-text-primary)] hover:bg-surface100 dark:hover:bg-[var(--color-bg-surface)] rounded-xl transition-all duration-300"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>

      {!connected ? (
        <div className="text-center py-8 space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[var(--color-bg-surface)] dark:to-[var(--color-bg-elevated)] rounded-2xl flex items-center justify-center shadow-lg border-2 border-border300 dark:border-[var(--color-border)]/30">
            <Calendar className="h-8 w-8 text-muted500 dark:text-[var(--color-text-muted)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-muted900 dark:text-[var(--color-text-primary)] mb-2">
              Google Calendar לא מחובר
            </h3>
            <p className="text-sm text-muted600 dark:text-[var(--color-text-muted)] mb-6">
              חבר את Google Calendar כדי לסנכרן אימונים אוטומטית
            </p>
          </div>
          {/* Debug: Show trainer ID (remove in production) */}
          {user && (
            <div className="text-xs text-muted500 dark:text-[var(--color-text-muted)] mb-4 px-4 py-2 bg-surface100 dark:bg-[var(--color-bg-surface)] rounded-lg border border-border200 dark:border-[var(--color-border)]/30">
              Trainer ID: <code className="text-muted700 dark:text-[var(--color-text-primary)]">{user.id}</code>
            </div>
          )}
          <button
            onClick={handleConnect}
            disabled={loading}
            className="btn-primary flex items-center gap-2 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground shadow-lg"
          >
            <Calendar className="h-4 w-4" />
            חבר Google Calendar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20 transition-all duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold block">מחובר</span>
                <span className="text-xs text-muted600 dark:text-[var(--color-text-muted)]">Google Calendar פעיל</span>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-xl transition-all duration-300 border border-red-200 dark:border-red-500/20"
            >
              ניתוק
            </button>
          </div>

          {/* Sync Settings */}
          <div className="p-4 bg-surface50 dark:bg-[var(--color-bg-surface)] rounded-xl space-y-4 border border-border200 dark:border-[var(--color-border)]/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted900 dark:text-[var(--color-text-primary)]">הגדרות סנכרון</span>
            </div>
            
            <Checkbox
              checked={autoSyncEnabled}
              onChange={(checked) => setAutoSyncEnabled(checked)}
              label="סנכרון אוטומטי"
            />
            
            <Select
              label="תדירות סנכרון"
              value={syncFrequency}
              onChange={(e) => setSyncFrequency(e.target.value as 'realtime' | 'hourly' | 'daily')}
              options={[
                { value: 'realtime', label: 'זמן אמת' },
                { value: 'hourly', label: 'כל שעה' },
                { value: 'daily', label: 'יומי' }
              ]}
              fullWidth
            />
            
            <Select
              label="כיוון סנכרון"
              value={syncDirection}
              onChange={(e) => setSyncDirection(e.target.value as 'to_google' | 'from_google' | 'bidirectional')}
              options={[
                { value: 'to_google', label: 'ממערכת ל-Google' },
                { value: 'from_google', label: 'מ-Google למערכת' },
                { value: 'bidirectional', label: 'דו-כיווני' }
              ]}
              fullWidth
            />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground block">
                  יומן להצגה
                </label>
                <button
                  type="button"
                  onClick={loadCalendars}
                  disabled={loadingCalendars}
                  className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title="רענון רשימת יומנים"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingCalendars ? 'animate-spin' : ''}`} />
                  רענון
                </button>
              </div>
              {loadingCalendars ? (
                <div className="flex items-center gap-2 text-sm text-muted py-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  טוען יומנים...
                </div>
              ) : calendars.length > 0 ? (
                <Select
                  value={defaultCalendarId}
                  onChange={(e) => setDefaultCalendarId(e.target.value)}
                  options={calendars.map(cal => ({
                    value: cal.id,
                    label: `${cal.summary}${cal.primary ? ' (ברירת מחדל)' : ''}`
                  }))}
                  fullWidth
                />
              ) : (
                <div className="text-sm text-muted py-2">
                  לא ניתן לטעון רשימת יומנים
                </div>
              )}
              <p className="text-xs text-muted">
                בחר איזה יומן Google Calendar להציג במערכת
              </p>
            </div>
            
            <button
              onClick={handleSaveSettings}
              disabled={saving || loading}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  שומר...
                </>
              ) : (
                'שמור הגדרות'
              )}
            </button>
          </div>

          {/* Manual Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="w-full btn-secondary flex items-center justify-center gap-2 bg-surface100 dark:bg-[var(--color-bg-surface)] hover:bg-surface200 dark:hover:bg-[var(--color-bg-elevated)] text-muted700 dark:text-[var(--color-text-primary)] border border-border200 dark:border-[var(--color-border)]/30"
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                מסנכרן...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                סנכרון ידני עכשיו
              </>
            )}
          </button>

          {/* Bulk Sync Button - Updates all events with session numbers */}
          <button
            onClick={handleBulkSync}
            disabled={bulkSyncing || loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-foreground rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {bulkSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                מעדכן את כל האירועים...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                עדכן מספור אימונים בכל האירועים
              </>
            )}
          </button>

          {/* Info */}
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20 transition-all duration-300">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted700 dark:text-[var(--color-text-primary)]">
              <p className="font-semibold mb-1">מידע חשוב:</p>
              <ul className="list-disc list-inside space-y-1 text-muted600 dark:text-[var(--color-text-muted)]">
                <li>אימונים חדשים יתווספו אוטומטית ל-Google Calendar</li>
                <li>שינויים ב-Google Calendar יסונכרנו למערכת</li>
                <li>אימונים שהושלמו לא יימחקו מה-Calendar</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
