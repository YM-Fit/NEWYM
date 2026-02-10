import React, { useState } from 'react';
import { ArrowRight, Plus, Settings } from 'lucide-react';
import ExerciseSelector from '../../Workouts/ExerciseSelector';
import QuickNumericPad from '../../Workouts/QuickNumericPad';
import EquipmentSelector from '../../Equipment/EquipmentSelector';
import ExerciseInstructionsModal from '../../../common/ExerciseInstructionsModal';
import BulkEditModal from './BulkEditModal';
import type { WorkoutDay, PlanExercise, Exercise, Equipment, SetData } from '../types';
import type { NumericPadState, SupersetNumericPadState, DropsetNumericPadState, SupersetDropsetNumericPadState, SelectorState } from '../types';
import { dayColors } from '../constants';
import WorkoutExerciseCard from './WorkoutExerciseCard';

interface DayEditViewProps {
  day: WorkoutDay;
  selectedExerciseIndex: number | null;
  showExerciseSelector: boolean;
  onBack: () => void;
  onComplete: (dayId: string) => void;
  onUpdateDay: (dayId: string, field: keyof WorkoutDay, value: any) => void;
  onAddExercise: (exercise: Exercise) => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  onCompleteExercise: (exerciseIndex: number) => void;
  onShowInstructions: (name: string, instructions: string | null | undefined) => void;
  onUpdateExercise: (exerciseIndex: number, field: keyof PlanExercise, value: any) => void;
  onUpdateAllExercises: (exercises: PlanExercise[]) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: string, value: any) => void;
  onDuplicateSet: (exerciseIndex: number, setIndex: number) => void;
  onSetShowExerciseSelector: (show: boolean) => void;
  numericPad: NumericPadState | null;
  equipmentSelector: SelectorState | null;
  supersetSelector: SelectorState | null;
  supersetNumericPad: SupersetNumericPadState | null;
  dropsetNumericPad: DropsetNumericPadState | null;
  supersetDropsetNumericPad: SupersetDropsetNumericPadState | null;
  supersetEquipmentSelector: SelectorState | null;
  instructionsExercise: { name: string; instructions: string | null | undefined } | null;
  onHandleNumericPadConfirm: (value: number) => void;
  onHandleEquipmentSelect: (equipment: Equipment | null) => void;
  onHandleSupersetExerciseSelect: (exercise: Exercise) => void;
  onHandleSupersetNumericPadConfirm: (value: number) => void;
  onHandleSupersetEquipmentSelect: (equipment: Equipment | null) => void;
  onHandleDropsetNumericPadConfirm: (value: number) => void;
  onHandleSupersetDropsetNumericPadConfirm: (value: number) => void;
  onOpenNumericPad: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', label: string) => void;
  onOpenEquipmentSelector: (exerciseIndex: number, setIndex: number) => void;
  onOpenSupersetSelector: (exerciseIndex: number, setIndex: number) => void;
  onOpenSupersetNumericPad: (exerciseIndex: number, setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe', label: string) => void;
  onOpenSupersetEquipmentSelector: (exerciseIndex: number, setIndex: number) => void;
  onOpenDropsetNumericPad: (exerciseIndex: number, setIndex: number, field: 'dropset_weight' | 'dropset_reps', label: string) => void;
  onOpenSupersetDropsetNumericPad: (exerciseIndex: number, setIndex: number, field: 'superset_dropset_weight' | 'superset_dropset_reps', label: string) => void;
  onSetNumericPad: (pad: NumericPadState | null) => void;
  onSetEquipmentSelector: (selector: SelectorState | null) => void;
  onSetSupersetSelector: (selector: SelectorState | null) => void;
  onSetSupersetNumericPad: (pad: SupersetNumericPadState | null) => void;
  onSetDropsetNumericPad: (pad: DropsetNumericPadState | null) => void;
  onSetSupersetDropsetNumericPad: (pad: SupersetDropsetNumericPadState | null) => void;
  onSetSupersetEquipmentSelector: (selector: SelectorState | null) => void;
  onSetInstructionsExercise: (exercise: { name: string; instructions: string | null | undefined } | null) => void;
}

