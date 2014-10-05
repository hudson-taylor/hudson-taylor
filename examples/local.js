"use strict";

var Client     = require("../lib/client");
var Transports = require("../lib/transports");
var Service    = require("../lib/service");
var s          = require("ht-schema");

var number     = 10;
var multiplyBy = 5;

// Make sure you pass the same instance
// of Transports.Local to both Service
// and Client or else this won"t work!
var mathTransport = new Transports.Local();

var mathService = new Service(mathTransport, {logger : console.log});

mathService.on("multiply", s.Object({
    number: s.Number(),
    by:     s.Number()
}), function(data, callback, logger) {
    logger(data);
    callback(null, data.number * data.by);
});

var client = new Client({
    "math": mathTransport
});

// If ALL of your services specified
// use local transports, you do not need 
// to call connect here either.
client.connect(function(err) {

    if(err) {
        console.error("There was an error connecting to services:");
        console.error(err);
        process.exit(1);
    }

    client.call("math", "multiply", {
        number: number,
        by:     multiplyBy
    }, function(err, response) {

        if(err) {
            console.error("An error occured multiplying your number!");
            console.error(err);
            process.exit(1);
        }

        console.log("%d * %d = %d", number, multiplyBy, response);

    });

});
