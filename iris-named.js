// Copyright 2012 Iris Couch, all rights reserved.
//
// The iris-named API

var Message = require('./message')
var createServer  = require('./server')

module.exports = { 'parse': parse
                 , 'stringify': stringify
                 , 'createServer': createServer
                 }

function parse(packet) {
  return new Message(packet)
}

function stringify(message) {
  if(! (message instanceof Message))
    throw new Error('Only parsed DNS messages are supported')
  return new Buffer('TODO')
}
