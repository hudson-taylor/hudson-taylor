
"use strict";

const assert = require('assert');
const s      = require('ht-schema');

const Service = require('../lib/service');

const _data = {
  hello: "world"
};

const _data2 = {
  something: "else"
};

const _data3 = {
  even: "more"
};

const _data4 = {
  more: "data"
};

const _err = new Error("oopsies!");

describe("Service", function() {

  it("should allow passing no transport", function() {

    let service = new Service();

    assert.equal(service._servers.length, 0);

  });

  it("should allow passing in just config", function() {

    let service = new Service(_data);

    assert.deepEqual(service.config, _data);
    assert.equal(service._servers.length, 0);

  });

  it("should allow adding transport after service has been created", function(done) {

    let service = new Service();

    let transport = mockTransport();

    assert.equal(service._servers.length, 0);

    service.addTransport(transport(), function(err) {
      assert.ifError(err);
      assert.equal(service._servers.length, 1);
      done();
    });

  });
  
  it("should allow passing single transport", function() {

    let service = new Service(mockTransport()());

    assert.equal(service._servers.length, 1);

  });

  it("should allow passing multiple transports", function() {

    [ 1, 5, 10 ].forEach(function(n) {

      let transports = [];

      for(let i = 0; i < n; i++) {
        transports.push(mockTransport()());
      }

      let service = new Service(transports);

      assert.equal(service._servers.length, n);

    });

  });

  it("should allow listening for methods", function() {

    let service = new Service(mockTransport()());

    assert.equal(typeof service.on, "function");

    assert.doesNotThrow(function() {
      service.on("something", s.Object({ strict: false }), (req, done) => { done(); });
      service.on("somethingelse", (req, done) => { done(); });
    });

  });

  it("should call listen function on all transports", function(done) {

    let called = 0;

    let transport = mockTransport({
      listen(done) {
        called++;
        done();
      }
    });

    let transports = [ transport(), transport(), transport() ];

    let service = new Service(transports);

    service.listen(function(err) {
      assert.ifError(err); // This can't happen.. shrug
      assert.equal(called, transports.length);
      done();
    });

  });

  it("should not require callback passed to listen", function(done) {

    let called = false;

    let transport = mockTransport({
      listen(done) {
        called = true;
        done();
      }
    });

    let service = new Service(transport());

    service.listen();

    setTimeout(() => {
      assert.equal(called, true);
      done();
    }, 100);

  });

  it("should set listening to true when listen is called", function(done) {

    let service = new Service(mockTransport()());

    service.listen(function(err) {
      assert.ifError(err);

      assert.equal(service.listening, true);

      done();

    });

  });

  it("should immediately return if server is already listening", function(done) {

    let service = new Service(mockTransport()());

    service.listen(function(err) {
      assert.ifError(err);
      service.listen(function(err) {
        assert.ifError(err);
        done();
      });
    });

  });

  it("should call listen on newly added transports if service is already listening", function(done) {

    let mocked = mockTransport({
      listen() {
        done();
      }
    });

    let service = new Service(mockTransport()());

    service.listen(function(err) {
      assert.ifError(err);

      service.addTransport(mocked());

    });

  });

  it("should return error if there was an error listening", function(done) {

    let transport = mockTransport({
      listen(done) {
        return done(_err);
      }
    });

    let service = new Service(transport());

    service.listen(function(err) {
      assert.equal(err, _err);
      done();
    });

  });

  it("should return error if calling unknown method", function(done) {

    let transport = mockTransport();

    let service = new Service(transport());

    let _method = "unknown";

    service.call(_method, {}, function(err) {

      assert.equal(err.error, "unknown-method");
      assert.equal(err.method, _method);

      done();

    });

  });

  it("should return error if data does not match schema", function(done) {

    let transport = mockTransport();

    let service = new Service(transport());

    service.on("double", {
      number: s.Number()
    }, function(request, callback) {
      return callback(null, request.number * 2);
    });

    service.call("double", { number: "hello" }, function(err) {

      assert.equal(err.$htValidationError, true);
      assert.equal(err.error, "Failed to parse schema.number: Got string, required Number");

      done();

    });

  });

  it("should allow adding middleware", function() {

    let service = new Service(mockTransport()());

    service.before(() => {});
    service.after(() => {});

  });

  it("should call all before middleware before method handler is called", function(done) {

    let transport = mockTransport();

    let service = new Service(transport());

    service.on("echo", function(request, callback) {
      assert.deepEqual(request, _data);
      done();
    });

    service.before(function(data, callback) {
      assert.deepEqual(data, {});
      callback(null, _data);
    });

    service.call("echo", {}, function(err, data) {
      assert.ifError(err);
    });

  });

  it("should call all after middleware before result is sent to transport", function(done) {

    let transport = mockTransport();

    let service = new Service(transport());

    service.on("echo", function(request, callback) {
      assert.deepEqual(request, {});
      return callback(null, _data);
    });

    service.after(function(data, callback) {
      assert.deepEqual(data, _data);
      return callback(null, _data2);
    });

    service.call("echo", {}, function(err, data) {
      assert.ifError(err);
      assert.deepEqual(data, _data2);
      done();
    });

  });

  it("should be able to mix middleware", function(done) {

    let transport = mockTransport();

    let service = new Service(transport());

    service.on("echo", function(request, callback) {
      assert.deepEqual(request, _data);
      return callback(null, _data2);
    });

    service.before(function(data, callback) {
      assert.deepEqual(data, {});
      return callback(null, _data);
    });

    service.after(function(data, callback) {
      assert.deepEqual(data, _data2);
      return callback(null, _data3);
    });

    service.call("echo", {}, function(err, data) {
      assert.ifError(err);
      assert.deepEqual(data, _data3);
      done();
    });

  });

  it("should only call middleware for matching methods", function(done) {

    let transport = mockTransport();

    let service = new Service(transport());

    service.before(function(data, callback) {
      assert.deepEqual(data, {});
      return callback(null, _data);
    }, {
      method: "echo1"
    });

    service.on("echo1", function(request, callback) {
      assert.deepEqual(request, _data);
      return callback(null, request);
    });

    service.on("echo2", function(request, callback) {
      assert.deepEqual(request, {});
      return callback(null, _data2);
    });

    service.after(function(data, callback) {
      assert.deepEqual(data, _data2);
      return callback(null, _data3);
    }, {
      method: "echo2"
    });

    service.call("echo1", {}, function(err, response) {
      assert.ifError(err);

      assert.deepEqual(response, _data);

      service.call("echo2", {}, function(err, response) {
        assert.ifError(err);

        assert.deepEqual(response, _data3);

        done();

      });

    });

  });

  it("should return error if middleware does (before)", function(done) {

    let transport = mockTransport();

    let service = new Service(transport());

    service.before(function(data, callback) {
      assert.deepEqual(data, _data);
      return callback(_err);
    });

    service.on("echo", function(request, callback) {
      return callback(null, request);
    });

    service.call("echo", _data, function(err) {
      assert.equal(err.message, _err.message);
      done();
    });

  });

  it("should return error if middleware does (after)", function(done) {

    let transport = mockTransport();

    let service = new Service(transport());

    service.after(function(data, callback) {
      assert.deepEqual(data, _data);
      return callback(_err);
    });

    service.on("echo", function(request, callback) {
      return callback(null, request);
    });

    service.call("echo", _data, function(err) {
      assert.equal(err.message, _err.message);
      done();
    });

  });

  it("should expose method to middleware", function(done) {

    let _method = "hello";

    let transport = mockTransport();

    let service = new Service(transport());

    service.before(function(data, callback) {
      assert.equal(this.method, _method);
      return callback(null, data);
    });

    service.after(function(data, callback) {
      assert.equal(this.method, _method);
      return callback(null, data);
    });

    service.on(_method, (req, callback) => callback());

    service.call(_method, "", function(err) {
      assert.ifError(err);
      return done();
    });

  });

  it("should be able to change method in before middleware", function(done) {

    let _method1 = "hello";
    let _method2 = "world";

    let transport = new mockTransport();

    let service = new Service(transport());

    service.before(function(data, callback) {
      assert.equal(this.method, _method1);
      this.method = _method2;
      return callback(null, data);
    });

    service.on(_method2, (req, callback) => callback(null, req));

    service.call(_method1, "hi", function(err, res) {
      assert.ifError(err);
      assert.equal(res, "hi");
      done();
    });

  });

  it("should immediately return if server is not listening", function(done) {

    let service = new Service(mockTransport()());

    service.stop(function(err) {
      assert.ifError(err);
      done();
    });

  });

  it("should call stop function on all transports", function(done) {

    let called = 0;
    let transport = mockTransport({
      stop(done) {
        called++;
        done();
      }
    });

    let transports = [ transport(), transport() ];

    let service = new Service(transports);

    service.listen(function(err) {
      assert.ifError(err);

      service.stop(function(err) {
        assert.ifError(err); // This can't happen.. shrug
        assert.equal(called, transports.length);
        done();
      });

    });

  });

  it("should not require callback passed to stop", function(done) {

    let called = false;

    let transport = mockTransport({
      stop(done) {
        called = true;
        done();
      }
    });

    let service = new Service(transport());

    service.listen(function(err) {
      assert.ifError(err);
      service.stop();
    });

    setTimeout(() => {
      assert.equal(called, true);
      done();
    }, 100);

  });

  it("should set listening to false when stop is called", function(done) {

    let service = new Service(mockTransport()());

    service.listen(function(err) {
      assert.ifError(err);
      assert.equal(service.listening, true);
      service.stop(function(err) {
        assert.ifError(err);
        assert.equal(service.listening, false);
        done();
      });
    });

  });

  it("should return error if there was an error stopping", function(done) {

    let transport = mockTransport({
      stop(done) {
        return done(_err);
      }
    });

    let service = new Service(transport());

    service.listen(function(err) {
      assert.ifError(err);
      service.stop(function(err) {
        assert.equal(err, _err);
        done();
      });
    });

  });

  it("$htMultiCall should return last result when called with multiple calls", function(done) {

    let service = new Service();

    service.on("method1", s.Object({ strict: false }), function(data, callback) {
      assert.deepEqual(data, _data);
      return callback(null, _data2);
    });

    service.on("method2", s.Object({ strict: false }), function(data, callback) {
      assert.deepEqual(data, _data2);
      return callback(null, _data3);
    });

    service.on("method3", s.Object({ strict: false }), function(data, callback) {
      assert.deepEqual(data, _data3);
      return callback(null, _data4);
    });

    service.call("$htMultiCall", [
      { method: "method1", data: _data },
      { method: "method2" },
      { method: "method3" }
    ], function(err, response) {

      assert.ifError(err);
      assert.deepEqual(response, _data4);
      done();

    });

  });

  it("$htMultiCall should be able to override data for certain calls", function(done) {

    let service = new Service();

    service.on("method1", s.Object({ opt: true }), function(data, callback) {
      assert.deepEqual(data, null);
      return callback(null, _data);
    });

    service.on("method2", s.Object({ strict: false }), function(data, callback) {
      assert.deepEqual(data, _data);
      return callback(null, _data2);
    });

    service.call("$htMultiCall", [
      { method: "method1" },
      { method: "method2", data: _data }
    ], function(err, response) {

      assert.ifError(err);
      assert.deepEqual(response, _data2);
      done();

    });

  });

  it("$htMultiCall should return with unknown-method if called with an unknown method", function(done) {

    let service = new Service();

    service.call("$htMultiCall", [
      { method: "unknown" }
    ], function(err) {
      assert.deepEqual(err, {
        error: {
          error:  "unknown-method",
          method: "unknown"
        },
        method: "unknown"
      });
      done();
    });

  });

});

function mockTransport(fns) {
    if(!fns) fns = {};
    let ok = function(done) { done(); };
    let server = function() {};
    let client = function() {};
    server.prototype.listen     = fns.listen     || ok;
    server.prototype.stop       = fns.stop       || ok;
    client.prototype.connect    = fns.connect    || ok;
    client.prototype.disconnect = fns.disconnect || ok;
    client.prototype.call       = fns.call || function(method, data, callback) {
        callback(null, data);
    };
    let transport = function() {
        return {
            Client: client,
            Server: server
        };
    };
    return transport;
}
