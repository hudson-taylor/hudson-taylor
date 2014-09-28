var async = require('async');

var schema = require('ht-schema');

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
        if(!_tmp) {
            return cb({ error: 'unknown-method' });
        }
        try {
            for(var key in _tmp.schema) {
                data[key] = _tmp.schema[key].validate(data[key]);
            }
        } catch(e) {
            if(_tmp.validationErrFn) {
                return _tmp.validationErrFn(e);
            } else {
                return cb(e);
            }
        }
        _tmp.fn(data, cb);
    }

    Transports.forEach(function(transport) {
        self._servers.push(new transport.Server(fn));
    });

}

Service.prototype.on = function(method, schema, fn, validationErrFn) {
    this._methods[method] = {
        schema:          schema,
        fn:              fn.bind({ config: this.config }),
        validationErrFn: validationErrFn
    }
}

Service.prototype.listen = function(done) {
    async.each(this._servers, function(s, cb) {
        s.listen(cb);
    }, done);
}

Service.prototype.stop = function(done) {
    async.each(this._servers, function(s, cb) {
        s.stop(cb);
    }, done);
}