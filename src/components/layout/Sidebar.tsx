import { Home, Users, ChevronRight, ChevronLeft, Calculator } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  collapsed?: boolean;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('sidebarMinimized');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  const menuItems = [
    { id: 'dashboard', label: 'דף הבית', icon: Home },
    { id: 'trainees', label: 'מתאמנים', icon: Users },
    { id: 'tools', label: 'כלים', icon: Calculator },
  ];

  return (
    <aside
      className={`hidden md:block glass-card rounded-none border-y-0 border-r-0 py-6 transition-all duration-300 ease-in-out ${
        isMinimized ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between px-3 mb-4">
        {!isMinimized && (
          <h2 className="text-xl font-bold text-white">תפריט</h2>
        )}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-2 rounded-xl text-gray-400 hover:text-lime-500 hover:bg-white/5 transition-all"
          title={isMinimized ? 'הרחב' : 'מזער'}
        >
          {isMinimized ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav className="px-3 space-y-2">
        {menuItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={`w-full flex items-center ${isMinimized ? 'justify-center px-2' : 'px-3'} py-3 text-sm font-medium rounded-xl transition-all ${
              activeView === id
                ? 'bg-lime-500/20 text-lime-500 border-r-2 border-lime-500 shadow-glow-sm'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
            title={isMinimized ? label : ''}
          >
            <Icon className={`h-5 w-5 ${!isMinimized && 'ml-3'} ${activeView === id ? 'drop-shadow-[0_0_8px_rgba(170,255,0,0.6)]' : ''}`} />
            {!isMinimized && <span>{label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
