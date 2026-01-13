import { memo } from 'react';
import { Copy, Trash2, CheckCircle } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  emoji: string | null;
}

interface SetData {
  id: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe: number | null;
  set_type: 'regular' | 'superset' | 'dropset';
  failure?: boolean;
  superset_exercise_id?: string | null;
  superset_exercise_name?: string | null;
  superset_weight?: number | null;
  superset_reps?: number | null;
  superset_rpe?: number | null;
  superset_equipment_id?: string | null;
  superset_equipment?: Equipment | null;
  superset_dropset_weight?: number | null;
  superset_dropset_reps?: number | null;
  dropset_weight?: number | null;
  dropset_reps?: number | null;
  equipment_id?: string | null;
  equipment?: Equipment | null;
}

interface WorkoutSetCardProps {
  set: SetData;
  setIndex: number;
  isCollapsed: boolean;
  canDelete: boolean;
  onToggleCollapse: () => void;
  onCompleteSet: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onOpenNumericPad: (field: 'weight' | 'reps' | 'rpe') => void;
  onOpenEquipmentSelector: () => void;
  onOpenSupersetSelector: () => void;
  onOpenSupersetNumericPad: (field: 'superset_weight' | 'superset_reps' | 'superset_rpe') => void;
  onOpenSupersetEquipmentSelector: () => void;
  onOpenDropsetNumericPad: (field: 'dropset_weight' | 'dropset_reps') => void;
  onOpenSupersetDropsetNumericPad: (field: 'superset_dropset_weight' | 'superset_dropset_reps') => void;
  onUpdateSet: (field: string, value: any) => void;
}

