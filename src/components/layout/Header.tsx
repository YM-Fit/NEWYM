import { User, LogOut, Activity, Menu } from 'lucide-react';
import NotificationBell from '../trainer/Notifications/NotificationBell';

interface HeaderProps {
  onLogout?: () => void;
  trainerName?: string;
  collapsed?: boolean;
  onNavigateToTrainee?: (traineeId: string, tab?: string) => void;
  onToggleSidebar?: () => void;
}

export default function Header({ onLogout, trainerName, onNavigateToTrainee, onToggleSidebar }: HeaderProps) {
  return (
    <header
      role="banner"
      className="sticky top-0 z-30 glass-card rounded-none border-x-0 border-t-0 px-4 py-3 sm:px-6 sm:py-4 backdrop-blur-xl animate-slide-in-top"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface transition-all duration-300 active:scale-95 group"
              aria-label="פתח תפריט ניווט"
            >
              <Menu className="h-5 w-5 transition-transform group-hover:scale-110" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="bg-gradient-to-br from-sage-600 to-sage-700 p-2.5 rounded-xl shadow-glow-lg transition-all duration-300 group-hover:shadow-glow-xl group-hover:scale-105">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-white transition-transform group-hover:rotate-12" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-sage-500 rounded-full border-2 border-base animate-pulse" />
              <div className="absolute inset-0 bg-sage-500/30 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="hidden sm:block animate-fade-in">
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                YM Coach
              </h1>
              <p className="text-xs text-muted">
                מערכת ניהול מתאמנים
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell onNavigateToTrainee={onNavigateToTrainee} />

          <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 bg-surface rounded-xl border border-border hover:border-border-hover transition-all duration-300 hover:bg-elevated group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sage-500/20 to-sage-600/20 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-6">
              <User className="h-4 w-4 text-sage-600" />
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-foreground block transition-colors group-hover:text-sage-600">
                {trainerName || 'מאמן'}
              </span>
              <span className="text-xs text-muted">מאמן אישי</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2.5 text-muted hover:text-danger rounded-xl hover:bg-danger/10 transition-all duration-300 border border-transparent hover:border-danger/20 active:scale-95 group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-danger/50"
            title="התנתק"
            aria-label="התנתק"
          >
            <div className="absolute inset-0 bg-danger/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <LogOut className="h-5 w-5 relative z-10 transition-transform group-hover:rotate-12" />
          </button>
        </div>
      </div>
    </header>
  );
}
