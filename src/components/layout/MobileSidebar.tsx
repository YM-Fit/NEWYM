import { Home, Users, Calculator, BarChart3, X, Sparkles, Search, ChevronRight, LucideIcon, Calendar, FileSpreadsheet } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  category?: string;
  badge?: string | number;
}

export default function MobileSidebar({ isOpen, onClose, activeView, onViewChange }: MobileSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['main']));

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const menuItems: MenuItem[] = useMemo(() => [
    // Main Navigation
    { id: 'dashboard', label: 'דף הבית', icon: Home, description: 'סקירה כללית', category: 'main' },
    { id: 'trainees', label: 'מתאמנים', icon: Users, description: 'ניהול מתאמנים', category: 'main' },
    { id: 'calendar', label: 'יומן', icon: Calendar, description: 'Google Calendar', category: 'main' },
    
    // Tools & Analytics
    { id: 'tools', label: 'כלים', icon: Calculator, description: 'מחשבונים וכלים', category: 'tools' },
    { id: 'reports', label: 'דוחות', icon: BarChart3, description: 'סטטיסטיקות ונתונים', category: 'tools' },
    { id: 'smart-report', label: 'דוח חכם', icon: FileSpreadsheet, description: 'ניהול תשלומים חודשי', category: 'tools' },
  ], []);

  const categories = useMemo(() => [
    { id: 'main', label: 'ניווט ראשי', icon: Home },
    { id: 'tools', label: 'כלים וניתוח', icon: Calculator },
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
    onClose();
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] glass-card rounded-none border-r-0 border-y-0 shadow-dark-xl animate-slide-in-right md:hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="תפריט ניווט"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <span className="text-lg font-bold text-foreground">YM Coach</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface transition-all"
            aria-label="סגור תפריט"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="חפש בתפריט..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-emerald-700/50 focus:border-emerald-700/50 transition-all"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto p-4 space-y-3"
          role="navigation"
          aria-label="תפריט ניווט במובייל"
        >
          {categories.map(category => {
            const items = groupedItems[category.id] || [];
            if (items.length === 0) return null;
            
            const isExpanded = expandedCategories.has(category.id);
            const CategoryIcon = category.icon;

            return (
              <div key={category.id} className="space-y-2">
                {category.id !== 'main' && (
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-muted uppercase tracking-wider hover:text-foreground hover:bg-surface transition-all"
                    aria-expanded={isExpanded}
                    aria-controls={`mobile-sidebar-category-${category.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4" />
                      <span>{category.label}</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                )}
                
                {(category.id === 'main' || isExpanded) && (
                  <div
                    className="space-y-1.5"
                    id={category.id !== 'main' ? `mobile-sidebar-category-${category.id}` : undefined}
                  >
                    {items.map(({ id, label, icon: Icon, description, badge }) => {
                      const isActive = activeView === id || 
                        (id === 'trainees' && activeView.includes('trainee'));

                      return (
                        <button
                          key={id}
                          onClick={() => handleItemClick(id)}
                          className={`w-full flex items-center px-4 py-4 rounded-xl transition-all duration-200 group relative ${
                            isActive
                              ? 'bg-gradient-to-r from-emerald-700/15 to-emerald-700/5 text-emerald-600'
                              : 'text-muted hover:bg-surface hover:text-foreground active:bg-elevated'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          {isActive && (
                            <div className="absolute right-0 w-1 h-12 bg-gradient-to-b from-emerald-600 to-emerald-800 rounded-l-full" />
                          )}

                          <div className="relative">
                            <Icon className={`h-6 w-6 transition-all ${
                              isActive ? 'text-emerald-600 drop-shadow-[0_0_8px_rgba(74,107,42,0.4)]' : ''
                            }`} />
                          </div>

                            <div className="flex-1 text-right mr-4">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`block text-base font-medium ${isActive ? 'text-foreground' : ''}`}>
                                {label}
                              </span>
                              {badge && (
                                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-700/20 text-emerald-600 rounded-full">
                                  {badge}
                                </span>
                              )}
                            </div>
                            <span className="block text-xs text-muted mt-0.5">
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
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-700/10 to-emerald-800/5 border border-emerald-700/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-700/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-foreground">YM Coach Pro</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              מערכת ניהול מתאמנים מתקדמת
            </p>
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes slide-in-right {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
