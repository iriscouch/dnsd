#!/usr/bin/env node

var named = require('../iris-named')

var port = +(process.argv[2] || 5321)
named.createServer(function(req, res) {
  console.log('%s:%s/%s %j', req.connection.remoteAddress, req.connection.remotePort, req.connection.type, req)
  req.connection.end()
}).listen(port)

console.log('Listening on port %d', port)

