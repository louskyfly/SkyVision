const CACHE_NAME = 'skyvision-v6';
const BASE = self.location.pathname.replace(/\/[^/]*$/, '/');
const PRECACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'css/style.css',
  BASE + 'js/app.js',
  BASE + 'data/config.json',
  BASE + 'data/sorties.json',
  BASE + 'data/gallery.json',
  BASE + 'data/drone.json',
  BASE + 'data/future-sorties.json',
  BASE + 'data/meteo.json',
  BASE + 'data/flight-zones.json',
  BASE + 'data/interesting-locations.json',
  BASE + 'data/weather-alerts.json',
  BASE + 'manifest.json',
  BASE + 'service-worker.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(res => {
        if (res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(BASE + 'index.html'));
    })
  );
});