
"use strict";

const async   = require("async");
const s       = require("ht-schema");

let Service = function Service(Transports, config) {
    let self = this;

    this.config      = config;
    this._methods    = {};
    this._servers    = [];

    this._middleware = {
        before: [],
        after:  []
    };

    if(!Array.isArray(Transports)) {
        Transports = [ Transports ];
    }

    this.fn = function(method, data, cb) {
        let _tmp = self._methods[method];
        if(!_tmp) return cb({ error: "unknown-method" });

        if(_tmp.schema) {
            try {
                if(!_tmp.schema.hasOwnProperty('childValidators')) {
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

            }

            // Call the function, injecting extra args from config
            let _s = _tmp.fn.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');
            /* istanbul ignore next */
            let args = _s.slice(_s.indexOf('(') + 1, _s.indexOf(')')).match(/([^\s,]+)/g) || [];
            _tmp.fn.apply(_tmp, [data, finish].concat(args.slice(2).map(function(a) {
                return config[a];
            })));

        });

    };

    Transports.forEach(function(transport) {
        self._servers.push(new transport.Server(self.fn));
    });

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
}

Service.prototype.after = function(fn, opts = {}) {
    let { method } = opts;
    this._middleware.after.push({
        method,
        fn
    });
}

Service.prototype.listen = function(done) {
    async.each(this._servers, function(s, cb) {
        s.listen(cb);
    }, done);
};

Service.prototype.stop = function(done) {
    async.each(this._servers, function(s, cb) {
        s.stop(cb);
    }, done);
};

Service.prototype.call = function(method, data, cb) {
    this.fn(method, data, cb);
}

export default Service;
