import { useState } from 'react';
import { X, Beef, Target, Activity, Info, Clock } from 'lucide-react';

interface ProteinCalculatorProps {
  onClose: () => void;
  initialWeight?: number;
}

export default function ProteinCalculator({
  onClose,
  initialWeight = 70,
}: ProteinCalculatorProps) {
  const [weight, setWeight] = useState<number>(initialWeight);
  const [goal, setGoal] = useState<'maintain' | 'build' | 'lose'>('maintain');
  const [activityLevel, setActivityLevel] = useState<'light' | 'moderate' | 'heavy'>('moderate');
  const [mealsPerDay, setMealsPerDay] = useState<number>(4);

  const goalMultipliers = {
    maintain: { value: 1.6, label: 'שמירה על מסה', color: 'blue' },
    build: { value: 2.2, label: 'בניית שריר', color: 'emerald' },
    lose: { value: 2.0, label: 'הרזיה (שמירת שריר)', color: 'amber' },
  };

  const activityMultipliers = {
    light: { value: 0.9, label: 'פעילות קלה', description: '1-2 אימונים בשבוע' },
    moderate: { value: 1.0, label: 'פעילות בינונית', description: '3-5 אימונים בשבוע' },
    heavy: { value: 1.1, label: 'פעילות אינטנסיבית', description: '6+ אימונים בשבוע' },
  };

  const baseProtein = weight * goalMultipliers[goal].value;
  const totalProtein = Math.round(baseProtein * activityMultipliers[activityLevel].value);
  const proteinPerMeal = Math.round(totalProtein / mealsPerDay);
  const proteinCalories = totalProtein * 4;

  const proteinSources = [
    { name: 'חזה עוף', protein: 31, portion: '100 גרם', portions: (totalProtein / 31).toFixed(1) },
    { name: 'ביצה', protein: 6, portion: 'יחידה', portions: Math.round(totalProtein / 6).toString() },
    { name: 'טונה', protein: 26, portion: '100 גרם', portions: (totalProtein / 26).toFixed(1) },
    { name: 'גבינת קוטג׳ 5%', protein: 11, portion: '100 גרם', portions: (totalProtein / 11).toFixed(1) },
    { name: 'אבקת חלבון', protein: 25, portion: 'סקופ (30 גרם)', portions: (totalProtein / 25).toFixed(1) },
    { name: 'בשר בקר', protein: 26, portion: '100 גרם', portions: (totalProtein / 26).toFixed(1) },
  ];

  const mealPlan = Array.from({ length: mealsPerDay }, (_, i) => {
    const mealNames = ['ארוחת בוקר', 'ארוחת ביניים 1', 'ארוחת צהריים', 'ארוחת ביניים 2', 'ארוחת ערב', 'ארוחת לילה'];
    return {
      name: mealNames[i] || `ארוחה ${i + 1}`,
      protein: proteinPerMeal,
    };
  });

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Beef className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">מחשבון חלבון יומי</h2>
              <p className="text-sm text-amber-100">כמה חלבון אתה צריך?</p>
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
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-2xl p-6 border-2 border-amber-200 shadow-lg">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-amber-900">הפרטים שלך</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-2">משקל (ק"ג)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-bold text-center border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 bg-white"
                  min="30"
                  max="200"
                  step="0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-2">מטרה</label>
                <div className="flex gap-3">
                  {Object.entries(goalMultipliers).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => setGoal(key as any)}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-300 text-sm ${
                        goal === key
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                          : 'bg-white border-2 border-amber-200 text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-2">רמת פעילות</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as any)}
                  className="w-full px-4 py-3 text-lg font-bold border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 bg-white"
                >
                  {Object.entries(activityMultipliers).map(([key, { label, description }]) => (
                    <option key={key} value={key}>
                      {label} - {description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-2">מספר ארוחות ביום</label>
                <div className="flex gap-2">
                  {[3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => setMealsPerDay(num)}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${
                        mealsPerDay === num
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                          : 'bg-white border-2 border-amber-200 text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-6 text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Beef className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm font-bold text-white/90">חלבון יומי</p>
              </div>
              <p className="text-5xl font-bold text-white">{totalProtein}</p>
              <p className="text-lg text-white/80 mt-2 font-medium">גרם</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 rounded-2xl p-6 text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm font-bold text-white/90">לארוחה</p>
              </div>
              <p className="text-5xl font-bold text-white">{proteinPerMeal}</p>
              <p className="text-lg text-white/80 mt-2 font-medium">גרם</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-emerald-900">חלוקה לארוחות</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {mealPlan.map((meal, index) => (
                <div key={index} className="bg-white px-4 py-2 rounded-xl border border-emerald-200">
                  <span className="text-sm text-gray-600">{meal.name}: </span>
                  <span className="font-bold text-emerald-700">{meal.protein}g</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">מקורות חלבון מומלצים</h3>
            <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-right text-sm font-bold text-gray-700">מקור</th>
                    <th className="px-5 py-4 text-center text-sm font-bold text-gray-700">חלבון</th>
                    <th className="px-5 py-4 text-center text-sm font-bold text-gray-700">מנה</th>
                    <th className="px-5 py-4 text-left text-sm font-bold text-gray-700">להגיע ליעד</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proteinSources.map((source) => (
                    <tr key={source.name} className="hover:bg-amber-50 transition-all duration-300">
                      <td className="px-5 py-3">
                        <span className="font-semibold text-gray-900">{source.name}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="font-bold text-amber-700">{source.protein}g</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-gray-600 text-sm">{source.portion}</span>
                      </td>
                      <td className="px-5 py-3 text-left">
                        <span className="font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-lg">
                          {source.portions} מנות
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-blue-800 mb-1">טיפים לצריכת חלבון</p>
                <ul className="text-sm text-blue-700 leading-relaxed space-y-1">
                  <li>פרוס את החלבון לאורך היום - 20-40 גרם לארוחה</li>
                  <li>צרוך חלבון תוך שעתיים אחרי האימון</li>
                  <li>שלב מקורות חלבון מגוונים</li>
                  <li>חלבון מ-{proteinCalories} קלוריות מתוך התפריט היומי</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gradient-to-br from-gray-50 to-white border-t border-gray-200 p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
