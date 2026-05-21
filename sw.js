const CACHE_NAME = 'breezing-studio-manager-v5';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './js/app.js',
  './js/ui.js',
  './js/state.js',
  './js/config.js',
  './js/schema.js',
  './js/storage.js',
  './js/team.js',
  './js/exporter.js',
  './js/canvas-renderer.js',
  './js/preview.js',
  './js/utils.js',
  './assets/breezing-logo-web.png',
  './assets/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  event.respondWith(
    fetch(event.request).then((response) => {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
      return response;
    }).catch(() => caches.match(event.request).then((cachedResponse) => cachedResponse || caches.match('./index.html')))
  );
});