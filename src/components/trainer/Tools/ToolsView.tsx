import { useState } from 'react';
import { Calculator, Dumbbell, Wrench, Percent, Droplets, Beef, Clock } from 'lucide-react';
import TDEECalculator from './TDEECalculator';
import WorkingWeightCalculator from './WorkingWeightCalculator';
import BodyFatCalculator from './BodyFatCalculator';
import WaterIntakeCalculator from './WaterIntakeCalculator';
import ProteinCalculator from './ProteinCalculator';
import RecoveryCalculator from './RecoveryCalculator';

type CalculatorType = 'tdee' | 'working-weight' | 'body-fat' | 'water' | 'protein' | 'recovery' | null;

export default function ToolsView() {
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>(null);

  const tools = [
    {
      id: 'tdee',
      name: 'מחשבון TDEE',
      description: 'חישוב צריכה קלורית יומית ומקרו-נוטריינטים',
      icon: Calculator,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
      shadowColor: 'shadow-emerald-500/30',
      hoverShadow: 'hover:shadow-emerald-500/40',
    },
    {
      id: 'working-weight',
      name: 'מחשבון משקל עבודה',
      description: 'חישוב 1RM וטבלת אחוזים למשקל עבודה',
      icon: Dumbbell,
      gradient: 'from-blue-500 via-blue-600 to-cyan-600',
      shadowColor: 'shadow-blue-500/30',
      hoverShadow: 'hover:shadow-blue-500/40',
    },
    {
      id: 'body-fat',
      name: 'מחשבון אחוז שומן',
      description: 'חישוב אחוז שומן לפי מדידות היקפים',
      icon: Percent,
      gradient: 'from-rose-500 via-pink-500 to-rose-600',
      shadowColor: 'shadow-rose-500/30',
      hoverShadow: 'hover:shadow-rose-500/40',
    },
    {
      id: 'water',
      name: 'מחשבון צריכת מים',
      description: 'כמה מים לשתות ביום לפי משקל ופעילות',
      icon: Droplets,
      gradient: 'from-cyan-500 via-blue-500 to-cyan-600',
      shadowColor: 'shadow-cyan-500/30',
      hoverShadow: 'hover:shadow-cyan-500/40',
    },
    {
      id: 'protein',
      name: 'מחשבון חלבון יומי',
      description: 'כמות חלבון מומלצת לפי משקל ומטרה',
      icon: Beef,
      gradient: 'from-amber-500 via-orange-500 to-amber-600',
      shadowColor: 'shadow-amber-500/30',
      hoverShadow: 'hover:shadow-amber-500/40',
    },
    {
      id: 'recovery',
      name: 'מחשבון זמן התאוששות',
      description: 'כמה מנוחה צריך בין אימונים לכל שריר',
      icon: Clock,
      gradient: 'from-teal-500 via-emerald-500 to-teal-600',
      shadowColor: 'shadow-teal-500/30',
      hoverShadow: 'hover:shadow-teal-500/40',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Premium Page Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-8 mb-8 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">כלים</h1>
            <p className="text-emerald-100 text-lg">מחשבונים ועוזרים לאימון</p>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveCalculator(tool.id as CalculatorType)}
              className={`bg-white rounded-2xl shadow-xl ${tool.shadowColor} hover:shadow-2xl ${tool.hoverShadow} transition-all duration-300 p-8 text-right group hover:scale-[1.03] border border-gray-100`}
            >
              <div className={`w-20 h-20 bg-gradient-to-br ${tool.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                <Icon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors duration-300">{tool.name}</h3>
              <p className="text-gray-600 text-base leading-relaxed">{tool.description}</p>

              {/* Hover indicator */}
              <div className="mt-6 flex items-center gap-2 text-emerald-600 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <span className="font-semibold">פתח מחשבון</span>
                <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
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

      {activeCalculator === 'body-fat' && (
        <BodyFatCalculator onClose={() => setActiveCalculator(null)} />
      )}

      {activeCalculator === 'water' && (
        <WaterIntakeCalculator onClose={() => setActiveCalculator(null)} />
      )}

      {activeCalculator === 'protein' && (
        <ProteinCalculator onClose={() => setActiveCalculator(null)} />
      )}

      {activeCalculator === 'recovery' && (
        <RecoveryCalculator onClose={() => setActiveCalculator(null)} />
      )}
    </div>
  );
}
