/**
 * Client Dashboard Component
 * Dashboard לקוח
 */

import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Target, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

export default function ClientDashboard() {
  const { traineeId } = useAuth();
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    workoutsThisMonth: 0,
    weightLoss: 0,
    goalsAchieved: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (traineeId) {
      loadStats();
    }
  }, [traineeId]);

  const loadStats = async () => {
    if (!traineeId) return;

    try {
      setLoading(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

      // Get workout stats - query through workout_trainees
      const { count: totalWorkouts } = await supabase
        .from('workout_trainees')
        .select('*', { count: 'exact', head: true })
        .eq('trainee_id', traineeId);

      // Get workouts this month - need to join with workouts table
      const { data: workoutsThisMonthData } = await supabase
        .from('workout_trainees')
        .select('workout_id, workouts!inner(workout_date)')
        .eq('trainee_id', traineeId);

      const workoutsThisMonth = workoutsThisMonthData?.filter((wt: any) => {
        const workoutDate = wt.workouts?.workout_date;
        return workoutDate && workoutDate >= startOfMonthStr;
      }).length || 0;

      // Calculate weight loss from measurements (first vs last)
      const { data: measurements } = await supabase
        .from('measurements')
        .select('weight, measurement_date')
        .eq('trainee_id', traineeId)
        .not('weight', 'is', null)
        .order('measurement_date', { ascending: true });

      let weightLoss = 0;
      if (measurements && measurements.length >= 2) {
        const firstWeight = measurements[0].weight;
        const lastWeight = measurements[measurements.length - 1].weight;
        if (firstWeight && lastWeight) {
          weightLoss = Number((firstWeight - lastWeight).toFixed(1));
        }
      }

      // Count achieved goals
      const { count: goalsAchieved } = await supabase
        .from('trainee_goals')
        .select('*', { count: 'exact', head: true })
        .eq('trainee_id', traineeId)
        .eq('status', 'achieved');

      setStats({
        totalWorkouts: totalWorkouts || 0,
        workoutsThisMonth: workoutsThisMonth,
        weightLoss: weightLoss,
        goalsAchieved: goalsAchieved || 0,
      });
    } catch (error) {
      logger.error('Error loading client dashboard stats', error, 'ClientDashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="premium-card p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="premium-card p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard שלי</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              <div className="text-sm text-muted">אימונים חודשיים</div>
            </div>
            <div className="text-2xl font-bold text-emerald-400">{stats.workoutsThisMonth}</div>
          </div>

          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              <div className="text-sm text-muted">סה"כ אימונים</div>
            </div>
            <div className="text-2xl font-bold text-blue-400">{stats.totalWorkouts}</div>
          </div>

          <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-purple-400" />
              <div className="text-sm text-muted">ירידה במשקל</div>
            </div>
            <div className="text-2xl font-bold text-purple-400">{stats.weightLoss} ק"ג</div>
          </div>

          <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-5 w-5 text-yellow-400" />
              <div className="text-sm text-muted">יעדים הושגו</div>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{stats.goalsAchieved}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
