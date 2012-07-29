// Copyright 2012 Iris Couch, all rights reserved.
//
// Convenience routines to make it easier to build a service

require('defaultable')(module,
  { 'convenient'    : true
  , 'ttl'           : 3600
  }, function(module, exports, DEFS, require) {

function noop() {}

module.exports = { 'init_response' : init_response
                 , 'final_response': final_response
                 }

if(! DEFS.convenient)
  Object.keys(module.exports).forEach(function(key) { module.exports[key] = noop })


function init_response(res) {
  res.type = 'response'
}

function final_response(res, value) {
  var questions = res.question
    , question = questions[0]

  res.authoritative = true
  res.recursion_available = false

  // Find the zone of authority for this record, if any.
  var names = question && question.name && question.name.split(/\./)
    , zone, soa_record

  while(names && names.length) {
    zone = names.join('.')
    names.shift()

    soa_record = res.connection.server.zones[zone]
    if(soa_record)
      break
  }

  // Add convenience for typical name resolution.
  if(questions.length == 1 && question.kind() == 'IN A') {
    // If the server is authoritative for a zone, add an SOA record for the authoritative answer.
    if(typeof value == 'undefined' && res.answer.length == 0 && res.authority.length == 0) {
      if(soa_record)
        res.authority.push(soa_record)
    }

    // If the value given is an IP address, make that the answer.
    if(typeof value == 'string' && res.answer.length == 0)
      res.answer.push({'class':'IN', 'type':'A', 'name':question.name, 'data':value})
  }

  // Set missing TTLs
  res.answer.forEach(fix_ttl)
  res.authority.forEach(fix_ttl)
  res.additional.forEach(fix_ttl)

  function fix_ttl(record) {
    var zone_minimum = DEFS.ttl
    if(soa_record)
      zone_minimum = soa_record.data.ttl

    record.ttl = Math.max(record.ttl || 0, zone_minimum)
  }
}


}) // defaultable
