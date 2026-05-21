const CACHE_NAME = 'breezing-studio-manager-v12';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js?v=20260522-autosave-settings',
  './js/app.js?v=20260522-autosave-settings',
  './js/ui.js?v=20260522-autosave-settings',
  './js/state.js?v=20260522-autosave-settings',
  './js/config.js?v=20260522-autosave-settings',
  './js/settings.js?v=20260522-autosave-settings',
  './js/schema.js?v=20260522-autosave-settings',
  './js/storage.js?v=20260522-autosave-settings',
  './js/team.js?v=20260522-autosave-settings',
  './js/exporter.js?v=20260522-autosave-settings',
  './js/canvas-renderer.js?v=20260522-autosave-settings',
  './js/preview.js?v=20260522-autosave-settings',
  './js/utils.js?v=20260522-autosave-settings',
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