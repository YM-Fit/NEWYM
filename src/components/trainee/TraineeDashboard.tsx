import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Dumbbell, Scale, Target, Flame, TrendingUp, Sparkles } from 'lucide-react';

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

      setStats({
        workoutsThisMonth: workoutsCount || 0,
        lastWeight: lastMeasurement?.weight || null,
        consecutiveDays,
        personalGoal: null,
      });

      setWeekDays(weekWorkouts);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center shadow-glow animate-pulse">
          <Dumbbell className="w-6 h-6 text-dark-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4 animate-fade-in">
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-lime-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white mb-1">
            שלום, {getFirstName(traineeName)}!
          </h1>
          <p className="text-gray-400 text-sm">{getHebrewDate()}</p>
        </div>
      </div>

      <div
        className={`glass-card p-5 border-r-2 border-lime-500 transition-opacity duration-500 ${
          quoteVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-lime-500/20">
            <Sparkles className="w-5 h-5 text-lime-500" />
          </div>
          <p className="text-gray-200 text-base leading-relaxed font-medium flex-1">
            "{currentQuote}"
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Dumbbell className="w-5 h-5" />}
          label="אימונים החודש"
          value={stats.workoutsThisMonth.toString()}
          color="lime"
        />
        <StatCard
          icon={<Scale className="w-5 h-5" />}
          label="משקל אחרון"
          value={stats.lastWeight ? `${stats.lastWeight} ק"ג` : '-'}
          color="cyan"
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="ימים רצופים"
          value={stats.consecutiveDays.toString()}
          color="orange"
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="יעד אישי"
          value={stats.personalGoal ? truncateGoal(stats.personalGoal) : 'לא הוגדר'}
          color="lime"
          isSmallText={!!stats.personalGoal}
        />
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-lime-500/20">
            <TrendingUp className="w-5 h-5 text-lime-500" />
          </div>
          <h3 className="font-bold text-white">ימי אימון השבוע</h3>
        </div>
        <div className="flex justify-between">
          {weekDays.map((day, index) => (
            <div key={index} className="flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-2">
                {getHebrewDayName(day.date)}
              </span>
              <div
                className={`calendar-day text-sm ${
                  day.isToday ? 'today' : ''
                } ${
                  day.hasWorkout ? 'has-workout' : 'empty'
                }`}
              >
                {day.date.getDate()}
              </div>
              {day.hasWorkout && (
                <div className="w-1.5 h-1.5 rounded-full bg-lime-500 mt-2 shadow-glow-sm" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5 border border-lime-500/20">
        <h3 className="font-bold text-white mb-2">טיפ היום</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
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
  color: 'lime' | 'cyan' | 'orange';
  isSmallText?: boolean;
}

function StatCard({ icon, label, value, color, isSmallText }: StatCardProps) {
  const colorClasses = {
    lime: 'bg-lime-500/20 text-lime-500',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    orange: 'bg-orange-500/20 text-orange-400',
  };

  const valueColorClasses = {
    lime: 'text-lime-500',
    cyan: 'text-cyan-400',
    orange: 'text-orange-400',
  };

  return (
    <div className="stat-card p-4">
      <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={`font-bold ${valueColorClasses[color]} ${isSmallText ? 'text-sm' : 'text-xl'}`}>
        {value}
      </p>
    </div>
  );
}

function truncateGoal(goal: string): string {
  if (goal.length <= 20) return goal;
  return goal.substring(0, 18) + '...';
}
