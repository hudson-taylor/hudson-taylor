
"use strict";

const assert = require("assert");

const LOCAL = require("../../lib/transports/local");

describe("Local Transport", function() {

  let transport;

  describe("Transport", function() {

    it("should create transport instance", function() {

      transport = new LOCAL();

      assert.equal(transport instanceof LOCAL, true);

    });

    it("should call fn when request is received", function(done) {

      let _method = "echo";
      let _data   = { hello: "world" };

      let _server = new transport.Server(function(method, data, callback) {
        assert.equal(method, _method);
        assert.deepEqual(data, _data);
        callback(null, data);
      });

      let _client = new transport.Client();

      _client.call(_method, _data, function(err, response) {
        assert.ifError(err);
        assert.deepEqual(response, _data);
        done();
      });

    });

  });

});