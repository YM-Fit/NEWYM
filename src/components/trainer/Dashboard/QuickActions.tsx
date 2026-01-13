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
      <div className="p-5 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">פעולות מהירות</h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className={`w-full p-4 rounded-xl transition-all duration-200 flex items-center gap-4 group ${
                action.primary
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-glow hover:shadow-glow-lg'
                  : 'bg-zinc-800/50 text-white hover:bg-zinc-800 border border-zinc-700/50 hover:border-emerald-500/30'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${
                action.primary
                  ? 'bg-white/20'
                  : 'bg-emerald-500/10 group-hover:bg-emerald-500/20'
              }`}>
                <Icon className={`h-5 w-5 ${action.primary ? 'text-white' : 'text-emerald-400'}`} />
              </div>
              <div className="text-right flex-1">
                <span className="block text-sm font-semibold">{action.label}</span>
                <span className={`block text-xs mt-0.5 ${
                  action.primary ? 'text-white/70' : 'text-zinc-500'
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
