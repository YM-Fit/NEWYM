import { Clock, Dumbbell, Scale, Activity } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRecentActivityQuery } from '../../../hooks/queries/useDashboardQueries';
import { Skeleton } from '../../ui/Skeleton';
import { EmptyState } from '../../common/EmptyState';

export default function RecentActivity() {
  const { user } = useAuth();
  const { data: activities = [], isLoading: loading } = useRecentActivityQuery(user?.id ?? null);

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
          bg: 'bg-blue-500/15',
          text: 'text-blue-400',
          border: 'border-blue-500/20',
        };
      case 'measurement':
        return {
          bg: 'bg-primary-700/15',
          text: 'text-primary-600',
          border: 'border-primary-700/20',
        };
      default:
        return {
          bg: 'bg-muted/15',
          text: 'text-gray-500',
          border: 'border-border/20',
        };
    }
  };

  return (
    <div className="premium-card-static h-full">
      <div className="p-5 border-b border-border/10">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-gray-900">פעילות אחרונה</h3>
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
                    <p className="text-sm font-medium text-gray-900">{activity.trainee}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{activity.time}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
