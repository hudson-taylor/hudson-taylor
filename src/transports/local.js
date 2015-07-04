
"use strict";

var path = require("path");

var utils = require(path.resolve(__dirname, "../utils"));

var formatError = utils.formatError;

function LocalTransportServerWrapper(o) {
  function LocalTransportServer(fn) {
    o.fn = fn;
  }

  LocalTransportServer.prototype.listen = function (done) {
    done();
  };

  LocalTransportServer.prototype.stop = function (done) {
    done();
  };

  return LocalTransportServer;
}

function LocalTransportClientWrapper(o) {
  function LocalTransportClient() {}

  LocalTransportClient.prototype.connect = function (done) {
    done(); //noop
  };

  LocalTransportClient.prototype.disconnect = function (done) {
    done(); //noop
  };

  LocalTransportClient.prototype.call = function (method, data, callback) {
    // force data to be passed through as valid json
    // both the input, and the response from the service

    data = forceJSON(data);

    if (data && data.error) {
      return callback(formatError(data));
    }

    o.fn(method, data, function (err, response) {
      if (err) {
        return callback(forceJSON(formatError(err)));
      }

      if(!response) {
        return callback();
      }

      var responseErrKeyBefore = response.error;

      response = forceJSON(response);

      if(response.error && response.error != responseErrKeyBefore) {
        // forceJSON error
        return callback(formatError(response));
      }

      return callback(null, response);

    });
  };

  return LocalTransportClient;
}

function LocalTransport() {
  if(!(this instanceof LocalTransport)) {
    return new LocalTransport();
  }
  var o = {};
  this.Server = LocalTransportServerWrapper(o);
  this.Client = LocalTransportClientWrapper(o);
}

module.exports = LocalTransport;

// export forceJSON too
LocalTransport.forceJSON = forceJSON;

function forceJSON(input) {
  if (input === undefined) return;
  // JSON.stringify can throw on circular structures
  try {
    input = JSON.parse(JSON.stringify(input));
  } catch (e) {
    return formatError(e);
  }
  return input;
}