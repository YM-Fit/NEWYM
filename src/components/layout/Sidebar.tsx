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
      className={`hidden md:block bg-white border-r border-gray-200 py-6 transition-all duration-300 ease-in-out ${
        isMinimized ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between px-3 mb-4">
        {!isMinimized && (
          <h2 className="text-xl font-bold text-gray-800">תפריט</h2>
        )}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title={isMinimized ? 'הרחב' : 'מזער'}
        >
          {isMinimized ? (
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>

      <nav className="px-3 space-y-2">
        {menuItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={`w-full flex items-center ${isMinimized ? 'justify-center px-2' : 'px-3'} py-3 text-sm font-medium rounded-lg transition-all ${
              activeView === id
                ? 'bg-green-50 text-green-700 border-r-2 border-green-500'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title={isMinimized ? label : ''}
          >
            <Icon className={`h-5 w-5 ${!isMinimized && 'ml-3'}`} />
            {!isMinimized && <span>{label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}