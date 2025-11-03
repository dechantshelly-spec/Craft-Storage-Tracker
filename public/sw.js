// --- Version bump this on every release ---
const SW_VERSION = 'v3';
const STATIC_CACHE = `static-${SW_VERSION}`;

// Minimal list: let Vite handle hashed assets; we only cache index as fallback.
const CORE_FILES = [
  '/',            // redirect to index via Netlify SPA rule
  '/index.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(CORE_FILES))
  );
});

self.addEventListener('activate', (event) => {
  clients.claim();
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k.startsWith('static-') && k !== STATIC_CACHE) ? caches.delete(k) : Promise.resolve()))
    )
  );
});

// Network-first for HTML to avoid white screens after deploys.
// Cache-first for other requests as a mild perf boost.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isHTML = req.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(STATIC_CACHE).then(c => c.put('/index.html', copy));
        return resp;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(STATIC_CACHE).then(c => c.put(req, copy));
        return resp;
      }).catch(() => cached) // last-resort fallback
    )
  );
});
