self.addEventListener('fetch', (event) => {
  if (event.request.url.endsWith('.jpg')) {
    // this tells the browser that we're going to handle this request ourselves
    // Event or respondWith takes a response object or a promise that resolves with a response.
    event.respondWith(
      fetch('/imgs/dr-evil.gif')
    )
  }
})