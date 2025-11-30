import { Clock, TrendingUp, Users, Dumbbell, Scale } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ActivityItem {
  id: string;
  type: 'workout' | 'measurement';
  trainee: string;
  description: string;
  time: string;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    const activityList: ActivityItem[] = [];

    const { data: workouts } = await supabase
      .from('workouts')
      .select(`
        id,
        workout_date,
        created_at,
        workout_trainees (
          trainees (
            full_name
          )
        ),
        workout_exercises (
          exercise_sets (
            weight,
            reps,
            superset_weight,
            superset_reps,
            dropset_weight,
            dropset_reps,
            superset_dropset_weight,
            superset_dropset_reps
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (workouts) {
      workouts.forEach(w => {
        const trainee = w.workout_trainees?.[0]?.trainees?.full_name || 'מתאמן';

        // Calculate total volume
        let totalVolume = 0;
        if (w.workout_exercises) {
          w.workout_exercises.forEach((ex: any) => {
            if (ex.exercise_sets) {
              ex.exercise_sets.forEach((set: any) => {
                let setVolume = (set.weight || 0) * (set.reps || 0);

                if (set.superset_weight && set.superset_reps) {
                  setVolume += set.superset_weight * set.superset_reps;
                }

                if (set.dropset_weight && set.dropset_reps) {
                  setVolume += set.dropset_weight * set.dropset_reps;
                }

                if (set.superset_dropset_weight && set.superset_dropset_reps) {
                  setVolume += set.superset_dropset_weight * set.superset_dropset_reps;
                }

                totalVolume += setVolume;
              });
            }
          });
        }

        activityList.push({
          id: w.id,
          type: 'workout',
          trainee,
          description: `השלים אימון - ${totalVolume.toLocaleString()} ק"ג`,
          time: new Date(w.created_at).toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      });
    }

    const { data: measurements } = await supabase
      .from('measurements')
      .select(`
        id,
        measurement_date,
        created_at,
        weight,
        trainees (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (measurements) {
      measurements.forEach(m => {
        const trainee = m.trainees?.full_name || 'מתאמן';
        activityList.push({
          id: m.id,
          type: 'measurement',
          trainee,
          description: `נשקל - ${m.weight} ק״ג`,
          time: new Date(m.created_at).toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      });
    }

    activityList.sort((a, b) => {
      const aDate = new Date(a.time);
      const bDate = new Date(b.time);
      return bDate.getTime() - aDate.getTime();
    });

    setActivities(activityList.slice(0, 10));
    setLoading(false);
  };
  const getIcon = (type: string) => {
    switch (type) {
      case 'workout':
        return <Dumbbell className="h-4 w-4" />;
      case 'measurement':
        return <Scale className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'workout':
        return 'bg-blue-50 text-blue-600';
      case 'measurement':
        return 'bg-purple-50 text-purple-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">פעילות אחרונה</h3>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3 animate-pulse" />
            <p className="text-gray-500">טוען פעילות...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">עדיין אין פעילות</p>
            <p className="text-sm text-gray-400 mt-1">פעילות אחרונה תופיע כאן</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 rtl:space-x-reverse">
                <div className={`p-2 rounded-lg ${getTypeColor(activity.type)}`}>
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.trainee}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}