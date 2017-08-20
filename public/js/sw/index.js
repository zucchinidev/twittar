self.addEventListener('install', function (event) {
  const cacheName = 'twittar-static-v1'
  const urlsToCache = [
    '/',
    '/js/main.js',
    'css/main.css',
    'imgs/icon.png',
    'https://fonts.gstatic.com/s/roboto/v15/2UX7WLTfW3W8TclTUvlFyQ.woff',
    'https://fonts.gstatic.com/s/roboto/v15/d-6IYplOFocCacKzxwXSOD8E0i7KZn-EPnyo3HZu7kw.woff'
  ]
  // twittar-static-v1
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  // Event or respondWith takes a response object or a promise that resolves with a response.
  // this tells the browser that we're going to handle this request ourselves
  event.respondWith(
    fetch(event.request).then(function (response) {
      if (response.status === 404) {
        return fetch('/imgs/dr-evil.gif')
      }
      return response
    }).catch(function () {
      return new Response('Uh oh, that totally failed!!')
    })
  )
})