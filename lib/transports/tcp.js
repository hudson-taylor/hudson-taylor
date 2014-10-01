"use strict";

var net = require("net");

var uid2 = require("uid2");

function TCPTransportServer(config) {

    var _TCPTransportServer = function(fn) {
        this.server = net.createServer(function(c) {
            c.on("data", function(d) {
                var response = JSON.parse(d); // lol
                var id   = response.id;
                var name = response.name;
                var data = response.data;
                fn(name, data, function(err, d) {
                    var response = JSON.stringify({
                        id:    id,
                        error: err,
                        data:  d
                    });
                    c.write(response);
                });
            });
        });
    };

    _TCPTransportServer.prototype.listen = function(done) {
        var self = this;
        if(this.listening) return done();
        this.server.listen(config.port, config.host, function(err) {
            if(err) return done(err);
            self.listening = true;
            done();
        });
    };

    _TCPTransportServer.prototype.stop = function(done) {
        var self = this;
        if(!this.listening) return done();
        this.server.close(function(err) {
            if(err) return done(err);
            self.listening = false;
            done();
        });
    };

    return _TCPTransportServer;

}

function TCPTransportClient(config) {

    var _TCPTransportClient = function() {
        this.fns = {};
    };

    _TCPTransportClient.prototype.connect = function(done) {
        var self = this;
        // open a persistent connection to the server
        this.conn = net.createConnection(config.port, config.host);
        this.conn.setEncoding("utf8");
        this.conn.on("connect", function() {
            self.connected = true;
            done();
        });
        this.conn.on("data", function(d) {
            var response = JSON.parse(d);
            var id    = response.id;
            var error = response.error;
            var data  = response.data;
            // find callback we stashed
            var fn = self.fns[id];
            if(!fn) {
                // unknown, drop
                return;
            }
            if(error) {
                return fn(error);
            } else {
                return fn(null, data);
            }
        });
    };

    _TCPTransportClient.prototype.disconnect = function(done) {
        if(!this.connected) done();
        this.conn.end();
        this.connected = false;
        done();
    };

    _TCPTransportClient.prototype.call = function(method, data, callback) {
        if(!this.connected) {
            return callback({
                error: "disconnected"
            });
        }
        var id = uid2(10);
        var request = JSON.stringify({
            id:   id,
            name: method,
            data: data
        });
        // stash callback for later
        this.fns[id] = callback;
        this.conn.write(request);
    };

    return _TCPTransportClient;

}

function TCPTransport(config) {
    this.Server = TCPTransportServer(config);
    this.Client = TCPTransportClient(config);
}

module.exports = TCPTransport;
