
"use strict";

const assert = require("assert");

const express    = require("express");
const bodyParser = require("body-parser");
const supertest  = require("supertest");

const Service    = require("../lib/service");
const Client     = require("../lib/client");
const Transports = require("../lib/transports");
const utils      = require("../lib/utils");
const s          = require("ht-schema");

describe("Utilities", function() {
    
    describe("Express Proxy", function() {

        let transport, service, client, app, request;

        before(function() {

            transport = new Transports.Local();
            service   = new Service(transport);

            service.on("data", s.Object({opt:true, strict:false}), function(data, callback) {
                return callback(null, { body: data });
            });

            service.on("emitError", function(data, callback) {
                return callback("oops");
            });

            client = new Client({
                s: transport
            });

            app = express();
            app.use(bodyParser.json());

            request = supertest(app);

        });

        describe("it should gather payload properly", function() {

          it("body", function(done) {

            var req = {
              body: {
                a: 5
              }
            };

            let client = {
              call(service, method, data, callback) {
                assert.deepEqual(data, {
                  a: 5
                });
                done();
              }
            };

            utils.expressProxy(client, "", "")(req);

          });

          it("params", function(done) {

            var req = {
              params: {
                b: 10
              }
            };

            let client = {
              call(service, method, data, callback) {
                assert.deepEqual(data, {
                  b: 10
                });
                done();
              }
            };

            utils.expressProxy(client, "", "")(req);

          });

          it("query", function(done) {

            var req = {
              query: {
                c: 15
              }
            };

            let client = {
              call(service, method, data, callback) {
                assert.deepEqual(data, {
                  c: 15
                });
                done();
              }
            };

            utils.expressProxy(client, "", "")(req);

          });

          it("should merge properly", function(done) {

              let req = {
                  body: {
                      a: 5
                  },
                  params: {
                      a: 10,
                      b: 15
                  },
                  query: {
                      a: 20,
                      b: 25,
                      c: 30
                  }
              };

              let merged = {
                  a: 5,
                  b: 15,
                  c: 30
              };

              let client = {
                  call(service, method, data, callback) {
                      assert.deepEqual(data, merged);
                      done();
                  }
              };

              utils.expressProxy(client, "", "")(req);

          });

        });

        it("should add middleware properly", function() {

            let fn    = utils.expressProxy(client, "s", "data");
            let errFn = utils.expressProxy(client, "s", "emitError");

            app.post("/test", fn);
            app.get("/test", fn);
            app.post("/error", errFn);

        });

        it("should request with GET query params", function(done) {

            request.get("/test?hello=world")
            .end(function(err, res) {
                assert.ifError(err);

                assert.deepEqual(res.body, { body: { hello: "world" } });

                done();

            });

        });

        it("should request with POST body", function(done) {

            let data = { hello: "world" };

            request.post("/test")
            .send(data)
            .end(function(err, res) {
                assert.ifError(err);

                assert.deepEqual(res.body, { body: data });

                done();

            });

        });

        it("should return 500 if service returns error", function(done) {

            let data = { hello: "world" };

            request.post('/error')
            .send(data)
            .end(function(err, res) {
              assert.ifError(err);

              assert.equal(res.statusCode, 500);
              assert.deepEqual(res.body, {
                error: "oops"
              });

              done();

            });

        });

    });

    describe("merge", function() {

        it("should merge", function() {

            var data1 = { a: 5         };
            var data2 = { a: 15, b: 10 };

            var result = utils.merge(data1, data2);

            assert.deepEqual(result, {
                a: data1.a,
                b: data2.b
            });

        });

    });

    describe("formatError", function() {

        it("should return object", function() {

            let str = "err1234";

            let data = utils.formatError(str);

            assert.deepEqual(data, {
                error: str
            });

        });

        it("should convert Error instance to object", function() {

            let str = "err1234";

            let err = new Error(str);

            let data = utils.formatError(err);

            assert.deepEqual(data, {
                error: str
            });

            let err2 = new Error();

            let data2 = utils.formatError(err2);

            assert.deepEqual(data2, {
                error: "Error"
            });

        });

        it("should not do anything if data has an error variable", function() {

            let _data = {
                error: "something"
            };

            let data = utils.formatError(_data);

            assert.deepEqual(data, _data);

        });

    });

});
