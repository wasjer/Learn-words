const CACHE_NAME = 'beidan-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── Install: cache app shell ──────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch strategy ────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // words/ → Network First: always try network, fall back to cache
  // This ensures manual update fetches always bypass the SW cache
  if (url.includes('/words/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Don't cache responses that came with cache-busting params;
          // the main app handles caching via localStorage
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell → Cache First: serve instantly, update in background
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => null);

      return cached || networkFetch;
    })
  );
});
