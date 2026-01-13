import { useState, useEffect, useCallback } from 'react';

interface UseAsyncOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseAsyncOptions<T> = {}
): UseAsyncState<T> & {
  execute: () => Promise<void>;
  reset: () => void;
} {
  const { immediate = true, onSuccess, onError } = options;
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await asyncFunction();
      setState({ data, loading: false, error: null });
      onSuccess?.(data);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('שגיאה בלתי צפויה');
      setState({ data: null, loading: false, error: err });
      onError?.(err);
    }
  }, [asyncFunction, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, deps);

  return {
    ...state,
    execute,
    reset,
  };
}
