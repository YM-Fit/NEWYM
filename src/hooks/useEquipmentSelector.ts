import { useState, useCallback } from 'react';

export interface EquipmentSelectorState {
  exerciseIndex: number;
  setIndex: number;
  type?: 'regular' | 'superset';
}

export function useEquipmentSelector() {
  const [equipmentSelector, setEquipmentSelector] = useState<EquipmentSelectorState | null>(null);

  const open = useCallback((
    exerciseIndex: number,
    setIndex: number,
    type: 'regular' | 'superset' = 'regular'
  ) => {
    setEquipmentSelector({ exerciseIndex, setIndex, type });
  }, []);

  const close = useCallback(() => {
    setEquipmentSelector(null);
  }, []);

  return {
    equipmentSelector,
    open,
    close,
  };
}
