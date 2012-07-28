// Copyright 2012 Iris Couch, all rights reserved.
//
// The named package API

var Message = require('./message')
var createServer  = require('./server')

module.exports = { 'parse': parse
                 , 'binify'   : stringify
                 , 'stringify': stringify
                 , 'createServer': createServer
                 }

function parse(packet) {
  return new Message(packet)
}

function stringify(message) {
  if(! (message instanceof Message))
    throw new Error('Only parsed DNS messages are supported')
  return message.toBinary()
}
