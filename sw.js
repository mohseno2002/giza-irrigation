const CACHE_NAME = 'giza-irrigation-v1';
const URLS_TO_CACHE = [
  '/-/',
  '/-/index.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
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
  // للـ API calls — مش نعملهم cache
  if (e.request.url.includes('api.anthropic.com') ||
      e.request.url.includes('googleapis.com') ||
      e.request.url.includes('telegram.org')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
