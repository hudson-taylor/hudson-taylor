// This is a transport that uses HTTP requests
// to communicate between Client & Server.
// For a slightly more advanced transport, see
// the TCP transport (./tcp.js)

"use strict";

const express    = require("express");
const bodyParser = require("body-parser");
const request    = require("request");

function HTTPTransportServer(config) {

    let path = config.path || "/ht";

    let _HTTPTransportServer = function(fn) {
        // An instance of _HTTPTransportServer is created
        // when this transport is passed into ht.Service.
        // Here, we can setup services that need to persist,
        // like the express server here. A function is
        // passed as an argument, you need to call this 
        // when you receive a request. See below.
        this.app = express();
        this.app.use(bodyParser.json());
        this.app.post(path, function(req, res) {
            // We got a request from a client, call function
            // provided, passing the method name as first argument, 
            // an object as the second, and a callback as the third.
            // The callback will pass an error and another variable
            // back it is up to the transport to digest these and
            // communicate back to the client.
            fn(req.body.method, req.body.args, function(err, data) {
                if(err) {
                    return res.status(500).json({ error: err.toString() });
                }
                return res.json(data);
            });
        });
    };

    _HTTPTransportServer.prototype.listen = function(done) {
        // All Server instances need a listen method
        // this is called when the user calls .listen
        // on the parent Service object. It can be called
        // multiple times, so be sure to track if things
        // are listening or not.
        let self = this;
        if(this.listening) return done();
        this.http = this.app.listen(config.port, config.host, function() {
            self.listening = true;
            done();
        });
    };

    _HTTPTransportServer.prototype.stop = function(done) {
        // They also require a stop method. It is called
        // when the user called .stop on the parent Service
        // object. It can also be called multiple times.
        if(!this.listening) return done();
        this.http.close();
        this.listening = false;
        done();
    };

    return _HTTPTransportServer;

}

function HTTPTransportClient(config) {

    let _HTTPTransportClient = function() {
        // An instance of _HTTPTransportClient is created
        // when this transport is passed into ht.Client.
        // Here, we can setup persistent connects (see tcp transport)
        // and do configuration.
        this.url = "http" + (config.ssl ? "s" : "") + "://" + config.host + ":" + config.port + (config.path || "/ht");
    };

    _HTTPTransportClient.prototype.connect = function(done) {
        // All Client instances require a connect method.
        // This is called when the user calls .connect on
        // the parent Client. We don't need to actually
        // connect for the HTTP client, so just call done.
        done();
    };

    _HTTPTransportClient.prototype.disconnect = function(done) {
        // Like above, all Client instances require a disconnect 
        // method. This is called when the user calls .connect on
        // the parent Client. We don't setup a persistent connect,
        // for the HTTP client, so just call done.
        done();
    };

    _HTTPTransportClient.prototype.call = function(method, data, callback) {
        // Finally, all Client instances require a call method.
        // This is the method that actually communicates with
        // the 'server'.
        request({
            url:    this.url,
            method: "POST",
            json:   { method, args: data }
        }, function(e, r, body) {
            if(e) {
                return callback(e);
            }
            callback(null, body);
        });
    };

    return _HTTPTransportClient;

}

function HTTPTransport(config) {
    // This parent instance should return both Server and Client.
    // You can also setup things that both Server & Client need
    // access to here, configuration, FDs etc.
    this.Server = HTTPTransportServer(config);
    this.Client = HTTPTransportClient(config);
}

export default HTTPTransport;
