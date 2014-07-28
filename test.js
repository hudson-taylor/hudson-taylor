ht = require('./index');

// A simple echo service
var server = new ht.Server();
server.add('echo', echoServiceSetup);
server.listenHTTP({port: 7000});

function echoServiceSetup(s, ready) {
    s.on("simple", {}, function(data, callback) {
        callback(null, data.message);
    });
    ready();
}


// Connect to the service via HTTP and echo something
var s = new ht.Services();
s.connect("echo", new ht.HTTPClient("echo", "localhost", 7000));

s.remote("echo", "simple", { message : "hello world via HTTP!" }, function(err, data) {
    if(err) console.log(err);
    console.log(data);
});


//connect via TCP
//server.listenTCP({port: 7001});
//s.connect("echoTCP", new ht.TCPClient("echo", "localhost", 7001));
//s.remote("echoTCP", "simple", { message : "hello world via TCP!" }, function(err, data) {
//    if(err) console.log(err);
//    console.log(data);
//});

