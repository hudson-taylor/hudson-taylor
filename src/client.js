import util       from "util";
import events     from "events";
import async      from "async";
import bluebird   from "bluebird";
import * as utils from "ht-utils";

class Client extends events.EventEmitter {

  constructor(services) {

    super();

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

  }

  add(name, transport) {

    if(this.services[name]) {
      throw new Error("Tried adding a service with duplicate name");
    }
    this.services[name] = transport;
    let client = new transport.Client();
    this.connections[name] = client;
    this.emit("added", name);

  }

  addSchema(service, method, schema) {

    if(!this.schemas[service]) {
      this.schemas[service] = {};
    }

    if(typeof schema.validate !== 'function') {
      throw new Error("Schema for " + method + " does not have a validate function.");
    }

    this.schemas[service][method] = schema;

  }

  connect(done) {

    async.each(Object.keys(this.services), (name, cb) => {

      this.connections[name].connect((err) => {

        if(err) {
          return cb(err);
        }

        this.emit("connected", name);
        cb();

      });

    }, done);

  }

  disconnect(done) {

    async.each(Object.keys(this.connections), (name, cb) => {

      this.connections[name].disconnect((err) => {

        if(err) {
          return cb(err);
        }

        delete this.connections[name];
        this.emit("disconnected", name);
        cb();

      });

    }, done);

  }

  call(service, method, data, callback) {

    let context = {
      service,
      method
    };

    let returnPromise = false;
    let promise, resolve, reject;

    // this can be cleaned up
    if(!data && !callback) {
      data = undefined;
      returnPromise = true;
    } else if(data && typeof data !== 'function' && !callback) {
      returnPromise = true;
    } else if(typeof data === 'function') {
      callback = data;
      data = undefined;
    }

    if(returnPromise) {
      // :(
      promise = new bluebird.Promise(function(_resolve, _reject) {
        resolve = _resolve;
        reject  = _reject;
      });
    }

    let _beforeMiddleware = this.middleware.before.filter((m) => {
      if(m.service && m.service !== context.service) return false;
      if(m.method  && m.method  !== context.method)  return false;
      return true;
    });

    function returnResult(err, data) {
      if(returnPromise) {
        if(err) {
          return reject(err);
        } else {
          return resolve(data);
        }
      }
      return callback(err, data);
    }

    async.eachSeries(_beforeMiddleware, function(middleware, done) {
      middleware.fn.call(context, data, function(err, result) {
        if(err) {
          return done(err);
        }
        data = result;
        done();
      });
    }, (err) => {
      if(err) {
        return returnResult(err);
      }

      let conn = this.connections[context.service];

      if(!conn) {
        return returnResult({ error: "unknown-service" });
      }

      conn.call(context.method, data, (err, data) => {
        if(err) {
          return returnResult(err);
        }
        let _afterMiddleware = this.middleware.after.filter((m) => {
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
        }, (err) => {
          if(err) {
            return returnResult(err);
          }

          let finish = (data) => {
            this.emit("called", context.service, context.method);
            return returnResult(null, data);
          }

          if(this.schemas[context.service] && this.schemas[context.service][context.method]) {
            let schema = this.schemas[context.service][context.method];
            schema.validate(data, function(err, data) {
              if(err) {
                return returnResult({
                  $htValidationError: true,
                  error: err.message
                });
              }
              return finish(data);
            });
          } else {
            return finish(data);
          }

        });
      });
    });

    if(returnPromise) {
      return promise;
    }

  }

  before(fn, opts = {}) {

    let { service, method } = opts;
    this.middleware.before.push({
      service,
      method,
      fn
    });

  }

  after(fn, opts = {}) {

    let { service, method } = opts;
    this.middleware.after.push({
      service,
      method,
      fn
    });

  }

  prepare(service, method, data) {

    return (callback) => {
      this.call(service, method, data, callback);
    }

  }

  chain(service, method, data) {

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

  end(callback) {

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

}

export default Client;
