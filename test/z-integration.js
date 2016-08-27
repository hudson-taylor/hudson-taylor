
"use strict";

const assert   = require('assert');
const s        = require('ht-schema');
const bluebird = require('bluebird');

const Service = require('../src/service');
const Client  = require('../src/client');
const Transports = require('../src/transports');

describe("Integrations", function () {
  it("does not double call when callback throws", function (done) {
    const transport = new Transports.Local();
    const service = new Service(transport);
    const client = new Client({ s: transport });

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
        default: throw Error('called multiple times')
      }
    }, 100)
  });
});
