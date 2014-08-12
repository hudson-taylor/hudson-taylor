hudson-taylor
=============

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


Current Version: 0.0.9

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
//index.js
var ht = require("hudson-taylor");
var myService = require("./myservice"); // Import your service.

var server = new ht.Server(); 
server.add("myService", myService.setup);
server.listenHTTP({port : 7001});
```

Services are simply a setup function which takes a Service object with an 'on'
method, and a ready callback. You will use 's.on' to register APIs, 'on' takes
a 'signal' (API end-point), a 'schema' for validating input, and your handler.

TIP: Extra arguments passed to server.add above will be passed to your
service setup function, this is handy for passing in database connections, 
config and other helpers.

```javascript
//myservice.js
exports.setup = function(s, ready) {

    s.on("echo", s.Object({input : s.String({min:3})}), function(data, callback) {
        callback(null, data.input);
    });

    ready(); //Call ready once setup is complete, this allows for async setup. 
}
```

## Client quick-start:

To connect to our service via HTTP, we create an ht.Services object and 
use it to connect to one or more services via a Client connector.

```javascript
var s = new ht.Services();
s.connect("myService", new ht.HTTPClient("myService", "localhost", 7001));

s.remote("myService", "echo", {input : "Hello World!", function(err, res) { 
    // Do things with the response here! 
});
```



## Single-process quick-start:

This lets you get up and running without client/server, just one process to 
start with:



```javascript
// index.js
var s = new ht.Services();
s.connect("myService", new ht.LocalService("myService", myservice.setup, db, config, logger));

s.remote("myService", "echo", {input : "Hello World!", function(err, res) { 
    // Do things with the response here! 
});
```


# The details:

## Methods of communicating between services: 

One of the nice things about HT is that you can connect to a service via several
different methods without having to change your service code in any way. 

This can make deployment very flexible, here are some of the communication 
methods: 

### server method / client method

* listenHTTP / HTTPClient: uses JSON-RPC over HTTP to communicate.
* listenTCP / TCPClient: uses JSON-RPC over TCP to communicate.
* - / LocalClient: Host a service natively in process and use JSON
  and local function calls to communicate.  

In development: 

* listenHTTP / HTTPRoundRobinClient: uses JSON-RPC over HTTP to communicate 
  with multiple instances of a service.

Custom server and client channels can be implemented easily.


## Schemas 

Every API function in HT requires a schema that defines the kind of data that 
function takes. While this may seem laborious at first, HT schemas are very 
pragmatic, combine both validation and coersion in one. This means you are 
free to assume that your data is valid and properly typed every time, no more 
manual validation or type casting required.

Schemas are inherently composible, you can nest schemas inside schemas, infact
this is what happens when you add a String attribute to an Object schema anyway.

Schemas are also extensible, the default ones are defined in lib/schema.js and
they are quite easy to read and create your own. 

Here is an example schema:

```javascript
    var tagSchema = s.Object({
        id : MyCustomValidator(),
        label : s.String()
    });

    var movieSchema = s.Object({
        releaseDate : s.Date({min : '1900', max : new Date()}),
        runningTime : s.Number({min : 0, max : 240}),
        director : s.String(),
        genre : s.String({enum : ["Comedy", "Drama", "Action"]}),
        tags : s.Array([tagSchema]),
        extraInfo : s.Object({ opt : true, strict : false })
    });
```


## Built-in Schema types and their default attributes:

### s.Object { opt : false, strict : true }
 
An object validator with one string attribute:
```javascript
    s.Object({ name : s.String()});
```
   
A liberal object validator that can have any attribute:
```javascript
    s.Object({strict : false});
```
A liberal object validator that can have any attribute but specifies that a 
cat attribute must be an object with a name:
```javascript
    s.Object({strict : false}, { cat : s.Object({ name: s.String() }) });
```

An object validator that requires a foo attribute but remaps it to bar in output.
```javascript
    s.Object({ 'foo as bar' : s.String() });
```


### s.Number { opt : false }

### s.String { opt : false, min : null, max : null, enum : null }

A string validator with an enum restriction
```javascript
    s.String({enum : ["apples", "oranges"]});
```

A string validator with a length limit
```javascript
    s.String({max : 256});
```

### s.Array { opt : false }

An array validator which can only contain Dates.
```javascript
    s.Array([s.Date()]);
```
An optional array validator which can contain cats and dogs.

Note: Array validators match in precidence left to right.
```javascript
    var catSchema = s.Object({ 
        name : s.String(), 
        attitude : s.String({ enum : ["Surly", "Dissinterested", "bemused"]})
    });

    var dogSchema = s.Object({ 
        name : s.String(), 
        attitude : s.String({ enum : ["Excited", "Confused", "Happy"]})
    });

    s.Array({opt : true}, [catSchema, dogSchema]);
```

### s.Boolean { opt : false }

### s.Date { opt : false, min : null, max : null }

### s.Email { opt : false, normalize : true }

If normalize is true (default) then the output email will be lowercased.


## Utils

### ht.utils.expressProxy

expressProxy is a helper that lets you map express.js routes to ht service calls.
The proxy looks for and merges: request.body, request.params, request.query.

```javascript
var services = new ht.Services();
services.connect("myService", new ht.HTTPClient("localhost", 7001));

var app = express();
app.get('/api/echo/:message', ht.utils.expressProxy(services, "myService", "echo")); 

```


