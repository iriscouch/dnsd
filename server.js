// Copyright 2012 Iris Couch, all rights reserved.
//
// Server routines

var net = require('net')
var util = require('util')
var dgram = require('dgram')
var events = require('events')

var Message = require('./message')

module.exports = createServer

function createServer(handler) {
  return new Server(handler)
}


util.inherits(Server, events.EventEmitter)
function Server (handler) {
  var self = this
  events.EventEmitter.call(self)

  self.log = console

  if(handler)
    self.on('request', handler)

  self.udp = dgram.createSocket('udp4')
  self.tcp = net.createServer()

  self.udp.on('close', function() { self.close() })
  self.tcp.on('close', function() { self.close() })

  self.udp.on('error', function(er) { self.emit('error', er) })
  self.tcp.on('error', function(er) { self.emit('error', er) })

  self.tcp.on('connection', function(connection) { self.on_connection(connection) })
  self.udp.on('message', function(msg, rinfo) { self.on_message(msg, rinfo) })

  var listening = {'tcp':false, 'udp':false}
  self.udp.once('listening', function() {
    listening.udp = true
    if(listening.tcp)
      self.emit('listening')
  })
  self.tcp.once('listening', function() {
    listening.tcp = true
    if(listening.udp)
      self.emit('listening')
  })
}

Server.prototype.listen = function(port, ip) {
  var self = this
  self.port = port
  self.ip   = ip || '0.0.0.0'

  self.udp.bind(port, ip)
  self.tcp.listen(port, ip)
}

Server.prototype.close = function() {
  var self = this

  if(self.udp._receiving)
    self.udp.close()

  if(self.tcp._handle)
    self.tcp.close(function() {
      self.emit('close')
    })
}

Server.prototype.on_connection = function(connection) {
  var self = this

  connection.on('data', function(data) {
    self.log.log('Data: %s', util.inspect(data))
  })
}

Server.prototype.on_message = function(msg, rinfo) {
  var self = this

  self.log.info('Message from %j: %s', rinfo, util.inspect(msg))
}
