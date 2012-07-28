// Copyright 2012 Iris Couch, all rights reserved.
//
// Test DNS server

var tap = require('tap')
var test = tap.test
var util = require('util')

var API = require('../named')

test('Server API', function(t) {
  // The idea is to mimic the http or net server API.
  t.type(API.createServer, 'function', 'createServer() API call')
  t.equal(API.createServer.length, 1, 'createServer() takes one argument')

  var server
  t.doesNotThrow(function() { server = API.createServer(function(){}) }, 'Create a server')
  t.type(server.listen, 'function', 'Server has a .listen() method')
  t.equal(server.listen.length, 2, 'listen() method takes two parameters')

  t.end()
})

test('Network server', function(t) {
  var port = 5321

  var server = API.createServer(function(req, res) {
    console.log('Req: %j', req)
    console.log('Res: %j', res)
    res.end()
  })

  var events = {'listening':0, 'close':0, 'error':0}
  server.on('listening', function() { events.listening += 1 })
  server.on('close', function() { events.close += 1 })
  server.on('error', function() { events.error += 1 })

  server.listen(port, '127.0.0.1')
  setTimeout(check_init, 150)
  setTimeout(check_stop, 200)

  function check_init() {
    t.equal(events.listening, 1, 'Fired "listening" event')
    t.equal(events.close, 0, 'No "close" events')
    t.equal(events.error, 0, 'No "error" events')

    server.close()
  }

  function check_stop() {
    t.equal(events.close, 1, 'Fired "close" event')
    t.equal(events.error, 0, 'Still no "error" events')

    t.end()
  }
})
