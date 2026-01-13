import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Dumbbell, Scale, Target, Flame, TrendingUp, Sparkles, Lightbulb } from 'lucide-react';
import { goalsApi } from '../../api/goalsApi';
import { habitsApi } from '../../api/habitsApi';
import { smartRecommendations, Recommendation } from '../../utils/smartRecommendations';
import { logger } from '../../utils/logger';

const MOTIVATIONAL_QUOTES = [
  'הצלחה היא סכום של מאמצים קטנים, יום אחרי יום',
  'היום אתה חזק יותר מאתמול',
  'אל תפסיק כשעייף - תפסיק כשסיימת',
  'הגוף משיג מה שהמוח מאמין',
  'כל אימון מקרב אותך ליעד',
  'הכאב הוא זמני, הגאווה לנצח',
  'אל תספור את הימים, תעשה שהימים יספרו',
  'הדרך להצלחה תמיד בבנייה',
  'לא משנה כמה לאט אתה הולך, העיקר שלא תעצור',
  'ההבדל בין רגיל למיוחד הוא האקסטרה הקטנה',
  'תאמין ביכולת שלך יותר מהספקות שלך',
  'כל מסע של אלף קילומטרים מתחיל בצעד אחד',
  'הזיעה של היום היא ההצלחה של מחר',
  'תתמיד גם כשקשה - שם מתחילה הצמיחה',
  'אתה חזק יותר ממה שאתה חושב',
  'הגבולות קיימים רק בראש',
  'כל יום הוא הזדמנות חדשה להתקדם',
  'השקעה בעצמך היא ההשקעה הטובה ביותר',
  'תן לתוצאות לדבר בשבילך',
  'המאמץ של היום הוא הכוח של מחר',
];

interface TraineeDashboardProps {
  traineeId: string | null;
  traineeName: string;
}

interface DashboardStats {
  workoutsThisMonth: number;
  lastWeight: number | null;
  consecutiveDays: number;
  personalGoal: string | null;
}

interface WorkoutDay {
  date: Date;
  hasWorkout: boolean;
  isToday: boolean;
}

