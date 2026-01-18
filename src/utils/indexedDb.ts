/**
 * IndexedDB utilities for offline caching
 * Provides persistent storage for application data
 */

const DB_NAME = 'app-db';
const DB_VERSION = 1;

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
    const stores = ['clients', 'interactions', 'stats'];
    
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
