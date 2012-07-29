// Copyright 2012 Iris Couch, all rights reserved.
//
// Convenience routines to make it easier to build a service

require('defaultable')(module,
  { 'help_responses': true
  , 'ttl'           : 3600
  }, function(module, exports, DEFS, require) {

if(! DEFS.help_responses) {
  exports.request = function() {}
  exports.response = function() {}
} else {
  exports.request = convenient_request
  exports.response = convenient_response
}


function convenient_request(req) {
}

function convenient_response(res, value) {
  res.type = 'response'
  res.authoritative = true

  // Provide some shortcuts to make responding to requests easier.
  if(res.question.length == 1 && res.question[0].class == 'IN' && res.question[0].type == 'A') {
    // Handle typical name resolution.
    if(res.answer.length == 0)
      res.answer[0] = JSON.parse(JSON.stringify(res.question[0]))

    if(typeof value == 'string' && !('data' in res.answer[0]))
      res.answer[0].data = value
  }

  // Set missing TTLs
  res.answer.forEach(fix_ttl)
  res.authority.forEach(fix_ttl)
  res.additional.forEach(fix_ttl)
}


function fix_ttl(record) {
  if(! ('ttl' in record))
    record.ttl = DEFS.ttl
}


}) // defaultable
