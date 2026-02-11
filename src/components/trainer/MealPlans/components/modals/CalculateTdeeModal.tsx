import { useState, useEffect } from 'react';
import { X, Calculator, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useTraineeForMacros,
  calculatePlanMacros,
  type TraineeMacroData,
} from '../../hooks/useTraineeForMacros';
import type { ActivityLevel, Goal } from '../../../../../utils/calorieCalculations';

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'יושבני',
  light: 'קל',
  moderate: 'בינוני',
  active: 'פעיל',
  very_active: 'פעיל מאוד',
};

const GOAL_LABELS: Record<Goal, string> = {
  cutting: 'ירידה במשקל',
  maintenance: 'שמירה',
  bulking: 'עלייה במשקל',
};

interface CalculateTdeeModalProps {
  traineeId: string | null;
  onApply: (macros: {
    daily_calories: number;
    protein_grams: number;
    carbs_grams: number;
    fat_grams: number;
    daily_water_ml: number;
  }) => void;
  onClose: () => void;
}

export function CalculateTdeeModal({
  traineeId,
  onApply,
  onClose,
}: CalculateTdeeModalProps) {
  const { data, loading, error } = useTraineeForMacros(traineeId);
  const [goal, setGoal] = useState<Goal>('maintenance');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [editableCalories, setEditableCalories] = useState<string>('');
  const [editableProtein, setEditableProtein] = useState<string>('');
  const [editableCarbs, setEditableCarbs] = useState<string>('');
  const [editableFat, setEditableFat] = useState<string>('');
  const [editableWater, setEditableWater] = useState<string>('');

  useEffect(() => {
    if (data) {
      setGoal(data.goal);
      setActivityLevel(data.activityLevel);
    }
  }, [data]);

  const effectiveData: TraineeMacroData | null = data
    ? { ...data, goal, activityLevel }
    : null;

  const calculated = effectiveData ? calculatePlanMacros(effectiveData) : null;

  useEffect(() => {
    if (calculated) {
      setEditableCalories(String(calculated.daily_calories));
      setEditableProtein(String(calculated.protein_grams));
      setEditableCarbs(String(calculated.carbs_grams));
      setEditableFat(String(calculated.fat_grams));
      setEditableWater(String(calculated.daily_water_ml));
    }
  }, [calculated]);

  const handleApply = () => {
    const calories = parseInt(editableCalories, 10);
    const protein = parseInt(editableProtein, 10);
    const carbs = parseInt(editableCarbs, 10);
    const fat = parseInt(editableFat, 10);
    const water = parseInt(editableWater, 10);
    if (!Number.isNaN(calories) && calories > 0 && !Number.isNaN(protein) && protein >= 0 &&
        !Number.isNaN(carbs) && carbs >= 0 && !Number.isNaN(fat) && fat >= 0 && !Number.isNaN(water) && water >= 0) {
      onApply({
        daily_calories: calories,
        protein_grams: protein,
        carbs_grams: carbs,
        fat_grams: fat,
        daily_water_ml: water,
      });
      onClose();
    } else {
      toast.error('נא למלא קלוריות (מעל 0) וערכי מאקרו תקינים');
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="premium-card-static max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary-400" />
            חישוב מאקרו לפי TDEE
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-bg-surface)] rounded-xl transition-all"
            aria-label="סגור"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
          </div>
        ) : error ? (
          <p className="text-red-400 text-center py-6">{error}</p>
        ) : data && calculated ? (
          <div className="space-y-4">
            <div className="p-4 bg-[var(--color-bg-surface)] rounded-xl text-sm">
              <p className="text-[var(--color-text-muted)] mb-1">נתונים בשימוש:</p>
              <p>
                משקל: {data.weight} ק"ג • גובה: {data.height} ס"מ • גיל: {data.age} •{' '}
                {data.gender === 'male' ? 'גבר' : 'אישה'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
                מטרה
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as Goal)}
                className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              >
                {(['cutting', 'maintenance', 'bulking'] as const).map((g) => (
                  <option key={g} value={g}>
                    {GOAL_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
                רמת פעילות
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              >
                {(['sedentary', 'light', 'moderate', 'active', 'very_active'] as const).map(
                  (a) => (
                    <option key={a} value={a}>
                      {ACTIVITY_LABELS[a]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="p-4 bg-primary-500/10 rounded-xl border border-primary-500/20 space-y-3">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                ערכי יעד (ניתן לעריכה):
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm items-center">
                <label className="text-[var(--color-text-muted)]">קלוריות</label>
                <input
                  type="number"
                  min={0}
                  value={editableCalories}
                  onChange={(e) => setEditableCalories(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-[var(--color-text-primary)] font-semibold text-primary-500"
                />
                <label className="text-[var(--color-text-muted)]">חלבון (גרם)</label>
                <input
                  type="number"
                  min={0}
                  value={editableProtein}
                  onChange={(e) => setEditableProtein(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-[var(--color-text-primary)] font-semibold text-red-500"
                />
                <label className="text-[var(--color-text-muted)]">פחמימות (גרם)</label>
                <input
                  type="number"
                  min={0}
                  value={editableCarbs}
                  onChange={(e) => setEditableCarbs(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-[var(--color-text-primary)] font-semibold text-blue-500"
                />
                <label className="text-[var(--color-text-muted)]">שומן (גרם)</label>
                <input
                  type="number"
                  min={0}
                  value={editableFat}
                  onChange={(e) => setEditableFat(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-[var(--color-text-primary)] font-semibold text-amber-600"
                />
                <label className="text-[var(--color-text-muted)]">מים (מ״ל)</label>
                <input
                  type="number"
                  min={0}
                  value={editableWater}
                  onChange={(e) => setEditableWater(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-[var(--color-text-primary)] font-semibold"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] rounded-xl font-semibold hover:bg-[var(--color-bg-elevated)] transition-all"
              >
                ביטול
              </button>
              <button
                onClick={handleApply}
                className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-all"
              >
                החל על התפריט
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-[var(--color-text-muted)] font-medium">לא נמצאו נתונים למתאמן</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">
              הוסף משקל (מדידות או שקילה עצמית), גובה ותאריך לידה בפרופיל המתאמן
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
