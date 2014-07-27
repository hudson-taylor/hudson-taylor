rpc = require('json-rpc2');

/* This module exports one constructor, Server, see documentation */

exports.Server = function Server() {
    var self = this;
    self.services = {};
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
        for(k in args) settings[k] = args[k];
        self.rpcServer.listen(settings.port, settings.interface);
    }

    self.listenTCP = function(args) {
        /* Listen as a json-rpc 2.0 service over TCP */
        var settings = {
            port : 8001,
            interface : '0.0.0.0'
        };
        //override defaults
        for(k in args) settings[k] = args[k];
        self.rpcServer.listenRaw(settings.port, settings.interface);
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

    self.on = function(signal, schema, handler, validationErrorHandler) {
        self.signalHandlers[signal] = function(args, opts, callback) {
            if(!args) var data = {};
            var data = args[0];
            //TODO validate against the schema
            return handler(data, callback);
        };
    }
}
