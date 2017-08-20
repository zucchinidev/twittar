const twittarCacheName = 'twittar-static-v2'
self.addEventListener('install', function (event) {
  const urlsToCache = [
    '/',
    '/js/main.js',
    'css/main.css',
    'imgs/icon.png'
  ]
  // twittar-static-v1
  event.waitUntil(
    caches.open(twittarCacheName).then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(keyList => {
      keyList
        .filter((cacheName) => cacheName.startsWith('twittar-') && cacheName !== twittarCacheName)
        .map((cacheName) => caches.delete(cacheName))
    })
  )
})

self.addEventListener('fetch', (event) => {
  // Event or respondWith takes a response object or a promise that resolves with a response.
  // this tells the browser that we're going to handle this request ourselves
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request)
    })
  )
})