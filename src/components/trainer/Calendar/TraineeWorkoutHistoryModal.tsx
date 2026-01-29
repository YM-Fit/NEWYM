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
  AlertCircle,
  Search
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
import { generateGoogleCalendarEventTitle } from '../../../utils/traineeSessionUtils';
import { syncTraineeEventsToCalendar } from '../../../services/traineeCalendarSyncService';
import { findBestMatches } from '../../../utils/nameMatching';

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
  
  // Resolved trainee ID - in case passed traineeId is null, we try to find by name
  const [resolvedTraineeId, setResolvedTraineeId] = useState<string | null>(traineeId);
  const [searchingTrainee, setSearchingTrainee] = useState(false);
  
  // Reschedule form state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  
  // Replace form state
  const [replaceTraineeId, setReplaceTraineeId] = useState('');

  // Try to find trainee by name when traineeId is null
  const resolveTraineeByName = useCallback(async () => {
    if (traineeId) {
      setResolvedTraineeId(traineeId);
      return;
    }

    if (!traineeName || trainees.length === 0) {
      setResolvedTraineeId(null);
      return;
    }

    setSearchingTrainee(true);
    try {
      // Use findBestMatches to find the trainee
      const matches = findBestMatches(traineeName, trainees, 60);
      
      if (matches.length > 0) {
        // Use the best match
        const bestMatch = matches[0];
        logger.info('Found trainee by name matching', { 
          searchName: traineeName, 
          matchedName: bestMatch.trainee.full_name,
          score: bestMatch.score 
        }, 'TraineeWorkoutHistoryModal');
        setResolvedTraineeId(bestMatch.trainee.id);
      } else {
        // Fallback: try exact match or partial match on name
        const exactMatch = trainees.find(t => 
          t.full_name.toLowerCase() === traineeName.toLowerCase() ||
          t.full_name.toLowerCase().includes(traineeName.toLowerCase()) ||
          traineeName.toLowerCase().includes(t.full_name.toLowerCase())
        );
        
        if (exactMatch) {
          logger.info('Found trainee by fallback matching', { 
            searchName: traineeName, 
            matchedName: exactMatch.full_name 
          }, 'TraineeWorkoutHistoryModal');
          setResolvedTraineeId(exactMatch.id);
        } else {
          logger.warn('Could not find trainee by name', { traineeName }, 'TraineeWorkoutHistoryModal');
          setResolvedTraineeId(null);
        }
      }
    } catch (err) {
      logger.error('Error resolving trainee by name', err, 'TraineeWorkoutHistoryModal');
      setResolvedTraineeId(null);
    } finally {
      setSearchingTrainee(false);
    }
  }, [traineeId, traineeName, trainees]);

  // Resolve trainee when modal opens or traineeId/traineeName changes
  useEffect(() => {
    if (isOpen) {
      resolveTraineeByName();
    }
  }, [isOpen, resolveTraineeByName]);

  // Update resolved ID when traineeId prop changes
  useEffect(() => {
    if (traineeId) {
      setResolvedTraineeId(traineeId);
    }
  }, [traineeId]);

  // Load workouts for the trainee in the selected month
  const loadWorkouts = useCallback(async () => {
    if (!user || !resolvedTraineeId) {
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
        .eq('trainee_id', resolvedTraineeId)
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
  }, [user, resolvedTraineeId, selectedMonth]);

  useEffect(() => {
    if (isOpen && resolvedTraineeId && !searchingTrainee) {
      loadWorkouts();
    }
  }, [isOpen, resolvedTraineeId, searchingTrainee, loadWorkouts]);

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
      // Delete from Google Calendar if exists - wait for completion
      // This must happen BEFORE deleting from DB to ensure sync consistency
      if (workout.googleEventId) {
        const deleteResult = await deleteGoogleCalendarEvent(user.id, workout.googleEventId);
        if (deleteResult.error) {
          logger.warn('Error deleting from Google Calendar', { error: deleteResult.error, eventId: workout.googleEventId }, 'TraineeWorkoutHistoryModal');
          // Still continue with DB deletion even if Google Calendar delete fails
        } else {
          // Small delay to ensure Google Calendar API has processed the deletion
          // This helps prevent race conditions where the event might still appear in API responses
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Delete workout-trainee link
      const { error: linkError } = await supabase
        .from('workout_trainees')
        .delete()
        .eq('workout_id', workout.id)
        .eq('trainee_id', resolvedTraineeId);

      if (linkError) {
        throw new Error('שגיאה במחיקת קישור אימון');
      }

      // Delete sync record - wait for completion to ensure it's deleted before refresh
      if (workout.googleEventId) {
        const { error: syncError } = await supabase
          .from('google_calendar_sync')
          .delete()
          .eq('google_event_id', workout.googleEventId);
        
        if (syncError) {
          logger.warn('Error deleting sync record', { error: syncError }, 'TraineeWorkoutHistoryModal');
          // Continue even if sync record deletion fails
        }
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
      // Call onWorkoutUpdated after all deletions are complete to ensure cache refresh
      onWorkoutUpdated?.();
      // Dispatch custom event to notify dashboard and other components
      window.dispatchEvent(new CustomEvent('workout-deleted', { detail: { workoutId: workout.id } }));
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
    if (!user || !selectedWorkout || !replaceTraineeId || !resolvedTraineeId) {
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
      // Get the workout date for session number calculation
      const workoutDate = new Date(selectedWorkout.date);
      
      // Generate event summary with correct session number
      const newEventSummary = await generateGoogleCalendarEventTitle(
        replaceTraineeId,
        user.id,
        workoutDate,
        selectedWorkout.id
      );

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
        .eq('trainee_id', resolvedTraineeId);

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
      
      // Sync both old and new trainee events to update session numbers
      // Run in background
      Promise.all([
        // Sync the new trainee's events
        syncTraineeEventsToCalendar(replaceTraineeId, user.id, 'current_month_and_future'),
        // Sync the old trainee's events (if we have their ID)
        resolvedTraineeId 
          ? syncTraineeEventsToCalendar(resolvedTraineeId, user.id, 'current_month_and_future')
          : Promise.resolve(null)
      ]).catch(err => {
        logger.warn('Background sync failed after trainee replacement', err, 'TraineeWorkoutHistoryModal');
      });
      
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
    <div className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="premium-card-static bg-white bg-elevated rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-border border-border30 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border border-border30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/20 dark:to-teal-500/20 rounded-xl border border-emerald-500/30 dark:border-emerald-500/30">
              <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground text-foreground">היסטוריית אימונים - {traineeName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1 hover:bg-surface dark:hover:bg-[var(--color-bg-surface)] rounded-lg transition-all duration-300"
                >
                  <ChevronRight className="h-4 w-4 text-muted text-muted" />
                </button>
                <span className="text-sm text-muted text-muted">{formatMonth(selectedMonth)}</span>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1 hover:bg-surface dark:hover:bg-[var(--color-bg-surface)] rounded-lg transition-all duration-300"
                >
                  <ChevronLeft className="h-4 w-4 text-muted text-muted" />
                </button>
              </div>
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
        <div className="flex-1 overflow-y-auto p-5">
          {searchingTrainee ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg animate-pulse border-2 border-emerald-400/30 mb-3">
                <Search className="h-8 w-8 text-foreground" />
              </div>
              <p className="text-muted text-muted">מחפש מתאמן...</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg animate-pulse border-2 border-emerald-400/30 mb-3">
                <Loader2 className="h-8 w-8 text-foreground animate-spin" />
              </div>
              <p className="text-muted text-muted">טוען אימונים...</p>
            </div>
          ) : !resolvedTraineeId ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20 rounded-full flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-500/30">
                <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-500" />
              </div>
              <p className="text-foreground text-foreground font-medium">לא נמצא מתאמן בשם "{traineeName}"</p>
              <p className="text-muted text-muted text-sm mt-2">ייתכן ששם המתאמן ביומן לא תואם לשם במערכת</p>
            </div>
          ) : workouts.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[var(--color-bg-surface)] dark:to-[var(--color-bg-elevated)] rounded-full flex items-center justify-center mb-4 border border-border border-border30">
                <Calendar className="h-8 w-8 text-muted400 text-muted" />
              </div>
              <p className="text-muted text-muted">אין אימונים בחודש זה</p>
            </div>
          ) : actionMode === 'view' ? (
            <div className="space-y-3">
              {workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center justify-between p-4 bg-white bg-elevated rounded-xl border border-border border-border30 hover:bg-surface50 dark:hover:bg-[var(--color-bg-surface)] transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-foreground font-bold shadow-md">
                      {workout.workoutNumber}
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-foreground">
                        {new Date(workout.workoutDate).toLocaleDateString('he-IL', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted text-muted">
                        <Clock className="h-3.5 w-3.5" />
                        {workout.startTime} - {workout.endTime}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startReschedule(workout)}
                      disabled={!!actionLoading}
                      className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/20 dark:to-blue-600/20 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-500/30 dark:hover:to-blue-600/30 text-blue-600 dark:text-blue-400 rounded-lg transition-all duration-300 disabled:opacity-50 border border-blue-200 dark:border-blue-500/30"
                      title="שינוי תאריך"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => startReplace(workout)}
                      disabled={!!actionLoading}
                      className="p-2 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-500/20 dark:to-purple-600/20 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-500/30 dark:hover:to-purple-600/30 text-purple-600 dark:text-purple-400 rounded-lg transition-all duration-300 disabled:opacity-50 border border-purple-200 dark:border-purple-500/30"
                      title="החלפת מתאמן"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteWorkout(workout)}
                      disabled={!!actionLoading}
                      className="p-2 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-500/20 dark:to-rose-500/20 hover:from-red-100 hover:to-rose-100 dark:hover:from-red-500/30 dark:hover:to-rose-500/30 text-red-600 dark:text-red-400 rounded-lg transition-all duration-300 disabled:opacity-50 border border-red-200 dark:border-red-500/30"
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
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-600/10 border border-blue-200 dark:border-blue-500/30 rounded-xl">
                <h3 className="font-medium text-blue-700 dark:text-blue-400 mb-2">שינוי תאריך אימון</h3>
                <p className="text-sm text-muted text-muted">
                  אימון מקורי: {new Date(selectedWorkout.workoutDate).toLocaleDateString('he-IL')} בשעה {selectedWorkout.startTime}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-foreground text-foreground font-medium mb-2">תאריך חדש</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full p-3 bg-white bg-elevated border border-border border-border30 rounded-xl text-foreground text-foreground focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm text-foreground text-foreground font-medium mb-2">שעה חדשה</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full p-3 bg-white bg-elevated border border-border border-border30 rounded-xl text-foreground text-foreground focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRescheduleWorkout}
                  disabled={!!actionLoading}
                  className="flex-1 py-3 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 rounded-xl text-foreground font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
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
                  className="px-6 py-3 bg-surface bg-surface hover:bg-elevated dark:hover:bg-[var(--color-bg-elevated)] rounded-xl text-foreground text-foreground transition-all duration-300 border border-border border-border30"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : actionMode === 'replace' && selectedWorkout ? (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-500/10 dark:to-purple-600/10 border border-purple-200 dark:border-purple-500/30 rounded-xl">
                <h3 className="font-medium text-purple-700 dark:text-purple-400 mb-2">החלפת מתאמן</h3>
                <p className="text-sm text-muted text-muted">
                  אימון בתאריך: {new Date(selectedWorkout.workoutDate).toLocaleDateString('he-IL')} בשעה {selectedWorkout.startTime}
                </p>
              </div>
              
              <div>
                <label className="block text-sm text-foreground text-foreground font-medium mb-2">בחר מתאמן חדש</label>
                <select
                  value={replaceTraineeId}
                  onChange={(e) => setReplaceTraineeId(e.target.value)}
                  className="w-full p-3 bg-white bg-elevated border border-border border-border30 rounded-xl text-foreground text-foreground focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                >
                  <option value="">-- בחר מתאמן --</option>
                  {trainees
                    .filter(t => t.id !== resolvedTraineeId)
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
                  className="flex-1 py-3 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 rounded-xl text-foreground font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
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
                  className="px-6 py-3 bg-surface bg-surface hover:bg-elevated dark:hover:bg-[var(--color-bg-elevated)] rounded-xl text-foreground text-foreground transition-all duration-300 border border-border border-border30"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border border-border30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted text-muted">
              {workouts.length} אימונים בחודש זה
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-surface bg-surface hover:bg-elevated dark:hover:bg-[var(--color-bg-elevated)] text-foreground text-foreground rounded-xl transition-all duration-300 border border-border border-border30"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
