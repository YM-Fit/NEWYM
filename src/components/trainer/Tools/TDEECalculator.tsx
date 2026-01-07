import { useState } from 'react';
import { X, Calculator, Activity, TrendingUp, Flame, Scale, Target } from 'lucide-react';

interface TDEECalculatorProps {
  onClose: () => void;
  initialWeight?: number;
  initialHeight?: number;
  initialAge?: number;
  initialGender?: 'male' | 'female';
}

export default function TDEECalculator({
  onClose,
  initialWeight = 70,
  initialHeight = 170,
  initialAge = 30,
  initialGender = 'male',
}: TDEECalculatorProps) {
  const [weight, setWeight] = useState<number>(initialWeight);
  const [height, setHeight] = useState<number>(initialHeight);
  const [age, setAge] = useState<number>(initialAge);
  const [gender, setGender] = useState<'male' | 'female'>(initialGender);
  const [activityLevel, setActivityLevel] = useState<string>('moderate');

  // חישוב BMR לפי Mifflin-St Jeor
  const calculateBMR = (): number => {
    if (gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  };

  const bmr = calculateBMR();

  // רמות פעילות
  const activityMultipliers: { [key: string]: { value: number; label: string; description: string } } = {
    sedentary: { value: 1.2, label: 'בישיבה', description: 'ללא פעילות גופנית' },
    light: { value: 1.375, label: 'פעילות קלה', description: '1-3 אימונים בשבוע' },
    moderate: { value: 1.55, label: 'פעילות בינונית', description: '3-5 אימונים בשבוע' },
    active: { value: 1.725, label: 'פעיל מאוד', description: '6-7 אימונים בשבוע' },
    veryActive: { value: 1.9, label: 'פעילות אתלטית', description: 'אימונים אינטנסיביים פעמיים ביום' },
  };

  const tdee = Math.round(bmr * activityMultipliers[activityLevel].value);

  // חישוב מקרו-נוטריינטים
  const proteinGrams = Math.round(weight * 2.2);
  const proteinCalories = proteinGrams * 4;

  const fatGrams = Math.round((tdee * 0.25) / 9);
  const fatCalories = fatGrams * 9;

  const carbsCalories = tdee - proteinCalories - fatCalories;
  const carbsGrams = Math.round(carbsCalories / 4);

  // יעדים קלוריים
  const goals = {
    cutting: Math.round(tdee * 0.8),
    maintenance: tdee,
    bulking: Math.round(tdee * 1.1),
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Premium Header */}
        <div className="sticky top-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Calculator className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">מחשבון TDEE</h2>
              <p className="text-sm text-emerald-100">צריכה קלורית יומית ומקרו-נוטריינטים</p>
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
          {/* Input Section */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl p-6 border-2 border-emerald-200 shadow-lg">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">פרטים אישיים</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-emerald-800 mb-2">
                  משקל (ק״ג)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-bold text-center border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 bg-white"
                  min="30"
                  max="200"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-emerald-800 mb-2">
                  גובה (ס״מ)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-bold text-center border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 bg-white"
                  min="100"
                  max="250"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-emerald-800 mb-2">
                  גיל
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-bold text-center border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 bg-white"
                  min="15"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-emerald-800 mb-2">
                  מין
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                  className="w-full px-4 py-3 text-lg font-bold text-center border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 bg-white"
                >
                  <option value="male">גבר</option>
                  <option value="female">אישה</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-semibold text-emerald-800 mb-2">
                רמת פעילות
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full px-4 py-3 text-lg font-bold border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 bg-white"
              >
                {Object.entries(activityMultipliers).map(([key, { label, description }]) => (
                  <option key={key} value={key}>
                    {label} - {description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BMR Card */}
            <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 rounded-2xl p-6 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-bold text-blue-700">BMR - קצב מטבולי בסיסי</p>
              </div>
              <p className="text-5xl font-bold text-blue-900">{Math.round(bmr)}</p>
              <p className="text-sm text-blue-600 mt-2 font-medium">קלוריות ליום במנוחה</p>
            </div>

            {/* TDEE Card */}
            <div className="bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-100 rounded-2xl p-6 border-2 border-emerald-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-bold text-emerald-700">TDEE - צריכה יומית</p>
              </div>
              <p className="text-5xl font-bold text-emerald-900">{tdee}</p>
              <p className="text-sm text-emerald-600 mt-2 font-medium">קלוריות ליום עם פעילות</p>
            </div>
          </div>

          {/* Goals Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">יעדים קלוריים</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-red-50 via-red-100 to-rose-100 rounded-2xl p-5 border-2 border-red-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                <p className="text-sm font-bold text-red-700 mb-2">הרזיה (-20%)</p>
                <p className="text-4xl font-bold text-red-900">{goals.cutting}</p>
                <p className="text-xs text-red-600 mt-2 font-medium">קלוריות ליום</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 rounded-2xl p-5 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                <p className="text-sm font-bold text-blue-700 mb-2">שמירה על משקל</p>
                <p className="text-4xl font-bold text-blue-900">{goals.maintenance}</p>
                <p className="text-xs text-blue-600 mt-2 font-medium">קלוריות ליום</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-100 rounded-2xl p-5 border-2 border-emerald-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                <p className="text-sm font-bold text-emerald-700 mb-2">עליית מסה (+10%)</p>
                <p className="text-4xl font-bold text-emerald-900">{goals.bulking}</p>
                <p className="text-xs text-emerald-600 mt-2 font-medium">קלוריות ליום</p>
              </div>
            </div>
          </div>

          {/* Macros Table */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">חלוקת מקרו-נוטריינטים (לשמירה)</h3>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-right text-sm font-bold text-gray-700">מקרו</th>
                    <th className="px-5 py-4 text-center text-sm font-bold text-gray-700">גרם</th>
                    <th className="px-5 py-4 text-center text-sm font-bold text-gray-700">קלוריות</th>
                    <th className="px-5 py-4 text-left text-sm font-bold text-gray-700">אחוז</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-rose-50 transition-all duration-300">
                    <td className="px-5 py-4 text-sm font-bold text-gray-900">חלבון</td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-lg font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-lg">{proteinGrams}g</span>
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-gray-600 font-medium">{proteinCalories} kcal</td>
                    <td className="px-5 py-4 text-left text-sm text-gray-600 font-medium">{Math.round((proteinCalories / tdee) * 100)}%</td>
                  </tr>
                  <tr className="hover:bg-amber-50 transition-all duration-300">
                    <td className="px-5 py-4 text-sm font-bold text-gray-900">שומן</td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-lg font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-lg">{fatGrams}g</span>
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-gray-600 font-medium">{fatCalories} kcal</td>
                    <td className="px-5 py-4 text-left text-sm text-gray-600 font-medium">{Math.round((fatCalories / tdee) * 100)}%</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-all duration-300">
                    <td className="px-5 py-4 text-sm font-bold text-gray-900">פחמימות</td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-lg font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-lg">{carbsGrams}g</span>
                    </td>
                    <td className="px-5 py-4 text-center text-sm text-gray-600 font-medium">{carbsCalories} kcal</td>
                    <td className="px-5 py-4 text-left text-sm text-gray-600 font-medium">{Math.round((carbsCalories / tdee) * 100)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-gray-600 bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border-2 border-amber-200">
              <p className="font-bold mb-2 text-amber-800">הערות:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
                <li>חלבון: 2.2 גרם לק״ג משקל גוף (לבניית שריר)</li>
                <li>שומן: 25% מסך הקלוריות</li>
                <li>פחמימות: יתרת הקלוריות</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gradient-to-br from-gray-50 to-white border-t border-gray-200 p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
