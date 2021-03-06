import express from 'express'
import zlib from 'zlib'
import fs from 'fs'
import os from 'os'
import compression from 'compression'
import { Server as WebSocketServer } from 'ws'
import http from 'http'
import url from 'url'
import net from 'net'
import Throttle from 'throttle'
import random from 'lodash/number/random'
import indexTemplate from './templates/index'
import postsTemplate from './templates/posts'
import postTemplate from './templates/post'
import remoteExecutorTemplate from './templates/remote-executor'
import idbTestTemplate from './templates/idb-test'
import { generateReady, generateMessage } from './generateMessage'
import { ConnectionTypes } from './ConnectionTypes'

const maxMessages = 30

const compressor = compression({
  flush: zlib.Z_PARTIAL_FLUSH
})

let appServerPath
if (os.platform() === 'win32') {
  appServerPath = '\\\\.\\pipe\\offlinefirst' + Date.now() + '.sock'
} else {
  appServerPath = 'offlinefirst.sock'
}

const connectionProperties = {
  perfect: {
    bytePerSecond: 100000000,
    delay: 0
  },
  slow: {
    bytePerSecond: 4000,
    delay: 3000
  },
  'lie-fi': {
    bytePerSecond: 1,
    delay: 10000
  }
}

const imgSizeToFlickrSuffix = {
  '1024px': 'b',
  '800px': 'c',
  '640px': 'z',
  '320px': 'n'
}

export default class Server {
  constructor (port) {
    this._app = express()
    this._messages = []
    this._sockets = []
    this._serverUp = false
    this._appServerUp = false
    this._port = port
    this._connectionType = ''
    this._connections = []

    this._appServer = http.createServer(this._app)
    this._exposedServer = net.createServer()

    this._wss = new WebSocketServer({
      server: this._appServer,
      path: '/updates'
    })

    const staticOptions = {
      maxAge: 0
    }

    this._exposedServer.on('connection', socket => this._onServerConnection(socket))
    this._wss.on('connection', ws => this._onWsConnection(ws))

    this._app.use(compressor)
    this._app.use('/js', express.static('../public/js', staticOptions))
    this._app.use('/css', express.static('../public/css', staticOptions))
    this._app.use('/imgs', express.static('../public/imgs', staticOptions))
    this._app.use('/avatars', express.static('../public/avatars', staticOptions))
    this._app.use('/sw.js', express.static('../public/sw.js', staticOptions))
    this._app.use('/sw.js.map', express.static('../public/sw.js.map', staticOptions))
    this._app.use('/manifest.json', express.static('../public/manifest.json', staticOptions))

    this._app.get('/', (req, res) => {
      res.send(indexTemplate({
        scripts: '<script src="/js/main.js" defer></script>',
        content: postsTemplate({
          content: this._messages.map(item => postTemplate(item)).join('')
        })
      }))
    })

    this._app.get('/skeleton', (req, res) => {
      res.send(indexTemplate({
        scripts: '<script src="/js/main.js" defer></script>',
        content: postsTemplate()
      }))
    })

    this._app.get('/photos/:farm-:server-:id-:secret-:type.jpg', (req, res) => {
      const flickrUrl = `http://farm${req.params.farm}.staticflickr.com/${req.params.server}/${req.params.id}_${req.params.secret}_${imgSizeToFlickrSuffix[req.params.type]}.jpg`
      const flickrRequest = http.request(flickrUrl, flickrRes => {
        flickrRes.pipe(res)
      })

      flickrRequest.on('error', () => {
        // TODO: use a real flickr image as a fallback
        res.sendFile('imgs/icon.png', {
          root: __dirname + '/../public/'
        })
      })

      flickrRequest.end()
    })

    this._app.get('/ping', (req, res) => {
      res.set('Access-Control-Allow-Origin', '*')
      res.status(200).send({ ok: true })
    })

    this._app.get('/remote', (req, res) => {
      res.send(remoteExecutorTemplate())
    })

    this._app.get('/idb-test/', (req, res) => {
      res.send(idbTestTemplate())
    })

    generateReady.then(() => {
      // generate initial messages
      let time = new Date()

      for (let i = 0; i < maxMessages; i++) {
        const msg = generateMessage()
        const timeDiff = random(5000, 15000)
        time = new Date(time - timeDiff)
        msg.time = time.toISOString()
        this._messages.push(msg)
      }

      this._generateDelayedMessages()
    })
  }

  _generateDelayedMessages () {
    setTimeout(() => {
      this._addMessage()
      this._generateDelayedMessages()
    }, random(5000, 15000))
  }

  _broadcast (obj) {
    const msg = JSON.stringify(obj)
    this._sockets.forEach(socket => socket.send(msg))
  }

  _onServerConnection (socket) {
    let closed = false
    this._connections.push(socket)

    socket.on('close', () => {
      closed = true
      this._connections.splice(this._connections.indexOf(socket), 1)
    })

    socket.on('error', err => console.log(err))

    const connection = connectionProperties[this._connectionType]
    const makeConnection = () => {
      if (closed) {
        return
      }
      const appSocket = net.connect(appServerPath)
      appSocket.on('error', err => console.log(err))
      // send data through unix socket, client -> server, server -> client
      socket.pipe(new Throttle(connection.bytePerSecond)).pipe(appSocket)
      appSocket.pipe(new Throttle(connection.bytePerSecond)).pipe(socket)
    }

    if (connection.delay) {
      setTimeout(makeConnection, connection.delay)
      return
    }
    makeConnection()
  }

  _onWsConnection (socket) {
    const requestUrl = url.parse(socket.upgradeReq.url, true)

    if ('no-socket' in requestUrl.query) {
      return
    }

    this._sockets.push(socket)

    socket.on('close', () => {
      this._sockets.splice(this._sockets.indexOf(socket), 1)
    })

    const sendNow = this._getInitialMessageToSend(requestUrl)

    if (sendNow.length) {
      socket.send(JSON.stringify(sendNow))
    }
  }

  _getInitialMessageToSend (requestUrl) {
    if (requestUrl.query.since) {
      const sinceDate = new Date(Number(requestUrl.query.since))
      let missedMessages = this._messages.findIndex(msg => new Date(msg.time) <= sinceDate)
      if (missedMessages === -1) {
        missedMessages = this._messages.length
      }
      return this._messages.slice(0, missedMessages)
    }
    return this._messages.slice()
  }

  _addMessage () {
    const message = generateMessage()
    this._messages.unshift(message)
    this._messages.pop()
    this._broadcast([message])
  }

  _listen () {
    this._serverUp = true
    this._exposedServer.listen(this._port, () => {
      console.log(`Server listening at localhost: ${this._port}`)
    })

    if (!this._appServerUp) {
      if (fs.existsSync(appServerPath)) {
        fs.unlinkSync(appServerPath)
      }
      this._appServer.listen(appServerPath)
      this._appServerUp = true
    }
  }

  _destroyConnections () {
    this._connections.forEach(connection => connection.destroy())
  }

  setConnectionType (type) {
    if (type === this._connectionType) {
      return
    }
    this._connectionType = type
    this._destroyConnections()
    const isOfflineConnection = type === ConnectionTypes.getTypes().offline

    if (isOfflineConnection) {
      if (!this._serverUp) {
        return
      }
      this._exposedServer.close()
      this._serverUp = false
      return
    }

    if (!this._serverUp) {
      this._listen()
    }
  }
}