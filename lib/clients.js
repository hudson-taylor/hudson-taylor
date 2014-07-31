var rpc = require('json-rpc2');
var server = require('./server');

exports.Services = function() {
    var self = this;
    self.services = {};

    self.connect = function(serviceName, clientConnector) {
        self.services[serviceName] = clientConnector;
    }

    self.remote = function(serviceName, signal, data, callback) {
        if(!self.services[serviceName]) {
            throw new Error("No connector for", serviceName, "registered");
        }
        self.services[serviceName].remote(signal, data, callback);
    }
}

exports.HTTPClient = function(remoteServiceName, host, port) {
    var self = this;
    self.client = rpc.Client.create(port, host);

    self.remote = function(signal, data, callback) {
        self.client.call(remoteServiceName+'.'+signal, [data], callback);
    }
}

exports.TCPClient = function(remoteServiceName, host, port) {
    var self = this;
    self.client = rpc.Client.create(port, host);

    self.remote = function(signal, data, callback) {
        self.client.call(remoteServiceName+'.'+signal, [data], callback);
    }
}

exports.LocalClient = function(serviceName, setupFunc /* extra args */) {
    /*  A 'client' that hosts the service locally and proxies requests,
     *  great for development or smaller deployments when you don't want
     *  multiple processes yet.
     */
    var self = this;
    self.service = new server.Service(serviceName);
    var args = [self.service, function(err) {
        if(err) throw new Error("Service", serviceName, "failed to setup");
    }];

    for(var i=2; i<arguments.length; i++) { args.push(arguments[i]); }
    setupFunc.apply(this, args);

    self.remote = function(signal, data, callback) {
        var handler = self.service.signalHandlers[signal];
        if(!handler) {
            return callback({code : -32601, message: 'Unknown RPC call "'+serviceName+'.'+signal+'"'});
        }
        //because this is a local service, data should be encoded and decoded
        //both ways, this will stop shared state bleeding across the API.
        //boundary.
        data = JSON.parse(JSON.stringify(data));
        handler([data], null, function foo(err, val) {
                if(err) {
                    err = JSON.parse(JSON.stringify({error: err.toString()}));
                    return callback(err);
                } else {
                    if(!val) val = null;
                    val = JSON.parse(JSON.stringify(val));
                    return callback(null, val);
                }
        });
    }
}


