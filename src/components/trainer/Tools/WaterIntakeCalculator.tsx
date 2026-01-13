import { useState } from 'react';
import { X, Droplets, Activity, Sun, Info } from 'lucide-react';

interface WaterIntakeCalculatorProps {
  onClose: () => void;
  initialWeight?: number;
}

export default function WaterIntakeCalculator({
  onClose,
  initialWeight = 70,
}: WaterIntakeCalculatorProps) {
  const [weight, setWeight] = useState<number>(initialWeight);
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'>('moderate');
  const [climate, setClimate] = useState<'cold' | 'moderate' | 'hot'>('moderate');

  const activityMultipliers = {
    sedentary: { value: 0.03, label: 'יושבני', description: 'עבודה משרדית, ללא פעילות' },
    light: { value: 0.035, label: 'פעילות קלה', description: '1-2 אימונים בשבוע' },
    moderate: { value: 0.04, label: 'פעילות בינונית', description: '3-5 אימונים בשבוע' },
    active: { value: 0.045, label: 'פעיל מאוד', description: '6-7 אימונים בשבוע' },
    athlete: { value: 0.05, label: 'ספורטאי', description: 'אימונים אינטנסיביים יומיים' },
  };

  const climateMultipliers = {
    cold: { value: 0.9, label: 'קר', icon: '❄️' },
    moderate: { value: 1, label: 'ממוזג', icon: '🌤️' },
    hot: { value: 1.2, label: 'חם/לח', icon: '☀️' },
  };

  const baseWater = weight * activityMultipliers[activityLevel].value;
  const totalWater = baseWater * climateMultipliers[climate].value;
  const glasses = Math.round(totalWater / 0.25);

  const schedule = [
    { time: 'בוקר (07:00)', amount: Math.round(totalWater * 0.15 * 1000), note: 'מיד אחרי הקימה' },
    { time: 'בוקר (09:00)', amount: Math.round(totalWater * 0.1 * 1000), note: 'לפני ארוחת בוקר' },
    { time: 'צהריים (12:00)', amount: Math.round(totalWater * 0.15 * 1000), note: 'לפני ארוחת צהריים' },
    { time: 'אחה"צ (15:00)', amount: Math.round(totalWater * 0.15 * 1000), note: 'בזמן העבודה' },
    { time: 'לפני אימון', amount: Math.round(totalWater * 0.1 * 1000), note: '30 דק לפני' },
    { time: 'במהלך אימון', amount: Math.round(totalWater * 0.15 * 1000), note: 'לגימות קטנות' },
    { time: 'ערב (19:00)', amount: Math.round(totalWater * 0.15 * 1000), note: 'אחרי האימון' },
    { time: 'לפני שינה', amount: Math.round(totalWater * 0.05 * 1000), note: 'כמות קטנה' },
  ];

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-cyan-500 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Droplets className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">מחשבון צריכת מים</h2>
              <p className="text-sm text-cyan-100">כמה מים לשתות ביום?</p>
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
          <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">הפרטים שלך</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">משקל (ק"ג)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-bold text-center border border-zinc-700/50 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all bg-zinc-800/50 text-white"
                  min="30"
                  max="200"
                  step="0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">רמת פעילות</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as any)}
                  className="w-full px-4 py-3 text-lg font-bold border border-zinc-700/50 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all bg-zinc-800/50 text-white"
                >
                  {Object.entries(activityMultipliers).map(([key, { label, description }]) => (
                    <option key={key} value={key}>
                      {label} - {description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">אקלים</label>
                <div className="flex gap-3">
                  {Object.entries(climateMultipliers).map(([key, { label, icon }]) => (
                    <button
                      key={key}
                      onClick={() => setClimate(key as any)}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                        climate === key
                          ? 'bg-cyan-500 text-white'
                          : 'bg-zinc-800 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      <span className="text-xl">{icon}</span>
                      <span className="block mt-1">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-cyan-500 rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm font-bold text-white/90">ליטרים ליום</p>
              </div>
              <p className="text-5xl font-bold text-white">{totalWater.toFixed(1)}</p>
              <p className="text-lg text-white/80 mt-2 font-medium">ליטר</p>
            </div>

            <div className="bg-emerald-500 rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Sun className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm font-bold text-white/90">כוסות ליום</p>
              </div>
              <p className="text-5xl font-bold text-white">{glasses}</p>
              <p className="text-lg text-white/80 mt-2 font-medium">כוסות (250 מ"ל)</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-4">לוח זמנים מומלץ</h3>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="px-5 py-4 text-right text-sm font-bold text-zinc-300">זמן</th>
                    <th className="px-5 py-4 text-center text-sm font-bold text-zinc-300">כמות</th>
                    <th className="px-5 py-4 text-left text-sm font-bold text-zinc-300">הערה</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700/50">
                  {schedule.map((item, index) => (
                    <tr key={index} className="hover:bg-cyan-500/5 transition-all">
                      <td className="px-5 py-3">
                        <span className="font-semibold text-white">{item.time}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-lg">
                          {item.amount} מ"ל
                        </span>
                      </td>
                      <td className="px-5 py-3 text-left">
                        <span className="text-zinc-400 text-sm">{item.note}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-amber-400 mb-1">טיפים</p>
                <ul className="text-sm text-zinc-400 leading-relaxed space-y-1">
                  <li>התחל את היום עם כוס מים</li>
                  <li>שתה לפני שאתה צמא - צמא מסמן התייבשות קלה</li>
                  <li>הוסף 500 מ"ל לכל שעת אימון</li>
                  <li>צבע השתן בהיר = מספיק מים</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-6 rounded-b-2xl">
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
