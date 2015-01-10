
"use strict";

const assert = require("assert");
const net    = require("net");

const openport   = require("openport");
const request    = require("request");
const express    = require("express");
const bodyParser = require("body-parser");

const HTTP = require("../../lib/transports/http");

describe("HTTP Transport", function() {

	let transport, port, host = "127.0.0.1";

	before((done) => {

		openport.find(function(err, _port) {
			assert.ifError(err);
			port = _port;
			done();
		});

	});

	describe("Transport", function() {

		it("should create transport instance", function() {

			transport = new HTTP({ port, host });

			assert.equal(transport instanceof HTTP, true);

		});

	});

	describe("Server", function() {

		let server;

		it("should have created server", function() {
			server = new transport.Server();
			assert.equal(server instanceof transport.Server, true);
		});

		it("should start server when listen is called", function(done) {

			server.listen(function(err) {
				assert.ifError(err);

				assert.equal(server.listening, true);

				done();

			});

		});

		it("should not try and start another server if listen is called again", function(done) {

			server.listen(function(err) {
				assert.ifError(err);
				done();
			});

		});

		it("should stop server when stop is called", function(done) {

			server.stop(function(err) {
				assert.ifError(err);

				assert.equal(server.listening, false);

				done();

			});

		});

		it("should still call callback if server is not listening", function(done) {

			server.stop(function(err) {
				assert.ifError(err);

				done();

			});

		});

		it("should call fn when request is received", function(done) {

			let _method = "echo";
			let _data   = { hello: "world" };

			server = new transport.Server(function(method, data, callback) {
				assert.equal(method, _method);
				assert.deepEqual(data, _data);
				callback(null, _data);
			});

			server.listen(function(err) {
				assert.ifError(err);

				request({
            url:    "http://" + host + ":" + port + "/ht",
            method: "POST",
            json:   { method: _method, args: _data }
        }, function(e, r, body) {
            assert.ifError(e);
            assert.deepEqual(body, _data);
           	server.stop(done);
        });

			});

		});

		it("should return error if fn does", function(done) {

			let _err = "err!";

			server = new transport.Server(function(method, data, callback) {
				return callback(_err);
			});

			server.listen(function(err) {
				assert.ifError(err);

				request({
					url:    "http://" + host + ":" + port + "/ht",
					method: "POST",
					json:   {}
				}, function(e, r, body) {
					assert.ifError(e);
					
					assert.equal(body.error, _err);

					server.stop(done);

				});

			});

		});

	});

	describe("Client", function() {

		it("should have created client", function() {
			let client = new transport.Client();
			assert.equal(client instanceof transport.Client, true);
		});

		it("should provide noop'd versions of unused methods", function() {

			let noop = () => {};

			let client = new transport.Client();

			client.connect(noop);
			client.disconnect(noop);

		});

		it("should be able to call method", function(done) {

			let _method = "hello";
			let _data   = { something: "world" };

			let app = express();
			app.use(bodyParser.json());
			app.post("/ht", function(req, res) {
				let { method, args } = req.body;
				assert.equal(method, _method);
				assert.deepEqual(args, _data);
				res.json(_data);
			});

			let client = new transport.Client();

			let _server = app.listen(port, host, function() {
				client.call(_method, _data, function(err, response) {
					assert.ifError(err);
					assert.deepEqual(response, _data);
					_server.close(done);
				});
			});

		});

		it("should return error if request cannot be made", function(done) {

			let client = new transport.Client();

			client.url = "http://127.0.0.1:1/";

			client.call("", {}, function(err) {

				assert.equal(err.errno, "ECONNREFUSED");

				done();

			});

		});

		it("should generate correct url when custom endpoint is set", function() {

			let _path = "/custom";

			let transport = new HTTP({
				port,
				host,
				path: "/custom"
			});

			let client = new transport.Client();

			assert.equal(client.url, "http://" + host + ":" + port + _path);

		});

		it("should generate correct url when SSL is enabled", function() {

			let transport = new HTTP({
				port,
				host,
				ssl: true 
			});

			let client = new transport.Client();

			assert.equal(client.url, "https://" + host + ":" + port + "/ht");

		});

	});

});