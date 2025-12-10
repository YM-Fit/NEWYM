import { useState } from 'react';
import { X, Calculator, Activity, TrendingUp } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <Calculator className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">מחשבון TDEE</h2>
              <p className="text-sm text-gray-500">צריכה קלורית יומית ומקרו-נוטריינטים</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Input Section */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-xl p-6 border-2 border-emerald-200">
            <h3 className="text-lg font-bold text-emerald-900 mb-4">פרטים אישיים</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-emerald-800 mb-2">
                  משקל (ק״ג)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-bold text-center border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                  className="w-full px-4 py-3 text-lg font-bold text-center border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                  className="w-full px-4 py-3 text-lg font-bold text-center border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                  className="w-full px-4 py-3 text-lg font-bold text-center border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="male">גבר</option>
                  <option value="female">אישה</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-emerald-800 mb-2">
                רמת פעילות
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full px-4 py-3 text-lg font-bold border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
            {/* BMR */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-blue-700" />
                <p className="text-sm font-semibold text-blue-700">BMR - קצב מטבולי בסיסי</p>
              </div>
              <p className="text-4xl font-bold text-blue-900">{Math.round(bmr)}</p>
              <p className="text-sm text-blue-600 mt-1">קלוריות ליום במנוחה</p>
            </div>

            {/* TDEE */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-700" />
                <p className="text-sm font-semibold text-green-700">TDEE - צריכה יומית</p>
              </div>
              <p className="text-4xl font-bold text-green-900">{tdee}</p>
              <p className="text-sm text-green-600 mt-1">קלוריות ליום עם פעילות</p>
            </div>
          </div>

          {/* Goals */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">יעדים קלוריים</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                <p className="text-sm font-semibold text-red-700 mb-1">הרזיה (-20%)</p>
                <p className="text-3xl font-bold text-red-900">{goals.cutting}</p>
                <p className="text-xs text-red-600 mt-1">קלוריות ליום</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <p className="text-sm font-semibold text-blue-700 mb-1">שמירה על משקל</p>
                <p className="text-3xl font-bold text-blue-900">{goals.maintenance}</p>
                <p className="text-xs text-blue-600 mt-1">קלוריות ליום</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                <p className="text-sm font-semibold text-green-700 mb-1">עליית מסה (+10%)</p>
                <p className="text-3xl font-bold text-green-900">{goals.bulking}</p>
                <p className="text-xs text-green-600 mt-1">קלוריות ליום</p>
              </div>
            </div>
          </div>

          {/* Macros */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">חלוקת מקרו-נוטריינטים (לשמירה)</h3>
            <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">מקרו</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">גרם</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">קלוריות</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">אחוז</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-red-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">חלבון</td>
                    <td className="px-4 py-3 text-center text-lg font-bold text-gray-900">{proteinGrams}g</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{proteinCalories} kcal</td>
                    <td className="px-4 py-3 text-left text-sm text-gray-600">{Math.round((proteinCalories / tdee) * 100)}%</td>
                  </tr>
                  <tr className="hover:bg-amber-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">שומן</td>
                    <td className="px-4 py-3 text-center text-lg font-bold text-gray-900">{fatGrams}g</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{fatCalories} kcal</td>
                    <td className="px-4 py-3 text-left text-sm text-gray-600">{Math.round((fatCalories / tdee) * 100)}%</td>
                  </tr>
                  <tr className="hover:bg-blue-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">פחמימות</td>
                    <td className="px-4 py-3 text-center text-lg font-bold text-gray-900">{carbsGrams}g</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{carbsCalories} kcal</td>
                    <td className="px-4 py-3 text-left text-sm text-gray-600">{Math.round((carbsCalories / tdee) * 100)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              <p className="font-semibold mb-1">הערות:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>חלבון: 2.2 גרם לק״ג משקל גוף (לבניית שריר)</li>
                <li>שומן: 25% מסך הקלוריות</li>
                <li>פחמימות: יתרת הקלוריות</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
