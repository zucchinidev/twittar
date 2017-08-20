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