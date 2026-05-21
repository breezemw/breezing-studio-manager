const CACHE_NAME = 'breezing-studio-manager-v11';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js?v=20260522-reference3',
  './js/app.js?v=20260522-reference3',
  './js/ui.js?v=20260522-reference3',
  './js/state.js?v=20260522-reference3',
  './js/config.js?v=20260522-reference3',
  './js/schema.js?v=20260522-reference3',
  './js/storage.js?v=20260522-reference3',
  './js/team.js?v=20260522-reference3',
  './js/exporter.js?v=20260522-reference3',
  './js/canvas-renderer.js?v=20260522-reference3',
  './js/preview.js?v=20260522-reference3',
  './js/utils.js?v=20260522-reference3',
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