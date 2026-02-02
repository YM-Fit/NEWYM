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
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [completionScreenShown, setCompletionScreenShown] = useState<string | null>(null);
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
        }, 4000); // Show for 4 seconds (faster)
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
        pair_member: exercise.pair_member || null, // For pair workouts
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

  // Detect if this is a pair workout
  const isPairWorkout = useMemo(() => {
    // Check if trainee is marked as pair
    if (session?.trainee?.isPair) return true;
    // Or check if any exercise has pair_member
    return completedExercisesData.some(ex => ex.pair_member);
  }, [session?.trainee?.isPair, completedExercisesData]);

  // Split exercises by member for pair workouts
  const member1Exercises = useMemo(() => {
    if (!isPairWorkout) return [];
    return sortedCompletedExercisesData.filter(ex => ex.pair_member === 'member_1');
  }, [isPairWorkout, sortedCompletedExercisesData]);

  const member2Exercises = useMemo(() => {
    if (!isPairWorkout) return [];
    return sortedCompletedExercisesData.filter(ex => ex.pair_member === 'member_2');
  }, [isPairWorkout, sortedCompletedExercisesData]);

  // Get pair member names
  const pairName1 = session?.trainee?.pairName1 || 'מתאמן 1';
  const pairName2 = session?.trainee?.pairName2 || 'מתאמן 2';

  // Calculate overall workout progress percentage
  const overallProgress = useMemo(() => {
    if (completedExercisesData.length === 0) return { percentage: 0, completedExercises: 0, totalExercises: 0, completedSets: 0, totalSets: 0 };

    const completedExercises = completedExercisesData.filter(e => e.isCompleted).length;
    const totalExercises = completedExercisesData.length;
    const completedSets = completedExercisesData.reduce((sum, e) => sum + (e.completedSets || 0), 0);
    const totalSets = completedExercisesData.reduce((sum, e) => sum + (e.totalSets || 0), 0);

    // Calculate percentage based on sets completed (more granular than exercises)
    const percentage = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    return { percentage, completedExercises, totalExercises, completedSets, totalSets };
  }, [completedExercisesData]);

  // Show completion celebration when workout is 100% complete
  useEffect(() => {
    const currentWorkoutId = session?.workout?.id;
    if (!currentWorkoutId || completionScreenShown === currentWorkoutId) return;

    if (overallProgress.percentage === 100 && overallProgress.totalExercises > 0) {
      setShowCompletionScreen(true);
      setShowConfetti(true);
      setCompletionScreenShown(currentWorkoutId);

      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        setShowCompletionScreen(false);
        setShowConfetti(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [overallProgress.percentage, overallProgress.totalExercises, session?.workout?.id, completionScreenShown]);

  const latestLogs = logs.slice(0, 6);

  const isUnauthorized = !user || userType !== 'trainer';

  return (
    <div
      className="overflow-hidden flex flex-col relative tv-view-container bg-white dark:bg-gray-900"
      style={{ width: '100vw', height: '100vh' }}
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

      {/* Welcome Screen - Enhanced with workout info and clear states */}
      {showWelcomeScreen && session?.trainee && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
          onClick={() => setShowWelcomeScreen(false)}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}></div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-10 right-10 text-emerald-500/20 text-[150px] font-black animate-pulse">💪</div>
          <div className="absolute bottom-10 left-10 text-emerald-500/20 text-[120px] font-black animate-pulse" style={{ animationDelay: '0.5s' }}>🏋️</div>

          <div className="relative z-10 text-center max-w-5xl mx-auto px-12">
            {/* Status Badge */}
            <div className="mb-6 animate-[fade-in-up_0.5s_ease-out]">
              <span className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-lg font-bold">
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                אימון מתחיל
              </span>
            </div>

            {/* Logo/Avatar */}
            <div className="mb-8 flex justify-center">
              {isPairWorkout ? (
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30 animate-[scale-in_0.5s_ease-out]">
                    <span className="text-5xl font-black text-white">1</span>
                  </div>
                  <div className="text-5xl text-white/50">+</div>
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-[scale-in_0.5s_ease-out_0.1s_both]">
                    <span className="text-5xl font-black text-white">2</span>
                  </div>
                </div>
              ) : (
                <div className="w-36 h-36 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-[scale-in_0.5s_ease-out]">
                  <span className="text-6xl font-black text-white">{initials || '👋'}</span>
                </div>
              )}
            </div>

            {/* Welcome Text */}
            <h1 className="text-7xl font-black text-white mb-4 animate-[fade-in-up_0.5s_ease-out_0.2s_both]">
              {isPairWorkout ? (
                <>ברוכים הבאים!</>
              ) : (
                <>ברוך הבא, {session.trainee.full_name?.split(' ')[0]}!</>
              )}
            </h1>

            {isPairWorkout && (
              <p className="text-3xl text-emerald-400 font-semibold mb-8 animate-[fade-in-up_0.5s_ease-out_0.3s_both]">
                {pairName1} + {pairName2}
              </p>
            )}

            {/* Today's Workout Info */}
            <div className="mt-8 animate-[fade-in-up_0.5s_ease-out_0.35s_both]">
              <p className="text-gray-300 text-xl mb-4">האימון של היום:</p>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-center gap-10 text-white">
                  <div className="text-center">
                    <div className="text-4xl font-black text-emerald-400 mb-1">
                      {session?.workout?.exercises?.length || completedExercisesData.length || 0}
                    </div>
                    <div className="text-base text-gray-300">תרגילים</div>
                  </div>
                  <div className="w-px h-16 bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-cyan-400 mb-1">
                      {(session?.workout?.exercises || []).reduce((sum, ex) => sum + (ex.sets?.length || 0), 0)}
                    </div>
                    <div className="text-base text-gray-300">סטים</div>
                  </div>
                  <div className="w-px h-16 bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-amber-400 mb-1">
                      0%
                    </div>
                    <div className="text-base text-gray-300">הושלם</div>
                  </div>
                </div>

                {/* Progress bar at 0% */}
                <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-1000"></div>
                </div>
              </div>
            </div>

            {/* Last Workout Summary - Compact */}
            {lastWorkout && (
              <div className="mt-4 animate-[fade-in-up_0.5s_ease-out_0.45s_both]">
                <p className="text-gray-500 text-sm">באימון הקודם: {Math.round(lastWorkout.workout_exercises?.reduce((sum: number, we: any) =>
                  sum + (we.exercise_sets?.reduce((setSum: number, set: any) =>
                    setSum + ((set.weight || 0) * (set.reps || 0)), 0) || 0), 0) || 0).toLocaleString()} ק״ג נפח</p>
              </div>
            )}

            {/* Motivational Message */}
            <div className="mt-6 animate-[fade-in-up_0.5s_ease-out_0.5s_both]">
              <p className="text-xl text-white/80 font-medium">
                {['בואו נעשה את זה! 💪', 'היום נשבור שיאים! 🏆', 'אימון חזק מתחיל עכשיו! 🔥', 'הגוף שלך יודה לך! ⭐'][Math.floor(Date.now() / 86400000) % 4]}
              </p>
            </div>

            {/* Continue Hint */}
            <div className="mt-8 animate-[fade-in-up_0.5s_ease-out_0.6s_both]">
              <div className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-500/20 rounded-full border border-emerald-500/30 text-emerald-400 text-xl font-bold cursor-pointer hover:bg-emerald-500/30 transition-all">
                <span>לחץ להתחלה</span>
                <span className="animate-bounce">👆</span>
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

      {/* Workout Completion Celebration Screen */}
      {showCompletionScreen && session?.trainee && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900"
          onClick={() => setShowCompletionScreen(false)}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute text-4xl animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${4 + Math.random() * 4}s`,
                }}
              >
                {['🎉', '💪', '🏆', '⭐', '🔥'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>

          <div className="relative z-10 text-center max-w-4xl mx-auto px-8">
            {/* Celebration Icon */}
            <div className="mb-8 animate-[scale-in_0.5s_ease-out]">
              <div className="w-36 h-36 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-2xl shadow-yellow-500/50 animate-pulse">
                <Trophy className="w-20 h-20 text-white" />
              </div>
            </div>

            {/* Completion Text */}
            <h1 className="text-6xl font-black text-white mb-4 animate-[fade-in-up_0.5s_ease-out_0.2s_both]">
              כל הכבוד! 🎉
            </h1>
            <p className="text-2xl text-emerald-300 font-bold mb-8 animate-[fade-in-up_0.5s_ease-out_0.3s_both]">
              {isPairWorkout ? `${pairName1} + ${pairName2}` : session.trainee.full_name?.split(' ')[0]} - סיימת את האימון!
            </p>

            {/* Final Stats */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 animate-[fade-in-up_0.5s_ease-out_0.4s_both]">
              <div className="grid grid-cols-4 gap-6 text-white">
                <div className="text-center">
                  <div className="text-4xl font-black text-emerald-400 mb-1">
                    {overallProgress.completedExercises}
                  </div>
                  <div className="text-base text-gray-300">תרגילים</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-cyan-400 mb-1">
                    {overallProgress.completedSets}
                  </div>
                  <div className="text-base text-gray-300">סטים</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-amber-400 mb-1">
                    {completedExercisesData.reduce((sum, e) => sum + (e.totalReps || 0), 0)}
                  </div>
                  <div className="text-base text-gray-300">חזרות</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-purple-400 mb-1">
                    {Math.round(completedExercisesData.reduce((sum, e) => sum + (e.totalVolume || 0), 0)).toLocaleString()}
                  </div>
                  <div className="text-base text-gray-300">ק״ג נפח</div>
                </div>
              </div>

              {/* Progress comparison with last workout */}
              {lastWorkout && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="text-base text-gray-300">
                    {(() => {
                      const lastVolume = lastWorkout.workout_exercises?.reduce((sum: number, we: any) =>
                        sum + (we.exercise_sets?.reduce((setSum: number, set: any) =>
                          setSum + ((set.weight || 0) * (set.reps || 0)), 0) || 0), 0) || 0;
                      const currentVolume = completedExercisesData.reduce((sum, e) => sum + (e.totalVolume || 0), 0);
                      const diff = currentVolume - lastVolume;
                      const percent = lastVolume > 0 ? Math.round((diff / lastVolume) * 100) : 0;

                      if (diff > 0) {
                        return (
                          <span className="text-emerald-400 font-bold">
                            📈 {percent}% יותר נפח מהאימון הקודם! (+{Math.round(diff).toLocaleString()} ק״ג)
                          </span>
                        );
                      } else if (diff < 0) {
                        return (
                          <span className="text-gray-400">
                            נפח: {Math.round(currentVolume).toLocaleString()} ק״ג (קודם: {Math.round(lastVolume).toLocaleString()} ק״ג)
                          </span>
                        );
                      }
                      return <span className="text-gray-400">נפח זהה לאימון הקודם</span>;
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Dismiss hint */}
            <div className="mt-6 animate-[fade-in-up_0.5s_ease-out_0.6s_both]">
              <p className="text-gray-400 text-base">לחץ לסגירה</p>
            </div>
          </div>
        </div>
      )}

      {/* Full screen layout for TV - No top bar, maximizes screen usage */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full">
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
                <div className="h-full w-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
                  {/* Header - Larger for TV */}
                  <div className="flex items-center justify-between px-10 py-5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                    {/* Left: Trainee Info */}
                    <div className="flex items-center gap-6">
                      {isPairWorkout ? (
                        <>
                          {/* Pair workout - show both names */}
                          <div className="flex items-center gap-3">
                            <div className="h-16 w-16 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg">
                              <span className="text-2xl font-black text-white">1</span>
                            </div>
                            <div className="h-16 w-16 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                              <span className="text-2xl font-black text-white">2</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">
                              {pairName1} + {pairName2}
                            </div>
                            <div className="text-base text-gray-500 dark:text-gray-400">
                              אימון זוגי
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-20 w-20 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                            <span className="text-4xl font-black text-white">
                              {initials || '?'}
                            </span>
                          </div>
                          <div>
                            <div className="text-4xl font-black text-gray-900 dark:text-white">
                              {session?.trainee?.full_name || 'מתאמן'}
                            </div>
                            <div className="text-lg text-gray-500 dark:text-gray-400">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {completedExercisesData.filter(e => e.isCompleted).length}
                              </span>
                              {' '}מתוך{' '}
                              <span className="font-bold">{completedExercisesData.length}</span>
                              {' '}תרגילים
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Center: Progress Circle + Stats */}
                    <div className="flex items-center gap-6">
                      {/* Large Progress Circle */}
                      <div className="relative w-24 h-24 flex-shrink-0">
                        {/* Background circle */}
                        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 80 80">
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-gray-200 dark:text-gray-700"
                          />
                          {/* Progress circle */}
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            className={`transition-all duration-500 ${
                              overallProgress.percentage === 100
                                ? 'text-emerald-500'
                                : overallProgress.percentage >= 75
                                ? 'text-cyan-500'
                                : overallProgress.percentage >= 50
                                ? 'text-blue-500'
                                : overallProgress.percentage >= 25
                                ? 'text-amber-500'
                                : 'text-gray-400'
                            }`}
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - overallProgress.percentage / 100)}`}
                          />
                        </svg>
                        {/* Percentage text in center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-2xl font-black ${
                            overallProgress.percentage === 100
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {overallProgress.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-8 bg-gray-50 dark:bg-gray-800 px-8 py-3 rounded-xl">
                        <div className="text-center">
                          <div className="text-sm text-gray-400">נפח</div>
                          <div className="text-2xl font-black text-gray-900 dark:text-white">
                            {Math.round(completedExercisesData.reduce((sum, e) => sum + (e.totalVolume || 0), 0))}
                            <span className="text-base mr-0.5">ק״ג</span>
                          </div>
                        </div>
                        <div className="h-10 w-px bg-gray-200 dark:bg-gray-700"></div>
                        <div className="text-center">
                          <div className="text-sm text-gray-400">סטים</div>
                          <div className="text-2xl font-black text-gray-900 dark:text-white">
                            {overallProgress.completedSets}
                            <span className="text-base mr-0.5 text-gray-400">/{overallProgress.totalSets}</span>
                          </div>
                        </div>
                        <div className="h-10 w-px bg-gray-200 dark:bg-gray-700"></div>
                        <div className="text-center">
                          <div className="text-sm text-gray-400">חזרות</div>
                          <div className="text-2xl font-black text-gray-900 dark:text-white">
                            {completedExercisesData.reduce((sum, e) => sum + (e.totalReps || 0), 0)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Time */}
                    <div className="text-left">
                      <div className="text-6xl font-black text-gray-900 dark:text-white tabular-nums">
                        {formatClock(now)}
                      </div>
                      <div className="text-lg text-gray-500 dark:text-gray-400">
                        {formatDate(now)}
                      </div>
                    </div>
                  </div>

                  {/* TV Exercise Cards - Optimized for 55" viewing */}
                  <div className="flex-1 overflow-auto px-6 py-4">
                    {isPairWorkout ? (
                      /* Split Screen Layout for Pair Workouts */
                      <div className="grid grid-cols-2 gap-6 h-full">
                        {/* Member 1 Column */}
                        <div className="flex flex-col">
                          <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-6 py-3 rounded-t-xl mb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center font-black text-xl">1</span>
                                <span className="text-2xl font-bold">{pairName1}</span>
                              </div>
                              <div className="text-base">
                                {member1Exercises.filter(e => e.isCompleted).length}/{member1Exercises.length} תרגילים
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 overflow-auto space-y-3">
                            {member1Exercises.map((exercise, index) => {
                              const isActiveExercise = exercise.id === currentExercise?.id;
                              const setsProgress = exercise.totalSets > 0 ? (exercise.completedSets / exercise.totalSets) * 100 : 0;
                              const hasSupersets = exercise.sets.some(set => set.superset_exercise_id || set.set_type === 'superset');
                              const hasDropsets = exercise.sets.some(set => (set.dropset_weight || 0) > 0 || set.set_type === 'dropset');
                              const supersetExerciseNames = exercise.sets.filter(set => set.superset_exercise?.name).map(set => set.superset_exercise!.name).filter((name, idx, arr) => arr.indexOf(name) === idx);
                              const equipmentList = exercise.sets.filter(set => set.equipment?.name).map(set => ({ emoji: set.equipment?.emoji || '🏋️', name: set.equipment?.name })).filter((eq, idx, arr) => arr.findIndex(e => e.name === eq.name) === idx);

                              return (
                                <div key={exercise.id} className={`rounded-xl p-5 transition-all ${isActiveExercise ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg ring-2 ring-cyan-300/50' : exercise.isCompleted ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800' : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                                  <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl font-black ${isActiveExercise ? 'bg-white text-cyan-600' : exercise.isCompleted ? 'bg-cyan-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                      {exercise.isCompleted && !isActiveExercise ? '✓' : index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className={`text-2xl font-bold truncate ${isActiveExercise ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{exercise.name}</div>
                                      <div className="flex items-center gap-3 flex-wrap mt-1">
                                        {hasSupersets && <span className={`text-sm px-3 py-1 rounded ${isActiveExercise ? 'bg-purple-400/30 text-purple-100' : 'bg-purple-100 text-purple-600'}`}>🔗 {supersetExerciseNames[0] || 'סופר-סט'}</span>}
                                        {hasDropsets && <span className={`text-sm px-3 py-1 rounded ${isActiveExercise ? 'bg-orange-400/30 text-orange-100' : 'bg-orange-100 text-orange-600'}`}>⬇️ דרופ</span>}
                                        {equipmentList[0] && <span className={`text-sm px-3 py-1 rounded ${isActiveExercise ? 'bg-blue-400/30 text-blue-100' : 'bg-blue-100 text-blue-600'}`}>{equipmentList[0].emoji}</span>}
                                        {exercise.hasFailure && <span className="text-base">⚠️</span>}
                                      </div>
                                    </div>
                                    <div className="text-left flex-shrink-0">
                                      <div className={`text-3xl font-black ${isActiveExercise ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{exercise.maxWeight > 0 ? `${exercise.maxWeight}ק״ג` : '—'}</div>
                                      <div className={`text-base ${isActiveExercise ? 'text-cyan-100' : 'text-gray-500'}`}>{exercise.completedSets}/{exercise.totalSets} סטים</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {member1Exercises.length === 0 && <div className="text-center text-gray-400 py-8">אין תרגילים</div>}
                          </div>
                        </div>

                        {/* Member 2 Column */}
                        <div className="flex flex-col">
                          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-t-xl mb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center font-black text-xl">2</span>
                                <span className="text-2xl font-bold">{pairName2}</span>
                              </div>
                              <div className="text-base">
                                {member2Exercises.filter(e => e.isCompleted).length}/{member2Exercises.length} תרגילים
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 overflow-auto space-y-3">
                            {member2Exercises.map((exercise, index) => {
                              const isActiveExercise = exercise.id === currentExercise?.id;
                              const setsProgress = exercise.totalSets > 0 ? (exercise.completedSets / exercise.totalSets) * 100 : 0;
                              const hasSupersets = exercise.sets.some(set => set.superset_exercise_id || set.set_type === 'superset');
                              const hasDropsets = exercise.sets.some(set => (set.dropset_weight || 0) > 0 || set.set_type === 'dropset');
                              const supersetExerciseNames = exercise.sets.filter(set => set.superset_exercise?.name).map(set => set.superset_exercise!.name).filter((name, idx, arr) => arr.indexOf(name) === idx);
                              const equipmentList = exercise.sets.filter(set => set.equipment?.name).map(set => ({ emoji: set.equipment?.emoji || '🏋️', name: set.equipment?.name })).filter((eq, idx, arr) => arr.findIndex(e => e.name === eq.name) === idx);

                              return (
                                <div key={exercise.id} className={`rounded-xl p-5 transition-all ${isActiveExercise ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg ring-2 ring-emerald-300/50' : exercise.isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                                  <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl font-black ${isActiveExercise ? 'bg-white text-emerald-600' : exercise.isCompleted ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                      {exercise.isCompleted && !isActiveExercise ? '✓' : index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className={`text-2xl font-bold truncate ${isActiveExercise ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{exercise.name}</div>
                                      <div className="flex items-center gap-3 flex-wrap mt-1">
                                        {hasSupersets && <span className={`text-sm px-3 py-1 rounded ${isActiveExercise ? 'bg-purple-400/30 text-purple-100' : 'bg-purple-100 text-purple-600'}`}>🔗 {supersetExerciseNames[0] || 'סופר-סט'}</span>}
                                        {hasDropsets && <span className={`text-sm px-3 py-1 rounded ${isActiveExercise ? 'bg-orange-400/30 text-orange-100' : 'bg-orange-100 text-orange-600'}`}>⬇️ דרופ</span>}
                                        {equipmentList[0] && <span className={`text-sm px-3 py-1 rounded ${isActiveExercise ? 'bg-blue-400/30 text-blue-100' : 'bg-blue-100 text-blue-600'}`}>{equipmentList[0].emoji}</span>}
                                        {exercise.hasFailure && <span className="text-base">⚠️</span>}
                                      </div>
                                    </div>
                                    <div className="text-left flex-shrink-0">
                                      <div className={`text-3xl font-black ${isActiveExercise ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{exercise.maxWeight > 0 ? `${exercise.maxWeight}ק״ג` : '—'}</div>
                                      <div className={`text-base ${isActiveExercise ? 'text-emerald-100' : 'text-gray-500'}`}>{exercise.completedSets}/{exercise.totalSets} סטים</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {member2Exercises.length === 0 && <div className="text-center text-gray-400 py-8">אין תרגילים</div>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Single Column Layout for Personal Workouts */
                      <div className="grid gap-5">
                        {sortedCompletedExercisesData.map((exercise, index) => {
                        const isActiveExercise = exercise.id === currentExercise?.id;
                        const setsProgress = exercise.totalSets > 0 ? (exercise.completedSets / exercise.totalSets) * 100 : 0;

                        // Check for superset/dropset in sets
                        const hasSupersets = exercise.sets.some(set => set.superset_exercise_id || set.set_type === 'superset');
                        const hasDropsets = exercise.sets.some(set => (set.dropset_weight || 0) > 0 || set.set_type === 'dropset');

                        // Get unique superset exercise names
                        const supersetExerciseNames = exercise.sets
                          .filter(set => set.superset_exercise?.name)
                          .map(set => set.superset_exercise!.name)
                          .filter((name, idx, arr) => arr.indexOf(name) === idx);

                        // Get unique equipment from sets
                        const equipmentList = exercise.sets
                          .filter(set => set.equipment?.name)
                          .map(set => ({ emoji: set.equipment?.emoji || '🏋️', name: set.equipment?.name }))
                          .filter((eq, idx, arr) => arr.findIndex(e => e.name === eq.name) === idx);

                        return (
                          <div
                            key={exercise.id}
                            className={`rounded-2xl p-6 transition-all duration-300 ${
                              isActiveExercise
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-xl ring-2 ring-emerald-300/50'
                                : exercise.isCompleted
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            {/* Main Row */}
                            <div className="flex items-center gap-6">
                              {/* Number Badge */}
                              <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black flex-shrink-0 ${
                                isActiveExercise
                                  ? 'bg-white text-emerald-600'
                                  : exercise.isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                              }`}>
                                {exercise.isCompleted && !isActiveExercise ? '✓' : index + 1}
                              </div>

                              {/* Exercise Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-4">
                                  <span className={`text-3xl font-bold ${
                                    isActiveExercise ? 'text-white' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {exercise.name}
                                  </span>
                                  {isActiveExercise && (
                                    <span className="px-4 py-2 text-base bg-red-500 text-white rounded-full animate-pulse font-bold">
                                      🔴 עכשיו
                                    </span>
                                  )}
                                  {exercise.hasFailure && (
                                    <span className="text-2xl" title="כשל">⚠️</span>
                                  )}
                                </div>

                                {/* Superset / Dropset / Equipment - Below exercise name */}
                                <div className="flex items-center gap-3 flex-wrap mt-2">
                                  {hasSupersets && (
                                    <span className={`text-base font-medium px-3 py-1 rounded ${
                                      isActiveExercise
                                        ? 'bg-purple-400/30 text-purple-100'
                                        : 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                                    }`}>
                                      🔗 {supersetExerciseNames.length > 0 ? supersetExerciseNames.join(', ') : 'סופר-סט'}
                                    </span>
                                  )}
                                  {hasDropsets && (
                                    <span className={`text-base font-medium px-3 py-1 rounded ${
                                      isActiveExercise
                                        ? 'bg-orange-400/30 text-orange-100'
                                        : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'
                                    }`}>
                                      ⬇️ דרופ-סט
                                    </span>
                                  )}
                                  {equipmentList.map((eq, eqIdx) => (
                                    <span
                                      key={eqIdx}
                                      className={`text-base font-medium px-3 py-1 rounded ${
                                        isActiveExercise
                                          ? 'bg-blue-400/30 text-blue-100'
                                          : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                      }`}
                                    >
                                      {eq.emoji} {eq.name}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Stats - Compact */}
                              <div className="flex items-center gap-8 flex-shrink-0">
                                {/* Weight */}
                                <div className="text-center">
                                  <div className={`text-base font-medium ${
                                    isActiveExercise ? 'text-emerald-100' : 'text-gray-400'
                                  }`}>
                                    משקל מקס׳
                                  </div>
                                  <div className={`text-4xl font-black ${
                                    isActiveExercise ? 'text-white' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {exercise.maxWeight > 0 ? (
                                      <>{exercise.maxWeight}<span className="text-lg mr-1">ק״ג</span></>
                                    ) : '—'}
                                  </div>
                                </div>

                                {/* Reps */}
                                <div className="text-center">
                                  <div className={`text-base font-medium ${
                                    isActiveExercise ? 'text-emerald-100' : 'text-gray-400'
                                  }`}>
                                    סה״כ חזרות
                                  </div>
                                  <div className={`text-4xl font-black ${
                                    isActiveExercise ? 'text-white' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {exercise.totalReps > 0 ? exercise.totalReps : '—'}
                                  </div>
                                </div>

                                {/* Volume */}
                                <div className="text-center">
                                  <div className={`text-base font-medium ${
                                    isActiveExercise ? 'text-emerald-100' : 'text-gray-400'
                                  }`}>
                                    נפח כולל
                                  </div>
                                  <div className={`text-4xl font-black ${
                                    isActiveExercise ? 'text-white' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {exercise.totalVolume > 0 ? (
                                      <>{Math.round(exercise.totalVolume)}<span className="text-lg mr-1">ק״ג</span></>
                                    ) : '—'}
                                  </div>
                                </div>

                                {/* Sets Progress - Visual */}
                                <div className="text-center min-w-[140px]">
                                  <div className={`text-base font-medium ${
                                    isActiveExercise ? 'text-emerald-100' : 'text-gray-400'
                                  }`}>
                                    סטים
                                  </div>
                                  <div className={`text-4xl font-black mb-2 ${
                                    isActiveExercise
                                      ? 'text-white'
                                      : exercise.completedSets === exercise.totalSets
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-amber-500'
                                  }`}>
                                    {exercise.completedSets}/{exercise.totalSets}
                                  </div>
                                  {/* Progress Bar */}
                                  <div className={`h-2 rounded-full overflow-hidden ${
                                    isActiveExercise ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-700'
                                  }`}>
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        isActiveExercise
                                          ? 'bg-white'
                                          : exercise.completedSets === exercise.totalSets
                                          ? 'bg-emerald-500'
                                          : 'bg-amber-500'
                                      }`}
                                      style={{ width: `${setsProgress}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Progress Indicator */}
                                <div className={`w-20 h-18 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                                  isActiveExercise
                                    ? 'bg-white/20'
                                    : exercise.progressIndicator === 'up'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/50'
                                    : exercise.progressIndicator === 'down'
                                    ? 'bg-red-100 dark:bg-red-900/50'
                                    : 'bg-gray-100 dark:bg-gray-800'
                                }`}>
                                  {exercise.progressIndicator === 'up' ? (
                                    <>
                                      <TrendingUp className={`w-6 h-6 ${isActiveExercise ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                                      <span className={`text-sm font-black ${isActiveExercise ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        +{Math.abs(exercise.progressPercent || 0)}%
                                      </span>
                                    </>
                                  ) : exercise.progressIndicator === 'down' ? (
                                    <>
                                      <TrendingUp className={`w-6 h-6 rotate-180 ${isActiveExercise ? 'text-white' : 'text-red-600 dark:text-red-400'}`} />
                                      <span className={`text-sm font-black ${isActiveExercise ? 'text-white' : 'text-red-600 dark:text-red-400'}`}>
                                        {exercise.progressPercent || 0}%
                                      </span>
                                    </>
                                  ) : exercise.progressIndicator === 'same' ? (
                                    <span className={`text-xl font-black ${isActiveExercise ? 'text-white' : 'text-gray-500'}`}>=</span>
                                  ) : (
                                    <span className={`text-base font-medium ${isActiveExercise ? 'text-white/50' : 'text-gray-400'}`}>—</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Sets Detail Row - Only for active exercise */}
                            {isActiveExercise && exercise.sets.length > 0 && (
                              <div className="mt-6 pt-6 border-t border-white/20">
                                <div className="flex items-center gap-6 flex-wrap">
                                  {exercise.sets.map((set) => {
                                    const isFilled = (set.weight || 0) > 0 || (set.reps || 0) > 0;
                                    const hasSuperset = set.superset_exercise_id && ((set.superset_weight || 0) > 0 || (set.superset_reps || 0) > 0);
                                    const hasDropset = (set.dropset_weight || 0) > 0 || (set.dropset_reps || 0) > 0;

                                    return (
                                      <div
                                        key={set.id}
                                        className={`px-7 py-4 rounded-2xl text-2xl font-bold transition-all ${
                                          isFilled
                                            ? set.failure
                                              ? 'bg-red-500/40 text-white border-2 border-red-300'
                                              : 'bg-white/25 text-white border-2 border-white/40'
                                            : 'bg-white/10 text-white/40 border-2 border-white/10'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-emerald-200 font-black">סט {set.set_number}</span>
                                          <span className="text-white/50">|</span>
                                          <span>{set.weight ?? 0}ק״ג</span>
                                          <span className="text-white/50">×</span>
                                          <span>{set.reps ?? 0}</span>
                                          {set.failure && <span className="mr-1">⚠️</span>}
                                          {set.equipment?.emoji && (
                                            <span className="mr-1" title={set.equipment.name}>{set.equipment.emoji}</span>
                                          )}
                                        </div>
                                        {/* Superset detail */}
                                        {hasSuperset && (
                                          <div className="text-lg text-purple-200 mt-2">
                                            🔗 {set.superset_exercise?.name || 'סופר-סט'}: {set.superset_weight ?? 0}ק״ג × {set.superset_reps ?? 0}
                                          </div>
                                        )}
                                        {/* Dropset detail */}
                                        {hasDropset && (
                                          <div className="text-lg text-orange-200 mt-2">
                                            ⬇️ {set.dropset_weight ?? 0}ק״ג × {set.dropset_reps ?? 0}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    )}
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
