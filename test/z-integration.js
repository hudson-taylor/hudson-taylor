
"use strict";

const assert   = require('assert');
const s        = require('ht-schema');
const bluebird = require('bluebird');

const Service = require('../src/service');
const Client  = require('../src/client');
const Transports = require('../src/transports');

describe("Integrations", function () {
  it("does not double call when callback throws", function (done) {
    var transport = new Transports.Local();
    var service = new Service(transport);
    var client = new Client({ s: transport });

    let countCalled = 0

    service.on("hello", null, function () {
      return new Promise(function (resolve, reject) { 
        resolve('hello')
      })
    })

    client.call('s', 'hello', function (err, result) {
      countCalled++
      throw Error('oops')
    })

    setTimeout(function () {
      switch (countCalled) {
        case 0: throw Error('did not get called at all')
        case 1: return done()
        case 2: throw Error('called multiple times')
      }
    }, 100)
  });
});
