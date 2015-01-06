
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

            client = new Client({
                s: transport
            });

            app = express();
            app.use(bodyParser.json());

            request = supertest(app);

        });

        it("should add middleware properly", function() {

            let fn = utils.expressProxy(client, "s", "data");

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

            let data = { hello: "world" };

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
