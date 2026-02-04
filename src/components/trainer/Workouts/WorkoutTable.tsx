import { memo, useMemo } from 'react';
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
  onOpenNumericPad: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe') => void;
  onOpenEquipmentSelector: (exerciseIndex: number, setIndex: number) => void;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: string, value: any) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onDuplicateSet: (exerciseIndex: number, setIndex: number) => void;
  onCompleteSet: (exerciseIndex: number, setIndex: number) => void;
  onAddSet: (exerciseIndex: number) => void;
  isTablet?: boolean;
}

export const WorkoutTable = memo(({
  exercises,
  onOpenNumericPad,
  onOpenEquipmentSelector,
  onUpdateSet,
  onRemoveSet,
  onDuplicateSet,
  onCompleteSet,
  onAddSet,
  isTablet,
}: WorkoutTableProps) => {
  // Flatten exercises and sets into rows
  const tableRows = useMemo(() => {
    const rows: Array<{
      exerciseIndex: number;
      setIndex: number;
      exerciseName: string;
      set: SetData;
    }> = [];

    exercises.forEach((exercise, exerciseIndex) => {
      exercise.sets.forEach((set, setIndex) => {
        rows.push({
          exerciseIndex,
          setIndex,
          exerciseName: exercise.exercise.name,
          set,
        });
      });
    });

    return rows;
  }, [exercises]);

  if (exercises.length === 0) {
    return (
      <div className="premium-card-static p-8 text-center mb-4">
        <p className="text-muted text-lg">אין תרגילים באימון</p>
        <p className="text-muted text-sm mt-2">הוסף תרגיל כדי להתחיל</p>
      </div>
    );
  }

  return (
    <div className="premium-card-static overflow-hidden mb-4 shadow-lg border-2 border-emerald-500/30" style={{ display: 'block' }}>
      <div className="overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto">
        <table className="w-full border-collapse min-w-[1000px] bg-surface/50" style={{ display: 'table' }}>
          <WorkoutTableHeader isTablet={isTablet} />
          <tbody>
            {tableRows.map((row, index) => {
              const isFirstSetOfExercise = row.setIndex === 0;
              const isLastSetOfExercise = row.setIndex === exercises[row.exerciseIndex].sets.length - 1;
              const canDelete = exercises[row.exerciseIndex].sets.length > 1;
              const prevRow = index > 0 ? tableRows[index - 1] : null;
              const isNewExercise = !prevRow || prevRow.exerciseIndex !== row.exerciseIndex;
              const nextRow = index < tableRows.length - 1 ? tableRows[index + 1] : null;
              const isLastRowOfExercise = !nextRow || nextRow.exerciseIndex !== row.exerciseIndex;
              
              return (
                <>
                  <WorkoutTableRow
                    key={`${row.exerciseIndex}-${row.setIndex}-${row.set.id}`}
                    exerciseName={row.exerciseName}
                    set={row.set}
                    exerciseIndex={row.exerciseIndex}
                    setIndex={row.setIndex}
                    isActive={isFirstSetOfExercise && index === 0}
                    isFirstSet={isFirstSetOfExercise}
                    isLastSet={isLastSetOfExercise}
                    isNewExercise={isNewExercise}
                    onOpenNumericPad={onOpenNumericPad}
                    onOpenEquipmentSelector={onOpenEquipmentSelector}
                    onUpdateSet={onUpdateSet}
                    onRemoveSet={onRemoveSet}
                    onDuplicateSet={onDuplicateSet}
                    onCompleteSet={onCompleteSet}
                    canDelete={canDelete}
                    isTablet={isTablet}
                  />
                  {/* Add Set button only after the last set of each exercise - Single button per exercise */}
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
          </tbody>
        </table>
      </div>
    </div>
  );
});

WorkoutTable.displayName = 'WorkoutTable';
