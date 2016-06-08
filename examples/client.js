'use strict'

var Client = require('../lib/client')
var Transports = require('../lib/transports')

var remote = new Client({
  ident: new Transports.TCP({
    host: '127.0.0.1',
    port: 10000
  })
})

remote.connect(function (err) {
  if (err) {
    console.error('an error occured:', err)
    process.exit(1)
  }

  remote.call('ident', 'getUser', {
    name: '1234abcd'
  }, function (err, data) {
    console.log('got response:')
    console.log('  err:', err)   // -> undefined
    console.log('  data:', data) // -> { name: '1234abcd' }
  })
})
