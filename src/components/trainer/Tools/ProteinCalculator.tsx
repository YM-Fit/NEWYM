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
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-amber-500 p-6 rounded-t-2xl flex items-center justify-between">
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
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-surface rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground">הפרטים שלך</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">משקל (ק"ג)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-bold text-center border border-border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-surface text-foreground"
                  min="30"
                  max="200"
                  step="0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">מטרה</label>
                <div className="flex gap-3">
                  {Object.entries(goalMultipliers).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => setGoal(key as any)}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all text-sm ${
                        goal === key
                          ? 'bg-amber-500 text-white'
                          : 'bg-surface border border-border text-foreground hover:bg-elevated'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">רמת פעילות</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as any)}
                  className="w-full px-4 py-3 text-lg font-bold border border-border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-surface text-foreground"
                >
                  {Object.entries(activityMultipliers).map(([key, { label, description }]) => (
                    <option key={key} value={key}>
                      {label} - {description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">מספר ארוחות ביום</label>
                <div className="flex gap-2">
                  {[3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => setMealsPerDay(num)}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                        mealsPerDay === num
                          ? 'bg-amber-500 text-white'
                          : 'bg-surface border border-border text-foreground hover:bg-elevated'
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
            <div className="bg-amber-500 rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Beef className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm font-bold text-white/90">חלבון יומי</p>
              </div>
              <p className="text-5xl font-bold text-white">{totalProtein}</p>
              <p className="text-lg text-white/80 mt-2 font-medium">גרם</p>
            </div>

            <div className="bg-emerald-500 rounded-2xl p-6 text-center">
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

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-emerald-400">חלוקה לארוחות</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {mealPlan.map((meal, index) => (
                <div key={index} className="bg-surface px-4 py-2 rounded-xl border border-border">
                  <span className="text-sm text-muted">{meal.name}: </span>
                  <span className="font-bold text-emerald-400">{meal.protein}g</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">מקורות חלבון מומלצים</h3>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-5 py-4 text-right text-sm font-bold text-foreground">מקור</th>
                    <th className="px-5 py-4 text-center text-sm font-bold text-foreground">חלבון</th>
                    <th className="px-5 py-4 text-center text-sm font-bold text-foreground">מנה</th>
                    <th className="px-5 py-4 text-left text-sm font-bold text-foreground">להגיע ליעד</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700/50">
                  {proteinSources.map((source) => (
                    <tr key={source.name} className="hover:bg-amber-500/5 transition-all">
                      <td className="px-5 py-3">
                        <span className="font-semibold text-foreground">{source.name}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="font-bold text-amber-400">{source.protein}g</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-muted text-sm">{source.portion}</span>
                      </td>
                      <td className="px-5 py-3 text-left">
                        <span className="font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">
                          {source.portions} מנות
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-blue-400 mb-1">טיפים לצריכת חלבון</p>
                <ul className="text-sm text-muted leading-relaxed space-y-1">
                  <li>פרוס את החלבון לאורך היום - 20-40 גרם לארוחה</li>
                  <li>צרוך חלבון תוך שעתיים אחרי האימון</li>
                  <li>שלב מקורות חלבון מגוונים</li>
                  <li>חלבון מ-{proteinCalories} קלוריות מתוך התפריט היומי</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
