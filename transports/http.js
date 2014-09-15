var express    = require('express');
var bodyParser = require('body-parser');
var request    = require('request');

function HTTPTransportServer(config) {

    var path = config.path || '/ht';

    var _HTTPTransportServer = function(fn) {
        this.app = express();
        this.app.use(bodyParser.json());
        this.app.post(path, function(req, res) {
            fn(req.body.method, req.body.args, function(err, data) {
               if(err) return res.status(500).json({ error: err.toString() });
               return res.json(data);
            });
        });
    }

    _HTTPTransportServer.prototype.listen = function(done) {
        var self = this;
        if(this.listening) return done();
        this.http = this.app.listen(config.port, config.host, function() {
            self.listening = true;
            done();
        });
    }

    _HTTPTransportServer.prototype.stop = function(done) {
        if(!this.listening) return done();
        this.http.close();
        this.listening = false;
        done();
    }

    return _HTTPTransportServer;

}

function HTTPTransportClient(config) {

    var _HTTPTransportClient = function() {
        this.url = "http" + (config.ssl ? "s" : "") + "://" + config.host + ":" + config.port + (config.path || '/ht');
    }

    _HTTPTransportClient.prototype.connect = function(done) {
        // noop for http
        done();
    }

    _HTTPTransportClient.prototype.disconnect = function(done) {
        // noop for http
        done();
    }

    _HTTPTransportClient.prototype.call = function(method, data, callback) {
        request({
            url:    this.url,
            method: 'POST',
            json:   { method: method, args: data }
        }, function(e, r, body) {
            if(e) return callback(e);
            callback(null, body);
        });
    }

    return _HTTPTransportClient;

}

function HTTPTransport(config) {
    this.Server = HTTPTransportServer(config);
    this.Client = HTTPTransportClient(config);
}

module.exports = HTTPTransport;
