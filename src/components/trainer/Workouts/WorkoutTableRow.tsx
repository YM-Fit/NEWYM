import { memo, useRef, useEffect } from 'react';
import { Trash2, Copy, CheckCircle2 } from 'lucide-react';
import { TrendingUp } from 'lucide-react';

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
  equipment_id?: string | null;
  equipment?: Equipment | null;
  dropset_weight?: number | null;
  dropset_reps?: number | null;
  superset_weight?: number | null;
  superset_reps?: number | null;
}

interface WorkoutTableRowProps {
  exerciseName: string;
  set: SetData;
  exerciseIndex: number;
  setIndex: number;
  isActive?: boolean;
  isFirstSet?: boolean;
  isLastSet?: boolean;
  isNewExercise?: boolean;
  onOpenNumericPad: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe') => void;
  onOpenEquipmentSelector: (exerciseIndex: number, setIndex: number) => void;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: string, value: any) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onDuplicateSet: (exerciseIndex: number, setIndex: number) => void;
  onCompleteSet: (exerciseIndex: number, setIndex: number) => void;
  canDelete: boolean;
  isTablet?: boolean;
}

export const WorkoutTableRow = memo(({
  exerciseName,
  set,
  exerciseIndex,
  setIndex,
  isActive = false,
  isFirstSet = false,
  isLastSet = false,
  isNewExercise = false,
  onOpenNumericPad,
  onOpenEquipmentSelector,
  onUpdateSet,
  onRemoveSet,
  onDuplicateSet,
  onCompleteSet,
  canDelete,
  isTablet,
}: WorkoutTableRowProps) => {
  const hasData = set.weight > 0 && set.reps > 0;
  const setVolume = set.weight * set.reps + 
    (set.dropset_weight && set.dropset_reps ? set.dropset_weight * set.dropset_reps : 0) +
    (set.superset_weight && set.superset_reps ? set.superset_weight * set.superset_reps : 0);

  const weightButtonRef = useRef<HTMLButtonElement>(null);
  const repsButtonRef = useRef<HTMLButtonElement>(null);
  const rpeButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus on active row
  useEffect(() => {
    if (isActive && weightButtonRef.current) {
      // Don't auto-focus on mobile/tablet
      if (!isTablet) {
        setTimeout(() => {
          weightButtonRef.current?.focus();
        }, 100);
      }
    }
  }, [isActive, isTablet]);

  const handleKeyDown = (e: React.KeyboardEvent, field: 'weight' | 'reps' | 'rpe') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpenNumericPad(exerciseIndex, setIndex, field);
    } else if (e.key === 'Tab' && !e.shiftKey) {
      // Tab navigation - move to next field
      e.preventDefault();
      if (field === 'weight' && repsButtonRef.current) {
        repsButtonRef.current.focus();
      } else if (field === 'reps' && rpeButtonRef.current) {
        rpeButtonRef.current.focus();
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      // Shift+Tab - move to previous field
      e.preventDefault();
      if (field === 'rpe' && repsButtonRef.current) {
        repsButtonRef.current.focus();
      } else if (field === 'reps' && weightButtonRef.current) {
        weightButtonRef.current.focus();
      }
    }
  };

  // Minimize completed sets - make them more compact
  const isCompleted = hasData && set.weight > 0 && set.reps > 0;
  
  return (
    <tr
      className={`
        workout-table-row border-b border-border/50 transition-all duration-200
        ${isActive ? 'workout-table-row-active bg-emerald-500/10 border-l-4 border-l-emerald-500' : ''}
        ${isNewExercise && isFirstSet ? 'border-t-2 border-t-emerald-500/30' : ''}
        ${isCompleted ? 'bg-surface/30 opacity-90' : 'bg-surface/20'}
        hover:bg-emerald-500/10
        ${isCompleted ? 'py-1' : ''}
      `}
    >
      {/* תרגיל */}
      <td className={`px-3 ${isCompleted ? 'py-1' : 'py-2'} text-right font-medium text-foreground sticky right-0 bg-inherit z-10 min-w-[120px] border-r-2 border-emerald-500/20 ${isFirstSet ? 'bg-emerald-500/5' : ''}`}>
        {isFirstSet ? (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span className={`font-semibold ${isCompleted ? 'text-xs' : 'text-sm'}`}>{exerciseName}</span>
          </div>
        ) : (
          <span className="text-muted text-xs">↳</span>
        )}
      </td>

      {/* סט */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        <span className={`inline-flex items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold ${isCompleted ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs'}`}>
          {set.set_number}
        </span>
      </td>

      {/* משקל */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        <button
          ref={weightButtonRef}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenNumericPad(exerciseIndex, setIndex, 'weight');
          }}
          onKeyDown={(e) => handleKeyDown(e, 'weight')}
          className={`
            workout-table-cell w-full px-2 ${isCompleted ? 'py-1' : 'py-1.5'} rounded-lg font-bold transition-all
            ${isCompleted ? 'text-sm' : 'text-base'}
            ${hasData && set.weight > 0 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
              : 'bg-surface/50 text-muted border border-border hover:border-emerald-500/30'
            }
            hover:scale-105 active:scale-95 touch-manipulation cursor-pointer
            focus:outline-none focus:ring-1 focus:ring-emerald-500
          `}
          tabIndex={isActive ? 0 : -1}
        >
          {set.weight || '0'}
        </button>
      </td>

      {/* חזרות */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        <button
          ref={repsButtonRef}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenNumericPad(exerciseIndex, setIndex, 'reps');
          }}
          onKeyDown={(e) => handleKeyDown(e, 'reps')}
          className={`
            w-full px-2 ${isCompleted ? 'py-1' : 'py-1.5'} rounded-lg font-bold transition-all
            ${isCompleted ? 'text-sm' : 'text-base'}
            ${hasData && set.reps > 0 
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
              : 'bg-surface/50 text-muted border border-border hover:border-cyan-500/30'
            }
            hover:scale-105 active:scale-95 touch-manipulation cursor-pointer
            focus:outline-none focus:ring-1 focus:ring-cyan-500
          `}
          tabIndex={isActive ? 0 : -1}
        >
          {set.reps || '0'}
        </button>
      </td>

      {/* RPE */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        <button
          ref={rpeButtonRef}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenNumericPad(exerciseIndex, setIndex, 'rpe');
          }}
          onKeyDown={(e) => handleKeyDown(e, 'rpe')}
          className={`
            w-full px-2 ${isCompleted ? 'py-1' : 'py-1.5'} rounded-lg font-bold transition-all
            ${isCompleted ? 'text-sm' : 'text-base'}
            ${set.rpe 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' 
              : 'bg-surface/50 text-muted border border-border hover:border-amber-500/30'
            }
            hover:scale-105 active:scale-95 touch-manipulation cursor-pointer
            focus:outline-none focus:ring-1 focus:ring-amber-500
          `}
          tabIndex={isActive ? 0 : -1}
        >
          {set.rpe || '-'}
        </button>
      </td>

      {/* ציוד */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenEquipmentSelector(exerciseIndex, setIndex);
          }}
          className={`
            w-full px-2 ${isCompleted ? 'py-0.5' : 'py-1'} rounded-lg transition-all
            ${isCompleted ? 'text-[10px]' : 'text-xs'}
            ${set.equipment 
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
              : 'bg-surface/50 text-muted border border-border hover:border-cyan-500/30'
            }
            hover:scale-105 active:scale-95 touch-manipulation cursor-pointer
          `}
        >
          {set.equipment?.emoji && <span className={`${isCompleted ? 'text-xs' : 'text-sm'} mr-0.5`}>{set.equipment.emoji}</span>}
          <span className={`font-medium ${isCompleted ? 'text-[10px]' : 'text-xs'}`}>{set.equipment?.name || 'ציוד'}</span>
        </button>
      </td>

      {/* סוג סט */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        <div className="flex gap-0.5 justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onUpdateSet(exerciseIndex, setIndex, 'set_type', 'regular');
            }}
            className={`
              px-1 ${isCompleted ? 'py-0.5' : 'py-0.5'} rounded font-medium transition-all
              ${isCompleted ? 'text-[10px]' : 'text-xs'}
              ${set.set_type === 'regular' 
                ? 'bg-emerald-500 text-foreground' 
                : 'bg-surface/50 text-muted hover:bg-emerald-500/20'
              }
            `}
          >
            רגיל
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onUpdateSet(exerciseIndex, setIndex, 'set_type', 'superset');
            }}
            className={`
              px-1 ${isCompleted ? 'py-0.5' : 'py-0.5'} rounded font-medium transition-all
              ${isCompleted ? 'text-[10px]' : 'text-xs'}
              ${set.set_type === 'superset' 
                ? 'bg-cyan-500 text-foreground' 
                : 'bg-surface/50 text-muted hover:bg-cyan-500/20'
              }
            `}
          >
            סופר
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onUpdateSet(exerciseIndex, setIndex, 'set_type', 'dropset');
            }}
            className={`
              px-1 ${isCompleted ? 'py-0.5' : 'py-0.5'} rounded font-medium transition-all
              ${isCompleted ? 'text-[10px]' : 'text-xs'}
              ${set.set_type === 'dropset' 
                ? 'bg-amber-500 text-foreground' 
                : 'bg-surface/50 text-muted hover:bg-amber-500/20'
              }
            `}
          >
            דרופ
          </button>
        </div>
      </td>

      {/* כשל */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onUpdateSet(exerciseIndex, setIndex, 'failure', !set.failure);
          }}
          className={`
            w-full px-2 ${isCompleted ? 'py-0.5' : 'py-1'} rounded-lg transition-all
            ${isCompleted ? 'text-sm' : 'text-base'}
            ${set.failure 
              ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
              : 'bg-surface/50 text-muted border border-border hover:border-red-500/30'
            }
            hover:scale-105 active:scale-95 touch-manipulation cursor-pointer
          `}
        >
          {set.failure ? '🔥' : '💪'}
        </button>
      </td>

      {/* נפח */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        {hasData && (
          <div className={`flex items-center justify-center gap-0.5 bg-emerald-500/10 px-1.5 ${isCompleted ? 'py-0.5' : 'py-0.5'} rounded border border-emerald-500/30`}>
            <TrendingUp className={`${isCompleted ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-emerald-400`} />
            <span className={`text-emerald-400 font-semibold ${isCompleted ? 'text-[10px]' : 'text-xs'}`}>{setVolume.toLocaleString()}</span>
          </div>
        )}
      </td>

      {/* פעולות */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCompleteSet(exerciseIndex, setIndex);
            }}
            className={`${isCompleted ? 'p-1' : 'p-1.5'} hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-all cursor-pointer`}
            title="סיים סט (Enter)"
          >
            <CheckCircle2 className={`${isCompleted ? 'h-3 w-3' : 'h-4 w-4'}`} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDuplicateSet(exerciseIndex, setIndex);
            }}
            className={`${isCompleted ? 'p-1' : 'p-1.5'} hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-all cursor-pointer`}
            title="שכפל סט"
          >
            <Copy className={`${isCompleted ? 'h-3 w-3' : 'h-4 w-4'}`} />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveSet(exerciseIndex, setIndex);
              }}
              className={`${isCompleted ? 'p-1' : 'p-1.5'} hover:bg-red-500/20 text-red-400 rounded-lg transition-all cursor-pointer`}
              title="מחק סט"
            >
              <Trash2 className={`${isCompleted ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

WorkoutTableRow.displayName = 'WorkoutTableRow';
