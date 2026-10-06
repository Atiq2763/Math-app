/* ================================================================
   Merit — Test Prep · Service Worker
   Network-first: when online the app always loads the newest files;
   when offline it falls back to the cached copy.

   Bump CACHE_NAME whenever you change any cached file.
   ================================================================ */
const CACHE_NAME = 'merit-cache-v19';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache:'reload' skips the browser's HTTP cache so we store the freshest files
      Promise.all(APP_SHELL.map((url) =>
        fetch(new Request(url, { cache: 'reload' })).then((res) => { if (res.ok) return cache.put(url, res); })
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});