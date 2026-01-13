import { memo, useState } from 'react';
import { Trash2, Check, Info } from 'lucide-react';
import { WorkoutSetCard } from './WorkoutSetCard';
import ExerciseInstructionsModal from '../../common/ExerciseInstructionsModal';

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
    instructions?: string | null;
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
  onCompleteSet: (setIndex: number) => void;
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
  onCompleteSet,
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
  const [showInstructions, setShowInstructions] = useState(false);
  if (isMinimized) {
    return (
      <div
        className="premium-card-static mb-4 lg:mb-6 overflow-hidden border-r-4 border-emerald-500"
        style={{ height: '72px', overflow: 'hidden' }}
      >
        <div
          className="h-full flex items-center justify-between px-4 lg:px-6 cursor-pointer hover:bg-zinc-800/50 transition-all"
          onClick={onToggleMinimize}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{workoutExercise.exercise.name}</h3>
              <p className="text-sm text-zinc-500">
                {summary.totalSets} סטים | {summary.maxWeight} ק״ג מקס | נפח: {summary.totalVolume.toLocaleString()} ק״ג
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowInstructions(true);
              }}
              className="p-2 hover:bg-cyan-500/15 text-cyan-400 rounded-xl transition-all"
              aria-label="איך לבצע"
              title="איך לבצע"
            >
              <Info className="h-5 w-5" />
            </button>
            <span className="text-sm text-emerald-400 font-medium bg-emerald-500/15 px-3 py-1 rounded-lg">לחץ לעריכה</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-2 hover:bg-red-500/15 text-red-400 rounded-xl transition-all"
              aria-label="מחק תרגיל"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <ExerciseInstructionsModal
          isOpen={showInstructions}
          onClose={() => setShowInstructions(false)}
          exerciseName={workoutExercise.exercise.name}
          instructions={workoutExercise.exercise.instructions}
        />
      </div>
    );
  }

  return (
    <div className="premium-card-static mb-4 lg:mb-6 overflow-hidden">
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg lg:text-xl font-bold text-white">{workoutExercise.exercise.name}</h3>
            {workoutExercise.sets.length > 0 && (
              <p className="text-sm text-emerald-400 mt-1 font-semibold">
                נפח: {totalVolume.toLocaleString()} ק"ג
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInstructions(true)}
              className="p-2 lg:p-3 hover:bg-cyan-500/15 text-cyan-400 rounded-xl transition-all touch-manipulation"
              aria-label="איך לבצע"
              title="איך לבצע"
            >
              <Info className="h-5 w-5 lg:h-6 lg:w-6" />
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all text-sm font-semibold"
            >
              סיים תרגיל
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="p-2 lg:p-3 hover:bg-red-500/15 text-red-400 rounded-xl transition-all touch-manipulation"
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
              onCompleteSet={() => onCompleteSet(setIndex)}
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
          className="w-full mt-4 py-4 lg:py-5 border-2 border-dashed border-zinc-700/50 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-400 font-semibold text-base lg:text-lg transition-all touch-manipulation"
        >
          + הוסף סט
        </button>
      </div>

      <ExerciseInstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        exerciseName={workoutExercise.exercise.name}
        instructions={workoutExercise.exercise.instructions}
      />
    </div>
  );
});

WorkoutExerciseCard.displayName = 'WorkoutExerciseCard';
