import { useMemo, useState, useEffect, memo, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCurrentTvSession } from '../../../hooks/useCurrentTvSession';
import { useTraineeProgressData } from '../../../hooks/useTraineeProgressData';
import { usePersonalRecordDetection } from '../../../hooks/usePersonalRecordDetection';
import { Card } from '../../ui/Card';
import { useThemeClasses } from '../../../contexts/ThemeContext';
import { Flame, TrendingUp, Trophy, Calendar, Target } from 'lucide-react';
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

      {/* Compact Top bar for TV */}
      <header className="tv-header flex items-center justify-between px-8 2xl:px-12 py-4 2xl:py-6 border-b-2 border-primary/30 shadow-lg bg-gradient-dark">
        <div className="flex items-center gap-6 2xl:gap-8">
          <div className="tv-logo h-16 w-16 2xl:h-20 2xl:w-20 rounded-2xl 2xl:rounded-3xl flex items-center justify-center shadow-glow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 animate-glow-slow">
            <span className="text-3xl 2xl:text-4xl font-extrabold tracking-tight text-white">N</span>
          </div>
          <div>
            <div className="text-black dark:text-white text-3xl 2xl:text-5xl font-black">
              {session?.trainee?.full_name ?? 'מתאמן'}
            </div>
            {session?.calendarEvent?.summary && (
              <div className="text-black dark:text-gray-300 text-lg 2xl:text-2xl mt-1 font-semibold">
                {session.calendarEvent.summary}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-8 2xl:gap-12">
          <div className="text-right">
            <div className="tv-clock text-4xl 2xl:text-6xl font-black tracking-tight leading-none text-black dark:text-white">
              {formatClock(now)}
            </div>
            <div className="text-black dark:text-gray-300 text-xl 2xl:text-2xl mt-1 font-semibold">{formatDate(now)}</div>
          </div>
          {lastUpdated && (
            <div className="text-black dark:text-gray-300 text-base 2xl:text-lg font-semibold">
              עודכן: {new Date(lastUpdated).toLocaleTimeString('he-IL', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          )}
        </div>
      </header>

      {/* Full screen table layout for TV - Uses entire screen */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full p-4 2xl:p-6">
          {isUnauthorized ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="text-black dark:text-white text-3xl font-semibold">התחברות נדרשת</div>
              <p className="text-black dark:text-gray-300 text-xl max-w-xl text-center font-semibold">
                כדי להשתמש במצב טלוויזיה, התחבר כמדריך מהמכשיר הזה.
                לאחר ההתחברות, המסך יזהה אוטומטית את האימון הפעיל מהיומן.
              </p>
            </div>
          ) : loading && !session ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-in">
              <div className="relative">
                <div className="h-20 w-20 border-4 rounded-full animate-spin border-emerald-500/40 border-t-emerald-500" />
                <div className="absolute inset-0 h-20 w-20 rounded-full animate-ping border-2 border-emerald-500/20" />
              </div>
              <div className="text-black dark:text-white tv-text-lg animate-pulse font-semibold">טוען את האימון הנוכחי מהיומן...</div>
            </div>
          ) : error && !session ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-fade-in">
              <div className="text-3xl font-semibold text-red-600 dark:text-red-500 mb-2">⚠️ שגיאה במצב טלוויזיה</div>
              <p className="text-black dark:text-white tv-text-lg max-w-xl text-center font-semibold">{error}</p>
            </div>
          ) : !session ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-in">
              <div className="text-black dark:text-white tv-heading-xl font-semibold text-center">אין אימון פעיל כרגע</div>
              <p className="text-black dark:text-gray-300 tv-text-lg max-w-2xl text-center leading-relaxed font-semibold">
                לא נמצא אירוע יומן פעיל לסטודיו בזמן הנוכחי.
                ודא שהאימונים שלך מסונכרנים ליומן Google וששעת האימון תואמת לשעה הנוכחית.
              </p>
            </div>
          ) : (
            <>
              {/* Full Screen Table for TV - Main Focus - Uses entire screen */}
              {session?.workout && ((session.workout.exercises && session.workout.exercises.length > 0) || completedExercisesData.length > 0) ? (
                <div className="h-full w-full flex flex-col bg-emerald-50 dark:bg-gradient-dark border-2 border-black dark:border-primary/30 shadow-glow-xl overflow-hidden">
                  {/* Compact Table Header */}
                  <div className="flex items-center justify-between px-6 2xl:px-8 py-4 2xl:py-5 border-b-4 border-black dark:border-primary/40 bg-emerald-100 dark:bg-primary/5 flex-shrink-0">
                    <div className="flex items-center gap-4 2xl:gap-6">
                      <div className="tv-trainee-badge h-16 w-16 2xl:h-20 2xl:w-20 rounded-2xl flex items-center justify-center shadow-glow-xl bg-gradient-primary">
                        <span className="text-3xl 2xl:text-4xl font-extrabold text-white">
                          {initials || '?'}
                        </span>
                      </div>
                      <div>
                        <h1 className="tv-heading-xl text-3xl 2xl:text-5xl font-black text-black dark:text-white">
                          תרגילים באימון
                        </h1>
                        <div className="text-black dark:text-gray-300 text-lg 2xl:text-xl mt-1 font-semibold">
                          {completedExercisesData.filter(e => e.isCompleted).length} / {completedExercisesData.length} הושלמו
                        </div>
                      </div>
                    </div>
                    {currentExercise && latestSet && exerciseStats && (
                      <div className="flex items-center gap-6 2xl:gap-8 bg-gradient-to-r from-emerald-200/80 to-emerald-100/80 dark:from-emerald-500/30 dark:to-emerald-500/20 px-6 py-4 2xl:px-8 2xl:py-5 rounded-2xl 2xl:rounded-3xl border-3 border-emerald-400 dark:border-emerald-500/50 shadow-xl">
                        <div className="text-right flex-1">
                          <div className="text-black dark:text-white text-lg 2xl:text-xl mb-2 font-bold uppercase tracking-wide">תרגיל נוכחי</div>
                          <div className="text-black dark:text-white text-2xl 2xl:text-4xl font-black mb-2 tv-active-exercise-name">
                            {currentExercise.name}
                          </div>
                          <div className="flex items-center gap-4 2xl:gap-6 text-black dark:text-white">
                            <div className="text-base 2xl:text-lg font-bold">
                              <span className="text-emerald-700 dark:text-emerald-300">סט {latestSet.set_number}:</span> {latestSet.weight ?? 0} ק״ג × {latestSet.reps ?? 0}
                            </div>
                            <div className="text-base 2xl:text-lg font-bold">
                              <span className="text-emerald-700 dark:text-emerald-300">נפח:</span> {Math.round(exerciseStats.totalVolume)} ק״ג
                            </div>
                            <div className="text-base 2xl:text-lg font-bold">
                              <span className="text-emerald-700 dark:text-emerald-300">סטים:</span> {exerciseStats.completedSets}/{exerciseStats.totalSets}
                            </div>
                          </div>
                        </div>
                        <div className="px-6 py-3 2xl:px-8 2xl:py-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white text-xl 2xl:text-2xl font-black animate-pulse shadow-glow-xl border-3 border-red-700 dark:border-red-400">
                          🔴 LIVE
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Full Screen Table - Takes entire screen space */}
                  <div className="flex-1 overflow-auto">
                    <table className="w-full" style={{ fontSize: 'clamp(1.25rem, 3vw, 2.5rem)' }}>
                      <thead className="sticky top-0 z-10 bg-gradient-to-r from-emerald-200 to-emerald-300 dark:from-emerald-600/40 dark:to-emerald-500/40 border-b-4 border-black dark:border-primary/50 shadow-lg">
                        <tr>
                          <th className={`text-right py-5 2xl:py-7 px-5 2xl:px-7 text-black dark:text-white font-black text-2xl 2xl:text-3xl uppercase tracking-wider bg-emerald-300 dark:bg-primary/20 border-r-3 border-black dark:border-primary/30`}>#</th>
                          <th className={`text-right py-5 2xl:py-7 px-5 2xl:px-7 text-black dark:text-white font-black text-2xl 2xl:text-3xl uppercase tracking-wider bg-emerald-300 dark:bg-primary/20 border-r-3 border-black dark:border-primary/30`}>תרגיל</th>
                          <th className={`text-right py-5 2xl:py-7 px-5 2xl:px-7 text-black dark:text-white font-black text-2xl 2xl:text-3xl uppercase tracking-wider bg-emerald-300 dark:bg-primary/20 border-r-3 border-black dark:border-primary/30`}>סטטוס</th>
                          <th className={`text-right py-5 2xl:py-7 px-5 2xl:px-7 text-black dark:text-white font-black text-2xl 2xl:text-3xl uppercase tracking-wider bg-emerald-300 dark:bg-primary/20 border-r-3 border-black dark:border-primary/30`}>משקל מקס׳</th>
                          <th className={`text-right py-5 2xl:py-7 px-5 2xl:px-7 text-black dark:text-white font-black text-2xl 2xl:text-3xl uppercase tracking-wider bg-emerald-300 dark:bg-primary/20 border-r-3 border-black dark:border-primary/30`}>חזרות</th>
                          <th className={`text-right py-5 2xl:py-7 px-5 2xl:px-7 text-black dark:text-white font-black text-2xl 2xl:text-3xl uppercase tracking-wider bg-emerald-300 dark:bg-primary/20 border-r-3 border-black dark:border-primary/30`}>נפח</th>
                          <th className={`text-right py-5 2xl:py-7 px-5 2xl:px-7 text-black dark:text-white font-black text-2xl 2xl:text-3xl uppercase tracking-wider bg-emerald-300 dark:bg-primary/20 border-r-3 border-black dark:border-primary/30`}>סטים</th>
                          <th className={`text-right py-5 2xl:py-7 px-5 2xl:px-7 text-black dark:text-white font-black text-2xl 2xl:text-3xl uppercase tracking-wider bg-emerald-300 dark:bg-primary/20 border-r-3 border-black dark:border-primary/30`}>פרטי סטים</th>
                          <th className={`text-right py-5 2xl:py-7 px-5 2xl:px-7 text-black dark:text-white font-black text-2xl 2xl:text-3xl uppercase tracking-wider bg-emerald-300 dark:bg-primary/20`}>התקדמות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCompletedExercisesData.map((exercise, index) => {
                          const isActiveExercise = exercise.id === currentExercise?.id;
                          return (
                          <tr 
                            key={exercise.id}
                            className={`border-b-4 border-black dark:border-primary/30 transition-all duration-500 ${
                              exercise.isCompleted 
                                ? 'bg-emerald-100 dark:bg-emerald-500/15' 
                                : 'bg-emerald-50 dark:bg-amber-500/10'
                            } ${isActiveExercise 
                              ? 'tv-active-exercise-row ring-6 ring-emerald-500 dark:ring-emerald-400 ring-offset-4 ring-offset-emerald-50 dark:ring-offset-emerald-900/50 bg-gradient-to-r from-emerald-200 via-emerald-100 to-emerald-200 dark:from-emerald-500/30 dark:via-emerald-500/20 dark:to-emerald-500/30 shadow-2xl shadow-emerald-500/50 dark:shadow-emerald-400/30' 
                              : 'hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10'
                            }`}
                          >
                            <td className={`${isActiveExercise ? 'py-8 2xl:py-12' : 'py-6 2xl:py-8'} px-4 2xl:px-6 text-center border-r-3 border-black dark:border-primary/30`}>
                              {isActiveExercise ? (
                                <div className="w-20 h-20 2xl:w-24 2xl:h-24 rounded-full flex items-center justify-center text-3xl 2xl:text-4xl font-black mx-auto border-4 border-emerald-600 dark:border-emerald-400 bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500 text-white shadow-glow-xl animate-tv-active-badge-pulse">
                                  <span className="relative">
                                    {index + 1}
                                    <span className="absolute -top-1 -right-1 w-4 h-4 2xl:w-5 2xl:h-5 bg-red-500 rounded-full border-2 border-white animate-ping"></span>
                                  </span>
                                </div>
                              ) : (
                                <div className={`w-14 h-14 2xl:w-18 2xl:h-18 rounded-full flex items-center justify-center text-xl 2xl:text-2xl font-black mx-auto border-2 border-black dark:border-transparent ${
                                  exercise.isCompleted 
                                    ? 'bg-emerald-500 text-white shadow-glow-lg dark:bg-emerald-500' 
                                    : 'bg-amber-500 text-white dark:bg-amber-500/30 dark:text-amber-500'
                                }`}>
                                  {index + 1}
                                </div>
                              )}
                            </td>
                            <td className={`${isActiveExercise ? 'py-8 2xl:py-12' : 'py-6 2xl:py-8'} px-4 2xl:px-6 text-black dark:text-white font-black ${isActiveExercise ? 'text-3xl 2xl:text-5xl' : 'text-xl 2xl:text-2xl'} border-r-3 border-black dark:border-primary/30`}>
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                  <span className={isActiveExercise ? 'tv-active-exercise-name' : ''}>
                                    {exercise.name}
                                  </span>
                                  {isActiveExercise && (
                                    <span className="px-3 py-1 2xl:px-4 2xl:py-2 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white text-sm 2xl:text-base font-black border-2 border-emerald-700 dark:border-emerald-400 shadow-lg animate-pulse-slow">
                                      נוכחי
                                    </span>
                                  )}
                                  {exercise.hasFailure && (
                                    <span className="text-red-600 dark:text-red-400 text-2xl 2xl:text-3xl" title="היה כשל בסט כלשהו">
                                      ⚠️
                                    </span>
                                  )}
                                </div>
                                {/* Show superset exercises below main exercise */}
                                {isActiveExercise && exercise.sets.some(set => set.superset_exercise_id) && (
                                  <div className="text-sm 2xl:text-base text-purple-600 dark:text-purple-400 font-semibold mt-1">
                                    {exercise.sets
                                      .filter(set => set.superset_exercise_id)
                                      .map((set, setIdx) => {
                                        const supersetExercise = session?.workout?.exercises?.find(ex => ex.id === set.superset_exercise_id);
                                        return supersetExercise ? (
                                          <span key={setIdx} className="mr-2">
                                            + {supersetExercise.name} ({set.superset_weight ?? 0}×{set.superset_reps ?? 0})
                                          </span>
                                        ) : null;
                                      })
                                      .filter(Boolean)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className={`${isActiveExercise ? 'py-8 2xl:py-12' : 'py-6 2xl:py-8'} px-4 2xl:px-6 border-r-3 border-black dark:border-primary/30`}>
                              {exercise.isCompleted ? (
                                <span className={`px-4 py-2 2xl:px-6 2xl:py-3 rounded-full bg-emerald-500 text-white dark:bg-emerald-500/30 dark:text-emerald-400 ${isActiveExercise ? 'text-xl 2xl:text-2xl' : 'text-lg 2xl:text-xl'} font-black border-3 border-black dark:border-emerald-500/50 shadow-glow-lg animate-pulse-slow inline-block`}>
                                  ✓ הושלם
                                </span>
                              ) : (
                                <span className={`px-4 py-2 2xl:px-6 2xl:py-3 rounded-full bg-amber-500 text-white dark:bg-amber-500/30 dark:text-amber-400 ${isActiveExercise ? 'text-xl 2xl:text-2xl' : 'text-lg 2xl:text-xl'} font-black border-3 border-black dark:border-amber-500/50 inline-block`}>
                                  בתהליך
                                </span>
                              )}
                            </td>
                            <td className={`${isActiveExercise ? 'py-8 2xl:py-12' : 'py-6 2xl:py-8'} px-4 2xl:px-6 text-black dark:text-white ${isActiveExercise ? 'text-2xl 2xl:text-4xl' : 'text-xl 2xl:text-2xl'} font-black text-center border-r-3 border-black dark:border-primary/30`}>
                              {exercise.maxWeight > 0 ? `${exercise.maxWeight} ק״ג` : '—'}
                            </td>
                            <td className={`${isActiveExercise ? 'py-8 2xl:py-12' : 'py-6 2xl:py-8'} px-4 2xl:px-6 text-black dark:text-white ${isActiveExercise ? 'text-2xl 2xl:text-4xl' : 'text-xl 2xl:text-2xl'} font-black text-center border-r-3 border-black dark:border-primary/30`}>
                              {exercise.totalReps > 0 ? exercise.totalReps : '—'}
                            </td>
                            <td className={`${isActiveExercise ? 'py-8 2xl:py-12' : 'py-6 2xl:py-8'} px-4 2xl:px-6 text-black dark:text-white ${isActiveExercise ? 'text-2xl 2xl:text-4xl' : 'text-xl 2xl:text-2xl'} font-black text-center border-r-3 border-black dark:border-primary/30`}>
                              {exercise.totalVolume > 0 ? `${Math.round(exercise.totalVolume)} ק״ג` : '—'}
                            </td>
                            <td className={`${isActiveExercise ? 'py-8 2xl:py-12' : 'py-6 2xl:py-8'} px-4 2xl:px-6 ${isActiveExercise ? 'text-2xl 2xl:text-4xl' : 'text-xl 2xl:text-2xl'} font-black text-center border-r-3 border-black dark:border-primary/30`}>
                              <span className={exercise.completedSets === exercise.totalSets ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500'}>
                                {exercise.completedSets}/{exercise.totalSets}
                              </span>
                            </td>
                            <td className={`${isActiveExercise ? 'py-8 2xl:py-12' : 'py-6 2xl:py-8'} px-4 2xl:px-6 border-r-3 border-black dark:border-primary/30`}>
                              <div className="flex flex-wrap gap-2 2xl:gap-3 justify-end">
                                {exercise.sets.slice(0, 5).map((set) => {
                                  const hasSuperset = set.superset_exercise_id && ((set.superset_weight || 0) > 0 || (set.superset_reps || 0) > 0);
                                  const hasDropset = (set.dropset_weight || 0) > 0 || (set.dropset_reps || 0) > 0;
                                  const setType = set.set_type;
                                  const isSuperset = setType === 'superset';
                                  const isDropset = setType === 'dropset';
                                  const hasEquipment = set.equipment && set.equipment.name;
                                  
                                  return (
                                    <div
                                      key={set.id}
                                      className={`px-2 py-1 2xl:px-3 2xl:py-2 rounded-lg text-base 2xl:text-lg font-bold border border-black dark:border-primary/40 flex flex-col gap-1 ${
                                        (set.weight || 0) > 0 || (set.reps || 0) > 0
                                          ? set.failure
                                            ? 'bg-red-200 text-black dark:bg-red-500/30 dark:text-red-300'
                                            : 'bg-emerald-200 text-black dark:bg-primary/20 dark:text-primary'
                                          : 'bg-gray-200 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1">
                                        <span className={isSuperset ? 'text-purple-600 dark:text-purple-400' : isDropset ? 'text-orange-600 dark:text-orange-400' : ''}>
                                          {set.set_number}: {set.weight ?? 0}×{set.reps ?? 0}
                                        </span>
                                        {set.failure && (
                                          <span className="text-red-600 dark:text-red-400 text-sm 2xl:text-base" title="כשל">
                                            ⚠️
                                          </span>
                                        )}
                                        {isSuperset && (
                                          <span className="text-purple-600 dark:text-purple-400 text-xs font-bold" title="סופר-סט">
                                            SS
                                          </span>
                                        )}
                                        {isDropset && (
                                          <span className="text-orange-600 dark:text-orange-400 text-xs font-bold" title="דרופ-סט">
                                            DS
                                          </span>
                                        )}
                                        {hasEquipment && (
                                          <span className="text-blue-600 dark:text-blue-400 text-xs" title={set.equipment.name}>
                                            {set.equipment.emoji || '🎒'}
                                          </span>
                                        )}
                                      </div>
                                      {hasSuperset && (
                                        <div className="text-xs 2xl:text-sm text-purple-700 dark:text-purple-300 font-semibold">
                                          +{set.superset_weight ?? 0}×{set.superset_reps ?? 0}
                                        </div>
                                      )}
                                      {hasDropset && (
                                        <div className="text-xs 2xl:text-sm text-orange-700 dark:text-orange-300 font-semibold">
                                          ↓{set.dropset_weight ?? 0}×{set.dropset_reps ?? 0}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {exercise.sets.length > 5 && (
                                  <div className="px-2 py-1 2xl:px-3 2xl:py-2 rounded-lg text-base 2xl:text-lg font-bold bg-emerald-200 text-black dark:bg-primary/10 dark:text-primary border border-black dark:border-primary/30">
                                    +{exercise.sets.length - 5}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className={`${isActiveExercise ? 'py-8 2xl:py-12' : 'py-6 2xl:py-8'} px-4 2xl:px-6 text-center`}>
                              {exercise.progressIndicator === 'up' && (
                                <div className="flex flex-col items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 animate-pulse-slow">
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="w-6 h-6 2xl:w-8 2xl:h-8" />
                                    <span className="text-xl 2xl:text-2xl font-black">+{Math.abs(exercise.progressPercent)}%</span>
                                  </div>
                                  {exercise.progressDetails && (
                                    <span className="text-xs 2xl:text-sm font-semibold opacity-80 dark:text-emerald-300 text-emerald-800">
                                      {exercise.progressDetails}
                                    </span>
                                  )}
                                </div>
                              )}
                              {exercise.progressIndicator === 'down' && (
                                <div className="flex flex-col items-center justify-center gap-1 text-red-600 dark:text-red-400">
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="w-6 h-6 2xl:w-8 2xl:h-8 rotate-180" />
                                    <span className="text-xl 2xl:text-2xl font-black">{exercise.progressPercent}%</span>
                                  </div>
                                  {exercise.progressDetails && (
                                    <span className="text-xs 2xl:text-sm font-semibold opacity-80 dark:text-red-300 text-red-800">
                                      {exercise.progressDetails}
                                    </span>
                                  )}
                                </div>
                              )}
                              {exercise.progressIndicator === 'same' && (
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className="text-3xl 2xl:text-4xl font-black dark:text-gray-400 text-gray-800">=</span>
                                  {exercise.progressDetails && (
                                    <span className="text-xs 2xl:text-sm font-semibold opacity-80 dark:text-gray-400 text-gray-800">
                                      {exercise.progressDetails}
                                    </span>
                                  )}
                                </div>
                              )}
                              {!exercise.progressIndicator && (
                                <span className="dark:text-gray-400 text-black text-lg 2xl:text-xl">—</span>
                              )}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : session?.workout ? (
                <div className="h-full w-full flex items-center justify-center bg-emerald-50 dark:bg-gradient-dark">
                  <div className="text-center">
                    <div className="text-black dark:text-white text-4xl 2xl:text-6xl font-black mb-4">
                      ממתין לתרגילים
                    </div>
                    <p className="text-black dark:text-gray-300 text-2xl 2xl:text-3xl font-semibold">
                      האימון זוהה מהיומן, אבל טרם נוספו לו תרגילים במערכת.
                      <br />
                      <span className="text-xl 2xl:text-2xl mt-2 inline-block animate-pulse">
                        התרגילים יופיעו כאן ברגע שיוספו לאימון...
                      </span>
                    </p>
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
