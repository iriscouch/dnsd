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
// * id                  - a number representing the unique query ID
// * type                - "request" or "response"
// * response            - Number (server response code)
// * opcode              - "query", "iquery", "status", "unassigned", "notify", "update"
// * authoritative       - Boolean
// * truncated           - Boolean
// * recursion_desired   - Boolean
// * recursion_available - Boolean
// * authenticated       - Boolean
// * checking_disabled   - Boolean
//
// Optional attributes:
// * question (optional) - Array of the question section
// * answer (optional) - Array of the answer section
// * authority (optional) - Array of the authority section
// * additional (optional) - Array of the additional section
//
// Methods:
// * toString() - return a human-readable representation of this message
// * toJSON() - Return a JSON-friendly represenation of this message
function DNSMessage (body) {
  this.id = null
  this.type                = null
  this.responseCode        = null
  this.opcode              = null
  this.authoritative       = null
  this.truncated           = null
  this.recursion_desired   = null
  this.recursion_available = null
  this.authenticated       = null
  this.checking_disabled   = null

  this.parse(body)
}

DNSMessage.prototype.parse = function(body) {
  var self = this

  self.id = parse.id(self.body)

  var qr = parse.qr(self.body)
  self.type = (qr == 0) ? 'request' : 'response'

  self.responseCode = parse.rcode(body)

  var opcode_names = ['query', 'iquery', 'status', null, 'notify', 'update']
  var opcode = parse.opcode(body)
  self.opcode = opcode_names[opcode] || null

  self.authoritative       = !! parse.aa(body)
  self.truncated           = !! parse.tc(body)
  self.recursion_desired   = !! parse.rd(body)
  self.recursion_available = !! parse.ra(body)
  self.authenticated       = !! parse.ad(body)
  self.checking_disabled   = !! parse.cd(body)

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

  var info = [ util.format('ID                 : %d', self.id)
             , util.format("Type               : %s", self.type)
             , util.format("Opcode             : %s", self.opcode)
             , util.format("Authoritative      : %s", self.authoritative)
             , util.format("Truncated          : %s", self.truncated)
             , util.format("Recursion Desired  : %s", self.recursion_desired)
             , util.format("Recursion Available: %s", self.recursion_available)
             , util.format("Response Code      : %d", self.response)
             ]

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
  self.type = record_type_label(type)
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

function record_type_label(type) {
  if(isNaN(type) || typeof type != 'number' || type < 1 || type > 65535)
    throw new Error('Invalid record type: ' + type)

  var types =
    { 0: null
    , 1: 'A'
    , 2: 'NS'
    , 3: 'MD'
    , 4: 'MF'
    , 5: 'CNAME'
    , 6: 'SOA'
    , 7: 'MB'
    , 8: 'MG'
    , 9: 'MR'
    , 10: 'NULL'
    , 11: 'WKS'
    , 12: 'PTR'
    , 13: 'HINFO'
    , 14: 'MINFO'
    , 15: 'MX'
    , 16: 'TXT'
    , 17: 'RP'
    , 18: 'AFSDB'
    , 19: 'X25'
    , 20: 'ISDN'
    , 21: 'RT'
    , 22: 'NSAP'
    , 23: 'NSAP-PTR'
    , 24: 'SIG'
    , 25: 'KEY'
    , 26: 'PX'
    , 27: 'GPOS'
    , 28: 'AAAA'
    , 29: 'LOC'
    , 30: 'NXT'
    , 31: 'EID'
    , 32: 'NIMLOC'
    , 33: 'SRV'
    , 34: 'ATMA'
    , 35: 'NAPTR'
    , 36: 'KX'
    , 37: 'CERT'
    , 38: 'A6'
    , 39: 'DNAME'
    , 40: 'SINK'
    , 41: 'OPT'
    , 42: 'APL'
    , 43: 'DS'
    , 44: 'SSHFP'
    , 45: 'IPSECKEY'
    , 46: 'RRSIG'
    , 47: 'NSEC'
    , 48: 'DNSKEY'
    , 49: 'DHCID'
    , 50: 'NSEC3'
    , 51: 'NSEC3PARAM'
    , 52: 'TLSA'
    // 53 - 54 Unassigned
    , 55: 'HIP'
    , 56: 'NINFO'
    , 57: 'RKEY'
    , 58: 'TALINK'
    , 59: 'CDS'
    // 60 - 98 Unassigned
    , 99: 'SPF'
    , 100: 'UINFO'
    , 101: 'UID'
    , 102: 'GID'
    , 103: 'UNSPEC'
    , 104: 'NID'
    , 105: 'L32'
    , 106: 'L64'
    , 107: 'LP'
    // 108 - 248 Unassigned
    , 249: 'TKEY'
    , 250: 'TSIG'
    , 251: 'IXFR'
    , 252: 'AXFR'
    , 253: 'MAILB'
    , 254: 'MAILA'
    , 255: '*'
    , 256: 'URI'
    , 257: 'CAA'
    // 258 - 32767 Unassigned
    , 32768: 'TA'
    , 32769: 'DLV'
    // 32770 - 65279 Unassigned
    // 65280 - 65534 Private use
    , 65535: 'Reserved'
    }

  var unassigned = [ [53,54], [60,98], [108,248], [258,32767], [32770,65279] ]
  unassigned.forEach(function(pair) {
    var start = pair[0], stop = pair[1]
    for(var i = start; i <= stop; i++)
      types[i] = null
  })

  for(var i = 65280; i <= 65534; i++)
    types[i] = 'Private use'

  return types[type]
}
