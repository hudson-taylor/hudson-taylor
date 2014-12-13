"use strict";

var async   = require("async");
var s       = require("ht-schema");


var Service = module.exports = function Service(Transports, config) {
    var self = this;

    this.config   = config;
    this._methods = {};
    this._servers = [];

    if(!Array.isArray(Transports)) {
        Transports = [ Transports ];
    }

    var fn = function(method, data, cb) {
        var _tmp = self._methods[method];
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

        //call the function, injecting extra args from config
        var s = _tmp.fn.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');
        var args = s.slice(s.indexOf('(') + 1, s.indexOf(')')).match(
                /([^\s,]+)/g) || [];
        _tmp.fn.apply(null, [data, cb].concat(
                    args.slice(2).map(function(a){return config[a];})));

    };

    Transports.forEach(function(transport) {
        self._servers.push(new transport.Server(fn));
    });

};

Service.prototype.on = function(method, schema, fn) {

    if(typeof schema == 'function') {
        fn = schema;
        schema = null;
    }

    this._methods[method] = {
        schema: schema,
        fn:     fn
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
