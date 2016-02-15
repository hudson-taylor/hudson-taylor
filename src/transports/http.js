// This is a transport that uses HTTP requests
// to communicate between Client & Server.
// For a slightly more advanced transport, see
// the TCP transport (./tcp.js)

"use strict";

const http       = require("http");
const https      = require("https");
const express    = require("express");
const bodyParser = require("body-parser");
const cors       = require("cors");

const utils = require("../utils");

function HTTPTransportServer(config) {

    let _HTTPTransportServer = function(fn) {
        this.config = config;

        // Allow the user to pass in their own express
        // application. This lets you have multiple
        // services listen on the same port, by passing
        // custom "path" config options to the transport.
        if(this.config.app !== undefined) {
            this.customApp = true;
        }
        // An instance of _HTTPTransportServer is created
        // when this transport is passed into ht.Service.
        // Here, we can setup services that need to persist,
        // like the express server here. A function is
        // passed as an argument, you need to call this 
        // when you receive a request. See below.
        let eApp = this.config.app || express();
        eApp.use(bodyParser.json());
        // Check if we need to respond with CORS headers
        // Needed if you want to use HT in the browser.
        if(this.config.cors !== undefined && !this.customApp) {
            eApp.use(cors());
        }
        eApp.post(this.config.path, function(req, res) {
            // We got a request from a client, call function
            // provided, passing the method name as first argument, 
            // an object as the second, and a callback as the third.
            // The callback will pass an error and another variable
            // back it is up to the transport to digest these and
            // communicate back to the client.
            fn(req.body.method, req.body.args, function(err, data) {
                if(err) {
                    return res.status(500).json({
                        $htTransportError: utils.formatError(err).error
                    });
                }
                return res.json(data);
            });
        });
        if(this.config.ssl) {
          this.app = https.createServer(this.config.ssl, eApp);
        } else {
          this.app = http.createServer(eApp);
        }
    };

    _HTTPTransportServer.prototype.listen = function(done) {
        // All Server instances need a listen method
        // this is called when the user calls .listen
        // on the parent Service object. It can be called
        // multiple times, so be sure to track if things
        // are listening or not.
        if(this.listening) return done();
        if(this.customApp) return done();
        this.app.listen(this.config.port, this.config.host, () => {
            this.listening = true;
            done();
        });
    };

    _HTTPTransportServer.prototype.stop = function(done) {
        // They also require a stop method. It is called
        // when the user called .stop on the parent Service
        // object. It can also be called multiple times.
        if(!this.listening) return done();
        if(this.customApp) return done();
        this.app.close(() => {
          this.listening = false;
          done();
        });
    };

    return _HTTPTransportServer;

}

function HTTPTransportClient(config) {

    let _HTTPTransportClient = function() {
        // An instance of _HTTPTransportClient is created
        // when this transport is passed into ht.Client.
        // Here, we can setup persistent connections (see tcp transport)
        // and do configuration.
        this.config = config;
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
        let json = JSON.stringify({ method, args: data });
        let options = {
          host: this.config.host,
          port: this.config.port,
          path: this.config.path,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": json.length
          }
        };

        let req = (this.config.ssl ? https : http).request(options, function(res) {
          res.setEncoding('utf8');
          let response = '';
          res.on('data', function(data) {
            response += data;
          });
          res.on('end', function() {
            try {
              if(!response || response === 'undefined') {
                return callback();
              }
              var parsedJSON = JSON.parse(response);
              if(parsedJSON.$htTransportError) {
                return callback(parsedJSON.$htTransportError)
              }
              return callback(null, parsedJSON);
            } catch(e) {
              return callback(e);
            }
          });
        });

        req.on('error', function(err) {
          return callback(err);
        });

        req.write(json);
        req.end();

    };

    return _HTTPTransportClient;

}

function HTTPTransport(config) {
    if(!(this instanceof HTTPTransport)) {
        return new HTTPTransport(config);
    }
    // This parent instance should return both Server and Client.
    // You can also setup things that both Server & Client need
    // access to here, configuration, FDs etc.
    if(!config || typeof config !== 'object' || (!config.app && (!config.host || !config.port)))
      throw new Error("You must pass a configuration object to the HTTP Transport.");
    if(config.path === undefined) config.path = "/ht";
    if(config.ssl === undefined) config.ssl = false;
    this.config = config;
    this.Server = HTTPTransportServer(config);
    this.Client = HTTPTransportClient(config);
}

export default HTTPTransport;
