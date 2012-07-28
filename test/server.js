// Copyright 2012 Iris Couch, all rights reserved.
//
// Test DNS server

var tap = require('tap')
var test = tap.test
var util = require('util')

var API = require('../iris-named')

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
