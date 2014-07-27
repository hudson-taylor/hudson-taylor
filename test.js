ht = require('./index');

// A simple echo service
var server = new ht.Server();
server.add('echo', echoServiceSetup);
server.listenHTTP({port: 7000});
server.listenTCP({port: 7001});

function echoServiceSetup(s, ready) {
    s.on("simple", {}, function(data, callback) {
        callback(null, data.message);
    });
    ready();
}


// Connect to the service via HTTP and echo something
var s = new ht.Services();
s.connect("echoHTTP", new ht.HTTPClient("echo", "localhost", 7000));
s.connect("echoTCP", new ht.TCPClient("echo", "localhost", 7001));

s.remote("echoTCP", "simple", { message : "hello world via TCP!" }, function(err, data) {
    if(err) console.log(err);
    console.log(data);
});
s.remote("echoHTTP", "simple", { message : "hello world via HTTP!" }, function(err, data) {
    if(err) console.log(err);
    console.log(data);
});


