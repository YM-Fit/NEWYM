import React from 'react';
import { Trash2, Info, Plus, Copy } from 'lucide-react';
import type { PlanExercise } from '../types';
import WorkoutSetEditor from './WorkoutSetEditor';

interface WorkoutExerciseCardProps {
  exercise: PlanExercise;
  exerciseIndex: number;
  isMinimized: boolean;
  onComplete: (exerciseIndex: number) => void;
  onRemove: (exerciseIndex: number) => void;
  onShowInstructions: (name: string, instructions: string | null | undefined) => void;
  onUpdateExercise: (exerciseIndex: number, field: keyof PlanExercise, value: any) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: string, value: any) => void;
  onDuplicateSet: (exerciseIndex: number, setIndex: number) => void;
  onOpenNumericPad: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', label: string) => void;
  onOpenEquipmentSelector: (exerciseIndex: number, setIndex: number) => void;
  onOpenSupersetSelector: (exerciseIndex: number, setIndex: number) => void;
  onOpenSupersetNumericPad: (exerciseIndex: number, setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe', label: string) => void;
  onOpenSupersetEquipmentSelector: (exerciseIndex: number, setIndex: number) => void;
  onOpenDropsetNumericPad: (exerciseIndex: number, setIndex: number, field: 'dropset_weight' | 'dropset_reps', label: string) => void;
  onOpenSupersetDropsetNumericPad: (exerciseIndex: number, setIndex: number, field: 'superset_dropset_weight' | 'superset_dropset_reps', label: string) => void;
}

export default function WorkoutExerciseCard({
  exercise,
  exerciseIndex,
  isMinimized,
  onComplete,
  onRemove,
  onShowInstructions,
  onUpdateExercise,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onDuplicateSet,
  onOpenNumericPad,
  onOpenEquipmentSelector,
  onOpenSupersetSelector,
  onOpenSupersetNumericPad,
  onOpenSupersetEquipmentSelector,
  onOpenDropsetNumericPad,
  onOpenSupersetDropsetNumericPad,
}: WorkoutExerciseCardProps) {
  if (isMinimized) {
    return (
      <div
        className="h-full flex items-center justify-between px-4 lg:px-6 cursor-pointer hover:bg-emerald-100/50 transition-all duration-300"
        onClick={() => onComplete(exerciseIndex)}
        style={{ height: '72px' }}
      >
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-lg text-foreground font-bold">{exerciseIndex + 1}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-muted900">{exercise.exercise.name}</h3>
            <p className="text-sm text-muted600">{exercise.sets.length} סטים</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowInstructions(exercise.exercise.name, exercise.exercise.instructions);
            }}
            className="p-2 hover:bg-cyan-50 text-cyan-600 rounded-xl transition-all duration-300"
            aria-label="איך לבצע"
            title="איך לבצע"
          >
            <Info className="h-5 w-5" />
          </button>
          <span className="text-sm text-emerald-600 font-semibold">לחץ לעריכה</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(exerciseIndex);
            }}
            className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-all duration-300"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl text-foreground font-bold">{exerciseIndex + 1}</span>
          </div>
          <div>
            <h3 className="text-lg lg:text-2xl font-bold text-muted900">{exercise.exercise.name}</h3>
            {exercise.exercise.muscle_group?.name && (
              <p className="text-sm text-muted500">{exercise.exercise.muscle_group.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <button
            onClick={() => onShowInstructions(exercise.exercise.name, exercise.exercise.instructions)}
            className="p-3 hover:bg-cyan-50 text-cyan-600 rounded-xl transition-all duration-300"
            aria-label="איך לבצע"
            title="איך לבצע"
          >
            <Info className="h-5 w-5 lg:h-6 lg:w-6" />
          </button>
          <button
            onClick={() => onComplete(exerciseIndex)}
            className="px-4 py-2 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground rounded-xl transition-all duration-300 text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105"
          >
            סיים תרגיל
          </button>
          <button
            onClick={() => onRemove(exerciseIndex)}
            className="p-3 hover:bg-red-50 text-red-600 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            aria-label={`מחק תרגיל ${exercise.exercise.name}`}
          >
            <Trash2 className="h-5 w-5 lg:h-6 lg:w-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {exercise.sets.map((set, setIndex) => (
          <WorkoutSetEditor
            key={set.id}
            set={set}
            exerciseIndex={exerciseIndex}
            setIndex={setIndex}
            setsCount={exercise.sets.length}
            onUpdateSet={onUpdateSet}
            onRemoveSet={onRemoveSet}
            onDuplicateSet={onDuplicateSet}
            onOpenNumericPad={onOpenNumericPad}
            onOpenEquipmentSelector={onOpenEquipmentSelector}
            onOpenSupersetSelector={onOpenSupersetSelector}
            onOpenSupersetNumericPad={onOpenSupersetNumericPad}
            onOpenSupersetEquipmentSelector={onOpenSupersetEquipmentSelector}
            onOpenDropsetNumericPad={onOpenDropsetNumericPad}
            onOpenSupersetDropsetNumericPad={onOpenSupersetDropsetNumericPad}
          />
        ))}
      </div>

      <button
        onClick={() => onAddSet(exerciseIndex)}
        className="w-full mt-4 py-4 lg:py-5 border-2 border-dashed border-border300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 text-muted600 hover:text-emerald-700 font-bold text-base lg:text-lg transition-all duration-300"
      >
        + הוסף סט
      </button>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-muted700 mb-2">הערות לתרגיל</label>
        <textarea
          value={exercise.notes}
          onChange={(e) => onUpdateExercise(exerciseIndex, 'notes', e.target.value)}
          className="w-full px-4 py-3 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
          rows={2}
          placeholder="הערות לביצוע התרגיל..."
        />
      </div>
    </div>
  );
}
