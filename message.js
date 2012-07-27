// Copyright 2012 Iris Couch, all rights reserved.
//
// Test displaying DNS records

var util = require('util')
var parse = require('./parse')

module.exports = DNSMessage

var SECTIONS = ['question', 'answer', 'authority', 'additional']

// A DNS message.  This is an easy-to-understand object representation of
// standard DNS queries and responses.
//
// Attributes:
// * id - a number representing the unique query ID
// * flags - a DNSFlags object from the header flags
// * question (optional) - a DNSRecord of the question section
// * answer (optional) - a DNSRecord of the answer section
// * authority (optional) - a DNSRecord of the authority section
// * additional (optional) - a DNSRecord of the additional section
// * body - a Buffer containing the raw message data
//
// Methods:
// * toString() - return a human-readable representation of this message
// * toJSON() - Return a JSON-friendly represenation of this message
function DNSMessage (packet_data) {
  this.id = null
  this.flags = null
  this.body = packet_data

  this.parse()
}

DNSMessage.prototype.parse = function() {
  var self = this

  self.id = parse.id(self.body)
  self.flags = new DNSFlags(self.body)

  SECTIONS.forEach(function(section) {
    var count = parse.record_count(self.body, section)
    if(count !== null) {
      self[section] = []
      for(var i = 0; i < count; i++)
        self[section].push(new DNSRecord(self.body, section, i))
    }
  })
}

DNSMessage.prototype.toString = function() {
  var self = this
  var info = []

  info.push(util.format("ID     : %d", self.id))
  info.push(self.flags.toString())

  SECTIONS.forEach(function(section) {
    if(self[section]) {
      info.push(util.format(';; %s SECTION:', section.toUpperCase()))
      self[section].forEach(function(record) {
        info.push(record.toString())
      })
    }
  })

  return info.join('\n')
}

DNSMessage.prototype.toJSON = function() {
  var result = {}
  for(var key in this) {
    if(key != 'body')
      result[key] = this[key]
  }
  return result
}


// Flags from a DNS message headers
//
// Attributes:
// * type                - String ('question', 'answer')
// * opcode              - "query", "iquery", "status", "unassigned", "notify", "update"
// * authoritative       - Boolean
// * truncated           - Boolean
// * recursion_desired   - Boolean
// * recursion_available - Boolean
// * reponse             - Number (server response code)
function DNSFlags (packet_data) {
  this.type                = null
  this.opcode              = null
  this.authoritative       = null
  this.truncated           = null
  this.recursion_desired   = null
  this.recursion_available = null
  this.response            = null

  this.parse(packet_data)
}

DNSFlags.prototype.parse = function(body) {
  var self = this

  var is_response = parse.flag(body, 'qr')
  self.type = is_response ? 'answer' : 'question'

  self.response            = parse.flag(body, 'rcode')
  self.authoritative       = !! parse.flag(body, 'aa')
  self.truncated           = !! parse.flag(body, 'tc')
  self.recursion_desired   = !! parse.flag(body, 'rd')
  self.recursion_available = !! parse.flag(body, 'ra')

  var opcode_names = ['query', 'iquery', 'status', 'unassigned', 'notify', 'update']
    , opcode = parse.flag(body, 'opcode')
  self.opcode = opcode_names[opcode] || 'unassigned'
}

DNSFlags.prototype.toString = function() {
  var self = this
  return [ "Headers:"
         , util.format("  Type               : %s", self.type)
         , util.format("  Opcode             : %s", self.opcode)
         , util.format("  Authoritative      : %s", self.authoritative)
         , util.format("  Truncated          : %s", self.truncated)
         , util.format("  Recursion Desired  : %s", self.recursion_desired)
         , util.format("  Recursion Available: %s", self.recursion_available)
         , util.format("  Response Code      : %d", self.response)
         ].join('\n')
}



// An individual record from a DNS message
//
// Attributes:
// * name        - Host name
// * type        - Query type ('A', 'NS', 'CNAME', etc. or 'Unknown')
// * query_class - Network class ('IN', 'None' 'Unknown')
// * ttl         - Time to live for the data in the record
// * data        - The record data value, or null if not applicable
function DNSRecord (body, section_name, record_num) {
  this.name = null
  this.type = null
  this.query_class = null
  this.ttl  = null
  this.data = null

  this.parse(body, section_name, record_num)
}

DNSRecord.prototype.parse = function(body, section_name, record_num) {
  var self = this

  self.name = parse.record_name(body, section_name, record_num)
  self.ttl  = parse.record_ttl(body, section_name, record_num)
  self.query_class = parse.record_class(body, section_name, record_num)

  var type = parse.record_type(body, section_name, record_num)
    , types = { a     : 'A'
              , ns    : 'NS'
              , cname : 'CNAME'
              , soa   : 'SOA'
              , 'null': 'NULL'
              , ptr   : 'PTR'
              , hinfo : 'HINFO'
              , mx    : 'MX'
              , txt   : 'TXT'
              , sig   : 'SIG'
              , key   : 'KEY'
              , aaaa  : 'AAAA'
              , loc   : 'LOC'
              , srv   : 'SRV'
              , tsig  : 'TSIG'
              , ixfr  : 'IXFR'
              , axfr  : 'AXFR'
              , any   : 'ANY'
              , zxfr  : 'ZXFR'
              }

  self.type = types[type]
  if(! self.type)
    throw new Error('Record '+record_num+' in section "'+section_name+'" has unknown type: ' + type)

  var rdata = parse.record_data(body, section_name, record_num)
  if(self.type == 'A' && rdata.length == 4)
    self.data = inet_ntoa(rdata)
  else if(~ ['NS', 'CNAME', 'SOA', 'PTR'].indexOf(self.type))
    self.data = parse.uncompress(body, rdata) // XXX: I think it doesn't work this way.
  else if(self.type == 'MX')
    self.data = parse.mx(rdata)
  else
    self.data = rdata
}

DNSRecord.prototype.toString = function() {
  var self = this
  return [ width(23, self.name)
         , width( 7, self.ttl)
         , width( 7, self.query_class)
         , width( 7, self.type)
         , Buffer.isBuffer(self.data) ? self.data.toString('hex') : self.data
         ].join(' ')
}

//
// Utilities
//

function width(str_len, str) {
  do {
    var needed = str_len - str.length
    if(needed > 0)
      str = ' ' + str
  } while(needed > 0)

  return str
}
