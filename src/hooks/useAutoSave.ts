import { useEffect, useState, useRef } from 'react';
import { logger } from '../utils/logger';

interface UseAutoSaveOptions<T> {
  data: T;
  localStorageKey: string;
  enabled?: boolean;
  interval?: number;
}

export function useAutoSave<T>({
  data,
  localStorageKey,
  enabled = true,
  interval = 10000
}: UseAutoSaveOptions<T>) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const initialDataRef = useRef<string>(JSON.stringify(data));

  useEffect(() => {
    const currentData = JSON.stringify(data);
    setIsDirty(currentData !== initialDataRef.current);
  }, [data]);

  useEffect(() => {
    if (!enabled) return;

    const autoSaveInterval = setInterval(() => {
      if (isDirty) {
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(data));
          setLastSaved(new Date());
          setIsDirty(false);
          initialDataRef.current = JSON.stringify(data);
        } catch (error) {
          logger.error('Auto-save failed:', error, 'useAutoSave');
        }
      }
    }, interval);

    return () => clearInterval(autoSaveInterval);
  }, [data, isDirty, enabled, interval, localStorageKey]);

  const clearSaved = () => {
    try {
      localStorage.removeItem(localStorageKey);
      setLastSaved(null);
      setIsDirty(false);
      initialDataRef.current = JSON.stringify(data);
    } catch (error) {
      logger.error('Failed to clear saved data:', error, 'useAutoSave');
    }
  };

  const loadSaved = (): T | null => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      logger.error('Failed to load saved data:', error, 'useAutoSave');
      return null;
    }
  };

  const manualSave = () => {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(data));
      setLastSaved(new Date());
      setIsDirty(false);
      initialDataRef.current = JSON.stringify(data);
    } catch (error) {
      logger.error('Manual save failed:', error, 'useAutoSave');
    }
  };

  return {
    lastSaved,
    isDirty,
    clearSaved,
    loadSaved,
    manualSave
  };
}
