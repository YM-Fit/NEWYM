/**
 * CRM Navigation Component
 * ניווט פנימי ל-CRM עם טאבים
 */

import { BarChart3, Users, TrendingUp, FileText, Home } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface CrmNavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  view: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, view: 'crm-dashboard' },
  { id: 'clients', label: 'לקוחות', icon: Users, view: 'crm-clients' },
  { id: 'pipeline', label: 'Pipeline', icon: TrendingUp, view: 'crm-pipeline' },
  { id: 'analytics', label: 'אנליטיקה', icon: BarChart3, view: 'crm-analytics' },
  { id: 'reports', label: 'דוחות', icon: FileText, view: 'crm-reports' },
];

export default function CrmNavigation({ activeView, onViewChange }: CrmNavigationProps) {
  return (
    <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
      <div className="flex items-center gap-1 px-4 py-3 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = activeView === item.view || 
            (item.view === 'crm-clients' && activeView === 'client-detail');
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.view)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
