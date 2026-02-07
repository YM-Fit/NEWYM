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
  superset_exercise_id?: string | null;
  superset_exercise_name?: string | null;
  superset_weight?: number | null;
  superset_reps?: number | null;
  superset_rpe?: number | null;
  superset_equipment_id?: string | null;
  superset_equipment?: Equipment | null;
  superset_dropset_weight?: number | null;
  superset_dropset_reps?: number | null;
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
  onOpenSupersetNumericPad?: (exerciseIndex: number, setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe' | 'superset_dropset_weight' | 'superset_dropset_reps', label: string) => void;
  onOpenDropsetNumericPad?: (exerciseIndex: number, setIndex: number, field: 'dropset_weight' | 'dropset_reps', label: string) => void;
  onOpenSupersetSelector?: (exerciseIndex: number, setIndex: number) => void;
  onOpenSupersetEquipmentSelector?: (exerciseIndex: number, setIndex: number) => void;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: string, value: any) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onDuplicateSet: (exerciseIndex: number, setIndex: number) => void;
  onCompleteSet: (exerciseIndex: number, setIndex: number) => void;
  canDelete: boolean;
  isTablet?: boolean;
  isTvMode?: boolean;
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
  onOpenSupersetNumericPad,
  onOpenDropsetNumericPad,
  onOpenSupersetSelector,
  onOpenSupersetEquipmentSelector,
  onUpdateSet,
  onRemoveSet,
  onDuplicateSet,
  onCompleteSet,
  canDelete,
  isTablet,
  isTvMode = false,
}: WorkoutTableRowProps) => {
  const hasData = set.weight > 0 && set.reps > 0;
  const setVolume = set.weight * set.reps + 
    (set.dropset_weight && set.dropset_reps ? set.dropset_weight * set.dropset_reps : 0) +
    (set.superset_weight && set.superset_reps ? set.superset_weight * set.superset_reps : 0) +
    (set.superset_dropset_weight && set.superset_dropset_reps ? set.superset_dropset_weight * set.superset_dropset_reps : 0);

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
        {!isTvMode ? (
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
        ) : (
          <div className={`
            w-full px-2 ${isCompleted ? 'py-1' : 'py-1.5'} rounded-lg font-bold
            ${isCompleted ? 'text-sm' : 'text-base'}
            ${hasData && set.weight > 0 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
              : 'bg-surface/50 text-muted border border-border'
            }
          `}>
            {set.weight || '0'}
          </div>
        )}
      </td>

      {/* חזרות */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        {!isTvMode ? (
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
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                : 'bg-surface/50 text-muted border border-border hover:border-blue-500/30'
              }
              hover:scale-105 active:scale-95 touch-manipulation cursor-pointer
              focus:outline-none focus:ring-1 focus:ring-blue-500
            `}
            tabIndex={isActive ? 0 : -1}
          >
            {set.reps || '0'}
          </button>
        ) : (
          <div className={`
            w-full px-2 ${isCompleted ? 'py-1' : 'py-1.5'} rounded-lg font-bold
            ${isCompleted ? 'text-sm' : 'text-base'}
            ${hasData && set.reps > 0 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
              : 'bg-surface/50 text-muted border border-border'
            }
          `}>
            {set.reps || '0'}
          </div>
        )}
      </td>

      {/* RPE */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        {!isTvMode ? (
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
        ) : (
          <div className={`
            w-full px-2 ${isCompleted ? 'py-1' : 'py-1.5'} rounded-lg font-bold
            ${isCompleted ? 'text-sm' : 'text-base'}
            ${set.rpe 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' 
              : 'bg-surface/50 text-muted border border-border'
            }
          `}>
            {set.rpe || '-'}
          </div>
        )}
      </td>

      {/* ציוד */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        {!isTvMode ? (
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
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                : 'bg-surface/50 text-muted border border-border hover:border-blue-500/30'
              }
              hover:scale-105 active:scale-95 touch-manipulation cursor-pointer
            `}
          >
            {set.equipment?.emoji && <span className={`${isCompleted ? 'text-xs' : 'text-sm'} mr-0.5`}>{set.equipment.emoji}</span>}
            <span className={`font-medium ${isCompleted ? 'text-[10px]' : 'text-xs'}`}>{set.equipment?.name || 'ציוד'}</span>
          </button>
        ) : (
          <div className={`flex items-center justify-center gap-0.5 ${isCompleted ? 'text-[10px]' : 'text-xs'}`}>
            {set.equipment?.emoji && <span>{set.equipment.emoji}</span>}
            <span className="text-blue-400">{set.equipment?.name || '-'}</span>
          </div>
        )}
      </td>

      {/* סוג סט */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        <div className="flex flex-col gap-1">
          {!isTvMode ? (
            <div className="flex gap-0.5 justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUpdateSet(exerciseIndex, setIndex, 'set_type', 'regular');
                }}
                className={`
                  px-1 ${isCompleted ? 'py-0.5' : 'py-0.5'} rounded font-medium transition-all touch-manipulation active:scale-95
                  ${isCompleted ? 'text-[10px]' : 'text-xs'}
                  ${set.set_type === 'regular'
                    ? 'bg-emerald-500 text-white'
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
                  if (set.set_type === 'superset' && set.superset_exercise_id) {
                    // Already a superset with exercise - toggle back to regular
                    onUpdateSet(exerciseIndex, setIndex, 'set_type', 'regular');
                  } else if (onOpenSupersetSelector) {
                    // Open selector to choose exercise
                    onOpenSupersetSelector(exerciseIndex, setIndex);
                  } else {
                    // Fallback - just set type
                    onUpdateSet(exerciseIndex, setIndex, 'set_type', 'superset');
                  }
                }}
                className={`
                  px-1 ${isCompleted ? 'py-0.5' : 'py-0.5'} rounded font-medium transition-all touch-manipulation active:scale-95
                  ${isCompleted ? 'text-[10px]' : 'text-xs'}
                  ${set.set_type === 'superset' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-surface/50 text-muted hover:bg-blue-500/20'
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
                  px-1 ${isCompleted ? 'py-0.5' : 'py-0.5'} rounded font-medium transition-all touch-manipulation active:scale-95
                  ${isCompleted ? 'text-[10px]' : 'text-xs'}
                  ${set.set_type === 'dropset'
                    ? 'bg-amber-500 text-white'
                    : 'bg-surface/50 text-muted hover:bg-amber-500/20'
                  }
                `}
              >
                דרופ
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span className={`${isCompleted ? 'text-[10px]' : 'text-xs'} font-medium ${
                set.set_type === 'regular' ? 'text-emerald-400' :
                set.set_type === 'superset' ? 'text-blue-400' :
                'text-amber-400'
              }`}>
                {set.set_type === 'regular' ? 'רגיל' :
                 set.set_type === 'superset' ? 'סופר' :
                 'דרופ'}
              </span>
            </div>
          )}
          {/* Superset data - Show if superset type is selected */}
          {set.set_type === 'superset' && (
            <div className="flex flex-col gap-1">
              {!set.superset_exercise_id && onOpenSupersetSelector && !isTvMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenSupersetSelector(exerciseIndex, setIndex);
                  }}
                  className={`px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 ${isTvMode ? 'text-xs' : 'text-[10px]'} touch-manipulation active:scale-95 transition-all`}
                >
                  בחר תרגיל
                </button>
              )}
              {set.superset_exercise_id && (
                <div className="flex flex-col gap-1">
                  {/* Exercise name and set number */}
                  <div className={`text-blue-400 font-semibold ${isTvMode ? 'text-xs' : 'text-[10px]'} text-center px-1 py-0.5 bg-blue-500/10 rounded`}>
                    {set.superset_exercise_name || 'תרגיל סופר'}
                    <span className="text-blue-300 ml-1">(סט {set.set_number})</span>
                  </div>
                  
                  {/* Superset weight, reps, RPE */}
                  {onOpenSupersetNumericPad && (
                    <div className={`flex gap-0.5 justify-center ${isTvMode ? 'text-xs' : 'text-[10px]'}`}>
                      {!isTvMode && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpenSupersetNumericPad(exerciseIndex, setIndex, 'superset_weight', 'משקל סופר');
                            }}
                            className="px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 touch-manipulation active:scale-95 transition-all"
                          >
                            {set.superset_weight || '0'} ק״ג
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpenSupersetNumericPad(exerciseIndex, setIndex, 'superset_reps', 'חזרות סופר');
                            }}
                            className="px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 touch-manipulation active:scale-95 transition-all"
                          >
                            {set.superset_reps || '0'} חזרות
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpenSupersetNumericPad(exerciseIndex, setIndex, 'superset_rpe', 'RPE סופר');
                            }}
                            className={`px-1 py-0.5 rounded border border-blue-500/30 hover:bg-blue-500/30 touch-manipulation active:scale-95 transition-all ${
                              set.superset_rpe !== null && set.superset_rpe !== undefined
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-surface/50 text-muted hover:border-blue-500/50'
                            }`}
                          >
                            RPE {set.superset_rpe || '-'}
                          </button>
                        </>
                      )}
                      {isTvMode && (
                        <div className="text-blue-400">
                          {set.superset_weight || '0'} ק״ג × {set.superset_reps || '0'}
                          {set.superset_rpe && ` (RPE ${set.superset_rpe})`}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Superset equipment */}
                  {!isTvMode && onOpenSupersetEquipmentSelector && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenSupersetEquipmentSelector?.(exerciseIndex, setIndex);
                      }}
                      className={`px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 text-[10px] flex items-center justify-center gap-0.5 touch-manipulation active:scale-95 transition-all`}
                    >
                      {set.superset_equipment ? (
                        <>
                          {set.superset_equipment.emoji && <span>{set.superset_equipment.emoji}</span>}
                          <span>{set.superset_equipment.name}</span>
                        </>
                      ) : (
                        'ציוד'
                      )}
                    </button>
                  )}
                  {isTvMode && set.superset_equipment && (
                    <div className={`flex items-center justify-center gap-0.5 text-xs`}>
                      {set.superset_equipment.emoji && <span>{set.superset_equipment.emoji}</span>}
                      <span className="text-blue-400">{set.superset_equipment.name}</span>
                    </div>
                  )}
                  
                  {/* Superset dropset */}
                  {set.superset_exercise_id && onOpenSupersetNumericPad && (
                    <>
                      {(set.superset_dropset_weight || set.superset_dropset_reps) ? (
                        <div className={`flex gap-0.5 justify-center ${isTvMode ? 'text-xs' : 'text-[10px]'} text-amber-400`}>
                          {!isTvMode && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onOpenSupersetNumericPad(exerciseIndex, setIndex, 'superset_dropset_weight', 'משקל דרופ סופר');
                                }}
                                className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 touch-manipulation active:scale-95 transition-all"
                              >
                                דרופ: {set.superset_dropset_weight || '0'} ק״ג
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onOpenSupersetNumericPad(exerciseIndex, setIndex, 'superset_dropset_reps', 'חזרות דרופ סופר');
                                }}
                                className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 touch-manipulation active:scale-95 transition-all"
                              >
                                {set.superset_dropset_reps || '0'} חזרות
                              </button>
                            </>
                          )}
                          {isTvMode && (
                            <div>
                              דרופ: {set.superset_dropset_weight || '0'} ק״ג × {set.superset_dropset_reps || '0'}
                            </div>
                          )}
                        </div>
                      ) : (
                        !isTvMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Initialize dropset with 0 values to show the input buttons
                              onUpdateSet(exerciseIndex, setIndex, 'superset_dropset_weight', 0);
                              onUpdateSet(exerciseIndex, setIndex, 'superset_dropset_reps', 0);
                            }}
                            className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-dashed border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 text-[10px] touch-manipulation active:scale-95 transition-all"
                          >
                            + הוסף דרופ סופר
                          </button>
                        )
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Dropset data - Show if dropset type is selected */}
          {set.set_type === 'dropset' && (
            <div className={`flex gap-0.5 justify-center ${isTvMode ? 'text-xs' : 'text-[10px]'}`}>
              {!isTvMode && onOpenDropsetNumericPad && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenDropsetNumericPad(exerciseIndex, setIndex, 'dropset_weight', 'משקל דרופ');
                    }}
                    className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 touch-manipulation active:scale-95 transition-all"
                  >
                    {set.dropset_weight || '0'} ק״ג
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenDropsetNumericPad(exerciseIndex, setIndex, 'dropset_reps', 'חזרות דרופ');
                    }}
                    className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 touch-manipulation active:scale-95 transition-all"
                  >
                    {set.dropset_reps || '0'} חזרות
                  </button>
                </>
              )}
              {isTvMode && (
                <div className="text-amber-400">
                  {set.dropset_weight || '0'} ק״ג × {set.dropset_reps || '0'}
                </div>
              )}
            </div>
          )}
        </div>
      </td>

      {/* כשל */}
      <td className={`px-2 ${isCompleted ? 'py-1' : 'py-2'} text-center`}>
        {!isTvMode ? (
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
        ) : (
          <div className={`flex items-center justify-center ${isCompleted ? 'text-sm' : 'text-base'}`}>
            {set.failure ? '🔥' : '💪'}
          </div>
        )}
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
        {!isTvMode ? (
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
              className={`${isCompleted ? 'p-1' : 'p-1.5'} hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all cursor-pointer`}
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
        ) : (
          <div className="flex items-center justify-center gap-1 text-muted">
            {set.weight > 0 && set.reps > 0 && (
              <CheckCircle2 className={`${isCompleted ? 'h-3 w-3' : 'h-4 w-4'} text-emerald-400`} />
            )}
          </div>
        )}
      </td>
    </tr>
  );
});

WorkoutTableRow.displayName = 'WorkoutTableRow';
