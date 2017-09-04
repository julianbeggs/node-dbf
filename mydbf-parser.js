// mydbf-parser based on https://github.com/tamtakoe/node-dbf
// with extra work to add support for several field types:
// Memo field
// Timestamp
// Date field
// Currency field -  Integer 64-bit
// Integer 32-bit
// Double precision number
// Numbers
// Memo field
//
// Tested on dbf tables from Visual FoxPro application
// Assumes "latin1" encoding (aka win-1252)

const fs = require('fs')
const util = require('util')
const EventEmitter = require('events').EventEmitter
const Gregorian = require('./jdToGregorian').jdToGregorian
const ReadDouble = require('./decodeFloats').ReadDouble
const MemoFile = require('memo_file')
const Bignum = require('int64-buffer')

function Header (filename) {
  this.filename = filename
  this.parseFieldSubRecord = this.parseFieldSubRecord.bind(this)
  this.parseDate = this.parseDate.bind(this)

  return this
}

Header.prototype.parse = function (callback) {
  let self = this

  return fs.readFile(this.filename, function (err, buffer) {
    let i
    if (err) {
      throw err
    }
    self.type = ('0x' + buffer.slice(0, 1).toString('hex'))
    self.dateUpdated = self.parseDate(buffer.slice(1, 4))
    self.numberOfRecords = self.convertBinaryToInteger(buffer.slice(4,
      8))
    self.start = self.convertBinaryToInteger(buffer.slice(8, 10))
    self.recordLength = self.convertBinaryToInteger(buffer.slice(10, 12))
    self.codepage = ('0x' + buffer.slice(29, 30).toString('hex'))
    self.fields = (function () {
      let _i, _ref, _results
      _results = []
      for (i = _i = 32, _ref = this.start - 32; _i <= _ref; i = _i +=
          32) {
        _results.push(buffer.slice(i, i + 32))
      }
      return _results
    })
    .call(self)
    .map(self.parseFieldSubRecord)
    return callback(self)
  })
}

Header.prototype.parseDate = function (buffer) {
  let day, month, year
  year = 2000 + this.convertBinaryToInteger(buffer.slice(0, 1))
  month = (this.convertBinaryToInteger(buffer.slice(1, 2))) - 1
  day = this.convertBinaryToInteger(buffer.slice(2, 3))
  return new Date(year, month, day)
    .toISOString()
    .substring(0, 10)
}

Header.prototype.parseFieldSubRecord = function (buffer) {
  let header = {
    name: ((buffer.slice(0, 11))
      .toString('latin1'))
      .replace(/[\u0000]+$/,
        ''),
    type: (buffer.slice(11, 12))
      .toString('latin1'),
    displacement: this.convertBinaryToInteger(buffer.slice(12, 16)),
    length: this.convertBinaryToInteger(buffer.slice(16, 17)),
    decimalPlaces: this.convertBinaryToInteger(buffer.slice(17, 18))
  }
  return header
}

Header.prototype.convertBinaryToInteger = function (buffer) {
  return buffer.readInt32LE(0, true)
}

function Parser (filename) {
  this.filename = filename
  this.parseField = this.parseField.bind(this)
  this.parseRecord = this.parseRecord.bind(this)
  this.parse = this.parse.bind(this)
}

util.inherits(Parser, EventEmitter)

Parser.prototype.parse = function () {
  let self = this
  this.emit('start', this)
  this.header = new Header(this.filename)
  this.header.parse(function (err) {
    let sequenceNumber
    self.emit('header', self.header)
    sequenceNumber = 0
    return fs.readFile(self.filename, function (err, buffer) {
      let loc
      if (err) {
        throw err
      }
      loc = self.header.start
      while (loc < (self.header.start + self.header.numberOfRecords *
        self.header.recordLength) && loc < buffer.length) {
        self.emit('record', self.parseRecord(++sequenceNumber,
          buffer.slice(loc, loc += self.header.recordLength)))
      }
      return self.emit('end', self)
    })
  })
  return this
}

