import { memo, useState, useCallback, useRef, forwardRef } from 'react';
import { Copy, Trash2, CheckCircle, ChevronUp, ChevronDown, TrendingUp } from 'lucide-react';

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
  isActive?: boolean;
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

// Calculate set volume
const calculateSetVolume = (set: SetData): number => {
  let volume = set.weight * set.reps;
  if (set.superset_weight && set.superset_reps) {
    volume += set.superset_weight * set.superset_reps;
  }
  if (set.dropset_weight && set.dropset_reps) {
    volume += set.dropset_weight * set.dropset_reps;
  }
  return volume;
};

export const WorkoutSetCard = memo(({
  set,
  setIndex,
  isCollapsed,
  canDelete,
  isActive = false,
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
  const [isCompleting, setIsCompleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const setVolume = calculateSetVolume(set);
  const hasData = set.weight > 0 && set.reps > 0;

  const handleCompleteSet = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Trigger animation
    setIsCompleting(true);
    
    // Scroll the next set into view and complete
    setTimeout(() => {
      onCompleteSet();
      setIsCompleting(false);
    }, 300);
  }, [onCompleteSet]);

  if (isCollapsed) {
    return (
      <div
        ref={cardRef}
        onClick={onToggleCollapse}
        className={`workout-set-card rounded-xl p-3 lg:p-4 border cursor-pointer transition-all duration-300 set-collapsed-hover ${
          hasData 
            ? 'set-card-completed border-emerald-500/30 bg-gradient-to-r from-zinc-800/40 to-emerald-500/5' 
            : 'bg-surface/30 border-border hover:border-emerald-500/30'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
            <span className={`set-number-badge font-bold text-sm lg:text-base text-foreground px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg shadow-sm ${hasData ? 'completed bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-emerald-500'}`}>
              סט {set.set_number}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-foreground font-semibold text-base lg:text-lg">{set.weight}</span>
              <span className="text-slate-700 text-sm">ק״ג</span>
              <span className="text-slate-700 mx-1">×</span>
              <span className="text-foreground font-semibold text-base lg:text-lg">{set.reps}</span>
              <span className="text-slate-700 text-sm">חזרות</span>
            </div>
            {set.rpe && (
              <span className="text-amber-400 text-sm font-medium bg-amber-500/10 px-2 py-1 rounded-lg">
                RPE {set.rpe}
              </span>
            )}
            {set.set_type !== 'regular' && (
              <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                set.set_type === 'superset' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {set.set_type === 'superset' ? 'סופר-סט' : 'דרופ-סט'}
              </span>
            )}
            {set.failure && (
              <span className="text-xs px-2 py-1 rounded-lg font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                🔥 כשל
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            {hasData && (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg border border-emerald-500/30 animate-volume-pop">
                <TrendingUp className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-xs lg:text-sm">{setVolume.toLocaleString()}</span>
              </div>
            )}
            <ChevronDown className="h-4 w-4 lg:h-5 lg:w-5 text-emerald-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      className={`workout-set-card rounded-2xl p-4 lg:p-5 border transition-all duration-300 animate-set-expand ${
        isActive ? 'set-card-active border-emerald-500/50 bg-surface' : 'bg-surface/30 border-border'
      } ${isCompleting ? 'animate-set-complete' : ''}`}
    >
      {/* Header with set number and actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="set-number-badge font-bold text-base lg:text-xl text-foreground bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 lg:px-5 lg:py-2.5 rounded-xl shadow-lg">
            סט {set.set_number}
          </span>
          {hasData && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400 font-semibold text-sm">{setVolume.toLocaleString()} ק״ג</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 lg:p-3 hover:bg-elevated/50 rounded-xl transition-all touch-manipulation cursor-pointer btn-press-feedback"
            title="סגור סט"
            aria-label="סגור סט"
          >
            <ChevronUp className="h-4 w-4 lg:h-5 lg:w-5 text-slate-600" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-2 lg:p-3 hover:bg-blue-500/15 rounded-xl transition-all touch-manipulation cursor-pointer btn-press-feedback"
            title="שכפל סט"
            aria-label="שכפל סט"
          >
            <Copy className="h-4 w-4 lg:h-5 lg:w-5 text-blue-400" />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className="p-2 lg:p-3 hover:bg-red-500/15 text-red-400 rounded-xl transition-all touch-manipulation cursor-pointer btn-press-feedback"
              aria-label="מחק סט"
            >
              <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main inputs - Weight, Reps, RPE */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-4">
        <div>
          <label className="block text-sm lg:text-base font-semibold text-slate-800 mb-2">משקל (ק״ג)</label>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenNumericPad('weight');
            }}
            className="workout-input-btn w-full px-3 py-4 lg:py-6 text-2xl lg:text-4xl font-bold border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 active:bg-emerald-500/30 active:scale-[0.98] transition-all touch-manipulation cursor-pointer btn-press-feedback shadow-sm"
          >
            {set.weight || '0'}
          </button>
        </div>

        <div>
          <label className="block text-sm lg:text-base font-semibold text-slate-800 mb-2">חזרות</label>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenNumericPad('reps');
            }}
            className="workout-input-btn w-full px-3 py-4 lg:py-6 text-2xl lg:text-4xl font-bold border-2 border-blue-500/50 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 active:bg-blue-500/30 active:scale-[0.98] transition-all touch-manipulation cursor-pointer btn-press-feedback shadow-sm"
          >
            {set.reps || '0'}
          </button>
        </div>

        <div>
          <label className="block text-sm lg:text-base font-semibold text-slate-800 mb-2">RPE</label>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenNumericPad('rpe');
            }}
            className="workout-input-btn w-full px-3 py-4 lg:py-6 text-2xl lg:text-4xl font-bold border-2 border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-xl hover:bg-amber-500/20 active:bg-amber-500/30 active:scale-[0.98] transition-all touch-manipulation cursor-pointer btn-press-feedback shadow-sm"
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
              ? 'border-blue-500/50 bg-blue-500/10'
              : 'border-border hover:border-blue-500/30 bg-surface/30 hover:bg-blue-500/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl lg:text-2xl">
                {set.equipment?.emoji || '🎒'}
              </span>
              <span className="font-medium text-sm lg:text-base text-foreground">
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
              : 'border-border hover:border-red-500/30 bg-surface/30 text-slate-700 hover:bg-red-500/10'
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
              ? 'bg-emerald-500 text-foreground'
              : 'bg-surface border border-border text-slate-700 hover:bg-surface hover:border-emerald-500/30 hover:text-foreground'
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
              ? 'bg-blue-500 text-foreground'
              : 'bg-surface border border-border text-slate-700 hover:bg-surface hover:border-blue-500/30 hover:text-foreground'
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
              ? 'bg-amber-500 text-foreground'
              : 'bg-surface border border-border text-slate-700 hover:bg-surface hover:border-amber-500/30 hover:text-foreground'
          }`}
        >
          דרופ-סט
        </button>
      </div>

      {set.set_type === 'superset' && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="mb-3">
            <label className="block text-sm font-medium text-blue-400 mb-2">
              תרגיל סופר-סט
            </label>
            {set.superset_exercise_id ? (
              <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                <span className="font-medium text-blue-300">{set.superset_exercise_name}</span>
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
                className="w-full py-3 px-4 border-2 border-dashed border-blue-500/30 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/10 text-blue-400 font-medium transition-all cursor-pointer"
              >
                + בחר תרגיל לסופר-סט
              </button>
            )}
          </div>
          {set.superset_exercise_id && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-1">
                    משקל (ק״ג)
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenSupersetNumericPad('superset_weight');
                    }}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500/50 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all cursor-pointer"
                  >
                    {set.superset_weight || '0'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-1">
                    חזרות
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenSupersetNumericPad('superset_reps');
                    }}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500/50 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all cursor-pointer"
                  >
                    {set.superset_reps || '0'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-1">
                    RPE
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenSupersetNumericPad('superset_rpe');
                    }}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500/50 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all cursor-pointer"
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
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-border hover:border-blue-500/30 bg-surface/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {set.superset_equipment?.emoji || '🎒'}
                      </span>
                      <span className="font-medium text-base text-foreground">
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
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
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
        onClick={handleCompleteSet}
        disabled={isCompleting}
        className={`w-full mt-5 py-5 lg:py-6 bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-lg lg:text-xl rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] touch-manipulation cursor-pointer btn-press-feedback ${
          isCompleting ? 'animate-set-complete opacity-90' : ''
        }`}
      >
        <CheckCircle className={`h-6 w-6 lg:h-7 lg:w-7 ${isCompleting ? 'animate-spin' : ''}`} />
        <span>{isCompleting ? 'עובר לסט הבא...' : 'סיים סט ועבור לבא'}</span>
      </button>
    </div>
  );
});

WorkoutSetCard.displayName = 'WorkoutSetCard';
