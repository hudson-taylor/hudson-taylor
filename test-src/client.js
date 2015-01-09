
"use strict";

const assert = require("assert");

const Client = require("../lib/client");

const _data = {
    hello: "world"
};

const _data2 = {
    something: "else"
};

const _data3 = {
    even: "more"
};

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

    it("should allow adding middleware", function() {

        let client = new Client({});

        client.before(() => {});
        client.after(() => {});

    });

    it("should call all before middleware before passed into transport", function(done) {

        let services = {
            test1: mockTransport({
                call(method, data, callback) {
                    assert.notDeepEqual(data, _data);
                    assert.deepEqual(data, _data3);
                    done();
                }
            })()
        }

        let client = new Client(services);

        client.before(function(data, callback) {
            assert.deepEqual(data, _data);
            return callback(null, _data2);
        });

        client.before(function(data, callback) {
            assert.deepEqual(data, _data2);
            return callback(null, _data3);
        })

        client.call("test1", "", _data, function(err) {
            assert.ifError(err);
        });

    });

    it("should call all after before result is given back to client", function(done) {

        let services = {
            test1: mockTransport({
                call(method, data, callback) {
                    assert.deepEqual(data, {});
                    return callback(null, _data);
                }
            })()
        };

        let client = new Client(services);

        client.after(function(data, callback) {
            assert.deepEqual(data, _data);
            return callback(null, _data2);
        });

        client.after(function(data, callback) {
            assert.deepEqual(data, _data2);
            return callback(null, _data3);
        });

        client.call("test1", "", {}, function(err, result) {
            assert.ifError(err);
            assert.deepEqual(result, _data3);
            done();
        });

    });

    it("should be able to mix middleware", function(done) {

        let services = {
            test1: mockTransport({
                call(method, data, callback) {
                    assert.deepEqual(data, _data);
                    return callback(null, _data2);
                }
            })()
        }

        let client = new Client(services);

        client.before(function(data, callback) {
            assert.deepEqual(data, {});
            return callback(null, _data);
        });

        client.after(function(data, callback) {
            assert.deepEqual(data, _data2);
            return callback(null, _data3);
        });

        client.call("test1", "", {}, function(err, response) {
            assert.ifError(err);
            assert.deepEqual(response, _data3);
            done();
        });

    });

    it("should only call middleware for matching services", function(done) {

        let services = {
            test1: mockTransport({
                call(method, data, callback) {
                    assert.deepEqual(data, _data);
                    return callback(null, data);
                }
            })(),
            test2: mockTransport({
                call(method, data, callback) {
                    return callback(null, data);
                }
            })()
        };

        let client = new Client(services);

        client.before(function(data, callback) {
            assert.deepEqual(data, {});
            return callback(null, _data);
        }, {
            service: "test1"
        });

        client.after(function(data, callback) {
            assert.deepEqual(data, {});
            return callback(null, _data2);
        }, {
            service: "test2"
        });

        client.call("test1", "echo", {}, function(err, response) {
            assert.ifError(err);

            assert.deepEqual(response, _data);

            client.call("test2", "echo", {}, function(err, response) {
                assert.ifError(err);

                assert.deepEqual(response, _data2);

                done();

            });

        });

    });

    it("should only call middleware for matching methods", function(done) {

        let services = {
            test1: mockTransport({
                call(method, data, callback) {
                    assert.deepEqual(data, _data);
                    return callback(null, data);
                }
            })(),
            test2: mockTransport({
                call(method, data, callback) {
                    return callback(null, data);
                }
            })()
        };

        let client = new Client(services);

        client.before(function(data, callback) {
            assert.deepEqual(data, {});
            return callback(null, _data);
        }, {
            service: "test1",
            method:  "echo"
        });

        client.after(function(data, callback) {
            assert.deepEqual(data, {});
            return callback(null, _data2);
        }, {
            service: "test2",
            method:  "wrongMethodName"
        });

        client.call("test1", "echo", {}, function(err, response) {
            assert.ifError(err);

            assert.deepEqual(response, _data);

            client.call("test2", "echo", {}, function(err, response) {
                assert.ifError(err);

                assert.deepEqual(response, {});

                done();

            });

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
    let server = function() {};
    let client = function() {};
    server.prototype.listen     = fns.listen     || ok;
    server.prototype.stop       = fns.stop       || ok;
    client.prototype.connect    = fns.connect    || ok;
    client.prototype.disconnect = fns.disconnect || ok;
    client.prototype.call       = fns.call || function(method, data, callback) {
        callback(null, data);
    };
    let transport = function() {
        return {
            Client: client,
            Server: server
        };
    };
    return transport;
}

function firstKey(obj) {
    for(let k in obj) return k;
}