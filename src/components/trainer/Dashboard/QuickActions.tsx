import { UserPlus, Dumbbell, Scale, BarChart } from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    {
      id: 'add-trainee',
      label: 'הוסף מתאמן',
      icon: UserPlus,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'view-trainees',
      label: 'כל המתאמנים',
      icon: Dumbbell,
      color: 'bg-blue-500 hover:bg-blue-600'
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">פעולות מהירות</h3>
      </div>
      <div className="p-6 grid grid-cols-2 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className={`${action.color} text-white p-4 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 rtl:space-x-reverse`}
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