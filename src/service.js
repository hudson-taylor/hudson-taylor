
"use strict";

const async    = require("async");
const s        = require("ht-schema");
const bluebird = require("bluebird");
const clone    = require("clone");
const utils    = require("ht-utils");

let Service = function Service(Transports, config) {

    if(!(this instanceof Service)) {
        return new Service(Transports, config);
    }

    if(typeof (Transports||{}).Server == 'function') {
        Transports = [ Transports ];
    } else if(typeof Transports == 'object' && !Array.isArray(Transports)) {
        config = Transports;
        Transports = [];
    } else if(!Transports) {
        Transports = [];
        config = {};
    }

    const privateMethods = [
      '$htMultiCall',
      '$htGetSchema',
      '$htGetAllSchemas'
    ];

    this.config      = config;
    this._methods    = {};
    this._servers    = [];
    this.listening   = false;

    this._middleware = {
        before: [],
        after:  []
    };

    this.fn = (method, data, cb) => {

        // clone data
        data = clone(data);

        let context = {
            method
        };

        let _beforeMiddleware = this._middleware.before.filter((m) => {
            if(m.method && m.method !== context.method) return false;
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
        }, (err) => {
            if(err) {
                return cb(err);
            }

            let _tmp = this._methods[context.method];
            if(!_tmp) return cb({ error: "unknown-method", method: context.method });

            let finish = (response) => {

                let _afterMiddleware = this._middleware.after.filter((m) => {
                    if(m.method && m.method !== context.method) return false;
                    return true;
                });

                async.eachSeries(_afterMiddleware, function(middleware, done) {
                    middleware.fn.call(context, response, function(err, _response) {
                        if(err) {
                            return done(err);
                        }
                        response = _response;
                        done();
                    });
                }, function(err) {
                    if(err) {
                        return cb(err);
                    }
                    cb(null, response);
                });

            };

            if(_tmp.schema) {
                _tmp.schema.validate(data, function(err, data) {
                    if(err) {
                        return cb({
                            $htValidationError: true,
                            error: err.message
                        });
                    }
                    return go(data);
                });
            } else {
                go(data);
            }

            function go(data) {

                // Handle both callbacks and promises here.
                let callbackHandler = function(err, response) {
                    if(err) return cb(err);
                    return finish(response);
                }

                let response = _tmp.fn(data, callbackHandler);

                if(response && typeof response.then === 'function') {
                    callbackHandler = null;
                    return response.then(finish).catch(cb);
                }

            }

        });

    };

    this.on("$htMultiCall", s.Array({ opt: false }, [
        s.Object({
            method:  s.String(),
            data:    s.Any({ opt: true })
        })
    ]), (data, callback) => {
        utils.getLastResult.call(this, data, callback, true);
    });

    this.on("$htGetSchema", s.String(), (methodName, callback) => {
        let method = this._methods[methodName];
        if(!method) {
            return callback({
                error:  "unknown-method",
                method: methodName
            });
        }
        let schema = method.schema;
        if(!schema) {
            return callback();
        }
        // We allow non ht-schema validation schemas
        // too, so make sure it has a document fn
        if(typeof schema.document !== 'function') {
            return callback({
                error: "incompatible-schema"
            });
        }
        return callback(null, schema.document());
    });

    this.on("$htGetAllSchemas", (data, callback) => {
      let schemas = {};
      async.each(Object.keys(this._methods), (method, done) => {
        if(~privateMethods.indexOf(method)) return done();
        this.call("$htGetSchema", method, function(err, schema) {
          if(err) {
            // don't err, just keep
            // fetching schemas
            return done();
          }
          schemas[method] = schema;
          return done();
        })
      }, function() {
        return callback(null, schemas);
      });
    });

    Transports.forEach((transport) => {
        this.addTransport(transport);
    });

};

Service.prototype.addTransport = function(transport, done = () => {}) {
    let server = new transport.Server(this.fn);
    this._servers.push(server);
    if(this.listening) {
        server.listen(done);
    } else {
        done();
    }
};

Service.prototype.on = function(method, schema, fn) {

    if(!fn) {
        fn = schema;
        schema = null;
    }

    if(schema) {
        if(typeof schema.validate !== 'function') {
            throw new Error("Schema for " + method + " does not have a validate function.");
        }
    }

    this._methods[method] = {
        schema,
        fn
    };

};

Service.prototype.before = function(fn, opts = {}) {
    let { method } = opts;
    this._middleware.before.push({
        method,
        fn
    });
};

Service.prototype.after = function(fn, opts = {}) {
    let { method } = opts;
    this._middleware.after.push({
        method,
        fn
    });
};

Service.prototype.listen = function(done = () => {}) {
    if(this.listening) return done();
    async.each(this._servers, function(s, cb) {
        s.listen(cb);
    }, (err) => {
        if(err) {
            return done(err);
        }
        this.listening = true;
        done();
    });
};

Service.prototype.stop = function(done = () => {}) {
    if(!this.listening) return done();
    async.each(this._servers, function(s, cb) {
        s.stop(cb);
    }, (err) => {
        if(err) {
            return done(err);
        }
        this.listening = false;
        done();
    });
};

Service.prototype.call = function(method, data, cb) {
    this.fn(method, data, cb);
};

export default Service;