export const WorkoutSetCard = memo(({
  set,
  setIndex,
  isCollapsed,
  canDelete,
  onToggleCollapse,
  onCompleteSet,
  onDuplicate,
  onRemove,
  onOpenNumericPad,
  onOpenEquipmentSelector,
  onOpenSupersetSelector,
  onOpenSupersetNumericPad,
  onOpenSupersetEquipmentSelector,
  onOpenDropsetNumericPad,
  onOpenSupersetDropsetNumericPad,
  onUpdateSet,
}: WorkoutSetCardProps) => {

  if (isCollapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/30 cursor-pointer hover:border-emerald-500/30 hover:bg-zinc-800/50 transition-all duration-300 animate-fade-in"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-white bg-emerald-500 px-3 py-1.5 rounded-lg shadow-sm">סט {set.set_number}</span>
            <span className="text-zinc-300 font-medium">{set.weight} ק״ג</span>
            <span className="text-zinc-500">x</span>
            <span className="text-zinc-300 font-medium">{set.reps} חזרות</span>
            {set.rpe && <span className="text-amber-400 text-sm">RPE {set.rpe}</span>}
            {set.set_type !== 'regular' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                set.set_type === 'superset' ? 'bg-cyan-500/15 text-cyan-400' : 'bg-amber-500/15 text-amber-400'
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
    <div className="bg-zinc-800/30 rounded-2xl p-4 border border-zinc-700/30 transition-all duration-300 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-base lg:text-lg text-white bg-emerald-500 px-4 py-2 rounded-xl">סט {set.set_number}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-2 lg:p-3 hover:bg-cyan-500/15 rounded-xl transition-all touch-manipulation cursor-pointer"
            title="שכפל סט"
            aria-label="שכפל סט"
          >
            <Copy className="h-4 w-4 lg:h-5 lg:w-5 text-cyan-400" />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className="p-2 lg:p-3 hover:bg-red-500/15 text-red-400 rounded-xl transition-all touch-manipulation cursor-pointer"
              aria-label="מחק סט"
            >
              <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-3">
        <div>
          <label className="block text-sm lg:text-base font-medium text-zinc-400 mb-1">משקל (ק״ג)</label>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenNumericPad('weight');
            }}
            className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 active:bg-emerald-500/30 transition-all touch-manipulation cursor-pointer"
          >
            {set.weight || '0'}
          </button>
        </div>

        <div>
          <label className="block text-sm lg:text-base font-medium text-zinc-400 mb-1">חזרות</label>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenNumericPad('reps');
            }}
            className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-cyan-500/50 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500/20 active:bg-cyan-500/30 transition-all touch-manipulation cursor-pointer"
          >
            {set.reps || '0'}
          </button>
        </div>

        <div>
          <label className="block text-sm lg:text-base font-medium text-zinc-400 mb-1">RPE</label>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenNumericPad('rpe');
            }}
            className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-xl hover:bg-amber-500/20 active:bg-amber-500/30 transition-all touch-manipulation cursor-pointer"
          >
            {set.rpe || '-'}
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenEquipmentSelector();
          }}
          className={`py-3 lg:py-4 px-3 rounded-xl border transition-all text-right cursor-pointer ${
            set.equipment
              ? 'border-cyan-500/50 bg-cyan-500/10'
              : 'border-zinc-700/50 hover:border-cyan-500/30 bg-zinc-800/30 hover:bg-cyan-500/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl lg:text-2xl">
                {set.equipment?.emoji || '🎒'}
              </span>
              <span className="font-medium text-sm lg:text-base text-zinc-300">
                {set.equipment?.name || 'ציוד'}
              </span>
            </div>
            {set.equipment && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUpdateSet('equipment_id', null);
                  onUpdateSet('equipment', null);
                }}
                className="p-1 hover:bg-red-500/15 rounded-lg text-red-400 transition-all cursor-pointer"
                aria-label="מחק ציוד"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onUpdateSet('failure', !set.failure);
          }}
          className={`py-3 lg:py-4 px-3 rounded-xl border transition-all cursor-pointer ${
            set.failure
              ? 'border-red-500/50 bg-red-500/10 text-red-400'
              : 'border-zinc-700/50 hover:border-red-500/30 bg-zinc-800/30 text-zinc-400 hover:bg-red-500/10'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl lg:text-2xl">
              {set.failure ? '🔥' : '💪'}
            </span>
            <span className="font-medium text-sm lg:text-base">
              כשל
            </span>
          </div>
        </button>

      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onUpdateSet('set_type', 'regular');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            set.set_type === 'regular'
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:border-emerald-500/30 hover:text-white'
          }`}
        >
          רגיל
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (set.set_type !== 'superset') {
              onUpdateSet('set_type', 'superset');
            }
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            set.set_type === 'superset'
              ? 'bg-cyan-500 text-white'
              : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:border-cyan-500/30 hover:text-white'
          }`}
        >
          סופר-סט
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onUpdateSet('set_type', 'dropset');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            set.set_type === 'dropset'
              ? 'bg-amber-500 text-white'
              : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:border-amber-500/30 hover:text-white'
          }`}
        >
          דרופ-סט
        </button>
      </div>

      {set.set_type === 'superset' && (
        <div className="mt-3 pt-3 border-t border-zinc-700/50">
          <div className="mb-3">
            <label className="block text-sm font-medium text-cyan-400 mb-2">
              תרגיל סופר-סט
            </label>
            {set.superset_exercise_id ? (
              <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3">
                <span className="font-medium text-cyan-300">{set.superset_exercise_name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onUpdateSet('superset_exercise_id', null);
                    onUpdateSet('superset_exercise_name', null);
                    onUpdateSet('superset_weight', null);
                    onUpdateSet('superset_reps', null);
                  }}
                  className="p-1 hover:bg-red-500/15 rounded-lg text-red-400 transition-all cursor-pointer"
                  aria-label="מחק תרגיל סופר-סט"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenSupersetSelector();
                }}
                className="w-full py-3 px-4 border-2 border-dashed border-cyan-500/30 rounded-xl hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 font-medium transition-all cursor-pointer"
              >
                + בחר תרגיל לסופר-סט
              </button>
            )}
          </div>
          {set.superset_exercise_id && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-cyan-400 mb-1">
                    משקל (ק״ג)
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenSupersetNumericPad('superset_weight');
                    }}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-cyan-500/50 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all cursor-pointer"
                  >
                    {set.superset_weight || '0'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-400 mb-1">
                    חזרות
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenSupersetNumericPad('superset_reps');
                    }}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-cyan-500/50 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all cursor-pointer"
                  >
                    {set.superset_reps || '0'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-400 mb-1">
                    RPE
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenSupersetNumericPad('superset_rpe');
                    }}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-cyan-500/50 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all cursor-pointer"
                  >
                    {set.superset_rpe || '-'}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenSupersetEquipmentSelector();
                  }}
                  className={`w-full py-3 px-4 rounded-xl border transition-all text-right cursor-pointer ${
                    set.superset_equipment
                      ? 'border-cyan-500/50 bg-cyan-500/10'
                      : 'border-zinc-700/50 hover:border-cyan-500/30 bg-zinc-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {set.superset_equipment?.emoji || '🎒'}
                      </span>
                      <span className="font-medium text-base text-zinc-300">
                        {set.superset_equipment?.name || 'הוסף ציוד (אופציונלי)'}
                      </span>
                    </div>
                    {set.superset_equipment && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onUpdateSet('superset_equipment_id', null);
                          onUpdateSet('superset_equipment', null);
                        }}
                        className="p-1 hover:bg-red-500/15 rounded-lg text-red-400 transition-all cursor-pointer"
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
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-zinc-700/50">
          <div>
            <label className="block text-sm font-medium text-amber-400 mb-1">
              משקל דרופ (ק״ג)
            </label>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenDropsetNumericPad('dropset_weight');
              }}
              className="w-full px-3 py-3 text-xl font-bold border-2 border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-all touch-manipulation cursor-pointer"
            >
              {set.dropset_weight || '0'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-400 mb-1">
              חזרות דרופ
            </label>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenDropsetNumericPad('dropset_reps');
              }}
              className="w-full px-3 py-3 text-xl font-bold border-2 border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-all touch-manipulation cursor-pointer"
            >
              {set.dropset_reps || '0'}
            </button>
          </div>
        </div>
      )}

      {/* Complete Set Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCompleteSet();
        }}
        className="w-full mt-4 py-4 lg:py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] touch-manipulation cursor-pointer"
      >
        <CheckCircle className="h-6 w-6 lg:h-7 lg:w-7" />
        <span>סיים סט ועבור לבא</span>
      </button>
    </div>
  );
});

WorkoutSetCard.displayName = 'WorkoutSetCard';
