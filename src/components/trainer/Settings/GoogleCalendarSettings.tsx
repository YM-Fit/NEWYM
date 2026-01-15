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

  if (loading && !connected) {
    return (
      <div className="premium-card p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Calendar className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">הגדרות Google Calendar</h2>
            <p className="text-sm text-zinc-400">סנכרון אימונים עם Google Calendar</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>

      {!connected ? (
        <div className="text-center py-8 space-y-4">
          <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center">
            <Calendar className="h-8 w-8 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Google Calendar לא מחובר
            </h3>
            <p className="text-sm text-zinc-400 mb-6">
              חבר את Google Calendar כדי לסנכרן אימונים אוטומטית
            </p>
          </div>
          {/* Debug: Show trainer ID (remove in production) */}
          {user && (
            <div className="text-xs text-zinc-500 mb-4 px-4 py-2 bg-zinc-800/50 rounded">
              Trainer ID: <code className="text-zinc-400">{user.id}</code>
            </div>
          )}
          <button
            onClick={handleConnect}
            disabled={loading}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <Calendar className="h-4 w-4" />
            חבר Google Calendar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <div>
                <span className="text-emerald-400 font-semibold block">מחובר</span>
                <span className="text-xs text-zinc-400">Google Calendar פעיל</span>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
            >
              ניתוק
            </button>
          </div>

          {/* Sync Settings */}
          <div className="p-4 bg-zinc-800/50 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">הגדרות סנכרון</span>
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
                <label className="text-sm font-semibold text-white block">
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
                <div className="flex items-center gap-2 text-sm text-zinc-400 py-2">
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
                <div className="text-sm text-zinc-400 py-2">
                  לא ניתן לטעון רשימת יומנים
                </div>
              )}
              <p className="text-xs text-zinc-500">
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
            className="w-full btn-secondary flex items-center justify-center gap-2"
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

          {/* Info */}
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-zinc-300">
              <p className="font-semibold mb-1">מידע חשוב:</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
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
