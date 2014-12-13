"use strict";

var Service    = require("../lib/service");
var Transports = require("../lib/transports");
var s          = require("ht-schema");

var config = { host: "0.0.0.0", port: 10000 };

var transport = new Transports.TCP(config);

var identService = new Service(transport);

identService.on("getUser", function(data, callback) {

    // echo name back
    callback(null, { name: data.name });

});

identService.listen(function() {
  console.log("Started to serve requests on %s:%d", config.host, config.port);
});
