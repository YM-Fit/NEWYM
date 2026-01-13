import { useState, useCallback } from 'react';
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

  const execute = useCallback(
    async (optimisticData: T, actualData?: T) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await updateFn(actualData || optimisticData);
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        
        if (options.successMessage) {
          toast.success(options.successMessage);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('שגיאה בלתי צפויה');
        setError(error);

        if (options.onError) {
          options.onError(error);
        }

        if (options.errorMessage) {
          toast.error(options.errorMessage);
        } else {
          toast.error(error.message || 'שגיאה בעדכון הנתונים');
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [updateFn, options]
  );

  return {
    execute,
    isLoading,
    error,
  };
}
