import { useState } from 'react';
import { Calculator, Dumbbell } from 'lucide-react';
import TDEECalculator from './TDEECalculator';
import WorkingWeightCalculator from './WorkingWeightCalculator';

export default function ToolsView() {
  const [activeCalculator, setActiveCalculator] = useState<'tdee' | 'working-weight' | null>(null);

  const tools = [
    {
      id: 'tdee',
      name: 'מחשבון TDEE',
      description: 'חישוב צריכה קלורית יומית ומקרו-נוטריינטים',
      icon: Calculator,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'working-weight',
      name: 'מחשבון משקל עבודה',
      description: 'חישוב 1RM וטבלת אחוזים למשקל עבודה',
      icon: Dumbbell,
      color: 'from-blue-500 to-blue-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">כלים</h1>
        <p className="text-gray-600">מחשבונים ועוזרים לאימון</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveCalculator(tool.id as 'tdee' | 'working-weight')}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-6 text-right group"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${tool.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{tool.name}</h3>
              <p className="text-gray-600 text-sm">{tool.description}</p>
            </button>
          );
        })}
      </div>

      {activeCalculator === 'tdee' && (
        <TDEECalculator onClose={() => setActiveCalculator(null)} />
      )}

      {activeCalculator === 'working-weight' && (
        <WorkingWeightCalculator onClose={() => setActiveCalculator(null)} />
      )}
    </div>
  );
}
