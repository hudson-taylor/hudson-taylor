"use strict";

var fn;

function LocalTransportServer(_fn) {
    fn = _fn;
}

LocalTransportServer.prototype.listen = function(done) {
    done();
}

LocalTransportServer.prototype.stop = function(done) {
    done();
}

function LocalTransportClient(fn) {

}

LocalTransportClient.prototype.connect = function(done) {
    done(); //noop
}

LocalTransportClient.prototype.disconnect = function(done) {
    done(); //noop
}

LocalTransportClient.prototype.call = function(method, data, callback) {
    fn(method, data, callback);
}


function LocalTransport(Service) {
    this.Server = LocalTransportServer;
    this.Client = LocalTransportClient;
}

module.exports = LocalTransport;