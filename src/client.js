
"use strict";

const util   = require("util");
const events = require("events");
const async  = require("async");

const s = require("ht-schema");

const utils = require("./utils");

let Client = function Client(services) {

    this.services    = {};
    this.connections = {};
    this.schemas     = {};

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

Client.prototype.addSchema = function(service, method, schema) {
  if(!this.schemas[service]) {
    this.schemas[service] = {};
  }
  this.schemas[service][method] = schema;
}

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

    let context = {
        service,
        method
    };

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
        if(m.service && m.service !== context.service) return false;
        if(m.method  && m.method  !== context.method)  return false;
        return true;
    });

    async.eachSeries(_beforeMiddleware, function(middleware, done) {
        middleware.fn.call(context, data, function(err, result) {
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

        let conn = self.connections[context.service];

        if(!conn) {
            return callback({ error: "unknown-service" });
        }

        conn.call(context.method, data, function(err, data) {
            if(err) {
                return callback(err);
            }
            let _afterMiddleware = self.middleware.after.filter((m) => {
                if(m.service && m.service !== context.service) return false;
                if(m.method  && m.method  !== context.method)  return false;
                return true;
            });
            async.eachSeries(_afterMiddleware, function(middleware, done) {
                middleware.fn.call(context, data, function(err, result) {
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

                if(self.schemas[context.service] && self.schemas[context.service][context.method]) {
                  let schema = self.schemas[context.service][context.method];
                  try {
                    if(!schema.hasOwnProperty('$validators')) {
                      data = s.Object(schema).validate(data);
                    } else {
                      data = schema.validate(data);
                    }
                  } catch(e) {
                    return callback({
                      $htValidationError: true,
                      error: e.message
                    });
                  }
                }

                self.emit("called", context.service, context.method);
                callback(null, data);
            });
        });
    });

};

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

Client.prototype.chain = function(service, method, data) {

    let client = this;

    if(!client.isChain) {
        // return new instance of the client
        // so we can set values on it
        client = new Client();
        for(let k in this) {
            if(client.hasOwnProperty(k)) {
                client[k] = this[k];
            }
        }
        client.isChain = true;
        client.chainedMethods = [];
    }

    client.chainedMethods.push({
        service,
        method,
        data
    });

    return client;

}

Client.prototype.end = function(callback) {

    if(!this.isChain) {
      return callback(new Error("Client.end called on a non-chained HT client."));
    }

    let tmp = this.chainedMethods.reduce(function(previous, method) {

        let last = previous[previous.length - 1];

        if(!last || last.service != method.service) {
            previous.push({
                service: method.service,
                calls:   []
            });
        }

        let call = {
            method: method.method
        }

        if(method.data) {
            call.data = method.data;
        }

        previous[previous.length-1].calls.push(call);

        return previous;

    }, []);

    let methods = tmp.map(function(serviceCall) {

        let call = {
          service: serviceCall.service,
          method: "$htMultiCall",
          data:   serviceCall.calls
        };

        if(serviceCall.calls.length === 1) {
          // If we're only calling 1 method on the
          // service, call it directly and don't
          // use $htMultiCall
          call = {
            service: serviceCall.service,
            method:  serviceCall.calls[0].method,
            data:    serviceCall.calls[0].data
          };
        }

        return call;

    });

    utils.getLastResult.call(this, methods, callback);

}

export default Client;
