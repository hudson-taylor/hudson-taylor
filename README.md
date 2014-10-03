hudson-taylor
=============

Warning: this branch is currently not published on NPM.

Hudson Taylor (ht) is a client/server library for building automatically 
documented, well validated services (SOA) in Node.js

HT comprises of a server library for providing services with well documented 
and defined APIs with validation, and client libraries for calling 
services over a number of transports, HTTP, Websocket, TCP or in-process.

All service APIs have a schema that both document expectations as well as 
validates and pre-processes incoming data. 


As well as providing for seperate processes communicating with eachother, HT 
can be used within a single process to logically partition services. This means
that your project has clean internal interfaces from the outset, and when it 
comes time to scale out you can break-out services and replicate them
horizontally.


Current Version: 0.1.0

Changelog 0.1.0:

 * Extreme refactor of all internals, allows using custom transports and schemas.
   WARNING: This was a major breaking change. Please consult examples and documentation
            to migrate.

Changelog 0.0.11:

 * Provide special value {htDeleteKey:true} which, if returned from a validator,
   shall ensure that the parent validator will delete it's key entirely from any
   output. If this IS the top level validator, it will return null instead.

Changelog 0.0.10:

 * Moved repo from pomke/hudson-taylor to org hudson-taylor/hudson-taylor

Changelog 0.0.9:

 * Merged Someoneweird's branch which closes services asynchronously.

Changelog 0.0.8:

 * Added support for 'foo as bar' keys in schemas, accepts foo, maps to bar.

Changelog 0.0.7:

 * Added Email validator.

Changelog 0.0.6:

 * Added support for an optional '\*' validator to Object validation in non-strict
   mode. The '\*' validator will be run against any undefined attributes.
 * Added unit test for '*' validators.

Changelog 0.0.5:

 * Bug fixes around min/max schema args not matching min values.

Changelog 0.0.3:

 * Added ht.utils.expressProxy for mapping services to express routes. 

Changelog: 0.0.2:

* Added schema support.
* Added unit testing for schemas and basic API use.

### Todos:

 * Automatic documentation generation still WIP



## Server quick-start: 



In your service init you create an ht.Server and add services to it:

```javascript

"use strict";

// Require Hudson-Taylor and its Schema library (optional)
var ht     = require("hudson-taylor");
var Schema = require("ht-schema");

var config = {
    host: '1.2.3.4', // listen on a custom interface
    port: 8082
}

var transport = new ht.Transports.TCP(config);
var service   = new ht.Service(transport, config);

service.on("echo", {
    input: Schema.String({
        min: 3 // Require at least 3 chars
    })
}, function(data, callback) {

    // echo the exact same thing back
    callback(null, data.input);

});

service.listen(function(err) {

    if(err) {
        console.error("There was an error starting the service:", err);
        process.exit(1);
    }

    console.log("Started on port", config.port);

});
```

## Client quick-start:

To connect to our service via HTTP, we create an ht.Services object and 
use it to connect to one or more services via a Client connector.

```javascript

var ht = require("hudson-taylor");

var config = {
    host: '1.2.3.4',
    port: 8082
}

var transport = new ht.Transports.TCP(config);

var remote = new ht.Client({
    echoService: transport
});

remote.connect(function(err) {

    if(err) {
        console.error("There was an error connecting:", err);
        process.exit(1);
    }

    remote.call("echoService", "echo", {
        input: "hello world!"
    }, function(err, response) {

        if(err) {
            console.error("There was an error calling remote service:", err);
            process.exit(1);
        }

        console.log(response); // -> 'hello world!'

    });

});
```



## Single-process quick-start:

This lets you get up and running without client/server, just one process to 
start with:



```javascript

var ht = require("hudson-taylor");

var transport = new ht.Transports.Local();
var service   = new ht.Service(transport);

service.on('echo', {}, function(req, callback) {
    callback(null, req);
});

var remote = new ht.Client({
    myService: transport
});

// You do not need to call .connect if you're only using
// local transports, but if you mix local transports with
// other ones, you do.

remote.call("myService", "echo", { 
    input: "Hello World!"
}, function(err, res) { 
    if(err) {
        console.error("There was an error:", err);
        process.exit(1);
    }
    console.log(res); // -> { input: "Hello World!" }
});
```

# The details:

## Methods of communicating between services: 

One of the nice things about HT is that you can connect to a service via 
methods without having to change your service code in any way. 

Hudson-Taylor is bundled with a couple of low-level transports such as: 

* TCP:   uses long-lived TCP sockets for communication between client & server
* HTTP:  uses HTTP requests
* Local: in-process transport that communicates internally between client & server

Custom transports can be implemented easily, see /lib/transports/http.js for a documented example.

## Schemas

Hudson-Taylors schema library is no longer bundled directly, see [ht-schema](https://github.com/hudson-taylor/ht-schema) instead.

## Utils

### ht.utils.expressProxy

expressProxy is a helper that lets you map express.js routes to ht service calls.
The proxy looks for and merges: request.body, request.params, request.query.

```javascript
var express = require("express");
var ht      = require("hudson-taylor");

var remote = new ht.Client({
    myService: new ht.Transports.HTTP({ host: "127.0.0.1", port: 7001 })
});

var app = express();

app.get('/api/echo/:message', ht.utils.expressProxy(remote, "myService", "echo"));

// etc... 

```
