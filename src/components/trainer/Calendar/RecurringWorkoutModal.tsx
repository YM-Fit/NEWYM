/**
 * RecurringWorkoutModal - Schedule multiple recurring workouts
 * Features:
 * - Select trainee
 * - Pick multiple day/time slots (e.g., Monday 17:00, Friday 7:30)
 * - Choose duration (1 week, 2 weeks, 1 month, custom)
 * - Preview all dates to be created
 * - Batch create all workouts
 */

import { useState, useMemo, useCallback } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  AlertCircle,
  Check
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTrainees } from '../../../hooks/useSupabaseQuery';
import { createGoogleCalendarEvent } from '../../../api/googleCalendarApi';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import { sessionInfoCache } from '../../../utils/traineeSessionUtils';

interface RecurringWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkoutsCreated?: () => void;
}

interface DayTimeSlot {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  time: string; // HH:MM format
}

type DurationOption = '1_week' | '2_weeks' | '1_month' | 'custom';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY_NAMES_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export default function RecurringWorkoutModal({
  isOpen,
  onClose,
  onWorkoutsCreated
}: RecurringWorkoutModalProps) {
  const { user } = useAuth();
  const { data: traineesData, loading: traineesLoading } = useTrainees(user?.id || null);
  const trainees = Array.isArray(traineesData) ? traineesData : [];

  const [selectedTraineeId, setSelectedTraineeId] = useState('');
  const [slots, setSlots] = useState<DayTimeSlot[]>([]);
  const [durationOption, setDurationOption] = useState<DurationOption>('1_month');
  const [customWeeks, setCustomWeeks] = useState(4);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [workoutDuration, setWorkoutDuration] = useState<'30' | '60'>('60');
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showPreview, setShowPreview] = useState(false);

  // Add a new time slot
  const addSlot = () => {
    const newSlot: DayTimeSlot = {
      id: `slot-${Date.now()}`,
      dayOfWeek: 1, // Default to Monday
      time: '09:00'
    };
    setSlots([...slots, newSlot]);
  };

  // Remove a time slot
  const removeSlot = (slotId: string) => {
    setSlots(slots.filter(s => s.id !== slotId));
  };

  // Update a time slot
  const updateSlot = (slotId: string, field: 'dayOfWeek' | 'time', value: number | string) => {
    setSlots(slots.map(s => 
      s.id === slotId ? { ...s, [field]: value } : s
    ));
  };

  // Calculate the number of weeks based on duration option
  const numberOfWeeks = useMemo(() => {
    switch (durationOption) {
      case '1_week': return 1;
      case '2_weeks': return 2;
      case '1_month': return 4;
      case 'custom': return customWeeks;
      default: return 4;
    }
  }, [durationOption, customWeeks]);

  // Generate all workout dates based on slots and duration
  const workoutDates = useMemo(() => {
    if (slots.length === 0) return [];

    const dates: { date: Date; slot: DayTimeSlot }[] = [];
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + (numberOfWeeks * 7));

    // For each slot, find all matching dates in the range
    for (let d = new Date(start); d < endDate; d.setDate(d.getDate() + 1)) {
      for (const slot of slots) {
        if (d.getDay() === slot.dayOfWeek) {
          const workoutDate = new Date(d);
          const [hours, minutes] = slot.time.split(':').map(Number);
          workoutDate.setHours(hours, minutes, 0, 0);
          dates.push({ date: new Date(workoutDate), slot });
        }
      }
    }

    // Sort by date
    dates.sort((a, b) => a.date.getTime() - b.date.getTime());
    return dates;
  }, [slots, startDate, numberOfWeeks]);

  // Create all workouts with improved error handling and retry logic
  const createWorkouts = useCallback(async () => {
    if (!user || !selectedTraineeId || workoutDates.length === 0) {
      toast.error('יש לבחור מתאמן ולהגדיר לפחות יום ושעה אחד');
      return;
    }

    const selectedTrainee = trainees.find(t => t.id === selectedTraineeId);
    if (!selectedTrainee) {
      toast.error('מתאמן לא נמצא');
      return;
    }

    setCreating(true);
    setProgress({ current: 0, total: workoutDates.length });

    try {
      // Get access token first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('נדרשת הרשאה - יש להתחבר מחדש');
        setCreating(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;
      const failedDates: Date[] = [];
      let lastError = '';

      // Process in smaller batches with longer delays
      const BATCH_SIZE = 5;
      const DELAY_BETWEEN_EVENTS = 500; // 500ms between events
      const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds between batches

      for (let i = 0; i < workoutDates.length; i++) {
        const { date } = workoutDates[i];
        
        // Calculate position for this event (sequential number)
        const eventPosition = i + 1;
        const eventSummary = `אימון - ${selectedTrainee.full_name} ${eventPosition}`;
        
        setProgress({ current: i + 1, total: workoutDates.length });

        try {
          const startTime = new Date(date);
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + parseInt(workoutDuration));

          // Create Google Calendar event
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
            failCount++;
            lastError = eventResult.error || 'שגיאה לא ידועה';
            failedDates.push(date);
            logger.error('Failed to create Google Calendar event', { error: eventResult.error, date: date.toISOString() }, 'RecurringWorkoutModal');
            // Continue to next event instead of stopping
            continue;
          }

          const googleEventId = eventResult.data;

          // Create workout record
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
            failCount++;
            lastError = workoutError.message;
            failedDates.push(date);
            logger.error('Failed to create workout record', workoutError, 'RecurringWorkoutModal');
            continue;
          }

          // Link workout to trainee
          await supabase
            .from('workout_trainees')
            .insert({
              workout_id: workoutData.id,
              trainee_id: selectedTraineeId,
            });

          // Create sync record
          await supabase
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

          successCount++;
        } catch (err) {
          failCount++;
          lastError = err instanceof Error ? err.message : 'שגיאה לא ידועה';
          failedDates.push(date);
          logger.error('Error creating recurring workout', err, 'RecurringWorkoutModal');
        }

        // Delay between events to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EVENTS));

        // Extra delay between batches
        if ((i + 1) % BATCH_SIZE === 0 && i + 1 < workoutDates.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      // Invalidate session cache since we've added workouts
      sessionInfoCache.invalidate(selectedTraineeId);

      if (successCount > 0) {
        if (failCount > 0) {
          toast.success(`נוצרו ${successCount} אימונים בהצלחה. ${failCount} נכשלו: ${lastError}`);
        } else {
          toast.success(`נוצרו ${successCount} אימונים בהצלחה!`);
        }
        onWorkoutsCreated?.();
        onClose();
      } else {
        toast.error(`לא הצלחנו ליצור אימונים: ${lastError}`);
      }
    } catch (err) {
      logger.error('Error in createWorkouts', err, 'RecurringWorkoutModal');
      toast.error(`שגיאה ביצירת אימונים: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);
    } finally {
      setCreating(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [user, selectedTraineeId, trainees, workoutDates, workoutDuration, onWorkoutsCreated, onClose]);

  // Reset form
  const resetForm = () => {
    setSelectedTraineeId('');
    setSlots([]);
    setDurationOption('1_month');
    setCustomWeeks(4);
    setStartDate(new Date().toISOString().split('T')[0]);
    setWorkoutDuration('60');
    setShowPreview(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">קביעת אימונים חוזרים</h2>
              <p className="text-xs text-zinc-400">יצירת מספר אימונים בלחיצה אחת</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-all"
          >
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Trainee Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <User className="h-4 w-4 text-purple-400" />
              בחירת מתאמן
            </label>
            <select
              value={selectedTraineeId}
              onChange={(e) => setSelectedTraineeId(e.target.value)}
              disabled={traineesLoading || creating}
              className="w-full p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white focus:border-purple-500/50 focus:outline-none"
            >
              <option value="">-- בחר מתאמן --</option>
              {trainees
                .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'))
                .map((trainee) => (
                  <option key={trainee.id} value={trainee.id}>
                    {trainee.full_name}
                  </option>
                ))}
            </select>
          </div>

          {/* Time Slots */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Clock className="h-4 w-4 text-purple-400" />
                ימים ושעות
              </label>
              <button
                onClick={addSlot}
                disabled={creating}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-all disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                הוסף
              </button>
            </div>

            {slots.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 bg-zinc-800/30 rounded-xl border border-dashed border-zinc-700">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">לחץ על "הוסף" לקביעת יום ושעה</p>
              </div>
            ) : (
              <div className="space-y-2">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50"
                  >
                    <select
                      value={slot.dayOfWeek}
                      onChange={(e) => updateSlot(slot.id, 'dayOfWeek', parseInt(e.target.value))}
                      disabled={creating}
                      className="flex-1 p-2 bg-zinc-700/50 border border-zinc-600/50 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    >
                      {DAY_NAMES.map((name, index) => (
                        <option key={index} value={index}>
                          יום {name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={slot.time}
                      onChange={(e) => updateSlot(slot.id, 'time', e.target.value)}
                      disabled={creating}
                      className="w-32 p-2 bg-zinc-700/50 border border-zinc-600/50 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                    />
                    <button
                      onClick={() => removeSlot(slot.id)}
                      disabled={creating}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Calendar className="h-4 w-4 text-purple-400" />
              משך הזמן
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: '1_week', label: 'שבוע' },
                { value: '2_weeks', label: 'שבועיים' },
                { value: '1_month', label: 'חודש' },
                { value: 'custom', label: 'מותאם' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDurationOption(option.value as DurationOption)}
                  disabled={creating}
                  className={`p-3 rounded-xl border transition-all ${
                    durationOption === option.value
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                      : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:border-zinc-600'
                  } disabled:opacity-50`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            {durationOption === 'custom' && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={customWeeks}
                  onChange={(e) => setCustomWeeks(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                  disabled={creating}
                  className="w-24 p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                />
                <span className="text-zinc-400">שבועות</span>
              </div>
            )}
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Calendar className="h-4 w-4 text-purple-400" />
              תאריך התחלה
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={creating}
              className="w-full p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white focus:border-purple-500/50 focus:outline-none"
            />
          </div>

          {/* Workout Duration */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Clock className="h-4 w-4 text-purple-400" />
              משך האימון
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setWorkoutDuration('30')}
                disabled={creating}
                className={`p-3 rounded-xl border transition-all ${
                  workoutDuration === '30'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                    : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:border-zinc-600'
                } disabled:opacity-50`}
              >
                30 דקות
              </button>
              <button
                onClick={() => setWorkoutDuration('60')}
                disabled={creating}
                className={`p-3 rounded-xl border transition-all ${
                  workoutDuration === '60'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                    : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:border-zinc-600'
                } disabled:opacity-50`}
              >
                שעה
              </button>
            </div>
          </div>

          {/* Preview */}
          {workoutDates.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center justify-between w-full p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 hover:border-zinc-600 transition-all"
              >
                <div className="flex items-center gap-2 text-zinc-300">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  <span className="font-medium">תצוגה מקדימה</span>
                  <span className="text-purple-400 font-bold">({workoutDates.length} אימונים)</span>
                </div>
                <ChevronDown className={`h-5 w-5 text-zinc-400 transition-transform ${showPreview ? 'rotate-180' : ''}`} />
              </button>

              {showPreview && (
                <div className="max-h-48 overflow-y-auto space-y-1 p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
                  {workoutDates.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 text-sm"
                    >
                      <span className="text-zinc-300">
                        {DAY_NAMES_SHORT[item.date.getDay()]} {item.date.toLocaleDateString('he-IL')}
                      </span>
                      <span className="text-zinc-500">{item.slot.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Validation Messages */}
          {!selectedTraineeId && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              יש לבחור מתאמן
            </div>
          )}
          {selectedTraineeId && slots.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              יש להוסיף לפחות יום ושעה אחד
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800">
          {creating ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <span>יוצר אימונים...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-400">
                {workoutDates.length > 0 && selectedTraineeId ? (
                  <span className="text-purple-400 font-medium">{workoutDates.length} אימונים ייווצרו</span>
                ) : null}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all"
                >
                  ביטול
                </button>
                <button
                  onClick={createWorkouts}
                  disabled={!selectedTraineeId || slots.length === 0 || workoutDates.length === 0}
                  className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  צור {workoutDates.length} אימונים
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
