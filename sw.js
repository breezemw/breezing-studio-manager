const CACHE_NAME = 'breezing-studio-manager-v6';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js?v=40acf6c',
  './js/app.js?v=40acf6c',
  './js/ui.js?v=40acf6c',
  './js/state.js?v=40acf6c',
  './js/config.js?v=40acf6c',
  './js/schema.js?v=40acf6c',
  './js/storage.js?v=40acf6c',
  './js/team.js?v=40acf6c',
  './js/exporter.js?v=40acf6c',
  './js/canvas-renderer.js?v=40acf6c',
  './js/preview.js?v=40acf6c',
  './js/utils.js?v=40acf6c',
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