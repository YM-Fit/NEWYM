import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'minimal' | 'illustrated';
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = '',
  variant = 'default'
}: EmptyStateProps) {
  if (variant === 'minimal') {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Icon className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm">{description}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="btn-primary px-6 py-2.5 rounded-xl font-semibold mt-4"
          >
            {action.label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`premium-card-static p-12 text-center animate-fade-in ${className}`}>
      <div className="relative w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center group">
        <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-xl group-hover:bg-emerald-500/20 transition-all duration-300" />
        <Icon className="w-10 h-10 text-emerald-400 relative z-10 transition-transform group-hover:scale-110 group-hover:rotate-6" />
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-white mb-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        {title}
      </h3>
      <p className="text-zinc-400 mb-8 max-w-md mx-auto text-sm md:text-base leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        {description}
      </p>
      {action && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={action.onClick}
            className="btn-primary px-8 py-3.5 rounded-xl font-semibold group relative overflow-hidden"
          >
            <span className="relative z-10">{action.label}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </button>
        </div>
      )}
    </div>
  );
}
