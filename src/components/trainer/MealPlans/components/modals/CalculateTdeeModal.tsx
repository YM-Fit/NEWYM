import { useState, useEffect } from 'react';
import { X, Calculator, Loader2 } from 'lucide-react';
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

  const handleApply = () => {
    if (calculated) {
      onApply(calculated);
      onClose();
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

            <div className="p-4 bg-primary-500/10 rounded-xl border border-primary-500/20">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                המלצות מחושבות:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-[var(--color-text-muted)]">קלוריות:</span>
                <span className="font-semibold text-primary-500">
                  {calculated.daily_calories}
                </span>
                <span className="text-[var(--color-text-muted)]">חלבון:</span>
                <span className="font-semibold text-red-500">
                  {calculated.protein_grams} גרם
                </span>
                <span className="text-[var(--color-text-muted)]">פחמימות:</span>
                <span className="font-semibold text-blue-500">
                  {calculated.carbs_grams} גרם
                </span>
                <span className="text-[var(--color-text-muted)]">שומן:</span>
                <span className="font-semibold text-amber-600">
                  {calculated.fat_grams} גרם
                </span>
                <span className="text-[var(--color-text-muted)]">מים:</span>
                <span className="font-semibold">
                  {calculated.daily_water_ml} מ"ל
                </span>
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
