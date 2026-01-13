import { Home, Users, Calculator, BarChart3, X, Sparkles } from 'lucide-react';
import { useEffect } from 'react';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function MobileSidebar({ isOpen, onClose, activeView, onViewChange }: MobileSidebarProps) {
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

  const menuItems = [
    { id: 'dashboard', label: 'דף הבית', icon: Home, description: 'סקירה כללית' },
    { id: 'trainees', label: 'מתאמנים', icon: Users, description: 'ניהול מתאמנים' },
    { id: 'tools', label: 'כלים', icon: Calculator, description: 'מחשבונים וכלים' },
    { id: 'reports', label: 'דוחות', icon: BarChart3, description: 'סטטיסטיקות ונתונים' },
  ];

  const handleItemClick = (id: string) => {
    onViewChange(id);
    onClose();
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
        className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] glass-card rounded-none border-r-0 border-y-0 shadow-dark-xl animate-slide-in-right md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="תפריט ניווט"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <span className="text-lg font-bold text-white">YM Coach</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
            aria-label="סגור תפריט"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map(({ id, label, icon: Icon, description }) => {
            const isActive = activeView === id || (id === 'trainees' && activeView.includes('trainee'));

            return (
              <button
                key={id}
                onClick={() => handleItemClick(id)}
                className={`w-full flex items-center px-4 py-4 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-400'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white active:bg-zinc-800/70'
                }`}
              >
                {isActive && (
                  <div className="absolute right-0 w-1 h-12 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-l-full" />
                )}

                <div className="relative">
                  <Icon className={`h-6 w-6 transition-all ${
                    isActive ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''
                  }`} />
                </div>

                <div className="flex-1 text-right mr-4">
                  <span className={`block text-base font-medium ${isActive ? 'text-white' : ''}`}>
                    {label}
                  </span>
                  <span className="block text-xs text-zinc-500 mt-0.5">
                    {description}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800/50">
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-white">YM Coach Pro</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
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
