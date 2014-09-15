var assert = require('assert');

console.log(__dirname);

var Client = require('../client');

var services = {
    "test1": mockTransport()({}),
    "test2": mockTransport()({})
}

describe("Client", function() {
    
    var client;

    before(function() {

        // should probably be in its own test
        client = new Client(services);

    });

    it("should connect transports", function(done) {
        var connected = { test1: false, test2: false };
        client.on('connected', function(name) {
            connected[name] = true;
            var num = 0;
            for(var service in connected) {
                if(connected[service]) num++;
            }
            if(num == Object.keys(connected).length) done();
        });
        client.connect(function(err) {
            assert.ifError(err);
        });
    });

    it("should be able to call methods", function(done) {
        var called = { method1: false, method2: false };
        client.on('called', function(service, method) {
            called[method] = true;
            var num = 0;
            for(var method in called) {
                if(called[method]) num++;
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

    xit("should be able to add new service", function(done) {

    });

    it("should throw when adding duplicate service name", function() {
        assert.throws(function() {
            client.add(firstKey(services), mockTransport());
        });
    });

});

function mockTransport(fns) {
    if(!fns) fns = {};
    var ok = function(done) { done() };
    var service = function() {};
    var client = function() {};
    service.prototype.listen    = ok;
    service.prototype.stop      = ok;
    client.prototype.connect    = ok;
    client.prototype.disconnect = ok;
    client.prototype.call = function(method, data, callback) {
        callback(null, data);
    }
    var transport = function(config) {
        return {
            Client:  client,
            Service: service
        }
    }
    return transport;
}

function firstKey(obj) {
    for(var k in obj) return k;
}