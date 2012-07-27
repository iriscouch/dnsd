#!/usr/bin/env node
//
// Copyright 2012 Iris Couch, all rights reserved.
//
// Test displaying DNS records

var fs = require('fs')
var tap = require('tap')
var test = tap.test
var util = require('util')

var Message = require('../message')

test('Display a message', function(t) {
  var file = 'oreilly.com-response'
  fs.readFile(__dirname+'/data/'+file, function(er, data) {
    if(er)
      throw er

    var msg = new Message(data)
      , str = util.format('%s', msg)
      , json = util.format('%j', msg)

    t.ok(str, 'Message can stringify')
    t.ok(json, 'Message can JSONify')

    t.end()
  })
})
