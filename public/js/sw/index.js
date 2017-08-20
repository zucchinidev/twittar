const twittarCacheName = 'twittar-static-v10'
self.addEventListener('install', function (event) {
  const urlsToCache = [
    '/skeleton',
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
  const requestUrl = new URL(event.request.url)

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match('/skeleton'))
      return
    }
  }
  // Event or respondWith takes a response object or a promise that resolves with a response.
  // this tells the browser that we're going to handle this request ourselves
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request)
    })
  )
})

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting()
  }
})