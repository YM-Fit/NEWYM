import { useState, useEffect } from 'react';
import { BarChart3, Calendar, Users, TrendingUp, Download, ChevronLeft, ChevronRight, Dumbbell, Scale, Trophy } from 'lucide-react';
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

    const activeTrainees = trainees?.filter(t => t.status === 'active').length || 0;
    const newTrainees = trainees?.filter(t => {
      const createdAt = new Date(t.created_at);
      return createdAt >= startOfMonth && createdAt <= endOfMonth;
    }).length || 0;

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
      activeTrainees,
      newTrainees,
      averageWorkoutsPerTrainee: activeTrainees > 0 ? Math.round((workouts?.length || 0) / activeTrainees * 10) / 10 : 0,
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
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 rounded-2xl p-8 mb-8 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">דוחות וסטטיסטיקות</h1>
            <p className="text-blue-100 text-lg">נתונים ותובנות על הסטודיו שלך</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 mb-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              סקירה חודשית
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'progress'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              התקדמות מתאמנים
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">{formatMonth(selectedMonth)}</span>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              disabled={selectedMonth >= new Date()}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                      <Dumbbell className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">אימונים החודש</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalWorkouts}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">ממוצע למתאמן:</span>
                    <span className="font-semibold text-blue-600">{stats.averageWorkoutsPerTrainee}</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <Users className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">מתאמנים פעילים</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.activeTrainees}</p>
                    </div>
                  </div>
                  {stats.newTrainees > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 font-semibold">+{stats.newTrainees} חדשים החודש</span>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <Scale className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">נפח כולל</p>
                      <p className="text-3xl font-bold text-gray-900">{(stats.totalVolume / 1000).toFixed(1)}K</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">ק"ג הורמו החודש</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center">
                      <Trophy className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">שיאים אישיים</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.personalRecords}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">PR נשברו החודש</p>
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
