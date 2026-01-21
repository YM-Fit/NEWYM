/**
 * TraineeWorkoutHistoryModal - View and manage trainee workouts for the month
 * Features:
 * - Shows all workout dates for a trainee in the current month
 * - Cancel (delete) workouts
 * - Reschedule workouts to a different date/time
 * - Replace trainee with another trainee
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Trash2, 
  Edit2, 
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTrainees } from '../../../hooks/useSupabaseQuery';
import { 
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent 
} from '../../../api/googleCalendarApi';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import { getTraineeSessionInfo, generateEventSummaryWithSession } from '../../../utils/traineeSessionUtils';

interface TraineeWorkoutHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  traineeName: string;
  traineeId: string | null;
  currentDate: Date;
  onWorkoutUpdated?: () => void;
}

interface WorkoutEvent {
  id: string;
  googleEventId: string;
  workoutDate: string;
  startTime: string;
  endTime: string;
  workoutNumber: number;
}

type ActionMode = 'view' | 'reschedule' | 'replace';

export default function TraineeWorkoutHistoryModal({
  isOpen,
  onClose,
  traineeName,
  traineeId,
  currentDate,
  onWorkoutUpdated
}: TraineeWorkoutHistoryModalProps) {
  const { user } = useAuth();
  const { data: traineesData } = useTrainees(user?.id || null);
  const trainees = Array.isArray(traineesData) ? traineesData : [];

  const [workouts, setWorkouts] = useState<WorkoutEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutEvent | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>('view');
  const [selectedMonth, setSelectedMonth] = useState(new Date(currentDate));
  
  // Reschedule form state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  
  // Replace form state
  const [replaceTraineeId, setReplaceTraineeId] = useState('');

  // Load workouts for the trainee in the selected month
  const loadWorkouts = useCallback(async () => {
    if (!user || !traineeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

      // Get all workouts for this month
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          id,
          workout_date,
          google_event_id
        `)
        .eq('trainer_id', user.id)
        .gte('workout_date', startOfMonth.toISOString())
        .lte('workout_date', endOfMonth.toISOString())
        .order('workout_date', { ascending: true });

      if (workoutsError) {
        logger.error('Error loading workouts', workoutsError, 'TraineeWorkoutHistoryModal');
        toast.error('שגיאה בטעינת אימונים');
        return;
      }

      if (!workoutsData || workoutsData.length === 0) {
        setWorkouts([]);
        return;
      }

      // Get workout-trainee links for this trainee
      const workoutIds = workoutsData.map(w => w.id);
      const { data: links, error: linksError } = await supabase
        .from('workout_trainees')
        .select('workout_id')
        .eq('trainee_id', traineeId)
        .in('workout_id', workoutIds);

      if (linksError) {
        logger.error('Error loading workout links', linksError, 'TraineeWorkoutHistoryModal');
      }

      const traineeWorkoutIds = new Set((links || []).map(l => l.workout_id));
      
      // Filter and map workouts
      const traineeWorkouts = workoutsData
        .filter(w => traineeWorkoutIds.has(w.id))
        .map((w, index) => {
          const date = new Date(w.workout_date);
          return {
            id: w.id,
            googleEventId: w.google_event_id || '',
            workoutDate: w.workout_date,
            startTime: date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            endTime: new Date(date.getTime() + 60 * 60 * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            workoutNumber: index + 1,
          };
        });

      setWorkouts(traineeWorkouts);
    } catch (err) {
      logger.error('Error in loadWorkouts', err, 'TraineeWorkoutHistoryModal');
      toast.error('שגיאה בטעינת אימונים');
    } finally {
      setLoading(false);
    }
  }, [user, traineeId, selectedMonth]);

  useEffect(() => {
    if (isOpen) {
      loadWorkouts();
    }
  }, [isOpen, loadWorkouts]);

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  // Handle delete workout
  const handleDeleteWorkout = async (workout: WorkoutEvent) => {
    if (!user) return;
    
    if (!confirm(`האם למחוק את האימון בתאריך ${new Date(workout.workoutDate).toLocaleDateString('he-IL')}?`)) {
      return;
    }

    setActionLoading(workout.id);
    try {
      // Delete from Google Calendar if exists
      if (workout.googleEventId) {
        const deleteResult = await deleteGoogleCalendarEvent(user.id, workout.googleEventId);
        if (deleteResult.error) {
          logger.warn('Error deleting from Google Calendar', { error: deleteResult.error }, 'TraineeWorkoutHistoryModal');
        }
      }

      // Delete workout-trainee link
      const { error: linkError } = await supabase
        .from('workout_trainees')
        .delete()
        .eq('workout_id', workout.id)
        .eq('trainee_id', traineeId);

      if (linkError) {
        throw new Error('שגיאה במחיקת קישור אימון');
      }

      // Delete sync record
      if (workout.googleEventId) {
        await supabase
          .from('google_calendar_sync')
          .delete()
          .eq('google_event_id', workout.googleEventId);
      }

      // Delete workout
      const { error: workoutError } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workout.id);

      if (workoutError) {
        throw new Error('שגיאה במחיקת אימון');
      }

      toast.success('האימון נמחק בהצלחה');
      loadWorkouts();
      onWorkoutUpdated?.();
    } catch (err) {
      logger.error('Error deleting workout', err, 'TraineeWorkoutHistoryModal');
      toast.error(err instanceof Error ? err.message : 'שגיאה במחיקת אימון');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reschedule workout
  const handleRescheduleWorkout = async () => {
    if (!user || !selectedWorkout || !rescheduleDate || !rescheduleTime) {
      toast.error('יש למלא תאריך ושעה');
      return;
    }

    setActionLoading(selectedWorkout.id);
    try {
      const [hours, minutes] = rescheduleTime.split(':').map(Number);
      const newStartTime = new Date(rescheduleDate);
      newStartTime.setHours(hours, minutes, 0, 0);
      const newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000);

      // Update Google Calendar if exists
      if (selectedWorkout.googleEventId) {
        const updateResult = await updateGoogleCalendarEvent(
          user.id,
          selectedWorkout.googleEventId,
          {
            startTime: newStartTime,
            endTime: newEndTime,
          }
        );
        if (updateResult.error) {
          logger.warn('Error updating Google Calendar', { error: updateResult.error }, 'TraineeWorkoutHistoryModal');
        }
      }

      // Update workout date
      const { error: workoutError } = await supabase
        .from('workouts')
        .update({ workout_date: newStartTime.toISOString() })
        .eq('id', selectedWorkout.id);

      if (workoutError) {
        throw new Error('שגיאה בעדכון אימון');
      }

      // Update sync record
      if (selectedWorkout.googleEventId) {
        await supabase
          .from('google_calendar_sync')
          .update({
            event_start_time: newStartTime.toISOString(),
            event_end_time: newEndTime.toISOString(),
          })
          .eq('google_event_id', selectedWorkout.googleEventId);
      }

      toast.success('האימון עודכן בהצלחה');
      setActionMode('view');
      setSelectedWorkout(null);
      loadWorkouts();
      onWorkoutUpdated?.();
    } catch (err) {
      logger.error('Error rescheduling workout', err, 'TraineeWorkoutHistoryModal');
      toast.error(err instanceof Error ? err.message : 'שגיאה בעדכון אימון');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle replace trainee
  const handleReplaceTrainee = async () => {
    if (!user || !selectedWorkout || !replaceTraineeId || !traineeId) {
      toast.error('יש לבחור מתאמן');
      return;
    }

    const newTrainee = trainees.find(t => t.id === replaceTraineeId);
    if (!newTrainee) {
      toast.error('מתאמן לא נמצא');
      return;
    }

    setActionLoading(selectedWorkout.id);
    try {
      // Get session info for the new trainee
      const sessionInfo = await getTraineeSessionInfo(replaceTraineeId, user.id);
      const newEventSummary = generateEventSummaryWithSession(newTrainee.full_name, sessionInfo);

      // Update Google Calendar event with new trainee name
      if (selectedWorkout.googleEventId) {
        const updateResult = await updateGoogleCalendarEvent(
          user.id,
          selectedWorkout.googleEventId,
          {
            summary: newEventSummary,
          }
        );
        if (updateResult.error) {
          logger.warn('Error updating Google Calendar', { error: updateResult.error }, 'TraineeWorkoutHistoryModal');
        }
      }

      // Update workout-trainee link (delete old, create new)
      const { error: deleteLinkError } = await supabase
        .from('workout_trainees')
        .delete()
        .eq('workout_id', selectedWorkout.id)
        .eq('trainee_id', traineeId);

      if (deleteLinkError) {
        throw new Error('שגיאה בעדכון קישור אימון');
      }

      const { error: insertLinkError } = await supabase
        .from('workout_trainees')
        .insert({
          workout_id: selectedWorkout.id,
          trainee_id: replaceTraineeId,
        });

      if (insertLinkError) {
        throw new Error('שגיאה ביצירת קישור אימון');
      }

      // Update sync record
      if (selectedWorkout.googleEventId) {
        await supabase
          .from('google_calendar_sync')
          .update({
            trainee_id: replaceTraineeId,
            event_summary: newEventSummary,
          })
          .eq('google_event_id', selectedWorkout.googleEventId);
      }

      toast.success(`האימון הועבר ל${newTrainee.full_name}`);
      setActionMode('view');
      setSelectedWorkout(null);
      loadWorkouts();
      onWorkoutUpdated?.();
    } catch (err) {
      logger.error('Error replacing trainee', err, 'TraineeWorkoutHistoryModal');
      toast.error(err instanceof Error ? err.message : 'שגיאה בהחלפת מתאמן');
    } finally {
      setActionLoading(null);
    }
  };

  // Start reschedule action
  const startReschedule = (workout: WorkoutEvent) => {
    setSelectedWorkout(workout);
    setRescheduleDate(workout.workoutDate.split('T')[0]);
    const date = new Date(workout.workoutDate);
    setRescheduleTime(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
    setActionMode('reschedule');
  };

  // Start replace action
  const startReplace = (workout: WorkoutEvent) => {
    setSelectedWorkout(workout);
    setReplaceTraineeId('');
    setActionMode('replace');
  };

  // Cancel action
  const cancelAction = () => {
    setSelectedWorkout(null);
    setActionMode('view');
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Calendar className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">היסטוריית אימונים - {traineeName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1 hover:bg-zinc-800 rounded transition-all"
                >
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </button>
                <span className="text-sm text-zinc-400">{formatMonth(selectedMonth)}</span>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1 hover:bg-zinc-800 rounded transition-all"
                >
                  <ChevronLeft className="h-4 w-4 text-zinc-400" />
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-all"
          >
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            </div>
          ) : workouts.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">אין אימונים בחודש זה</p>
            </div>
          ) : actionMode === 'view' ? (
            <div className="space-y-3">
              {workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50 hover:border-zinc-600/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                      {workout.workoutNumber}
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {new Date(workout.workoutDate).toLocaleDateString('he-IL', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-zinc-400">
                        <Clock className="h-3.5 w-3.5" />
                        {workout.startTime} - {workout.endTime}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startReschedule(workout)}
                      disabled={!!actionLoading}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all disabled:opacity-50"
                      title="שינוי תאריך"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => startReplace(workout)}
                      disabled={!!actionLoading}
                      className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all disabled:opacity-50"
                      title="החלפת מתאמן"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteWorkout(workout)}
                      disabled={!!actionLoading}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-50"
                      title="ביטול אימון"
                    >
                      {actionLoading === workout.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : actionMode === 'reschedule' && selectedWorkout ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <h3 className="font-medium text-blue-400 mb-2">שינוי תאריך אימון</h3>
                <p className="text-sm text-zinc-400">
                  אימון מקורי: {new Date(selectedWorkout.workoutDate).toLocaleDateString('he-IL')} בשעה {selectedWorkout.startTime}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">תאריך חדש</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">שעה חדשה</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-blue-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRescheduleWorkout}
                  disabled={!!actionLoading}
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Edit2 className="h-5 w-5" />
                      עדכן תאריך
                    </>
                  )}
                </button>
                <button
                  onClick={cancelAction}
                  disabled={!!actionLoading}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : actionMode === 'replace' && selectedWorkout ? (
            <div className="space-y-4">
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <h3 className="font-medium text-purple-400 mb-2">החלפת מתאמן</h3>
                <p className="text-sm text-zinc-400">
                  אימון בתאריך: {new Date(selectedWorkout.workoutDate).toLocaleDateString('he-IL')} בשעה {selectedWorkout.startTime}
                </p>
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">בחר מתאמן חדש</label>
                <select
                  value={replaceTraineeId}
                  onChange={(e) => setReplaceTraineeId(e.target.value)}
                  className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-purple-500/50 focus:outline-none"
                >
                  <option value="">-- בחר מתאמן --</option>
                  {trainees
                    .filter(t => t.id !== traineeId)
                    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'))
                    .map((trainee) => (
                      <option key={trainee.id} value={trainee.id}>
                        {trainee.full_name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReplaceTrainee}
                  disabled={!!actionLoading || !replaceTraineeId}
                  className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Users className="h-5 w-5" />
                      החלף מתאמן
                    </>
                  )}
                </button>
                <button
                  onClick={cancelAction}
                  disabled={!!actionLoading}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              {workouts.length} אימונים בחודש זה
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
