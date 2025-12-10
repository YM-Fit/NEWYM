import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Dumbbell, Scale, Target, Flame, TrendingUp } from 'lucide-react';

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
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="bg-gradient-to-l from-green-600 to-green-500 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">
          שלום, {getFirstName(traineeName)}!
        </h1>
        <p className="text-green-100 text-sm">{getHebrewDate()}</p>
      </div>

      <div
        className={`bg-white rounded-xl p-5 shadow-md border-r-4 border-green-500 transition-opacity duration-500 ${
          quoteVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="text-gray-700 text-lg leading-relaxed text-center font-medium">
          "{currentQuote}"
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<Dumbbell className="w-6 h-6" />}
          label="אימונים החודש"
          value={stats.workoutsThisMonth.toString()}
          color="green"
        />
        <StatCard
          icon={<Scale className="w-6 h-6" />}
          label="משקל אחרון"
          value={stats.lastWeight ? `${stats.lastWeight} ק"ג` : '-'}
          color="blue"
        />
        <StatCard
          icon={<Flame className="w-6 h-6" />}
          label="ימים רצופים"
          value={stats.consecutiveDays.toString()}
          color="orange"
        />
        <StatCard
          icon={<Target className="w-6 h-6" />}
          label="יעד אישי"
          value={stats.personalGoal ? truncateGoal(stats.personalGoal) : 'לא הוגדר'}
          color="emerald"
          isSmallText={!!stats.personalGoal}
        />
      </div>

      <div className="bg-white rounded-xl p-5 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h3 className="font-bold text-gray-800">ימי אימון השבוע</h3>
        </div>
        <div className="flex justify-between">
          {weekDays.map((day, index) => (
            <div key={index} className="flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-2">
                {getHebrewDayName(day.date)}
              </span>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  day.isToday
                    ? 'ring-2 ring-green-500 ring-offset-2'
                    : ''
                } ${
                  day.hasWorkout
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {day.date.getDate()}
              </div>
              {day.hasWorkout && (
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-l from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
        <h3 className="font-bold text-gray-800 mb-2">טיפ היום</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
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
  color: 'green' | 'blue' | 'orange' | 'emerald';
  isSmallText?: boolean;
}

function StatCard({ icon, label, value, color, isSmallText }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  const valueColorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    emerald: 'text-emerald-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-md">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
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
