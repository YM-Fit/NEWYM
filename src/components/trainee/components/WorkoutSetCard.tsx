import { Copy, Trash2, CheckCircle } from 'lucide-react';
import type { SetData, EquipmentSelectorState, SupersetSelectorState } from '../types/selfWorkoutTypes';

interface WorkoutSetCardProps {
  set: SetData;
  exerciseIndex: number;
  setIndex: number;
  totalSets: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onUpdateSet: (field: keyof SetData, value: any) => void;
  onOpenNumericPad: (field: 'weight' | 'reps' | 'rpe', label: string) => void;
  onOpenSupersetNumericPad: (field: 'superset_weight' | 'superset_reps' | 'superset_rpe', label: string) => void;
  onOpenDropsetNumericPad: (field: 'dropset_weight' | 'dropset_reps', label: string) => void;
  onSetEquipmentSelector: (state: EquipmentSelectorState) => void;
  onSetSupersetSelector: (state: SupersetSelectorState) => void;
  onSetSupersetEquipmentSelector: (state: EquipmentSelectorState) => void;
  onCompleteSet: () => void;
}

export default function WorkoutSetCard({
  set,
  exerciseIndex,
  setIndex,
  totalSets,
  isCollapsed,
  onToggleCollapse,
  onDuplicate,
  onRemove,
  onUpdateSet,
  onOpenNumericPad,
  onOpenSupersetNumericPad,
  onOpenDropsetNumericPad,
  onSetEquipmentSelector,
  onSetSupersetSelector,
  onSetSupersetEquipmentSelector,
  onCompleteSet,
}: WorkoutSetCardProps) {
  if (isCollapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        className="bg-[var(--color-bg-surface)] rounded-xl p-3 border border-[var(--color-border)] cursor-pointer hover:border-emerald-500/50 hover:bg-[var(--color-bg-elevated)] transition-all duration-300 animate-fade-in"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-[var(--color-text-primary)] bg-emerald-500 px-3 py-1.5 rounded-lg shadow-sm">סט {set.set_number}</span>
            <span className="text-[var(--color-text-primary)] font-medium">{set.weight} ק״ג</span>
            <span className="text-[var(--color-text-muted)]">x</span>
            <span className="text-[var(--color-text-primary)] font-medium">{set.reps} חזרות</span>
            {set.rpe && <span className="text-amber-400 text-sm">RPE {set.rpe}</span>}
            {set.set_type !== 'regular' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                set.set_type === 'superset' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
              }`}>
                {set.set_type === 'superset' ? 'סופר-סט' : 'דרופ-סט'}
              </span>
            )}
          </div>
          <span className="text-xs text-emerald-400 font-medium">לחץ לעריכה</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-surface)] rounded-lg md:rounded-xl p-3 md:p-4 border border-[var(--color-border)] transition-all duration-300 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-sm md:text-base text-[var(--color-text-primary)] bg-[var(--color-bg-elevated)] px-2 py-1 rounded-md border border-[var(--color-border)]">סט {set.set_number}</span>
        <div className="flex space-x-1.5 rtl:space-x-reverse">
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1.5 hover:bg-[var(--color-bg-elevated)] rounded-lg transition-all"
            title="שכפל סט"
            aria-label="שכפל סט"
          >
            <Copy className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          </button>
          {totalSets > 1 && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-all"
              aria-label="מחק סט"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3">
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">משקל</label>
          <button
            type="button"
            onClick={() => onOpenNumericPad('weight', 'משקל (ק״ג)')}
            className="w-full px-2 py-3 md:py-3.5 text-lg md:text-xl font-bold border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 rounded-lg md:rounded-xl hover:bg-emerald-500/20 transition-all"
          >
            {set.weight || '0'}
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">חזרות</label>
          <button
            type="button"
            onClick={() => onOpenNumericPad('reps', 'חזרות')}
            className="w-full px-2 py-3 md:py-3.5 text-lg md:text-xl font-bold border-2 border-blue-500/50 bg-blue-500/10 text-blue-400 rounded-lg md:rounded-xl hover:bg-blue-500/20 transition-all"
          >
            {set.reps || '0'}
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">RPE</label>
          <button
            type="button"
            onClick={() => onOpenNumericPad('rpe', 'RPE (1-10)')}
            className="w-full px-2 py-3 md:py-3.5 text-lg md:text-xl font-bold border-2 border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-lg md:rounded-xl hover:bg-amber-500/20 transition-all"
          >
            {set.rpe || '-'}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onSetEquipmentSelector({ exerciseIndex, setIndex })}
          className={`py-3 px-3 rounded-xl border-2 transition-all text-right ${
            set.equipment ? 'border-blue-500/50 bg-blue-500/10' : 'border-[var(--color-border)] hover:border-blue-500/50 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-xl">{set.equipment?.emoji || '🎒'}</span>
              <span className="font-bold text-sm text-[var(--color-text-primary)]">{set.equipment?.name || 'ציוד'}</span>
            </div>
            {set.equipment && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateSet('equipment_id', null);
                  onUpdateSet('equipment', null);
                }}
                className="p-1 hover:bg-red-500/10 rounded-lg text-red-400"
                aria-label="מחק ציוד"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onUpdateSet('failure', !set.failure)}
          className={`py-3 px-3 rounded-xl border-2 transition-all ${
            set.failure ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-[var(--color-border)] hover:border-red-500/50 bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
          }`}
        >
          <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
            <span className="text-xl">{set.failure ? '🔥' : '💪'}</span>
            <span className="font-bold text-sm">כשל</span>
          </div>
        </button>
      </div>

      <div className="flex space-x-2 rtl:space-x-reverse">
        <button
          type="button"
          onClick={() => onUpdateSet('set_type', 'regular')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
            set.set_type === 'regular' ? 'bg-emerald-500 text-white' : 'bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
          }`}
        >
          רגיל
        </button>
        <button
          type="button"
          onClick={() => {
            if (set.set_type !== 'superset') {
              onUpdateSet('set_type', 'superset');
            }
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
            set.set_type === 'superset' ? 'bg-blue-500 text-white' : 'bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
          }`}
        >
          סופר-סט
        </button>
        <button
          type="button"
          onClick={() => onUpdateSet('set_type', 'dropset')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
            set.set_type === 'dropset' ? 'bg-amber-500 text-white' : 'bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
          }`}
        >
          דרופ-סט
        </button>
      </div>

      {set.set_type === 'superset' && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="mb-4">
            <label className="block text-sm font-bold text-blue-400 mb-2">תרגיל סופר-סט</label>
            {set.superset_exercise_id ? (
              <div className="flex items-center justify-between bg-blue-500/10 border-2 border-blue-500/50 rounded-xl p-4">
                <span className="font-bold text-blue-300">{set.superset_exercise_name}</span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSet('superset_exercise_id', null);
                    onUpdateSet('superset_exercise_name', null);
                    onUpdateSet('superset_weight', null);
                    onUpdateSet('superset_reps', null);
                  }}
                  className="p-1 hover:bg-red-500/10 rounded-lg text-red-400"
                  aria-label="מחק תרגיל סופר-סט"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSetSupersetSelector({ exerciseIndex, setIndex })}
                className="w-full py-4 px-4 border-2 border-dashed border-blue-500/50 rounded-xl hover:border-blue-500 hover:bg-blue-500/10 text-blue-400 font-bold transition-all"
              >
                + בחר תרגיל לסופר-סט
              </button>
            )}
          </div>
          {set.superset_exercise_id && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold text-blue-400 mb-2">משקל (ק״ג)</label>
                  <button
                    type="button"
                    onClick={() => onOpenSupersetNumericPad('superset_weight', 'משקל סופר-סט (ק״ג)')}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500/50 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all"
                  >
                    {set.superset_weight || '0'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-bold text-blue-400 mb-2">חזרות</label>
                  <button
                    type="button"
                    onClick={() => onOpenSupersetNumericPad('superset_reps', 'חזרות סופר-סט')}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500/50 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all"
                  >
                    {set.superset_reps || '0'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-bold text-blue-400 mb-2">RPE</label>
                  <button
                    type="button"
                    onClick={() => onOpenSupersetNumericPad('superset_rpe', 'RPE סופר-סט (1-10)')}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500/50 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all"
                  >
                    {set.superset_rpe || '-'}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => onSetSupersetEquipmentSelector({ exerciseIndex, setIndex })}
                  className={`w-full py-3 px-4 rounded-xl border-2 transition-all text-right ${
                    set.superset_equipment ? 'border-blue-500/50 bg-blue-500/10' : 'border-blue-500/30 hover:border-blue-500/50 bg-[var(--color-bg-surface)] hover:bg-blue-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-2xl">{set.superset_equipment?.emoji || '🎒'}</span>
                      <span className="font-bold text-base text-[var(--color-text-primary)]">{set.superset_equipment?.name || 'הוסף ציוד (אופציונלי)'}</span>
                    </div>
                    {set.superset_equipment && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSet('superset_equipment_id', null);
                          onUpdateSet('superset_equipment', null);
                        }}
                        className="p-1 hover:bg-red-500/10 rounded-lg text-red-400"
                        aria-label="מחק ציוד"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {set.set_type === 'dropset' && (
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--color-border)]">
          <div>
            <label className="block text-sm font-bold text-amber-400 mb-2">משקל דרופ (ק״ג)</label>
            <button
              type="button"
              onClick={() => onOpenDropsetNumericPad('dropset_weight', 'משקל דרופ-סט (ק״ג)')}
              className="w-full px-3 py-3 text-xl font-bold border-2 border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-all"
            >
              {set.dropset_weight || '0'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-bold text-amber-400 mb-2">חזרות דרופ</label>
            <button
              type="button"
              onClick={() => onOpenDropsetNumericPad('dropset_reps', 'חזרות דרופ-סט')}
              className="w-full px-3 py-3 text-xl font-bold border-2 border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-all"
            >
              {set.dropset_reps || '0'}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onCompleteSet}
        className="w-full mt-3 py-2.5 md:py-3 bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white font-semibold md:font-bold text-sm md:text-base rounded-lg md:rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg"
      >
        <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
        <span>סיים סט</span>
      </button>
    </div>
  );
}
