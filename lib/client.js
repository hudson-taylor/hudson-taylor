"use strict";

var util   = require('util');
var events = require('events');
var async  = require('async');

var Client = module.exports = function Client(services) {

    this.services = {};
    this.connections = {};

    for(var service in services) {
        this.add(service, services[service]);
    }

}

util.inherits(Client, events.EventEmitter);

Client.prototype.add = function(name, transport) {
    if(this.services[name]) throw new Error("Tried adding a service with duplicate name");
    this.services[name] = transport;
    var client = new transport.Client();
    this.connections[name] = client;
    this.emit('added', name);
}

Client.prototype.connect = function(done) {
    var self = this;

    async.each(Object.keys(this.services), function(name, cb) {

        self.connections[name].connect(function(err){ 
            if(err) return cb(err);

            self.emit('connected', name);
            cb();

        });

    }, done);

}

Client.prototype.disconnect = function(done) {
    var self = this;

    async.each(Object.keys(this.connections), function(name, cb) {

        self.connections[name].disconnect(function(err) {
            if(err) return cb(err);
            delete self.connections[name];
            self.emit('disconnected', name);
            cb();
        });

    }, done);

}

Client.prototype.call = function(service, method, data, callback) {
    var self = this;

    var conn = this.connections[service];

    if(!conn) {
        return callback({ error: 'unknown-service' });
    }

    conn.call(method, data, function(err, data) {
        if(err) return callback(err);
        self.emit('called', service, method);
        callback(null, data);
    });

}
