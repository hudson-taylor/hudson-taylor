rpc = require('json-rpc2');

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


