/* Mfit · service worker: funciona sin conexión (cache de la app). Sube VERSION al publicar cambios. */
const VERSION = 'mfit-v0.2.0';
const FILES = ['./', 'index.html', 'css/styles.css', 'js/data.js', 'js/foods.js', 'js/db.js', 'js/calc.js', 'js/store.js', 'js/charts.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Red primero (para ver los cambios al momento), cache si no hay conexión
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
