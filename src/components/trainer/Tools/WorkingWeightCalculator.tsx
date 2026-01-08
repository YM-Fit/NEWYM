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
  hypertrophy: { label: 'היפרטרופיה', range: '6-12', percent: '67-85%', color: 'cyan' },
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
    if (percentage >= 90) return 'bg-red-500/10 hover:bg-red-500/15';
    if (percentage >= 80) return 'bg-amber-500/10 hover:bg-amber-500/15';
    if (percentage >= 70) return 'bg-emerald-500/10 hover:bg-emerald-500/15';
    return 'bg-cyan-500/10 hover:bg-cyan-500/15';
  };

  const getPercentageStyle = (percentage: number) => {
    if (percentage >= 90) return 'text-red-400 bg-red-500/20';
    if (percentage >= 80) return 'text-amber-400 bg-amber-500/20';
    if (percentage >= 70) return 'text-emerald-400 bg-emerald-500/20';
    return 'text-cyan-400 bg-cyan-500/20';
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-cyan-500 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Dumbbell className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">מחשבון משקל עבודה</h2>
              <p className="text-sm text-cyan-100">חישוב 1RM וטבלת אחוזים</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-2 bg-zinc-800/50 p-1 rounded-xl">
            <button
              onClick={() => setMode('calculate')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                mode === 'calculate' ? 'bg-cyan-500 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4" />
              חישוב 1RM
            </button>
            <button
              onClick={() => setMode('reverse')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                mode === 'reverse' ? 'bg-cyan-500 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              חישוב הפוך
            </button>
            <button
              onClick={() => setMode('history')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                mode === 'history' ? 'bg-cyan-500 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              היסטוריה
            </button>
          </div>

          {mode !== 'history' && (
            <>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-cyan-400">הזן את המידע</h3>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-cyan-400 mb-2">נוסחה</label>
                  <div className="flex gap-2">
                    {(Object.keys(FORMULAS) as Formula[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormula(f)}
                        className={`flex-1 py-2.5 px-3 rounded-xl font-semibold transition-all text-sm ${
                          formula === f
                            ? 'bg-cyan-500 text-white'
                            : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {FORMULAS[f].name}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-cyan-400/70 mt-2">{FORMULAS[formula].description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-cyan-400 mb-2">
                      משקל (ק״ג)
                    </label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full px-4 py-4 text-xl font-bold text-center bg-zinc-800/50 border border-zinc-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cyan-400 mb-2">
                      חזרות
                    </label>
                    <input
                      type="number"
                      value={reps}
                      onChange={(e) => setReps(Number(e.target.value))}
                      className="w-full px-4 py-4 text-xl font-bold text-center bg-zinc-800/50 border border-zinc-700/50 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      min="1"
                      max="30"
                    />
                  </div>
                </div>

                <button
                  onClick={saveToHistory}
                  className="mt-4 w-full py-2.5 px-4 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4" />
                  שמור להיסטוריה
                </button>
              </div>

              <div className="bg-emerald-500 rounded-2xl p-8 text-center">
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
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                      <ArrowLeftRight className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-amber-400">חישוב הפוך</h3>
                  </div>
                  <p className="text-sm text-amber-400/70 mb-4">כמה חזרות אוכל לעשות במשקל מסוים?</p>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-amber-400 mb-2">משקל יעד (ק״ג)</label>
                      <input
                        type="number"
                        value={targetWeight}
                        onChange={(e) => setTargetWeight(Number(e.target.value))}
                        className="w-full px-4 py-3 text-lg font-bold text-center bg-zinc-800/50 border border-zinc-700/50 text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        min="0"
                        step="0.5"
                      />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm text-amber-400/70 mb-1">חזרות משוערות</p>
                      <p className="text-4xl font-bold text-amber-400">{estimatedReps}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-emerald-400">המלצות לפי מטרה</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(GOALS).map(([key, goal]) => {
                    const minPercent = key === 'strength' ? 85 : key === 'hypertrophy' ? 67 : 50;
                    const maxPercent = key === 'strength' ? 100 : key === 'hypertrophy' ? 85 : 67;
                    const minWeight = (oneRM * minPercent / 100).toFixed(1);
                    const maxWeight = (oneRM * maxPercent / 100).toFixed(1);
                    const colorClass = goal.color === 'red' ? 'text-red-400 border-red-500/30' : goal.color === 'cyan' ? 'text-cyan-400 border-cyan-500/30' : 'text-emerald-400 border-emerald-500/30';
                    return (
                      <div key={key} className={`bg-zinc-800/50 rounded-xl p-4 border ${colorClass}`}>
                        <p className={`font-bold mb-1 ${goal.color === 'red' ? 'text-red-400' : goal.color === 'cyan' ? 'text-cyan-400' : 'text-emerald-400'}`}>{goal.label}</p>
                        <p className="text-xs text-zinc-500 mb-2">{goal.range} חזרות</p>
                        <p className="text-sm font-semibold text-white">
                          {minWeight}-{maxWeight} ק״ג
                        </p>
                        <p className="text-xs text-zinc-500">{goal.percent}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white">טבלת אחוזים למשקל עבודה</h3>
                </div>
                <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-zinc-800/50">
                      <tr>
                        <th className="px-5 py-4 text-right text-sm font-bold text-zinc-400">אחוז</th>
                        <th className="px-5 py-4 text-center text-sm font-bold text-zinc-400">משקל (ק״ג)</th>
                        <th className="px-5 py-4 text-left text-sm font-bold text-zinc-400">טווח חזרות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700/30">
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
                            className={`${getRowStyle(percentage)} transition-all`}
                          >
                            <td className="px-5 py-4 text-right">
                              <span className={`font-bold text-lg px-3 py-1.5 rounded-lg ${getPercentageStyle(percentage)}`}>
                                {percentage}%
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="font-bold text-white text-2xl">{workingWeight}</span>
                            </td>
                            <td className="px-5 py-4 text-left">
                              <span className="text-zinc-400 font-semibold bg-zinc-700/50 px-3 py-1 rounded-lg">{repRange}</span>
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
                  <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                    <History className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white">היסטוריית חישובים</h3>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-sm text-red-400 hover:text-red-300 font-semibold"
                  >
                    נקה היסטוריה
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 bg-zinc-800/30 border border-zinc-700/30 rounded-2xl">
                  <History className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">אין חישובים שמורים</p>
                  <p className="text-sm text-zinc-500 mt-1">חישובים שתשמור יופיעו כאן</p>
                </div>
              ) : (
                <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-zinc-800/50">
                      <tr>
                        <th className="px-4 py-3 text-right text-sm font-bold text-zinc-400">תאריך</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-zinc-400">משקל</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-zinc-400">חזרות</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-zinc-400">1RM</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-zinc-400">נוסחה</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700/30">
                      {history.map((entry) => (
                        <tr key={entry.id} className="hover:bg-cyan-500/10 transition-all">
                          <td className="px-4 py-3 text-sm text-zinc-400">{entry.date}</td>
                          <td className="px-4 py-3 text-center font-semibold text-white">{entry.weight} ק״ג</td>
                          <td className="px-4 py-3 text-center font-semibold text-white">{entry.reps}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded-lg">
                              {entry.oneRM} ק״ג
                            </span>
                          </td>
                          <td className="px-4 py-3 text-left text-sm text-zinc-500">{entry.formula}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {mode !== 'history' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-amber-400 mb-1">על הנוסחאות</p>
                  <ul className="text-sm text-amber-400/70 leading-relaxed space-y-1">
                    <li><strong className="text-amber-400">Epley:</strong> הנוסחה הפופולרית ביותר, מתאימה לרוב המתאמנים</li>
                    <li><strong className="text-amber-400">Brzycki:</strong> מדויקת יותר לחזרות נמוכות (1-10)</li>
                    <li><strong className="text-amber-400">Lombardi:</strong> מאוזנת, עובדת טוב גם לחזרות גבוהות</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-zinc-800/50 border-t border-zinc-700/30 p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
