"use strict";

var Client     = require('../lib/client');
var Transports = require('../lib/transports')
var Service    = require('../lib/service');
var Schema     = require('../lib/schema');

var number     = 10;
var multiplyBy = 5;

// Make sure you pass the same instance
// of Transports.Local to both Service
// and Client or else this won't work!
var mathTransport = new Transports.Local();

var mathService = new Service(mathTransport);

mathService.on('multiply', {
    number: Schema.Number(),
    by:     Schema.Number()
}, function(data, callback) {
    callback(null, data.number * data.by);
});

var client = new Client({
    'math': mathTransport
});

// If ALL of your services specified
// use local transports, you do not need 
// to call connect here either.
client.connect(function(err) {

    client.call('math', 'multiply', {
        number: number,
        by:     multiplyBy
    }, function(err, response) {

        if(err) {
            console.error("An error occured multiplying your number!");
            console.error(err);
            process.exit(1);
        }

        console.log('%d * %d = %d', number, multiplyBy, response);

    });

});