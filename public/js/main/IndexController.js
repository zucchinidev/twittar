import PostsView from './views/Posts'
import ToastsView from './views/Toasts'
import idb from 'idb'

export default function IndexController (container) {
  this._container = container
  this._postsView = new PostsView(this._container)
  this._toastsView = new ToastsView(this._container)
  this._lostConnectionToast = null
  this._registerServiceWorker()
  this._openSocket()
}

IndexController.prototype._registerServiceWorker = function () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('Service worker registration succeeded:', registration);
    }).catch(function(error) {
      console.log('Service worker registration failed:', error);
    })
  }
}

// open a connection to the server for live updates
IndexController.prototype._openSocket = function () {
  const indexController = this
  const latestPostDate = this._postsView.getLatestPostDate()

  // create a url pointing to /updates with the ws protocol
  const socketUrl = new URL('/updates', window.location)
  socketUrl.protocol = 'ws'

  if (latestPostDate) {
    socketUrl.search = 'since=' + latestPostDate.valueOf()
  }

  // this is a little hack for the settings page's tests,
  // it isn't needed for Twittar
  socketUrl.search += '&' + location.search.slice(1)

  const ws = new WebSocket(socketUrl.href)

  // add listeners
  ws.addEventListener('open', function () {
    if (indexController._lostConnectionToast) {
      indexController._lostConnectionToast.hide()
    }
  })

  ws.addEventListener('message', function (event) {
    requestAnimationFrame(function () {
      indexController._onSocketMessage(event.data)
    })
  })

  ws.addEventListener('close', function () {
    // tell the user
    if (!indexController._lostConnectionToast) {
      indexController._lostConnectionToast = indexController._toastsView.show('Unable to connect. Retrying…')
    }

    // try and reconnect in 5 seconds
    setTimeout(function () {
      indexController._openSocket()
    }, 5000)
  })
}

// called when the web socket sends message data
IndexController.prototype._onSocketMessage = function (data) {
  const messages = JSON.parse(data)
  this._postsView.addPosts(messages)
}