
"use strict";

const assert = require("assert");

const Client = require("../lib/client");

describe("Client", function() {

    it("should add initial services on created", function() {

        let called = 0;

        let services = {
            hello: { Client() { called++; } },
            world: { Client() { called++; } }
        }

        let client = new Client(services);

        assert.equal(called, Object.keys(services).length);

    });

    it("should connect transports", function(done) {
        let services = {
            "test1": mockTransport()({}),
            "test2": mockTransport()({})
        }
        let client = new Client(services);
        let connected = { test1: false, test2: false };
        client.on("connected", function(name) {
            connected[name] = true;
            let num = 0;
            for(let service in connected) {
                if(connected[service]) num++;
            }
            if(num == Object.keys(connected).length) done();
        });
        client.connect(function(err) {
            assert.ifError(err);
        });
    });

    it("should be able to call methods", function(done) {
        let services = {
            "test1": mockTransport()({}),
            "test2": mockTransport()({})
        }
        let client = new Client(services);
        let called = { method1: false, method2: false };
        client.on("called", function(service, method) {
            called[method] = true;
            let num = 0;
            for(let call in called) {
                if(called[call]) num++;
            }
            if(num == Object.keys(called).length) done();
        });
        Object.keys(called).forEach(function(method) {
            client.call(firstKey(services), method, { a: method }, function(err, data) {
                assert.ifError(err);
                assert.deepEqual(data, { a: method });
            });
        });
    });

    it("should throw when adding duplicate service name", function() {
        let services = {
            "test1": mockTransport()({}),
            "test2": mockTransport()({})
        }
        let client = new Client(services);
        assert.throws(function() {
            client.add(firstKey(services), mockTransport());
        });
    });

    it("should be able to add new service", function() {
        let services = {
            "test1": mockTransport()({}),
            "test2": mockTransport()({})
        }
        let client = new Client(services);
        let countBefore = Object.keys(client.connections).length;
        client.add("test3", mockTransport()({}));
        assert.equal(Object.keys(client.connections).length, countBefore+1);
    });

    it("should call connect on all services passed into client", function(done) {

        let called = 0;

        let fn = { Client() { return { connect(done) { called++; done() } } } };

        let services = {
            test1: fn,
            test2: fn,
            test3: fn
        }

        let client = new Client(services);

        client.connect(function(err) {
            assert.ifError(err);
            assert.equal(called, Object.keys(services).length);
            done();
        });

    });


    it("should call disconnect on all services passed into client", function(done) {

        let called = 0;

        let fn = { Client() { return { disconnect(done) { called++; done() } } } };

        let services = {
            test1: fn,
            test2: fn,
            test3: fn
        }

        let client = new Client(services);

        client.disconnect(function(err) {
            assert.ifError(err);
            assert.equal(called, Object.keys(services).length);
            done();
        });

    });

});

function mockTransport(fns) {
    if(!fns) fns = {};
    let ok = function(done) { done(); };
    let service = function() {};
    let client = function() {};
    service.prototype.listen    = ok;
    service.prototype.stop      = ok;
    client.prototype.connect    = ok;
    client.prototype.disconnect = ok;
    client.prototype.call = function(method, data, callback) {
        callback(null, data);
    };
    let transport = function() {
        return {
            Client:  client,
            Service: service
        };
    };
    return transport;
}

function firstKey(obj) {
    for(let k in obj) return k;
}