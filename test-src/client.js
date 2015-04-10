
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

const _data4 = {
    more: "data"
};

const _err = new Error("oopsies!");

describe("Client", function() {

    describe("creation", function() {

        it("should add initial services on created", function() {

            let called = 0;

            let services = {
                hello: { Client() { called++; } },
                world: { Client() { called++; } }
            };

            let client = new Client(services);

            assert.equal(called, Object.keys(services).length);

        });

        it("should ignore prototypal variables in services object", function() {

            let _services = {
                x: 1 // invalid
            };

            let services = Object.create(_services);

            services.test1 = mockTransport()();

            let client = new Client(services);

            assert.equal(Object.keys(client.services).length, 1);

        });

    });

    describe("connect", function() {

        it("should connect transports", function(done) {
            let services = {
                "test1": mockTransport()({}),
                "test2": mockTransport()({})
            };
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

        it("should return error if transport returns error connecting", function(done) {

            let services = {
                "test1": mockTransport({
                    connect(cb) {
                        cb(_err);
                    }
                })()
            };

            let client = new Client(services);

            client.connect(function(err) {

                assert.equal(err.message, _err.message);

                done();

            });

        });

        it("should call connect on all services passed into client", function(done) {

            let called = 0;

            let fn = { Client() { return { connect(done) { called++; done(); } }; } };

            let services = {
                test1: fn,
                test2: fn,
                test3: fn
            };

            let client = new Client(services);

            client.connect(function(err) {
                assert.ifError(err);
                assert.equal(called, Object.keys(services).length);
                done();
            });

        });

    });

    describe("add", function() {

        it("should throw when adding duplicate service name", function() {
            let services = {
                "test1": mockTransport()({}),
                "test2": mockTransport()({})
            };
            let client = new Client(services);
            assert.throws(function() {
                client.add(firstKey(services), mockTransport());
            });
        });

        it("should be able to add new service", function() {
            let services = {
                "test1": mockTransport()({}),
                "test2": mockTransport()({})
            };
            let client = new Client(services);
            let countBefore = Object.keys(client.connections).length;
            client.add("test3", mockTransport()({}));
            assert.equal(Object.keys(client.connections).length, countBefore+1);
        });

    });

    describe("call", function() {

        it("should return error if calling unknown service", function(done) {

            let client = new Client({});

            client.call("invalid", "method", {}, function(err) {

                assert.equal(err.error, "unknown-service");

                done();

            });

        });

        it("should be able to call methods", function(done) {
            let services = {
                "test1": mockTransport()({}),
                "test2": mockTransport()({})
            };
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

        it("should pass result back to fn", function(done) {

            let services = {
                test1: mockTransport()()
            };

            let client = new Client(services);

            client.call("test1", "echo", _data2, function(err, response) {
                assert.ifError(err);
                assert.deepEqual(response, _data2);
                done();
            });

        });

        it("should return error if service does", function(done) {

            let services = {
                test1: mockTransport({
                    call(method, data, callback) {
                        return callback(_err);
                    }
                })()
            };

            let client = new Client(services);

            client.call("test1", "echo", _data, function(err) {
                assert.equal(err.message, _err.message);
                done();
            });

        });

        it("should allow optional function", function(done) {

            let services = {
                "s1": mockTransport({
                    call(method, data, callback) {
                        assert.deepEqual(data, _data);
                        callback();
                        setTimeout(done, 100);
                    }
                })()
            };

            let client = new Client(services);

            client.call("s1", "method", _data);

        });

        it("should allow optional data", function(done) {

            let services = {
                "s1": mockTransport({
                    call(method, data, callback) {
                        assert.equal(data, null);
                        callback(null, _data);
                    }
                })()
            };

            let client = new Client(services);

            client.call("s1", "method", function(err, response) {
                assert.ifError(err);
                assert.deepEqual(response, _data);
                done();
            });

        });

        it("should allow optional data & callback", function(done) {

            let services = {
                "s1": mockTransport({
                    call(method, data, callback) {
                        assert.equal(data, null);
                        callback();
                        setTimeout(done, 100);
                    }
                })()
            };

            let client = new Client(services);

            client.call("s1", "method");

        });

    });

    describe("middleware", function() {

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
            };

            let client = new Client(services);

            client.before(function(data, callback) {
                assert.deepEqual(data, _data);
                return callback(null, _data2);
            });

            client.before(function(data, callback) {
                assert.deepEqual(data, _data2);
                return callback(null, _data3);
            });

            client.call("test1", "", _data, function(err) {
                assert.ifError(err);
            });

        });

        it("should call all after middleware before result is given back to client", function(done) {

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
            };

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
                return callback(null, data);
            }, {
                method: "nope!"
            });
            
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

        it("should return error if middleware does (before)", function(done) {

            let services = {
                test1: mockTransport()()
            };

            let client = new Client(services);

            client.before(function(data, callback) {
                assert.deepEqual(data, _data);
                return callback(_err);
            });

            client.call("test1", "", _data, function(err) {

                assert.equal(err.message, _err.message);

                done();

            });

        });

        it("should return error if middleware does (after)", function(done) {

            let services = {
                test1: mockTransport()()
            };

            let client = new Client(services);

            client.after(function(data, callback) {
                assert.deepEqual(data, _data);
                return callback(_err);
            });

            client.call("test1", "", _data, function(err) {

                assert.equal(err.message, _err.message);

                done();

            });

        });

    });

    describe("disconnect", function() {

        it("should call disconnect on all services passed into client", function(done) {

            let called = 0;

            let fn = { Client() { return { disconnect(done) { called++; done(); } }; } };

            let services = {
                test1: fn,
                test2: fn,
                test3: fn
            };

            let client = new Client(services);

            client.disconnect(function(err) {
                assert.ifError(err);
                assert.equal(called, Object.keys(services).length);
                done();
            });

        });

        it("should return error if transport returns error disconnecting", function(done) {

            let _err = new Error("oops");

            let services = {
                "test1": mockTransport({
                    disconnect(cb) {
                        cb(_err);
                    }
                })()
            };

            let client = new Client(services);

            client.disconnect(function(err) {

                assert.equal(err.message, _err.message);

                done();

            });

        });

    });

    describe("remote", function() {

        it("should support using 'remote' instead of 'call' for HT1.x compatibility", function(done) {

            let services = {
              s1: mockTransport()()
            };

            let client = new Client(services);

            client.remote("s1", "method", _data, function(err, response) {
              assert.ifError(err);
              assert.deepEqual(response, _data);
              done();
            });

        });

    });

    describe("prepare", function() {

        it("should be able to prepare a query and execute it after", function(done) {

            let services = {
                s1: mockTransport({
                    call(method, data, callback) {
                        assert.deepEqual(data, _data);
                        callback(null, _data2);
                    }
                })()
            };

            let client = new Client(services);

            let prepared = client.prepare("s1", "method", _data);

            prepared(function(err, data) {
                assert.ifError(err);
                assert.deepEqual(data, _data2);
                prepared(function(err, data2) {
                    assert.ifError(err);
                    assert.deepEqual(data2, _data2);
                    done();
                });
            });

        });

    });

    describe("chain", function() {

        it("should be able to chain calls", function(done) {

            let services = {
                s1: mockTransport({
                    call(method, data, callback) {
                        switch(method) {
                            case "$htMultiCall": {
                                assert.deepEqual(data, [
                                    {
                                        method: "method1",
                                        data: _data
                                    },
                                    {
                                        method: "method2"
                                    },
                                    {
                                        method: "method3"
                                    }
                                ]);
                                return callback(null, _data4);
                            }
                        }
                    }
                })()
            };

            let client = new Client(services);

            client.chain("s1", "method1", _data)
                .chain("s1", "method2")
                .chain("s1", "method3")
                .end(function(err, result) {
                    assert.ifError(err);
                    assert.deepEqual(result, _data4);
                    done();
                });

        });

        it("should be able to override data for certain calls", function(done) {

            let services = {
                s1: mockTransport({
                    call(method, data, callback) {
                        switch(method) {
                            case "$htMultiCall": {
                                assert.deepEqual(data, [
                                    {
                                        method: "method1",
                                        data: _data
                                    },
                                    {
                                        method: "method2",
                                        data: _data4
                                    }
                                ]);
                                return callback(null, _data3);
                            }
                        }
                    }
                })()
            };

            let client = new Client(services);

            client.chain("s1", "method1", _data)
                .chain("s1", "method2", _data4)
                .end(function(err, result) {
                    assert.ifError(err);
                    assert.deepEqual(result, _data3)
                    done();
                });

        });

        it("should successfully be able to call methods on multiple services", function(done) {

            let str    = "hello world";
            let strRev = "dlrow olleh";

            let services = {
                s1: mockTransport({
                    call(method, data, callback) {
                        assert.equal(data[0].data, str);
                        return callback(null, data[0].data);
                    }
                })(),
                s2: mockTransport({
                    call(method, data, callback) {
                        // reverse
                        assert.equal(data[0].data, str);
                        return callback(null, data[0].data.split("").reverse().join(""));
                    }
                })()
            };

            let client = new Client(services);

            client.chain("s1", "echo", str).chain("s2", "reverse").end(function(err, response) {
                assert.ifError(err);
                assert.deepEqual(response, strRev);
                done();
            });

        });

        it("should be return immediately if service or method doesn't exist", function(done) {

            let client = new Client({});

            client.chain("s1", "method")
                .end(function(err, result) {
                    assert.deepEqual(err, {
                        service: "s1",
                        method: "$htMultiCall",
                        error: {
                            error: "unknown-service"
                        }
                    });
                    assert.equal(result, undefined);
                    done();
                });

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