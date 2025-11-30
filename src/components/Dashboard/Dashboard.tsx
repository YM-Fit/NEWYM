import { Users, Calendar, TrendingUp, Target } from 'lucide-react';
import StatsCard from './StatsCard';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';

interface DashboardProps {
  onViewChange: (view: string) => void;
  trainees: any[];
  trainerName?: string;
  onToggleSidebar?: () => void;
  onToggleHeader?: () => void;
}

export default function Dashboard({ onViewChange, trainees, trainerName, onToggleSidebar, onToggleHeader }: DashboardProps) {
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
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col md:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
            {trainerName ? `ברוך הבא, ${trainerName}` : 'ברוך הבא'}
          </h1>
          <p className="text-sm md:text-base text-gray-600">הנה סקירה של הפעילות בסטודיו שלך</p>
        </div>

        <div className="hidden lg:flex gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
            >
              הסתר תפריט
            </button>
          )}
          {onToggleHeader && (
            <button
              type="button"
              onClick={onToggleHeader}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
            >
              הסתר כותרת
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatsCard
          title="סה״כ מתאמנים"
          value={trainees.length}
          change="מתאמנים רשומים"
          trend="up"
          icon={Users}
          color="green"
        />
        <StatsCard
          title="מתאמנים פעילים"
          value={trainees.filter(t => t.status === 'active').length}
          change="פעילים כרגע"
          trend="up"
          icon={Target}
          color="blue"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div>
          <QuickActions onAction={handleQuickAction} />
        </div>
      </div>

      {/* Quick Start */}
      {trainees.length === 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-green-900 mb-2">התחל עכשיו!</h3>
          <p className="text-green-700 mb-4">הוסף את המתאמן הראשון שלך כדי להתחיל לעבוד</p>
          <button
            onClick={() => onViewChange('add-trainee')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            הוסף מתאמן
          </button>
        </div>
      )}
    </div>
  );
}