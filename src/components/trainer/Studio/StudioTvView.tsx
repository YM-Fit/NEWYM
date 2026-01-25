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

  const now = useMemo(() => new Date(), []);

  const initials = useMemo(() => {
    if (!session?.trainee?.full_name) return '';
    const parts = session.trainee.full_name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0]}${parts[1][0]}`;
  }, [session?.trainee?.full_name]);

  // Get current exercise (first one)
  const currentExercise = useMemo(() => {
    if (!session?.workout?.exercises || session.workout.exercises.length === 0) return null;
    return session.workout.exercises[0];
  }, [session?.workout?.exercises]);

  // Get latest set from current exercise
  const latestSet = useMemo(() => {
    if (!currentExercise || !currentExercise.sets || currentExercise.sets.length === 0) return null;
    // Get the set with the highest set_number (most recent)
    return currentExercise.sets.reduce((latest, set) => {
      return (set.set_number || 0) > (latest.set_number || 0) ? set : latest;
    }, currentExercise.sets[0]);
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
    <div className={`h-screen w-screen overflow-hidden ${themeClasses.bgBase} ${themeClasses.textPrimary} flex flex-col relative`}>
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

      {/* Personal Record Celebration Message */}
      {showPRMessage && latestRecord && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-12 py-8 2xl:px-20 2xl:py-12 rounded-3xl 2xl:rounded-[2rem] shadow-2xl animate-scale-in border-4 2xl:border-[6px] border-white/30">
            <div className="flex flex-col items-center gap-4 2xl:gap-6">
              <Trophy className="w-16 h-16 2xl:w-24 2xl:h-24 animate-bounce" />
              <div className="text-5xl 2xl:text-7xl font-extrabold">שיא אישי חדש!</div>
              <div className="text-2xl 2xl:text-4xl font-semibold text-center">
                {latestRecord.exerciseName}
              </div>
              <div className="text-xl 2xl:text-3xl">
                {latestRecord.type === 'max_weight' && `${latestRecord.newValue} ק״ג`}
                {latestRecord.type === 'max_reps' && `${latestRecord.newValue} חזרות`}
                {latestRecord.type === 'max_volume' && `${Math.round(latestRecord.newValue)} ק״ג`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className={`flex items-center justify-between px-6 md:px-12 2xl:px-16 py-6 2xl:py-8 ${themeClasses.bgElevated} ${themeClasses.border} border-b backdrop-blur-xl shadow-lg`}>
        <div className="flex items-center gap-4 2xl:gap-6">
          <div className="h-14 w-14 2xl:h-20 2xl:w-20 rounded-2xl 2xl:rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-2xl 2xl:text-4xl font-extrabold tracking-tight text-white">N</span>
          </div>
          <div>
            <div className={`text-sm 2xl:text-xl ${themeClasses.textMuted}`}>מצב טלוויזיה · סטודיו</div>
            <div className={`text-xl 2xl:text-3xl font-semibold ${themeClasses.textPrimary}`}>
              {user?.email ? `מאמן: ${user.email}` : 'מחכה לחיבור מאמן'}
            </div>
          </div>
        </div>

        <div className="flex items-end gap-8 2xl:gap-12">
          <div className="text-right">
            <div className={`text-3xl md:text-5xl 2xl:text-7xl font-bold tracking-tight leading-none ${themeClasses.textPrimary}`}>
              {formatClock(now)}
            </div>
            <div className={`text-lg 2xl:text-2xl ${themeClasses.textMuted} mt-1`}>{formatDate(now)}</div>
          </div>
          {lastUpdated && (
            <div className={`text-sm 2xl:text-lg ${themeClasses.textMuted}`}>
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
        <Card variant="premium" className="flex-1 p-8 flex flex-col" padding="none">
          {isUnauthorized ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className={`text-3xl font-semibold ${themeClasses.textPrimary}`}>התחברות נדרשת</div>
              <p className={`text-xl ${themeClasses.textMuted} max-w-xl text-center`}>
                כדי להשתמש במצב טלוויזיה, התחבר כמדריך מהמכשיר הזה.
                לאחר ההתחברות, המסך יזהה אוטומטית את האימון הפעיל מהיומן.
              </p>
            </div>
          ) : loading && !session ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="h-20 w-20 border-4 border-primary/40 border-t-primary rounded-full animate-spin" />
              <div className={`text-2xl ${themeClasses.textPrimary}`}>טוען את האימון הנוכחי מהיומן...</div>
            </div>
          ) : error && !session ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="text-3xl font-semibold text-danger">שגיאה במצב טלוויזיה</div>
              <p className={`text-xl ${themeClasses.textPrimary}`}>{error}</p>
            </div>
          ) : !session ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className={`text-4xl font-semibold ${themeClasses.textPrimary}`}>אין אימון פעיל כרגע</div>
              <p className={`text-xl ${themeClasses.textMuted} max-w-2xl text-center leading-relaxed`}>
                לא נמצא אירוע יומן פעיל לסטודיו בזמן הנוכחי.
                ודא שהאימונים שלך מסונכרנים ליומן Google וששעת האימון תואמת לשעה הנוכחית.
              </p>
            </div>
          ) : (
            <>
              {/* Enhanced Trainee "On Stage" Display */}
              <div className="mb-8 md:mb-12 2xl:mb-16">
                <div className="flex items-center gap-6 md:gap-12 2xl:gap-16 mb-6 2xl:mb-8">
                  <div className="h-32 w-32 md:h-40 md:w-40 2xl:h-56 2xl:w-56 rounded-3xl 2xl:rounded-[2rem] bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-2xl shadow-emerald-500/50 transition-transform hover:scale-105 animate-pulse-slow">
                    <span className="text-5xl md:text-6xl 2xl:text-8xl font-extrabold tracking-tight text-white">
                      {initials || '?'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 2xl:gap-4 flex-1">
                    <div className={`text-sm md:text-base 2xl:text-xl uppercase tracking-[0.25em] ${themeClasses.textMuted} mb-1`}>
                      מתאמן נוכחי
                    </div>
                    <div className={`text-4xl md:text-6xl lg:text-7xl 2xl:text-8xl 3xl:text-[10rem] font-extrabold tracking-tight ${themeClasses.textPrimary} leading-tight`}>
                      {session.trainee?.full_name ?? 'לא זוהה מתאמן'}
                    </div>
                    <div className={`text-xl md:text-2xl 2xl:text-4xl ${themeClasses.textMuted} mt-2 animate-fade-in`}>
                      הנה אני על המסך! 🎬
                    </div>
                    {session.calendarEvent?.summary && (
                      <div className={`text-lg md:text-xl 2xl:text-3xl ${themeClasses.textMuted} mt-1`}>
                        {session.calendarEvent.summary}
                      </div>
                    )}
                  </div>
                </div>

                {/* Trainee Story - Streak, Monthly Workouts, Progress */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 2xl:gap-6 mb-6 2xl:mb-8">
                  {progressData.streakDays > 0 && (
                    <Card variant="glass" className="p-4 md:p-6 2xl:p-8" padding="none">
                      <div className="flex items-center gap-3 2xl:gap-4">
                        <Flame className="w-8 h-8 2xl:w-12 2xl:h-12 text-orange-500" />
                        <div>
                          <div className={`text-sm 2xl:text-xl ${themeClasses.textMuted}`}>רצף אימונים</div>
                          <div className={`text-2xl md:text-3xl 2xl:text-5xl font-bold ${themeClasses.textPrimary}`}>
                            🔥 {progressData.streakDays} ימים
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                  <Card variant="glass" className="p-4 md:p-6 2xl:p-8" padding="none">
                    <div className="flex items-center gap-3 2xl:gap-4">
                      <Calendar className="w-8 h-8 2xl:w-12 2xl:h-12 text-emerald-500" />
                      <div>
                        <div className={`text-sm 2xl:text-xl ${themeClasses.textMuted}`}>אימונים החודש</div>
                        <div className={`text-2xl md:text-3xl 2xl:text-5xl font-bold ${themeClasses.textPrimary}`}>
                          {progressData.workoutsThisMonth}
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card variant="glass" className="p-4 md:p-6 2xl:p-8" padding="none">
                    <div className="flex items-center gap-3 2xl:gap-4">
                      <Target className="w-8 h-8 2xl:w-12 2xl:h-12 text-blue-500" />
                      <div>
                        <div className={`text-sm 2xl:text-xl ${themeClasses.textMuted}`}>סה״כ אימונים</div>
                        <div className={`text-2xl md:text-3xl 2xl:text-5xl font-bold ${themeClasses.textPrimary}`}>
                          {progressData.totalWorkouts}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* LIVE Current Exercise Display */}
              {currentExercise && latestSet && (
                <Card variant="premium" className="mb-6 2xl:mb-8 p-6 md:p-8 2xl:p-12 border-primary border-4 2xl:border-[6px] shadow-2xl shadow-primary/30 animate-pulse-slow" padding="none">
                  <div className="flex items-center justify-between mb-4 2xl:mb-6">
                    <div className="flex items-center gap-3 2xl:gap-4">
                      <span className="px-4 py-2 2xl:px-6 2xl:py-3 rounded-full bg-red-500 text-white text-sm md:text-base 2xl:text-2xl font-bold animate-pulse">
                        🔴 LIVE
                      </span>
                      <div className={`text-xl md:text-2xl 2xl:text-4xl font-semibold ${themeClasses.textPrimary}`}>
                        מה עכשיו קורה
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 2xl:gap-8">
                    <div>
                      <div className={`text-lg md:text-xl 2xl:text-3xl ${themeClasses.textMuted} mb-2 2xl:mb-4`}>תרגיל נוכחי</div>
                      <div className={`text-3xl md:text-4xl 2xl:text-6xl font-bold ${themeClasses.textPrimary} mb-4 2xl:mb-6`}>
                        {currentExercise.name}
                      </div>
                      <div className={`text-base md:text-lg 2xl:text-2xl ${themeClasses.textMuted}`}>
                        סט {latestSet.set_number} מתוך {currentExercise.sets.length}
                      </div>
                    </div>
                    
                    <div>
                      <div className={`text-lg md:text-xl 2xl:text-3xl ${themeClasses.textMuted} mb-2 2xl:mb-4`}>ביצוע נוכחי</div>
                      <div className={`text-5xl md:text-7xl 2xl:text-9xl 3xl:text-[12rem] font-extrabold ${themeClasses.textPrimary} mb-2 2xl:mb-4`}>
                        {latestSet.weight ?? 0} <span className="text-3xl md:text-5xl 2xl:text-7xl 3xl:text-9xl">ק״ג</span>
                      </div>
                      <div className={`text-5xl md:text-7xl 2xl:text-9xl 3xl:text-[12rem] font-extrabold ${themeClasses.textPrimary}`}>
                        × {latestSet.reps ?? 0} <span className="text-3xl md:text-5xl 2xl:text-7xl 3xl:text-9xl">חזרות</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Comparison */}
                  {progressComparison && progressComparison.isImprovement && (
                    <div className="mt-6 2xl:mt-8 p-4 md:p-6 2xl:p-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl 2xl:rounded-3xl">
                      <div className="flex items-center gap-3 2xl:gap-4 mb-2 2xl:mb-4">
                        <TrendingUp className="w-6 h-6 2xl:w-10 2xl:h-10 text-emerald-500" />
                        <div className={`text-lg md:text-xl 2xl:text-3xl font-semibold text-emerald-600`}>
                          התקדמות!
                        </div>
                      </div>
                      <div className={`text-base md:text-lg 2xl:text-2xl ${themeClasses.textPrimary}`}>
                        בפעם הקודמת: {progressComparison.previousWeight} ק״ג × {progressComparison.previousReps} חזרות
                      </div>
                      <div className={`text-base md:text-lg 2xl:text-2xl ${themeClasses.textPrimary} font-semibold`}>
                        היום: {progressComparison.currentWeight} ק״ג × {progressComparison.currentReps} חזרות
                      </div>
                      <div className={`text-xl md:text-2xl 2xl:text-4xl font-bold text-emerald-600 mt-2 2xl:mt-4`}>
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
        <Card variant="premium" className="w-full md:w-[380px] flex flex-col flex-shrink-0" padding="lg">
          <h2 className={`text-xl font-semibold mb-4 flex items-center justify-between ${themeClasses.textPrimary}`}>
            מסך הוכחה
            <span className={`text-xs font-normal text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20`}>
              מצב בדיקה
            </span>
          </h2>

          <div className="space-y-3 mb-5 text-sm">
            <div className="flex items-center justify-between">
              <span className={themeClasses.textMuted}>סטטוס:</span>
              <span
                className={`font-semibold ${
                  error
                    ? 'text-danger'
                    : session
                    ? 'text-success'
                    : themeClasses.textPrimary
                }`}
              >
                {error
                  ? 'שגיאה'
                  : session
                  ? 'אימון פעיל זוהה'
                  : 'מחכה לאימון מיומן Google'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={themeClasses.textMuted}>אירוע יומן:</span>
              <span className={`text-sm truncate max-w-[210px] ${themeClasses.textPrimary}`}>
                {session?.calendarEvent?.summary ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={themeClasses.textMuted}>מתאמן:</span>
              <span className={`text-sm ${themeClasses.textPrimary}`}>
                {session?.trainee?.full_name ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={themeClasses.textMuted}>מזהה אימון:</span>
              <span className={`text-xs ${themeClasses.textMuted}`}>
                {session?.workout?.id ?? '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-medium ${themeClasses.textPrimary}`}>יומן אירועים (TV)</h3>
            <span className={`text-[11px] ${themeClasses.textMuted}`}>
              מציג {latestLogs.length} / {logs.length} אירועים
            </span>
          </div>

          <Card variant="glass" className="flex-1 p-3 overflow-hidden" padding="none">
            <div className="h-full overflow-y-auto space-y-2 pr-1">
              {latestLogs.length === 0 ? (
                <div className={`text-xs ${themeClasses.textMuted}`}>
                  טרם נרשמו אירועים. המסך יציג כאן את כל מה שקורה מאחורי הקלעים (זיהוי
                  יומן, טעינת אימון, שגיאות ועוד).
                </div>
              ) : (
                latestLogs.map(log => (
                  <Card
                    key={log.id}
                    variant="glass"
                    className="px-2.5 py-2"
                    padding="none"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] ${
                          log.level === 'error'
                            ? 'text-danger'
                            : log.level === 'warning'
                            ? 'text-warning'
                            : 'text-success'
                        }`}
                      >
                        {log.level === 'error'
                          ? 'שגיאה'
                          : log.level === 'warning'
                          ? 'אזהרה'
                          : 'מידע'}
                      </span>
                      <span className={`text-[10px] ${themeClasses.textMuted}`}>
                        {new Date(log.timestamp).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className={`text-[11px] ${themeClasses.textPrimary}`}>{log.message}</div>
                  </Card>
                ))
              )}
            </div>
          </Card>

          <div className={`mt-4 text-[11px] ${themeClasses.textMuted} leading-relaxed`}>
            המידע המוצג כאן נועד לבדוק שהחיבור ליומן Google ולבסיס הנתונים תקין. במצב
            קהל ניתן יהיה להסתיר פאנל זה.
          </div>
        </Card>
      </div>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}

