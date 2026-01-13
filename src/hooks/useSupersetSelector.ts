import { useState, useCallback } from 'react';

export interface SupersetSelectorState {
  exerciseIndex: number;
  setIndex: number;
}

export function useSupersetSelector() {
  const [supersetSelector, setSupersetSelector] = useState<SupersetSelectorState | null>(null);

  const open = useCallback((exerciseIndex: number, setIndex: number) => {
    setSupersetSelector({ exerciseIndex, setIndex });
  }, []);

  const close = useCallback(() => {
    setSupersetSelector(null);
  }, []);

  return {
    supersetSelector,
    open,
    close,
  };
}
