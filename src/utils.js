
"use strict";

const async = require("async");
const util  = require("util");

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
    merge,
    formatError,
    getLastResult
};
