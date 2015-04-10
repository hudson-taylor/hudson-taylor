
"use strict";

const async   = require("async");
const s       = require("ht-schema");

const utils = require("./utils");

let Service = function Service(Transports, config) {
    let self = this;

    if(typeof (Transports||{}).Server == 'function') {
        Transports = [ Transports ];
    } else if(typeof Transports == 'object' && !Array.isArray(Transports)) {
        config = Transports;
        Transports = [];
    } else if(!Transports) {
        Transports = [];
        config = {};
    }

    this.config      = config;
    this._methods    = {};
    this._servers    = [];
    this.listening   = false;

    this._middleware = {
        before: [],
        after:  []
    };

    this.fn = function(method, data, cb) {
        let _tmp = self._methods[method];
        if(!_tmp) return cb({ error: "unknown-method", method: method });

        if(_tmp.schema) {
            try {
                if(!_tmp.schema.hasOwnProperty('$validators')) {
                    data = s.Object(_tmp.schema).validate(data);
                } else {
                    data = _tmp.schema.validate(data);
                }
            } catch(e) {
                return cb({
                    error: e.message
                });
            }
        }

        let _beforeMiddleware = self._middleware.before.filter((m) => {
            if(m.method && m.method !== method) return false;
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
                return cb(err);
            }

            let finish = function(err, response) {

                if(err) {
                    return cb(err);
                }

                let _afterMiddleware = self._middleware.after.filter((m) => {
                    if(m.method && m.method !== method) return false;
                    return true;
                });

                async.eachSeries(_afterMiddleware, function(middleware, done) {
                    middleware.fn(response, function(err, _response) {
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

            _tmp.fn(data, finish);

        });

    };

    this.on("$htMultiCall", s.Array({ opt: false }, [
        s.Object({
            method:  s.String(),
            data:    s.Any({ opt: true })
        })
    ]), function(data, callback) {
        utils.getLastResult.bind(self)(data, callback, true);
    });

    Transports.forEach(function(transport) {
        self.addTransport(transport);
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
    let self = this;
    if(self.listening) return done();
    async.each(this._servers, function(s, cb) {
        s.listen(cb);
    }, function(err) {
        if(err) {
            return done(err);
        }
        self.listening = true;
        done();
    });
};

Service.prototype.stop = function(done = () => {}) {
    let self = this;
    if(!self.listening) return done();
    async.each(this._servers, function(s, cb) {
        s.stop(cb);
    }, function(err) {
        if(err) {
            return done(err);
        }
        self.listening = false;
        done();
    });
};

Service.prototype.call = function(method, data, cb) {
    this.fn(method, data, cb);
};

export default Service;
