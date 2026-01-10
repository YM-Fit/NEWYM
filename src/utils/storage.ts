/**
 * Safe localStorage utilities with error handling
 */

export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Error reading from localStorage key "${key}":`, error);
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Error writing to localStorage key "${key}":`, error);
    return false;
  }
}

export function removeFromStorage(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Error removing from localStorage key "${key}":`, error);
    return false;
  }
}

export function clearStorage(): boolean {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.warn('Error clearing localStorage:', error);
    return false;
  }
}

/**
 * Storage keys used in the app
 */
export const STORAGE_KEYS = {
  THEME: 'ym-coach-theme',
  SIDEBAR_MINIMIZED: 'sidebarMinimized',
  TRAINEE_SESSION: 'trainee_session',
  WORKOUT_DRAFT: (traineeId: string) => `workout_draft_${traineeId}`,
  CALCULATOR_HISTORY: 'calculator_history',
} as const;

/**
 * Session storage utilities (cleared when browser closes)
 */
export function getFromSession<T>(key: string, defaultValue: T): T {
  try {
    const item = sessionStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Error reading from sessionStorage key "${key}":`, error);
    return defaultValue;
  }
}

export function setToSession<T>(key: string, value: T): boolean {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Error writing to sessionStorage key "${key}":`, error);
    return false;
  }
}
