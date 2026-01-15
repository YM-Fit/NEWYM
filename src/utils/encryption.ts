/**
 * Encryption Utilities - Production Ready
 * פונקציות הצפנה לנתונים רגישים (tokens, credentials)
 * 
 * Uses Web Crypto API for AES-256-GCM encryption (production-ready)
 */

/**
 * Derive encryption key from password using PBKDF2
 * @param password - Password to derive key from
 * @param salt - Salt for key derivation
 * @returns CryptoKey for encryption
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate random salt
 * @returns Random salt as Uint8Array
 */
function generateSalt(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Encrypt data using AES-256-GCM (Production Ready)
 * 
 * @param data - Data to encrypt
 * @param password - Encryption password/key
 * @returns Encrypted data as base64 string (format: salt:iv:encrypted)
 * 
 * @example
 * ```typescript
 * const encrypted = await encrypt('sensitive data', 'my-secret-key');
 * // Returns: "salt:iv:encrypted_data" (base64 encoded)
 * ```
 */
export async function encrypt(data: string, password: string): Promise<string> {
  if (!data || !password) {
    throw new Error('Data and password are required for encryption');
  }

  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available');
  }

  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate salt and IV
    const salt = generateSalt();
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    
    // Derive key from password
    const key = await deriveKey(password, salt);
    
    // Encrypt data
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128, // 128-bit authentication tag
      },
      key,
      dataBuffer
    );

    // Combine salt, IV, and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt data using AES-256-GCM (Production Ready)
 * 
 * @param encryptedData - Encrypted data as base64 string (format: salt:iv:encrypted)
 * @param password - Decryption password/key
 * @returns Decrypted string
 * 
 * @example
 * ```typescript
 * const decrypted = await decrypt(encrypted, 'my-secret-key');
 * // Returns: "sensitive data"
 * ```
 */
export async function decrypt(encryptedData: string, password: string): Promise<string> {
  if (!encryptedData || !password) {
    throw new Error('Encrypted data and password are required for decryption');
  }

  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available');
  }

  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);
    
    // Derive key from password
    const key = await deriveKey(password, salt);
    
    // Decrypt data
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      encrypted
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Invalid key or corrupted data'}`);
  }
}

/**
 * Hash a string (for storing passwords, etc.)
 * In production, use proper hashing like bcrypt or Argon2
 * 
 * @param data - Data to hash
 * @returns Hashed string
 */
export async function hash(data: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Use Web Crypto API if available
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple hash (NOT SECURE!)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Generate a random encryption key
 * @param length - Key length in bytes (default: 32)
 * @returns Random key string
 */
export function generateKey(length: number = 32): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Fallback (less secure)
  let key = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Secure token storage (encrypted)
 * In production, consider using secure storage solutions
 */
export class SecureTokenStorage {
  private static readonly STORAGE_KEY = 'encrypted_tokens';
  private static encryptionKey: string | null = null;

  /**
   * Set encryption key (should be stored securely, e.g., in environment variable)
   */
  static setEncryptionKey(key: string): void {
    this.encryptionKey = key;
  }

  /**
   * Store encrypted token
   */
  static setToken(key: string, token: string): void {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    try {
      const encrypted = encrypt(token, this.encryptionKey);
      const storage = this.getStorage();
      const tokens = this.getTokens();
      tokens[key] = encrypted;
      storage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to store token:', error);
      throw error;
    }
  }

  /**
   * Get decrypted token
   */
  static getToken(key: string): string | null {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    try {
      const tokens = this.getTokens();
      const encrypted = tokens[key];
      if (!encrypted) {
        return null;
      }
      return decrypt(encrypted, this.encryptionKey!);
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  /**
   * Remove token
   */
  static removeToken(key: string): void {
    const storage = this.getStorage();
    const tokens = this.getTokens();
    delete tokens[key];
    storage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
  }

  /**
   * Clear all tokens
   */
  static clear(): void {
    const storage = this.getStorage();
    storage.removeItem(this.STORAGE_KEY);
  }

  private static getStorage(): Storage {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('LocalStorage is not available');
    }
    return window.localStorage;
  }

  private static getTokens(): Record<string, string> {
    const storage = this.getStorage();
    const stored = storage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }
}
