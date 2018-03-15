/* global describe, it */

const assert = require('assert')
const s = require('ht-schema')
const bluebird = require('bluebird')

const Client = require('../src/client')
const Service = require('../src/service')

const _data = {
  hello: 'world'
}

const _data2 = {
  something: 'else'
}

const _data3 = {
  even: 'more'
}

const _data4 = {
  more: 'data'
}

const _err = new Error('oopsies!')

describe('Client', function () {
  describe('creation', function () {
    it('should add initial services on created', function () {
      let called = 0

      let services = {
        hello: { Client () { called++ } },
        world: { Client () { called++ } }
      }

      Client(services)

      assert.equal(called, Object.keys(services).length)
    })

    it('should ignore prototypal variables in services object', function () {
      let _services = {
        x: 1 // invalid
      }

      let services = Object.create(_services)

      services.test1 = mockTransport()()

      let client = new Client(services)

      assert.equal(Object.keys(client.services).length, 1)
    })

    it('should not require new keyword for creation', function () {
      let client = Client()

      assert.equal(client instanceof Client, true)
      assert.deepEqual(client.services, {})
    })
  })

  describe('connect', function () {
    it('should connect transports', function (done) {
      let services = {
        'test1': mockTransport()({}),
        'test2': mockTransport()({})
      }
      let client = new Client(services)
      let connected = { test1: false, test2: false }
      client.on('connected', function (name) {
        connected[name] = true
        let num = 0
        for (let service in connected) {
          if (connected[service]) num++
        }
        if (num === Object.keys(connected).length) done()
      })
      client.connect(function (err) {
        assert.ifError(err)
      })
    })

    it('should return error if transport returns error connecting', function (done) {
      let services = {
        'test1': mockTransport({
          connect (cb) {
            cb(_err)
          }
        })()
      }

      let client = new Client(services)

      client.connect(function (err) {
        assert.equal(err.message, _err.message)

        done()
      })
    })

    it('should call connect on all services passed into client', function (done) {
      let called = 0

      let fn = { Client () { return { connect (done) { called++; done() } } } }

      let services = {
        test1: fn,
        test2: fn,
        test3: fn
      }

      let client = new Client(services)

      client.connect(function (err) {
        assert.ifError(err)
        assert.equal(called, Object.keys(services).length)
        done()
      })
    })
  })

  describe('add', function () {
    it('should throw when adding duplicate service name', function () {
      let services = {
        'test1': mockTransport()({}),
        'test2': mockTransport()({})
      }
      let client = new Client(services)
      assert.throws(function () {
        client.add(firstKey(services), mockTransport())
      })
    })

    it('should be able to add new service', function () {
      let services = {
        'test1': mockTransport()({}),
        'test2': mockTransport()({})
      }
      let client = new Client(services)
      let countBefore = Object.keys(client.connections).length
      client.add('test3', mockTransport()({}))
      assert.equal(Object.keys(client.connections).length, countBefore + 1)
    })

    it('should allow adding a service directly', function () {
      let client = new Client()
      let service = new Service()
      client.add('myService', service)
      assert.deepEqual(Object.keys(client.connections), [ 'myService' ])
    })
  })

  describe('getServices', function () {
    it('should return array of services added', function () {
      let services = {
        'test1': mockTransport()({}),
        'test2': mockTransport()({})
      }
      let client = new Client(services)
      let serviceNames = client.getServices()
      assert.deepEqual(serviceNames, Object.keys(services))
    })
  })

  describe('hasService', function () {
    it('should return true when client has service', function () {
      let service = mockTransport()({})
      let client = new Client({
        myService: service
      })
      assert.equal(client.hasService('myService'), true)
    })

    it("should return false when client doesn't have service", function () {
      let client = new Client()
      assert.equal(client.hasService('myService'), false)
    })
  })

  describe('call', function () {
    it('should return error if calling unknown service', function (done) {
      let client = new Client({})

      client.call('invalid', 'method', {}, function (err) {
        assert.equal(err.error, 'unknown-service')

        done()
      })
    })

    it('should be able to call methods', function (done) {
      let services = {
        'test1': mockTransport()({}),
        'test2': mockTransport()({})
      }
      let client = new Client(services)
      let called = { method1: false, method2: false }
      client.on('called', function (service, method) {
        called[method] = true
        let num = 0
        for (let call in called) {
          if (called[call]) num++
        }
        if (num === Object.keys(called).length) done()
      })
      Object.keys(called).forEach(function (method) {
        client.call(firstKey(services), method, { a: method }, function (err, data) {
          assert.ifError(err)
          assert.deepEqual(data, { a: method })
        })
      })
    })

    it('should pass result back to fn', function (done) {
      let services = {
        test1: mockTransport()()
      }

      let client = new Client(services)

      client.call('test1', 'echo', _data2, function (err, response) {
        assert.ifError(err)
        assert.deepEqual(response, _data2)
        done()
      })
    })

    it('should return error if service does', function (done) {
      let services = {
        test1: mockTransport({
          call (method, data, callback) {
            return callback(_err)
          }
        })()
      }

      let client = new Client(services)

      client.call('test1', 'echo', _data, function (err) {
        assert.equal(err.message, _err.message)
        done()
      })
    })

    it('should allow optional function', function (done) {
      let services = {
        's1': mockTransport({
          call (method, data, callback) {
            assert.deepEqual(data, _data)
            callback()
            setTimeout(done, 100)
          }
        })()
      }

      let client = new Client(services)

      client.call('s1', 'method', _data)
    })

    it('should allow optional data', function (done) {
      let services = {
        's1': mockTransport({
          call (method, data, callback) {
            assert.equal(data, null)
            callback(null, _data)
          }
        })()
      }

      let client = new Client(services)

      client.call('s1', 'method', function (err, response) {
        assert.ifError(err)
        assert.deepEqual(response, _data)
        done()
      })
    })

    it('should allow optional data & callback', function (done) {
      let services = {
        's1': mockTransport({
          call (method, data, callback) {
            assert.equal(data, null)
            callback()
            setTimeout(done, 100)
          }
        })()
      }

      let client = new Client(services)

      client.call('s1', 'method')
    })

    it('should return a promise if no callback is given', function (done) {
      let services = {
        's1': mockTransport()()
      }

      let client = new Client(services)

      let promise = client.call('s1', 'method')

      assert.equal(promise instanceof bluebird.Promise, true)

      done()
    })

    it('should resolve promise correctly', function (done) {
      let services = {
        's1': mockTransport({
          call (method, data, callback) {
            return callback(null, _data)
          }
        })()
      }

      let client = new Client(services)

      let promise = client.call('s1', 'method')

      promise.then(function (response) {
        assert.deepEqual(response, _data)
        return done()
      })
    })

    it('should reject promise correctly', function (done) {
      let services = {
        's1': mockTransport({
          call (method, data, callback) {
            return callback(_data3)
          }
        })()
      }

      let client = new Client(services)

      let promise = client.call('s1', 'method')

      promise.catch(function (err) {
        assert.deepEqual(err, _data3)
        return done()
      })
    })

    it('should pass extra options', function (done) {
      let services = {
        s1: mockTransport({
          call (method, data, callback, opts) {
            return callback(null, opts)
          }
        })()
      }

      let client = new Client(services)

      client.call('s1', 'test', {}, function (err, data) {
        assert.ifError(err)
        assert.equal(data.myOption, 'something')
        return done()
      }, {
        myOption: 'something'
      })
    })
  })

  describe('middleware', function () {
    it('should allow adding middleware', function () {
      let client = new Client({})

      client.before(() => {})
      client.after(() => {})
    })

    it('should call all before middleware before passed into transport', function (done) {
      let services = {
        test1: mockTransport({
          call (method, data, callback) {
            assert.notDeepEqual(data, _data)
            assert.deepEqual(data, _data3)
            done()
          }
        })()
      }

      let client = new Client(services)

      client.before(function (data, callback) {
        assert.deepEqual(data, _data)
        return callback(null, _data2)
      })

      client.before(function (data, callback) {
        assert.deepEqual(data, _data2)
        return callback(null, _data3)
      })

      client.call('test1', '', _data, function (err) {
        assert.ifError(err)
      })
    })

    it('should call all after middleware before result is given back to client', function (done) {
      let services = {
        test1: mockTransport({
          call (method, data, callback) {
            assert.deepEqual(data, {})
            return callback(null, _data)
          }
        })()
      }

      let client = new Client(services)

      client.after(function (data, callback) {
        assert.deepEqual(data, _data)
        return callback(null, _data2)
      })

      client.after(function (data, callback) {
        assert.deepEqual(data, _data2)
        return callback(null, _data3)
      })

      client.call('test1', '', {}, function (err, result) {
        assert.ifError(err)
        assert.deepEqual(result, _data3)
        done()
      })
    })

    it('should be able to mix middleware', function (done) {
      let services = {
        test1: mockTransport({
          call (method, data, callback) {
            assert.deepEqual(data, _data)
            return callback(null, _data2)
          }
        })()
      }

      let client = new Client(services)

      client.before(function (data, callback) {
        assert.deepEqual(data, {})
        return callback(null, _data)
      })

      client.after(function (data, callback) {
        assert.deepEqual(data, _data2)
        return callback(null, _data3)
      })

      client.call('test1', '', {}, function (err, response) {
        assert.ifError(err)
        assert.deepEqual(response, _data3)
        done()
      })
    })

    it('should only call middleware for matching services', function (done) {
      let services = {
        test1: mockTransport({
          call (method, data, callback) {
            assert.deepEqual(data, _data)
            return callback(null, data)
          }
        })(),
        test2: mockTransport({
          call (method, data, callback) {
            return callback(null, data)
          }
        })()
      }

      let client = new Client(services)

      client.before(function (data, callback) {
        assert.deepEqual(data, {})
        return callback(null, _data)
      }, {
        service: 'test1'
      })

      client.after(function (data, callback) {
        assert.deepEqual(data, {})
        return callback(null, _data2)
      }, {
        service: 'test2'
      })

      client.call('test1', 'echo', {}, function (err, response) {
        assert.ifError(err)

        assert.deepEqual(response, _data)

        client.call('test2', 'echo', {}, function (err, response) {
          assert.ifError(err)

          assert.deepEqual(response, _data2)

          done()
        })
      })
    })

    it('should only call middleware for matching methods', function (done) {
      let services = {
        test1: mockTransport({
          call (method, data, callback) {
            assert.deepEqual(data, _data)
            return callback(null, data)
          }
        })(),
        test2: mockTransport({
          call (method, data, callback) {
            return callback(null, data)
          }
        })()
      }

      let client = new Client(services)

      client.before(function (data, callback) {
        return callback(null, data)
      }, {
        method: 'nope!'
      })

      client.before(function (data, callback) {
        assert.deepEqual(data, {})
        return callback(null, _data)
      }, {
        service: 'test1',
        method: 'echo'
      })

      client.after(function (data, callback) {
        assert.deepEqual(data, {})
        return callback(null, _data2)
      }, {
        service: 'test2',
        method: 'wrongMethodName'
      })

      client.call('test1', 'echo', {}, function (err, response) {
        assert.ifError(err)

        assert.deepEqual(response, _data)

        client.call('test2', 'echo', {}, function (err, response) {
          assert.ifError(err)

          assert.deepEqual(response, {})

          done()
        })
      })
    })

    it('should return error if middleware does (before)', function (done) {
      let services = {
        test1: mockTransport()()
      }

      let client = new Client(services)

      client.before(function (data, callback) {
        assert.deepEqual(data, _data)
        return callback(_err)
      })

      client.call('test1', '', _data, function (err) {
        assert.equal(err.message, _err.message)

        done()
      })
    })

    it('should return error if middleware does (after)', function (done) {
      let services = {
        test1: mockTransport()()
      }

      let client = new Client(services)

      client.after(function (data, callback) {
        assert.deepEqual(data, _data)
        return callback(_err)
      })

      client.call('test1', '', _data, function (err) {
        assert.equal(err.message, _err.message)

        done()
      })
    })

    it('should expose service and method to middleware', function (done) {
      let _service = 'test1'
      let _method = 'hello'
      let _data = 'world'

      let services = {
        test1: mockTransport()()
      }

      let client = new Client(services)

      client.before(function (data, callback) {
        assert.equal(this.service, _service)
        assert.equal(this.method, _method)
        return callback(null, data)
      })

      client.after(function (data, callback) {
        assert.equal(this.service, _service)
        assert.equal(this.method, _method)
        return callback(null, data)
      })

      client.call(_service, _method, _data, function (err) {
        assert.ifError(err)
        return done()
      })
    })

    it('should be able to change service & method in before middleware', function (done) {
      let _beforeService = 'service1'
      let _beforeMethod = 'method1'

      let _afterService = 'service2'
      let _afterMethod = 'method2'

      let services = {
        service2: mockTransport({
          call (method, data, callback) {
            assert.equal(method, _afterMethod)
            return callback(null, data)
          }
        })()
      }

      let client = new Client(services)

      client.before(function (data, callback) {
        assert.equal(this.service, _beforeService)
        assert.equal(this.method, _beforeMethod)
        this.service = _afterService
        this.method = _afterMethod
        return callback(null, data)
      })

      client.call(_beforeService, _beforeMethod, '', function (err) {
        assert.ifError(err)
        done()
      })
    })
  })

  describe('disconnect', function () {
    it('should call disconnect on all services passed into client', function (done) {
      let called = 0

      let fn = { Client () { return { disconnect (done) { called++; done() } } } }

      let services = {
        test1: fn,
        test2: fn,
        test3: fn
      }

      let client = new Client(services)

      client.disconnect(function (err) {
        assert.ifError(err)
        assert.equal(called, Object.keys(services).length)
        done()
      })
    })

    it('should return error if transport returns error disconnecting', function (done) {
      let _err = new Error('oops')

      let services = {
        'test1': mockTransport({
          disconnect (cb) {
            cb(_err)
          }
        })()
      }

      let client = new Client(services)

      client.disconnect(function (err) {
        assert.equal(err.message, _err.message)

        done()
      })
    })
  })

  describe('prepare', function () {
    it('should be able to prepare a query and execute it after', function (done) {
      let services = {
        s1: mockTransport({
          call (method, data, callback) {
            assert.deepEqual(data, _data)
            callback(null, _data2)
          }
        })()
      }

      let client = new Client(services)

      let prepared = client.prepare('s1', 'method', _data)

      prepared(function (err, data) {
        assert.ifError(err)
        assert.deepEqual(data, _data2)
        prepared(function (err, data2) {
          assert.ifError(err)
          assert.deepEqual(data2, _data2)
          done()
        })
      })
    })

    it('should allow passing data to the prepared function', function (done) {
      let services = {
        s1: mockTransport({
          call (method, data, callback) {
            assert.deepEqual(data, _data)
            return callback(null, _data2)
          }
        })()
      }

      let client = new Client(services)

      let prepared = client.prepare('s1', 'method')

      prepared(_data, function (err, response) {
        assert.ifError(err)
        assert.deepEqual(response, _data2)
        return done()
      })
    })

    it('prepared function should return promise when called', function (done) {
      let services = {
        s1: mockTransport({
          call (method, data, callback) {
            assert.deepEqual(data, _data)
            return callback(null, _data2)
          }
        })()
      }
      let client = new Client(services)
      let prepared = client.prepare('s1', 'method')
      let promise = prepared(_data)
      assert(promise instanceof bluebird.Promise)
      promise.then(function (result) {
        assert.deepEqual(result, _data2)
        return done()
      }).catch(function (err) {
        assert.ifError(err)
      })
    })
  })

  describe('chain', function () {
    it('should be able to chain calls', function (done) {
      let services = {
        s1: mockTransport({
          call (method, data, callback) {
            assert.equal(method, '$htMultiCall')
            assert.deepEqual(data, [
              {
                method: 'method1',
                data: _data
              },
              {
                method: 'method2'
              },
              {
                method: 'method3'
              }
            ])
            return callback(null, _data4)
          }
        })()
      }

      let client = new Client(services)

      client.chain('s1', 'method1', _data)
        .chain('s1', 'method2')
        .chain('s1', 'method3')
        .end(function (err, result) {
          assert.ifError(err)
          assert.deepEqual(result, _data4)
          done()
        })
    })

    it('should be able to override data for certain calls', function (done) {
      let services = {
        s1: mockTransport({
          call (method, data, callback) {
            assert.equal(method, '$htMultiCall')
            assert.deepEqual(data, [
              {
                method: 'method1',
                data: _data
              },
              {
                method: 'method2',
                data: _data4
              }
            ])
            return callback(null, _data3)
          }
        })()
      }

      let client = new Client(services)

      client.chain('s1', 'method1', _data)
        .chain('s1', 'method2', _data4)
        .end(function (err, result) {
          assert.ifError(err)
          assert.deepEqual(result, _data3)
          done()
        })
    })

    it('should successfully be able to call methods on multiple services', function (done) {
      let str = 'hello world'
      let strRev = 'dlrow olleh'

      let services = {
        s1: mockTransport({
          call (method, data, callback) {
            assert.equal(data, str)
            return callback(null, data)
          }
        })(),
        s2: mockTransport({
          call (method, data, callback) {
            // reverse
            assert.equal(data, str)
            return callback(null, data.split('').reverse().join(''))
          }
        })()
      }

      let client = new Client(services)

      client.chain('s1', 'echo', str).chain('s2', 'reverse').end(function (err, response) {
        assert.ifError(err)
        assert.deepEqual(response, strRev)
        done()
      })
    })

    it("should be return immediately if service or method doesn't exist", function (done) {
      let client = new Client({})

      client.chain('s1', 'method').end(function (err, result) {
        assert.deepEqual(err, {
          service: 's1',
          method: 'method',
          error: {
            error: 'unknown-service'
          }
        })
        assert.equal(result, undefined)
        done()
      })
    })

    it('should use normal call instead of $htMultiCall if there is only 1 method being called on a service', function (done) {
      let services = {
        s1: mockTransport({
          call (method, data, callback) {
            assert.equal(method, 'm1')
            return callback(null, _data)
          }
        })(),
        s2: mockTransport({
          call (method, data, callback) {
            assert.equal(method, '$htMultiCall')
            assert.equal(data[0].method, 'm1')
            assert.equal(data[1].method, 'm2')
            assert.deepEqual(data[0].data, _data)
            return callback(null, _data2)
          }
        })()
      }

      let client = new Client(services)

      client.chain('s1', 'm1').chain('s2', 'm1').chain('s2', 'm2').end(function (err, data) {
        assert.ifError(err)
        assert.deepEqual(data, _data2)
        done()
      })
    })

    it('should return error if end is called on a non-chain', function (done) {
      let client = new Client({})

      client.end(function (err) {
        assert.equal(err.message, 'Client.end called on a non-chained HT client.')
        done()
      })
    })
  })

  describe('schemas', function () {
    it('should be able to add schemas', function () {
      let client = new Client()

      client.addSchema('hello', 'hi', s.String())

      assert.equal(Object.keys(client.schemas.hello).length, 1)

      client.addSchema('hello', 'hi2', s.String())

      assert.equal(Object.keys(client.schemas.hello).length, 2)
    })

    it('should work when response matches schema', function (done) {
      let services = {
        s1: mockTransport({
          call (method, data, callback) {
            return callback(null, {
              advanced: {
                schema: {
                  array: [ 5, 'hello' ]
                }
              }
            })
          }
        })()
      }

      let client = new Client(services)

      client.addSchema('s1', 'method', s.Object({
        advanced: s.Object({
          schema: s.Object({
            array: s.TypedArray([ s.Number(), s.String() ])
          })
        })
      }))

      client.call('s1', 'method', function (err, data) {
        assert.ifError(err)
        assert.equal(data.advanced.schema.array[1], 'hello')
        done()
      })
    })

    it('should return an error if returned data does not match schema', function (done) {
      let services = {
        s1: mockTransport({
          call (method, data, callback) {
            return callback(null, {
              basic: {
                schema: true
              }
            })
          }
        })()
      }

      let client = new Client(services)

      client.addSchema('s1', 'method', s.Object({
        basic: s.Object({
          schema: s.String() // this will actually return a boolean, so it won't validate
        })
      }))

      client.call('s1', 'method', {}, function (err, data) {
        assert.equal(err.$htValidationError, true)
        assert.equal(~err.error.indexOf('Failed to parse schema.basic'), -1)
        assert.equal(data, undefined)
        done()
      })
    })

    it('should throw if schema does not have validate function', function () {
      let client = new Client()

      assert.throws(function () {
        client.addSchema('s1', 'method', true)
      })
    })
  })
})

function mockTransport (fns) {
  if (!fns) fns = {}
  let ok = function (done) { done() }
  let server = function () {}
  let client = function () {}
  server.prototype.listen = fns.listen || ok
  server.prototype.stop = fns.stop || ok
  client.prototype.connect = fns.connect || ok
  client.prototype.disconnect = fns.disconnect || ok
  client.prototype.call = fns.call || function (method, data, callback) {
    callback(null, data)
  }
  let transport = function () {
    return {
      Client: client,
      Server: server
    }
  }
  return transport
}

function firstKey (obj) {
  for (let k in obj) return k
}