Parser.prototype.parseRecord = function (sequenceNumber, buffer) {
  let field
  let loc
  let record
  let _fn
  let _i
  let _len
  let _ref
  let self = this
  record = {
    '@sequenceNumber': sequenceNumber,
    '@deleted': (buffer.slice(0, 1))[ 0 ] !== 32
  }
  loc = 1
  _ref = this.header.fields
  _fn = function (field) {
    let value = record[ field.name ] = self.parseField(field, buffer.slice(
      loc, loc += field.length))
    return value
  }
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    field = _ref[ _i ]
    _fn(field)
  }
  return record
}

Parser.prototype.parseField = function (field, buffer) {
  // Default case for all field types
  // Remove blanks & null & START OF HEADING
  let value = buffer.toString('latin1')
    .replace(/^\x20+|\x20+$/g, '')
    .replace(/^\u0000+|\u0000+$/g, '')
    .replace(/^\u0001+|\u0001+$/g, '')

  // Memo field
  if (field.type === 'M') {
    // console.log(
    //   `Memo field found in ${this.filename}\n
    //   Fieldname is ${field.name}\n
    //   Buffer: ${util.inspect(buffer, false, null)}\n`
    // )
    // value is reference to block position in FPT file
    // see https://github.com/emmanuelmillionaer/node-memo-parser
    var memoFile = new MemoFile(this.filename.slice(0, this.filename.length -
        4) + '.FPT')
    // console.log(
    //   `MemoFile is: ${util.inspect(memoFile, false, null)}\n
    //   nextFreeBlock: ${memoFile.MemoHeader.nextFreeBlock}`
    // )
    // for ( var i = 0; i < memoFile.MemoHeader.nextFreeBlock; i++) {
    //   console.log(
    //     `i = ${i}: buffer = ${buffer}: value = ${value}\n
    //     memoFile.blockHeader(i) = ${memoFile.blockHeader(i)}\n
    //     memoFile.blockHeader(i).blockSignature = ${memoFile.blockHeader(i).blockSignature}\n
    //     memoFile.getBlockContentAt(i) = ${memoFile.getBlockContentAt(i)}\n`
    //   )
    // }
    value = memoFile.getBlockContentAt(memoFile.MemoHeader.nextFreeBlock - 1)
  // console.log(`Memo content is: ${value}`)
  }
  //  Numbers
  if (field.type === 'N') {
    value = Number(value)
  }
  //  Double precision number
  if (field.type === 'B') {
    value = ReadDouble(buffer)
  }
  // Integer 32-bit
  if (field.type === 'I') {
    value = buffer.readInt32LE(0, true)
  }
  // Currency field -  Integer 64-bit
  if (field.type === 'Y') {
    value = new Bignum.Int64LE(buffer)
    // last 4-digits are decimalPlaces
    value = value / 10000
  }
  // Date field
  if (field.type === 'D') {
    let Y = value.slice(0, 4)
    let M = value.slice(4, 6)
    let D = value.slice(6, 8)
    if (Y) {
      value = Y + '-' + M + '-' + D
    } else {
      value = ''
    }
  }
  // Timestamp
  if (field.type === 'T') {
    // Julian day (32-bit little endian)
    let jdn = buffer.readUInt32LE(0, true)
    // Milliseconds since midnight (32-bit little endian)
    let msec = buffer.readUInt32LE(4, true)

    if (jdn === 0) return null
    let gregArray = Gregorian(jdn)
    let Y = gregArray[0] * 1
    let M = gregArray[1] * 1
    let D = gregArray[2] * 1
    value = new Date()
    value.setUTCFullYear(Y)
    value.setUTCMonth(M - 1) // Date object months are 0-indexed (Jan = 0, Dec = 11)
    value.setUTCDate(D)
    value.setUTCHours(0)
    value.setUTCMinutes(0)
    value.setUTCSeconds(Math.floor(msec / 1000))
    value = value.toISOString().substring(0, 10)
    // set value according to what date format you want returned
  }
  return value
}

module.exports = Parser
