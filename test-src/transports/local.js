
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

    it("should provide noop'd versions of unused methods", function() {

      let noop = () => {};

      let _server = new transport.Server((method, data, callback) => {});
      let _client = new transport.Client();

      _server.listen(noop);
      _server.stop(noop);

      _client.connect(noop);
      _client.disconnect(noop);

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

    it("should ensure data is valid json", function(done) {

      let transport = new LOCAL();

      let _server = new transport.Server(function(method, data, callback) {
        assert.equal(typeof data.date, "string");
        callback(null, { date: new Date() });
      });

      let _client = new transport.Client();

      _client.call("something", { date: new Date() }, function(err, response) {
        assert.ifError(err);
        assert.equal(typeof response.date, "string");
        done();
      });

    });

    it("should ensure error is valid json", function(done) {

      let transport = new LOCAL();

      let _data = {};
      _data.data = _data;

      let _server = new transport.Server((method, data, callback) => {});
      let _client = new transport.Client();

      _client.call("something", _data, function(err) {
        assert.equal(err.error, 'Converting circular structure to JSON');
        done();
      });

    });

    it("should return error if fn does", function(done) {

      let transport = new LOCAL();

      let _err = "error!";

      let _server = new transport.Server(function(method, data, callback) {
        callback(_err);
      });

      let _client = new transport.Client();

      _client.call("something", {}, function(err) {
        assert.equal(err.error, _err);
        done();
      });

    });

    it("should return valid json if fn returns Error", function(done) {

      let transport = new LOCAL();

      let _err = new Error("oopsies");

      let _server = new transport.Server(function(method, data, callback) {
        callback(_err);
      });

      let _client = new transport.Client();

      _client.call("something", {}, function(err) {
        assert.equal(err.error, _err.message);
        done();
      }); 

    });

    it("should return valid json if fn returns invalid json", function(done) {

      let transport = new LOCAL();

      let _err = {};
      _err._err = _err;

      let _server = new transport.Server(function(method, data, callback) {
        callback(_err);
      });

      let _client = new transport.Client();

      _client.call("something", {}, function(err) {
        assert.equal(err.error, 'Converting circular structure to JSON');
        done();
      }); 

    });

  });

});