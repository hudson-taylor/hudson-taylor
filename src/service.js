
"use strict";

const async   = require("async");
const s       = require("ht-schema");

let Service = function Service(Transports, config) {
    let self = this;

    this.config   = config;
    this._methods = {};
    this._servers = [];

    if(!Array.isArray(Transports)) {
        Transports = [ Transports ];
    }

    let fn = function(method, data, cb) {
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

        // Call the function, injecting extra args from config
        let _s = _tmp.fn.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');
        let args = _s.slice(_s.indexOf('(') + 1, _s.indexOf(')')).match(/([^\s,]+)/g) || [];
        _tmp.fn.apply(null, [data, cb].concat(args.slice(2).map(function(a) {
            return config[a];
        })));

    };

    Transports.forEach(function(transport) {
        self._servers.push(new transport.Server(fn));
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

export default Service;
