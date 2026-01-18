import { Home, Users, ChevronRight, ChevronLeft, Calculator, Sparkles, BarChart3, Search, LucideIcon, Calendar, Briefcase, TrendingUp, MessageSquare, FileText, DollarSign, Filter, FolderOpen, Activity, Settings } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getFromStorage, setToStorage, STORAGE_KEYS } from '../../utils/storage';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  collapsed?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  category?: string;
  badge?: string | number;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [isMinimized, setIsMinimized] = useState(() => {
    return getFromStorage(STORAGE_KEYS.SIDEBAR_MINIMIZED, false);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['main']));

  useEffect(() => {
    setToStorage(STORAGE_KEYS.SIDEBAR_MINIMIZED, isMinimized);
  }, [isMinimized]);

  const menuItems: MenuItem[] = useMemo(() => [
    // Main Navigation
    { id: 'dashboard', label: 'דף הבית', icon: Home, description: 'סקירה כללית', category: 'main' },
    { id: 'trainees', label: 'מתאמנים', icon: Users, description: 'ניהול מתאמנים', category: 'main' },
    { id: 'calendar', label: 'יומן', icon: Calendar, description: 'Google Calendar', category: 'main' },
    
    // Tools & Analytics
    { id: 'tools', label: 'כלים', icon: Calculator, description: 'מחשבונים וכלים', category: 'tools' },
    { id: 'reports', label: 'דוחות', icon: BarChart3, description: 'סטטיסטיקות ונתונים', category: 'tools' },
    
    // Settings & Management
    { id: 'health-check', label: 'בדיקת בריאות', icon: Activity, description: 'מצב המערכת', category: 'settings' },
    { id: 'scheduled-exports', label: 'ייצואים מתוזמנים', icon: Calendar, description: 'ניהול ייצואים', category: 'settings' },
    { id: 'data-import', label: 'ייבוא נתונים', icon: FileText, description: 'ייבוא CSV/JSON', category: 'settings' },
  ], []);

  const categories = useMemo(() => [
    { id: 'main', label: 'ניווט ראשי', icon: Home },
    { id: 'tools', label: 'כלים וניתוח', icon: Calculator },
    { id: 'settings', label: 'הגדרות וניהול', icon: Settings },
  ], []);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return menuItems;
    const query = searchQuery.toLowerCase();
    return menuItems.filter(item => 
      item.label.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query)
    );
  }, [searchQuery, menuItems]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    filteredItems.forEach(item => {
      const category = item.category || 'main';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleItemClick = (id: string) => {
    onViewChange(id);
    setSearchQuery('');
  };

  return (
    <aside
      id="main-navigation"
      className={`hidden md:flex flex-col glass-card rounded-none border-y-0 border-r-0 transition-all duration-300 ease-out ${
        isMinimized ? 'w-20' : 'w-80'
      }`}
      role="navigation"
      aria-label="תפריט ניווט צדדי"
    >
      <div className="flex-1 py-6 overflow-y-auto overflow-x-hidden">
        <div className={`flex items-center justify-between mb-4 ${isMinimized ? 'px-4' : 'px-5'}`}>
          {!isMinimized && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">תפריט</span>
            </div>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 rounded-xl text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            title={isMinimized ? 'הרחב' : 'מזער'}
            aria-label={isMinimized ? 'הרחב תפריט' : 'מזער תפריט'}
            aria-expanded={!isMinimized}
            aria-controls="main-navigation"
          >
            {isMinimized ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>

        {!isMinimized && (
          <div className="px-4 mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="חפש בתפריט..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 text-sm bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                aria-label="חפש בתפריט"
                aria-controls="main-navigation"
              />
            </div>
          </div>
        )}

        <nav className={`space-y-2 ${isMinimized ? 'px-3' : 'px-4'}`}>
          {isMinimized ? (
            // Minimized view - show all items as icons only
            menuItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeView === id || (id === 'trainees' && activeView.includes('trainee'));
              return (
                <button
                  key={id}
                  onClick={() => handleItemClick(id)}
                  className="w-full flex items-center justify-center p-3 rounded-xl transition-all duration-300 group relative hover:bg-zinc-800/30 active:scale-95"
                  title={label}
                  aria-label={label}
                >
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-l-full shadow-glow-sm" />
                  )}
                  <Icon className={`h-5 w-5 transition-all duration-300 ${
                    isActive 
                      ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] scale-110' 
                      : 'text-zinc-400 group-hover:text-white group-hover:scale-110'
                  }`} />
                  {isActive && (
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-xl blur-sm" />
                  )}
                </button>
              );
            })
          ) : (
            // Expanded view with categories
            categories.map(category => {
              const items = groupedItems[category.id] || [];
              if (items.length === 0) return null;
              
              const isExpanded = expandedCategories.has(category.id);
              const CategoryIcon = category.icon;

              return (
                <div key={category.id} className="space-y-1.5">
                  {category.id !== 'main' && (
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-400 hover:bg-zinc-800/30 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      aria-expanded={isExpanded}
                      aria-controls={`sidebar-category-${category.id}`}
                      aria-label={`${category.label}, ${isExpanded ? 'מוקפל' : 'מורחב'}`}
                    >
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-3.5 w-3.5" />
                        <span>{category.label}</span>
                      </div>
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  )}
                  
                  {(category.id === 'main' || isExpanded) && (
                    <div
                      className="space-y-1"
                      id={category.id !== 'main' ? `sidebar-category-${category.id}` : undefined}
                    >
                      {items.map(({ id, label, icon: Icon, description, badge }) => {
                        const isActive = activeView === id || (id === 'trainees' && activeView.includes('trainee'));

                        return (
                          <button
                            key={id}
                            onClick={() => handleItemClick(id)}
                            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                              isActive
                                ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10'
                                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                            }`}
                            aria-current={isActive ? 'page' : undefined}
                            aria-label={`${label}, ${description}`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            
                            {isActive && (
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-l-full shadow-glow-sm" />
                            )}

                            <div className="relative ml-3 z-10">
                              <Icon className={`h-5 w-5 transition-all duration-300 ${
                                isActive 
                                  ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] scale-110' 
                                  : 'group-hover:scale-110'
                              }`} />
                              {isActive && (
                                <div className="absolute inset-0 bg-emerald-400/30 blur-xl rounded-full animate-pulse-soft" />
                              )}
                            </div>

                            <div className="flex-1 text-right mr-3 z-10">
                              <div className="flex items-center justify-end gap-2">
                                <span className={`block text-sm font-semibold transition-colors ${
                                  isActive ? 'text-white' : 'group-hover:text-white'
                                }`}>
                                  {label}
                                </span>
                                {badge && (
                                  <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded-full animate-scale-in shadow-sm">
                                    {badge}
                                  </span>
                                )}
                              </div>
                              <span className={`block text-xs mt-0.5 transition-colors ${
                                isActive ? 'text-zinc-500' : 'text-zinc-600 group-hover:text-zinc-500'
                              }`}>
                                {description}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
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
