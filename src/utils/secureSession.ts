/**
 * Secure session management utilities
 * Provides safer storage for sensitive session data
 */

const SESSION_EXPIRY_KEY_SUFFIX = '_expiry';
const DEFAULT_EXPIRY_HOURS = 24;

interface SecureSessionOptions {
  useSessionStorage?: boolean;
  expiryHours?: number;
}

function getStorage(useSessionStorage: boolean): Storage {
  return useSessionStorage ? sessionStorage : localStorage;
}

function getExpiryTime(hours: number): number {
  return Date.now() + hours * 60 * 60 * 1000;
}

function isExpired(expiryTime: number | null): boolean {
  if (!expiryTime) return true;
  return Date.now() > expiryTime;
}

export function setSecureSession<T>(
  key: string,
  value: T,
  options: SecureSessionOptions = {}
): boolean {
  const { useSessionStorage = false, expiryHours = DEFAULT_EXPIRY_HOURS } = options;

  try {
    const storage = getStorage(useSessionStorage);
    const expiryTime = getExpiryTime(expiryHours);

    storage.setItem(key, JSON.stringify(value));
    storage.setItem(key + SESSION_EXPIRY_KEY_SUFFIX, String(expiryTime));

    return true;
  } catch (error) {
    return false;
  }
}

export function getSecureSession<T>(
  key: string,
  defaultValue: T,
  options: SecureSessionOptions = {}
): T {
  const { useSessionStorage = false } = options;

  try {
    const storage = getStorage(useSessionStorage);

    const expiryTimeStr = storage.getItem(key + SESSION_EXPIRY_KEY_SUFFIX);
    const expiryTime = expiryTimeStr ? parseInt(expiryTimeStr, 10) : null;

    if (isExpired(expiryTime)) {
      removeSecureSession(key, options);
      return defaultValue;
    }

    const item = storage.getItem(key);
    if (item === null) {
      return defaultValue;
    }

    return JSON.parse(item) as T;
  } catch (error) {
    return defaultValue;
  }
}

export function removeSecureSession(
  key: string,
  options: SecureSessionOptions = {}
): boolean {
  const { useSessionStorage = false } = options;

  try {
    const storage = getStorage(useSessionStorage);
    storage.removeItem(key);
    storage.removeItem(key + SESSION_EXPIRY_KEY_SUFFIX);
    return true;
  } catch (error) {
    return false;
  }
}

export function refreshSessionExpiry(
  key: string,
  options: SecureSessionOptions = {}
): boolean {
  const { useSessionStorage = false, expiryHours = DEFAULT_EXPIRY_HOURS } = options;

  try {
    const storage = getStorage(useSessionStorage);
    const item = storage.getItem(key);

    if (!item) return false;

    const expiryTime = getExpiryTime(expiryHours);
    storage.setItem(key + SESSION_EXPIRY_KEY_SUFFIX, String(expiryTime));

    return true;
  } catch (error) {
    return false;
  }
}

export function isSessionValid(
  key: string,
  options: SecureSessionOptions = {}
): boolean {
  const { useSessionStorage = false } = options;

  try {
    const storage = getStorage(useSessionStorage);

    const item = storage.getItem(key);
    if (!item) return false;

    const expiryTimeStr = storage.getItem(key + SESSION_EXPIRY_KEY_SUFFIX);
    if (!expiryTimeStr) return false;

    const expiryTime = parseInt(expiryTimeStr, 10);
    return !isExpired(expiryTime);
  } catch (error) {
    return false;
  }
}

export function clearAllSecureSessions(): void {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.endsWith(SESSION_EXPIRY_KEY_SUFFIX)) {
        keysToRemove.push(key.replace(SESSION_EXPIRY_KEY_SUFFIX, ''));
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      localStorage.removeItem(key + SESSION_EXPIRY_KEY_SUFFIX);
    });

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.endsWith(SESSION_EXPIRY_KEY_SUFFIX)) {
        keysToRemove.push(key.replace(SESSION_EXPIRY_KEY_SUFFIX, ''));
      }
    }

    keysToRemove.forEach((key) => {
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(key + SESSION_EXPIRY_KEY_SUFFIX);
    });
  } catch (error) {
    // Silent fail
  }
}
