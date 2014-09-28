var merge = require('./utils').merge;
var isemail = require('isemail');

// Simple bucket of schema validator/parsers
var validators = new (function() {
    var self = this;
    self.add = function(name, parser) {
        self[name] = parser;
    };
})();

validators.add("Object", makeParser(objParser, null));
validators.add("String", makeParser(strParser, null));
validators.add("Number", makeParser(numParser, null));
validators.add("Boolean", makeParser(boolParser, null));
validators.add("Date", makeParser(dateParser, null));
validators.add("Array", makeParser(arrayParser, null));
validators.add("Email", makeParser(emailParser, null));
//validators.add("Binary", makeParser(binParser, null));

module.exports            = validators;
module.exports.makeParser = makeParser;

//identifies a validator that wishes it's key/value obliterated from results
var DELETEKEY = {htDeleteKey : true}; 

function makeParser(parserFunc, docFunc) {
    //parserFunc takes arguments, child-validators || null, and the data to
    //parse, it should throw an Error if the data is invalid, containing a
    //reason. Otherwise it should return a value. This value can be mutated,
    //it will be the 'validated' value.

    return function validator(args, childValidators) {
        //overly complex method of managing argument order!
        switch(arguments.length) {
            case 0:
                childValidators = {};
                args = {};
                break;
            case 1:
                //one argument, arge they args or validators?
                var areValidators = false;
                if(Array.isArray(arguments[0])) {
                    for(var i=0; i<arguments[0].length; i++) {
                         if(typeof arguments[0][i] == "object" &&
                                arguments[0][i].hasOwnProperty('childValidators')){
                                    areValidators = true;
                                    break;
                                }
                    }
                } else {
                    for(var k in arguments[0]) {
                        if(typeof arguments[0][k] == "object" &&
                                arguments[0][k].hasOwnProperty('childValidators')){
                                    areValidators = true;
                                    break;
                                }
                    }
                }

                if(areValidators) {
                    childValidators = arguments[0];
                    args = {};
                } else {
                    args = arguments[0];
                    childValidators = null;
                }
                break;
        }

        return new (function(args, childValidators) {

            var self = this;
            self.childValidators = childValidators;
            self.args = args;


            self.parse = function(data, key, first) {
                //All validators should handle opt (optional)
                var args = merge(self.args, {opt : false});
                var val = parserFunc.call(self, args, self.childValidators, data, key);
                if(first && val != null && typeof val == 'object' && val.htDeleteKey) return null;
                return val;
            }

            self.validate = function(data, key) {
                return self.parse(data, key || 'schema', true);
            }

            self.document = function() {
                return docFunc.call(self, args);
            }
        })(args, childValidators);

    };
}

function arrayParser(args, childValidators, data, key) {
    childValidators = childValidators || [];
    var out = [];
    if(!data instanceof Array && !args.opt) throw new Error("required Array");
    if(!data && args.opt) return DELETEKEY;
    for(var i=0; i < data.length; i++) {
        var val = data[i];
        var matched = false;
        for(var v=0; v < childValidators.length; v++) {
            if(!matched) {
                try {
                    out.push(childValidators[v].parse(val, key+'['+i+']'));
                    matched = true;
                    break;
                } catch(e) {
                    //pass!
                }
            }
        }
        if(!matched) {
            //We couldn't parse data[i] !
            throw new Error("No matching validator for "+ key+'['+i+']');
        }
    }
    return out;
}
 
