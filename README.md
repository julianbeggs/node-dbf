dbf-parser
========

This is an event-based dBase file parser for very efficiently reading data from *.dbf files.

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

