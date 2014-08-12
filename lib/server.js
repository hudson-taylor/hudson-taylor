var rpc = require('json-rpc2');
var async = require('async');
var schemas = require('./schema');

/* This module exports one constructor, Server, see documentation */
exports.Service = Service;
exports.Server = function Server() {
    var self = this;
    self.services = {};
    self.listeners = [];
    self.rpcServer = rpc.Server.create({
            headers : { 'Access-Control-Allow-Origin': '*' } });

    self.add = function(serviceName, setupFunc /* setupFunc args */) {
        /* Add a new service to be served up */
        var s = new Service(serviceName);
        var args = [s, function(err) {
            if(err) throw new Error("Service", serviceName, "failed to setup");
            return self._serviceReady(s);
        }];
        for(var i=2; i<arguments.length; i++) { args.push(arguments[i]); }
        return setupFunc.apply(this, args);
    }

    self.listenHTTP = function(args) {
        /* Listen as a json-rpc 2.0 service over http */
        var settings = {
            port : 8001,
            interface : '0.0.0.0'
        };
        //override defaults
        for(var k in args) settings[k] = args[k];
        self.listeners.push(self.rpcServer.listen(
                    settings.port, settings.interface));
    }

    self.listenTCP = function(args) {
        /* Listen as a json-rpc 2.0 service over TCP */
        var settings = {
            port : 8001,
            interface : '0.0.0.0'
        };
        //override defaults
        for(var k in args) settings[k] = args[k];
        self.listeners.push(self.rpcServer.listenRaw(
                    settings.port, settings.interface));
    }

    self.closeAll = function(cb) {
        //close all connections
        async.each(self.listeners, function(listener, done) {
            listener.close(done);
        }, cb);
    }

    self._serviceReady = function(service) {
        // When a service signals that it is ready, attach any signals
        // to the rpcServer.
        self.rpcServer.expose(service.name, service.signalHandlers);
    }

}

function Service(serviceName) {

    var self = this;
    self.name = serviceName;
    self.signalHandlers = {};

    // Append all default validators to the service object for easy access
    // from handler-closures.
    for(var k in schemas.validators) {
        var v = schemas.validators[k];
        self[k] = v;
    }

    self.on = function(signal, schema, handler, validationErrorHandler) {
        self.signalHandlers[signal] = function(args, opts, callback) {
            if(!args) var data = {};
            var data = args[0];
            //validate against the schema
            try {
                data = schema.validate(data, signal);
            } catch(e) {
               if(validationErrorHandler) {
                   return validationErrorHandler(e, callback); 
               } else {
                    return callback(e);
               }
            }
            return handler(data, callback);
        };
    }
}
