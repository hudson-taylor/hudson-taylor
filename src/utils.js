
"use strict";

const async = require("async");
const util  = require("util");

var expressProxy = util.deprecate(function(remote, serviceName, signal) {

    /*******************************************************************************************************
        expressProxy has been deprecated, please use https://github.com/hudson-taylor/ht-express instead. 
    *******************************************************************************************************/

    return (function() {

        return function expressProxy(req, res) {
            let bits = [];
            if(req.body) bits.push(req.body);
            if(req.params) bits.push(req.params);
            if(req.query) bits.push(req.query);
            let payload = exports.merge.apply(null, bits);
            remote.call(serviceName, signal, payload, function(err, data) {
                if(err) {
                    return res.status(500).json(formatError(err));
                }
                return res.json(data);
            });
        };

    })();

}, "expressProxy is deprecated as of 5.3.1 - please use https://github.com/hudson-taylor/ht-express instead.");

var merge = function merge() {

    // Merge objects passed as arguments, left to right precidence.

    let result = {};

    for (let i = 0; i < arguments.length; i++) {
        let keys = Object.keys(arguments[i]);
        for (let k = 0; k < keys.length; k++) {
            let key = keys[k];
            if(!result.hasOwnProperty(key)) {
                result[key] = arguments[i][key];
            }
        }
    }

    return result;

};

var formatError = function formatError(err) {
    if(err.error) return err;
    if(err instanceof Error) {
        err = err.message || err.toString();
    }
    return { error: err };
};

var getLastResult = function getLastResult(methods, callback, isService) {

    async.reduce(methods, undefined, (lastResult, stored, done) => {

        let {
            service,
            method,
            data = lastResult
        } = stored;

        let call = [
            service,
            method,
            data, 
            function(err, result) {
                if(err) {
                    let r = {
                        error: err,
                        method
                    }
                    if(!isService) {
                        r.service = service;
                    }
                    return done(r);
                }

                if(!isService) {

                    var index = methods.indexOf(stored);
                    var next = methods[index + 1];

                    if(next && next.data && !next.data[0].data) {
                        methods[index + 1].data[0].data = result;
                    }

                }

                return done(null, result);

            }
        ];

        if(isService) {
            call.shift();
        }

        this.call(...call);

    }, callback);
}

export {
    expressProxy,
    merge,
    formatError,
    getLastResult
};