export default function TraineeDashboard({ traineeId, traineeName }: TraineeDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    workoutsThisMonth: 0,
    lastWeight: null,
    consecutiveDays: 0,
    personalGoal: null,
  });
  const [weekDays, setWeekDays] = useState<WorkoutDay[]>([]);
  const [currentQuote, setCurrentQuote] = useState('');
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeGoalsCount, setActiveGoalsCount] = useState(0);
  const [habitsStreak, setHabitsStreak] = useState(0);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    setCurrentQuote(MOTIVATIONAL_QUOTES[randomIndex]);

    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        const newIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
        setCurrentQuote(MOTIVATIONAL_QUOTES[newIndex]);
        setQuoteVisible(true);
      }, 500);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (traineeId) {
      loadDashboardData();
    }
  }, [traineeId]);

  const loadDashboardData = async () => {
    if (!traineeId) return;
    setLoading(true);

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

      const { count: workoutsCount } = await supabase
        .from('workout_trainees')
        .select('workouts!inner(id, workout_date, is_completed)', { count: 'exact', head: true })
        .eq('trainee_id', traineeId)
        .eq('workouts.is_completed', true)
        .gte('workouts.workout_date', startOfMonthStr);

      const { data: lastMeasurement } = await supabase
        .from('measurements')
        .select('weight')
        .eq('trainee_id', traineeId)
        .not('weight', 'is', null)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const consecutiveDays = await calculateConsecutiveDays(traineeId);

      const weekWorkouts = await loadWeekWorkouts(traineeId);

      // Load goals count
      const goals = await goalsApi.getTraineeGoals(traineeId);
      const activeGoals = goals.filter(g => g.status === 'active');
      setActiveGoalsCount(activeGoals.length);

      // Load habits streak
      const habits = await habitsApi.getTraineeHabits(traineeId);
      let maxStreak = 0;
      for (const habit of habits) {
        const streak = await habitsApi.getHabitStreak(habit.id);
        maxStreak = Math.max(maxStreak, streak);
      }
      setHabitsStreak(maxStreak);

      // Load recommendations
      const recs = await smartRecommendations.getTraineeRecommendations(traineeId);
      setRecommendations(recs.slice(0, 3)); // Show top 3

      setStats({
        workoutsThisMonth: workoutsCount || 0,
        lastWeight: lastMeasurement?.weight || null,
        consecutiveDays,
        personalGoal: null,
      });

      setWeekDays(weekWorkouts);
    } catch (error) {
      logger.error('Error loading dashboard data:', error, 'TraineeDashboard');
    } finally {
      setLoading(false);
    }
  };

  const calculateConsecutiveDays = async (traineeId: string): Promise<number> => {
    const { data: workouts } = await supabase
      .from('workout_trainees')
      .select('workouts!inner(workout_date, is_completed)')
      .eq('trainee_id', traineeId)
      .eq('workouts.is_completed', true)
      .order('workouts(workout_date)', { ascending: false });

    if (!workouts || workouts.length === 0) return 0;

    const workoutDates = new Set(
      workouts.map((w: any) => w.workouts.workout_date)
    );

    let consecutiveDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i <= 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      if (workoutDates.has(dateStr)) {
        consecutiveDays++;
      } else if (i > 0) {
        break;
      }
    }

    return consecutiveDays;
  };

  const loadWeekWorkouts = async (traineeId: string): Promise<WorkoutDay[]> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    const weekDates: WorkoutDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push({
        date,
        hasWorkout: false,
        isToday: date.toDateString() === today.toDateString(),
      });
    }

    const startStr = startOfWeek.toISOString().split('T')[0];
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const endStr = endOfWeek.toISOString().split('T')[0];

    const { data: workouts } = await supabase
      .from('workout_trainees')
      .select('workouts!inner(workout_date, is_completed)')
      .eq('trainee_id', traineeId)
      .eq('workouts.is_completed', true)
      .gte('workouts.workout_date', startStr)
      .lte('workouts.workout_date', endStr);

    if (workouts) {
      const workoutDates = new Set(
        workouts.map((w: any) => w.workouts.workout_date)
      );

      weekDates.forEach((day) => {
        const dateStr = day.date.toISOString().split('T')[0];
        day.hasWorkout = workoutDates.has(dateStr);
      });
    }

    return weekDates;
  };

  const getHebrewDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date().toLocaleDateString('he-IL', options);
  };

  const getHebrewDayName = (date: Date) => {
    const days = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
    return days[date.getDay()];
  };

  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 flex items-center justify-center shadow-glow animate-float border border-white/10">
          <Dumbbell className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6 pb-4 animate-fade-in">
      <div className="premium-card-static p-5 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">דשבורד</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mb-1">
            שלום, {getFirstName(traineeName)}!
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs md:text-sm flex items-center gap-2">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-glow-sm" />
            {getHebrewDate()}
          </p>
        </div>
      </div>

      <div
        className={`premium-card-static p-4 md:p-5 border-r-2 border-emerald-500 transition-opacity duration-500 ${
          quoteVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 shadow-glow-sm">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-[var(--color-text-primary)] text-sm md:text-base leading-relaxed font-medium flex-1">
            "{currentQuote}"
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<Dumbbell className="w-5 h-5" />}
          label="אימונים החודש"
          value={stats.workoutsThisMonth.toString()}
          color="emerald"
        />
        <StatCard
          icon={<Scale className="w-5 h-5" />}
          label="משקל אחרון"
          value={stats.lastWeight ? `${stats.lastWeight} ק"ג` : '-'}
          color="cyan"
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="רצף הרגלים"
          value={habitsStreak > 0 ? `${habitsStreak} ימים` : '0'}
          color="amber"
          isSmallText={habitsStreak > 0}
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="יעדים פעילים"
          value={activeGoalsCount.toString()}
          color="teal"
        />
      </div>

      <div className="premium-card-static p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/15">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="font-bold text-[var(--color-text-primary)] text-sm md:text-base">
            ימי אימון השבוע
          </h3>
        </div>
        <div className="flex justify-between">
          {weekDays.map((day, index) => (
            <div key={index} className="flex flex-col items-center">
              <span className="text-xs text-[var(--color-text-muted)] mb-2 font-medium">
                {getHebrewDayName(day.date)}
              </span>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all ${
                  day.isToday
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-glow-sm'
                    : day.hasWorkout
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                }`}
              >
                {day.date.getDate()}
              </div>
              {day.hasWorkout && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shadow-glow-sm" />
              )}
            </div>
          ))}
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="premium-card-static p-5 border border-amber-500/25 bg-gradient-to-br from-amber-500/12 to-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-[var(--color-text-primary)] text-sm md:text-base">
              המלצות חכמות
            </h3>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    rec.priority === 'high' ? 'bg-red-400' :
                    rec.priority === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-[var(--color-text-primary)] text-sm mb-1">
                      {rec.title}
                    </h4>
                    <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="premium-card-static p-5 border border-emerald-500/25 bg-gradient-to-br from-emerald-500/12 to-emerald-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-[var(--color-text-primary)] text-sm md:text-base">
            טיפ היום
          </h3>
        </div>
        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
          שתיית מים לפני ואחרי האימון משפרת את הביצועים ומסייעת להתאוששות מהירה יותר.
          מומלץ לשתות לפחות 2 ליטר מים ביום.
        </p>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'emerald' | 'cyan' | 'amber' | 'teal';
  isSmallText?: boolean;
}

function StatCard({ icon, label, value, color, isSmallText }: StatCardProps) {
  const colorConfig = {
    emerald: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    },
    cyan: {
      bg: 'bg-cyan-500/15',
      text: 'text-cyan-400',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    },
    amber: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    },
    teal: {
      bg: 'bg-teal-500/15',
      text: 'text-teal-400',
      glow: 'shadow-[0_0_15px_rgba(20,184,166,0.15)]',
    },
  };

  const config = colorConfig[color];

  return (
    <div className={`stat-card p-4 md:p-4.5 ${config.glow}`}>
      <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl ${config.bg} ${config.text} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-[var(--color-text-secondary)] text-[11px] md:text-xs mb-1 font-medium">
        {label}
      </p>
      <p
        className={`font-bold ${config.text} ${
          isSmallText ? 'text-xs md:text-sm' : 'text-lg md:text-xl'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function truncateGoal(goal: string): string {
  if (goal.length <= 20) return goal;
  return goal.substring(0, 18) + '...';
}
