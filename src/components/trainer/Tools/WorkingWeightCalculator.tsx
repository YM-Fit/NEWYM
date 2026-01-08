import { useState, useEffect } from 'react';
import { X, Dumbbell, Target, Info, History, Calculator, ArrowLeftRight, Lightbulb } from 'lucide-react';

interface WorkingWeightCalculatorProps {
  onClose: () => void;
  initialWeight?: number;
  initialReps?: number;
}

type Formula = 'epley' | 'brzycki' | 'lombardi';
type Mode = 'calculate' | 'reverse' | 'history';

interface CalculationHistory {
  id: string;
  date: string;
  weight: number;
  reps: number;
  oneRM: number;
  formula: Formula;
}

const FORMULAS: Record<Formula, { name: string; description: string; calculate: (w: number, r: number) => number }> = {
  epley: {
    name: 'Epley',
    description: 'הנוסחה הפופולרית ביותר',
    calculate: (weight, reps) => reps === 1 ? weight : weight * (1 + reps / 30),
  },
  brzycki: {
    name: 'Brzycki',
    description: 'מתאימה לחזרות נמוכות (1-10)',
    calculate: (weight, reps) => reps === 1 ? weight : weight * (36 / (37 - reps)),
  },
  lombardi: {
    name: 'Lombardi',
    description: 'מאוזנת לכל טווחי החזרות',
    calculate: (weight, reps) => reps === 1 ? weight : weight * Math.pow(reps, 0.1),
  },
};

const GOALS = {
  strength: { label: 'כוח', range: '1-5', percent: '85-100%', color: 'red' },
  hypertrophy: { label: 'היפרטרופיה', range: '6-12', percent: '67-85%', color: 'blue' },
  endurance: { label: 'סיבולת', range: '15-20+', percent: '50-67%', color: 'emerald' },
};

