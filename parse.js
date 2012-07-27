// Copyright 2012 Iris Couch, all rights reserved.
//
// Parse DNS messages

var util = require('util')

module.exports = { 'id': id
                 , 'qr': qr
                 , 'aa': aa
                 , 'tc': tc
                 , 'rd': rd
                 , 'ra': ra
                 , 'ad': ad
                 , 'cd': cd
                 , 'rcode': rcode
                 , 'opcode': opcode
                 , 'record_count': record_count
                 , 'record_name' : record_name
                 , 'record_class': record_class
                 , 'record_ttl'  : record_ttl
                 , 'record_type' : record_type
                 , 'record_data' : record_data
                 , 'uncompress'  : uncompress
                 }


function id(msg) {
  return 1 // TODO
}

function qr(msg) {
  return 1 // TODO
}

function aa(msg) {
  return 1 // TODO
}

function tc(msg) {
  return 1 // TODO
}

function rd(msg) {
  return 1 // TODO
}

function ra(msg) {
  return 1 // TODO
}

function ad(msg) {
  return 1 // TODO
}

function cd(msg) {
  return 1 // TODO
}

function rcode(msg) {
  return 0
}

function opcode(msg) {
  return 0
}

function record_count(msg, name) {
  var label = section_label(name)
  return 1 // TODO
}

function record_name(msg, section_name, offset) {
  return 'TODO'
}

function record_class(msg, section_name, offset) {
  return 'IN' // TODO
}

function record_type(msg, section_name, offset) {
  var result = 12 // ptr // TODO

  if(result < 1 || result > 65535)
    throw new Error('Invalid record type: ' + result)
  else
    return result
}

function record_ttl(msg, section_name, offset) {
  return 86400 // TODO
}

function record_data(msg, section_name, offset) {
  return new Buffer('TODO')
}

function record(msg, section_name, offset) {
  var label = section_label(section_name)

  if(typeof offset != 'number')
    throw new Error('Offset must be a number')

  return 'TODO'
}

function record_class(msg, section_name, offset) {
  return 'Unknown'
  //if self.queryClass == libbind.ns_c_in:
  //  self.queryClass = 'IN'
  //elif self.queryClass == libbind.ns_c_none:
  //  self.queryClass = 'None'
  //else:
  //  self.queryClass = 'Unknown (%d)' % self.queryClass
}

function section_label(name) {
  var labels = {question:'qd', answer:'an', authority:'ns', additional:'ar'}
    , label = labels[name]

  if(label)
    return label
  else
    throw new Error('Invalid section name: ' + name)
}

function mx(rdata) {
  //preference = struct.unpack('!H', rdata[0:2])[0]
  //self.data = "%d %s" % (preference, libbind.ns_name_uncompress(msg, self.rr))
  return [10, 'TODO']
}

function uncompress(msg, rdata) {
  return 'TODO'
}
