/**
 * Service Worker for Offline Caching
 * Implements stale-while-revalidate caching strategy
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;
const API_CACHE_NAME = `app-api-cache-${CACHE_VERSION}`;
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const API_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for API responses

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all([
        // Delete old caches
        ...cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name)),
        // Clean up expired entries in current caches
        Promise.all([
          caches.open(CACHE_NAME).then(cleanExpiredEntries),
          caches.open(API_CACHE_NAME).then(cleanExpiredEntries),
        ]),
      ]);
    })
  );
  return self.clients.claim(); // Take control immediately
});

// Clean up expired cache entries
async function cleanExpiredEntries(cache) {
  const requests = await cache.keys();
  const now = Date.now();
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const cacheDate = response.headers.get('sw-cache-date');
      if (cacheDate) {
        const age = now - parseInt(cacheDate, 10);
        if (age > MAX_CACHE_AGE) {
          await cache.delete(request);
        }
      }
    }
  }
}

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - stale-while-revalidate strategy
  if (url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/functions/v1/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Check if cached response is still valid
          let cachedAge = Infinity;
          if (cachedResponse) {
            const cacheDate = cachedResponse.headers.get('sw-cache-date');
            if (cacheDate) {
              cachedAge = Date.now() - parseInt(cacheDate, 10);
            }
          }

          // Fetch fresh data in background
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              // Update cache with fresh response (only for GET requests)
              if (networkResponse.ok && request.method === 'GET') {
                const responseClone = networkResponse.clone();
                // Add cache timestamp header
                const headers = new Headers(responseClone.headers);
                headers.set('sw-cache-date', Date.now().toString());
                const cachedResponse = new Response(responseClone.body, {
                  status: responseClone.status,
                  statusText: responseClone.statusText,
                  headers: headers,
                });
                cache.put(request, cachedResponse);
              }
              return networkResponse;
            })
            .catch(() => {
              // Network failed, return cached if available and not too old
              if (cachedResponse && cachedAge < API_CACHE_TTL * 2) {
                return cachedResponse;
              }
              return new Response('Offline', { status: 503 });
            });

          // Return cached response immediately if available and fresh, otherwise wait for network
          if (cachedResponse && cachedAge < API_CACHE_TTL) {
            // Return stale cache immediately, update in background
            fetchPromise.catch(() => {}); // Don't wait for background update
            return cachedResponse;
          }

          // Wait for network if cache is stale or missing
          return fetchPromise;
        });
      })
    );
    return;
  }

  // Static assets - cache first strategy
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request).then((response) => {
          // Cache successful responses
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            // Add cache timestamp header
            const headers = new Headers(responseClone.headers);
            headers.set('sw-cache-date', Date.now().toString());
            const cachedResponse = new Response(responseClone.body, {
              status: responseClone.status,
              statusText: responseClone.statusText,
              headers: headers,
            });
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cachedResponse);
            });
          }
          return response;
        });
      })
    );
    return;
  }
});
