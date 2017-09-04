// Based on code from: JavaScript functions for the Fourmilab Calendar Converter
// by John Walker  --  September, MIM
// http://www.fourmilab.ch/documents/calendar/
// This program is in the public domain. */

var GREGORIAN_EPOCH = 1721425.5

//  *** leapGregorian  --  Is a given year in the Gregorian calendar a leap year ?

function leapGregorian (year) {
  return ((year % 4) === 0) &&
    (!(((year % 100) === 0) &&
    ((year % 400) !== 0)))
}

//  *** gregorianToJd  --  Determine Julian day number from Gregorian calendar date

function gregorianToJd (year, month, day) {
  return (GREGORIAN_EPOCH - 1) +
    (365 * (year - 1)) +
    Math.floor((year - 1) / 4) +
    (-Math.floor((year - 1) / 100)) +
    Math.floor((year - 1) / 400) +
    Math.floor((((367 * month) - 362) / 12) +
      ((month <= 2) ? 0 : (leapGregorian(year) ? -1 : -2)
      ) +
      day)
}

//  *** jdToGregorian  --  Calculate Gregorian calendar date from Julian day

exports.jdToGregorian = function (jd) {
  var wjd, depoch, quadricent, dqc, cent, dcent, quad, dquad,
    yindex, year, yearday, leapadj

  wjd = Math.floor(jd - 0.5) + 0.5
  depoch = wjd - GREGORIAN_EPOCH
  quadricent = Math.floor(depoch / 146097)
  dqc = (depoch % 146097)
  cent = Math.floor(dqc / 36524)
  dcent = (dqc % 36524)
  quad = Math.floor(dcent / 1461)
  dquad = (dcent % 1461)
  yindex = Math.floor(dquad / 365)
  year = (quadricent * 400) + (cent * 100) + (quad * 4) + yindex
  if (!((cent === 4) || (yindex === 4))) {
    year++
  }
  yearday = wjd - gregorianToJd(year, 1, 1)
  leapadj = ((wjd < gregorianToJd(year, 3, 1)) ? 0 : (leapGregorian(year) ? 1 : 2)
  )
  let month = Math.floor((((yearday + leapadj) * 12) + 373) / 367)
  let day = (wjd - gregorianToJd(year, month, 1)) + 1
  return [year, month, day]
}

