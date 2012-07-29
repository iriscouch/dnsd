#!/usr/bin/env node

var named = require('../named')

var port = +(process.argv[2] || 5321)
named.createServer(function(req, res) {
  console.log('%j', req)
  req.connection.end()
}).listen(port)

console.log('Listening on port %d', port)

