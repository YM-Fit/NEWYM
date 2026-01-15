import { useState, useCallback } from 'react';
import type { WorkoutDay, NumericPadState, SupersetNumericPadState, DropsetNumericPadState, SupersetDropsetNumericPadState, SelectorState, Exercise, Equipment } from '../types';

export function useWorkoutPlanNumericPads(
  selectedDay: WorkoutDay | null,
  updateSet: (exerciseIndex: number, setIndex: number, field: string, value: any) => void
) {
  const [numericPad, setNumericPad] = useState<NumericPadState | null>(null);
  const [supersetNumericPad, setSupersetNumericPad] = useState<SupersetNumericPadState | null>(null);
  const [dropsetNumericPad, setDropsetNumericPad] = useState<DropsetNumericPadState | null>(null);
  const [supersetDropsetNumericPad, setSupersetDropsetNumericPad] = useState<SupersetDropsetNumericPadState | null>(null);
  const [equipmentSelector, setEquipmentSelector] = useState<SelectorState | null>(null);
  const [supersetSelector, setSupersetSelector] = useState<SelectorState | null>(null);
  const [supersetEquipmentSelector, setSupersetEquipmentSelector] = useState<SelectorState | null>(null);

  const openNumericPad = useCallback((exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', label: string) => {
    if (!selectedDay) return;
    const currentValue = selectedDay.exercises[exerciseIndex].sets[setIndex][field] || 0;
    setNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  }, [selectedDay]);

  const handleNumericPadConfirm = useCallback((value: number) => {
    if (numericPad) {
      updateSet(numericPad.exerciseIndex, numericPad.setIndex, numericPad.field, value);
      setNumericPad(null);
    }
  }, [numericPad, updateSet]);

  const openSupersetNumericPad = useCallback((exerciseIndex: number, setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe', label: string) => {
    if (!selectedDay) return;
    const currentValue = selectedDay.exercises[exerciseIndex].sets[setIndex][field] || 0;
    setSupersetNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  }, [selectedDay]);

  const handleSupersetNumericPadConfirm = useCallback((value: number) => {
    if (supersetNumericPad) {
      updateSet(supersetNumericPad.exerciseIndex, supersetNumericPad.setIndex, supersetNumericPad.field, value);
      setSupersetNumericPad(null);
    }
  }, [supersetNumericPad, updateSet]);

  const openDropsetNumericPad = useCallback((exerciseIndex: number, setIndex: number, field: 'dropset_weight' | 'dropset_reps', label: string) => {
    if (!selectedDay) return;
    const currentValue = selectedDay.exercises[exerciseIndex].sets[setIndex][field] || 0;
    setDropsetNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  }, [selectedDay]);

  const handleDropsetNumericPadConfirm = useCallback((value: number) => {
    if (dropsetNumericPad) {
      updateSet(dropsetNumericPad.exerciseIndex, dropsetNumericPad.setIndex, dropsetNumericPad.field, value);
      setDropsetNumericPad(null);
    }
  }, [dropsetNumericPad, updateSet]);

  const openSupersetDropsetNumericPad = useCallback((exerciseIndex: number, setIndex: number, field: 'superset_dropset_weight' | 'superset_dropset_reps', label: string) => {
    if (!selectedDay) return;
    const currentValue = selectedDay.exercises[exerciseIndex].sets[setIndex][field] || 0;
    setSupersetDropsetNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  }, [selectedDay]);

  const handleSupersetDropsetNumericPadConfirm = useCallback((value: number) => {
    if (supersetDropsetNumericPad) {
      updateSet(supersetDropsetNumericPad.exerciseIndex, supersetDropsetNumericPad.setIndex, supersetDropsetNumericPad.field, value);
      setSupersetDropsetNumericPad(null);
    }
  }, [supersetDropsetNumericPad, updateSet]);

  const openEquipmentSelector = useCallback((exerciseIndex: number, setIndex: number) => {
    setEquipmentSelector({ exerciseIndex, setIndex });
  }, []);

  const handleEquipmentSelect = useCallback((equipment: Equipment | null) => {
    if (equipmentSelector) {
      updateSet(equipmentSelector.exerciseIndex, equipmentSelector.setIndex, 'equipment_id', equipment?.id || null);
      updateSet(equipmentSelector.exerciseIndex, equipmentSelector.setIndex, 'equipment', equipment);
      setEquipmentSelector(null);
    }
  }, [equipmentSelector, updateSet]);

  const openSupersetSelector = useCallback((exerciseIndex: number, setIndex: number) => {
    setSupersetSelector({ exerciseIndex, setIndex });
  }, []);

  const handleSupersetExerciseSelect = useCallback((exercise: Exercise) => {
    if (supersetSelector) {
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'set_type', 'superset');
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'superset_exercise_id', exercise.id);
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'superset_exercise_name', exercise.name);
      setSupersetSelector(null);
    }
  }, [supersetSelector, updateSet]);

  const openSupersetEquipmentSelector = useCallback((exerciseIndex: number, setIndex: number) => {
    setSupersetEquipmentSelector({ exerciseIndex, setIndex });
  }, []);

  const handleSupersetEquipmentSelect = useCallback((equipment: Equipment | null) => {
    if (supersetEquipmentSelector) {
      updateSet(supersetEquipmentSelector.exerciseIndex, supersetEquipmentSelector.setIndex, 'superset_equipment_id', equipment?.id || null);
      updateSet(supersetEquipmentSelector.exerciseIndex, supersetEquipmentSelector.setIndex, 'superset_equipment', equipment);
      setSupersetEquipmentSelector(null);
    }
  }, [supersetEquipmentSelector, updateSet]);

  return {
    numericPad,
    supersetNumericPad,
    dropsetNumericPad,
    supersetDropsetNumericPad,
    equipmentSelector,
    supersetSelector,
    supersetEquipmentSelector,
    setNumericPad,
    setSupersetNumericPad,
    setDropsetNumericPad,
    setSupersetDropsetNumericPad,
    setEquipmentSelector,
    setSupersetSelector,
    setSupersetEquipmentSelector,
    openNumericPad,
    handleNumericPadConfirm,
    openSupersetNumericPad,
    handleSupersetNumericPadConfirm,
    openDropsetNumericPad,
    handleDropsetNumericPadConfirm,
    openSupersetDropsetNumericPad,
    handleSupersetDropsetNumericPadConfirm,
    openEquipmentSelector,
    handleEquipmentSelect,
    openSupersetSelector,
    handleSupersetExerciseSelect,
    openSupersetEquipmentSelector,
    handleSupersetEquipmentSelect,
  };
}
