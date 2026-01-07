import { UserPlus, Dumbbell } from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    {
      id: 'add-trainee',
      label: 'הוסף מתאמן',
      icon: UserPlus,
      className: 'btn-lime'
    },
    {
      id: 'view-trainees',
      label: 'כל המתאמנים',
      icon: Dumbbell,
      className: 'btn-glass'
    }
  ];

  return (
    <div className="glass-card">
      <div className="p-5 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">פעולות מהירות</h3>
      </div>
      <div className="p-5 grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className={`${action.className} p-4 rounded-xl transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
