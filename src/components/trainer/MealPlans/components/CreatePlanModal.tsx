import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTraineeForMacros, calculatePlanMacros } from '../../hooks/useTraineeForMacros';

interface CreatePlanModalProps {
  data: any;
  saving: boolean;
  traineeId?: string | null;
  onChange: (data: any) => void;
  onSave: () => void;
  onClose: () => void;
}

export function CreatePlanModal({ data, saving, traineeId, onChange, onSave, onClose }: CreatePlanModalProps) {
  const { data: traineeData } = useTraineeForMacros(traineeId ?? null);
  const appliedTdeeRef = useRef(false);

  useEffect(() => {
    if (!traineeId || !traineeData || appliedTdeeRef.current) return;
    const isEmpty =
      (data.daily_calories === '' || data.daily_calories === undefined) &&
      (data.protein_grams === '' || data.protein_grams === undefined);
    if (!isEmpty) return;

    const calculated = calculatePlanMacros(traineeData);
    onChange({
      ...data,
      daily_calories: String(calculated.daily_calories),
      daily_water_ml: String(calculated.daily_water_ml),
      protein_grams: String(calculated.protein_grams),
      carbs_grams: String(calculated.carbs_grams),
      fat_grams: String(calculated.fat_grams),
    });
    appliedTdeeRef.current = true;
  }, [traineeId, traineeData, data, onChange]);

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="premium-card-static rounded-2xl border border-[var(--color-border)] shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">תפריט חדש</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-bg-surface)] rounded-xl transition-all"
            aria-label="סגור"
          >
            <X className="h-5 w-5 text-[var(--color-text-muted)]" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">שם התפריט *</label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              placeholder="לדוגמה: תפריט הורדה במשקל"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">תיאור</label>
            <input
              type="text"
              value={data.description}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">יעד קלוריות יומי</label>
              <input
                type="number"
                value={data.daily_calories}
                onChange={(e) => onChange({ ...data, daily_calories: e.target.value })}
                className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">מים יומיים (מ״ל)</label>
              <input
                type="number"
                value={data.daily_water_ml}
                onChange={(e) => onChange({ ...data, daily_water_ml: e.target.value })}
                className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">חלבון (גרם)</label>
              <input
                type="number"
                value={data.protein_grams}
                onChange={(e) => onChange({ ...data, protein_grams: e.target.value })}
                className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">פחמימות (גרם)</label>
              <input
                type="number"
                value={data.carbs_grams}
                onChange={(e) => onChange({ ...data, carbs_grams: e.target.value })}
                className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">שומן (גרם)</label>
              <input
                type="number"
                value={data.fat_grams}
                onChange={(e) => onChange({ ...data, fat_grams: e.target.value })}
                className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">הערות כלליות</label>
            <textarea
              value={data.notes}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              rows={3}
            />
          </div>
        </div>
        <div className="p-6 border-t border-[var(--color-border)] flex gap-4">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-primary-500/25"
          >
            {saving ? 'יוצר...' : 'צור תפריט'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] py-3.5 rounded-xl font-semibold transition-all border border-[var(--color-border)]"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
