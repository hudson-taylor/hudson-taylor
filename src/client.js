
'use strict'

const util = require('util')
const events = require('events')
const async = require('async')
const bluebird = require('bluebird')
const utils = require('ht-utils')

const Service = require('./service')
const LocalTransport = require('./transports').Local

let Client = function Client (services) {
  if (!(this instanceof Client)) {
    return new Client(services)
  }

  this.services = {}
  this.connections = {}
  this.schemas = {}

  this.middleware = {
    before: [],
    after: []
  }

  for (let service in services) {
    if (!services.hasOwnProperty(service)) {
      continue
    }
    this.add(service, services[service])
  }
}

util.inherits(Client, events.EventEmitter)

Client.prototype.add = function (name, transport) {
  if (this.services[name]) {
    throw new Error('Tried adding a service with duplicate name')
  }
  if (transport instanceof Service) {
    let service = transport
    transport = new LocalTransport()
    service.addTransport(transport)
  }
  this.services[name] = transport
  let client = new transport.Client()
  this.connections[name] = client
  this.emit('added', name)
}

Client.prototype.getServices = function () {
  return Object.keys(this.services)
}

Client.prototype.hasService = function (name) {
  return !!~this.getServices().indexOf(name)
}

Client.prototype.addSchema = function (service, method, schema) {
  if (!this.schemas[service]) {
    this.schemas[service] = {}
  }
  if (typeof schema.validate !== 'function') {
    throw new Error('Schema for ' + method + ' does not have a validate function.')
  }
  this.schemas[service][method] = schema
}

Client.prototype.connect = function (done) {
  async.each(Object.keys(this.services), (name, cb) => {
    this.connections[name].connect((err) => {
      if (err) {
        return cb(err)
      }
      this.emit('connected', name)
      cb()
    })
  }, done)
}

Client.prototype.disconnect = function (done) {
  async.each(Object.keys(this.connections), (name, cb) => {
    this.connections[name].disconnect((err) => {
      if (err) {
        return cb(err)
      }
      delete this.connections[name]
      this.emit('disconnected', name)
      cb()
    })
  }, done)
}

Client.prototype.call = function (service, method, data, callback, opts = {}) {
  let context = {
    service,
    method
  }

  let returnPromise = false
  let promise, resolve, reject

  // this can be cleaned up
  if (!data && !callback) {
    data = undefined
    returnPromise = true
  } else if (data && typeof data !== 'function' && !callback) {
    returnPromise = true
  } else if (typeof data === 'function') {
    callback = data
    data = undefined
  }

  if (returnPromise) {
    // :(
    promise = new bluebird.Promise(function (_resolve, _reject) {
      resolve = _resolve
      reject = _reject
    })
  }

  let _beforeMiddleware = this.middleware.before.filter((m) => {
    if (m.service && m.service !== context.service) return false
    if (m.method && m.method !== context.method) return false
    return true
  })

  function returnResult (err, data) {
    if (returnPromise) {
      if (err) {
        return reject(err)
      } else {
        return resolve(data)
      }
    }
    return callback(err, data)
  }

  async.eachSeries(_beforeMiddleware, function (middleware, done) {
    middleware.fn.call(context, data, function (err, result) {
      if (err) {
        return done(err)
      }
      data = result
      done()
    })
  }, (err) => {
    if (err) {
      return returnResult(err)
    }

    let conn = this.connections[context.service]

    if (!conn) {
      return returnResult({ error: 'unknown-service' })
    }

    conn.call(context.method, data, (err, data) => {
      if (err) {
        return returnResult(err)
      }
      let _afterMiddleware = this.middleware.after.filter((m) => {
        if (m.service && m.service !== context.service) return false
        if (m.method && m.method !== context.method) return false
        return true
      })
      async.eachSeries(_afterMiddleware, function (middleware, done) {
        middleware.fn.call(context, data, function (err, result) {
          if (err) {
            return done(err)
          }
          data = result
          done()
        })
      }, (err) => {
        if (err) {
          return returnResult(err)
        }

        let finish = (data) => {
          this.emit('called', context.service, context.method)
          return returnResult(null, data)
        }

        if (this.schemas[context.service] && this.schemas[context.service][context.method]) {
          let schema = this.schemas[context.service][context.method]
          schema.validate(data, function (err, data) {
            if (err) {
              return returnResult({
                $htValidationError: true,
                error: err.message
              })
            }
            return finish(data)
          })
        } else {
          return finish(data)
        }
      })
    }, opts)
  })

  if (returnPromise) {
    return promise
  }
}

Client.prototype.before = function (fn, opts = {}) {
  let { service, method } = opts
  this.middleware.before.push({
    service,
    method,
    fn
  })
}

Client.prototype.after = function (fn, opts = {}) {
  let { service, method } = opts
  this.middleware.after.push({
    service,
    method,
    fn
  })
}

Client.prototype.prepare = function (service, method, data) {
  return (_data, callback) => {
    if (typeof _data === 'function') {
      callback = _data
      _data = undefined
    }
    if (typeof _data === 'undefined') {
      _data = data
    }
    return this.call(service, method, _data, callback)
  }
}

Client.prototype.chain = function (service, method, data) {
  let client = this

  if (!client.isChain) {
    // return new instance of the client
    // so we can set values on it
    client = new Client()
    for (let k in this) {
      if (client.hasOwnProperty(k)) {
        client[k] = this[k]
      }
    }
    client.isChain = true
    client.chainedMethods = []
  }

  client.chainedMethods.push({
    service,
    method,
    data
  })

  return client
}

Client.prototype.end = function (callback) {
  if (!this.isChain) {
    return callback(new Error('Client.end called on a non-chained HT client.'))
  }

  let tmp = this.chainedMethods.reduce(function (previous, method) {
    let last = previous[previous.length - 1]

    if (!last || last.service !== method.service) {
      previous.push({
        service: method.service,
        calls: []
      })
    }

    let call = {
      method: method.method
    }

    if (method.data) {
      call.data = method.data
    }

    previous[previous.length - 1].calls.push(call)

    return previous
  }, [])

  let methods = tmp.map(function (serviceCall) {
    let call = {
      service: serviceCall.service,
      method: '$htMultiCall',
      data: serviceCall.calls
    }

    if (serviceCall.calls.length === 1) {
      // If we're only calling 1 method on the
      // service, call it directly and don't
      // use $htMultiCall
      call = {
        service: serviceCall.service,
        method: serviceCall.calls[0].method,
        data: serviceCall.calls[0].data
      }
    }

    return call
  })

  utils.getLastResult.call(this, methods, callback)
}

export default Client
