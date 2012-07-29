#!/usr/bin/env node

var named = require('../named')

var port = +(process.argv[2] || 5321)
named.createServer(function(req, res) {
  console.log('%s:%s/%s %j', req.connection.remoteAddress, req.connection.remotePort, req.connection.type, req)
  res.end('1.1.1.' + req.question[0].name.length)
}).listen(port)
  .zone('oreilly.com', 'ns1.iriscouch.net', 'us@iriscouch.com', 'now', 7200, 1800, 1209600, 600)

console.log('Listening on port %d', port)

