// Copyright 2012 Iris Couch, all rights reserved.
//
// Server routines

var net = require('net')
var util = require('util')

var Message = require('./message')

module.exports = createServer

function createServer(handler) {
  return new Server(handler)
}


function Server (handler) {
  this.handler = handler
}


Server.prototype.listen = function(port, ip) {
  throw new Error('Not implemented')
}
