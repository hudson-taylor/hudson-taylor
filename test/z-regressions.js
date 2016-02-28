
"use strict";

const assert = require("assert");

const s = require('ht-schema');

let ht = {};

ht.Service    = require('../src/service');
ht.Client     = require('../src/client');
ht.Transports = require('../src/transports');

const _data = { hello: 'world' };

describe("Regressions", function() {

    it("multiple local transports should work", function(done) {

        var t1 = new ht.Transports.Local();
        var t2 = new ht.Transports.Local();

        var s1 = new ht.Service(t1);
        var s2 = new ht.Service(t2);

        s1.on('m1', function(data, callback) {
            return callback(null, data);
        });

        s2.on('m2', function(data, callback) {
            return callback(null, data);
        });

        var client = new ht.Client({
            s1: t1,
            s2: t2
        });

        client.call('s1', 'm1', _data, function(err, response) {
            assert.ifError(err);

            assert.deepEqual(response, _data);

            client.call('s2', 'm2', _data, function(err, response) {
                assert.ifError(err);

                assert.deepEqual(response, _data);

                done();

            });

        });

    });

    it("passing an error as return result should return", function(done) {

        var transport = new ht.Transports.Local();

        var service = new ht.Service(transport);

        var _errMsg = "error1234";

        service.on("error", function(data, callback) {
            return callback(_errMsg);
        });

        var client = new ht.Client({
            s: transport
        });

        client.call('s', 'error', {}, function(err) {
            assert.equal(err.error, _errMsg);
            done();
        });

    });

    it("schema validation & manipulation should work", function(done) {

        var transport = new ht.Transports.Local();

        var service = new ht.Service(transport);

        service.on("validate", s.Object({
            string: s.String(),
            defaults: s.Number({ default: 50 })
        }), function(data, callback) {
            return callback(null, data);
        });

        var client = new ht.Client({
            s: transport
        });

        client.call('s', 'validate', {
            string: 'hello world'
        }, function(err, response) {
            assert.ifError(err);
            assert.equal(response.string, "hello world");
            assert.equal(response.defaults, 50);
            done();
        });

    });

});