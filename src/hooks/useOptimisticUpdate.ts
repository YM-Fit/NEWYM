import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  rollbackOnError?: boolean;
}

export function useOptimisticUpdate<T>(
  updateFn: (data: T) => Promise<T>,
  options: OptimisticUpdateOptions<T> = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs to avoid recreating callback when options change
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(
    async (optimisticData: T, actualData?: T) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await updateFn(actualData || optimisticData);

        if (optionsRef.current.onSuccess) {
          optionsRef.current.onSuccess(result);
        }

        if (optionsRef.current.successMessage) {
          toast.success(optionsRef.current.successMessage);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('שגיאה בלתי צפויה');
        setError(error);

        if (optionsRef.current.onError) {
          optionsRef.current.onError(error);
        }

        if (optionsRef.current.errorMessage) {
          toast.error(optionsRef.current.errorMessage);
        } else {
          toast.error(error.message || 'שגיאה בעדכון הנתונים');
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [updateFn]
  );

  return {
    execute,
    isLoading,
    error,
  };
}
