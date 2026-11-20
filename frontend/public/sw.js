const STATIC_CACHE = 'bizcard-static-v2';

const urlsToCache = ['/manifest.json', '/favicon.ico', '/logo192.png', '/logo512.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            .then((cache) => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE) {
                            return caches.delete(cacheName);
                        }
                        return undefined;
                    }),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Never cache non-GET requests, API calls, auth endpoints, or private uploaded card images
    if (
        event.request.method !== 'GET' ||
        !url.startsWith('http') ||
        url.includes('/api/') ||
        url.includes('/auth/') ||
        url.includes('/uploads/') ||
        url.includes('/contact-profile/') ||
        url.includes('?t=') ||
        url.includes('?v=')
    ) {
        return;
    }

    // Network-first for HTML navigation so deploys never serve stale index.html chunk references
    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Stale-While-Revalidate for static assets only
                fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, networkResponse));
                        }
                    })
                    .catch(() => {});
                return cachedResponse;
            }

            return fetch(event.request)
                .then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, responseToCache));
                    return networkResponse;
                })
                .catch((error) => {
                    console.warn('[SW] Fetch failed for:', url, error.message);
                    throw error;
                });
        }),
    );
});
