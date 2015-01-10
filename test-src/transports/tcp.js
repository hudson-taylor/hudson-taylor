
"use strict";

const assert = require("assert");
const net    = require("net");

const openport = require("openport");

const TCP = require("../../lib/transports/tcp");

describe("TCP Transport", function() {

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

			transport = new TCP({ port, host });

			assert.equal(transport instanceof TCP, true);

		});

	});

	describe("Server", function() {

		let server;

		it("should have created server", function() {
			server = new transport.Server();
			assert.equal(server instanceof transport.Server, true);
		});

		it("should return error if server cannot bind to port", function(done) {

			let netServer = net.createServer(() => {});

			netServer.listen(port, host, function(err) {
				assert.ifError(err);

				let server = new transport.Server();

				server.listen(function(err) {

					assert.equal(err.errno, "EADDRINUSE");

					netServer.close(done);

				});

			});

		});

		it("should start server when listen is called", function(done) {

			server.listen(function(err) {
				assert.ifError(err);

				assert.equal(server.server.address().port, port);
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

		it("should return error if there was a problem stopping server", function(done) {

			// Pull server instance off so we can replace
			// it and restore it later.
			let __server = server.server;

			let _err = "error oh no";

			server.server = {
				close(cb) {
					cb(_err);
				}
			};

			server.stop(function(err) {

				assert.equal(err, _err);

				// Restore server instance
				server.server = __server;

				done();

			});

		});

		it("should stop server successfully when stop is called", function(done) {

			server.stop(function(err) {
				assert.ifError(err);

				assert.equal(server.server.address(), null);
				assert.equal(server.listening, false);

				done();

			});

		});

		it("should call callback even if not listening when stop is called", function(done) {

			server.stop(function(err) {
				assert.ifError(err);
				done();
			});

		});

		it("should call fn when request is received", function(done) {

			let _method = "echo";
			let _data   = { hello: "world" };
			let _data2  = { something: "else" };

			server = new transport.Server(function(method, data, callback) {
				assert.equal(method, _method);
				assert.deepEqual(data, _data);
				callback(null, _data2);
			});

			server.listen(function(err) {
				assert.ifError(err);

				let request = JSON.stringify({
					id:   1,
					name: _method,
					data: _data
				});

				let clientSocket = net.createConnection(port, host);
				clientSocket.setEncoding("utf8");
				clientSocket.write(request);

				clientSocket.on("data", function(_response) {
					clientSocket.end();
					let response = JSON.parse(_response);
					assert.ifError(response.error);
					assert.deepEqual(response.data, _data2);
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

		it("should return error if not connected", function(done) {

			let client = new transport.Client();

			client.call("method", {}, function(err) {

				assert.deepEqual(err.error, "disconnected");

				done();

			});

		});

		it("should create connection when connect is called", function(done) {

			let netServer = net.createServer(function(socket) {
				socket.end();
				netServer.close(done);
			});

			let client = new transport.Client();

			netServer.listen(port, host, function(err) {
				assert.ifError(err);
				client.connect(function(err) {
					assert.ifError(err);
				});
			});

		});

		it("should be able to call method", function(done) {

			let _method = "hello";
			let _data   = { something: "world" };

			let netServer = net.createServer(function(socket) {
				socket.setEncoding("utf8");
				socket.on("data", function(_data) {
					var data = JSON.parse(_data);
					socket.end(JSON.stringify({
						id:    data.id,
						data:  data.data,
						error: null
					}));
				});
			});

			let client = new transport.Client();

			netServer.listen(port, host, function(err) {
				assert.ifError(err);
				client.connect(function(err) {
					assert.ifError(err);
					client.call(_method, _data, function(err, response) {
						assert.ifError(err);
						assert.deepEqual(response, _data);
						netServer.close(done);
					});
				});
			});

		});

		it("should drop unknown responses from server", function(done) {

			let netServer = net.createServer(function(socket) {
				socket.end(JSON.stringify({
					id:    "invalid",
					error: null,
					data:  {}
				}));
			});

			let client = new transport.Client();

			netServer.listen(port, host, function(err) {
				assert.ifError(err);

				client.connect(function(err) {
					assert.ifError(err);
				
					client.call("", {}, function(err) {
						assert.fail(null, null, "should not have called callback");
					});

					setTimeout(function() {
						netServer.close(done);
					}, 50);

				});
				
			});

		});

		it("should return error if server does", function(done) {

			let _err = "err!";

			let netServer = net.createServer(function(socket) {
				socket.setEncoding("utf8");
				socket.on("data", function(_data) {
					var data = JSON.parse(_data);
					socket.end(JSON.stringify({
						id:    data.id,
						data:  null,
						error: _err
					}));
				});
			});

			let client = new transport.Client();

			netServer.listen(port, host, function(err) {
				assert.ifError(err);

				client.connect(function(err) {
					assert.ifError(err);
				
					client.call("", {}, function(err) {
						
						assert.equal(err, _err);

						netServer.close(done);

					});

				});
				
			});

		});

		it("should disconnect connection when disconnect is called", function(done) {

			let netServer = net.createServer(function(socket) {
				socket.on('end', function() {
					netServer.close(done);
				});
			});

			let client = new transport.Client();

			netServer.listen(port, host, function(err) {
				assert.ifError(err);
				client.connect(function(err) {
					assert.ifError(err);
					client.disconnect(function(err) {
						assert.ifError(err);
					});
				});
			});

		});

		it("should call disconnect callback even if not connected", function(done) {

			let client = new transport.Client();

			client.disconnect(function(err) {
				assert.ifError(err);
				done();
			});

		});

	});

});