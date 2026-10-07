/* ================================================================
   Merit — Test Prep · Service Worker
   Network-first: when online the app always loads the newest files;
   when offline (or the network is very slow) it uses the cached copy.

   Bump CACHE_NAME whenever you change any file in APP_SHELL, so
   phones pick up the new service worker straight away.
   ================================================================ */
const CACHE_NAME = 'merit-cache-v20';
const FONT_CACHE = 'merit-fonts-v1';           // Google Fonts, kept so the app looks right offline
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
];
const NETWORK_TIMEOUT_MS = 8000;               // slow connection -> fall back to cached copy
const INDEX_URL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache:'reload' skips the browser's HTTP cache so we store the freshest files.
      // One missing file must never block the install, so each fetch is guarded.
      Promise.all(APP_SHELL.map((url) =>
        fetch(new Request(url, { cache: 'reload' }))
          .then((res) => { if (res && res.ok) return cache.put(url, res); })
          .catch(() => {})
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME && n !== FONT_CACHE).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// One cache key per page: ignore ?query strings, and treat "/" as index.html
function cacheKey(request) {
  const url = new URL(request.url);
  if (request.mode === 'navigate' || url.pathname.endsWith('/')) return INDEX_URL;
  return url.origin + url.pathname;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const key = cacheKey(request);
  const cached = await cache.match(key);
  try {
    const net = fetch(request, { cache: 'no-cache' });
    const response = cached
      ? await Promise.race([net, new Promise((_, reject) => setTimeout(reject, NETWORK_TIMEOUT_MS))])
      : await net;
    if (response && response.status === 200 && response.type === 'basic') {
      cache.put(key, response.clone());
    }
    return response;
  } catch (err) {
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await cache.match(INDEX_URL);
      if (shell) return shell;
    }
    return Response.error();
  }
}

// Fonts: serve from cache if we have them, refresh in the background
async function fontsCacheFirst(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone()); return res; })
    .catch(() => null);
  return cached || (await refresh) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(fontsCacheFirst(request));
  }
  // anything else: let the browser handle it normally
});
