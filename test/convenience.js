// Copyright 2012 Iris Couch, all rights reserved.
//
// Test convenience functions

var tap = require('tap')
var test = tap.test
var util = require('util')

var Message = require('../message')
var convenient = require('../convenient')

test('Disabled convenience routines', function(t) {
  var noop = convenient.defaults({'convenient':false})

  var obj = {"id":45782,"type":"request","responseCode":0,"opcode":"query","authoritative":false,"truncated":false
            ,"recursion_desired":false,"recursion_available":false,"authenticated":false,"checking_disabled":false
            ,"question":[{"name":"example.iriscouch.com","type":"A","class":"IN"}]
            }

  var out = dup(obj)
  noop.init_response(out)
  noop.final_response(out)
  t.same(out, obj, 'Convenience functions do nothing when disabled')
  t.end()
})

test('Plain objects work in convenience functions', function(t) {
  t.doesNotThrow(function() { convenient.init_response({}) }, 'Init a plain object, not a Response')
  t.doesNotThrow(function() { convenient.final_response({}) }, 'Finalize a plaion object, not a Response')
  t.end()
})

test('Convenient responses', function(t) {
  var obj = new Message({'id':1111})
    , answer = [{'class':'IN', 'type':'A', 'data':'127.0.0.1'}]
    , response = {'id':2222, 'answer':answer}

  var out = convenient.final_response(obj, response)
  t.equal(out.id, 2222, 'Specify a verbatim response object, same id')
  t.same(out.answer, answer, 'Specify a verbatim response object, same sections')

  var out = convenient.final_response(obj, answer)
  t.equal(out.answer.length, 1, 'Specify an answer array 1')
  t.same(out.answer[0], answer[0], 'Specify an answer array 2')

  t.end()
})


function dup(obj) {
  return JSON.parse(JSON.stringify(obj))
}
