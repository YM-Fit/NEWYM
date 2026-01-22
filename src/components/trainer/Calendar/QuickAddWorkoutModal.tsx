/**
 * QuickAddWorkoutModal - Quick workout creation from calendar
 * Allows fast scheduling of workouts with trainee selection
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  User, 
  Loader2,
  Plus
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTrainees } from '../../../hooks/useSupabaseQuery';
import { createGoogleCalendarEvent } from '../../../api/googleCalendarApi';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import { generateGoogleCalendarEventTitle } from '../../../utils/traineeSessionUtils';
import { syncTraineeEventsToCalendar } from '../../../services/traineeCalendarSyncService';

interface QuickAddWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onWorkoutCreated?: () => void;
}

type Duration = '30' | '60';

export default function QuickAddWorkoutModal({
  isOpen,
  onClose,
  selectedDate,
  onWorkoutCreated
}: QuickAddWorkoutModalProps) {
  const { user } = useAuth();
  const { data: traineesData, loading: traineesLoading } = useTrainees(user?.id || null);
  
  // Ensure trainees is always an array
  const trainees = Array.isArray(traineesData) ? traineesData : [];
  
  const [selectedTraineeId, setSelectedTraineeId] = useState<string>('');
  const [duration, setDuration] = useState<Duration>('60');
  const [date, setDate] = useState<string>(selectedDate.toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('09:00');
  const [saving, setSaving] = useState(false);

  // Sort trainees by name for display
  const sortedTrainees = useMemo(() => {
    if (!trainees || trainees.length === 0) return [];
    return [...trainees].sort((a, b) => 
      a.full_name.localeCompare(b.full_name, 'he')
    );
  }, [trainees]);

  const handleSave = useCallback(async () => {
    if (!user || !selectedTraineeId) {
      toast.error('יש לבחור מתאמן');
      return;
    }

    const selectedTrainee = trainees.find(t => t.id === selectedTraineeId);
    if (!selectedTrainee) {
      toast.error('מתאמן לא נמצא');
      return;
    }

    setSaving(true);

    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('נדרשת הרשאה - יש להתחבר מחדש');
        setSaving(false);
        return;
      }

      // Calculate start and end times
      const [hours, minutes] = time.split(':').map(Number);
      const startTime = new Date(date);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + parseInt(duration));

      // Generate event summary with session number (e.g., "אימון - שם מתאמן 3/8")
      const eventSummary = await generateGoogleCalendarEventTitle(
        selectedTraineeId,
        user.id,
        startTime
      );

      // Create event in Google Calendar
      logger.info('Creating Google Calendar event', { 
        trainerId: user.id, 
        traineeName: selectedTrainee.full_name,
        startTime: startTime.toISOString(),
        eventSummary
      }, 'QuickAddWorkoutModal');

      const eventResult = await createGoogleCalendarEvent(
        user.id,
        {
          summary: eventSummary,
          startTime,
          endTime,
          description: `אימון אישי עם ${selectedTrainee.full_name}`,
        },
        session.access_token
      );

      if (!eventResult.success || !eventResult.data) {
        const errorMessage = eventResult.error || 'שגיאה ביצירת אירוע ב-Google Calendar';
        logger.error('Google Calendar event creation failed', { error: errorMessage, eventResult }, 'QuickAddWorkoutModal');
        throw new Error(errorMessage);
      }

      const googleEventId = eventResult.data;

      // Create workout record in database
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          trainer_id: user.id,
          workout_date: startTime.toISOString(),
          workout_type: 'personal',
          is_completed: false,
          google_event_id: googleEventId,
          synced_from_google: false,
          notes: '',
        })
        .select('id')
        .single();

      if (workoutError) {
        logger.error('Error creating workout', workoutError, 'QuickAddWorkoutModal');
        throw new Error('שגיאה ביצירת אימון');
      }

      // Link workout to trainee
      const { error: linkError } = await supabase
        .from('workout_trainees')
        .insert({
          workout_id: workoutData.id,
          trainee_id: selectedTraineeId,
        });

      if (linkError) {
        logger.error('Error linking trainee to workout', linkError, 'QuickAddWorkoutModal');
        // Don't throw - workout was created, just the link failed
      }

      // Create sync record
      const { error: syncError } = await supabase
        .from('google_calendar_sync')
        .upsert({
          trainer_id: user.id,
          trainee_id: selectedTraineeId,
          workout_id: workoutData.id,
          google_event_id: googleEventId,
          google_calendar_id: 'primary',
          sync_status: 'synced',
          sync_direction: 'to_google',
          event_start_time: startTime.toISOString(),
          event_end_time: endTime.toISOString(),
          event_summary: eventSummary,
        }, {
          onConflict: 'google_event_id,google_calendar_id',
        });

      if (syncError) {
        logger.error('Error creating sync record', syncError, 'QuickAddWorkoutModal');
        // Don't throw - workout and event were created
      }

      // Trigger sync to update all events for this trainee with correct session numbers
      // This runs in background and updates all future events
      syncTraineeEventsToCalendar(selectedTraineeId, user.id, 'current_month_and_future')
        .then(result => {
          if (result.error) {
            logger.warn('Background sync failed', { error: result.error }, 'QuickAddWorkoutModal');
          } else {
            logger.info('Background sync completed', { result: result.data }, 'QuickAddWorkoutModal');
          }
        })
        .catch(err => {
          logger.warn('Background sync error', err, 'QuickAddWorkoutModal');
        });

      toast.success(`נוצר אימון עם ${selectedTrainee.full_name}`);
      
      // Reset form
      setSelectedTraineeId('');
      setDuration('60');
      setTime('09:00');
      
      onWorkoutCreated?.();
      onClose();
    } catch (err) {
      // Extract meaningful error message
      let errorMessage = 'שגיאה ביצירת אימון';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = String((err as { message: unknown }).message);
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      logger.error('Error creating quick workout', { 
        error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
        errorMessage 
      }, 'QuickAddWorkoutModal');
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [user, selectedTraineeId, trainees, date, time, duration, onWorkoutCreated, onClose]);

  // Reset date when selectedDate changes
  useMemo(() => {
    setDate(selectedDate.toISOString().split('T')[0]);
  }, [selectedDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="premium-card-static bg-white bg-elevated rounded-2xl max-w-md w-full border border-border border-border30 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border border-border30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/20 dark:to-teal-500/20 rounded-xl border border-emerald-500/30 dark:border-emerald-500/30">
              <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground text-foreground">הוספת אימון מהירה</h2>
              <p className="text-xs text-muted text-muted">
                {selectedDate.toLocaleDateString('he-IL', { 
                  weekday: 'long',
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface dark:hover:bg-[var(--color-bg-surface)] rounded-xl transition-all duration-300"
          >
            <X className="h-5 w-5 text-muted text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Trainee Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground text-foreground">
              <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              בחירת מתאמן
            </label>
            <select
              value={selectedTraineeId}
              onChange={(e) => setSelectedTraineeId(e.target.value)}
              disabled={traineesLoading}
              className="w-full p-3 bg-white bg-elevated border border-border border-border30 rounded-xl text-foreground text-foreground focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
            >
              <option value="">-- בחר מתאמן --</option>
              {sortedTrainees.map((trainee) => (
                <option key={trainee.id} value={trainee.id}>
                  {trainee.full_name}
                  {trainee.phone && ` (${trainee.phone})`}
                </option>
              ))}
            </select>
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground text-foreground">
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              משך האימון
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDuration('30')}
                className={`p-3 rounded-xl border transition-all duration-300 ${
                  duration === '30'
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/20 dark:to-teal-500/20 border-emerald-200 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-400 font-semibold shadow-sm'
                    : 'bg-white bg-elevated border border-border border-border30 text-foreground text-foreground hover:bg-surface dark:hover:bg-[var(--color-bg-surface)]'
                }`}
              >
                30 דקות
              </button>
              <button
                type="button"
                onClick={() => setDuration('60')}
                className={`p-3 rounded-xl border transition-all duration-300 ${
                  duration === '60'
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/20 dark:to-teal-500/20 border-emerald-200 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-400 font-semibold shadow-sm'
                    : 'bg-white bg-elevated border border-border border-border30 text-foreground text-foreground hover:bg-surface dark:hover:bg-[var(--color-bg-surface)]'
                }`}
              >
                שעה
              </button>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground text-foreground">
                <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                תאריך
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 bg-white bg-elevated border border-border border-border30 rounded-xl text-foreground text-foreground focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground text-foreground">
                <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                שעה
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-3 bg-white bg-elevated border border-border border-border30 rounded-xl text-foreground text-foreground focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border border-border30">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-surface bg-surface hover:bg-elevated dark:hover:bg-[var(--color-bg-elevated)] text-foreground text-foreground rounded-xl transition-all duration-300 border border-border border-border30"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedTraineeId}
            className="px-6 py-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                יוצר...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                צור אימון
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