function objParser(args, childValidators, data, key) {
    childValidators = childValidators || {};
    function validator(k) {
        //returns a keyname and corresponding validator for a key, or null
        for(var key in childValidators) {
            if(key == k) return [k, childValidators[k]];
            //handle as attribute names 'foo as bar'
            var bits = key.split(' ');
            if(bits.length == 3 && bits[0] == k && bits[1] == 'as') {
                return [bits[2], childValidators[key]];
            }
        }
    };

    //objects default to strict, this means extra attributes not specified in
    //the schema will throw errors.
    args = merge(args, { strict : true });

    var out = {};
    //handle no object provided if optional is false
    if(!data && !args.opt) throw new Error("required Object");
    if(!data && args.opt) return DELETEKEY;

    //check we actually have an object
    var type = typeof data;
    if(type !== 'object') throw new Error("must be an object, recieved "+ type);

    var seen = {};
    // Check that all provided data is valid to the schema
    for(var k in data) {
        seen[k] = true;
        var v = validator(k);
        //Handle extra attributes that are not in the schema
        if(args.strict && !v) {
            throw new Error(k+ " is not specified in " + key);
        } else if(!args.strict && !v) {
            //check for a special * validator to apply
            var sv = validator('*');
            if(sv) {
                try {
                    out[k] = sv[1].parse(data[k], key+'.'+sv[0]);
                } catch(e) {
                    throw new Error("Failed to parse " + key+'.'+sv[0] + ": " + e.message);
                }
            } else {
                out[k] = data[k]; //otherwise pass them as-is.
            }
            continue;
        } else if(!data[k] && v[1].args.default) {
            data[k] = v[1].args.default;
        }
        try {
            var v = validator(k);
            out[v[0]] = v[1].parse(data[k], key+'.'+v[0]);
        } catch(e) {
            throw new Error("Failed to parse " + key+'.'+v[0] + ": " + e.message);
        }
    }

    // Check that all required schema fields have been provided
    for(var k in childValidators) {
        if(k == "*") continue;
        //handle renamed attrs
        var bits = k.split(' ');
        if(bits.length == 3) k = bits[0];
        if(!seen[k]) {
            try {
                var v = validator(k);
                out[v[0]] = v[1].parse(null || v[1].args.default, key+'.'+v[0]);
            } catch(e) {
                throw new Error("Missing attribute '"+ key+'.'+v[0] + "': " + e.message);
            }
        }
    }
    //Delete any keys that have a value of {htDeleteKey:true}
    Object.keys(out).forEach(function(k) {
        if(out[k] != null && typeof out[k] == 'object' && out[k].htDeleteKey) {
            delete out[k];
        }
    });
    return out;

};

function strParser(args, childValidators, data) {
    args = merge(args, {min: null, max : null, enum : null});
    if(!data && !args.opt) throw new Error("required String");
    if(!data && args.opt) return DELETEKEY;
    var type = typeof data;
    if(type !== "string") throw new Error("required String, recieved " + type+", "+data);
    if(args.min !== null && data.length < args.min) {
        throw new Error("string length must be greater than "+args.min);
    }
    if(args.max !== null && data.length > args.max) {
        throw new Error("string length must be less than or equal to "+args.max);
    }
    if(Array.isArray(args.enum)) {
        var match = false;
        for(var i=0; i<args.enum.length; i++) {
            if(args.enum[i] == data) {
                match = true;
                break;
            }
        }
        if(!match) throw new Error("string does not match enum: "+args.enum);
    }
    return data;
}

function numParser(args, childValidators, data) {
    args = merge(args, {min: null, max : null});
    if(!data && !args.opt) throw new Error("required Number");
    if(!data && args.opt) return DELETEKEY;
    var origType = typeof data;
    data = Number(data);
    if(isNaN(data)) throw new Error("required Number, recieved " + origType);
    if(args.min && data < args.min) {
        throw new Error("must be greater than "+args.min);
    }
    if(args.max && data > args.max) {
        throw new Error("must be less than or equal to "+args.max);
    }
    return data;
}

function dateParser(args, childValidators, data) {
    args = merge(args, {min: null, max : null});
    if(!data && !args.opt) throw new Error("required Date");
    if(!data && args.opt) return DELETEKEY;
    var origType = typeof data;
    d = new Date(data);
    if(!(d instanceof Date) || isNaN(d.getTime())) {
        throw new Error("required date or Date compatible string, recieved ("+
                origType+") "+ data.toString());
    }
    if(args.min && d.getTime() < new Date(args.min).getTime()) {
        throw new Error("must be greater than "+new Date(args.min));
    }
    if(args.max && d.getTime() > new Date(args.max).getTime()) {
        throw new Error("must be less than or equal to "+new Date(args.max));
    }
    return d;
}

function boolParser(args, childValidators, data) {
    if(data === null && !args.opt) throw new Error("required Boolean");
    if(data === null && args.opt) return DELETEKEY;
    return Boolean(data);
}


function emailParser(args, childValidators, data) {
    args = merge(args, {normalize : true});
    if(!data && !args.opt) throw new Error("required Email address");
    if(!data && args.opt) return DELETEKEY;
    var type = typeof data;
    if(type !== "string") throw new Error("required String Email, recieved " + type+", "+data);
    data = data.trim();
    if(args.normalize) data = data.toLowerCase();
    if(!isemail(data)) throw new Error('Invalid Email: ' + data);
    return data;
}
