// Copyright 2012 Iris Couch, all rights reserved.
//
// Encode DNS messages

var util = require('util')

var constants = require('./constants')

module.exports = { 'State': State
                 }

var SECTIONS = ['question', 'answer', 'authority', 'additional']

function State () {
  var self = this

  self.header = new Buffer(12)
  self.position = 0

  self.question   = []
  self.answer     = []
  self.authority  = []
  self.additional = []

  self.domains = {} // The compression lookup table
}

State.prototype.toBinary = function() {
  var self = this

  var bufs = [self.header]
  self.question  .forEach(function(buf) { bufs.push(buf) })
  self.answer    .forEach(function(buf) { bufs.push(buf) })
  self.authority .forEach(function(buf) { bufs.push(buf) })
  self.additional.forEach(function(buf) { bufs.push(buf) })

  return Buffer.concat(bufs)
}

State.prototype.message = function(msg) {
  var self = this

  // ID
  self.header.writeUInt16BE(msg.id, 0)

  // QR, opcode, AA, TC, RD
  var byte = 0
  byte |= msg.type == 'response' ? 0x80 : 0x00
  byte |= msg.authoritative      ? 0x04 : 0x00
  byte |= msg.truncated          ? 0x02 : 0x00
  byte |= msg.recursion_desired  ? 0x01 : 0x00

  var opcode_names = ['query', 'iquery', 'status', null, 'notify', 'update']
    , opcode = opcode_names.indexOf(msg.opcode)

  if(opcode == -1 || typeof msg.opcode != 'string')
    throw new Error('Unknown opcode: ' + msg.opcode)
  else
    byte |= (opcode << 3)

  self.header.writeUInt8(byte, 2)

  // RA, Z, AD, CD, Rcode
  byte = 0
  byte |= msg.recursion_available ? 0x80 : 0x00
  byte |= msg.authenticated       ? 0x20 : 0x00
  byte |= msg.checking_disabled   ? 0x10 : 0x00
  byte |= (msg.responseCode & 0x0f)

  self.header.writeUInt8(byte, 3)

  self.position = 12 // the beginning of the sections
  SECTIONS.forEach(function(section) {
    var records = msg[section] || []
    records.forEach(function(rec) {
      self.record(section, rec)
    })
  })

  // Write the section counts.
  self.header.writeUInt16BE(self.question.length    , 4)
  self.header.writeUInt16BE(self.answer.length      , 6)
  self.header.writeUInt16BE(self.authority.length   , 8)
  self.header.writeUInt16BE(self.additional.length  , 10)
}

State.prototype.record = function(section_name, record) {
  var self = this

  var body = []
    , buf

  // Write the record name.
  buf = self.encode(record.name)
  body.push(buf)
  self.position += buf.length

  var type = constants.type_to_number(record.type)
    , clas = constants.class_to_number(record.class)

  // Write the type.
  buf = new Buffer(2)
  buf.writeUInt16BE(type, 0)
  body.push(buf)
  self.position += 2

  // Write the class.
  buf = new Buffer(2)
  buf.writeUInt16BE(clas, 0)
  body.push(buf)
  self.position += 2

  if(section_name != 'question') {
    // Write the TTL.
    buf = new Buffer(4)
    buf.writeUInt32BE(record.ttl || 0, 0)
    body.push(buf)
    self.position += 4

    // Write the rdata. Update the position now (the rdata length value) in case self.encode() runs.
    var match, rdata
    switch (record.class + ' ' + record.type) {
      case 'IN A':
        rdata = record.data || ''
        match = rdata.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
        if(!match)
          throw new Error('Bad '+record.type+' record data: ' + JSON.stringify(record))
        rdata = [ +match[1], +match[2], +match[3], +match[4] ]
        break
      case 'IN MX':
        var preference = new Buffer(2)
        preference.writeUInt16BE(record.data[0], 0)

        var host = record.data[1]
        host = self.encode(host, 2 + 2) // Adjust for the rdata length + preference values.

        // Flatten the data back out
        rdata = Array.prototype.slice.call(Buffer.concat([preference, host]))
        break
      case 'IN SOA':
        var mname   = self.encode(record.data.mname, 2) // Adust for rdata length
          , rname   = self.encode(record.data.rname, 2 + mname.length)
          , soa = [ mname
                  , rname
                  , buf32(record.data.serial)
                  , buf32(record.data.refresh)
                  , buf32(record.data.retry)
                  , buf32(record.data.expire)
                  , buf32(record.data.ttl)
                  ]

        // Flatten the data back out
        rdata = Array.prototype.slice.call(Buffer.concat(soa))
        break
      case 'IN NS':
      case 'IN CNAME':
        rdata = self.encode(record.data, 2) // Adjust for the rdata length
        break
      case 'NONE A':
        // I think this is no data, from RFC 2136 S. 2.4.3.
        rdata = []
        break
      default:
        throw new Error('Unsupported record type: ' + JSON.stringify(record))
    }

    // Write the rdata length. (The position was already updated.)
    buf = new Buffer(2)
    buf.writeUInt16BE(rdata.length, 0)
    body.push(buf)
    self.position += 2

    // Write the rdata.
    self.position += rdata.length
    if(rdata.length > 0)
      body.push(new Buffer(rdata))
  }

  self[section_name].push(Buffer.concat(body))
}

State.prototype.encode = function(domain, position_offset, option) {
  var self = this

  domain = domain.replace(/\.$/, '') // Strip the trailing dot.
  position = self.position + (position_offset || 0)

  var body = []
    , bytes

  var i = 0
  while(++i < 20) {
    if(domain == '') {
      // Encode the root domain and be done.
      body.push(new Buffer([0]))
      return Buffer.concat(body)
    }

    else if(self.domains[domain] && option !== 'nocompress') {
      // Encode a pointer and be done.
      body.push(new Buffer([0xc0, self.domains[domain]]))
      return Buffer.concat(body)
    }

    else {
      // Encode the next part of the domain, saving its position in the lookup table for later.
      self.domains[domain] = position

      var parts = domain.split(/\./)
        , car = parts[0]
      domain = parts.slice(1).join('.')

      // Write the first part of the domain, with a length prefix.
      //var part = parts[0]
      var buf = new Buffer(car.length + 1)
      buf.write(car, 1, car.length, 'ascii')
      buf.writeUInt8(car.length, 0)
      body.push(buf)
      position += buf.length
      //bytes.unshift(bytes.length)
    }
  }

  throw new Error('Too many iterations encoding record: ' + JSON.stringify(record))
}


//
// Utilities
//

function buf32(value) {
  var buf = new Buffer(4)
  buf.writeUInt32BE(value, 0)
  return buf
}

function buf16(value) {
  var buf = new Buffer(2)
  buf.writeUInt16BE(value, 0)
  return buf
}

function flat(data) {
  return data.reduce(flatten, [])

  function flatten(state, element) {
    if(Buffer.isBuffer(element))
      element = Array.prototype.slice.call(element)

    if(Array.isArray(element))
      return state.concat(element)
    else
      throw new Error('Unknown data element: ' + JSON.stringify(element))
  }
}
