
"use strict";

const assert = require('assert');
const s      = require('ht-schema');

const Service = require('../lib/service');

describe("Service", function() {

  let _MockTransport = { Server() { } };
  
  it("should allow passing single transport", function() {

    let service = new Service(_MockTransport);

    assert.equal(service._servers.length, 1);

  });

  it("should allow passing multiple transports", function() {

    [ 1, 5, 10 ].forEach(function(n) {

      let transports = [];

      for(let i = 0; i < n; i++) {
        transports.push(_MockTransport);
      }

      let service = new Service(transports);

      assert.equal(service._servers.length, n);

    });

  });

  it("should allow listening for methods", function() {

    let service = new Service(_MockTransport);

    assert.equal(typeof service.on, "function");

    assert.doesNotThrow(function() {
      service.on("something", s.Object({ strict: false }), (req, done) => { done() });
      service.on("somethingelse", (req, done) => { done() });
    });

  });

  it("should call listen function on all transports", function(done) {

    let called = 0;
    let _MockTransport = { Server() { return { listen(done) { called++; done(); } } } };

    let transports = [ _MockTransport, _MockTransport, _MockTransport ];

    let service = new Service(transports);

    service.listen(function(err) {
      assert.ifError(err); // This can't happen.. shrug
      assert.equal(called, transports.length);
      done();
    });

  });

  it("should allow adding middleware", function() {

    let _MockTransport = { Server() { return { listen(done) { called++; done(); } } } };

    let service = new Service(_MockTransport);

    service.before(() => {});
    service.after(() => {});

  });

  it("should call all before middleware before method handler is called", function(done) {

    let _data = {
      hello: "world"
    };

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

  it("should call all after middlware before result is sent to transport", function(done) {

    let _data = {
      hello: "world"
    };

    let _data2 = {
      something: "else"
    };

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

  it("should call stop function on all transports", function(done) {

    let called = 0;
    let _MockTransport = { Server() { return { stop(done) { called++; done(); } } } };

    let transports = [ _MockTransport, _MockTransport ];

    let service = new Service(transports);

    service.stop(function(err) {
      assert.ifError(err); // This can't happen.. shrug
      assert.equal(called, transports.length);
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
