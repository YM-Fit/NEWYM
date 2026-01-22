import { Clock, Dumbbell, Scale, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Skeleton } from '../../ui/Skeleton';
import { EmptyState } from '../../common/EmptyState';

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

        let totalVolume = 0;
        if (w.workout_exercises) {
          w.workout_exercises.forEach((ex: { exercise_sets?: { weight?: number; reps?: number; superset_weight?: number; superset_reps?: number; dropset_weight?: number; dropset_reps?: number; superset_dropset_weight?: number; superset_dropset_reps?: number }[] }) => {
            if (ex.exercise_sets) {
              ex.exercise_sets.forEach((set) => {
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
        const trainee = (m.trainees as { full_name?: string } | null)?.full_name || 'מתאמן';
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

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'workout':
        return {
          bg: 'bg-cyan-500/15',
          text: 'text-cyan-400',
          border: 'border-cyan-500/20',
        };
      case 'measurement':
        return {
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-400',
          border: 'border-emerald-500/20',
        };
      default:
        return {
          bg: 'bg-zinc-500/15',
          text: 'text-zinc-400',
          border: 'border-zinc-500/20',
        };
    }
  };

  return (
    <div className="premium-card-static h-full">
      <div className="p-5 border-b border-border/10">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">פעילות אחרונה</h3>
        </div>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface/50">
                <Skeleton variant="rounded" width={40} height={40} />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" height={16} width="60%" />
                  <Skeleton variant="text" height={14} width="40%" />
                </div>
                <Skeleton variant="text" height={12} width={60} />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="עדיין אין פעילות"
            description="פעילות אחרונה תופיע כאן"
          />
        ) : (
          <div className="space-y-3">
            {activities.map((activity, index) => {
              const config = getTypeConfig(activity.type);
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-surface/50 border border-border/10 hover:border-border-hover/30 transition-all duration-250 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`p-2.5 rounded-xl ${config.bg} ${config.text}`}>
                    {getIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.trainee}</p>
                    <p className="text-sm text-secondary mt-0.5">{activity.description}</p>
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">{activity.time}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
