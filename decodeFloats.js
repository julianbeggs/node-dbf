// from https://gist.github.com/kg/2192799
// Derived from http://stackoverflow.com/a/8545403/106786
function decodeFloat (bytes, signBits, exponentBits, fractionBits, eMin, eMax,
  littleEndian) {
  var totalBits = (signBits + exponentBits + fractionBits)

  var binary = ''
  for (var i = 0, l = bytes.length; i < l; i++) {
    var bits = bytes[i].toString(2)
    while (bits.length < 8)
    bits = '0' + bits

    if (littleEndian)
      binary = bits + binary
    else
      binary += bits
  }

  var sign = (binary.charAt(0) == '1') ? -1 : 1
  var exponent = parseInt(binary.substr(signBits, exponentBits), 2) - eMax
  var significandBase = binary.substr(signBits + exponentBits, fractionBits)
  var significandBin = '1' + significandBase
  var i = 0
  var val = 1
  var significand = 0

  if (exponent == -eMax) {
    if (significandBase.indexOf('1') == -1)
      return 0
    else {
      exponent = eMin
      significandBin = '0' + significandBase
    }
  }

  while (i < significandBin.length) {
    significand += val * parseInt(significandBin.charAt(i))
    val = val / 2
    i++
  }

  return sign * significand * Math.pow(2, exponent)
}

// Sample usage
exports.ReadSingle = function (bytes) {
  return decodeFloat(bytes, 1, 8, 23, -126, 127, true)
}
exports.ReadDouble = function (bytes) {
  return decodeFloat(bytes, 1, 11, 52, -1022, 1023, true)
}
