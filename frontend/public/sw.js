const CACHE_NAME = 'bizcard-crm-v2'; // Bumped version
const STATIC_CACHE = 'bizcard-static-v1';
const DATA_CACHE = 'bizcard-data-v1';

const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico',
    '/logo192.png',
    '/logo512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (![STATIC_CACHE, DATA_CACHE].includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Skip non-GET requests, non-http/https schemes, and API calls
    if (
        event.request.method !== 'GET' ||
        !event.request.url.startsWith('http') ||
        event.request.url.includes('/api/')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                // Return cached response but refresh in background (Stale-While-Revalidate)
                fetch(event.request).then(networkResponse => {
                    if (networkResponse.ok) {
                        caches.open(STATIC_CACHE).then(cache => cache.put(event.request, networkResponse));
                    }
                }).catch(() => { }); // Ignore network errors during background refresh
                return cachedResponse;
            }

            // Exclude Vite dev server HMR and dynamic modules from secondary cache
            if (event.request.url.includes('?t=') || event.request.url.includes('?v=')) {
                return fetch(event.request);
            }

            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(STATIC_CACHE).then(cache => cache.put(event.request, responseToCache));
                return networkResponse;
            }).catch(error => {
                // Return default response or just let it fail naturally without "Uncaught" error
                console.warn('[SW] Fetch failed for:', event.request.url, error.message);
                throw error; // Re-throw so the browser handles it (e.g. shows offline page)
            });
        })
    );
});
