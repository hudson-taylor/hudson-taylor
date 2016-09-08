
'use strict'

exports.Client = require('./lib/client')
exports.Service = require('./lib/service')
exports.Transports = require('./lib/transports')

exports.utils = require('ht-utils')

exports.proxy = function (client) {
  return require('./lib/proxy')(client)
}
