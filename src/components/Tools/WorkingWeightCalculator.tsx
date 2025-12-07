import { useState } from 'react';
import { X, Calculator } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">מחשבון משקל עבודה</h2>
              <p className="text-sm text-gray-500">חישוב 1RM וטבלת אחוזים</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Input Section */}
        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
            <h3 className="text-lg font-bold text-blue-900 mb-4">הזן את המידע</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-blue-800 mb-2">
                  משקל (ק״ג)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-4 py-3 text-xl font-bold text-center border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-4 py-3 text-xl font-bold text-center border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="20"
                />
              </div>
            </div>
          </div>

          {/* One RM Result */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 text-center">
            <p className="text-sm font-semibold text-green-700 mb-2">1RM משוער</p>
            <p className="text-5xl font-bold text-green-900">{oneRM.toFixed(1)}</p>
            <p className="text-sm text-green-600 mt-2">ק״ג</p>
          </div>

          {/* Percentage Table */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">טבלת אחוזים למשקל עבודה</h3>
            <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">אחוז</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">משקל (ק״ג)</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">טווח חזרות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
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
                        className={`hover:bg-blue-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-blue-600 text-lg">{percentage}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-gray-900 text-xl">{workingWeight}</span>
                        </td>
                        <td className="px-4 py-3 text-left">
                          <span className="text-gray-600 font-medium">{repRange}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-900">
              <span className="font-bold">💡 שים לב:</span> חישוב 1RM מבוסס על נוסחת אפלי (Epley).
              התוצאות הן משוערות ומומלץ להתאים את המשקלים לפי תחושה והתקדמות אישית.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg hover:shadow-xl"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
