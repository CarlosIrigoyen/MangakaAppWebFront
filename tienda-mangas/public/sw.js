self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then(response => {
          // Solo cacheamos respuestas válidas
          if (
            !response ||
            response.status !== 200 ||
            response.type === 'opaque'
          ) {
            return response;
          }

          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          // 🧠 Fallback offline inteligente
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }

          // Si no hay nada en cache, dejamos fallar
          return new Response('', { status: 503 });
        });
    })
  );
});
