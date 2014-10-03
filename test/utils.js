
"use strict";

var assert = require("assert");

var express    = require("express");
var bodyParser = require("body-parser");
var supertest  = require("supertest");

var Service    = require("../lib/service");
var Client     = require("../lib/client");
var Transports = require("../lib/transports");
var utils      = require("../lib/utils");

describe("Utilities", function() {
    
    describe("Express Proxy", function() {

        var transport, service, client, app, request;

        before(function() {

            transport = new Transports.Local();
            service   = new Service(transport);

            service.on("data", {}, function(data, callback) {
                return callback(null, { body: data });
            });

            client = new Client({
                s: transport
            });

            app = express();
            app.use(bodyParser.json());

            request = supertest(app);

        });

        it("should add middleware properly", function() {

            var fn = utils.expressProxy(client, "s", "data");

            app.post("/test", fn);
            app.get("/test", fn);

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

            var data = { hello: "world" };

            request.post("/test")
                    .send(data)
                    .end(function(err, res) {

                        assert.ifError(err);

                        assert.deepEqual(res.body, { body: data });

                        done();

                    });

        });

    });

});