import { useState } from 'react';
import { X, Dumbbell, Target, Info } from 'lucide-react';

interface WorkingWeightCalculatorProps {
  onClose: () => void;
  initialWeight?: number;
  initialReps?: number;
}

export default function WorkingWeightCalculator({ onClose, initialWeight = 100, initialReps = 10 }: WorkingWeightCalculatorProps) {
  const [weight, setWeight] = useState<number>(initialWeight);
  const [reps, setReps] = useState<number>(initialReps);

  const calculateOneRM = (weight: number, reps: number): number => {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
  };

  const oneRM = calculateOneRM(weight, reps);

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
        {/* Premium Header */}
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

        {/* Input Section */}
        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-blue-900">הזן את המידע</h3>
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
                  max="20"
                />
              </div>
            </div>
          </div>

          {/* One RM Result - Premium Card */}
          <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl p-8 text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-bold text-white/90">1RM משוער</p>
            </div>
            <p className="text-6xl font-bold text-white">{oneRM.toFixed(1)}</p>
            <p className="text-lg text-white/80 mt-2 font-medium">ק״ג</p>
          </div>

          {/* Percentage Table */}
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
                  {percentages.map((percentage, index) => {
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

          {/* Info Box */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-amber-800 mb-1">שים לב</p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  חישוב 1RM מבוסס על נוסחת אפלי (Epley).
                  התוצאות הן משוערות ומומלץ להתאים את המשקלים לפי תחושה והתקדמות אישית.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
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
