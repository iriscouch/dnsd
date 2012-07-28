// Copyright 2012 Iris Couch, all rights reserved.
//
// Test DNS server

var fs = require('fs')
var tap = require('tap')
var test = tap.test
var util = require('util')
var dgram = require('dgram')

var API = require('../named')

var PORT = 5321

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
  var server = API.createServer(function(req, res) {
    console.log('Req: %j', req)
    console.log('Res: %j', res)
    res.end()
  })

  var events = {'listening':0, 'close':0, 'error':0}
  server.on('listening', function() { events.listening += 1 })
  server.on('close', function() { events.close += 1 })
  server.on('error', function() { events.error += 1 })

  server.listen(PORT, '127.0.0.1')
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

test('UDP queries', function(t) {
  var reqs = { 'ru.ac.th'                   : { id:36215, opcode:'update', recursion:false, name:'dynamic-update' }
             , 'oreilly.com'                : { id:45753, opcode:'query' , recursion:true , name:'oreilly.com-query' }
             , 'www.company.example'        : { id:62187, opcode:'query' , recursion:true , name:'www.company.example-query' }
             , 'www.microsoft.com.nsatc.net': { id:47096, opcode:'query' , recursion:true , name:'www.microsoft.com-query' }
             }

  var i = 0
  var server = API.createServer(check_req)
  server.listen(PORT, '127.0.0.1')

  function check_req(req, res) {
    t.type(req.question, 'Array', 'Got a question message')
    t.equal(req.question.length, 1, 'Got exactly one question')

    var question = req.question[0]
      , name = question.name
      , expected = reqs[name]

    t.ok(expected, 'Found expected request: ' + name)
    t.equal(req.id, expected.id, 'ID match: ' + name)
    t.equal(req.opcode, expected.opcode, 'Opcode match: ' + name)
    t.equal(req.recursion_desired, expected.recursion, 'Recursion match: ' + name)

    res.end()

    i += 1
    if(i == 4) {
      server.close()
      t.end()
    }
  }

  Object.keys(reqs).forEach(function(domain) {
    var data = fs.readFileSync(__dirname + '/../test_data/' + reqs[domain].name)
    //sent.push(data)

    var sock = dgram.createSocket('udp4')
    sock.send(data, 0, data.length, PORT, '127.0.0.1', function() { sock.close() })
  })
})
