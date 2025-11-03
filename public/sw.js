const CACHE = 'craft-storage-v1';
const ASSETS = [
  '/', '/index.html', '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k!==CACHE && caches.delete(k)))));
  self.clients.claim();
});

// Cache-first for same-origin requests
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (new URL(req.url).origin === self.location.origin) {
    e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
  }
});
