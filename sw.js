self.addEventListener('install', function(event) {
  console.log('Service worker installed');
});

self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});