import { useState, useCallback } from 'react';

export interface NumericPadState {
  exerciseIndex: number;
  setIndex: number;
  field: 'weight' | 'reps' | 'rpe' | 'superset_weight' | 'superset_reps' | 'superset_rpe' | 'dropset_weight' | 'dropset_reps' | 'superset_dropset_weight' | 'superset_dropset_reps';
  value: number;
  label: string;
}

export function useNumericPad() {
  const [numericPad, setNumericPad] = useState<NumericPadState | null>(null);

  const open = useCallback((
    exerciseIndex: number,
    setIndex: number,
    field: NumericPadState['field'],
    label: string,
    currentValue: number
  ) => {
    setNumericPad({
      exerciseIndex,
      setIndex,
      field,
      value: currentValue,
      label,
    });
  }, []);

  const close = useCallback(() => {
    setNumericPad(null);
  }, []);

  const confirm = useCallback((value: number, onConfirm: (value: number) => void) => {
    if (numericPad) {
      onConfirm(value);
      close();
    }
  }, [numericPad, close]);

  return {
    numericPad,
    open,
    close,
    confirm,
  };
}
