import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCurrentTvSession } from '../../../hooks/useCurrentTvSession';
import { useTraineeProgressData } from '../../../hooks/useTraineeProgressData';
import { usePersonalRecordDetection } from '../../../hooks/usePersonalRecordDetection';
import { Card } from '../../ui/Card';
import { useThemeClasses } from '../../../contexts/ThemeContext';
import { Flame, TrendingUp, Trophy, Calendar, Target } from 'lucide-react';

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

export default function StudioTvView({ pollIntervalMs }: StudioTvViewProps) {
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
  const [showNewSetFlash, setShowNewSetFlash] = useState(false);
  const [previousSetId, setPreviousSetId] = useState<string | null>(null);
  
  // TV-optimized inline styles to ensure compatibility with WebOS and other Smart TV browsers
  // These override CSS that may not work correctly on TV browsers
  // Enhanced for 55" 4K displays with improved contrast (WCAG AA compliant)
  const tvStyles = {
    container: {
      backgroundColor: '#0d0d1a', // Deeper dark blue for better contrast
      color: '#ffffff',
    },
    text: {
      color: '#ffffff',
    },
    textMuted: {
      color: '#b8b8b8', // Lighter gray for better readability from distance
    },
    textHighlight: {
      color: '#4ade80', // Bright green for important numbers
    },
    card: {
      backgroundColor: '#1a1a2e', // Slightly lighter for card contrast
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    header: {
      backgroundColor: '#1a1a2e', // Match cards
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    // Safe area padding for TV overscan (3-5% of screen)
    safeArea: {
      padding: '2.5%',
    },
  };

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

  // Live clock that updates every second
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Detect new set and trigger flash animation
  useEffect(() => {
    if (latestSet && latestSet.id !== previousSetId && previousSetId !== null) {
      // New set detected! Show flash animation
      setShowNewSetFlash(true);
      const timer = setTimeout(() => setShowNewSetFlash(false), 1500);
      return () => clearTimeout(timer);
    }
    if (latestSet) {
      setPreviousSetId(latestSet.id);
    }
  }, [latestSet?.id, previousSetId]);

  const initials = useMemo(() => {
    if (!session?.trainee?.full_name) return '';
    const parts = session.trainee.full_name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0]}${parts[1][0]}`;
  }, [session?.trainee?.full_name]);

  // Get current exercise - the one with the most recent set update
  const currentExercise = useMemo(() => {
    if (!session?.workout?.exercises || session.workout.exercises.length === 0) return null;

    // Find exercise with the most recently updated set (by set data, not just position)
    let latestExercise = session.workout.exercises[0];
    let latestSetData: { weight: number; reps: number; setNumber: number } | null = null;

    for (const exercise of session.workout.exercises) {
      if (exercise.sets && exercise.sets.length > 0) {
        // Find the last set with actual data (weight or reps)
        const setsWithData = exercise.sets.filter(s => s.weight !== null || s.reps !== null);
        if (setsWithData.length > 0) {
          const lastSet = setsWithData[setsWithData.length - 1];
          // Use the exercise with the most recent set that has data
          if (!latestSetData || (lastSet.updated_at && lastSet.updated_at > (latestExercise.sets[0]?.updated_at || ''))) {
            latestExercise = exercise;
            latestSetData = {
              weight: lastSet.weight || 0,
              reps: lastSet.reps || 0,
              setNumber: lastSet.set_number || 1
            };
          }
        }
      }
    }

    return latestExercise;
  }, [session?.workout?.exercises]);

  // Get latest set from current exercise - the most recent set with actual data
  const latestSet = useMemo(() => {
    if (!currentExercise || !currentExercise.sets || currentExercise.sets.length === 0) return null;

    // Filter sets that have actual data (weight or reps)
    const setsWithData = currentExercise.sets.filter(s => s.weight !== null || s.reps !== null);

    if (setsWithData.length === 0) {
      // No sets with data yet, return the first set
      return currentExercise.sets[0];
    }

    // Return the set with the highest set_number that has data
    return setsWithData.reduce((latest, set) => {
      return (set.set_number || 0) > (latest.set_number || 0) ? set : latest;
    }, setsWithData[0]);
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

  const latestLogs = logs.slice(0, 6);

  const isUnauthorized = !user || userType !== 'trainer';

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col relative tv-view-container tv-safe-area`}
      style={{...tvStyles.container, ...tvStyles.safeArea}}
    >
      {/* Confetti animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'][Math.floor(Math.random() * 5)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Personal Record Celebration Message - Enhanced for 55" 4K TV */}
      {showPRMessage && latestRecord && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-12 py-8 2xl:px-20 2xl:py-12 5xl:px-32 5xl:py-20 rounded-3xl 2xl:rounded-[2rem] 5xl:rounded-[3rem] shadow-2xl animate-scale-in border-4 2xl:border-[6px] 5xl:border-8 border-white/30 tv-pr-celebration">
            <div className="flex flex-col items-center gap-4 2xl:gap-6 5xl:gap-10">
              <Trophy className="w-16 h-16 2xl:w-24 2xl:h-24 5xl:w-40 5xl:h-40 animate-bounce" />
              <div className="text-5xl 2xl:text-7xl 5xl:text-10xl font-extrabold">שיא אישי חדש!</div>
              <div className="text-2xl 2xl:text-4xl 5xl:text-6xl font-semibold text-center">
                {latestRecord.exerciseName}
              </div>
              <div className="text-xl 2xl:text-3xl 5xl:text-5xl">
                {latestRecord.type === 'max_weight' && `${latestRecord.newValue} ק״ג`}
                {latestRecord.type === 'max_reps' && `${latestRecord.newValue} חזרות`}
                {latestRecord.type === 'max_volume' && `${Math.round(latestRecord.newValue)} ק״ג`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header 
        className="flex items-center justify-between px-6 md:px-12 2xl:px-16 py-6 2xl:py-8 border-b shadow-lg"
        style={tvStyles.header}
      >
        <div className="flex items-center gap-4 2xl:gap-6">
          <div 
            className="h-14 w-14 2xl:h-20 2xl:w-20 rounded-2xl 2xl:rounded-3xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: '#10b981' }}
          >
            <span className="text-2xl 2xl:text-4xl font-extrabold tracking-tight" style={{ color: '#ffffff' }}>N</span>
          </div>
          <div>
            <div className="text-sm 2xl:text-xl" style={tvStyles.textMuted}>מצב טלוויזיה · סטודיו</div>
            <div className="text-xl 2xl:text-3xl font-semibold" style={tvStyles.text}>
              {user?.email ? `מאמן: ${user.email}` : 'מחכה לחיבור מאמן'}
            </div>
          </div>
        </div>

        <div className="flex items-end gap-8 2xl:gap-12 5xl:gap-16">
          <div className="text-right">
            <div className="text-3xl md:text-5xl 2xl:text-7xl 5xl:text-9xl font-bold tracking-tight leading-none tv-clock" style={tvStyles.text}>
              {formatClock(now)}
            </div>
            <div className="text-lg 2xl:text-2xl 5xl:text-4xl mt-1 5xl:mt-3" style={tvStyles.textMuted}>{formatDate(now)}</div>
          </div>
          {lastUpdated && (
            <div className="text-sm 2xl:text-lg" style={tvStyles.textMuted}>
              עדכון אחרון:{' '}
              {new Date(lastUpdated).toLocaleTimeString('he-IL', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 gap-6 px-6 md:px-12 py-6 overflow-hidden">
        {/* Main workout area */}
        <Card variant="premium" className="flex-1 p-8 flex flex-col tv-card" padding="none" style={tvStyles.card}>
          {isUnauthorized ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="text-3xl font-semibold" style={tvStyles.text}>התחברות נדרשת</div>
              <p className="text-xl max-w-xl text-center" style={tvStyles.textMuted}>
                כדי להשתמש במצב טלוויזיה, התחבר כמדריך מהמכשיר הזה.
                לאחר ההתחברות, המסך יזהה אוטומטית את האימון הפעיל מהיומן.
              </p>
            </div>
          ) : loading && !session ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="h-20 w-20 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', borderTopColor: '#10b981' }} />
              <div className="text-2xl" style={tvStyles.text}>טוען את האימון הנוכחי מהיומן...</div>
            </div>
          ) : error && !session ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="text-3xl font-semibold" style={{ color: '#ef4444' }}>שגיאה במצב טלוויזיה</div>
              <p className="text-xl" style={tvStyles.text}>{error}</p>
            </div>
          ) : !session ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 2xl:gap-12">
              {/* Animated waiting indicator */}
              <div className="relative">
                <div className="h-32 w-32 2xl:h-48 2xl:w-48 5xl:h-64 5xl:w-64 rounded-full tv-waiting-pulse" style={{ background: 'rgba(74, 107, 42, 0.2)' }}>
                  <div className="absolute inset-4 2xl:inset-6 5xl:inset-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(74, 107, 42, 0.4)' }}>
                    <div className="text-5xl 2xl:text-7xl 5xl:text-9xl">⏳</div>
                  </div>
                </div>
              </div>
              <div className="text-4xl 2xl:text-6xl 5xl:text-8xl font-bold text-center" style={tvStyles.text}>
                ממתין לאימון הבא...
              </div>
              <p className="text-xl 2xl:text-3xl 5xl:text-4xl max-w-3xl text-center leading-relaxed" style={tvStyles.textMuted}>
                המסך יזהה אוטומטית כשיתחיל אימון מהיומן
              </p>
              {/* Clock display while waiting */}
              <div className="mt-8 2xl:mt-12">
                <div className="text-6xl 2xl:text-8xl 5xl:text-10xl font-bold tv-clock" style={tvStyles.text}>
                  {formatClock(now)}
                </div>
                <div className="text-2xl 2xl:text-4xl 5xl:text-5xl text-center mt-2" style={tvStyles.textMuted}>
                  {formatDate(now)}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Enhanced Trainee "On Stage" Display - Optimized for 55" 4K TV */}
              <div className="mb-8 md:mb-12 2xl:mb-16 5xl:mb-20">
                <div className="flex items-center gap-6 md:gap-12 2xl:gap-16 5xl:gap-24 mb-6 2xl:mb-8 5xl:mb-12">
                  <div
                    className="h-32 w-32 md:h-40 md:w-40 2xl:h-56 2xl:w-56 5xl:h-80 5xl:w-80 rounded-3xl 2xl:rounded-[2rem] 5xl:rounded-[3rem] flex items-center justify-center shadow-2xl transition-transform hover:scale-105 tv-badge-primary tv-glow"
                    style={{ backgroundColor: '#4a6b2a' }}
                  >
                    <span className="text-5xl md:text-6xl 2xl:text-8xl 5xl:text-10xl font-extrabold tracking-tight" style={{ color: '#ffffff' }}>
                      {initials || '?'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 2xl:gap-4 5xl:gap-6 flex-1">
                    <div className="text-sm md:text-base 2xl:text-xl 5xl:text-3xl uppercase tracking-[0.25em] mb-1 text-muted-tv" style={tvStyles.textMuted}>
                      מתאמן נוכחי
                    </div>
                    <div className="text-4xl md:text-6xl lg:text-7xl 2xl:text-8xl 3xl:text-[10rem] 5xl:text-[14rem] font-extrabold tracking-tight leading-tight tv-trainee-name" style={tvStyles.text}>
                      {session.trainee?.full_name ?? 'לא זוהה מתאמן'}
                    </div>
                    <div className="text-xl md:text-2xl 2xl:text-4xl 5xl:text-5xl mt-2 animate-fade-in text-muted-tv" style={tvStyles.textMuted}>
                      הנה אני על המסך! 🎬
                    </div>
                    {session.calendarEvent?.summary && (
                      <div className="text-lg md:text-xl 2xl:text-3xl 5xl:text-4xl mt-1 text-muted-tv" style={tvStyles.textMuted}>
                        {session.calendarEvent.summary}
                      </div>
                    )}
                  </div>
                </div>

                {/* Trainee Story - Streak, Monthly Workouts, Progress - Enhanced for 4K */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 2xl:gap-6 5xl:gap-10 mb-6 2xl:mb-8 5xl:mb-12">
                  {progressData.streakDays > 0 && (
                    <Card variant="glass" className="p-4 md:p-6 2xl:p-8 5xl:p-12 tv-card" padding="none">
                      <div className="flex items-center gap-3 2xl:gap-4 5xl:gap-8">
                        <Flame className="w-8 h-8 2xl:w-12 2xl:h-12 5xl:w-20 5xl:h-20 text-orange-500" />
                        <div>
                          <div className={`text-sm 2xl:text-xl 5xl:text-3xl ${themeClasses.textMuted}`}>רצף אימונים</div>
                          <div className={`text-2xl md:text-3xl 2xl:text-5xl 5xl:text-7xl font-bold ${themeClasses.textPrimary}`}>
                            🔥 {progressData.streakDays} ימים
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                  <Card variant="glass" className="p-4 md:p-6 2xl:p-8 5xl:p-12 tv-card" padding="none">
                    <div className="flex items-center gap-3 2xl:gap-4 5xl:gap-8">
                      <Calendar className="w-8 h-8 2xl:w-12 2xl:h-12 5xl:w-20 5xl:h-20 text-emerald-500" />
                      <div>
                        <div className={`text-sm 2xl:text-xl 5xl:text-3xl ${themeClasses.textMuted}`}>אימונים החודש</div>
                        <div className={`text-2xl md:text-3xl 2xl:text-5xl 5xl:text-7xl font-bold ${themeClasses.textPrimary}`}>
                          {progressData.workoutsThisMonth}
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card variant="glass" className="p-4 md:p-6 2xl:p-8 5xl:p-12 tv-card" padding="none">
                    <div className="flex items-center gap-3 2xl:gap-4 5xl:gap-8">
                      <Target className="w-8 h-8 2xl:w-12 2xl:h-12 5xl:w-20 5xl:h-20 text-blue-500" />
                      <div>
                        <div className={`text-sm 2xl:text-xl 5xl:text-3xl ${themeClasses.textMuted}`}>סה״כ אימונים</div>
                        <div className={`text-2xl md:text-3xl 2xl:text-5xl 5xl:text-7xl font-bold ${themeClasses.textPrimary}`}>
                          {progressData.totalWorkouts}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* LIVE Current Exercise Display - Hero section for 55" TV */}
              {currentExercise && latestSet && (
                <Card variant="premium" className="mb-6 2xl:mb-8 5xl:mb-12 p-6 md:p-8 2xl:p-12 5xl:p-16 border-primary border-4 2xl:border-[6px] 5xl:border-8 shadow-2xl shadow-primary/30 tv-live-card" padding="none">
                  <div className="flex items-center justify-between mb-4 2xl:mb-6 5xl:mb-10">
                    <div className="flex items-center gap-3 2xl:gap-4 5xl:gap-6">
                      <span className="px-4 py-2 2xl:px-6 2xl:py-3 5xl:px-10 5xl:py-5 rounded-full bg-red-500 text-white text-sm md:text-base 2xl:text-2xl 5xl:text-4xl font-bold tv-live-indicator">
                        🔴 LIVE
                      </span>
                      <div className={`text-xl md:text-2xl 2xl:text-4xl 5xl:text-6xl font-semibold ${themeClasses.textPrimary}`}>
                        מה עכשיו קורה
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 2xl:gap-8 5xl:gap-16">
                    <div>
                      <div className={`text-lg md:text-xl 2xl:text-3xl 5xl:text-5xl ${themeClasses.textMuted} mb-2 2xl:mb-4 5xl:mb-6`}>תרגיל נוכחי</div>
                      <div className={`text-3xl md:text-4xl 2xl:text-6xl 5xl:text-8xl font-bold ${themeClasses.textPrimary} mb-4 2xl:mb-6 5xl:mb-10`}>
                        {currentExercise.name}
                      </div>
                      <div className={`text-base md:text-lg 2xl:text-2xl 5xl:text-4xl ${themeClasses.textMuted}`}>
                        סט {latestSet.set_number} מתוך {currentExercise.sets.length}
                      </div>
                    </div>

                    <div className={`rounded-2xl p-4 2xl:p-6 5xl:p-10 ${showNewSetFlash ? 'tv-new-set-flash' : ''}`}>
                      <div className={`text-lg md:text-xl 2xl:text-3xl 5xl:text-5xl ${themeClasses.textMuted} mb-2 2xl:mb-4 5xl:mb-6 flex items-center gap-3`}>
                        ביצוע נוכחי
                        {showNewSetFlash && <span className="text-emerald-400 animate-pulse">✨ עודכן!</span>}
                      </div>
                      <div className={`tv-weight-display ${showNewSetFlash ? 'tv-update-ping' : ''}`} style={tvStyles.textHighlight}>
                        <span className={`text-5xl md:text-7xl 2xl:text-9xl 3xl:text-[12rem] 5xl:text-tv-giant font-extrabold`}>
                          {latestSet.weight ?? 0}
                        </span>
                        <span className="text-3xl md:text-5xl 2xl:text-7xl 3xl:text-9xl 5xl:text-10xl"> ק״ג</span>
                      </div>
                      <div className="tv-reps-display mt-2 5xl:mt-6" style={tvStyles.textHighlight}>
                        <span className={`text-5xl md:text-7xl 2xl:text-9xl 3xl:text-[12rem] 5xl:text-tv-giant font-extrabold`}>
                          × {latestSet.reps ?? 0}
                        </span>
                        <span className="text-3xl md:text-5xl 2xl:text-7xl 3xl:text-9xl 5xl:text-10xl"> חזרות</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Comparison - Enhanced for 4K */}
                  {progressComparison && progressComparison.isImprovement && (
                    <div className="mt-6 2xl:mt-8 5xl:mt-12 p-4 md:p-6 2xl:p-8 5xl:p-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl 2xl:rounded-3xl 5xl:rounded-[2rem]">
                      <div className="flex items-center gap-3 2xl:gap-4 5xl:gap-6 mb-2 2xl:mb-4 5xl:mb-6">
                        <TrendingUp className="w-6 h-6 2xl:w-10 2xl:h-10 5xl:w-16 5xl:h-16 text-emerald-500" />
                        <div className={`text-lg md:text-xl 2xl:text-3xl 5xl:text-5xl font-semibold text-emerald-600`}>
                          התקדמות!
                        </div>
                      </div>
                      <div className={`text-base md:text-lg 2xl:text-2xl 5xl:text-4xl ${themeClasses.textPrimary}`}>
                        בפעם הקודמת: {progressComparison.previousWeight} ק״ג × {progressComparison.previousReps} חזרות
                      </div>
                      <div className={`text-base md:text-lg 2xl:text-2xl 5xl:text-4xl ${themeClasses.textPrimary} font-semibold`}>
                        היום: {progressComparison.currentWeight} ק״ג × {progressComparison.currentReps} חזרות
                      </div>
                      <div className={`text-xl md:text-2xl 2xl:text-4xl 5xl:text-6xl font-bold text-emerald-600 mt-2 2xl:mt-4 5xl:mt-6`}>
                        שיפור של +{progressComparison.improvement}% 🎉
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Exercises grid */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className={`text-2xl font-semibold ${themeClasses.textPrimary}`}>אימון נוכחי</h2>
                  <div className={`text-sm ${themeClasses.textMuted}`}>
                    {session.workout
                      ? new Date(session.workout.workout_date).toLocaleTimeString(
                          'he-IL',
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )
                      : 'אין פרטי אימון זמינים מהמערכת'}
                  </div>
                </div>

                {firstExercises.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className={`text-xl ${themeClasses.textMuted}`}>
                      האימון זוהה מהיומן, אבל טרם נוספו לו תרגילים במערכת.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1 overflow-y-auto">
                    {firstExercises.map((exercise, index) => {
                      const totalSets = exercise.sets.length;
                      const totalReps = exercise.sets.reduce(
                        (sum, set) => sum + (set.reps || 0),
                        0
                      );
                      const isFirst = index === 0;

                      return (
                        <Card
                          key={exercise.id}
                          variant={isFirst ? 'default' : 'glass'}
                          className={`relative flex flex-col justify-between overflow-hidden ${
                            isFirst
                              ? 'border-primary border-2 bg-primary/5 shadow-lg shadow-primary/20'
                              : ''
                          }`}
                          padding="md"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-semibold ${
                                  isFirst
                                    ? 'bg-primary text-white'
                                    : `${themeClasses.bgSurface} ${themeClasses.textPrimary}`
                                }`}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <div className={`text-lg font-semibold line-clamp-2 ${themeClasses.textPrimary}`}>
                                  {exercise.name}
                                </div>
                                {exercise.muscle_group_id && (
                                  <div className={`text-xs ${themeClasses.textMuted} mt-0.5`}>
                                    {exercise.muscle_group_id}
                                  </div>
                                )}
                              </div>
                            </div>

                            {isFirst && (
                              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold border border-primary/30">
                                תרגיל נוכחי
                              </span>
                            )}
                          </div>

                          <div className="mt-2">
                            <div className={`flex items-center gap-4 text-sm ${themeClasses.textPrimary}`}>
                              <div>
                                <span className={themeClasses.textMuted}>סטים:</span>{' '}
                                <span className={`font-semibold ${themeClasses.textPrimary}`}>
                                  {totalSets}
                                </span>
                              </div>
                              <div>
                                <span className={themeClasses.textMuted}>סה״כ חזרות:</span>{' '}
                                <span className={`font-semibold ${themeClasses.textPrimary}`}>
                                  {totalReps}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                              {exercise.sets.map(set => (
                                <div
                                  key={set.id}
                                  className={`min-w-[90px] rounded-2xl ${themeClasses.bgSurface} ${themeClasses.border} border px-3 py-2 text-xs flex flex-col gap-1`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={themeClasses.textMuted}>סט {set.set_number}</span>
                                    <span className={`text-[10px] uppercase ${themeClasses.textMuted}`}>
                                      {set.set_type === 'dropset'
                                        ? 'דרופסט'
                                        : set.set_type === 'superset'
                                        ? 'סופרסט'
                                        : 'רגיל'}
                                    </span>
                                  </div>
                                  <div className={`font-semibold ${themeClasses.textPrimary}`}>
                                    {set.weight ?? 0} ק״ג × {set.reps ?? 0}
                                  </div>
                                  {typeof set.rpe === 'number' && (
                                    <div className={`text-[11px] ${themeClasses.textMuted}`}>
                                      RPE {set.rpe}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Proof / diagnostics panel */}
        <Card variant="premium" className="w-full md:w-[380px] flex flex-col flex-shrink-0 tv-card" padding="lg" style={tvStyles.card}>
          <h2 className="text-xl font-semibold mb-4 flex items-center justify-between" style={tvStyles.text}>
            מסך הוכחה
            <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(74, 107, 42, 0.2)', color: '#6b8e4a', border: '1px solid rgba(74, 107, 42, 0.3)' }}>
              מצב בדיקה
            </span>
          </h2>

          <div className="space-y-3 mb-5 text-sm">
            <div className="flex items-center justify-between">
              <span style={tvStyles.textMuted}>סטטוס:</span>
              <span
                className="font-semibold"
                style={{ color: error ? '#ef4444' : session ? '#22c55e' : '#ffffff' }}
              >
                {error
                  ? 'שגיאה'
                  : session
                  ? 'אימון פעיל זוהה'
                  : 'מחכה לאימון מיומן Google'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={tvStyles.textMuted}>אירוע יומן:</span>
              <span className="text-sm truncate max-w-[210px]" style={tvStyles.text}>
                {session?.calendarEvent?.summary ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={tvStyles.textMuted}>מתאמן:</span>
              <span className="text-sm" style={tvStyles.text}>
                {session?.trainee?.full_name ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={tvStyles.textMuted}>מזהה אימון:</span>
              <span className="text-xs" style={tvStyles.textMuted}>
                {session?.workout?.id ?? '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium" style={tvStyles.text}>יומן אירועים (TV)</h3>
            <span className="text-[11px]" style={tvStyles.textMuted}>
              מציג {latestLogs.length} / {logs.length} אירועים
            </span>
          </div>

          <Card variant="glass" className="flex-1 p-3 overflow-hidden tv-card" padding="none" style={tvStyles.card}>
            <div className="h-full overflow-y-auto space-y-2 pr-1">
              {latestLogs.length === 0 ? (
                <div className="text-xs" style={tvStyles.textMuted}>
                  טרם נרשמו אירועים. המסך יציג כאן את כל מה שקורה מאחורי הקלעים (זיהוי
                  יומן, טעינת אימון, שגיאות ועוד).
                </div>
              ) : (
                latestLogs.map(log => (
                  <Card
                    key={log.id}
                    variant="glass"
                    className="px-2.5 py-2 tv-card"
                    padding="none"
                    style={tvStyles.card}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="inline-flex items-center gap-1 text-[11px]"
                        style={{ color: log.level === 'error' ? '#ef4444' : log.level === 'warning' ? '#f59e0b' : '#22c55e' }}
                      >
                        {log.level === 'error'
                          ? 'שגיאה'
                          : log.level === 'warning'
                          ? 'אזהרה'
                          : 'מידע'}
                      </span>
                      <span className="text-[10px]" style={tvStyles.textMuted}>
                        {new Date(log.timestamp).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-[11px]" style={tvStyles.text}>{log.message}</div>
                  </Card>
                ))
              )}
            </div>
          </Card>

          <div className="mt-4 text-[11px] leading-relaxed" style={tvStyles.textMuted}>
            המידע המוצג כאן נועד לבדוק שהחיבור ליומן Google ולבסיס הנתונים תקין. במצב
            קהל ניתן יהיה להסתיר פאנל זה.
          </div>
        </Card>
      </div>

      <style>{`
        /* ========================================
           TV MODE - ULTIMATE EXPERIENCE
           Optimized for 55" 4K displays
           ======================================== */

        /* CONFETTI ANIMATION for Personal Records */
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }

        /* ===== FORCE DARK MODE FOR TV ===== */
        /* TV displays are always in dark environment - force dark theme */
        .tv-view-container,
        .tv-view-container * {
          color: #ffffff !important;
        }

        .tv-view-container .text-muted-tv {
          color: #9ca3af !important;
        }

        .tv-view-container {
          background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0d1117 100%) !important;
        }

        .tv-view-container .tv-card {
          background: linear-gradient(145deg, #1e1e32 0%, #252540 100%) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
        }

        /* ===== WOW EFFECT: BADGE GLOW ===== */
        .tv-view-container .tv-badge-primary {
          background: linear-gradient(135deg, #4a6b2a 0%, #5d8a35 50%, #4a6b2a 100%) !important;
          color: #ffffff !important;
          box-shadow:
            0 0 60px rgba(74, 171, 42, 0.5),
            0 0 100px rgba(74, 171, 42, 0.3),
            inset 0 2px 0 rgba(255, 255, 255, 0.2) !important;
        }

        @keyframes badge-glow-pulse {
          0%, 100% { box-shadow: 0 0 60px rgba(74, 171, 42, 0.5), 0 0 100px rgba(74, 171, 42, 0.3); }
          50% { box-shadow: 0 0 80px rgba(74, 171, 42, 0.7), 0 0 140px rgba(74, 171, 42, 0.4); }
        }
        .tv-view-container .tv-glow {
          animation: badge-glow-pulse 3s ease-in-out infinite;
        }

        /* ===== WOW EFFECT: WEIGHT/REPS DISPLAY ===== */
        .tv-view-container .tv-weight-display,
        .tv-view-container .tv-reps-display {
          color: #4ade80 !important;
          text-shadow:
            0 0 20px rgba(74, 222, 128, 0.8),
            0 0 40px rgba(74, 222, 128, 0.4),
            0 0 60px rgba(74, 222, 128, 0.2) !important;
        }

        @keyframes number-glow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(74, 222, 128, 0.8), 0 0 40px rgba(74, 222, 128, 0.4);
            transform: scale(1);
          }
          50% {
            text-shadow: 0 0 30px rgba(74, 222, 128, 1), 0 0 60px rgba(74, 222, 128, 0.6);
            transform: scale(1.02);
          }
        }
        .tv-view-container .tv-weight-display {
          animation: number-glow 2s ease-in-out infinite;
        }

        /* ===== WOW EFFECT: LIVE INDICATOR ===== */
        @keyframes live-pulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 40px rgba(239, 68, 68, 1);
            transform: scale(1.05);
          }
        }
        .tv-view-container .tv-live-indicator {
          animation: live-pulse 1s ease-in-out infinite;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
        }

        /* ===== WOW EFFECT: LIVE CARD ===== */
        @keyframes card-breathe {
          0%, 100% {
            box-shadow: 0 0 40px rgba(74, 107, 42, 0.3), 0 8px 32px rgba(0, 0, 0, 0.4);
            border-color: rgba(74, 107, 42, 0.5);
          }
          50% {
            box-shadow: 0 0 60px rgba(74, 107, 42, 0.5), 0 12px 48px rgba(0, 0, 0, 0.5);
            border-color: rgba(74, 107, 42, 0.8);
          }
        }
        .tv-view-container .tv-live-card {
          animation: card-breathe 3s ease-in-out infinite;
          border: 4px solid rgba(74, 107, 42, 0.5) !important;
          background: linear-gradient(145deg, #1a2e16 0%, #1e3a1e 50%, #1a2e16 100%) !important;
        }

        /* ===== CLOCK DISPLAY ===== */
        .tv-view-container .tv-clock {
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
          letter-spacing: 0.05em;
        }

        /* ===== TRAINEE NAME - HERO STYLE ===== */
        @keyframes name-shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .tv-view-container .tv-trainee-name {
          background: linear-gradient(
            90deg,
            #ffffff 0%,
            #ffffff 40%,
            #4ade80 50%,
            #ffffff 60%,
            #ffffff 100%
          );
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: name-shine 4s linear infinite;
          text-shadow: none !important;
        }

        /* ===== BURN-IN PREVENTION ===== */
        @keyframes tv-anti-burn {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(3px, 2px); }
          50% { transform: translate(-2px, 3px); }
          75% { transform: translate(2px, -2px); }
        }
        .tv-view-container.tv-safe-area {
          animation: tv-anti-burn 180s ease-in-out infinite;
        }

        /* ===== WAITING STATE ANIMATION ===== */
        @keyframes waiting-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }
        .tv-view-container .tv-waiting-pulse {
          animation: waiting-pulse 3s ease-in-out infinite;
        }

        /* ===== PR CELEBRATION ===== */
        @keyframes pr-celebration {
          0% { transform: scale(0.5) rotate(-5deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .tv-view-container .tv-pr-celebration {
          animation: pr-celebration 0.5s ease-out;
          box-shadow:
            0 0 80px rgba(16, 185, 129, 0.6),
            0 0 160px rgba(16, 185, 129, 0.3),
            0 20px 60px rgba(0, 0, 0, 0.5) !important;
        }

        /* ===== STATS CARDS HOVER EFFECT ===== */
        .tv-view-container .tv-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        /* ===== PROGRESS INDICATOR ===== */
        @keyframes progress-shine {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        .tv-view-container .tv-progress-bar::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: progress-shine 2s infinite;
        }

        /* ===== NEW SET FLASH ANIMATION ===== */
        @keyframes new-set-flash {
          0% {
            background: rgba(74, 222, 128, 0.3);
            transform: scale(1);
          }
          25% {
            background: rgba(74, 222, 128, 0.6);
            transform: scale(1.02);
          }
          50% {
            background: rgba(74, 222, 128, 0.4);
            transform: scale(1.01);
          }
          100% {
            background: transparent;
            transform: scale(1);
          }
        }
        .tv-view-container .tv-new-set-flash {
          animation: new-set-flash 1.5s ease-out;
        }

        /* ===== UPDATE INDICATOR ===== */
        @keyframes update-ping {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .tv-view-container .tv-update-ping {
          position: relative;
        }
        .tv-view-container .tv-update-ping::before {
          content: '';
          position: absolute;
          top: -10px;
          right: -10px;
          width: 20px;
          height: 20px;
          background: #4ade80;
          border-radius: 50%;
          animation: update-ping 1s ease-out infinite;
        }

        /* ===== SMART TV FALLBACKS ===== */
        @supports not (backdrop-filter: blur(10px)) {
          .tv-view-container .backdrop-blur-xl,
          .tv-view-container .backdrop-blur-lg,
          .tv-view-container .backdrop-blur-md,
          .tv-view-container .backdrop-blur {
            background-color: rgba(26, 26, 46, 0.98) !important;
          }
        }

        /* Fallback for browsers without gradient support */
        @supports not (background: linear-gradient(135deg, #000, #fff)) {
          .tv-view-container {
            background-color: #0d0d1a !important;
          }
          .tv-view-container .tv-live-card {
            background-color: #1a2e16 !important;
          }
        }

        /* Fallback for browsers without animation support */
        @supports not (animation: fade 1s) {
          .tv-view-container .tv-glow,
          .tv-view-container .tv-live-indicator,
          .tv-view-container .tv-live-card,
          .tv-view-container .tv-trainee-name {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

