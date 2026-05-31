// sw.js
const CACHE_NAME = 'mukapps-v6';
const OFFLINE_URL = '/offline.html';

// ✅ Liste des assets statiques à mettre en cache immédiatement
const STATIC_ASSETS = [
  '/',
  '/index.html',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/LOGO_Mukapps.png',
  '/LOGO_Mukapps2.png',
];

// ✅ Liste des origines externes à IGNORER complètement
const EXTERNAL_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'googletagmanager.com',
  'google-analytics.com',
  'google.com',
];

// ✅ Installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version:', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Caching static assets');
      
      // Tenter de mettre en cache chaque asset individuellement
      for (const asset of STATIC_ASSETS) {
        try {
          const response = await fetch(asset);
          if (response && response.status === 200) {
            await cache.put(asset, response);
            console.log('[SW] Cached:', asset);
          }
        } catch (error) {
          console.warn('[SW] Failed to cache:', asset, error);
        }
      }
      
      console.log('[SW] Static assets caching complete');
    }).catch((error) => {
      console.error('[SW] Failed to cache static assets:', error);
    })
  );
  
  // Force l'activation de la nouvelle version
  self.skipWaiting();
});

// ✅ Activation - Nettoie l'ancien cache
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new version:', CACHE_NAME);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Taking control of all clients');
      return self.clients.claim();
    })
  );
});

// ✅ Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ✅ 1. IGNORER toutes les requêtes externes
  if (EXTERNAL_ORIGINS.some(origin => url.hostname.includes(origin))) {
    return;
  }

  // ✅ 2. Ignorer les méthodes non-GET
  if (request.method !== 'GET') return;

  // ✅ 3. API : pas de cache, juste réseau
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: 'Hors ligne' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // ✅ 4. Pour la navigation (pages) - OFFLINE FALLBACK
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        console.log('[SW] Offline - serving offline page');
        const cachedOffline = await caches.match(OFFLINE_URL);
        if (cachedOffline) {
          return cachedOffline;
        }
        return new Response('Page non disponible hors ligne', { 
          status: 503,
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }

  // ✅ 5. Ressources statiques : cache d'abord, puis réseau
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Mise à jour en arrière-plan
          fetch(request).then((response) => {
            if (response && response.status === 200 && response.type !== 'opaque') {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
            }
          }).catch(() => {});
          return cached;
        }
        
        return fetch(request).then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        }).catch(() => {
          // Fallback pour les images manquantes
          if (request.destination === 'image') {
            return caches.match('/LOGO_Mukapps.png');
          }
          return new Response('Resource not found', { status: 404 });
        });
      })
    );
    return;
  }

  // ✅ 6. Autres requêtes : réseau d'abord
  event.respondWith(
    fetch(request).catch(() => {
      return new Response('Network error', { status: 503 });
    })
  );
});

// ✅ Gestion des messages pour le skipWaiting
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting received');
    self.skipWaiting();
  }
});

// ✅ Notification de mise à jour
self.addEventListener('controllerchange', () => {
  console.log('[SW] Controller changed, new version active');
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_UPDATED' });
    });
  });
});