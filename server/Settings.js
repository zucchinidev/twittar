import express from 'express'
import zlib from 'zlib'
import compression from 'compression'
import { EventEmitter } from 'events'
import readFormBody from './readFormBody'
import indexTemplate from './templates/index'
import settingsTemplate from './templates/settings'
import { ConnectionTypes } from './ConnectionTypes'

const compressor = compression({
  flush: zlib.Z_PARTIAL_FLUSH
})

export default class Server extends EventEmitter {
  constructor (port, appPort) {
    super()
    this._app = express()
    this._port = port
    this._appPort = appPort
    this._currentConnectionType = 'perfect'

    const staticOptions = {
      maxAge: 0
    }

    this._app.use('/js', express.static('../public/js', staticOptions))
    this._app.use('/css', express.static('../public/css', staticOptions))
    this._app.use('/imgs', express.static('../public/imgs', staticOptions))

    this._app.get('/', compressor, (req, res) => {

      const body = indexTemplate({
        scripts: '<script src="/js/settings.js" defer></script>',
        extraCss: '<link rel="stylesheet" href="/css/settings.css" />',
        content: settingsTemplate({
          appPort: this._appPort,
          currentConnectionType: this._currentConnectionType,
          connectionTypes: this._getConnectionTypes()
        })
      })
      res.send(body)
    })

    this._app.post('/set', compressor, readFormBody(), (req, res) => {
      const types = ConnectionTypes.getTypes()
      const validTypes = Object.keys(types).map(type => types[type])

      const body = req.body
      const connectionType = body && body.connectionType
      const isValidType = connectionType && validTypes.indexOf(connectionType) !== -1
      if (!body || !connectionType || !isValidType) {
        return res.sendStatus(400)
      }

      res.send({
        ok: true
      })

      this._currentConnectionType = connectionType
      this.emit('connectionChange', { type: connectionType })
    })
  }

  _getConnectionTypes () {
    const types = ConnectionTypes.getTypes()
    return Object.keys(types).map(type => {
      const value = types[type]
      const title = value.charAt(0).toUpperCase() + value.slice(1)
      const checked = value === this._currentConnectionType
      return {
        value,
        title,
        checked
      }
    })
  }

  listen () {
    this._app.listen(this._port, _ => {
      console.log(`Config server listening at localhost: ${this._port}`)
    })
  }
}