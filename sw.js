/* ================================================================
   Merit — Test Prep · Service Worker
   Cache-first for the app shell (HTML/manifest/icon), so the app
   opens instantly and works offline after the first visit.

   IMPORTANT: bump CACHE_NAME any time you change index.html (or any
   other cached file) so returning users get the new version instead
   of a stale cached copy. Old caches are cleaned up automatically.
   ================================================================ */
const CACHE_NAME = 'merit-cache-v4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});