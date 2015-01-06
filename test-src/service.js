
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
    let _MockTransport2 = { Server() { return { listen(done) { called++; done(); } } } };

    let transports = [ _MockTransport2, _MockTransport2, _MockTransport2 ];

    let service = new Service(transports);

    service.listen(function(err) {
      assert.ifError(err); // This can't happen.. shrug
      assert.equal(called, transports.length);
      done();
    });

  });

  it("should call stop function on all transports", function(done) {

    let called = 0;
    let _MockTransport3 = { Server() { return { stop(done) { called++; done(); } } } };

    let transports = [ _MockTransport3, _MockTransport3 ];

    let service = new Service(transports);

    service.stop(function(err) {
      assert.ifError(err); // This can't happen.. shrug
      assert.equal(called, transports.length);
      done();
    });

  });

});
