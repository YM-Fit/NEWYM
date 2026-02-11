import { useState } from 'react';
import { Download, Upload, FileText, Flame, Beef, Wheat, Droplet, Droplets, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import type { MealPlan } from '../types/mealPlanTypes';
import { validateCalories, validateMacro, validateWater } from '../../../../utils/nutritionValidation';
import { CopyPlanModal } from './modals/CopyPlanModal';

interface PlanSettingsCardProps {
  plan: MealPlan;
  onUpdatePlan: (updates: Partial<MealPlan>) => void;
  onLoadTemplate: () => void;
  onSaveAsTemplate: () => void;
  onAddNote: () => void;
  /** Optional: enable "Copy to trainee" button */
  trainerId?: string;
  traineeId?: string;
  onCopySuccess?: () => void;
}

export function PlanSettingsCard({
  plan,
  onUpdatePlan,
  onLoadTemplate,
  onSaveAsTemplate,
  onAddNote,
  trainerId,
  traineeId,
  onCopySuccess,
}: PlanSettingsCardProps) {
  const [showCopyModal, setShowCopyModal] = useState(false);

  return (
    <div className="premium-card-static p-5 sm:p-8 rounded-2xl border border-[var(--color-border)] shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="font-bold text-[var(--color-text-primary)] text-xl">הגדרות תפריט</h3>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {trainerId && traineeId && plan.id && (
            <button
              onClick={() => setShowCopyModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 transition-all duration-300 hover:scale-105"
            >
              <Copy className="h-4 w-4" />
              העתק למתאמן
            </button>
          )}
          <button
            onClick={onLoadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-500/30 transition-all duration-300 hover:scale-105"
          >
            <Download className="h-4 w-4" />
            טען תבנית
          </button>
          <button
            onClick={onSaveAsTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] rounded-xl text-sm font-semibold hover:bg-[var(--color-bg-elevated)] transition-all duration-300 border border-[var(--color-border)]"
          >
            <Upload className="h-4 w-4" />
            שמור כתבנית
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">שם התפריט</label>
          <input
            type="text"
            value={plan.name || ''}
            onChange={(e) => onUpdatePlan({ name: e.target.value })}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">תיאור</label>
          <input
            type="text"
            value={plan.description || ''}
            onChange={(e) => onUpdatePlan({ description: e.target.value })}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            placeholder="לדוגמה: תפריט הורדה במשקל"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            <Flame className="h-4 w-4 inline ml-1 text-amber-400" />
            קלוריות יומיות
          </label>
          <input
            type="number"
            value={plan.daily_calories || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onUpdatePlan({ daily_calories: null });
                return;
              }
              const num = parseInt(value);
              if (isNaN(num)) return;
              const validation = validateCalories(num);
              if (validation.isValid) {
                onUpdatePlan({ daily_calories: num });
              } else {
                toast.error(validation.error || 'ערך לא תקין');
              }
            }}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            min="0"
            max="20000"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            <Beef className="h-4 w-4 inline ml-1 text-red-400" />
            חלבון (גרם)
          </label>
          <input
            type="number"
            value={plan.protein_grams || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onUpdatePlan({ protein_grams: null });
                return;
              }
              const num = parseInt(value);
              if (isNaN(num)) return;
              const validation = validateMacro(num, 'חלבון');
              if (validation.isValid) {
                onUpdatePlan({ protein_grams: num });
              } else {
                toast.error(validation.error || 'ערך לא תקין');
              }
            }}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            min="0"
            max="2000"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            <Wheat className="h-4 w-4 inline ml-1 text-blue-400" />
            פחמימות (גרם)
          </label>
          <input
            type="number"
            value={plan.carbs_grams || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onUpdatePlan({ carbs_grams: null });
                return;
              }
              const num = parseInt(value);
              if (isNaN(num)) return;
              const validation = validateMacro(num, 'פחמימות');
              if (validation.isValid) {
                onUpdatePlan({ carbs_grams: num });
              } else {
                toast.error(validation.error || 'ערך לא תקין');
              }
            }}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            min="0"
            max="2000"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            <Droplet className="h-4 w-4 inline ml-1 text-amber-400" />
            שומן (גרם)
          </label>
          <input
            type="number"
            value={plan.fat_grams || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onUpdatePlan({ fat_grams: null });
                return;
              }
              const num = parseInt(value);
              if (isNaN(num)) return;
              const validation = validateMacro(num, 'שומן');
              if (validation.isValid) {
                onUpdatePlan({ fat_grams: num });
              } else {
                toast.error(validation.error || 'ערך לא תקין');
              }
            }}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            min="0"
            max="2000"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            <Droplets className="h-4 w-4 inline ml-1 text-blue-400" />
            מים (מ״ל)
          </label>
          <input
            type="number"
            value={plan.daily_water_ml || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onUpdatePlan({ daily_water_ml: null });
                return;
              }
              const num = parseInt(value);
              if (isNaN(num)) return;
              const validation = validateWater(num);
              if (validation.isValid) {
                onUpdatePlan({ daily_water_ml: num });
              } else {
                toast.error(validation.error || 'ערך לא תקין');
              }
            }}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            min="0"
            max="10000"
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)]">הערות כלליות</label>
          <button
            onClick={onAddNote}
            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors duration-300"
          >
            <FileText className="h-4 w-4" />
            הוסף מתבנית
          </button>
        </div>
        <textarea
          value={plan.notes || ''}
          onChange={(e) => onUpdatePlan({ notes: e.target.value })}
          className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
          rows={3}
          placeholder="הערות כלליות לתפריט..."
        />
      </div>

      {showCopyModal && trainerId && traineeId && plan.id && (
        <CopyPlanModal
          planId={plan.id}
          planName={plan.name || 'תפריט'}
          trainerId={trainerId}
          currentTraineeId={traineeId}
          onClose={() => setShowCopyModal(false)}
          onSuccess={() => {
            toast.success('התפריט הועתק בהצלחה');
            onCopySuccess?.();
          }}
        />
      )}
    </div>
  );
}
