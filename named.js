// Copyright 2012 Iris Couch, all rights reserved.
//
// The named package API

var Message = require('./message')

module.exports = { 'parse': parse
                 , 'stringify': stringify
                 }

function parse(packet) {
  return new Message(packet)
}

function stringify(message) {
  if(! (message instanceof Message))
    throw new Error('Only parsed DNS messages are supported')
  return new Buffer('TODO')
}
