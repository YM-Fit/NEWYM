import { Home, Users, ChevronRight, ChevronLeft, Calculator, Sparkles, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFromStorage, setToStorage, STORAGE_KEYS } from '../../utils/storage';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  collapsed?: boolean;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [isMinimized, setIsMinimized] = useState(() => {
    return getFromStorage(STORAGE_KEYS.SIDEBAR_MINIMIZED, false);
  });

  useEffect(() => {
    setToStorage(STORAGE_KEYS.SIDEBAR_MINIMIZED, isMinimized);
  }, [isMinimized]);

  const menuItems = [
    { id: 'dashboard', label: 'דף הבית', icon: Home, description: 'סקירה כללית' },
    { id: 'trainees', label: 'מתאמנים', icon: Users, description: 'ניהול מתאמנים' },
    { id: 'tools', label: 'כלים', icon: Calculator, description: 'מחשבונים וכלים' },
    { id: 'reports', label: 'דוחות', icon: BarChart3, description: 'סטטיסטיקות ונתונים' },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col glass-card rounded-none border-y-0 border-r-0 transition-all duration-300 ease-out ${
        isMinimized ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex-1 py-6">
        <div className={`flex items-center justify-between mb-6 ${isMinimized ? 'px-4' : 'px-5'}`}>
          {!isMinimized && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">תפריט</span>
            </div>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 rounded-xl text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
            title={isMinimized ? 'הרחב' : 'מזער'}
          >
            {isMinimized ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className={`space-y-1.5 ${isMinimized ? 'px-3' : 'px-4'}`}>
          {menuItems.map(({ id, label, icon: Icon, description }) => {
            const isActive = activeView === id || (id === 'trainees' && activeView.includes('trainee'));

            return (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                className={`w-full flex items-center ${
                  isMinimized ? 'justify-center p-3' : 'px-4 py-3'
                } rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-400'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
                title={isMinimized ? label : ''}
              >
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-l-full" />
                )}

                <div className={`relative ${!isMinimized && 'ml-3'}`}>
                  <Icon className={`h-5 w-5 transition-all ${
                    isActive ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''
                  }`} />
                  {isActive && (
                    <div className="absolute inset-0 bg-emerald-400/20 blur-xl rounded-full" />
                  )}
                </div>

                {!isMinimized && (
                  <div className="flex-1 text-right mr-3">
                    <span className={`block text-sm font-medium ${isActive ? 'text-white' : ''}`}>
                      {label}
                    </span>
                    <span className="block text-xs text-zinc-600 mt-0.5">
                      {description}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {!isMinimized && (
        <div className="p-4 border-t border-zinc-800/50">
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-white">YM Coach Pro</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              מערכת ניהול מתאמנים מתקדמת לאימונים מקצועיים
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
