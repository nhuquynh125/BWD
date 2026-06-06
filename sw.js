const CACHE_NAME = 'lunar-heritage-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/modern-heritage.css',
  '/style.css',
  '/api.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/style-zen.css',
  '/dashboard.html',
  '/explore.html',
  '/passport.html',
  '/messages.html',
  '/profile.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  // Don't cache API requests
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(response => {
          // Cache successful responses for future use
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache));
          return response;
        }).catch(() => {
          // Fallback logic for offline-first experience
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
