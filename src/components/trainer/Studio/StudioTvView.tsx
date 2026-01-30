import { useMemo, useState, useEffect, memo, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCurrentTvSession } from '../../../hooks/useCurrentTvSession';
import { useTraineeProgressData } from '../../../hooks/useTraineeProgressData';
import { usePersonalRecordDetection } from '../../../hooks/usePersonalRecordDetection';
import { Card } from '../../ui/Card';
import { useThemeClasses } from '../../../contexts/ThemeContext';
import { Flame, TrendingUp, Trophy, Calendar, Target, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface StudioTvViewProps {
  pollIntervalMs?: number;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
}

function StudioTvView({ pollIntervalMs }: StudioTvViewProps) {
  const { user, userType } = useAuth();
  const { loading, error, session, logs, lastUpdated } = useCurrentTvSession({
    pollIntervalMs,
  });
  const themeClasses = useThemeClasses();

  // Load progress data
  const progressData = useTraineeProgressData(session?.trainee?.id || null);

  // Detect personal records
  const { records: prRecords, latestRecord } = usePersonalRecordDetection(
    session?.trainee?.id || null,
    session?.workout || null
  );

  const [showConfetti, setShowConfetti] = useState(false);
  const [showPRMessage, setShowPRMessage] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [lastWorkout, setLastWorkout] = useState<any>(null);
  const [welcomeScreenShown, setWelcomeScreenShown] = useState<string | null>(null); // Store workout ID instead of boolean

  // Load last workout for welcome screen
  useEffect(() => {
    if (!session?.trainee?.id || welcomeScreenShown === session?.workout?.id) return;

    const loadLastWorkout = async () => {
      try {
        const { data: workoutTrainees } = await supabase
          .from('workout_trainees')
          .select(`
            workouts!inner (
              id,
              workout_date,
              is_completed,
              workout_exercises (
                id,
                order_index,
                exercises (
                  id,
                  name
                ),
                exercise_sets (
                  set_number,
                  weight,
                  reps
                )
              )
            )
          `)
          .eq('trainee_id', session.trainee.id)
          .eq('workouts.is_completed', true)
          .order('workouts(workout_date)', { ascending: false })
          .limit(1);

        if (workoutTrainees && workoutTrainees.length > 0) {
          setLastWorkout(workoutTrainees[0].workouts);
        }
      } catch (err) {
        console.error('Error loading last workout:', err);
      }
    };

    loadLastWorkout();
  }, [session?.trainee?.id, session?.workout?.id, welcomeScreenShown]);

  // Show welcome screen when first exercise appears, but hide it after first set is filled
  // Only show once per workout (tracked by workout ID)
  useEffect(() => {
    const currentWorkoutId = session?.workout?.id;
    if (!currentWorkoutId || welcomeScreenShown === currentWorkoutId) return;
    
    if (session?.workout?.exercises && session.workout.exercises.length > 0 && session?.trainee) {
      // Check if any exercise has at least one set with data (weight or reps > 0)
      const hasFilledSet = session.workout.exercises.some(exercise => 
        exercise.sets?.some(set => (set.weight || 0) > 0 || (set.reps || 0) > 0)
      );
      
      if (!hasFilledSet) {
        // Show welcome screen only if no sets are filled yet
        setShowWelcomeScreen(true);
        const timer = setTimeout(() => {
          setShowWelcomeScreen(false);
        }, 6000); // Show for 6 seconds
        return () => clearTimeout(timer);
      } else {
        // If sets are already filled, mark as shown so it doesn't appear again
        setWelcomeScreenShown(currentWorkoutId);
        setShowWelcomeScreen(false);
      }
    }
  }, [session?.workout?.exercises, session?.workout?.id, welcomeScreenShown, session?.trainee]);

  // Hide welcome screen when first set is filled and mark workout as shown
  useEffect(() => {
    const currentWorkoutId = session?.workout?.id;
    if (!currentWorkoutId || welcomeScreenShown === currentWorkoutId) return;
    
    if (showWelcomeScreen && session?.workout?.exercises) {
      const hasFilledSet = session.workout.exercises.some(exercise => 
        exercise.sets?.some(set => (set.weight || 0) > 0 || (set.reps || 0) > 0)
      );
      
      if (hasFilledSet) {
        setShowWelcomeScreen(false);
        setWelcomeScreenShown(currentWorkoutId); // Mark this workout as shown
      }
    }
  }, [showWelcomeScreen, session?.workout?.exercises, session?.workout?.id, welcomeScreenShown]);

  // Show confetti when a new PR is detected
  useEffect(() => {
    if (latestRecord) {
      setShowConfetti(true);
      setShowPRMessage(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      const messageTimer = setTimeout(() => {
        setShowPRMessage(false);
      }, 5000);
      return () => {
        clearTimeout(timer);
        clearTimeout(messageTimer);
      };
    }
  }, [latestRecord]);

  // Update clock every second for TV display
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const initials = useMemo(() => {
    if (!session?.trainee?.full_name) return '';
    const parts = session.trainee.full_name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0]}${parts[1][0]}`;
  }, [session?.trainee?.full_name]);

  // Calculate completed exercises with progress comparison (moved before currentExercise to avoid circular dependency)
  const completedExercisesData = useMemo(() => {
    if (!session?.workout?.exercises || session.workout.exercises.length === 0) return [];
    
    const exercisesData = session.workout.exercises.map((exercise) => {
      const sets = exercise.sets || [];
      
      // Filter out empty sets (weight=0 and reps=0) for calculations
      const validSets = sets.filter(set => (set.weight || 0) > 0 || (set.reps || 0) > 0);
      
      // Sort sets by set_number for display
      const sortedSets = [...sets].sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
      
      const totalReps = validSets.reduce((sum, set) => sum + (set.reps || 0), 0);
      const maxWeight = validSets.length > 0 
        ? Math.max(...validSets.map(set => set.weight || 0), 0)
        : 0;
      const totalVolume = validSets.reduce((sum, set) => sum + ((set.weight || 0) * (set.reps || 0)), 0);
      const completedSets = validSets.length;
      const totalSets = sets.length;
      
      // Check if exercise is completed:
      // 1. All sets must exist (totalSets > 0)
      // 2. All sets must have at least weight OR reps > 0 (completedSets === totalSets)
      // 3. For exercises with weight: need volume > 0
      // 4. For exercises without weight (bodyweight): all sets filled with reps is enough
      const hasAnyData = totalSets > 0 && completedSets > 0;
      const allSetsFilled = completedSets === totalSets && totalSets > 0;
      const hasValidVolume = totalVolume > 0;
      const hasReps = validSets.some(set => (set.reps || 0) > 0);
      const hasWeight = validSets.some(set => (set.weight || 0) > 0);
      
      // Exercise is completed if:
      // - All sets are filled AND
      // - (Has weight AND volume > 0) OR (No weight but has reps)
      const isCompleted = allSetsFilled && (hasValidVolume || (!hasWeight && hasReps));
      
      // Exercise is "in progress" if it has some data but not all sets are filled
      const isInProgress = hasAnyData && !allSetsFilled;
      
      // Check if any set has failure
      const hasFailure = validSets.some(set => set.failure === true);
      
      // Get previous workout data for comparison - use best set from previous workout
      const previous = progressData.previousWorkoutData.get(exercise.id);
      let progressIndicator: 'up' | 'down' | 'same' | null = null;
      let progressPercent = 0;
      let progressType: 'volume' | 'weight' | 'reps' | null = null;
      let progressDetails = '';
      
      if (previous && totalVolume > 0) {
        // Compare total volume of current exercise vs previous best set volume
        const previousVolume = previous.weight * previous.reps;
        if (previousVolume > 0) {
          progressPercent = ((totalVolume - previousVolume) / previousVolume) * 100;
          progressType = 'volume';
          if (Math.abs(progressPercent) < 1) {
            progressIndicator = 'same';
            progressDetails = `נפח זהה: ${Math.round(totalVolume)} ק״ג`;
          } else if (progressPercent > 0) {
            progressIndicator = 'up';
            progressDetails = `נפח: ${Math.round(previousVolume)} → ${Math.round(totalVolume)} ק״ג`;
          } else {
            progressIndicator = 'down';
            progressDetails = `נפח: ${Math.round(previousVolume)} → ${Math.round(totalVolume)} ק״ג`;
          }
        }
        
        // Also check weight and reps for more detailed comparison
        if (previous.weight > 0 && maxWeight > previous.weight) {
          const weightPercent = ((maxWeight - previous.weight) / previous.weight) * 100;
          if (weightPercent > Math.abs(progressPercent)) {
            progressType = 'weight';
            progressPercent = weightPercent;
            progressIndicator = 'up';
            progressDetails = `משקל: ${previous.weight} → ${maxWeight} ק״ג`;
          }
        }
        if (previous.reps > 0 && totalReps > previous.reps) {
          const repsPercent = ((totalReps - previous.reps) / previous.reps) * 100;
          if (repsPercent > Math.abs(progressPercent)) {
            progressType = 'reps';
            progressPercent = repsPercent;
            progressIndicator = 'up';
            progressDetails = `חזרות: ${previous.reps} → ${totalReps}`;
          }
        }
      }
      
      return {
        id: exercise.id,
        name: exercise.name,
        isCompleted,
        maxWeight,
        totalReps,
        totalVolume,
        completedSets,
        totalSets,
        hasFailure,
        progressIndicator,
        progressPercent: Math.round(progressPercent * 10) / 10,
        progressType,
        progressDetails,
        previousData: previous,
        sets: sortedSets, // Include sets for display
        exercise: exercise, // Keep reference to original exercise
      };
    });
    
    return exercisesData;
  }, [session?.workout?.exercises, progressData.previousWorkoutData]);

  // Get current exercise (first non-completed, or last completed if all are completed)
  const currentExercise = useMemo(() => {
    if (!session?.workout?.exercises || session.workout.exercises.length === 0) return null;
    if (completedExercisesData.length === 0) return null;
    
    // Find first non-completed exercise
    const firstNonCompleted = completedExercisesData.find(ex => !ex.isCompleted);
    if (firstNonCompleted) {
      return firstNonCompleted.exercise;
    }
    
    // If all exercises are completed, return the last one
    const lastCompleted = completedExercisesData[completedExercisesData.length - 1];
    return lastCompleted?.exercise || null;
  }, [session?.workout?.exercises, completedExercisesData]);

  // Get latest set from current exercise
  const latestSet = useMemo(() => {
    if (!currentExercise || !currentExercise.sets || currentExercise.sets.length === 0) return null;
    // Get the set with the highest set_number (most recent)
    return currentExercise.sets.reduce((latest, set) => {
      return (set.set_number || 0) > (latest.set_number || 0) ? set : latest;
    }, currentExercise.sets[0]);
  }, [currentExercise]);

  // Calculate detailed stats for current exercise - updates in real-time
  const exerciseStats = useMemo(() => {
    if (!currentExercise || !currentExercise.sets || currentExercise.sets.length === 0) return null;
    
    const sets = currentExercise.sets;
    // Filter out completely empty sets for calculations
    const validSets = sets.filter(set => (set.weight || 0) > 0 || (set.reps || 0) > 0);
    
    const totalReps = validSets.reduce((sum, set) => sum + (set.reps || 0), 0);
    const maxWeight = validSets.length > 0 
      ? Math.max(...validSets.map(set => set.weight || 0), 0)
      : 0;
    const totalVolume = validSets.reduce((sum, set) => sum + ((set.weight || 0) * (set.reps || 0)), 0);
    const completedSets = validSets.length;
    const totalSets = sets.length;
    
    return {
      totalReps,
      maxWeight,
      totalVolume,
      completedSets,
      totalSets,
    };
  }, [currentExercise]);

  // Get progress comparison for current exercise
  const progressComparison = useMemo(() => {
    if (!currentExercise || !latestSet || !progressData.previousWorkoutData) return null;
    
    const previous = progressData.previousWorkoutData.get(currentExercise.id);
    if (!previous) return null;

    const currentWeight = latestSet.weight || 0;
    const currentReps = latestSet.reps || 0;
    const currentVolume = currentWeight * currentReps;
    const previousVolume = previous.weight * previous.reps;

    if (currentVolume === 0 || previousVolume === 0) return null;

    const improvement = ((currentVolume - previousVolume) / previousVolume) * 100;

    return {
      previousWeight: previous.weight,
      previousReps: previous.reps,
      currentWeight,
      currentReps,
      improvement: Math.round(improvement * 10) / 10,
      isImprovement: improvement > 0,
    };
  }, [currentExercise, latestSet, progressData.previousWorkoutData]);

  const firstExercises = useMemo(() => {
    if (!session?.workout?.exercises) return [];
    return session.workout.exercises.slice(0, 6);
  }, [session?.workout?.exercises]);

  // Sort completedExercisesData for display: active exercise first, then by completion status
  const sortedCompletedExercisesData = useMemo(() => {
    const activeExerciseId = currentExercise?.id;
    return [...completedExercisesData].sort((a, b) => {
      // Active exercise always first
      if (a.id === activeExerciseId) return -1;
      if (b.id === activeExerciseId) return 1;
      // Then by completion status
      if (a.isCompleted && !b.isCompleted) return 1;
      if (!a.isCompleted && b.isCompleted) return -1;
      // Then by original order (keep original index)
      return 0;
    });
  }, [completedExercisesData, currentExercise]);

  const latestLogs = logs.slice(0, 6);

  const isUnauthorized = !user || userType !== 'trainer';

  return (
    <div 
      className="h-screen w-screen overflow-hidden flex flex-col relative tv-view-container bg-emerald-50 dark:bg-gradient-dark"
    >
      {/* Enhanced Confetti animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(100)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            >
              <div
                className="w-4 h-4 rounded-sm"
                style={{
                  backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316'][Math.floor(Math.random() * 7)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                  boxShadow: `0 0 10px ${['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316'][Math.floor(Math.random() * 7)]}40`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Welcome Screen */}
      {showWelcomeScreen && session?.trainee && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowWelcomeScreen(false)}
        >
          <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white px-12 py-8 2xl:px-20 2xl:py-12 rounded-3xl 2xl:rounded-[2rem] shadow-glow-xl animate-scale-in border-4 2xl:border-[6px] border-white/30 backdrop-blur-sm max-w-4xl mx-4">
            <div className="flex flex-col items-center gap-4 2xl:gap-6">
              <div className="tv-heading-xl font-extrabold text-center animate-tv-number-pop">
                ברוך הבא {session.trainee.full_name}!
              </div>
              {lastWorkout && (
                <div className="w-full mt-4 2xl:mt-6">
                  <div className="tv-text-lg font-semibold text-center mb-4 2xl:mb-6">
                    האימון שבוצע בפעם האחרונה:
                  </div>
                  <div className="bg-white/10 rounded-2xl 2xl:rounded-3xl p-6 2xl:p-8 backdrop-blur-sm">
                    <div className="tv-text-lg font-semibold mb-3 2xl:mb-4">
                      {new Date(lastWorkout.workout_date).toLocaleDateString('he-IL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    {lastWorkout.workout_exercises && lastWorkout.workout_exercises.length > 0 && (
                      <div className="space-y-2 2xl:space-y-3">
                        <div className="tv-text-lg font-semibold mb-2">תרגילים:</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 2xl:gap-3">
                          {lastWorkout.workout_exercises.slice(0, 6).map((we: any, idx: number) => {
                            const totalSets = we.exercise_sets?.length || 0;
                            const totalReps = we.exercise_sets?.reduce((sum: number, set: any) => sum + (set.reps || 0), 0) || 0;
                            const maxWeight = Math.max(...(we.exercise_sets?.map((set: any) => set.weight || 0) || [0]), 0);
                            return (
                              <div key={we.id} className="bg-white/10 rounded-xl p-3 2xl:p-4">
                                <div className="font-semibold text-lg 2xl:text-xl">{we.exercises?.name || 'תרגיל'}</div>
                                <div className="text-sm 2xl:text-base opacity-90">
                                  {maxWeight} ק״ג × {totalReps} חזרות ({totalSets} סטים)
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {lastWorkout.workout_exercises.length > 6 && (
                          <div className="text-sm 2xl:text-base opacity-75 mt-2">
                            +{lastWorkout.workout_exercises.length - 6} תרגילים נוספים
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="tv-text-lg mt-4 2xl:mt-6 opacity-90 animate-pulse">
                לחץ כדי להמשיך...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Personal Record Celebration Message */}
      {showPRMessage && latestRecord && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white px-12 py-8 2xl:px-20 2xl:py-12 rounded-3xl 2xl:rounded-[2rem] shadow-glow-xl animate-scale-in border-4 2xl:border-[6px] border-white/30 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 2xl:gap-6">
              <Trophy className="w-16 h-16 2xl:w-24 2xl:h-24 animate-bounce text-yellow-300 drop-shadow-lg" />
              <div className="tv-heading-xl font-extrabold text-center animate-tv-number-pop">שיא אישי חדש!</div>
              <div className="tv-text-lg font-semibold text-center">
                {latestRecord.exerciseName}
              </div>
              <div className="tv-number-xl animate-tv-number-pop">
                {latestRecord.type === 'max_weight' && `${latestRecord.newValue} ק״ג`}
                {latestRecord.type === 'max_reps' && `${latestRecord.newValue} חזרות`}
                {latestRecord.type === 'max_volume' && `${Math.round(latestRecord.newValue)} ק״ג`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Top Bar - Only Logo */}
      <header className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600">
            <span className="text-xl font-black text-white">N</span>
          </div>
          <span className="text-lg font-bold text-white">NEWYM</span>
        </div>
        <div className="flex items-center gap-4 text-gray-400 text-sm">
          {lastUpdated && (
            <span>
              עודכן {new Date(lastUpdated).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </header>

      {/* Full screen table layout for TV - Uses entire screen */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full p-4 2xl:p-6">
          {isUnauthorized ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-gray-900 dark:text-white text-2xl font-black mb-3">התחברות נדרשת</div>
                <p className="text-gray-500 dark:text-gray-400 text-base">
                  כדי להשתמש במצב טלוויזיה, התחבר כמדריך מהמכשיר הזה.
                </p>
              </div>
            </div>
          ) : loading && !session ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="text-gray-900 dark:text-white text-xl font-semibold">טוען אימון...</div>
              </div>
            </div>
          ) : error && !session ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-gray-900 dark:text-white text-2xl font-black mb-3">שגיאה</div>
                <p className="text-gray-500 dark:text-gray-400 text-base">{error}</p>
              </div>
            </div>
          ) : !session ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-gray-400" />
                </div>
                <div className="text-gray-900 dark:text-white text-2xl font-black mb-3">אין אימון פעיל</div>
                <p className="text-gray-500 dark:text-gray-400 text-base">
                  לא נמצא אירוע יומן פעיל כרגע. ודא שהאימונים מסונכרנים ליומן Google.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Full Screen Layout - Clean and Professional */}
              {session?.workout && ((session.workout.exercises && session.workout.exercises.length > 0) || completedExercisesData.length > 0) ? (
                <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden shadow-xl">
                  {/* Clean Header */}
                  <div className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    {/* Left: Trainee Info */}
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                        <span className="text-2xl font-black text-white">
                          {initials || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="text-xl font-black text-gray-900 dark:text-white">
                          {session?.trainee?.full_name || 'מתאמן'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {completedExercisesData.filter(e => e.isCompleted).length} מתוך {completedExercisesData.length} תרגילים הושלמו
                        </div>
                      </div>
                    </div>

                    {/* Center: Current Exercise Summary */}
                    {currentExercise && latestSet && exerciseStats && (
                      <div className="flex items-center gap-6 bg-emerald-50 dark:bg-emerald-900/30 px-6 py-3 rounded-xl border border-emerald-200 dark:border-emerald-700">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {currentExercise.name}
                          </span>
                        </div>
                        <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600 dark:text-gray-300">
                            <span className="font-medium">סט:</span> {latestSet.set_number}
                          </span>
                          <span className="text-gray-600 dark:text-gray-300">
                            <span className="font-medium">משקל:</span> {latestSet.weight ?? 0}ק״ג
                          </span>
                          <span className="text-gray-600 dark:text-gray-300">
                            <span className="font-medium">חזרות:</span> {latestSet.reps ?? 0}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Right: Time */}
                    <div className="text-left">
                      <div className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">
                        {formatClock(now)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(now)}
                      </div>
                    </div>
                  </div>

                  {/* Clean TV Table - Optimized for 55" viewing */}
                  <div className="flex-1 overflow-auto p-4">
                    <div className="grid gap-3">
                      {sortedCompletedExercisesData.map((exercise, index) => {
                        const isActiveExercise = exercise.id === currentExercise?.id;
                        return (
                          <div
                            key={exercise.id}
                            className={`rounded-2xl p-5 transition-all duration-300 ${
                              isActiveExercise
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-500 dark:to-emerald-600 text-white shadow-2xl scale-[1.02] ring-4 ring-white/50'
                                : exercise.isCompleted
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-300 dark:border-emerald-700'
                                : 'bg-white dark:bg-gray-800/60 border-2 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-6">
                              {/* Number Badge */}
                              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0 ${
                                isActiveExercise
                                  ? 'bg-white text-emerald-600'
                                  : exercise.isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                              }`}>
                                {exercise.isCompleted && !isActiveExercise ? '✓' : index + 1}
                              </div>

                              {/* Exercise Name */}
                              <div className="flex-1 min-w-0">
                                <div className={`text-2xl font-black truncate ${
                                  isActiveExercise ? 'text-white' : 'text-gray-900 dark:text-white'
                                }`}>
                                  {exercise.name}
                                  {isActiveExercise && (
                                    <span className="mr-3 px-3 py-1 text-sm bg-red-500 text-white rounded-full animate-pulse">
                                      פעיל
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Stats Grid - Clear Labels */}
                              <div className="flex items-center gap-8 flex-shrink-0">
                                {/* Weight */}
                                <div className="text-center min-w-[100px]">
                                  <div className={`text-sm font-medium mb-1 ${
                                    isActiveExercise ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    משקל
                                  </div>
                                  <div className={`text-3xl font-black ${
                                    isActiveExercise ? 'text-white' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {exercise.maxWeight > 0 ? exercise.maxWeight : '—'}
                                    {exercise.maxWeight > 0 && <span className="text-lg mr-1">ק״ג</span>}
                                  </div>
                                </div>

                                {/* Reps */}
                                <div className="text-center min-w-[80px]">
                                  <div className={`text-sm font-medium mb-1 ${
                                    isActiveExercise ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    חזרות
                                  </div>
                                  <div className={`text-3xl font-black ${
                                    isActiveExercise ? 'text-white' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {exercise.totalReps > 0 ? exercise.totalReps : '—'}
                                  </div>
                                </div>

                                {/* Volume */}
                                <div className="text-center min-w-[120px]">
                                  <div className={`text-sm font-medium mb-1 ${
                                    isActiveExercise ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    נפח כולל
                                  </div>
                                  <div className={`text-3xl font-black ${
                                    isActiveExercise ? 'text-white' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {exercise.totalVolume > 0 ? Math.round(exercise.totalVolume) : '—'}
                                    {exercise.totalVolume > 0 && <span className="text-lg mr-1">ק״ג</span>}
                                  </div>
                                </div>

                                {/* Sets Progress */}
                                <div className="text-center min-w-[100px]">
                                  <div className={`text-sm font-medium mb-1 ${
                                    isActiveExercise ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    סטים
                                  </div>
                                  <div className={`text-3xl font-black ${
                                    isActiveExercise
                                      ? 'text-white'
                                      : exercise.completedSets === exercise.totalSets
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }`}>
                                    {exercise.completedSets}/{exercise.totalSets}
                                  </div>
                                </div>

                                {/* Progress Indicator */}
                                {exercise.progressIndicator && (
                                  <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    exercise.progressIndicator === 'up'
                                      ? 'bg-emerald-100 dark:bg-emerald-900/50'
                                      : exercise.progressIndicator === 'down'
                                      ? 'bg-red-100 dark:bg-red-900/50'
                                      : 'bg-gray-100 dark:bg-gray-800'
                                  }`}>
                                    {exercise.progressIndicator === 'up' && (
                                      <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                                    )}
                                    {exercise.progressIndicator === 'down' && (
                                      <TrendingUp className="w-8 h-8 text-red-600 dark:text-red-400 rotate-180" />
                                    )}
                                    {exercise.progressIndicator === 'same' && (
                                      <span className="text-2xl font-black text-gray-500">=</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Sets Detail Row - Only for active exercise */}
                            {isActiveExercise && exercise.sets.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-white/20">
                                <div className="flex items-center gap-3 flex-wrap">
                                  {exercise.sets.map((set) => (
                                    <div
                                      key={set.id}
                                      className={`px-4 py-2 rounded-xl text-lg font-bold ${
                                        (set.weight || 0) > 0 || (set.reps || 0) > 0
                                          ? set.failure
                                            ? 'bg-red-500/30 text-red-100 border border-red-400'
                                            : 'bg-white/20 text-white border border-white/30'
                                          : 'bg-white/10 text-white/50 border border-white/10'
                                      }`}
                                    >
                                      <span className="text-emerald-200 mr-1">סט {set.set_number}:</span>
                                      {set.weight ?? 0}ק״ג × {set.reps ?? 0}
                                      {set.failure && <span className="mr-2">⚠️</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : session?.workout ? (
                <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div className="text-center max-w-lg">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                      <Target className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-gray-900 dark:text-white text-3xl font-black mb-3">
                      ממתין לתרגילים
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      האימון זוהה מהיומן. התרגילים יופיעו כאן ברגע שיוספו.
                    </p>
                    <div className="mt-6 flex justify-center">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

    </div>
  );
}

// Memoize component for better performance
export default memo(StudioTvView);
