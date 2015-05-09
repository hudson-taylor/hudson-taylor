// This is a transport that uses HTTP requests
// to communicate between Client & Server.
// For a slightly more advanced transport, see
// the TCP transport (./tcp.js)

"use strict";

const http       = require("http");
const https      = require("https");
const express    = require("express");
const bodyParser = require("body-parser");

function HTTPTransportServer(config) {

    let _HTTPTransportServer = function(fn) {
        this.config = config;
        // An instance of _HTTPTransportServer is created
        // when this transport is passed into ht.Service.
        // Here, we can setup services that need to persist,
        // like the express server here. A function is
        // passed as an argument, you need to call this 
        // when you receive a request. See below.
        let eApp = express();
        eApp.use(bodyParser.json());
        eApp.post(this.config.path, function(req, res) {
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
              var parsedJSON = JSON.parse(response);
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
    // This parent instance should return both Server and Client.
    // You can also setup things that both Server & Client need
    // access to here, configuration, FDs etc.
    if(!config || typeof config !== 'object' || !config.host || !config.port)
      throw new Error("You must pass a configuration object to the HTTP Transport.");
    if(config.path === undefined) config.path = "/ht";
    if(config.ssl === undefined) config.ssl = false;
    this.config = config;
    this.Server = HTTPTransportServer(config);
    this.Client = HTTPTransportClient(config);
}

export default HTTPTransport;
