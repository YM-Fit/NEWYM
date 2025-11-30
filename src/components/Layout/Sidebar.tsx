import { Home, Users, BarChart3, Calendar, Scale, FileText } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  collapsed?: boolean;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'דף הבית', icon: Home },
    { id: 'trainees', label: 'מתאמנים', icon: Users },
  ];

  return (
    <aside className="hidden md:block bg-white w-64 border-r border-gray-200 py-6">
      <nav className="px-3 space-y-2">
        {menuItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === id
                ? 'bg-green-50 text-green-700 border-r-2 border-green-500'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="ml-3 h-5 w-5" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}