import { useState } from 'react';
import { X, Percent, User, Info } from 'lucide-react';

interface BodyFatCalculatorProps {
  onClose: () => void;
  initialGender?: 'male' | 'female';
}

export default function BodyFatCalculator({
  onClose,
  initialGender = 'male',
}: BodyFatCalculatorProps) {
  const [gender, setGender] = useState<'male' | 'female'>(initialGender);
  const [height, setHeight] = useState<number>(170);
  const [waist, setWaist] = useState<number>(85);
  const [neck, setNeck] = useState<number>(38);
  const [hips, setHips] = useState<number>(95);

  const calculateBodyFat = (): number => {
    if (gender === 'male') {
      const logValue = Math.log10(waist - neck) - Math.log10(height);
      return 86.010 * logValue - 70.041 + 36.76;
    } else {
      const logValue = Math.log10(waist + hips - neck) - Math.log10(height);
      return 163.205 * logValue - 97.684 - 78.387;
    }
  };

  const bodyFat = Math.max(0, Math.min(60, calculateBodyFat()));

  const getCategory = (bf: number, gender: 'male' | 'female') => {
    if (gender === 'male') {
      if (bf < 6) return { label: 'חיוני', color: 'text-red-400', bg: 'bg-red-500/10' };
      if (bf < 14) return { label: 'ספורטאי', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      if (bf < 18) return { label: 'כושר', color: 'text-blue-400', bg: 'bg-blue-500/10' };
      if (bf < 25) return { label: 'ממוצע', color: 'text-amber-400', bg: 'bg-amber-500/10' };
      return { label: 'מעל הממוצע', color: 'text-red-400', bg: 'bg-red-500/10' };
    } else {
      if (bf < 14) return { label: 'חיוני', color: 'text-red-400', bg: 'bg-red-500/10' };
      if (bf < 21) return { label: 'ספורטאית', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      if (bf < 25) return { label: 'כושר', color: 'text-blue-400', bg: 'bg-blue-500/10' };
      if (bf < 32) return { label: 'ממוצע', color: 'text-amber-400', bg: 'bg-amber-500/10' };
      return { label: 'מעל הממוצע', color: 'text-red-400', bg: 'bg-red-500/10' };
    }
  };

  const category = getCategory(bodyFat, gender);

  const categories = gender === 'male' ? [
    { label: 'שומן חיוני', range: '2-5%', color: 'bg-red-500' },
    { label: 'ספורטאי', range: '6-13%', color: 'bg-emerald-500' },
    { label: 'כושר', range: '14-17%', color: 'bg-blue-500' },
    { label: 'ממוצע', range: '18-24%', color: 'bg-amber-500' },
    { label: 'מעל הממוצע', range: '25%+', color: 'bg-red-400' },
  ] : [
    { label: 'שומן חיוני', range: '10-13%', color: 'bg-red-500' },
    { label: 'ספורטאית', range: '14-20%', color: 'bg-emerald-500' },
    { label: 'כושר', range: '21-24%', color: 'bg-blue-500' },
    { label: 'ממוצע', range: '25-31%', color: 'bg-amber-500' },
    { label: 'מעל הממוצע', range: '32%+', color: 'bg-red-400' },
  ];

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-rose-500 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Percent className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">מחשבון אחוז שומן</h2>
              <p className="text-sm text-rose-100">חישוב לפי שיטת Navy</p>
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
              <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground">הזן מדידות</h3>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-foreground mb-2">מין</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setGender('male')}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                    gender === 'male'
                      ? 'bg-rose-500 text-white'
                      : 'bg-surface border border-border text-foreground hover:bg-elevated'
                  }`}
                >
                  גבר
                </button>
                <button
                  onClick={() => setGender('female')}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                    gender === 'female'
                      ? 'bg-rose-500 text-white'
                      : 'bg-surface border border-border text-foreground hover:bg-elevated'
                  }`}
                >
                  אישה
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">גובה (ס"מ)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-bold text-center border border-border rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all bg-surface text-foreground"
                  min="100"
                  max="250"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">היקף צוואר (ס"מ)</label>
                <input
                  type="number"
                  value={neck}
                  onChange={(e) => setNeck(Number(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-bold text-center border border-border rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all bg-surface text-foreground"
                  min="20"
                  max="60"
                  step="0.5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">היקף מותן (ס"מ)</label>
                <input
                  type="number"
                  value={waist}
                  onChange={(e) => setWaist(Number(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-bold text-center border border-border rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all bg-surface text-foreground"
                  min="50"
                  max="200"
                  step="0.5"
                />
              </div>
              {gender === 'female' && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">היקף ירכיים (ס"מ)</label>
                  <input
                    type="number"
                    value={hips}
                    onChange={(e) => setHips(Number(e.target.value))}
                    className="w-full px-4 py-3 text-lg font-bold text-center border border-border rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all bg-surface text-foreground"
                    min="50"
                    max="200"
                    step="0.5"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-rose-500 rounded-2xl p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Percent className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-bold text-white/90">אחוז שומן משוער</p>
            </div>
            <p className="text-6xl font-bold text-white">{bodyFat.toFixed(1)}%</p>
            <div className={`mt-4 inline-block px-4 py-2 rounded-xl ${category.bg} border border-border/30`}>
              <span className={`font-bold ${category.color}`}>{category.label}</span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">טווחי אחוזי שומן</h3>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-5 py-4 text-right text-sm font-bold text-foreground">קטגוריה</th>
                    <th className="px-5 py-4 text-left text-sm font-bold text-foreground">טווח</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700/50">
                  {categories.map((cat) => (
                    <tr key={cat.label} className="hover:bg-surface transition-all">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                          <span className="font-semibold text-foreground">{cat.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-left">
                        <span className="font-bold text-muted bg-surface px-3 py-1 rounded-lg">{cat.range}</span>
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
                <p className="font-bold text-amber-400 mb-1">הוראות מדידה</p>
                <ul className="text-sm text-muted leading-relaxed space-y-1">
                  <li>צוואר: מדוד בנקודה הצרה ביותר, מתחת לגרון</li>
                  <li>מותן: מדוד בגובה הטבור, ללא לחץ</li>
                  {gender === 'female' && <li>ירכיים: מדוד בנקודה הרחבה ביותר</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
