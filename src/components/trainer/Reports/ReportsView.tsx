import { useState, useEffect } from 'react';
import { BarChart3, Calendar, Users, TrendingUp, ChevronLeft, ChevronRight, Dumbbell, Scale, Trophy, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import MonthlyReport from './MonthlyReport';
import TraineesProgressChart from './TraineesProgressChart';

interface ReportStats {
  totalWorkouts: number;
  activeTrainees: number;
  newTrainees: number;
  averageWorkoutsPerTrainee: number;
  totalVolume: number;
  personalRecords: number;
}

export default function ReportsView() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress'>('overview');

  useEffect(() => {
    if (user) loadStats();
  }, [user, selectedMonth]);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);

    const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

    const { data: workouts } = await supabase
      .from('workouts')
      .select('id, workout_date, workout_exercises(exercise_sets(weight, reps))')
      .eq('trainer_id', user.id)
      .gte('workout_date', startOfMonth.toISOString())
      .lte('workout_date', endOfMonth.toISOString());

    const { data: trainees } = await supabase
      .from('trainees')
      .select('id, status, created_at')
      .eq('trainer_id', user.id);

    const { data: prs } = await supabase
      .from('personal_records')
      .select('id')
      .gte('achieved_at', startOfMonth.toISOString())
      .lte('achieved_at', endOfMonth.toISOString());

    const newTrainees = trainees?.filter(t => {
      const createdAt = new Date(t.created_at);
      return createdAt >= startOfMonth && createdAt <= endOfMonth;
    }).length || 0;

    const totalTrainees = trainees?.length || 0;

    let totalVolume = 0;
    workouts?.forEach(w => {
      w.workout_exercises?.forEach((we: any) => {
        we.exercise_sets?.forEach((es: any) => {
          totalVolume += (es.weight || 0) * (es.reps || 0);
        });
      });
    });

    setStats({
      totalWorkouts: workouts?.length || 0,
      activeTrainees: totalTrainees,
      newTrainees,
      averageWorkoutsPerTrainee: totalTrainees > 0 ? Math.round((workouts?.length || 0) / totalTrainees * 10) / 10 : 0,
      totalVolume: Math.round(totalVolume),
      personalRecords: prs?.length || 0,
    });

    setLoading(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="premium-card-static p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
            <BarChart3 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">סטטיסטיקות</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">דוחות וסטטיסטיקות</h1>
            <p className="text-zinc-400 text-lg">נתונים ותובנות על הסטודיו שלך</p>
          </div>
        </div>
      </div>

      <div className="premium-card-static p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'overview'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-white hover:border-zinc-600/50'
              }`}
            >
              סקירה חודשית
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'progress'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-white hover:border-zinc-600/50'
              }`}
            >
              התקדמות מתאמנים
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl transition-all text-zinc-400 hover:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-white">{formatMonth(selectedMonth)}</span>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl transition-all text-zinc-400 hover:text-white disabled:opacity-50"
              disabled={selectedMonth >= new Date()}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="premium-card-static p-6 group hover:border-zinc-600/50 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                      <Dumbbell className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 font-medium">אימונים החודש</p>
                      <p className="text-3xl font-bold text-white">{stats.totalWorkouts}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-500">ממוצע למתאמן:</span>
                    <span className="font-semibold text-emerald-400">{stats.averageWorkoutsPerTrainee}</span>
                  </div>
                </div>

                <div className="premium-card-static p-6 group hover:border-zinc-600/50 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30">
                      <Users className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 font-medium">מתאמנים פעילים</p>
                      <p className="text-3xl font-bold text-white">{stats.activeTrainees}</p>
                    </div>
                  </div>
                  {stats.newTrainees > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">+{stats.newTrainees} חדשים החודש</span>
                    </div>
                  )}
                </div>

                <div className="premium-card-static p-6 group hover:border-zinc-600/50 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30">
                      <Scale className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 font-medium">נפח כולל</p>
                      <p className="text-3xl font-bold text-white">{(stats.totalVolume / 1000).toFixed(1)}K</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500">ק"ג הורמו החודש</p>
                </div>

                <div className="premium-card-static p-6 group hover:border-zinc-600/50 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-yellow-500/15 border border-yellow-500/30">
                      <Trophy className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 font-medium">שיאים אישיים</p>
                      <p className="text-3xl font-bold text-white">{stats.personalRecords}</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500">PR נשברו החודש</p>
                </div>
              </div>

              <MonthlyReport
                month={selectedMonth}
                stats={stats}
              />
            </>
          )}
        </>
      )}

      {activeTab === 'progress' && (
        <TraineesProgressChart selectedMonth={selectedMonth} />
      )}
    </div>
  );
}
