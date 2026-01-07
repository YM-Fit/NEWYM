import { User, Settings, LogOut, Activity } from 'lucide-react';
import NotificationBell from '../trainer/Notifications/NotificationBell';

interface HeaderProps {
  onLogout?: () => void;
  trainerName?: string;
  collapsed?: boolean;
  onNavigateToTrainee?: (traineeId: string, tab?: string) => void;
}

export default function Header({ onLogout, trainerName, onNavigateToTrainee }: HeaderProps) {
  return (
    <header className="glass-card rounded-none border-x-0 border-t-0 px-3 py-2 sm:px-6 sm:py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="bg-gradient-to-br from-lime-500 to-lime-600 p-1.5 sm:p-2 rounded-xl shadow-glow-sm">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-dark-500" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white glow-text">YM Coach</h1>
            <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">מערכת ניהול מתאמנים חכמה</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="hidden sm:block p-2 text-gray-400 hover:text-lime-500 rounded-xl hover:bg-white/5 transition-all">
            <Settings className="h-5 w-5" />
          </button>
          <NotificationBell onNavigateToTrainee={onNavigateToTrainee} />
          <div className="hidden sm:flex items-center space-x-2 px-3 py-2 glass-card-light rounded-xl">
            <User className="h-5 w-5 text-lime-500" />
            <span className="text-sm font-medium text-gray-200">{trainerName || 'מאמן'}</span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all"
            title="התנתק"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
