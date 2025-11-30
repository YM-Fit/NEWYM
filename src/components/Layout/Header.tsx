import { User, Settings, LogOut, Activity } from 'lucide-react';

interface HeaderProps {
  onLogout?: () => void;
  trainerName?: string;
  collapsed?: boolean;
}

export default function Header({ onLogout, trainerName }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-3 py-2 sm:px-6 sm:py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="bg-green-500 p-1.5 sm:p-2 rounded-lg">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">YM Coach</h1>
            <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">מערכת ניהול מתאמנים חכמה</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="hidden sm:block p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">
            <Settings className="h-5 w-5" />
          </button>
          <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
            <User className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{trainerName || 'מאמן'}</span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="התנתק"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}