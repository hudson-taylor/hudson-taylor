"use strict";

var Service    = require('../lib/service');
var Transports = require('../lib/transports')

var config = { host: '0.0.0.0', port: 10000 };

var transport = new Transports.TCP(config);

var identService = new Service(transport, config);

identService.on('getUser', {}, function(req, callback) {

    // echo name back
    callback(null, { name: req.name });

});

identService.listen(function() {
  console.log("Started to serve requests on %s:%d", config.host, config.port);
});