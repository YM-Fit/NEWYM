import { useState, useEffect, useCallback } from 'react';

interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
  instructions?: string | null;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_KEY = 'exercises_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000;

export function useExerciseCache() {
  const [cachedExercises, setCachedExercises] = useState<Exercise[] | null>(null);
  const [isCacheValid, setIsCacheValid] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsedCache: CachedData<Exercise[]> = JSON.parse(cached);
        const now = Date.now();

        if (now - parsedCache.timestamp < CACHE_TTL) {
          setCachedExercises(parsedCache.data);
          setIsCacheValid(true);
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading exercise cache:', error);
      localStorage.removeItem(CACHE_KEY);
    }
  }, []);

  const saveToCache = useCallback((exercises: Exercise[]) => {
    try {
      const cacheData: CachedData<Exercise[]> = {
        data: exercises,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setCachedExercises(exercises);
      setIsCacheValid(true);
    } catch (error) {
      console.error('Error saving exercise cache:', error);
    }
  }, []);

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
      setCachedExercises(null);
      setIsCacheValid(false);
    } catch (error) {
      console.error('Error clearing exercise cache:', error);
    }
  }, []);

  return {
    cachedExercises,
    isCacheValid,
    saveToCache,
    clearCache,
  };
}
