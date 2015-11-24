
"use strict";

const assert = require("assert");
const net    = require("net");
const https  = require("https");

const openport   = require("openport");
const request    = require("request");
const express    = require("express");
const bodyParser = require("body-parser");

const HTTP = require("../../lib/transports/http");

const SSLKeys = require("../fixtures/sslkeys");

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

		it("should throw if required arguments are not passed in", function() {

			assert.throws(function() {
				let transport = new HTTP();
			});

			assert.throws(function() {
				let transport = new HTTP({
					host: "0.0.0.0"
				});
			});

			assert.throws(function() {
				let transport = new HTTP({
					port: 80
				});
			});

		});

		it("should set defaults correctly", function() {

			let transport = new HTTP({
				port,
				host
			});

			assert.equal(transport.config.ssl, false);
			assert.equal(transport.config.path, "/ht");

			transport = new HTTP({
				port,
				host,
				ssl: true,
				path: "/other"
			});

			assert.equal(transport.config.ssl, true);
			assert.equal(transport.config.path, "/other");

		});

		it("should not require new keyword for creation", function() {

			let transport = HTTP({ port, host });

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

		it("should enable HTTPS if SSL options are specified", function(done) {

			let _method = "something";
			let _data = { hello: "world" };

			let { cert, key, ca } = SSLKeys;

			let transport =	new HTTP({
				port,
				host,
				ssl: {
					cert,
					key,
					ca:                 [ ca ],
					agent: 							false,
					rejectUnauthorized: false
				}
			});

			let server = new transport.Server(function(method, data, callback) {
				return callback(null, data);
			});

			assert.equal(server.config.ssl.cert, SSLKeys.cert);

			server.listen(function(err) {
				assert.ifError(err);

				// This needs to be set or else http.request will
				// throw an error because we're using self signed
				// certificates..
				process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

				request({
					url:    "https://" + host + ":" + port + "/ht",
					method: "POST",
					json:   { method: _method, args: _data }
				}, function(e, r, body) {
					assert.ifError(e);

					assert.equal(body.hello, _data.hello);

					server.stop(done);

				});

			});

		});

		it("should stringify error if needed", function(done) {

			let _errmsg = "hello world error";

			server = new transport.Server(function(method, data, callback) {
				callback(new Error(_errmsg));
			});

			server.listen(function(err) {
				assert.ifError(err);

				request({
					url:    "http://" + host + ":" + port + "/ht",
					method: "POST",
					json:   { method: "blah", args: "blah" }
				}, function(e, r, body) {
					assert.ifError(e);
					assert.deepEqual(body.error, _errmsg);
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

		it("should enable HTTPS if SSL options are specified", function(done) {

			let _method = "hello";
			let _data   = { something: "world" };

			let app = express();
			app.use(bodyParser.json());
			app.post("/ht", function(req, res) {
				let { method, args } = req.body;
				assert.equal(req.secure, true);
				assert.equal(method, _method);
				assert.deepEqual(args, _data);
				res.json(_data);
			});

			let transport = new HTTP({
				host,
				port,
				ssl: true
			});

			let client = new transport.Client();

			let _app = https.createServer(SSLKeys, app);

			_app.listen(port, host, function() {
				client.call(_method, _data, function(err, response) {
					assert.ifError(err);
					assert.deepEqual(response, _data);
					_app.close(done);
				});
			});

		});

		it("should return error if response is not valid JSON", function(done) {

			let app = express();
			app.use(bodyParser.json());
			app.post("/ht", function(req, res) {
				res.end('hello');
			});

			let client = new transport.Client();

			let _server = app.listen(port, host, function() {
				client.call('a', 'b', function(err) {
					assert.equal(err.toString(), "SyntaxError: Unexpected token h");
					_server.close(done);
				});
			});

		});

	});

});