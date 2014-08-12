var assert  = require('assert');
var ht      = require('../index');

describe("Client/Server APIs", function() {

    var s = ht.validators;

    testService = function(s, ready) {
        s.on("test", s.Object({message : s.String()}), function(data, callback) {
            return callback(null, data.message);
        });
        ready();
    };

    describe("HTTP Client", function() {

        var server;
        var client;

        before(function(done){
            //create a server
            server = new ht.Server();
            server.add("testService", testService);
            server.listenHTTP({port : 8002});

            //create a client
            client = new ht.Services();
            client.connect("testService", new ht.HTTPClient(
                    "testService", "localhost", 8002));
            done();
        });

        after(function(done){
            server.closeAll(done);
        });

        it("should listen and accept requests", function(done) {
            client.remote(
                "testService", "test", {message : "hi!"}, function(err, response) {
                    console.log(err);
                    assert.equal(response, "hi!");
                    done();
            });
        });

        it("should listen and reject requests that fail to validate", function(done) {
            client.remote(
                "testService", "test", {sausages : 2}, function(err, response) {
                    assert(err && !response);
                    done();
            });
        });

    });

    describe("Local Service Client", function() {

        //create a client to a local service
        var client = new ht.Services();
        client.connect("testService",
            new ht.LocalClient("testService", testService));



        it("should accept requests", function(done) {
            client.remote(
                "testService", "test", {message : "hi!"}, function(err, response) {
                    assert.equal(response, "hi!");
                    done();
            });
        });

        it("should reject requests that fail to validate", function(done) {
            var counter = 0;
            client.remote(
                "testService", "test", {sausages : 2}, function(err, response) {
                    assert(err && !response);
                    done();
            });
        });

    });

});

