import { useState } from 'react';
import type { WorkoutExercise, NumericPadState, EquipmentSelectorState, SupersetSelectorState, SupersetNumericPadState, DropsetNumericPadState, SetData } from '../types/selfWorkoutTypes';

interface UseSelfWorkoutNumericPadsProps {
  exercises: WorkoutExercise[];
  updateSet: (exerciseIndex: number, setIndex: number, field: keyof SetData, value: any) => void;
}

export function useSelfWorkoutNumericPads({ exercises, updateSet }: UseSelfWorkoutNumericPadsProps) {
  const [numericPad, setNumericPad] = useState<NumericPadState | null>(null);
  const [equipmentSelector, setEquipmentSelector] = useState<EquipmentSelectorState | null>(null);
  const [supersetSelector, setSupersetSelector] = useState<SupersetSelectorState | null>(null);
  const [supersetNumericPad, setSupersetNumericPad] = useState<SupersetNumericPadState | null>(null);
  const [dropsetNumericPad, setDropsetNumericPad] = useState<DropsetNumericPadState | null>(null);
  const [supersetEquipmentSelector, setSupersetEquipmentSelector] = useState<EquipmentSelectorState | null>(null);

  const openNumericPad = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', label: string) => {
    const currentValue = exercises[exerciseIndex].sets[setIndex][field] || 0;
    setNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  };

  const handleNumericPadConfirm = (value: number) => {
    if (numericPad) {
      updateSet(numericPad.exerciseIndex, numericPad.setIndex, numericPad.field, value);
      setNumericPad(null);
    }
  };

  const handleEquipmentSelect = (equipment: { id: string; name: string; emoji: string | null } | null) => {
    if (equipmentSelector) {
      updateSet(equipmentSelector.exerciseIndex, equipmentSelector.setIndex, 'equipment_id', equipment?.id || null);
      updateSet(equipmentSelector.exerciseIndex, equipmentSelector.setIndex, 'equipment', equipment);
      setEquipmentSelector(null);
    }
  };

  const handleSupersetExerciseSelect = (exercise: { id: string; name: string }) => {
    if (supersetSelector) {
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'set_type', 'superset');
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'superset_exercise_id', exercise.id);
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'superset_exercise_name', exercise.name);
      setSupersetSelector(null);
    }
  };

  const openSupersetNumericPad = (exerciseIndex: number, setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe', label: string) => {
    const currentValue = exercises[exerciseIndex].sets[setIndex][field] || 0;
    setSupersetNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  };

  const handleSupersetEquipmentSelect = (equipment: { id: string; name: string; emoji: string | null } | null) => {
    if (supersetEquipmentSelector) {
      updateSet(supersetEquipmentSelector.exerciseIndex, supersetEquipmentSelector.setIndex, 'superset_equipment_id', equipment?.id || null);
      updateSet(supersetEquipmentSelector.exerciseIndex, supersetEquipmentSelector.setIndex, 'superset_equipment', equipment);
      setSupersetEquipmentSelector(null);
    }
  };

  const handleSupersetNumericPadConfirm = (value: number) => {
    if (supersetNumericPad) {
      updateSet(supersetNumericPad.exerciseIndex, supersetNumericPad.setIndex, supersetNumericPad.field, value);
      setSupersetNumericPad(null);
    }
  };

  const openDropsetNumericPad = (exerciseIndex: number, setIndex: number, field: 'dropset_weight' | 'dropset_reps', label: string) => {
    const currentValue = exercises[exerciseIndex].sets[setIndex][field] || 0;
    setDropsetNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  };

  const handleDropsetNumericPadConfirm = (value: number) => {
    if (dropsetNumericPad) {
      updateSet(dropsetNumericPad.exerciseIndex, dropsetNumericPad.setIndex, dropsetNumericPad.field, value);
      setDropsetNumericPad(null);
    }
  };

  return {
    numericPad,
    setNumericPad,
    equipmentSelector,
    setEquipmentSelector,
    supersetSelector,
    setSupersetSelector,
    supersetNumericPad,
    setSupersetNumericPad,
    dropsetNumericPad,
    setDropsetNumericPad,
    supersetEquipmentSelector,
    setSupersetEquipmentSelector,
    openNumericPad,
    handleNumericPadConfirm,
    handleEquipmentSelect,
    handleSupersetExerciseSelect,
    openSupersetNumericPad,
    handleSupersetEquipmentSelect,
    handleSupersetNumericPadConfirm,
    openDropsetNumericPad,
    handleDropsetNumericPadConfirm,
  };
}
