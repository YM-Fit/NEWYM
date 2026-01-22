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
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    workoutsThisMonth: 0,
    weightLoss: 0,
    goalsAchieved: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get trainee ID from user
      const { data: trainees } = await supabase
        .from('trainees')
        .select('id')
        .eq('trainer_id', user.id)
        .limit(1);

      if (!trainees || trainees.length === 0) {
        setLoading(false);
        return;
      }

      const traineeId = trainees[0].id;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get workout stats
      const { count: totalWorkouts } = await supabase
        .from('workout_trainees')
        .select('*', { count: 'exact', head: true })
        .eq('trainee_id', traineeId);

      const { count: workoutsThisMonth } = await supabase
        .from('workout_trainees')
        .select('*', { count: 'exact', head: true })
        .eq('trainee_id', traineeId)
        .gte('created_at', startOfMonth.toISOString());

      setStats({
        totalWorkouts: totalWorkouts || 0,
        workoutsThisMonth: workoutsThisMonth || 0,
        weightLoss: 0, // Would calculate from measurements
        goalsAchieved: 0, // Would calculate from goals
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