export default function WorkingWeightCalculator({ onClose, initialWeight = 100, initialReps = 10 }: WorkingWeightCalculatorProps) {
  const [weight, setWeight] = useState<number>(initialWeight);
  const [reps, setReps] = useState<number>(initialReps);
  const [formula, setFormula] = useState<Formula>('epley');
  const [mode, setMode] = useState<Mode>('calculate');
  const [targetWeight, setTargetWeight] = useState<number>(80);
  const [history, setHistory] = useState<CalculationHistory[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('workingWeightHistory');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const calculateOneRM = (w: number, r: number, f: Formula): number => {
    return Math.round(FORMULAS[f].calculate(w, r) * 10) / 10;
  };

  const calculateRepsAtWeight = (oneRM: number, targetW: number): number => {
    const percentage = targetW / oneRM;
    if (percentage >= 1) return 1;
    if (percentage <= 0.5) return 30;
    const estimatedReps = Math.round(30 * (1 - percentage) / percentage);
    return Math.min(30, Math.max(1, estimatedReps));
  };

  const oneRM = calculateOneRM(weight, reps, formula);
  const estimatedReps = calculateRepsAtWeight(oneRM, targetWeight);

  const saveToHistory = () => {
    const newEntry: CalculationHistory = {
      id: Date.now().toString(),
      date: new Date().toLocaleString('he-IL'),
      weight,
      reps,
      oneRM,
      formula,
    };
    const updated = [newEntry, ...history.slice(0, 19)];
    setHistory(updated);
    localStorage.setItem('workingWeightHistory', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('workingWeightHistory');
  };

  const percentages = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];

  const getRowStyle = (percentage: number) => {
    if (percentage >= 90) return 'bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100';
    if (percentage >= 80) return 'bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100';
    if (percentage >= 70) return 'bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100';
    return 'bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100';
  };

  const getPercentageStyle = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 80) return 'text-amber-600 bg-amber-100';
    if (percentage >= 70) return 'text-emerald-600 bg-emerald-100';
    return 'text-blue-600 bg-blue-100';
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Dumbbell className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">מחשבון משקל עבודה</h2>
              <p className="text-sm text-blue-100">חישוב 1RM וטבלת אחוזים</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300 hover:scale-105"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setMode('calculate')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                mode === 'calculate' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Calculator className="w-4 h-4" />
              חישוב 1RM
            </button>
            <button
              onClick={() => setMode('reverse')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                mode === 'reverse' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              חישוב הפוך
            </button>
            <button
              onClick={() => setMode('history')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                mode === 'history' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <History className="w-4 h-4" />
              היסטוריה
            </button>
          </div>

          {mode !== 'history' && (
            <>
              <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-blue-900">הזן את המידע</h3>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-blue-800 mb-2">נוסחה</label>
                  <div className="flex gap-2">
                    {(Object.keys(FORMULAS) as Formula[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormula(f)}
                        className={`flex-1 py-2.5 px-3 rounded-xl font-semibold transition-all duration-300 text-sm ${
                          formula === f
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                            : 'bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        {FORMULAS[f].name}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">{FORMULAS[formula].description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">
                      משקל (ק״ג)
                    </label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full px-4 py-4 text-xl font-bold text-center border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">
                      חזרות
                    </label>
                    <input
                      type="number"
                      value={reps}
                      onChange={(e) => setReps(Number(e.target.value))}
                      className="w-full px-4 py-4 text-xl font-bold text-center border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white"
                      min="1"
                      max="30"
                    />
                  </div>
                </div>

                <button
                  onClick={saveToHistory}
                  className="mt-4 w-full py-2.5 px-4 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4" />
                  שמור להיסטוריה
                </button>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl p-8 text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-bold text-white/90">1RM משוער ({FORMULAS[formula].name})</p>
                </div>
                <p className="text-6xl font-bold text-white">{oneRM.toFixed(1)}</p>
                <p className="text-lg text-white/80 mt-2 font-medium">ק״ג</p>
              </div>

              {mode === 'reverse' && (
                <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-2xl p-6 border-2 border-amber-200 shadow-lg">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <ArrowLeftRight className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-amber-900">חישוב הפוך</h3>
                  </div>
                  <p className="text-sm text-amber-700 mb-4">כמה חזרות אוכל לעשות במשקל מסוים?</p>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-amber-800 mb-2">משקל יעד (ק״ג)</label>
                      <input
                        type="number"
                        value={targetWeight}
                        onChange={(e) => setTargetWeight(Number(e.target.value))}
                        className="w-full px-4 py-3 text-lg font-bold text-center border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 bg-white"
                        min="0"
                        step="0.5"
                      />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm text-amber-600 mb-1">חזרות משוערות</p>
                      <p className="text-4xl font-bold text-amber-700">{estimatedReps}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-emerald-900">המלצות לפי מטרה</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(GOALS).map(([key, goal]) => {
                    const minPercent = key === 'strength' ? 85 : key === 'hypertrophy' ? 67 : 50;
                    const maxPercent = key === 'strength' ? 100 : key === 'hypertrophy' ? 85 : 67;
                    const minWeight = (oneRM * minPercent / 100).toFixed(1);
                    const maxWeight = (oneRM * maxPercent / 100).toFixed(1);
                    return (
                      <div key={key} className={`bg-white rounded-xl p-4 border-2 border-${goal.color}-200`}>
                        <p className={`font-bold text-${goal.color}-700 mb-1`}>{goal.label}</p>
                        <p className="text-xs text-gray-500 mb-2">{goal.range} חזרות</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {minWeight}-{maxWeight} ק״ג
                        </p>
                        <p className="text-xs text-gray-400">{goal.percent}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">טבלת אחוזים למשקל עבודה</h3>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                      <tr>
                        <th className="px-5 py-4 text-right text-sm font-bold text-gray-700">אחוז</th>
                        <th className="px-5 py-4 text-center text-sm font-bold text-gray-700">משקל (ק״ג)</th>
                        <th className="px-5 py-4 text-left text-sm font-bold text-gray-700">טווח חזרות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {percentages.map((percentage) => {
                        const workingWeight = (oneRM * percentage / 100).toFixed(1);
                        let repRange = '';

                        if (percentage >= 95) repRange = '1-2';
                        else if (percentage >= 90) repRange = '2-4';
                        else if (percentage >= 85) repRange = '4-6';
                        else if (percentage >= 80) repRange = '6-8';
                        else if (percentage >= 75) repRange = '8-10';
                        else if (percentage >= 70) repRange = '10-12';
                        else if (percentage >= 65) repRange = '12-15';
                        else if (percentage >= 60) repRange = '15-18';
                        else if (percentage >= 55) repRange = '18-20';
                        else repRange = '20+';

                        return (
                          <tr
                            key={percentage}
                            className={`${getRowStyle(percentage)} transition-all duration-300`}
                          >
                            <td className="px-5 py-4 text-right">
                              <span className={`font-bold text-lg px-3 py-1.5 rounded-lg ${getPercentageStyle(percentage)}`}>
                                {percentage}%
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="font-bold text-gray-900 text-2xl">{workingWeight}</span>
                            </td>
                            <td className="px-5 py-4 text-left">
                              <span className="text-gray-600 font-semibold bg-gray-100 px-3 py-1 rounded-lg">{repRange}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {mode === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                    <History className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">היסטוריית חישובים</h3>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-sm text-red-600 hover:text-red-700 font-semibold"
                  >
                    נקה היסטוריה
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">אין חישובים שמורים</p>
                  <p className="text-sm text-gray-400 mt-1">חישובים שתשמור יופיעו כאן</p>
                </div>
              ) : (
                <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">תאריך</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">משקל</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">חזרות</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">1RM</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">נוסחה</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.map((entry) => (
                        <tr key={entry.id} className="hover:bg-blue-50 transition-all duration-300">
                          <td className="px-4 py-3 text-sm text-gray-600">{entry.date}</td>
                          <td className="px-4 py-3 text-center font-semibold">{entry.weight} ק״ג</td>
                          <td className="px-4 py-3 text-center font-semibold">{entry.reps}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-lg">
                              {entry.oneRM} ק״ג
                            </span>
                          </td>
                          <td className="px-4 py-3 text-left text-sm text-gray-500">{entry.formula}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {mode !== 'history' && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-amber-800 mb-1">על הנוסחאות</p>
                  <ul className="text-sm text-amber-700 leading-relaxed space-y-1">
                    <li><strong>Epley:</strong> הנוסחה הפופולרית ביותר, מתאימה לרוב המתאמנים</li>
                    <li><strong>Brzycki:</strong> מדויקת יותר לחזרות נמוכות (1-10)</li>
                    <li><strong>Lombardi:</strong> מאוזנת, עובדת טוב גם לחזרות גבוהות</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gradient-to-br from-gray-50 to-white border-t border-gray-200 p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
