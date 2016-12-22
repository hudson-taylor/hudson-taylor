/* global describe, it */
/* eslint-disable no-new */

const assert = require('assert')

const LOCAL = require('../../src/transports/local')

describe('Local Transport', function () {
  let transport

  describe('Transport', function () {
    it('should create transport instance', function () {
      transport = new LOCAL()

      assert.equal(transport instanceof LOCAL, true)
    })

    it('should not require new keyword for creation', function () {
      let transport = LOCAL()

      assert.equal(transport instanceof LOCAL, true)
    })

    it("should provide noop'd versions of unused methods", function () {
      let noop = () => {}

      let _server = new transport.Server((method, data, callback) => {})
      let _client = new transport.Client()

      _server.listen(noop)
      _server.stop(noop)

      _client.connect(noop)
      _client.disconnect(noop)
    })

    it('should call fn when request is received', function (done) {
      let _method = 'echo'
      let _data = { hello: 'world' }

      new transport.Server(function (method, data, callback) {
        assert.equal(method, _method)
        assert.deepEqual(data, _data)
        callback(null, data)
      })

      let _client = new transport.Client()

      _client.call(_method, _data, function (err, response) {
        assert.ifError(err)
        assert.deepEqual(response, _data)
        done()
      })
    })

    it('should ensure data is valid json', function (done) {
      let transport = new LOCAL()

      new transport.Server(function (method, data, callback) {
        assert.equal(typeof data.date, 'string')
        callback(null, { date: new Date() })
      })

      let _client = new transport.Client()

      _client.call('something', { date: new Date() }, function (err, response) {
        assert.ifError(err)
        assert.equal(typeof response.date, 'string')
        done()
      })
    })

    it('should ensure error is valid json', function (done) {
      let transport = new LOCAL()

      let _data = {}
      _data.data = _data

      new transport.Server((method, data, callback) => {})
      let _client = new transport.Client()

      _client.call('something', _data, function (err) {
        assert.equal(err.error, 'Converting circular structure to JSON')
        done()
      })
    })

    it('should return error if fn does', function (done) {
      let transport = new LOCAL()

      let _err = 'error!'

      new transport.Server(function (method, data, callback) {
        callback(_err)
      })

      let _client = new transport.Client()

      _client.call('something', {}, function (err) {
        assert.equal(err.error, _err)
        done()
      })
    })

    it('should return valid json if fn returns Error', function (done) {
      let transport = new LOCAL()

      let _err = new Error('oopsies')

      new transport.Server(function (method, data, callback) {
        callback(_err)
      })

      let _client = new transport.Client()

      _client.call('something', {}, function (err) {
        assert.equal(err.error, _err.message)
        done()
      })
    })

    it('should return valid json if fn returns invalid json', function (done) {
      let transport = new LOCAL()

      let _err = {}
      _err._err = _err

      new transport.Server(function (method, data, callback) {
        callback(_err)
      })

      let _client = new transport.Client()

      _client.call('something', {}, function (err) {
        assert.equal(err.error, 'Converting circular structure to JSON')
        done()
      })
    })

    it('should return arguments in correct order even if normal response has an error key', function (done) {
      let transport = new LOCAL()

      new transport.Server(function (method, data, callback) {
        callback(null, { error: 'a' })
      })

      let _client = new transport.Client()

      _client.call('something', {}, function (err, res) {
        assert.ifError(err)
        assert.deepEqual(res, { error: 'a' })
        done()
      })
    })

    it('should return undefined if no data is returned from service', function (done) {
      let transport = new LOCAL()

      new transport.Server(function (method, data, callback) {
        callback()
      })

      let _client = new transport.Client()

      _client.call('hello', 'world', function (err, response) {
        assert.ifError(err)
        assert.strictEqual(response, undefined)
        done()
      })
    })

    it('should return error if data returned from service cannot be coerced to JSON', function (done) {
      let transport = new LOCAL()

      let response = {}
      response.hello = response

      new transport.Server(function (method, data, callback) {
        callback(null, response)
      })

      let _client = new transport.Client()

      _client.call('hello', 'world', function (err) {
        assert.equal(err.error, 'Converting circular structure to JSON')
        done()
      })
    })
  })

  describe('forceJSON', function () {
    it('should return undefined if no input', function () {
      var result = LOCAL.forceJSON()
      assert.equal(result, undefined)
    })
  })
})
