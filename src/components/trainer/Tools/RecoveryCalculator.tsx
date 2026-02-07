import { useState } from 'react';
import { X, Clock, Activity, Zap, Info, Calendar } from 'lucide-react';

interface RecoveryCalculatorProps {
  onClose: () => void;
}

export default function RecoveryCalculator({ onClose }: RecoveryCalculatorProps) {
  const [muscleGroup, setMuscleGroup] = useState<string>('chest');
  const [intensity, setIntensity] = useState<'low' | 'moderate' | 'high' | 'extreme'>('moderate');
  const [age, setAge] = useState<number>(30);
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [sleepQuality, setSleepQuality] = useState<'poor' | 'average' | 'good'>('average');

  const muscleGroups = {
    chest: { label: 'חזה', baseRecovery: 48 },
    back: { label: 'גב', baseRecovery: 48 },
    shoulders: { label: 'כתפיים', baseRecovery: 48 },
    biceps: { label: 'יד קדמית', baseRecovery: 36 },
    triceps: { label: 'יד אחורית', baseRecovery: 36 },
    legs: { label: 'רגליים', baseRecovery: 72 },
    glutes: { label: 'ישבן', baseRecovery: 72 },
    core: { label: 'בטן', baseRecovery: 24 },
  };

  const intensityMultipliers = {
    low: { value: 0.7, label: 'נמוכה', description: 'אימון קל, הרגשה טובה בסוף', color: 'emerald' },
    moderate: { value: 1.0, label: 'בינונית', description: 'אימון סטנדרטי, עייפות סבירה', color: 'blue' },
    high: { value: 1.3, label: 'גבוהה', description: 'אימון אינטנסיבי, עייפות משמעותית', color: 'amber' },
    extreme: { value: 1.5, label: 'קיצונית', description: 'אימון עד כשל, תשישות', color: 'red' },
  };

  const experienceMultipliers = {
    beginner: { value: 1.3, label: 'מתחיל', description: 'פחות משנה של אימונים' },
    intermediate: { value: 1.0, label: 'בינוני', description: '1-3 שנות אימונים' },
    advanced: { value: 0.85, label: 'מתקדם', description: 'יותר מ-3 שנות אימונים' },
  };

  const sleepMultipliers = {
    poor: { value: 1.3, label: 'לקויה', description: 'פחות מ-6 שעות' },
    average: { value: 1.0, label: 'ממוצעת', description: '6-7 שעות' },
    good: { value: 0.85, label: 'טובה', description: '8+ שעות' },
  };

  const ageMultiplier = age < 25 ? 0.9 : age < 35 ? 1.0 : age < 45 ? 1.15 : 1.3;

  const baseRecovery = muscleGroups[muscleGroup as keyof typeof muscleGroups].baseRecovery;
  const totalRecoveryHours = Math.round(
    baseRecovery *
    intensityMultipliers[intensity].value *
    experienceMultipliers[experience].value *
    sleepMultipliers[sleepQuality].value *
    ageMultiplier
  );

  const recoveryDays = (totalRecoveryHours / 24).toFixed(1);
  const nextTrainingDate = new Date();
  nextTrainingDate.setHours(nextTrainingDate.getHours() + totalRecoveryHours);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const recoveryTips = [
    { condition: sleepQuality === 'poor', tip: 'שפר את איכות השינה - 7-9 שעות לילה' },
    { condition: intensity === 'extreme', tip: 'שקול להפחית עצימות באימון הבא' },
    { condition: age > 40, tip: 'הוסף יום מנוחה נוסף בין אימונים' },
    { condition: experience === 'beginner', tip: 'אל תתאמן את אותו שריר יותר מפעמיים בשבוע' },
  ].filter(t => t.condition);

  const muscleRecoveryTable = Object.entries(muscleGroups).map(([key, { label, baseRecovery }]) => {
    const hours = Math.round(
      baseRecovery *
      intensityMultipliers[intensity].value *
      experienceMultipliers[experience].value *
      sleepMultipliers[sleepQuality].value *
      ageMultiplier
    );
    return { key, label, hours, days: (hours / 24).toFixed(1) };
  });

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-emerald-500 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Clock className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">מחשבון זמן התאוששות</h2>
              <p className="text-sm text-emerald-100">כמה מנוחה צריך בין אימונים?</p>
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
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground">פרטי האימון</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">קבוצת שריר</label>
                <select
                  value={muscleGroup}
                  onChange={(e) => setMuscleGroup(e.target.value)}
                  className="w-full px-4 py-3 text-lg font-bold border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-surface text-foreground"
                >
                  {Object.entries(muscleGroups).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">עצימות האימון</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(intensityMultipliers).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => setIntensity(key as any)}
                      className={`py-3 px-4 rounded-xl font-bold transition-all text-sm ${
                        intensity === key
                          ? 'bg-emerald-500 text-foreground'
                          : 'bg-surface border border-border text-foreground hover:bg-elevated'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">גיל</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-4 py-3 text-lg font-bold text-center border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-surface text-foreground"
                    min="15"
                    max="80"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">ניסיון</label>
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value as any)}
                    className="w-full px-4 py-3 text-lg font-bold border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-surface text-foreground"
                  >
                    {Object.entries(experienceMultipliers).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">איכות שינה</label>
                <div className="flex gap-3">
                  {Object.entries(sleepMultipliers).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => setSleepQuality(key as any)}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                        sleepQuality === key
                          ? 'bg-emerald-500 text-foreground'
                          : 'bg-surface border border-border text-foreground hover:bg-elevated'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-500 rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-foreground" />
                </div>
                <p className="text-sm font-bold text-foreground/90">זמן התאוששות</p>
              </div>
              <p className="text-5xl font-bold text-foreground">{recoveryDays}</p>
              <p className="text-lg text-foreground/80 mt-2 font-medium">ימים</p>
            </div>

            <div className="bg-blue-500 rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-foreground" />
                </div>
                <p className="text-sm font-bold text-foreground/90">אימון הבא</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatDate(nextTrainingDate)}</p>
              <p className="text-sm text-foreground/80 mt-2 font-medium">{totalRecoveryHours} שעות</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">זמן התאוששות לכל קבוצת שריר</h3>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-5 py-4 text-right text-sm font-bold text-foreground">קבוצת שריר</th>
                    <th className="px-5 py-4 text-center text-sm font-bold text-foreground">שעות</th>
                    <th className="px-5 py-4 text-left text-sm font-bold text-foreground">ימים</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700/50">
                  {muscleRecoveryTable.map((item) => (
                    <tr
                      key={item.key}
                      className={`transition-all ${
                        item.key === muscleGroup ? 'bg-emerald-500/10' : 'hover:bg-surface'
                      }`}
                    >
                      <td className="px-5 py-3">
                        <span className={`font-semibold ${item.key === muscleGroup ? 'text-emerald-400' : 'text-foreground'}`}>
                          {item.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="font-bold text-muted">{item.hours}</span>
                      </td>
                      <td className="px-5 py-3 text-left">
                        <span className={`font-bold px-3 py-1 rounded-lg ${
                          item.key === muscleGroup
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-muted bg-surface'
                        }`}>
                          {item.days}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {recoveryTips.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="font-bold text-amber-400 mb-2">המלצות אישיות</p>
                  <ul className="text-sm text-muted leading-relaxed space-y-1">
                    {recoveryTips.map((tip, index) => (
                      <li key={index}>{tip.tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="font-bold text-blue-400 mb-1">מה משפיע על התאוששות?</p>
                <ul className="text-sm text-muted leading-relaxed space-y-1">
                  <li>שינה איכותית - הגורם המשמעותי ביותר</li>
                  <li>תזונה נכונה - חלבון ופחמימות אחרי אימון</li>
                  <li>הידרציה - שתייה מספקת</li>
                  <li>ניהול מתח - סטרס מאריך זמן התאוששות</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-foreground px-6 py-4 rounded-xl font-bold text-lg transition-all"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
