// SecurityFran - Service Worker
// v2: la página HTML se comprueba SIEMPRE por red primero (para que las actualizaciones
// se vean al momento); solo las librerías externas pesadas (IA, QR) se cachean fijas,
// porque esas no cambian y así funciona 100% offline tras la primera carga.

const CACHE_NAME = 'securifran-cache-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  const isSameOriginDoc = url.origin === location.origin;

  if (isSameOriginDoc) {
    // HTML/JS propios: red primero, caché solo como respaldo si no hay Internet
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return resp;
      }).catch(() =>
        caches.match(req).then(cached => cached || new Response('Sin conexión y sin caché de esta página todavía.', {status: 503}))
      )
    );
  } else {
    // Librerías externas (CDN): caché primero, así funcionan sin Internet
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return resp;
        }).catch(() => cached || new Response('Offline y no cacheado aún', {status: 503}));
      })
    );
  }
});
