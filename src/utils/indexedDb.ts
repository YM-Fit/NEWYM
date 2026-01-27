/**
 * IndexedDB utilities for offline caching
 * Provides persistent storage for application data
 * 
 * IMPORTANT: This is a READ-ONLY cache. All writes go directly to Supabase.
 * IndexedDB is used only for caching query results to improve performance.
 */

const DB_NAME = 'app-db';
const DB_VERSION = 2; // Increment for schema changes
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default cache TTL

interface DBSchema {
  stats: {
    key: string; // trainerId:type
    value: any; // Stats data
  };
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!database.objectStoreNames.contains('clients')) {
        database.createObjectStore('clients');
      }

      if (!database.objectStoreNames.contains('interactions')) {
        database.createObjectStore('interactions');
      }

      if (!database.objectStoreNames.contains('stats')) {
        database.createObjectStore('stats');
      }

      // Create cache store for API responses (READ operations only)
      if (!database.objectStoreNames.contains('apiCache')) {
        const cacheStore = database.createObjectStore('apiCache', { keyPath: 'key' });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Get database instance
 */
async function getDB(): Promise<IDBDatabase> {
  if (!db) {
    db = await initIndexedDB();
  }
  return db;
}

/**
 * Store clients in IndexedDB
 */
export async function storeClients(trainerId: string, clients: any[]): Promise<void> {
  try {
    const database = await getDB();
    const transaction = database.transaction(['clients'], 'readwrite');
    const store = transaction.objectStore('clients');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(clients, trainerId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error storing clients:', error);
  }
}

/**
 * Get clients from IndexedDB
 */
export async function getClients(trainerId: string): Promise<any[] | null> {
  try {
    const database = await getDB();
    const transaction = database.transaction(['clients'], 'readonly');
    const store = transaction.objectStore('clients');
    
    return new Promise((resolve, reject) => {
      const request = store.get(trainerId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting clients:', error);
    return null;
  }
}

/**
 * Store interactions in IndexedDB
 */
export async function storeInteractions(traineeId: string, interactions: any[]): Promise<void> {
  try {
    const database = await getDB();
    const transaction = database.transaction(['interactions'], 'readwrite');
    const store = transaction.objectStore('interactions');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(interactions, traineeId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error storing interactions:', error);
  }
}

/**
 * Get interactions from IndexedDB
 */
export async function getInteractions(traineeId: string): Promise<any[] | null> {
  try {
    const database = await getDB();
    const transaction = database.transaction(['interactions'], 'readonly');
    const store = transaction.objectStore('interactions');
    
    return new Promise((resolve, reject) => {
      const request = store.get(traineeId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting interactions:', error);
    return null;
  }
}

/**
 * Store stats in IndexedDB
 */
export async function storeStats(trainerId: string, type: string, stats: any): Promise<void> {
  try {
    const database = await getDB();
    const transaction = database.transaction(['stats'], 'readwrite');
    const store = transaction.objectStore('stats');
    const key = `${trainerId}:${type}`;
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(stats, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error storing stats:', error);
  }
}

/**
 * Get stats from IndexedDB
 */
export async function getStats(trainerId: string, type: string): Promise<any | null> {
  try {
    const database = await getDB();
    const transaction = database.transaction(['stats'], 'readonly');
    const store = transaction.objectStore('stats');
    const key = `${trainerId}:${type}`;
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting stats:', error);
    return null;
  }
}

/**
 * Clear all data from IndexedDB
 */
export async function clearIndexedDB(): Promise<void> {
  try {
    const database = await getDB();
    const stores = ['clients', 'interactions', 'stats', 'apiCache'];
    
    await Promise.all(
      stores.map((storeName) => {
        return new Promise<void>((resolve, reject) => {
          const transaction = database.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      })
    );
  } catch (error) {
    console.error('[IndexedDB] Error clearing database:', error);
  }
}

/**
 * Get cached API response from IndexedDB (READ operations only)
 */
export async function getCachedResponse<T>(key: string, ttl: number = CACHE_TTL): Promise<T | null> {
  if (!db) {
    await initIndexedDB();
  }

  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(['apiCache'], 'readonly');
    const store = transaction.objectStore('apiCache');
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      if (!result) {
        resolve(null);
        return;
      }

      // Check if cache is still valid
      const age = Date.now() - result.timestamp;
      if (age > ttl) {
        // Cache expired, delete it
        const deleteTransaction = db!.transaction(['apiCache'], 'readwrite');
        const deleteStore = deleteTransaction.objectStore('apiCache');
        deleteStore.delete(key);
        resolve(null);
        return;
      }

      resolve(result.data);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Cache API response in IndexedDB (READ operations only)
 */
export async function cacheResponse<T>(key: string, data: T): Promise<void> {
  if (!db) {
    await initIndexedDB();
  }

  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(['apiCache'], 'readwrite');
    const store = transaction.objectStore('apiCache');
    const request = store.put({
      key,
      data,
      timestamp: Date.now(),
    });

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Invalidate cache entry by key
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!db) {
    await initIndexedDB();
  }

  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(['apiCache'], 'readwrite');
    const store = transaction.objectStore('apiCache');
    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  if (!db) {
    await initIndexedDB();
  }

  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(['apiCache'], 'readwrite');
    const store = transaction.objectStore('apiCache');
    const index = store.index('timestamp');
    const request = index.openCursor();
    let deletedCount = 0;
    const now = Date.now();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const entry = cursor.value;
        const age = now - entry.timestamp;
        if (age > CACHE_TTL * 2) { // Delete entries older than 2x TTL
          cursor.delete();
          deletedCount++;
        }
        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}
