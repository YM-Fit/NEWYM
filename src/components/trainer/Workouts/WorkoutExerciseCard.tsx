import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { WorkoutSetCard } from './WorkoutSetCard';

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
  suggested_weight?: number | null;
  suggested_reps?: number | null;
  suggested_superset_weight?: number | null;
  suggested_superset_reps?: number | null;
}

interface WorkoutExercise {
  tempId: string;
  exercise: {
    id: string;
    name: string;
    muscle_group_id: string;
  };
  sets: SetData[];
}

interface ExerciseSummary {
  totalSets: number;
  maxWeight: number;
  totalVolume: number;
}

interface WorkoutExerciseCardProps {
  workoutExercise: WorkoutExercise;
  exerciseIndex: number;
  isMinimized: boolean;
  collapsedSets: string[];
  summary: ExerciseSummary;
  totalVolume: number;
  onRemove: () => void;
  onToggleMinimize: () => void;
  onComplete: () => void;
  onAddSet: () => void;
  onDuplicateSet: (setIndex: number) => void;
  onRemoveSet: (setIndex: number) => void;
  onToggleCollapseSet: (setId: string) => void;
  onOpenNumericPad: (setIndex: number, field: 'weight' | 'reps' | 'rpe') => void;
  onOpenEquipmentSelector: (setIndex: number) => void;
  onOpenSupersetSelector: (setIndex: number) => void;
  onOpenSupersetNumericPad: (setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe') => void;
  onOpenSupersetEquipmentSelector: (setIndex: number) => void;
  onOpenDropsetNumericPad: (setIndex: number, field: 'dropset_weight' | 'dropset_reps') => void;
  onOpenSupersetDropsetNumericPad: (setIndex: number, field: 'superset_dropset_weight' | 'superset_dropset_reps') => void;
  onUpdateSet: (setIndex: number, field: string, value: any) => void;
  onOpenCalculator: (setIndex: number) => void;
  onApplySuggestion: (setIndex: number) => void;
}

export const WorkoutExerciseCard = memo(({
  workoutExercise,
  exerciseIndex,
  isMinimized,
  collapsedSets,
  summary,
  totalVolume,
  onRemove,
  onToggleMinimize,
  onComplete,
  onAddSet,
  onDuplicateSet,
  onRemoveSet,
  onToggleCollapseSet,
  onOpenNumericPad,
  onOpenEquipmentSelector,
  onOpenSupersetSelector,
  onOpenSupersetNumericPad,
  onOpenSupersetEquipmentSelector,
  onOpenDropsetNumericPad,
  onOpenSupersetDropsetNumericPad,
  onUpdateSet,
  onOpenCalculator,
  onApplySuggestion,
}: WorkoutExerciseCardProps) => {
  if (isMinimized) {
    return (
      <div
        className={`bg-white rounded-2xl shadow-xl hover:shadow-2xl mb-4 lg:mb-6 transition-all duration-300 ease-in-out overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border-r-4 border-emerald-500`}
        style={{ height: '72px', overflow: 'hidden' }}
      >
        <div
          className="h-full flex items-center justify-between px-4 lg:px-6 cursor-pointer hover:bg-emerald-100/50 transition-all duration-300"
          onClick={onToggleMinimize}
        >
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg font-bold">V</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{workoutExercise.exercise.name}</h3>
              <p className="text-sm text-gray-600">
                {summary.totalSets} סטים | {summary.maxWeight} ק״ג מקס | נפח: {summary.totalVolume.toLocaleString()} ק״ג
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="text-sm text-emerald-600 font-semibold bg-emerald-100 px-3 py-1 rounded-lg">לחץ לעריכה</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all duration-300"
              aria-label="מחק תרגיל"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl mb-4 lg:mb-6 transition-all duration-300 ease-in-out overflow-hidden border border-gray-100">
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg lg:text-2xl font-bold text-gray-900">{workoutExercise.exercise.name}</h3>
            {workoutExercise.sets.length > 0 && (
              <p className="text-sm text-emerald-600 mt-1 font-semibold">
                נפח: {totalVolume.toLocaleString()} ק"ג
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              type="button"
              onClick={onComplete}
              className="px-4 py-2 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl"
            >
              סיים תרגיל
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="p-2 lg:p-3 hover:bg-red-50 active:bg-red-100 text-red-500 rounded-xl transition-all duration-300 touch-manipulation"
              aria-label="מחק תרגיל"
            >
              <Trash2 className="h-5 w-5 lg:h-6 lg:w-6" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {workoutExercise.sets.map((set, setIndex) => (
            <WorkoutSetCard
              key={set.id}
              set={set}
              setIndex={setIndex}
              isCollapsed={collapsedSets.includes(set.id)}
              canDelete={workoutExercise.sets.length > 1}
              onToggleCollapse={() => onToggleCollapseSet(set.id)}
              onDuplicate={() => onDuplicateSet(setIndex)}
              onRemove={() => onRemoveSet(setIndex)}
              onOpenNumericPad={(field) => onOpenNumericPad(setIndex, field)}
              onOpenEquipmentSelector={() => onOpenEquipmentSelector(setIndex)}
              onOpenSupersetSelector={() => onOpenSupersetSelector(setIndex)}
              onOpenSupersetNumericPad={(field) => onOpenSupersetNumericPad(setIndex, field)}
              onOpenSupersetEquipmentSelector={() => onOpenSupersetEquipmentSelector(setIndex)}
              onOpenDropsetNumericPad={(field) => onOpenDropsetNumericPad(setIndex, field)}
              onOpenSupersetDropsetNumericPad={(field) => onOpenSupersetDropsetNumericPad(setIndex, field)}
              onUpdateSet={(field, value) => onUpdateSet(setIndex, field, value)}
              onOpenCalculator={() => onOpenCalculator(setIndex)}
              onApplySuggestion={() => onApplySuggestion(setIndex)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onAddSet}
          className="w-full mt-4 py-4 lg:py-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-emerald-500 active:border-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 text-gray-500 hover:text-emerald-700 font-semibold text-base lg:text-lg transition-all duration-300 touch-manipulation"
        >
          + הוסף סט
        </button>
      </div>
    </div>
  );
});

WorkoutExerciseCard.displayName = 'WorkoutExerciseCard';
