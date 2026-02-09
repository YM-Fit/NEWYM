import { memo, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { WorkoutTableHeader } from './WorkoutTableHeader';
import { WorkoutTableRow } from './WorkoutTableRow';

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

interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
  instructions?: string | null;
}

interface WorkoutExercise {
  tempId: string;
  exercise: Exercise;
  sets: SetData[];
}

interface WorkoutTableProps {
  exercises: WorkoutExercise[];
  collapsedSets?: string[];
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
  onAddSet: (exerciseIndex: number) => void;
  onToggleExerciseCollapse?: (exerciseIndex: number) => void;
  onRemoveExercise?: (exerciseIndex: number) => void;
  isTablet?: boolean;
}

export const WorkoutTable = memo(({
  exercises,
  collapsedSets = [],
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
  onAddSet,
  onToggleExerciseCollapse = () => {},
  onRemoveExercise,
  isTablet,
}: WorkoutTableProps) => {
  // Flatten exercises and sets into rows, filtering out collapsed sets
  const tableRows = useMemo(() => {
    const rows: Array<{
      exerciseIndex: number;
      setIndex: number;
      exerciseName: string;
      set: SetData;
    }> = [];

    exercises.forEach((exercise, exerciseIndex) => {
      exercise.sets.forEach((set, setIndex) => {
        // Only include sets that are not collapsed
        if (!collapsedSets || !collapsedSets.includes(set.id)) {
          rows.push({
            exerciseIndex,
            setIndex,
            exerciseName: exercise.exercise.name,
            set,
          });
        }
      });
    });

    return rows;
  }, [exercises, collapsedSets]);

  if (exercises.length === 0) {
    return (
      <div className="premium-card-static p-8 text-center mb-4">
        <p className="text-muted text-lg">אין תרגילים באימון</p>
        <p className="text-muted text-sm mt-2">הוסף תרגיל כדי להתחיל</p>
      </div>
    );
  }

  // Check if TV mode is active
  const isTvMode = typeof document !== 'undefined' && (document.body.classList.contains('tv-mode-active') || document.documentElement.classList.contains('tv-mode-active'));
  
  return (
    <div className="premium-card-static overflow-hidden mb-4 shadow-lg border-2 border-emerald-500/30" style={{ display: 'block' }}>
      <div className={`overflow-x-auto ${isTvMode ? 'max-h-[calc(100vh-200px)]' : 'max-h-[calc(100vh-300px)]'} overflow-y-auto`}>
        <table className={`w-full border-collapse ${isTvMode ? 'min-w-[1200px]' : 'min-w-[800px] sm:min-w-[900px] lg:min-w-[1200px]'} bg-surface/50`} style={{ display: 'table' }}>
          <WorkoutTableHeader isTablet={isTablet} />
          <tbody>
            {exercises.map((exercise, exerciseIndex) => {
              const exerciseRows = tableRows.filter(r => r.exerciseIndex === exerciseIndex);
              const allSetsCollapsed = exercise.sets.length > 0 && exercise.sets.every(set => collapsedSets && collapsedSets.includes(set.id));
              const hasVisibleSets = exerciseRows.length > 0;
              
              return (
                <>
                  {/* Exercise header row - clickable to toggle collapse */}
                  <tr
                    key={`exercise-header-${exercise.tempId}`}
                    data-exercise-id={exercise.tempId}
                    className="border-b-2 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all"
                  >
                    <td colSpan={10} className="px-2 sm:px-4 py-2 sm:py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div 
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                          onClick={() => onToggleExerciseCollapse(exerciseIndex)}
                        >
                          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
                          <span className="font-bold text-base sm:text-lg text-foreground truncate">{exercise.exercise.name}</span>
                          {allSetsCollapsed && (
                            <span className="text-xs text-muted bg-surface/50 px-2 py-0.5 rounded flex-shrink-0">
                              {exercise.sets.length} סטים (ממוזער)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {onRemoveExercise && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (window.confirm(`האם אתה בטוח שברצונך למחוק את התרגיל "${exercise.exercise.name}"?`)) {
                                  onRemoveExercise(exerciseIndex);
                                }
                              }}
                              className="p-1.5 sm:p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all cursor-pointer active:scale-95"
                              title="מחק תרגיל"
                              aria-label="מחק תרגיל"
                            >
                              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          )}
                          <div 
                            className="text-emerald-400 text-sm cursor-pointer"
                            onClick={() => onToggleExerciseCollapse(exerciseIndex)}
                          >
                            {allSetsCollapsed ? '▼' : '▲'}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Sets rows - only show if not all collapsed */}
                  {hasVisibleSets && exerciseRows.map((row, rowIndex) => {
                    const isFirstSetOfExercise = row.setIndex === 0;
                    const isLastSetOfExercise = row.setIndex === exercise.sets.length - 1;
                    const canDelete = exercise.sets.length > 1;
                    const prevRow = rowIndex > 0 ? exerciseRows[rowIndex - 1] : null;
                    const isNewSet = !prevRow || prevRow.setIndex !== row.setIndex - 1;
                    const nextRow = rowIndex < exerciseRows.length - 1 ? exerciseRows[rowIndex + 1] : null;
                    const isLastRowOfExercise = !nextRow || nextRow.exerciseIndex !== row.exerciseIndex;
                    
                    return (
                      <>
                        <WorkoutTableRow
                          key={`${row.exerciseIndex}-${row.setIndex}-${row.set.id}`}
                          exerciseName={row.exerciseName}
                          set={row.set}
                          exerciseIndex={row.exerciseIndex}
                          setIndex={row.setIndex}
                          isActive={isFirstSetOfExercise && rowIndex === 0}
                          isFirstSet={isFirstSetOfExercise}
                          isLastSet={isLastSetOfExercise}
                          isNewExercise={false}
                          onOpenNumericPad={onOpenNumericPad}
                          onOpenEquipmentSelector={onOpenEquipmentSelector}
                          onOpenSupersetNumericPad={onOpenSupersetNumericPad}
                          onOpenDropsetNumericPad={onOpenDropsetNumericPad}
                          onOpenSupersetSelector={onOpenSupersetSelector}
                          onOpenSupersetEquipmentSelector={onOpenSupersetEquipmentSelector}
                          onUpdateSet={onUpdateSet}
                          onRemoveSet={onRemoveSet}
                          onDuplicateSet={onDuplicateSet}
                          onCompleteSet={onCompleteSet}
                          canDelete={canDelete}
                          isTablet={isTablet}
                          isTvMode={isTvMode}
                        />
                        {/* Add Set button only after the last visible set of each exercise */}
                        {isLastRowOfExercise && (
                          <tr
                            key={`add-set-${row.exerciseIndex}`}
                            className="border-b border-border/20 bg-surface/10 hover:bg-emerald-500/5 transition-all"
                          >
                            <td colSpan={10} className="px-2 py-1 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onAddSet(row.exerciseIndex);
                                }}
                                className="w-full py-1 px-2 border border-dashed border-emerald-500/30 rounded hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400 text-xs font-medium transition-all cursor-pointer"
                              >
                                + הוסף סט ל-{row.exerciseName}
                              </button>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

WorkoutTable.displayName = 'WorkoutTable';
