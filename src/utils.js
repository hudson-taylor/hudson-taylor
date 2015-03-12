
"use strict";

var expressProxy = function(remote, serviceName, signal) {

    /* expressProxy returns an express route handler for that combines:
     *
     * - post body vars (see express body-parser)
     * - router matches ie /:id
     * - query params: ?foo=bar
     *
     * into an object and passes them on to an HT service remote call,
     * the result of which will be returned as a json response.
     */

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

};

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

export {
    expressProxy,
    merge,
    formatError
};
