import { useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCurrentTvSession } from '../../../hooks/useCurrentTvSession';

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

  const now = useMemo(() => new Date(), []);

  const initials = useMemo(() => {
    if (!session?.trainee?.full_name) return '';
    const parts = session.trainee.full_name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0]}${parts[1][0]}`;
  }, [session?.trainee?.full_name]);

  const firstExercises = useMemo(() => {
    if (!session?.workout?.exercises) return [];
    return session.workout.exercises.slice(0, 6);
  }, [session?.workout?.exercises]);

  const latestLogs = logs.slice(0, 6);

  const isUnauthorized = !user || userType !== 'trainer';

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-12 py-6 bg-black/40 border-b border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center shadow-[0_0_35px_rgba(190,242,100,0.6)]">
            <span className="text-2xl font-extrabold tracking-tight">N</span>
          </div>
          <div>
            <div className="text-sm text-zinc-400">מצב טלוויזיה · סטודיו</div>
            <div className="text-xl font-semibold">
              {user?.email ? `מאמן: ${user.email}` : 'מחכה לחיבור מאמן'}
            </div>
          </div>
        </div>

        <div className="flex items-end gap-8">
          <div className="text-right">
            <div className="text-5xl font-bold tracking-tight leading-none">
              {formatClock(now)}
            </div>
            <div className="text-lg text-zinc-400 mt-1">{formatDate(now)}</div>
          </div>
          {lastUpdated && (
            <div className="text-sm text-zinc-500">
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
      <div className="flex flex-1 gap-6 px-12 py-6">
        {/* Main workout area */}
        <section className="flex-1 rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] p-8 flex flex-col">
          {isUnauthorized ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="text-3xl font-semibold">התחברות נדרשת</div>
              <p className="text-xl text-zinc-400 max-w-xl text-center">
                כדי להשתמש במצב טלוויזיה, התחבר כמדריך מהמכשיר הזה.
                לאחר ההתחברות, המסך יזהה אוטומטית את האימון הפעיל מהיומן.
              </p>
            </div>
          ) : loading && !session ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="h-20 w-20 border-4 border-lime-400/40 border-t-transparent rounded-full animate-spin" />
              <div className="text-2xl text-zinc-300">טוען את האימון הנוכחי מהיומן...</div>
            </div>
          ) : error && !session ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="text-3xl font-semibold text-red-400">שגיאה במצב טלוויזיה</div>
              <p className="text-xl text-zinc-300">{error}</p>
            </div>
          ) : !session ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="text-4xl font-semibold">אין אימון פעיל כרגע</div>
              <p className="text-xl text-zinc-400 max-w-2xl text-center leading-relaxed">
                לא נמצא אירוע יומן פעיל לסטודיו בזמן הנוכחי.
                ודא שהאימונים שלך מסונכרנים ליומן Google וששעת האימון תואמת לשעה הנוכחית.
              </p>
            </div>
          ) : (
            <>
              {/* Trainee header */}
              <div className="flex items-center gap-8 mb-10">
                <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center shadow-[0_0_50px_rgba(190,242,100,0.7)]">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {initials || '?'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-sm uppercase tracking-[0.25em] text-lime-300/80">
                    מתאמן נוכחי
                  </div>
                  <div className="text-4xl font-bold tracking-tight">
                    {session.trainee?.full_name ?? 'לא זוהה מתאמן'}
                  </div>
                  {session.calendarEvent?.summary && (
                    <div className="text-xl text-zinc-400">
                      {session.calendarEvent.summary}
                    </div>
                  )}
                </div>
              </div>

              {/* Exercises grid */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-semibold">אימון נוכחי</h2>
                  <div className="text-sm text-zinc-400">
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
                    <p className="text-xl text-zinc-400">
                      האימון זוהה מהיומן, אבל טרם נוספו לו תרגילים במערכת.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 flex-1">
                    {firstExercises.map((exercise, index) => {
                      const totalSets = exercise.sets.length;
                      const totalReps = exercise.sets.reduce(
                        (sum, set) => sum + (set.reps || 0),
                        0
                      );
                      const isFirst = index === 0;

                      return (
                        <div
                          key={exercise.id}
                          className={`relative rounded-3xl border p-5 flex flex-col justify-between overflow-hidden ${
                            isFirst
                              ? 'border-lime-400/80 bg-gradient-to-br from-lime-500/20 via-emerald-500/10 to-zinc-900/80 shadow-[0_0_60px_rgba(190,242,100,0.5)]'
                              : 'border-white/10 bg-zinc-900/60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-semibold ${
                                  isFirst
                                    ? 'bg-lime-400 text-black'
                                    : 'bg-zinc-800 text-zinc-200'
                                }`}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <div className="text-lg font-semibold line-clamp-2">
                                  {exercise.name}
                                </div>
                                {exercise.muscle_group_id && (
                                  <div className="text-xs text-zinc-400 mt-0.5">
                                    {exercise.muscle_group_id}
                                  </div>
                                )}
                              </div>
                            </div>

                            {isFirst && (
                              <span className="px-3 py-1 rounded-full bg-lime-400/20 text-lime-300 text-xs font-semibold">
                                תרגיל נוכחי
                              </span>
                            )}
                          </div>

                          <div className="mt-2">
                            <div className="flex items-center gap-4 text-sm text-zinc-300">
                              <div>
                                <span className="text-zinc-400">סטים:</span>{' '}
                                <span className="font-semibold text-white">
                                  {totalSets}
                                </span>
                              </div>
                              <div>
                                <span className="text-zinc-400">סה״כ חזרות:</span>{' '}
                                <span className="font-semibold text-white">
                                  {totalReps}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                              {exercise.sets.map(set => (
                                <div
                                  key={set.id}
                                  className="min-w-[90px] rounded-2xl bg-black/40 border border-white/10 px-3 py-2 text-xs flex flex-col gap-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-zinc-400">סט {set.set_number}</span>
                                    <span className="text-[10px] uppercase text-zinc-500">
                                      {set.set_type === 'dropset'
                                        ? 'דרופסט'
                                        : set.set_type === 'superset'
                                        ? 'סופרסט'
                                        : 'רגיל'}
                                    </span>
                                  </div>
                                  <div className="font-semibold">
                                    {set.weight ?? 0} ק״ג × {set.reps ?? 0}
                                  </div>
                                  {typeof set.rpe === 'number' && (
                                    <div className="text-[11px] text-zinc-400">
                                      RPE {set.rpe}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* Proof / diagnostics panel */}
        <aside className="w-[380px] rounded-3xl bg-black/70 border border-lime-400/40 shadow-[0_0_40px_rgba(190,242,100,0.4)] p-6 flex flex-col">
          <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
            מסך הוכחה
            <span className="text-xs font-normal text-lime-300/80 px-2 py-0.5 rounded-full bg-lime-400/10">
              מצב בדיקה
            </span>
          </h2>

          <div className="space-y-3 mb-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">סטטוס:</span>
              <span
                className={`font-semibold ${
                  error
                    ? 'text-red-400'
                    : session
                    ? 'text-lime-300'
                    : 'text-zinc-300'
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
              <span className="text-zinc-400">אירוע יומן:</span>
              <span className="text-sm truncate max-w-[210px] text-zinc-200">
                {session?.calendarEvent?.summary ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">מתאמן:</span>
              <span className="text-sm text-zinc-200">
                {session?.trainee?.full_name ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">מזהה אימון:</span>
              <span className="text-xs text-zinc-300">
                {session?.workout?.id ?? '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-zinc-300">יומן אירועים (TV)</h3>
            <span className="text-[11px] text-zinc-500">
              מציג {latestLogs.length} / {logs.length} אירועים
            </span>
          </div>

          <div className="flex-1 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 p-3 overflow-hidden">
            <div className="h-full overflow-y-auto space-y-2 pr-1">
              {latestLogs.length === 0 ? (
                <div className="text-xs text-zinc-500">
                  טרם נרשמו אירועים. המסך יציג כאן את כל מה שקורה מאחורי הקלעים (זיהוי
                  יומן, טעינת אימון, שגיאות ועוד).
                </div>
              ) : (
                latestLogs.map(log => (
                  <div
                    key={log.id}
                    className="text-xs rounded-xl px-2.5 py-2 bg-zinc-900/80 border border-zinc-800/80"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] ${
                          log.level === 'error'
                            ? 'text-red-400'
                            : log.level === 'warning'
                            ? 'text-amber-300'
                            : 'text-lime-300'
                        }`}
                      >
                        {log.level === 'error'
                          ? 'שגיאה'
                          : log.level === 'warning'
                          ? 'אזהרה'
                          : 'מידע'}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(log.timestamp).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-200">{log.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 text-[11px] text-zinc-500 leading-relaxed">
            המידע המוצג כאן נועד לבדוק שהחיבור ליומן Google ולבסיס הנתונים תקין. במצב
            קהל ניתן יהיה להסתיר פאנל זה.
          </div>
        </aside>
      </div>
    </div>
  );
}

