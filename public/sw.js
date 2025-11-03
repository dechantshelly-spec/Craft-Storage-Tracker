// --- Bump this on every release ---
const SW_VERSION = 'v4';
const STATIC_CACHE = `static-${SW_VERSION}`;

// Minimal core files; let Vite handle hashed assets
const CORE_FILES = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_FILES))
  );
});

self.addEventListener('activate', (event) => {
  clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => (k.startsWith('static-') && k !== STATIC_CACHE) ? caches.delete(k) : null)
      )
    )
  );
});

// Network-first for HTML avoids white screens after deploys.
// Cache-first for everything else (with network fallback).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const acceptsHTML = req.headers.get('accept')?.includes('text/html');

  if (acceptsHTML) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(STATIC_CACHE).then((c) => c.put('/index.html', copy));
          return resp;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(() => cached) // last resort
    )
  );
});
