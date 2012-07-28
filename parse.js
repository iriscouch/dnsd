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
                 , 'mx': mx
                 }


function id(msg) {
  return msg.readUInt16BE(0)
}

function qr(msg) {
  return msg.readUInt8(2) >> 7
}

function opcode(msg) {
  return (msg.readUInt8(2) >> 3) & 0x0f
}

function aa(msg) {
  return (msg.readUInt8(2) >> 2) & 0x01
}

function tc(msg) {
  return (msg.readUInt8(2) >> 1) & 0x01
}

function rd(msg) {
  return msg.readUInt8(2) & 0x01
}

function ra(msg) {
  return msg.readUInt8(3) >> 7
}

function ad(msg) {
  return msg.readUInt8(3) >> 5 & 0x01
}

function cd(msg) {
  return msg.readUInt8(3) >> 4 & 0x01
}

function rcode(msg) {
  return msg.readUInt8(3) & 0x0f
}

function record_count(msg, name) {
  if(name == 'question')
    return msg.readUInt16BE(4)
  else if(name == 'answer')
    return msg.readUInt16BE(6)
  else if(name == 'authority')
    return msg.readUInt16BE(8)
  else if(name == 'additional')
    return msg.readUInt16BE(10)
  else
    throw new Error('Unknown section name: ' + name)
}

function record_name(msg, section_name, offset) {
  var rec = record(msg, section_name, offset)
  return rec.name
}

function record_class(msg, section_name, offset) {
  var rec = record(msg, section_name, offset)
  return rec.class
}

function record_type(msg, section_name, offset) {
  var rec = record(msg, section_name, offset)
  return rec.type
}

function record_ttl(msg, section_name, offset) {
  var rec = record(msg, section_name, offset)
  return rec.ttl
}

function record_data(msg, section_name, offset) {
  var rec = record(msg, section_name, offset)
  return rec.data
}

function record_class(msg, section_name, offset) {
  var rec = record(msg, section_name, offset)
  return rec.class
}

function record(msg, section_name, offset) {
  if(typeof offset != 'number' || isNaN(offset) || offset < 0)
    throw new Error('Offset must be a natural number')

  var sects = sections(msg) // TODO: memoize this.

  var records = sects[section_name]
  if(!records)
    throw new Error('No such section: "'+section_name+'"')

  var rec = records[offset]
  if(!rec)
    throw new Error('Bad offset for section "'+section_name+'": ' + offset)

  return rec
}

function sections(msg) {
  var state = 'question'
    , position = 12 // First byte of the question section
    , result = {'question':[], 'answer':[], 'authority':[], 'additional':[]}
    , need = { 'question'  : record_count(msg, 'question')
             , 'answer'    : record_count(msg, 'answer')
             , 'authority' : record_count(msg, 'authority')
             , 'additional': record_count(msg, 'additional')
             }

  while(true) {
    switch (state) {
      case 'question':
        if(result.question.length < need.question)
          add_record()
        else
          state = 'answer'
        break
      case 'answer':
        if(result.answer.length < need.answer)
          add_record()
        else
          state = 'authority'
        break
      case 'authority':
        if(result.authority.length < need.authority)
          add_record()
        else
          state = 'additional'
        break
      case 'additional':
        if(result.additional.length < need.additional)
          add_record()
        else
          state = 'done'
        break
      case 'done':
        return result
      default:
        throw new Error('Unknown parsing state at position '+position+': '+JSON.stringify(state))
    }
  }

  function add_record() {
    var record = {}

    var data = domain_parts(msg, position)
    record.name = data.parts.join('.')
    position += data.length

    record.type  = msg.readUInt16BE(position + 0)
    record.class = msg.readUInt16BE(position + 2)
    position += 4

    if(state != 'question') {
      record.ttl    = msg.readUInt32BE(position + 0)
      var rdata_len = msg.readUInt16BE(position + 4)

      position += 6
      record.data = msg.slice(position, position + rdata_len)

      position += rdata_len
    }

    result[state] = result[state] || []
    result[state].push(record)
  }
}

function mx(msg, data) {
  return [ data.readUInt16BE(0)
         , uncompress(msg, data.slice(2))
         ]
}

function uncompress(msg, offset) {
  var data = domain_parts(msg, offset)
  return data.parts.join('.')
}

function domain_parts(msg, offset) {
  if(Buffer.isBuffer(offset)) {
    var full_message = msg
    msg = offset
    offset = 0
  }

  if(typeof offset != 'number' || isNaN(offset) || offset < 0 || offset > msg.length)
    throw new Error('Bad offset: ' + offset)

  var parts = []
    , real_length = 0
    , jumped = false

  var i = 0
  while(true) {
    if(++i >= 100)
      throw new Error('Too many iterations uncompressing name')

    var byte = msg.readUInt8(offset)
      , flags = byte >> 6
      , len   = byte & 0x3f // 0 - 63

    offset += 1
    add_length(1)

    if(flags === 0x03) {
      offset = (len << 8) + msg.readUInt8(offset)
      add_length(1)
      jumped = true

      // If processing so far has just been on some given fragment, begin using the full message now.
      msg = full_message || msg
    }

    else if(len == 0)
      return {'parts':parts, 'length':real_length}

    else {
      parts.push(msg.toString('ascii', offset, offset + len))

      offset += len
      add_length(len)
    }
  }

  function add_length(amount) {
    if(! jumped)
      real_length += amount
  }
}