export default function DayEditView({
  day,
  selectedExerciseIndex,
  showExerciseSelector,
  onBack,
  onComplete,
  onUpdateDay,
  onAddExercise,
  onRemoveExercise,
  onCompleteExercise,
  onShowInstructions,
  onUpdateExercise,
  onUpdateAllExercises,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onDuplicateSet,
  onSetShowExerciseSelector,
  numericPad,
  equipmentSelector,
  supersetSelector,
  supersetNumericPad,
  dropsetNumericPad,
  supersetDropsetNumericPad,
  supersetEquipmentSelector,
  instructionsExercise,
  onHandleNumericPadConfirm,
  onHandleEquipmentSelect,
  onHandleSupersetExerciseSelect,
  onHandleSupersetNumericPadConfirm,
  onHandleSupersetEquipmentSelect,
  onHandleDropsetNumericPadConfirm,
  onHandleSupersetDropsetNumericPadConfirm,
  onOpenNumericPad,
  onOpenEquipmentSelector,
  onOpenSupersetSelector,
  onOpenSupersetNumericPad,
  onOpenSupersetEquipmentSelector,
  onOpenDropsetNumericPad,
  onOpenSupersetDropsetNumericPad,
  onSetNumericPad,
  onSetEquipmentSelector,
  onSetSupersetSelector,
  onSetSupersetNumericPad,
  onSetDropsetNumericPad,
  onSetSupersetDropsetNumericPad,
  onSetSupersetEquipmentSelector,
  onSetInstructionsExercise,
}: DayEditViewProps) {
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const colorIndex = (day.day_number - 1) % dayColors.length;
  const color = dayColors[colorIndex];

  const handleBulkEdit = (updates: {
    setsCount?: number;
    reps?: number;
    restSeconds?: number;
    weight?: number;
    rpe?: number | null;
  }) => {
    // Build all updated exercises at once, then update them all together
    const updatedExercises = day.exercises.map((exercise) => {
      let newExercise = { ...exercise };

      // Update rest seconds if needed
      if (updates.restSeconds !== undefined) {
        newExercise = { ...newExercise, rest_seconds: updates.restSeconds };
      }

      // Update sets
      let newSets = [...exercise.sets];
      
      if (updates.setsCount !== undefined) {
        // Adjust sets count
        if (updates.setsCount > newSets.length) {
          // Add new sets based on the last set
          const lastSet = newSets.length > 0 ? newSets[newSets.length - 1] : {
            id: `${Date.now()}-${Math.random()}`,
            set_number: 1,
            weight: null,
            reps: null,
            rpe: null,
            set_type: 'regular' as const,
            failure: false,
            equipment_id: null,
            superset_exercise_id: null,
            superset_weight: null,
            superset_reps: null,
            superset_rpe: null,
            superset_equipment_id: null,
            superset_dropset_weight: null,
            superset_dropset_reps: null,
            dropset_weight: null,
            dropset_reps: null,
          };
          
          for (let i = newSets.length; i < updates.setsCount; i++) {
            newSets.push({
              ...lastSet,
              id: `${Date.now()}-${Math.random()}-${i}`,
              set_number: i + 1,
            });
          }
        } else if (updates.setsCount < newSets.length) {
          // Remove sets
          newSets = newSets.slice(0, updates.setsCount);
        }
      }

      // Update all sets with new values
      newSets = newSets.map((set, index) => {
        const updatedSet = { ...set, set_number: index + 1 };
        
        if (updates.reps !== undefined) {
          updatedSet.reps = updates.reps;
        }
        if (updates.weight !== undefined) {
          updatedSet.weight = updates.weight;
        }
        if (updates.rpe !== undefined) {
          updatedSet.rpe = updates.rpe;
        }
        
        return updatedSet;
      });

      newExercise.sets = newSets;
      return newExercise;
    });

    // Update all exercises at once
    onUpdateAllExercises(updatedExercises);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-6">
      {/* Day Edit Header */}
      <div className="premium-card-static p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={onBack}
              className="p-3 lg:p-4 hover:bg-surface100 rounded-xl transition-all duration-300"
            >
              <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7 text-muted600" />
            </button>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br ${color.bg} rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105`}>
                <span className="text-2xl lg:text-3xl font-bold text-foreground">{day.day_number}</span>
              </div>
              <div>
                <h1 className="text-xl lg:text-3xl font-bold text-muted900">יום {day.day_number}</h1>
                <p className="text-base lg:text-lg text-muted600">{day.day_name || 'הגדר שם ליום'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {day.exercises.length > 0 && (
              <button
                onClick={() => setShowBulkEdit(true)}
                className="bg-surface200 hover:bg-surface300 text-muted700 px-4 py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                title="עריכה קולקטיבית"
              >
                <Settings className="w-4 h-4" />
                עריכה קולקטיבית
              </button>
            )}
            <button
              onClick={() => onComplete(day.tempId)}
              className="bg-gradient-to-br from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-800 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              סיים יום
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">שם היום</label>
            <input
              type="text"
              value={day.day_name}
              onChange={(e) => onUpdateDay(day.tempId, 'day_name', e.target.value)}
              className="w-full px-4 py-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 text-lg"
              placeholder="לדוגמה: חזה + טריצפס"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">פוקוס (קבוצות שריר)</label>
            <input
              type="text"
              value={day.focus}
              onChange={(e) => onUpdateDay(day.tempId, 'focus', e.target.value)}
              className="w-full px-4 py-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 text-lg"
              placeholder="חזה, כתפיים קדמיות, טריצפס"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">הערות ליום</label>
            <textarea
              value={day.notes}
              onChange={(e) => onUpdateDay(day.tempId, 'notes', e.target.value)}
              className="w-full px-4 py-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 text-lg"
              rows={2}
              placeholder="הערות כלליות ליום האימון..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">
              תדירות בשבוע (כמה פעמים בשבוע)
            </label>
            <input
              type="number"
              value={day.times_per_week ?? 1}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                const clampedValue = Math.max(0, Math.min(7, value));
                onUpdateDay(day.tempId, 'times_per_week', clampedValue);
              }}
              min="0"
              max="7"
              className="w-full px-4 py-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 text-lg"
              placeholder="1"
            />
            <p className="text-xs text-muted600 mt-1">
              כמה פעמים בשבוע צריך לבצע את היום הזה (0-7). ברירת מחדל: 1
            </p>
          </div>
        </div>
      </div>

      {/* Exercise List */}
      <div className="space-y-4">
        {day.exercises.map((exercise, exerciseIndex) => {
          const isMinimized = selectedExerciseIndex !== exerciseIndex;

          return (
            <WorkoutExerciseCard
              key={exercise.tempId}
              exercise={exercise}
              exerciseIndex={exerciseIndex}
              isMinimized={isMinimized}
              onComplete={onCompleteExercise}
              onRemove={onRemoveExercise}
              onShowInstructions={onShowInstructions}
              onUpdateExercise={onUpdateExercise}
              onAddSet={onAddSet}
              onRemoveSet={onRemoveSet}
              onUpdateSet={onUpdateSet}
              onDuplicateSet={onDuplicateSet}
              onOpenNumericPad={onOpenNumericPad}
              onOpenEquipmentSelector={onOpenEquipmentSelector}
              onOpenSupersetSelector={onOpenSupersetSelector}
              onOpenSupersetNumericPad={onOpenSupersetNumericPad}
              onOpenSupersetEquipmentSelector={onOpenSupersetEquipmentSelector}
              onOpenDropsetNumericPad={onOpenDropsetNumericPad}
              onOpenSupersetDropsetNumericPad={onOpenSupersetDropsetNumericPad}
            />
          );
        })}
      </div>

      <div className="flex gap-3 mt-4">
        {day.exercises.length > 0 && (
          <button
            onClick={() => setShowBulkEdit(true)}
            className="flex-1 bg-surface200 hover:bg-surface300 text-muted700 py-5 lg:py-6 rounded-2xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-lg lg:text-xl"
          >
            <Settings className="h-6 w-6 lg:h-7 lg:w-7" />
            <span>עריכה קולקטיבית</span>
          </button>
        )}
        <button
          onClick={() => onSetShowExerciseSelector(true)}
          className={`${day.exercises.length > 0 ? 'flex-1' : 'w-full'} bg-gradient-to-br from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-800 text-white py-5 lg:py-6 rounded-2xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]`}
        >
          <Plus className="h-6 w-6 lg:h-7 lg:w-7" />
          <span className="font-bold text-lg lg:text-xl">הוסף תרגיל</span>
        </button>
      </div>

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={showBulkEdit}
        day={day}
        onClose={() => setShowBulkEdit(false)}
        onApply={handleBulkEdit}
      />

      {showExerciseSelector && (
        <ExerciseSelector
          onSelect={onAddExercise}
          onClose={() => onSetShowExerciseSelector(false)}
        />
      )}

      {instructionsExercise && (
        <ExerciseInstructionsModal
          isOpen={!!instructionsExercise}
          onClose={() => onSetInstructionsExercise(null)}
          exerciseName={instructionsExercise.name}
          instructions={instructionsExercise.instructions}
        />
      )}

      {numericPad && (
        <QuickNumericPad
          value={numericPad.value}
          label={numericPad.label}
          onConfirm={onHandleNumericPadConfirm}
          onClose={() => onSetNumericPad(null)}
          allowDecimal={numericPad.field === 'weight'}
        />
      )}

      {equipmentSelector && (
        <EquipmentSelector
          currentEquipmentId={
            day.exercises[equipmentSelector.exerciseIndex]?.sets[equipmentSelector.setIndex]?.equipment_id || null
          }
          onSelect={onHandleEquipmentSelect}
          onClose={() => onSetEquipmentSelector(null)}
        />
      )}

      {supersetSelector && (
        <ExerciseSelector
          onSelect={onHandleSupersetExerciseSelect}
          onClose={() => onSetSupersetSelector(null)}
        />
      )}

      {supersetNumericPad && (
        <QuickNumericPad
          value={supersetNumericPad.value}
          label={supersetNumericPad.label}
          onConfirm={onHandleSupersetNumericPadConfirm}
          onClose={() => onSetSupersetNumericPad(null)}
          allowDecimal={supersetNumericPad.field === 'superset_weight'}
        />
      )}

      {supersetEquipmentSelector && (
        <EquipmentSelector
          currentEquipmentId={
            day.exercises[supersetEquipmentSelector.exerciseIndex]?.sets[supersetEquipmentSelector.setIndex]?.superset_equipment_id || null
          }
          onSelect={onHandleSupersetEquipmentSelect}
          onClose={() => onSetSupersetEquipmentSelector(null)}
        />
      )}

      {dropsetNumericPad && (
        <QuickNumericPad
          value={dropsetNumericPad.value}
          label={dropsetNumericPad.label}
          onConfirm={onHandleDropsetNumericPadConfirm}
          onClose={() => onSetDropsetNumericPad(null)}
          allowDecimal={dropsetNumericPad.field === 'dropset_weight'}
        />
      )}

      {supersetDropsetNumericPad && (
        <QuickNumericPad
          value={supersetDropsetNumericPad.value}
          label={supersetDropsetNumericPad.label}
          onConfirm={onHandleSupersetDropsetNumericPadConfirm}
          onClose={() => onSetSupersetDropsetNumericPad(null)}
          allowDecimal={supersetDropsetNumericPad.field === 'superset_dropset_weight'}
        />
      )}
    </div>
  );
}
