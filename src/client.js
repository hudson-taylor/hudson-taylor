
"use strict";

const util   = require("util");
const events = require("events");
const async  = require("async");

let Client = function Client(services) {

    this.services    = {};
    this.connections = {};

    this.middleware  = {
        before: [],
        after:  []
    };

    for(let service in services) {
        if(!services.hasOwnProperty(service)) continue;        
        this.add(service, services[service]);
    }

};

util.inherits(Client, events.EventEmitter);

Client.prototype.add = function(name, transport) {
    if(this.services[name]) {
        throw new Error("Tried adding a service with duplicate name");
    }
    this.services[name] = transport;
    let client = new transport.Client();
    this.connections[name] = client;
    this.emit("added", name);
};

Client.prototype.connect = function(done) {
    let self = this;

    async.each(Object.keys(this.services), function(name, cb) {

        self.connections[name].connect(function(err) { 
            if(err) {
                return cb(err);
            }
            self.emit("connected", name);
            cb();

        });

    }, done);

};

Client.prototype.disconnect = function(done) {
    let self = this;

    async.each(Object.keys(this.connections), function(name, cb) {

        self.connections[name].disconnect(function(err) {
            if(err) {
                return cb(err);
            }
            delete self.connections[name];
            self.emit("disconnected", name);
            cb();
        });

    }, done);

};

Client.prototype.call = function(service, method, data, callback) {
    let self = this;

    let conn = this.connections[service];

    if(!conn) {
        return callback({ error: "unknown-service" });
    }

    // this can be cleaned up
    if(!data && !callback) {
        data = undefined;
        callback = function() {};
    } else if(data && typeof data !== 'function' && !callback) {
        callback = function() {};
    } else if(typeof data === 'function') {
        callback = data;
        data = undefined;
    }

    let _beforeMiddleware = self.middleware.before.filter((m) => {
        if(m.service && m.service !== service) return false;
        if(m.method  && m.method  !== method)  return false;
        return true;
    });

    async.eachSeries(_beforeMiddleware, function(middleware, done) {
        middleware.fn(data, function(err, result) {
            if(err) {
                return done(err);
            }
            data = result;
            done();
        });
    }, function(err) {
        if(err) {
            return callback(err);
        }
        conn.call(method, data, function(err, data) {
            if(err) {
                return callback(err);
            }
            let _afterMiddleware = self.middleware.after.filter((m) => {
                if(m.service && m.service !== service) return false;
                if(m.method  && m.method  !== method)  return false;
                return true;
            });
            async.eachSeries(_afterMiddleware, function(middleware, done) {
                middleware.fn(data, function(err, result) {
                    if(err) {
                        return done(err);
                    }
                    data = result;
                    done();
                });
            }, function(err) {
                if(err) {
                    return callback(err);
                }
                self.emit("called", service, method);
                callback(null, data);
            });
        });
    });

};

// For backwards compatibility with HT1.x
Client.prototype.remote = util.deprecate(Client.prototype.call, "Client.remote() has been deprecated, use Client.call() instead.");

Client.prototype.before = function(fn, opts = {}) {
    let { service, method } = opts;
    this.middleware.before.push({
        service,
        method,
        fn
    });
};

Client.prototype.after = function(fn, opts = {}) {
    let { service, method } = opts;
    this.middleware.after.push({
        service,
        method,
        fn
    });
};

Client.prototype.prepare = function(service, method, data) {
    return (callback) => {
        this.call(service, method, data, callback);
    }
}

export default Client;
