"use strict";

exports.expressProxy = function(remote, serviceName, signal) {
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
            var bits = [];
            if(req.body) bits.push(req.body);
            if(req.params) bits.push(req.params);
            if(req.query) bits.push(req.query);
            var payload = exports.merge.apply(null, bits);
            remote.call(serviceName, signal, payload, function(err, data) {
                if(err) {
                    return res.status(500).json(err instanceof Error ? err.toString() : err);
                }
                res.set({"Content-Type": "application/json"});
                return res.json(data);
            });
        };

    })();

};


exports.merge = function merge() {
    // Merge objects passed as arguments, left to right precidence.
    var result = {};
    for (var i=0; i<arguments.length; i++) {
        var keys = Object.keys(arguments[i]);
        for (var k=0; k<keys.length; k++) {
            var key = keys[k];
            if(!result.hasOwnProperty(key)) {
                result[key] = arguments[i][key];
            }
        }
    }
    return result;
};