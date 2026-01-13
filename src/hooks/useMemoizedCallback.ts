import { useCallback, useRef } from 'react';

/**
 * Memoized callback that only changes when dependencies change
 * Similar to useCallback but with better performance for expensive operations
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef(callback);
  const depsRef = useRef(deps);

  // Check if dependencies have changed
  const hasChanged = deps.length !== depsRef.current.length ||
    deps.some((dep, i) => dep !== depsRef.current[i]);

  if (hasChanged) {
    callbackRef.current = callback;
    depsRef.current = deps;
  }

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}
