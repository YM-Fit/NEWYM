import { Users, Target } from 'lucide-react';
import StatsCard from './StatsCard';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';
import RecentScaleReadings from './RecentScaleReadings';
import { IdentifiedReading } from '../../../hooks/useGlobalScaleListener';
import { ScaleReading } from '../../../hooks/useScaleListener';

interface DashboardProps {
  onViewChange: (view: string) => void;
  trainees: any[];
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
  onToggleSidebar,
  onToggleHeader,
  scaleReadings = [],
  isScaleListening = false,
  onTraineeClick,
  onSaveMeasurement
}: DashboardProps) {
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

  return (
    <div className="space-y-4 lg:space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start justify-between gap-3">
        <div className="glass-card p-5 flex-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-lime-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="relative">
            <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
              {trainerName ? `ברוך הבא, ${trainerName}` : 'ברוך הבא'}
            </h1>
            <p className="text-sm md:text-base text-gray-400">הנה סקירה של הפעילות בסטודיו שלך</p>
          </div>
        </div>

        <div className="hidden lg:flex gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="btn-glass px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap"
            >
              הסתר תפריט
            </button>
          )}
          {onToggleHeader && (
            <button
              type="button"
              onClick={onToggleHeader}
              className="btn-glass px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap"
            >
              הסתר כותרת
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="סה״כ מתאמנים"
          value={trainees.length}
          change="מתאמנים רשומים"
          trend="up"
          icon={Users}
          color="lime"
        />
        <StatsCard
          title="מתאמנים פעילים"
          value={trainees.filter(t => t.status === 'active').length}
          change="פעילים כרגע"
          trend="up"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div>
          <QuickActions onAction={handleQuickAction} />
        </div>
      </div>

      {trainees.length === 0 && (
        <div className="glass-card p-8 text-center border border-lime-500/20">
          <h3 className="text-xl font-bold text-white mb-2">התחל עכשיו!</h3>
          <p className="text-gray-400 mb-4">הוסף את המתאמן הראשון שלך כדי להתחיל לעבוד</p>
          <button
            onClick={() => onViewChange('add-trainee')}
            className="btn-lime px-6 py-3 rounded-xl font-medium"
          >
            הוסף מתאמן
          </button>
        </div>
      )}
    </div>
  );
}
