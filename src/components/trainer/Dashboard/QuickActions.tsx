import { UserPlus, Users, Zap } from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    {
      id: 'add-trainee',
      label: 'הוסף מתאמן',
      description: 'הוסף מתאמן חדש למערכת',
      icon: UserPlus,
      primary: true,
    },
    {
      id: 'view-trainees',
      label: 'כל המתאמנים',
      description: 'צפה ברשימת המתאמנים',
      icon: Users,
      primary: false,
    }
  ];

  return (
    <div className="premium-card-static h-full">
      <div className="p-5 border-b border-border/10">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-gray-900">פעולות מהירות</h3>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className={`w-full p-4 rounded-xl transition-all duration-250 flex items-center gap-4 group ${
                action.primary
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-primary-foreground shadow-glow hover:shadow-glow-lg'
                  : 'bg-surface/50 text-gray-900 hover:bg-surface border border-border/10 hover:border-primary/30'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${
                action.primary
                  ? 'bg-white/20'
                  : 'bg-primary/10 group-hover:bg-primary/20'
              }`}>
                <Icon className={`h-5 w-5 ${action.primary ? 'text-inverse' : 'text-primary'}`} />
              </div>
              <div className="text-right flex-1">
                <span className="block text-sm font-semibold">{action.label}</span>
                <span className={`block text-xs mt-0.5 ${
                  action.primary ? 'text-inverse/70' : 'text-secondary'
                }`}>
                  {action.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
