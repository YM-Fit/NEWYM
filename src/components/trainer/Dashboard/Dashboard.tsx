import { Users, Target, Sparkles, TrendingUp } from 'lucide-react';
import StatsCard from './StatsCard';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';
import RecentScaleReadings from './RecentScaleReadings';
import AdherenceMetrics from '../Analytics/AdherenceMetrics';
import WeightAlerts from '../Measurements/WeightAlerts';
import { IdentifiedReading } from '../../../hooks/useGlobalScaleListener';
import { ScaleReading } from '../../../hooks/useScaleListener';
import { useAuth } from '../../../contexts/AuthContext';

interface DashboardProps {
  onViewChange: (view: string) => void;
  trainees: { status: string }[];
  trainerName?: string;
  onToggleSidebar?: () => void;
  onToggleHeader?: () => void;
  scaleReadings?: IdentifiedReading[];
  isScaleListening?: boolean;
  onTraineeClick?: (traineeId: string) => void;
  onSaveMeasurement?: (traineeId: string, traineeName: string, reading: ScaleReading) => Promise<boolean>;
}

export default function Dashboard({
  onViewChange,
  trainees,
  trainerName,
  scaleReadings = [],
  isScaleListening = false,
  onTraineeClick,
  onSaveMeasurement
}: DashboardProps) {
  const { user } = useAuth();
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-trainee':
        onViewChange('add-trainee');
        break;
      case 'view-trainees':
        onViewChange('trainees');
        break;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'בוקר טוב';
    if (hour < 17) return 'צהריים טובים';
    if (hour < 21) return 'ערב טוב';
    return 'לילה טוב';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="premium-card-static p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                {getGreeting()}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
              {trainerName ? `שלום, ${trainerName}` : 'שלום'}
            </h1>
            <p className="text-zinc-400">
              הנה סקירה של הפעילות בסטודיו שלך
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-zinc-400">
              {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="סה״כ מתאמנים"
          value={trainees.length}
          change="מתאמנים רשומים במערכת"
          icon={Users}
          color="emerald"
        />
        <StatsCard
          title="מתאמנים פעילים"
          value={trainees.filter(t => t.status === 'active').length}
          change="פעילים כרגע"
          icon={Target}
          color="cyan"
        />
      </div>

      <RecentScaleReadings
        readings={scaleReadings}
        isListening={isScaleListening}
        onTraineeClick={onTraineeClick}
        onSaveMeasurement={onSaveMeasurement}
      />

      {user && (
        <WeightAlerts
          trainerId={user.id}
          onTraineeClick={onTraineeClick}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div>
          <QuickActions onAction={handleQuickAction} />
        </div>
      </div>

      {trainees.length > 0 && (
        <div className="premium-card-static p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">מדדי Adherence</h3>
          </div>
          <AdherenceMetrics />
        </div>
      )}

      {trainees.length === 0 && (
        <div className="premium-card-static p-8 md:p-12 text-center border border-emerald-500/20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">התחל עכשיו!</h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            הוסף את המתאמן הראשון שלך כדי להתחיל לעבוד עם המערכת
          </p>
          <button
            onClick={() => onViewChange('add-trainee')}
            className="btn-primary px-8 py-3.5 rounded-xl font-semibold"
          >
            הוסף מתאמן ראשון
          </button>
        </div>
      )}
    </div>
  );
}
