(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],3:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":2,"ieee754":5}],4:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],5:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],6:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],7:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

exports.homedir = function () {
	return '/'
};

},{}],8:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":9}],9:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],10:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],11:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":10,"_process":9,"inherits":6}],12:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var util = require('util'),
Classifier = require('./classifier');

var BayesClassifier = function(smoothing) {
    Classifier.call(this);
    this.classFeatures = {};
    this.classTotals = {};
    this.totalExamples = 1; // start at one to smooth
    this.smoothing = smoothing === undefined ? 1.0 : smoothing;
};

util.inherits(BayesClassifier, Classifier);

function addExample(observation, label) {
    if(!this.classFeatures[label]) {
        this.classFeatures[label] = {};
        this.classTotals[label] = 1; // give an extra for smoothing
    }

    if(observation instanceof Array) {
        var i = observation.length;
        this.totalExamples++;
        this.classTotals[label]++;

        while(i--) {
            if(observation[i]) {
                if(this.classFeatures[label][i]) {
                    this.classFeatures[label][i]++;
                } else {
                    // give an extra for smoothing
                    this.classFeatures[label][i] = 1 + this.smoothing;
                }
            }
        }
    } else {
        // sparse observation
        for(var key in observation){
            value = observation[key];

            if(this.classFeatures[label][value]) {
               this.classFeatures[label][value]++;
            } else {
                // give an extra for smoothing
               this.classFeatures[label][value] = 1 + this.smoothing;
            }
        }
    }
}

function train() {

}

function probabilityOfClass(observation, label) {
    var prob = 0;

    if(observation instanceof Array){
        var i = observation.length;

        while(i--) {
            if(observation[i]) {
                var count = this.classFeatures[label][i] || this.smoothing;
                // numbers are tiny, add logs rather than take product
                prob += Math.log(count / this.classTotals[label]);
            }
        }
    } else {
        // sparse observation
        for(var key in observation){
            var count = this.classFeatures[label][observation[key]] || this.smoothing;
            // numbers are tiny, add logs rather than take product
            prob += Math.log(count / this.classTotals[label]);
        }
    }

    // p(C) * unlogging the above calculation P(X|C)
    prob = (this.classTotals[label] / this.totalExamples) * Math.exp(prob);

    return prob;
}

function getClassifications(observation) {
    var classifier = this;
    var labels = [];

    for(var className in this.classFeatures) {
        labels.push({label: className,
        value: classifier.probabilityOfClass(observation, className)});
    }

    return labels.sort(function(x, y) {
        return y.value - x.value;
    });
}

function restore(classifier) {
     classifier = Classifier.restore(classifier);
     classifier.__proto__ = BayesClassifier.prototype;

     return classifier;
}

BayesClassifier.prototype.addExample = addExample;
BayesClassifier.prototype.train = train;
BayesClassifier.prototype.getClassifications = getClassifications;
BayesClassifier.prototype.probabilityOfClass = probabilityOfClass;

BayesClassifier.restore = restore;

module.exports = BayesClassifier;
},{"./classifier":13,"util":11}],13:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

function Classifier() {
}

function restore(classifier) {
    classifier = typeof classifier == 'string' ?  JSON.parse(classifier) : classifier;

    return classifier;
}

function addExample(observation, classification) {
    throw 'Not implemented';
}

function classify(observation) {
	var classifications = this.getClassifications(observation);
	if(!classifications || classifications.length === 0) {
		throw "Not Trained";
	} 
    return classifications[0].label;
}

function train() {
    throw 'Not implemented';
}

Classifier.prototype.addExample = addExample;
Classifier.prototype.train = train;
Classifier.prototype.classify = classify;

Classifier.restore = restore;

module.exports = Classifier;

},{}],14:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var util = require('util'),
     Classifier = require('./classifier');

var sylvester = require('sylvester'),
Matrix = sylvester.Matrix,
Vector = sylvester.Vector;

function sigmoid(z) {
    return 1 / (1 + Math.exp(0 - z));
}

function hypothesis(theta, Observations) {
    return Observations.x(theta).map(sigmoid);
}

function cost(theta, Examples, classifications) {
    var hypothesisResult = hypothesis(theta, Examples);

    var ones = Vector.One(Examples.rows());
    var cost_1 = Vector.Zero(Examples.rows()).subtract(classifications).elementMultiply(hypothesisResult.log());
    var cost_0 = ones.subtract(classifications).elementMultiply(ones.subtract(hypothesisResult).log());

    return (1 / Examples.rows()) * cost_1.subtract(cost_0).sum();
}

function descendGradient(theta, Examples, classifications) {
    var maxIt = 500 * Examples.rows();
    var last;
    var current;
    var learningRate = 3;
    var learningRateFound = false;

    Examples = Matrix.One(Examples.rows(), 1).augment(Examples);
    theta = theta.augment([0]);

    while(!learningRateFound && learningRate !== 0) {
        var i = 0;
        last = null;

        while(true) {
            var hypothesisResult = hypothesis(theta, Examples);
            theta = theta.subtract(Examples.transpose().x(
            hypothesisResult.subtract(classifications)).x(1 / Examples.rows()).x(learningRate));
            current = cost(theta, Examples, classifications);

            i++;

            if(last) {
            if(current < last)
                learningRateFound = true;
            else
                break;

            if(last - current < 0.0001)
                break;
            }

            if(i >= maxIt) {
                throw 'unable to find minimum';
            }

            last = current;
        }

        learningRate /= 3;
    }

    return theta.chomp(1);
}

var LogisticRegressionClassifier = function() {
    Classifier.call(this);
    this.examples = {};
    this.features = [];
    this.featurePositions = {};
    this.maxFeaturePosition = 0;
    this.classifications = [];
    this.exampleCount = 0;
};

util.inherits(LogisticRegressionClassifier, Classifier);

function createClassifications() {
    var classifications = [];

    for(var i = 0; i < this.exampleCount; i++) {
        var classification = [];

        for(var _ in this.examples) {
            classification.push(0);
        }

       classifications.push(classification);
    }

    return classifications;
}

function computeThetas(Examples, Classifications) {
    this.theta = [];

    // each class will have it's own theta.
    var zero = function() { return 0; };
    for(var i = 1; i <= this.classifications.length; i++) {
        var theta = Examples.row(1).map(zero);
        this.theta.push(descendGradient(theta, Examples, Classifications.column(i)));
    }
}

function train() {
    var examples = [];
    var classifications = this.createClassifications();
    var d = 0, c = 0;

    for(var classification in this.examples) {
        for(var i = 0; i < this.examples[classification].length; i++) {
            var doc = this.examples[classification][i];
            var example = doc;

            examples.push(example);
            classifications[d][c] = 1;
            d++;
        }

        c++;
    }

    this.computeThetas($M(examples), $M(classifications));
}

function addExample(data, classification) {
    if(!this.examples[classification]) {
	this.examples[classification] = [];
	this.classifications.push(classification);
    }

    this.examples[classification].push(data);
    this.exampleCount++;
}

function getClassifications(observation) {
    observation = $V(observation);
    var classifications = [];

    for(var i = 0; i < this.theta.length; i++) {
        classifications.push({label: this.classifications[i], value: sigmoid(observation.dot(this.theta[i])) });
    }

    return classifications.sort(function(x, y) {
        return y.value - x.value;
    });
}

function restore(classifier) {
    classifier = Classifier.restore(classifier);
    classifier.__proto__ = LogisticRegressionClassifier.prototype;

    return classifier;
}

LogisticRegressionClassifier.prototype.addExample = addExample;
LogisticRegressionClassifier.prototype.restore = restore;
LogisticRegressionClassifier.prototype.train = train;
LogisticRegressionClassifier.prototype.createClassifications = createClassifications;
LogisticRegressionClassifier.prototype.computeThetas = computeThetas;
LogisticRegressionClassifier.prototype.getClassifications = getClassifications;

LogisticRegressionClassifier.restore = restore;

module.exports = LogisticRegressionClassifier;

},{"./classifier":13,"sylvester":150,"util":11}],15:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Sylvester = require('sylvester'),
Matrix = Sylvester.Matrix,
Vector = Sylvester.Vector;

function KMeans(Observations) {
    if(!Observations.elements)
    Observations = $M(Observations);

    this.Observations = Observations;
}

// create an initial centroid matrix with initial values between
// 0 and the max of feature data X.
function createCentroids(k) {
    var Centroid = [];
    var maxes = this.Observations.maxColumns();
    //console.log(maxes);

    for(var i = 1; i <= k; i++) {
        var centroid = [];
        for(var j = 1; j <= this.Observations.cols(); j++) {
            centroid.push(Math.random() * maxes.e(j));
        }

        Centroid.push(centroid);
    }

    //console.log(centroid)

    return $M(Centroid);
}

// get the euclidian distance between the feature data X and
// a given centroid matrix C.
function distanceFrom(Centroids) {
    var distances = [];

    for(var i = 1; i <= this.Observations.rows(); i++) {
        var distance = [];

        for(var j = 1; j <= Centroids.rows(); j++) {
            distance.push(this.Observations.row(i).distanceFrom(Centroids.row(j)));
        }

        distances.push(distance);
    }

    return $M(distances);
}

// categorize the feature data X into k clusters. return a vector
// containing the results.
function cluster(k) {
    var Centroids = this.createCentroids(k);
    var LastDistances = Matrix.Zero(this.Observations.rows(), this.Observations.cols());
    var Distances = this.distanceFrom(Centroids);
    var Groups;

    while(!(LastDistances.eql(Distances))) {
    Groups = Distances.minColumnIndexes();
    LastDistances = Distances;

    var newCentroids = [];

    for(var i = 1; i <= Centroids.rows(); i++) {
        var centroid = [];

        for(var j = 1; j <= Centroids.cols(); j++) {
        var sum = 0;
        var count = 0;

        for(var l = 1; l <= this.Observations.rows(); l++) {
            if(Groups.e(l) == i) {
            count++;
            sum += this.Observations.e(l, j);
            }
        }

        centroid.push(sum / count);
        }

        newCentroids.push(centroid);
    }

    Centroids = $M(newCentroids);
    Distances = this.distanceFrom(Centroids);
    }

    return Groups;
}

KMeans.prototype.createCentroids = createCentroids;
KMeans.prototype.distanceFrom = distanceFrom;
KMeans.prototype.cluster = cluster;

module.exports = KMeans;

},{"sylvester":150}],16:[function(require,module,exports){

exports.BayesClassifier = require('./classifier/bayes_classifier');
exports.LogisticRegressionClassifier = require('./classifier/logistic_regression_classifier');
exports.KMeans = require('./clusterer/kmeans');

},{"./classifier/bayes_classifier":12,"./classifier/logistic_regression_classifier":14,"./clusterer/kmeans":15}],17:[function(require,module,exports){
var json = typeof JSON !== 'undefined' ? JSON : require('jsonify');

module.exports = function (obj, opts) {
    if (!opts) opts = {};
    if (typeof opts === 'function') opts = { cmp: opts };
    var space = opts.space || '';
    if (typeof space === 'number') space = Array(space+1).join(' ');
    var cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;
    var replacer = opts.replacer || function(key, value) { return value; };

    var cmp = opts.cmp && (function (f) {
        return function (node) {
            return function (a, b) {
                var aobj = { key: a, value: node[a] };
                var bobj = { key: b, value: node[b] };
                return f(aobj, bobj);
            };
        };
    })(opts.cmp);

    var seen = [];
    return (function stringify (parent, key, node, level) {
        var indent = space ? ('\n' + new Array(level + 1).join(space)) : '';
        var colonSeparator = space ? ': ' : ':';

        if (node && node.toJSON && typeof node.toJSON === 'function') {
            node = node.toJSON();
        }

        node = replacer.call(parent, key, node);

        if (node === undefined) {
            return;
        }
        if (typeof node !== 'object' || node === null) {
            return json.stringify(node);
        }
        if (isArray(node)) {
            var out = [];
            for (var i = 0; i < node.length; i++) {
                var item = stringify(node, i, node[i], level+1) || json.stringify(null);
                out.push(indent + space + item);
            }
            return '[' + out.join(',') + indent + ']';
        }
        else {
            if (seen.indexOf(node) !== -1) {
                if (cycles) return json.stringify('__cycle__');
                throw new TypeError('Converting circular structure to JSON');
            }
            else seen.push(node);

            var keys = objectKeys(node).sort(cmp && cmp(node));
            var out = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = stringify(node, key, node[key], level+1);

                if(!value) continue;

                var keyValue = json.stringify(key)
                    + colonSeparator
                    + value;
                ;
                out.push(indent + space + keyValue);
            }
            seen.splice(seen.indexOf(node), 1);
            return '{' + out.join(',') + indent + '}';
        }
    })({ '': obj }, '', obj, 0);
};

var isArray = Array.isArray || function (x) {
    return {}.toString.call(x) === '[object Array]';
};

var objectKeys = Object.keys || function (obj) {
    var has = Object.prototype.hasOwnProperty || function () { return true };
    var keys = [];
    for (var key in obj) {
        if (has.call(obj, key)) keys.push(key);
    }
    return keys;
};

},{"jsonify":18}],18:[function(require,module,exports){
exports.parse = require('./lib/parse');
exports.stringify = require('./lib/stringify');

},{"./lib/parse":19,"./lib/stringify":20}],19:[function(require,module,exports){
var at, // The index of the current character
    ch, // The current character
    escapee = {
        '"':  '"',
        '\\': '\\',
        '/':  '/',
        b:    '\b',
        f:    '\f',
        n:    '\n',
        r:    '\r',
        t:    '\t'
    },
    text,

    error = function (m) {
        // Call error when something is wrong.
        throw {
            name:    'SyntaxError',
            message: m,
            at:      at,
            text:    text
        };
    },
    
    next = function (c) {
        // If a c parameter is provided, verify that it matches the current character.
        if (c && c !== ch) {
            error("Expected '" + c + "' instead of '" + ch + "'");
        }
        
        // Get the next character. When there are no more characters,
        // return the empty string.
        
        ch = text.charAt(at);
        at += 1;
        return ch;
    },
    
    number = function () {
        // Parse a number value.
        var number,
            string = '';
        
        if (ch === '-') {
            string = '-';
            next('-');
        }
        while (ch >= '0' && ch <= '9') {
            string += ch;
            next();
        }
        if (ch === '.') {
            string += '.';
            while (next() && ch >= '0' && ch <= '9') {
                string += ch;
            }
        }
        if (ch === 'e' || ch === 'E') {
            string += ch;
            next();
            if (ch === '-' || ch === '+') {
                string += ch;
                next();
            }
            while (ch >= '0' && ch <= '9') {
                string += ch;
                next();
            }
        }
        number = +string;
        if (!isFinite(number)) {
            error("Bad number");
        } else {
            return number;
        }
    },
    
    string = function () {
        // Parse a string value.
        var hex,
            i,
            string = '',
            uffff;
        
        // When parsing for string values, we must look for " and \ characters.
        if (ch === '"') {
            while (next()) {
                if (ch === '"') {
                    next();
                    return string;
                } else if (ch === '\\') {
                    next();
                    if (ch === 'u') {
                        uffff = 0;
                        for (i = 0; i < 4; i += 1) {
                            hex = parseInt(next(), 16);
                            if (!isFinite(hex)) {
                                break;
                            }
                            uffff = uffff * 16 + hex;
                        }
                        string += String.fromCharCode(uffff);
                    } else if (typeof escapee[ch] === 'string') {
                        string += escapee[ch];
                    } else {
                        break;
                    }
                } else {
                    string += ch;
                }
            }
        }
        error("Bad string");
    },

    white = function () {

// Skip whitespace.

        while (ch && ch <= ' ') {
            next();
        }
    },

    word = function () {

// true, false, or null.

        switch (ch) {
        case 't':
            next('t');
            next('r');
            next('u');
            next('e');
            return true;
        case 'f':
            next('f');
            next('a');
            next('l');
            next('s');
            next('e');
            return false;
        case 'n':
            next('n');
            next('u');
            next('l');
            next('l');
            return null;
        }
        error("Unexpected '" + ch + "'");
    },

    value,  // Place holder for the value function.

    array = function () {

// Parse an array value.

        var array = [];

        if (ch === '[') {
            next('[');
            white();
            if (ch === ']') {
                next(']');
                return array;   // empty array
            }
            while (ch) {
                array.push(value());
                white();
                if (ch === ']') {
                    next(']');
                    return array;
                }
                next(',');
                white();
            }
        }
        error("Bad array");
    },

    object = function () {

// Parse an object value.

        var key,
            object = {};

        if (ch === '{') {
            next('{');
            white();
            if (ch === '}') {
                next('}');
                return object;   // empty object
            }
            while (ch) {
                key = string();
                white();
                next(':');
                if (Object.hasOwnProperty.call(object, key)) {
                    error('Duplicate key "' + key + '"');
                }
                object[key] = value();
                white();
                if (ch === '}') {
                    next('}');
                    return object;
                }
                next(',');
                white();
            }
        }
        error("Bad object");
    };

value = function () {

// Parse a JSON value. It could be an object, an array, a string, a number,
// or a word.

    white();
    switch (ch) {
    case '{':
        return object();
    case '[':
        return array();
    case '"':
        return string();
    case '-':
        return number();
    default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
};

// Return the json_parse function. It will have access to all of the above
// functions and variables.

module.exports = function (source, reviver) {
    var result;
    
    text = source;
    at = 0;
    ch = ' ';
    result = value();
    white();
    if (ch) {
        error("Syntax error");
    }

    // If there is a reviver function, we recursively walk the new structure,
    // passing each name/value pair to the reviver function for possible
    // transformation, starting with a temporary root object that holds the result
    // in an empty key. If there is not a reviver function, we simply return the
    // result.

    return typeof reviver === 'function' ? (function walk(holder, key) {
        var k, v, value = holder[key];
        if (value && typeof value === 'object') {
            for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                    v = walk(value, k);
                    if (v !== undefined) {
                        value[k] = v;
                    } else {
                        delete value[k];
                    }
                }
            }
        }
        return reviver.call(holder, key, value);
    }({'': result}, '')) : result;
};

},{}],20:[function(require,module,exports){
var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    gap,
    indent,
    meta = {    // table of character substitutions
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    },
    rep;

function quote(string) {
    // If the string contains no control characters, no quote characters, and no
    // backslash characters, then we can safely slap some quotes around it.
    // Otherwise we must also replace the offending characters with safe escape
    // sequences.
    
    escapable.lastIndex = 0;
    return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
        var c = meta[a];
        return typeof c === 'string' ? c :
            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) + '"' : '"' + string + '"';
}

function str(key, holder) {
    // Produce a string from holder[key].
    var i,          // The loop counter.
        k,          // The member key.
        v,          // The member value.
        length,
        mind = gap,
        partial,
        value = holder[key];
    
    // If the value has a toJSON method, call it to obtain a replacement value.
    if (value && typeof value === 'object' &&
            typeof value.toJSON === 'function') {
        value = value.toJSON(key);
    }
    
    // If we were called with a replacer function, then call the replacer to
    // obtain a replacement value.
    if (typeof rep === 'function') {
        value = rep.call(holder, key, value);
    }
    
    // What happens next depends on the value's type.
    switch (typeof value) {
        case 'string':
            return quote(value);
        
        case 'number':
            // JSON numbers must be finite. Encode non-finite numbers as null.
            return isFinite(value) ? String(value) : 'null';
        
        case 'boolean':
        case 'null':
            // If the value is a boolean or null, convert it to a string. Note:
            // typeof null does not produce 'null'. The case is included here in
            // the remote chance that this gets fixed someday.
            return String(value);
            
        case 'object':
            if (!value) return 'null';
            gap += indent;
            partial = [];
            
            // Array.isArray
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }
                
                // Join all of the elements together, separated with commas, and
                // wrap them in brackets.
                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }
            
            // If the replacer is an array, use it to select the members to be
            // stringified.
            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            else {
                // Otherwise, iterate through all of the keys in the object.
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            
        // Join all of the member texts together, separated with commas,
        // and wrap them in braces.

        v = partial.length === 0 ? '{}' : gap ?
            '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
            '{' + partial.join(',') + '}';
        gap = mind;
        return v;
    }
}

module.exports = function (value, replacer, space) {
    var i;
    gap = '';
    indent = '';
    
    // If the space parameter is a number, make an indent string containing that
    // many spaces.
    if (typeof space === 'number') {
        for (i = 0; i < space; i += 1) {
            indent += ' ';
        }
    }
    // If the space parameter is a string, it will be used as the indent string.
    else if (typeof space === 'string') {
        indent = space;
    }

    // If there is a replacer, it must be a function or an array.
    // Otherwise, throw an error.
    rep = replacer;
    if (replacer && typeof replacer !== 'function'
    && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
        throw new Error('JSON.stringify');
    }
    
    // Make a fake root object containing our value under the key of ''.
    // Return the result of stringifying the value.
    return str('', {'': value});
};

},{}],21:[function(require,module,exports){
/*
Copyright (c) 2011, Rob Ellis, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var _ = require("underscore")._;

/*
 Sentences Analizer Class
 From http://www.writingcentre.uottawa.ca/hypergrammar/sntpurps.html

 Take a POS input and analyse it for
  - Type of Sentense
     - Interrogative
       - Tag Questions
       - 
     - Declarative
     - Exclamatory 
     - Imperative

  - Parts of a Sentense
     - Subject
     - Predicate

  - Show Preposition Phrases
*/

var Sentences = function(pos, callback) {
    this.posObj = pos;
    this.senType = null;
    callback(this);
};

Sentences.prototype.part = function(callback) {
    var subject = [],
	predicat = [],
	verbFound = false;
	
    this.prepositionPhrases();
	
    for (var i = 0; i < this.posObj.tags.length; i++) {
        if (this.posObj.tags[i].pos == "VB") {
            if (i === 0) {
                verbFound = true;
            } else {
                // We need to Test for any EX before the VB
                if (this.posObj.tags[i - 1].pos != "EX") {
                    verbFound = true;
                } else {
                    predicat.push(this.posObj.tags[i].token);
                }					
            }
        }

        // Add Pronoun Phrase (pp) Or Subject Phrase (sp)
        if (!verbFound) {
            if (this.posObj.tags[i].pp != true)
                this.posObj.tags[i].spos = "SP";
            
            subject.push(this.posObj.tags[i].token);
        } else {
            if (this.posObj.tags[i].pp != true)
                this.posObj.tags[i].spos = "PP";
            
            predicat.push(this.posObj.tags[i].token)
        }
    }
	
    if (subject.length == 0) {
	this.posObj.tags.push({token:"You",spos:"SP",pos:"PRP",added:true});
    }
    
    callback(this);	
};

// Takes POS and removes IN to NN or NNS
// Adds a PP for each prepositionPhrases
Sentences.prototype.prepositionPhrases = function() {
    var remove = false;

    for (var i = 0; i < this.posObj.tags.length; i++) {
        if (this.posObj.tags[i].pos.match("IN")) {
            remove = true;
        }
    
        if (remove) {
            this.posObj.tags[i].pp = true;
        }
    
        if (this.posObj.tags[i].pos.match("NN")) {
            remove = false;
        }
    }	
};

Sentences.prototype.subjectToString = function() {
    return this.posObj.tags.map(function(t){ if (t.spos == "SP" || t.spos == "S" ) return t.token }).join(' ');
};

Sentences.prototype.predicateToString = function() {
    return this.posObj.tags.map(function(t){ if (t.spos == "PP" || t.spos == "P" ) return t.token }).join(' ');
};

Sentences.prototype.implicitYou = function() {
    for (var i = 0; i < this.posObj.tags.length;i++) {
        if (this.posObj.tags[i].added) {
            return true;
        }
    }
    
    return false;
};

Sentences.prototype.toString = function() {
    return this.posObj.tags.map(function(t){return t.token}).join(' ');
};

// This is quick and incomplete.
Sentences.prototype.type = function(callback) {
    var callback = callback || false;

    // Check for implicit you before popping a tag.
    var implicitYou = this.implicitYou();

    // FIXME - punct seems useless
    var lastElement = this.posObj.punct();
    lastElement = (lastElement.length != 0) ? lastElement.pop() : this.posObj.tags.pop();

    if (lastElement.pos !== ".") {
        if (implicitYou) {
            this.senType = "COMMAND";
        } else if (_(["WDT","WP","WP$","WRB"]).contains(this.posObj.tags[0].pos)) {
            // Sentences that start with: who, what where when why and how, then they are questions
            this.senType = "INTERROGATIVE";
        } else if (_(["PRP"]).contains(lastElement.pos)) {
            // Sentences that end in a Personal pronoun are most likely questions
            // eg. We should run away, should we [?]
            // eg. You want to see that again, do you [?]
            this.senType = "INTERROGATIVE";
        } else {
            this.senType = "UNKNOWN";
        }
            
    } else {
        switch(lastElement.token) {
            case "?": this.senType = "INTERROGATIVE"; break;
            case "!": this.senType = (implicitYou) ? "COMMAND":"EXCLAMATORY"; break;
            case ".": this.senType = (implicitYou) ? "COMMAND":"DECLARATIVE";	break;
        }
    }
    
    if (callback && _(callback).isFunction()) {
        callback(this);
    } else {
        return this.senType;
    }
};

module.exports = Sentences;

},{"underscore":157}],22:[function(require,module,exports){
/*
  Brill's POS Tagger
  Copyright (C) 2016 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var fs = require("fs");

var TF_Parser = require('./TF_Parser');
var Sentence = require('./Sentence');

function Brill_POS_Tagger(lexicon, ruleSet) {
  this.lexicon = lexicon;
  this.ruleSet = ruleSet;
}

// Tags a sentence, sentence is an array of words
// Returns an array of tagged words; a tagged words is an array consisting of
// the word itself followed by its lexical category
Brill_POS_Tagger.prototype.tag = function(sentence) {
  var taggedSentence = this.tagWithLexicon(sentence);
  //console.log(taggedSentence);
  return this.applyRules(taggedSentence);
};

Brill_POS_Tagger.prototype.tagWithLexicon = function(sentence) {
  var taggedSentence = new Sentence();

  var that = this;
  sentence.forEach(function(word, index) {
    var categories = that.lexicon.tagWord(word);
    taggedSentence.addTaggedWord(word, categories[0]);
  });
  return(taggedSentence);
};

// Applies the transformation rules to an initially tagged sentence.
// taggedSentence is an array of tagged words.
// A tagged word is an array consisting of the word itself followed by its lexical category.
// Returns an array of tagged words as well
Brill_POS_Tagger.prototype.applyRules = function(sentence) {
  for (var i = 0, size = sentence.taggedWords.length; i < size; i++) {
    this.ruleSet.getRules().forEach(function(rule) {
      rule.apply(sentence, i);
    });
  }
  return sentence;
};

module.exports = Brill_POS_Tagger;

},{"./Sentence":31,"./TF_Parser":32,"fs":1}],23:[function(require,module,exports){
/*
  Brill's POS Testing class
  Copyright (C) 2017 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function Brill_POS_Tester() {

}

Brill_POS_Tester.prototype.test = function(corpus, tagger) {
  var totalWords = 0;
  var correctTagsLexicon = 0;
  var correctTagsAfterRules = 0;

  // Tag the corpus using the tagger
  corpus.sentences.forEach(function(sentence) {
    var s = sentence.taggedWords.map(function(token) {
      return token.token;
    });

    // Use the lexicon to tag the sentence
    var taggedSentence = tagger.tagWithLexicon(s);
    // Count the right tags
    sentence.taggedWords.forEach(function(token, i) {
      totalWords++;
      if (token.tag === taggedSentence.taggedWords[i].tag) {
        correctTagsLexicon++;
      }
    });

    // Use the rule set to tag the sentence
    var taggedSentenceAfterRules = tagger.applyRules(taggedSentence);
    // Count the right tags
    sentence.taggedWords.forEach(function(token, i) {
      if (token.tag === taggedSentenceAfterRules.taggedWords[i].tag) {
        correctTagsAfterRules++;
      }
    });
  });

  // Return percentage right
  return [100 * correctTagsLexicon/ totalWords, 100 * correctTagsAfterRules / totalWords];
};

module.exports = Brill_POS_Tester;

},{}],24:[function(require,module,exports){
/*
  Brill POS Trainer class
  Copyright (C) 2017 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// Algorithm is based on:
// Exploring the Statistical Derivation of Transformational Rule Sequences
// for Part-of-Speech Tagging, Lance A. Ramshaw and Mitchell P. Marcus
// http://acl-arc.comp.nus.edu.sg/archives/acl-arc-090501d4/data/pdf/anthology-PDF/W/W94/W94-0111.pdf

//var log4js = require('log4js');
//var logger = log4js.getLogger('Brill_POS_Trainer');
//logger.setLevel('OFF');

var TransformationRule = require("./TransformationRule");
var RuleSet = require("./RuleSet");
var Sentence = require('./Sentence');

// Training continues as long as there are rules with a positive score
// that have not been selected before
var minScore = 0;

// After training rules with a score below scoreThreshold are pruned
function Brill_POS_Trainer(ruleScoreThreshold) {
  if (ruleScoreThreshold) {
    this.ruleScoreThreshold = ruleScoreThreshold;
  }
  else {
    this.ruleScoreThreshold = 1;
  }
}

// Return the highest scoring rule from the rule set
Brill_POS_Trainer.prototype.selectHighRule = function() {
  var highestRule = null;

  // Walk through the map and find the rule with highest score
  this.positiveRules.getRules().forEach(function(rule){
    if (highestRule === null) {
      if (!rule.hasBeenSelectedAsHighRuleBefore) {
        highestRule = rule;
      }
    }
    else {
      if ((rule.score() > highestRule.score()) &&
        !rule.hasBeenSelectedAsHighRuleBefore) {
        highestRule = rule;
      }
    }
  });

  if (highestRule !== null) {
    highestRule.hasBeenSelectedAsHighRuleBefore = true;
  }
  // Return the rule with the highest score
  return highestRule;
};

Brill_POS_Trainer.prototype.mapRuleToSite = function(rule, i, j) {
  if (!this.mapRuleToSites[rule.key()]) {
    this.mapRuleToSites[rule.key()] = {};
  }
  if (!this.mapRuleToSites[rule.key()][i]) {
    this.mapRuleToSites[rule.key()][i] = {};
  }
  this.mapRuleToSites[rule.key()][i][j] = true;
};

Brill_POS_Trainer.prototype.mapSiteToRule = function(i, j, rule) {
  if (!this.mapSiteToRules[i]) {
    this.mapSiteToRules[i] = {};
  }
  if (!this.mapSiteToRules[i][j]) {
    this.mapSiteToRules[i][j] = {};
  }
  this.mapSiteToRules[i][j][rule.key()] = rule;
};

Brill_POS_Trainer.prototype.associateSiteWithRule = function(i, j, rule) {
  this.mapRuleToSite(rule, i, j);
  this.mapSiteToRule(i, j, rule);
};

Brill_POS_Trainer.prototype.siteIsAssociatedWithRule = function(i, j, rule) {
  if (this.mapSiteToRules[i]) {
    if (this.mapSiteToRules[i][j]) {
      if (this.mapSiteToRules[i][j][rule.key()]) {
        return true;
      }
    }
  }
  return false;
};

// Returns an array of all sites associated with rule
Brill_POS_Trainer.prototype.getSites = function(rule) {
  var that = this;
  var result = [];
  Object.keys(this.mapRuleToSites[rule.key()]).forEach(function(i) {
    Object.keys(that.mapRuleToSites[rule.key()][i]).forEach(function(j) {
      // Unary plus the convert hash keys i and j to integer
      result.push([+i, +j]);
    });
  });
  //logger.debug("Brill_POS_Trainer.prototype.getSites: sites " + JSON.stringify(result));
  return(result);
};

// Returns an array of all rules associated with the site
Brill_POS_Trainer.prototype.getRules = function(i, j) {
  var result = [];
  var that = this;

  if (this.mapSiteToRules[i]) {
    if (this.mapSiteToRules[i][j]) {
      result = Object.keys(this.mapSiteToRules[i][j]).map(function(key) {
        return that.mapSiteToRules[i][j][key];
      });
    }
  }
  return result;
};

Brill_POS_Trainer.prototype.disconnectSiteFromRule = function(i, j, rule) {
  // mapRuleToSites
  if (this.mapRuleToSites[rule.key()]) {
    if (this.mapRuleToSites[rule.key()][i]) {
      if (this.mapRuleToSites[rule.key()][i][j]) {
        delete this.mapRuleToSites[rule.key()][i][j];
      }
    }
  }

  // mapSiteToRules
  if (this.mapSiteToRules[i]) {
    if (this.mapSiteToRules[i][j]) {
      if (this.mapSiteToRules[i][j][rule.key()]) {
        delete this.mapSiteToRules[i][j][rule.key()];
      }
    }
  }
};

// Adjusts the score of the rule at position i, j of the corpus
Brill_POS_Trainer.prototype.scoreRule = function(rule, i, j) {
  //logger.debug("Brill_POS_Trainer.prototype.scoreRule: entry");
  var token = this.corpus.sentences[i].taggedWords[j];
  var rightTag = token.tag;
  var oldTag = token.testTag;
  var newTag = token.newTag;
  if (rightTag !== oldTag) {
    // Old tag is wrong
    if (newTag === rightTag) {
      // New tag is right
      rule.positive++;
      // If the score changes, it may be selected again as highest scoring rule
      rule.hasBeenSelectedAsHighRuleBefore = false;
      //logger.debug("Brill_POS_Trainer.prototype.scoreRule: positive: " + rule.key() + "\t score: " + rule.positive);
    }
    else {
      // New tag is wrong as well --> neutral
      rule.neutral++;
      //logger.debug("Brill_POS_Trainer.prototype.scoreRule: neutral: " + rule.key() + "\t score: " + rule.neutral);
    }
  }
  else {
    // Old tag is right
    if (newTag === rightTag) {
      // New tag is right --> neutral
      rule.neutral++;
      //logger.debug("Brill_POS_Trainer.prototype.scoreRule: neutral: " + rule.key() + "\t score: " + rule.neutral);


    }
    else {
      // New tag is false
      rule.negative++;
      // If the score changes, it may be selected again as highest scoring rule
      rule.hasBeenSelectedAsHighRuleBefore = false;
      //logger.debug("Brill_POS_Trainer.prototype.scoreRule: negative: " + rule.key() + "\t score: " + rule.negative);
    }
  }
  //logger.debug("Brill_POS_Trainer.prototype.scoreRule: exit");
};

// Generate positive rules for this given site using templates
Brill_POS_Trainer.prototype.generatePositiveRules = function(i, j) {
  var sentence = this.corpus.sentences[i];
  var token = sentence.taggedWords[j];
  // A positive rule should trigger on the currently assigned testTag
  var oldTag = token.testTag;
  //logger.debug("Brill_POS_Trainer.prototype.generatePositiveRules: oldTag " + oldTag);
  // It should assign the right tag as given by the corpus
  var newTag = token.tag;
  //logger.debug("Brill_POS_Trainer.prototype.generatePositiveRules: newTag " + newTag);

  var newRules = new RuleSet();
  // Exit if testTag already is the right tag --> will not result in positive rules
  if (oldTag === newTag) {
    return newRules;
  }

  this.templates.forEach(function(template) {
    if (template.windowFitsSite(sentence, j)) {
      if (template.meta.nrParameters === 1) {
        template.meta.parameter1Values(sentence, j).forEach(function (value) {
          newRules.addRule(new TransformationRule(oldTag, newTag, template.predicateName, value));
        });
      }
      else {
        if (template.meta.nrParameters === 2) {
          template.meta.parameter1Values(sentence, j).forEach(function (value1) {
            template.meta.parameter2Values(sentence, j).forEach(function (value2) {
              newRules.addRule(new TransformationRule(oldTag, newTag, template.predicateName, value1, value2));
            });
          });
        }
        else {
          // 0 paramaters
          newRules.addRule(new TransformationRule(oldTag, newTag, template.predicateName));
        }
      }
    }
  });
  return newRules;
};

// Finds all rules that are applicable at some site
Brill_POS_Trainer.prototype.scanForPositiveRules = function() {
  //logger.debug("Brill_POS_Trainer.prototype.scanForPositiveRules: entry");
  var that = this;
  this.corpus.sentences.forEach(function(sentence, i) {
    sentence.taggedWords.forEach(function(token, j) {
      //logger.debug("Brill_POS_Trainer.prototype.scanForPositiveRules: sentence no " + i);
      var newRules = that.generatePositiveRules(i, j);
      newRules.getRules().forEach(function(rule) {
        that.positiveRules.addRule(rule);
        //logger.debug("Brill_POS_Trainer.prototype.scanForPositiveRules: nrRules " + that.positiveRules.nrRules());
      });
    });
  });
  //logger.debug("Brill_POS_Trainer.prototype.scanForPositiveRules: exit, number of rules: " + this.positiveRules.nrRules());
};

// Find all sites where the rules can be applied, register these sites and
// update the scores
Brill_POS_Trainer.prototype.scanForSites = function() {
  //logger.debug("Brill_POS_Trainer.prototype.scanForSites: entry");
  var that = this;

  // Scan the corpus
  this.corpus.sentences.forEach(function(sentence, i) {
    if (i % 100 === 0) {
      //logger.info("Brill_POS_Trainer.prototype.scanForSites: sentence " + i);
    }

    var taggedSentence = new Sentence();
    sentence.taggedWords.forEach(function(wordObject) {
      taggedSentence.addTaggedWord(wordObject.token, wordObject.testTag);
    });

    sentence.taggedWords.forEach(function(token, j) {
      that.positiveRules.getRules().forEach(function(rule) {
        if (rule.isApplicableAt(sentence, taggedSentence, j)) {
          that.associateSiteWithRule(i, j, rule);
          that.scoreRule(rule, i, j);
          //logger.debug("Brill_POS_Trainer.prototype.scanForSites: (sentence, token, rule): (" + i + ", " + j + ", " + rule.prettyPrint() + ")");
        }
      });
    });
  });

  //logger.debug("Brill_POS_Trainer.prototype.scanForSites: exit");
};

// Returns a list of sites that may have been touched by a changing tag
Brill_POS_Trainer.prototype.neighbourhood = function(i, j) {
  var sentenceLength = this.corpus.sentences[i].length;
  var list = [];

  if (this.index > 2) {
    list.push([i, j - 3]);
  }
  if (this.index > 1) {
    list.push([i, j - 2]);
  }
  if (this.index > 0) {
    list.push([i, j - 1]);
  }
  if (this.index < sentenceLength - 1) {
    list.push([i, j + 1]);
  }
  if (this.index < sentenceLength - 2) {
    list.push([i, j + 2]);
  }
  if (this.index > sentenceLength - 3) {
    list.push([i, j + 3]);
  }
  return list;
};

// corpus: an array of token arrays
// templates: an array of rule templates
// lexicon: lexicon that provides method tagWord(word)
Brill_POS_Trainer.prototype.train = function(corpus, templates, lexicon) {
  this.corpus = corpus;
  this.templates = templates;
  this.positiveRules = new RuleSet();
  this.mapRuleToSites = {};
  this.mapSiteToRules = {};

  //logger.debug("Brill_POS_Trainer.prototype.train: entry");
  this.corpus.tag(lexicon);
  this.scanForPositiveRules();
  //logger.info("Brill_POS_Trainer.prototype.train: initial number of rules: " + this.positiveRules.nrRules());
  this.scanForSites();

  var highRule = this.selectHighRule();
  var iterationNumber = 0;
  var that = this;
  while ((highRule !== null) && (highRule.score() > minScore)) {
    if ((iterationNumber % 5) === 0) {
      //logger.info("Brill_POS_Trainer.prototype.train: training iteration: " + iterationNumber);
    }
    //logger.debug("Brill_POS_Trainer.prototype.train: highRule selected: " + highRule.key());
    //logger.debug("Brill_POS_Trainer.prototype.train: number of rules: " + this.positiveRules.nrRules());
    //logger.debug("Brill_POS_Trainer.prototype.train: score of highRule: " + highRule.score());

    // Apply the high rule to each change site on its site list
    this.getSites(highRule).forEach(function(site) {
      //logger.debug("Brill_POS_Trainer.prototype.train: apply highRule to: " + site);
      //logger.debug("Brill_POS_Trainer.prototype.train: sentence length: " + that.corpus.sentences[site[0]].length);
      highRule.applyAt(that.corpus.sentences[site[0]], site[1]);
    });

    var unseenRules = new RuleSet();
    this.getSites(highRule).forEach(function(site) {
      that.neighbourhood(site[0], site[1]).forEach(function(testSite) {
        // Generate positive rules for testSite
        var newRules = that.generatePositiveRules(testSite[0], testSite[1]);

        // Disconnect test site from its rules
        // because highrule has been applied
        that.getRules(testSite[0], testSite[1]).forEach(function(rule) {
          if (!newRules.hasRule(rule)) {
            that.disconnectSiteFromRule(testSite[0], testSite[1], rule);
          }
        });

        // Connect new rules not already connected to the test site
        newRules.getRules().forEach(function(rule) {
          if (!that.siteIsAssociatedWithRule(testSite[0]. testSite[1], rule)) {
            if (that.positiveRules.hasRule(rule)) {
              that.associateSiteWithRule(testSite[0], testSite[1], rule);
            }
            else {
              unseenRules.addRule(rule);
            }
          }
        });

        // Process unseen rules
        if (unseenRules.nrRules() > 0) {
          unseenRules.getRules().forEach(function(rule) {
            that.positiveRules.addRule(rule);
          });
          that.corpus.sentences.forEach(function (sentence, i) {
            var taggedSentence = sentence.map(function(token) {
              return [token.token, token.testTag];
            });
            sentence.forEach(function(token, j) {
              unseenRules.getRules().forEach(function(rule) {
                if (rule.isApplicableAt(sentence, taggedSentence, j)) {
                  that.associateSiteWithRule(i, j, rule);
                  that.scoreRule(rule, i, j);
                }
              });
            });
          });
        }

      });
    });

    // Select next highest scoring rule
    highRule = this.selectHighRule();
    iterationNumber++;
  }
  //logger.info("Brill_POS_Trainer.prototype.train: number of iterations: " + iterationNumber);
  //logger.info("Brill_POS_Trainer.prototype.train: number of rules: " + this.positiveRules.nrRules());

  // Remove rules having a non-positive score
  this.positiveRules.getRules().forEach(function(rule) {
    if (rule.score() < that.ruleScoreThreshold) {
      that.positiveRules.removeRule(rule);
    }
  });

  //logger.info("Brill_POS_Trainer.prototype.train: number of rules after pruning: " + this.positiveRules.nrRules());
  //logger.debug("Brill_POS_Trainer.prototype.train: exit");
  return this.positiveRules;
};

Brill_POS_Trainer.prototype.printRulesWithScores = function() {
  var that = this;
  var result = "";

  function compareRules(a, b) {
    if (a.score() > b.score()) {
      return -1;
    }
    else {
      if (a.score() < b.score()) {
        return 1;
      }
      else {
        return 0;
      }
    }
  }

  var rules = this.positiveRules.getRules();
  var sortedRules = rules.sort(compareRules);

  sortedRules.forEach(function(rule) {
    //if (rule.score() > 0) {
      result += rule.score() + '\t' + rule.positive + '\t' + rule.negative + '\t' + rule.neutral + '\t' + rule.prettyPrint() + "\n";
    //}
  });
  return result;
};

module.exports = Brill_POS_Trainer;

},{"./RuleSet":28,"./Sentence":31,"./TransformationRule":33}],25:[function(require,module,exports){
/*
  Corpus class for parsing and analysing corpora
  Copyright (C) 2018 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var Sample = require('../../classifiers/maxent/Sample');
var ElementClass = require('../../classifiers/maxent/POS/POS_Element');
var Lexicon = require('./Lexicon');

const BROWN = 1;

// sentences: an array of annotated sentences
// A sentence is an array of annotated tokens
// A token is an object with (token, tag, testTag, ruleList)
function Corpus(data, typeOfCorpus, SentenceClass) {
  this.wordCount = 0;
  this.sentences = [];
  if (data && typeOfCorpus) {
    // For other types of corpora add a case here and supply a parsing method
    switch (typeOfCorpus) {
      case BROWN:
        this.parseBrownCorpus(data, SentenceClass);
        break;
      default:
        // Assume it is an array of tagged sentences
        this.sentences = data;
    }
  }
}

// data is raw text
// A corpus parsing method should split the corpus in sentences each of which
// consist of an array of tokens.
Corpus.prototype.parseBrownCorpus = function(data, SentenceClass) {
  var that = this;

  var lines = data.split('\n');
  lines.forEach(function(line) {
    var trimmedLine = line.trim();
    // Only parse lines that contain characters
    if (trimmedLine != "") {
      var taggedSentence = new SentenceClass();
      var tokens = line.trim().split(/\s+/);
      tokens.forEach(function (token) {
        that.wordCount++;
        // Create a tagged sentences consisting of tokens
        var wordPlusTag = token.split('_');
        taggedSentence.addTaggedWord(wordPlusTag[0], wordPlusTag[1]);
      });

      // Add the sentence to the corpus
      that.sentences.push(taggedSentence);
    }
  });
};

// Returns an array of all POS tags used in the corpus
Corpus.prototype.getTags = function() {
  return Object.keys(this.posTags);
};

// Splits the corpus in a training and testing set.
// percentageTrain is the size of the training corpus in percent
// Returns an array with two elements: training corpus, testing corpus
Corpus.prototype.splitInTrainAndTest = function(percentageTrain) {
  var corpusTrain = new Corpus();
  var corpusTest = new Corpus();

  var p = percentageTrain / 100;
  this.sentences.forEach(function(sentence, i) {
    if (Math.random() < p) {
      corpusTrain.sentences.push(sentence);
    }
    else {
      corpusTest.sentences.push(sentence);
    }
  });
  return [corpusTrain, corpusTest];
};

// Analyses the corpus:
// - registers used POS tags
// - records the frequency of POS tag for each word
Corpus.prototype.analyse = function() {
  this.tagFrequencies = {};
  this.posTags = {};
  this.wordCount = 0;

  var that = this;
  this.sentences.forEach(function(sentence) {
    sentence.taggedWords.forEach(function(token) {
      that.wordCount++;

      // Register the tags used in the corpus
      that.posTags[token.tag] = true;

      // Register the frequency of the tag
      if (!that.tagFrequencies[token.token]) {
        that.tagFrequencies[token.token] = {};
      }
      if (!that.tagFrequencies[token.token][token.tag]) {
        that.tagFrequencies[token.token][token.tag] = 0;
      }
      that.tagFrequencies[token.token][token.tag]++;
    });
  });
};

// Creates a lexicon by taking the most frequently occurring tag of a word
// as the right tag
Corpus.prototype.buildLexicon = function() {
  var lexicon = new Lexicon();
  var that = this;

  this.analyse();
  Object.keys(this.tagFrequencies).forEach(function(token) {
    var catToFreq = that.tagFrequencies[token];
    var categories = Object.keys(catToFreq);

    function compareByFrequency(a, b) {
      if (catToFreq[a] > catToFreq[b]) {
        return -1;
      }
      else {
        if (catToFreq[a] < catToFreq[b]) {
          return 1;
        }
        else {
          return 0;
        }
      }
    }

    var sortedCategories = categories.sort(compareByFrequency);
    lexicon.addWord(token, sortedCategories);
  });
  return lexicon;
};

Corpus.prototype.tag = function(lexicon) {
  this.sentences.forEach(function(sentence) {
    sentence.taggedWords.forEach(function(token) {
      // tagWord returns a list of categories, take the first category
      token.testTag = lexicon.tagWord(token.token)[0];
    });
  });
};

Corpus.prototype.nrSentences = function() {
  return this.sentences.length;
};

Corpus.prototype.nrWords = function() {
  return this.wordCount;
};

Corpus.prototype.generateFeatures = function() {
  var features = [];
  this.sentences.forEach(function(sentence) {
    features = sentence.generateFeatures(features);
  });
  //console.log(JSON.stringify(features));
  return features;
};

Corpus.prototype.prettyPrint = function() {
  this.sentences.forEach(function(sentence, index) {
    //logger.debug("sentence no " + index + "\n" +
    //  JSON.stringify(sentence, null, 2));
  });
};

module.exports = Corpus;

},{"../../classifiers/maxent/POS/POS_Element":46,"../../classifiers/maxent/Sample":47,"./Lexicon":26}],26:[function(require,module,exports){
/*
  Lexicon class
  Copyright (C) 2016 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var fs = require('fs');

// Parses a lexicon in JSON or text format
function Lexicon(filename, defaultCategory, defaultCategoryCapitalised) {
  this.lexicon = {}; //Object.create(null);

  if (filename) {
    this.defaultCategory = defaultCategory;
    // Read lexicon
    try {
      var data = fs.readFileSync(filename, 'utf8');
      if (data[0] === "{") {
        // Lexicon is in JSON format
        this.lexicon = JSON.parse(data);
      }
      else {
        // Lexicon is plain text
        this.parseLexicon(data);
      }
      //console.log('Brill_POS_Tagger.read_lexicon: number of lexicon entries read: ' + Object.keys(this.lexicon).length);
    }
    catch (error) {
      console.error(error);
    }
    if (defaultCategory) {
      this.defaultCategory = defaultCategory;
      if (defaultCategoryCapitalised) {
        this.defaultCategoryCapitalised = defaultCategoryCapitalised;
      }
    }
  }
}

// Parses a lexicon in text format: word cat1 cat2 ... catn
Lexicon.prototype.parseLexicon = function(data) {
  // Split into an array of non-empty lines
  var arrayOfLines = data.match(/[^\r\n]+/g);
  this.lexicon = {}; //Object.create(null);
  var that = this;
  arrayOfLines.forEach(function(line) {
    // Split line by whitespace
    var elements = line.trim().split(/\s+/);
    if (elements.length > 0) {
      that.lexicon[elements[0]] = elements.slice(1);
    }
  });
};

Lexicon.prototype.tagWordWithDefaults = function(word) {
  if (/[A-Z]/.test(word[0]) && this.defaultCategoryCapitalised) {
    // Capitalised
    return this.defaultCategoryCapitalised;
  }
  else {
    // If not found assign default_category
    return this.defaultCategory;
  }
};

// Returns a list of categories for word
Lexicon.prototype.tagWord = function(word) {
  var categories = this.lexicon[word];
  //console.log(categories);
  if (!categories || (typeof categories == "function")) {
    categories = this.lexicon[word.toLowerCase()];
  }
  if (!categories || (typeof categories == "function")) {
    categories = [this.tagWordWithDefaults(word)];
  }
  return(categories);
};

// Adds a word to the lexicon. NB simply replaces the entry
Lexicon.prototype.addWord = function(word, categories) {
  this.lexicon[word] = categories;
};

Lexicon.prototype.prettyPrint = function() {
  var result = "";
  var that = this;
  Object.keys(this.lexicon).forEach(function(token) {
    result += token + "\t";
    that.lexicon[token].forEach(function(cat) {
      result += cat + "\t";
    });
    result += "\n";
  });
  return result;
};

Lexicon.prototype.nrEntries = function() {
  return Object.keys(this.lexicon).length;
};

Lexicon.prototype.size = function() {
  return this.nrEntries();
};

Lexicon.prototype.setDefaultCategories = function(category, categoryCapitalised) {
  this.defaultCategory = category;
  if (categoryCapitalised) {
    this.defaultCategoryCapitalised = categoryCapitalised;
  }
};

module.exports = Lexicon;

},{"fs":1}],27:[function(require,module,exports){
/*
  Predicates for the Brill tagger
  Copyright (C) 2017 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

//var log4js = require('log4js');
//var logger = log4js.getLogger();
//logger.setLevel('INFO');

var predicates = require("./RuleTemplates");
//logger.debug(predicates);

function Predicate(name, parameter1, parameter2) {
  this.name = name;
  this.meta = predicates[name];
  if (!this.meta) {
    this.meta = predicates["DEFAULT"];
  }
  //if (this.meta.nrParameters > 0) {
    this.parameter1 = parameter1;
  //}
  //if (this.meta.nrParameters > 1) {
    this.parameter2 = parameter2;
  //}
  //logger.debug('Predicate\n' + JSON.toString(this.meta, null, 2));
}

Predicate.prototype.evaluate = function(sentence, position) {
  //logger.debug('Predicate.evalute ' + this.name);
  var predicate = this.meta.function;
  return (predicate(sentence, position, this.parameter1, this.parameter2));
};

module.exports = Predicate;

},{"./RuleTemplates":30}],28:[function(require,module,exports){
/*
   Set of transformation rules
   Copyright (C) 2017 Hugo W.L. ter Doest

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var fs = require("fs");
var TF_Parser = require('./TF_Parser');

function RuleSet(filename) {
  //this.rules = [];
  this.rules = {};

  if (filename) {
    // Read transformation rules
    try {
      var data = fs.readFileSync(filename, 'utf8');
      this.rules = TF_Parser.parse(data);
      // console.log(this.rules);
      // console.log('Brill_POS_Tagger.read_transformation_rules: number of transformation rules read: ' + this.rules.length);
    }
    catch (error) {
      console.error(error);
    }
  }
}

RuleSet.prototype.addRule = function(rule) {
  //this.rules.push(rule);
  if (!this.rules[rule.key()]) {
    this.rules[rule.key()] = rule;
    return true;
  }
  else {
    return false;
  }
};

RuleSet.prototype.removeRule = function(rule) {
  if (this.rules[rule.key()]) {
    delete this.rules[rule.key()];
  }
};

RuleSet.prototype.getRules = function() {
  var that = this;
  return Object.keys(this.rules).map(function(key) {
    return that.rules[key];
  });
};

RuleSet.prototype.nrRules = function() {
  return Object.keys(this.rules).length;
};

RuleSet.prototype.hasRule = function(rule) {
  if (this.rules[rule.key()]) {
    return true;
  }
  else {
    return false;
  }
};

RuleSet.prototype.prettyPrint = function() {
  var result = "";
  //this.rules.forEach(function(rule) {
  var that = this;
  Object.keys(this.rules).forEach(function(key) {
    var rule = that.rules[key];
    result += rule.prettyPrint() + "\n";
  });
  return result;
};

module.exports = RuleSet;

},{"./TF_Parser":32,"fs":1}],29:[function(require,module,exports){
/*
  Rule Template class for deriving transformation rules.
  Copyright (C) 2017 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function RuleTemplate(templateName, metadata) {
  this.predicateName = templateName;
  this.meta = metadata;
}

RuleTemplate.prototype.windowFitsSite = function(sentence, i) {
  return ((i + this.meta.window[0] >= 0) &&
    (i + this.meta.window[0] < sentence.taggedWords.length) &&
    (i + this.meta.window[1] >= 0) &&
    (i + this.meta.window[1] < sentence.taggedWords.length));
};

module.exports = RuleTemplate;

},{}],30:[function(require,module,exports){
/*
  Rule templates that provide metadata for generating transformation rules
  Copyright (C) 2017 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var ruleTemplates = {
  // Predicates as used in the English rules in data/English/tr_from_posjs.txt
  "NEXT-TAG": {
    // maps to the predicate function
    "function": next_tag_is,
    // Minimum required space before or after current position to be a relevant predicate
    "window": [0, 1],
    // The number of parameters the predicate takes
    "nrParameters": 1,
    // Function that returns relevant values for parameter 1
    "parameter1Values": nextTagParameterValues
  },
  "NEXT-WORD-IS-CAP": {
    "function": next_word_is_cap,
    "window": [0, 1],
    "nrParameters" : 0
  },
  "PREV-1-OR-2-OR-3-TAG": {
    "function": prev_1_or_2_or_3_tag,
    "window" : [-1, 0],
    "nrParameters" : 1,
    "parameter1Values": prev1Or2Or3TagParameterValues
  },
  "PREV-1-OR-2-TAG": {
    "function": prev_1_or_2_tag,
    "window": [-1, 0],
    "nrParameters": 1,
    "parameter1Values": prev1Or2TagParameterValues
  },
  "NEXT-WORD-IS-TAG": {
    "function": next_tag_is,
    "window": [0, 1],
    "nrParameters": 1,
    "parameter1Values": nextTagParameterValues
  },
  "PREV-TAG": {
    "function": prev_tag_is,
    "window": [-1, 0],
    "nrParameters": 1,
    "parameter1Values": prevTagParameterValues
  },
  /*
 "CURRENT-WORD-IS-TAG": {
   "function": current_word_is_tag,
   "window": [0],
   "nrParameter": 1,
   "parameter1Values": currentTagParameterValues
   },
  */
  "PREV-WORD-IS-CAP": {
    "function": prev_word_is_cap,
    "window": [-1, 0],
    "nrParameters": 0
  },
  "CURRENT-WORD-IS-CAP": {
    "function": current_word_is_cap,
    "window": [0, 0],
    "nrParameters": 0
  },
  "CURRENT-WORD-IS-NUMBER": {
    "function": current_word_is_number,
    "window": [0, 0],
    "nrParameters": 0
  },
  "CURRENT-WORD-IS-URL": {
    "function": current_word_is_url,
    "window": [0, 0],
    "nrParameters": 0
  },
  "CURRENT-WORD-ENDS-WITH": {
    "function": current_word_ends_with,
    "window": [0, 0],
    "nrParameters": 1,
    "parameter1Values": currentWordEndsWithParameterValues
  },
  "PREV-WORD-IS": {
    "function": prev_word_is,
    "window": [-1, 0],
    "nrParameters": 1,
    "parameter1Values": prevWordParameterValues
  },

  // Predicates as used in the Dutch rules in data/Dutch/brill_CONTEXTRULES.jg
  "PREVTAG": {
    "function": prev_tag_is,
    "window": [-1, 0],
    "nrParameters": 1,
    "parameter1Values": prevTagParameterValues
  },
  "NEXT1OR2TAG": {
    "function": next_1_or_2_tag_is,
    "window": [0, 1],
    "nrParameters": 1,
    "parameter1Values": next1Or2TagIsParameterValues
  },
  "NEXTTAG": {
    "function": next_tag_is,
    "window": [0, 1],
    "nrParameters": 1,
    "parameter1Values": nextTagParameterValues
  },
  "PREV1OR2TAG": {
    "function": prev_1_or_2_tag,
    "window": [-1, 0],
    "nrParameters": 1,
    "parameter1Values": prev1Or2TagParameterValues
  },
  "WDAND2TAGAFT": {
    "function": current_word_and_2_tag_after_are,
    "window": [0, 2],
    "nrParameters": 2,
    "parameter1Values": currentWordParameterValues,
    "parameter2Values": twoTagAfterParameterValues
  },
  "NEXT1OR2OR3TAG": {
    "function": next_1_or_2_or_3_tag,
    // Minimum required window to apply this template is one tag to the right
    "window": [0, 1],
    "nrParameters": 1,
    "parameter1Values": next1Or2Or3TagParameterValues
  },
  "CURWD": {
    "function": current_word_is,
    "window": [0, 0],
    "nrParameters": 1,
    "parameter1Values": currentWordParameterValues
  },
  "SURROUNDTAG": {
    "function": surrounded_by_tags,
    "window": [-1, 1],
    "nrParameters": 2,
    "parameter1Values": prevTagParameterValues,
    "parameter2Values": nextTagParameterValues
  },
  "PREV1OR2OR3TAG": {
    "function": prev_1_or_2_or_3_tag,
    // Minimum required window to apply this template is one tag to the left
    "window": [-1, 0],
    "nrParameters": 1,
    "parameter1Values": prev1Or2Or3TagParameterValues
  },
  "WDNEXTTAG": {
    "function": current_word_and_next_tag_are,
    "window": [0, 1],
    "nrParameters": 2,
    "parameter1Values": currentWordParameterValues,
    "parameter2Values": nextTagParameterValues
  },
  "PREV1OR2WD": {
    "function": prev_1_or_2_word_is,
    "window": [-1, 0],
    "nrParameters": 1,
    "parameter1Values": prev1Or2WordParameterValues
  },
  "NEXTWD": {
    "function": next_word_is,
    "window": [0, 1],
    "nrParameters": 1,
    "parameter1Values": nextWordParameterValues
  },
  "PREVWD": {
    "function": prev_word_is,
    "window": [-1, 0],
    "nrParameters": 1,
    "parameter1Values": prevWordParameterValues
  },
  "NEXT2TAG": {
    "function": next_2_tag_is,
    "window": [0, 2],
    "nrParameters": 1,
    "parameter1Values": next2TagParameterValues
  },
  "WDAND2TAGBFR": {
    "function": current_word_and_2_tag_before_are,
    "window": [-2, 0],
    "nrParameters": 2,
    "parameter1Values": currentWordParameterValues,
    "parameter2Values": twoTagBeforeParameterValues
  },
  "WDAND2AFT": {
    "function": current_word_and_2_after_are,
    "window": [0, 2],
    "nrParameters": 2,
    "parameter1Values": currentWordParameterValues,
    "parameter2Values": twoTagAfterParameterValues
  },
  "WDPREVTAG": {
    "function": current_word_and_prev_tag_are,
    "window": [-1, 0],
    "nrParameters": 2,
    "parameter1Values": currentWordParameterValues,
    "parameter2Values": prevTagParameterValues
  },
  "RBIGRAM": {
    "function": right_bigram_is,
    "window": [0, 1],
    "nrParameters": 2,
    "parameter1Values": currentWordParameterValues,
    "parameter2Values": nextWordParameterValues
  },
  "LBIGRAM": {
    "function": left_bigram_is,
    "window": [-1, 0],
    "nrParameters": 2,
    "parameter1Values": prevWordParameterValues,
    "parameter2Values": currentWordParameterValues
  },
  "NEXTBIGRAM": {
    "function": next_bigram_is,
    "window": [0, 2],
    "nrParameters": 2,
    "parameter1Values": nextWordParameterValues,
    "parameter2Values": twoWordAfterParameterValues
  },
  "PREVBIGRAM": {
    "function": prev_bigram_is,
    "window": [-2, 0],
    "nrParameters": 2,
    "parameter1Values": twoWordBeforeParameterValues,
    "parameter2Values": prevWordParameterValues
  },
  "PREV2TAG": {
    "function": prev_2_tag_is,
    "window": [-2, 0],
    "nrParameters": 2,
    "parameter1Values": twoTagBeforeParameterValues,
    "parameter2Values": prevTagParameterValues
  },
  "NEXT1OR2WD": {
    "function": next_1_or_2_word_is,
    "window": [0, 1],
    "nrParameters": 1,
    "parameter1Values": next1Or2WordParameterValues
  },
  "DEFAULT": {
    "function": default_predicate,
    "window": [0, 0],
    "nrParameters": 0
  }
};


// ==================================
// Predicates that start with words
// ==================================
function next_word_is_cap(sentence, i, parameter) {
  if (i < sentence.taggedWords.length - 1) {
    var next_word = sentence.taggedWords[i+1].token;
    return(next_word[0] === next_word[0].toUpperCase());
  }
  return(false);
}

function next_word_is(sentence, i, parameter) {
  if (i < sentence.taggedWords.length - 1) {
    return(sentence.taggedWords[i + 1].token === parameter);
  }
}

function nextWordParameterValues(sentence, i) {
  if (i < sentence.taggedWords.length - 1) {
    return [sentence.taggedWords[i + 1].token];
  }
  else {
    return [];
  }
}

function prev_word_is_cap(sentence, i, parameter) {
  var prev_word = null;
  if (i > 0) {
    prev_word = sentence.taggedWords[i-1].token;
    return(prev_word[0] === prev_word[0].toUpperCase());
  }
  return(false);
}

function current_word_is_cap(sentence, i, parameter) {
  var current_word = sentence.taggedWords[i].token;
  return(current_word[0] === current_word[0].toUpperCase());
}

function currentWordParameterValues(sentence, i) {
  return [sentence[i].token];
}

function current_word_is(sentence, i, parameter) {
  return(sentence.taggedWords[i].token === parameter);
}

function isNumeric(num) {
  return (!isNaN(num));
}

function current_word_is_number(sentence, i, parameter) {
  var is_number = isNumeric(sentence.taggedWords[i].token);
  // Attempt to parse it as a float
  if (!is_number) {
    is_number = parseFloat(sentence.taggedWords[i].token);
  }
  return((parameter === "YES") ? is_number : !is_number);
}

// Checks if the current word is a url
// Adapted from the original Javascript Brill tagger
function current_word_is_url(sentence, i, parameter) {
  var is_url = false;
  if (sentence.taggedWords[i].token.indexOf(".") > -1) {
    // url if there are two contiguous alpha characters
    if (/[a-zA-Z]{2}/.test(sentence.taggedWords[i].token)) {
      is_url = true;
    }
  }
  return((parameter === "YES") ? is_url : !is_url);
}

function current_word_and_2_tag_after_are(sentence, i, parameter1, parameter2) {
  if (i < sentence.taggedWords.length - 2) {
    if (sentence.taggedWords[i + 2][1] === parameter2) {
      return(sentence.taggedWords[i].token === parameter1);
    }
    else {
      return(false);
    }
  }
  else {
    return(false);
  }
}

function twoTagAfterParameterValues(sentence, i) {
  if (i < sentence.taggedWords.length - 2) {
    return [sentence.taggedWords[i + 2].tag];
  }
  else {
    return [];
  }
}

function current_word_and_next_tag_are(sentence, i, parameter1, parameter2) {
  var next_tag = false;
  // check current word
  var current_word = (sentence.taggedWords[i].token === parameter1);
  // check next tag
  if (i < sentence.taggedWords.length - 1) {
    next_tag = (sentence.taggedWords[i+1].tag === parameter2);
  }
  return(current_word && next_tag);
}

function current_word_and_prev_tag_are(sentence, i, parameter1, parameter2) {
  var prev_tag = false;
  // check current word
  var current_word = (sentence.taggedWords[i].token === parameter2);
  // check prev tag
  if (i > 0) {
    prev_tag = (sentence.taggedWords[i-1].tag === parameter1);
  }
  return(current_word && prev_tag);
}

function current_word_and_2_tag_before_are(sentence, i, parameter1, parameter2) {
  var two_tags_before = false;
  // check current word
  var current_word = (sentence.taggedWords[i].token === parameter2);
  if (i > 1) {
    // check two tags before
    two_tags_before = (sentence.taggedWords[i - 2].tag === parameter1);
  }
  return(current_word && two_tags_before);
}

function twoTagBeforeParameterValues(sentence, i) {
  if (i > 1) {
    return [sentence.taggedWords[i - 2].tag];
  }
  else {
    return [];
  }
}

function current_word_and_2_after_are(sentence, i, parameter1, parameter2) {
  var two_words_after = false;
  // check current word
  var current_word = (sentence.taggedWords[i].token === parameter1);
  if (i < sentence.taggedWords.length - 2) {
    two_words_after = (sentence.taggedWords[i+2].token === parameter2);
  }
  return(current_word && two_words_after);
}

function prev_word_is(sentence, i, parameter) {
  if (i > 0) {
    return(sentence.taggedWords[i - 1].token.toLowerCase() === parameter.toLowerCase());
  }
  else {
    return(false);
  }
}

// Returns the right value for parameter 1 of prev_word_is
function prevWordParameterValues(sentence, i) {
  if (i > 0) {
    return [sentence.taggedWords[i - 1].token];
  }
  else {
    return [];
  }
}

function prev_1_or_2_word_is(sentence, i, parameter) {
  var prev_1 = false;
  var prev_2 = false;
  if (i > 0) {
    prev_1 = (sentence.taggedWords[i-1].token.toLowerCase() === parameter.toLowerCase());
  }
  if (i > 1) {
    prev_2 = (sentence.taggedWords[i-2].token.toLowerCase() === parameter.toLowerCase());
  }
  return(prev_1 || prev_2);
}

function prev1Or2WordParameterValues(sentence, i) {
  var values = [];
  if (i > 0) {
    values.push(sentence[i - 1].token);
  }
  if (i > 1) {
    values.push(sentence[i - 2].token);
  }
  return values;
}

// Indicates whether or not this string ends with the specified string.
// Adapted from the original Javascript Brill tagger
function current_word_ends_with(sentence, i, parameter) {
  var word = sentence.taggedWords[i].token;
  if (!parameter || (parameter.length > word.length)) {
    return false;
  }
  return(word.indexOf(parameter) === (word.length - parameter.length));
}

// sentence is an array of token records
function currentWordEndsWithParameterValues(sentence, i) {
  var values = ["ing"];

  return values;
}

function right_bigram_is(sentence, i, parameter1, parameter2) {
  var word_1 = (sentence.taggedWords[i].token === parameter1);
  var word_2 = false;
  if (i < sentence.taggedWords.length - 1) {
    word_2 = (sentence.taggedWords[i+1].token === parameter2);
  }
  return(word_1 && word_2);
}

function left_bigram_is(sentence, i, parameter1, parameter2) {
  var word_1 = false;
  var word_2 = (sentence.taggedWords[i].token === parameter2);
  if (i > 0) {
    word_1 = (sentence.taggedWords[i-1].token === parameter1);
  }
  return(word_1 && word_2);
}

function next_bigram_is(sentence, i, parameter1, parameter2) {
  var word_1 = false;
  var word_2 = false;
  if (i < sentence.taggedWords.length - 1) {
    word_1 = (sentence.taggedWords[i + 1].token === parameter1);
  }
  if (i < sentence.taggedWords.length - 2) {
    word_2 = (sentence.taggedWords[i + 2].token === parameter2);
  }
  return(word_1 && word_2);
}

function twoWordAfterParameterValues(sentence, i) {
  if (i < sentence.taggedWords.length - 2) {
    return [sentence.taggedWords[i + 2].token];
  }
  else {
    return [];
  }
}

function prev_bigram_is(sentence, i, parameter1, parameter2) {
  var word_1 = false;
  var word_2 = false;
  if (i >  1) {
    word_1 = (sentence.taggedWords[i-2].token === parameter1);
  }
  if (i > 0) {
    word_2 = (sentence.taggedWords[i-1].token === parameter2);
  }
  return(word_1 && word_2);
}

function twoWordBeforeParameterValues(sentence, i) {
  if (i >  1) {
    return [sentence.taggedWords[i - 2].token];
  }
  else {
    return [];
  }
}

function next_1_or_2_word_is(sentence, i, parameter1, parameter2) {
  next_1 = false;
  next_2 = false;
  if (i < sentence.taggedWords.length - 1) {
    next_1 = (sentence.taggedWords[i+1].token === parameter1);
  }
  if (i < sentence.taggedWords.length - 2) {
    next_2 = (sentence.taggedWords[i+2].token === parameter2);
  }
  return(next_1 || next_2);
}

function next1Or2WordParameterValues(sentence, i) {
  var values = [];
  if (i < sentence.taggedWords.length - 1) {
    values.push(sentence.taggedWords[i + 1].token);
  }
  if (i < sentence.taggedWords.length - 2) {
    values.push(sentence.taggedWords[i + 2].token);
  }
  return values;
}

// ==================================
// Predicates about tags
// ==================================
function next_tag_is(sentence, i, parameter) {
  if (i < sentence.taggedWords.length - 1) {
    return(sentence.taggedWords[i + 1].tag === parameter);
  }
  else {
    return(false);
  }
}

function nextTagParameterValues(sentence, i) {
  if (i < sentence.taggedWords.length - 1) {
    return [sentence.taggedWords[i + 1].tag];
  }
  else {
    return [];
  }
}

function next_2_tag_is(sentence, i, parameter) {
  if (i < sentence.taggedWords.length - 2) {
    return(sentence.taggedWords[i+2].tag === parameter);
  }
  else {
    return(false);
  }
}

function next2TagParameterValues(sentence, i) {
  if (i < sentence.taggedWords.length - 2) {
    return [sentence.taggedWords[i+2].tag];
  }
  else {
    return [];
  }
}

function next_1_or_2_tag_is(sentence, i, parameter) {
  var next_1 = false;
  var next_2 = false;
  if (i < sentence.taggedWords.length - 1) {
    next_1 = (sentence.taggedWords[i+1].tag === parameter);
  }
  if (i < sentence.taggedWords.length - 2) {
    next_2 = (sentence.taggedWords[i+2].tag === parameter);
  }
  return(next_1 || next_2);
}

function next1Or2TagIsParameterValues(sentence, i) {
  var values = [];
  if (i < sentence.taggedWords.length - 1) {
    values.push(sentence.taggedWords[i + 1].tag);
  }
  if (i < sentence.taggedWords.length - 2) {
    values.push(sentence.taggedWords[i + 2].tag);
  }
  return values;
}

function next_1_or_2_or_3_tag(sentence, i, parameter) {
  var next_1 = false;
  var next_2 = false;
  var next_3 = false;
  if (i < sentence.taggedWords.length - 1) {
    next_1 = (sentence.taggedWords[i+1].tag === parameter);
  }
  if (i < sentence.taggedWords.length - 2) {
    next_2 = (sentence.taggedWords[i+2].tag === parameter);
  }
  if (i < sentence.taggedWords.length - 3) {
    next_3 = (sentence.taggedWords[i+3].tag === parameter);
  }
  return(next_1 || next_2 || next_3);
}

function next1Or2Or3TagParameterValues(sentence, i) {
  var values = [];
  if (i < sentence.taggedWords.length - 1) {
    values.push(sentence.taggedWords[i + 1].tag);
  }
  if (i < sentence.taggedWords.length - 2) {
    values.push(sentence.taggedWords[i + 2].tag);
  }
  if (i < sentence.taggedWords.length - 3) {
    values.push(sentence.taggedWords[i + 3].tag);
  }
  return values;
}

function surrounded_by_tags(sentence, i, parameter1, parameter2) {
  if (i < sentence.taggedWords.length - 1) {
    // check next tag
    if (sentence.taggedWords[i+1].tag === parameter2) {
      // check previous tag
      if (i > 0) {
        return(sentence.taggedWords[i-1].tag === parameter1)
      }
      else {
        return(false);
      }
    }
    else {
      return(false);
    }
  }
  else {
    return(false);
  }
}

function prev_1_or_2_or_3_tag(sentence, i, parameter) {
  var prev_1 = null;
  if (i > 0) {
    prev_1 = sentence.taggedWords[i-1].tag;
  }
  var prev_2 = null;
  if (i > 1) {
    prev_2 = sentence.taggedWords[i-2].tag;
  }
  var prev_3 = null;
  if (i > 2) {
    prev_3 = sentence.taggedWords[i-3].tag;
  }
  return((prev_1 === parameter) || (prev_2 === parameter) || (prev_3 === parameter));
}

function prev1Or2Or3TagParameterValues(sentence, i) {
  var values = [];
  if (i > 0) {
    values.push(sentence.taggedWords[i - 1].tag);
  }
  if (i > 1) {
    values.push(sentence.taggedWords[i - 2].tag);
  }
  if (i > 2) {
    values.push(sentence.taggedWords[i - 3].tag);
  }
  return values;
}

function prev_1_or_2_tag(sentence, i, parameter) {
  var prev_1 = null;
  if (i > 0) {
    prev_1 = sentence.taggedWords[i - 1].tag;
  }
  var prev_2 = null;
  if (i > 1) {
    prev_2 = sentence.taggedWords[i - 2].tag;
  }
  return((prev_1 === parameter) || (prev_2 === parameter));
}

function prev1Or2TagParameterValues(sentence, i) {
  values = [];
  if (i > 0) {
    values.push(sentence.taggedWords[i - 1].tag);
  }
  if (i > 1) {
    values.push(sentence.taggedWords[i - 2].tag);
  }
  return values;
}

function prev_tag_is(sentence, i, parameter) {
  var prev = false;
  if (i > 0) {
    prev = (sentence.taggedWords[i-1].tag === parameter);
  }
  return(prev);
}

function prevTagParameterValues(sentence, i) {
  if (i > 0) {
    return [sentence.taggedWords[i - 1].tag];
  }
  else {
    return [];
  }
}

// Looks like a useless predicate because transformation already take the
// current tag into account
function current_word_is_tag(sentence, i, parameter) {
  return(sentence.taggedWords[i].tag === parameter);
}

function prev_2_tag_is(sentence, i, parameter) {
  var prev_2 = false;
  if (i > 1) {
    prev_2 = (sentence.taggedWords[i-2].tag === parameter);
  }
  return(prev_2);
}

function default_predicate(sentence, i, parameter) {
  return(false);
}

module.exports = ruleTemplates;

},{}],31:[function(require,module,exports){
/*
  Sentence class that generates sample elements from sentences
  Copyright (C) 2018 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


var Context = require('../../classifiers/maxent/Context');

function Sentence() {
  this.taggedWords = [];
}

Sentence.prototype.addTaggedWord = function(token, tag) {
  this.taggedWords.push({
    "token": token,
    "tag": tag
  });
};

Sentence.prototype.clone = function() {
  var s = new Sentence();
  this.taggedWords.forEach(function(wordObject) {
    s.addTaggedWord(wordObject.token, wordObject.tag);
  });
  return s;
};

module.exports = Sentence;

},{"../../classifiers/maxent/Context":38}],32:[function(require,module,exports){
module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { transformation_rules: peg$parsetransformation_rules },
        peg$startRuleFunction  = peg$parsetransformation_rules,

        peg$c0 = [],
        peg$c1 = peg$FAILED,
        peg$c2 = function(rules) {
          var result = {};

          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i][1];
            result[rule.key()] = rule;
          }
          return(result);
        },
        peg$c3 = function(c1, c2, pred, pars) {
          var result = null;

          // Construct rule
          if (pars.length === 1) {
            result = new TransformationRule(c1, c2, pred, pars[0]);
          }
          else {
            if (pars.length === 2) {
              result = new TransformationRule(c1, c2, pred, pars[0], pars[1]);
            }
            else {
              result = new TransformationRule(c1, c2, pred);
            }
          }
          return(result);
        },
        peg$c4 = /^[!-~\xA1-\xFF]/,
        peg$c5 = { type: "class", value: "[!-~\\xA1-\\xFF]", description: "[!-~\\xA1-\\xFF]" },
        peg$c6 = function(characters) {
           var s = "";
           for (var i = 0; i < characters.length; i++) {
             s += characters[i];
           }
           return(s);
          },
        peg$c7 = "*",
        peg$c8 = { type: "literal", value: "*", description: "\"*\"" },
        peg$c9 = function(wc) {
           return(wc)
          },
        peg$c10 = "\r\n",
        peg$c11 = { type: "literal", value: "\r\n", description: "\"\\r\\n\"" },
        peg$c12 = "\n",
        peg$c13 = { type: "literal", value: "\n", description: "\"\\n\"" },
        peg$c14 = "\r",
        peg$c15 = { type: "literal", value: "\r", description: "\"\\r\"" },
        peg$c16 = "//",
        peg$c17 = { type: "literal", value: "//", description: "\"//\"" },
        peg$c18 = void 0,
        peg$c19 = { type: "any", description: "any character" },
        peg$c20 = " ",
        peg$c21 = { type: "literal", value: " ", description: "\" \"" },
        peg$c22 = "\t",
        peg$c23 = { type: "literal", value: "\t", description: "\"\\t\"" },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsetransformation_rules() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$currPos;
      s3 = peg$parseS();
      if (s3 !== peg$FAILED) {
        s4 = peg$parsetransformation_rule();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseS();
          if (s5 !== peg$FAILED) {
            s3 = [s3, s4, s5];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c1;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c1;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$c1;
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$currPos;
          s3 = peg$parseS();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsetransformation_rule();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseS();
              if (s5 !== peg$FAILED) {
                s3 = [s3, s4, s5];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c1;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c1;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c1;
          }
        }
      } else {
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c2(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsetransformation_rule() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsecategory1();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseidentifier();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseidentifier();
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parseidentifier();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parseidentifier();
            }
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c3(s1, s2, s3, s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsecategory1() {
      var s0;

      s0 = peg$parsewild_card();
      if (s0 === peg$FAILED) {
        s0 = peg$parseidentifier();
      }

      return s0;
    }

    function peg$parseidentifier() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c4.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c5); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c4.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c5); }
          }
        }
      } else {
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseS_no_eol();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c6(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsewild_card() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 42) {
        s1 = peg$c7;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c8); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseS_no_eol();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c9(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseEOL() {
      var s0;

      if (input.substr(peg$currPos, 2) === peg$c10) {
        s0 = peg$c10;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c11); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 10) {
          s0 = peg$c12;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c13); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 13) {
            s0 = peg$c14;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c15); }
          }
        }
      }

      return s0;
    }

    function peg$parseComment() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c16) {
        s1 = peg$c16;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c17); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$currPos;
        peg$silentFails++;
        s5 = peg$parseEOL();
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = peg$c18;
        } else {
          peg$currPos = s4;
          s4 = peg$c1;
        }
        if (s4 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c19); }
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c1;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$currPos;
          peg$silentFails++;
          s5 = peg$parseEOL();
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = peg$c18;
          } else {
            peg$currPos = s4;
            s4 = peg$c1;
          }
          if (s4 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c19); }
            }
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseEOL();
          if (s3 === peg$FAILED) {
            s3 = peg$parseEOI();
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseS() {
      var s0, s1;

      s0 = [];
      if (input.charCodeAt(peg$currPos) === 32) {
        s1 = peg$c20;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c21); }
      }
      if (s1 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 9) {
          s1 = peg$c22;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c23); }
        }
        if (s1 === peg$FAILED) {
          s1 = peg$parseEOL();
          if (s1 === peg$FAILED) {
            s1 = peg$parseComment();
          }
        }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (input.charCodeAt(peg$currPos) === 32) {
          s1 = peg$c20;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c21); }
        }
        if (s1 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 9) {
            s1 = peg$c22;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c23); }
          }
          if (s1 === peg$FAILED) {
            s1 = peg$parseEOL();
            if (s1 === peg$FAILED) {
              s1 = peg$parseComment();
            }
          }
        }
      }

      return s0;
    }

    function peg$parseS_no_eol() {
      var s0, s1;

      s0 = [];
      if (input.charCodeAt(peg$currPos) === 32) {
        s1 = peg$c20;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c21); }
      }
      if (s1 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 9) {
          s1 = peg$c22;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c23); }
        }
        if (s1 === peg$FAILED) {
          s1 = peg$parseComment();
        }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (input.charCodeAt(peg$currPos) === 32) {
          s1 = peg$c20;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c21); }
        }
        if (s1 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 9) {
            s1 = peg$c22;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c23); }
          }
          if (s1 === peg$FAILED) {
            s1 = peg$parseComment();
          }
        }
      }

      return s0;
    }

    function peg$parseEOI() {
      var s0, s1;

      s0 = peg$currPos;
      peg$silentFails++;
      if (input.length > peg$currPos) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c19); }
      }
      peg$silentFails--;
      if (s1 === peg$FAILED) {
        s0 = peg$c18;
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }


      var TransformationRule = require("./TransformationRule");


    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

},{"./TransformationRule":33}],33:[function(require,module,exports){
/*
  Transformation rules for the Brill tagger
  Copyright (C) 2017 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

//var log4js = require('log4js');
//var logger = log4js.getLogger();

var Predicate = require("./Predicate");
var Sentence = require('./Sentence');

//logger.setLevel('INFO');

var category_wild_card = "*";

function TransformationRule(c1, c2, predicate, parameter1, parameter2) {
  this.literal = [c1, c2, predicate, parameter1, parameter2];
  this.predicate = new Predicate(predicate, parameter1, parameter2);
  this.old_category = c1;
  this.new_category = c2;
  // These members are for the learning algorithm
  this.neutral = 0;
  this.negative = 0;
  this.positive = 0;
  this.hasBeenSelectedAsHighRuleBefore = false;
  //logger.debug('TransformationRule constructor: ' + this.literal);
}

TransformationRule.prototype.key = function() {
  return(this.literal.toString());
};

TransformationRule.prototype.apply = function(sentence, position) {
  if ((sentence.taggedWords[position].tag === this.old_category) ||
      (this.old_category === category_wild_card)) {
    if (this.predicate.evaluate(sentence, position)) {
      sentence.taggedWords[position].tag = this.new_category;
      //logger.debug('TransformationRule.apply: changed category ' +
        //this.old_category + ' to ' + this.new_category +
        //' at position ' + position);
    }
  }
};

//
// Methods for processing sentences from a corpus that consist of an array of tokens
//

// Returns true if the rule applies at site. As a side effect it assigns the new
// category to newTag
TransformationRule.prototype.isApplicableAt = function(sentence, taggedSentence, i) {
  //logger.debug("TransformationRule.prototype.isApplicableAt: " + taggedSentence);
  var applies = (taggedSentence.taggedWords[i].tag === this.old_category) &&
    this.predicate.evaluate(taggedSentence, i);
  //logger.debug("TransformationRule.prototype.isApplicableAt: " + applies);

  // Set newTag to let the trainer know what the new tag would become
  if (applies) {
    sentence.taggedWords[i].newTag = this.new_category;
  }
  return(applies);
};

TransformationRule.prototype.prettyPrint = function() {
  var result = "";
  // Old category and new category
  result += this.old_category + " " + this.new_category;
  // Predicate name
  result += " " + this.predicate.name;
  // Parameter 1 and 2
  if (this.predicate.parameter1) {
    result += " " + this.predicate.parameter1;
    if (this.predicate.parameter2) {
      result += " " + this.predicate.parameter2;
    }
  }
  return result;
};


// Applies the rule the given location (if it applies)
TransformationRule.prototype.applyAt = function(sentence, i) {
  var taggedSentence = sentence.clone();

  //logger.debug("TransformationRule.prototype.applyAt: input sentence length: " + sentence.length);
  //logger.debug("TransformationRule.prototype.applyAt: tagged sentence length: " + taggedSentence.length);

  this.apply(sentence, i);
  // Assign the new tag to the corpus site
  sentence.taggedWords[i].testTag = taggedSentence.taggedWords[i].tag;
};

// Calculate the net score of this rule
TransformationRule.prototype.score = function() {
  return (this.positive - this.negative);
};

module.exports = TransformationRule;

},{"./Predicate":27,"./Sentence":31}],34:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var util = require('util'),
    Classifier = require('./classifier'),
    ApparatusBayesClassifier = require('apparatus').BayesClassifier;

var BayesClassifier = function(stemmer, smoothing) {
    var abc = new ApparatusBayesClassifier();
    if (smoothing && isFinite(smoothing)) {
        abc = new ApparatusBayesClassifier(smoothing);
    }
    Classifier.call(this, abc, stemmer);
};

util.inherits(BayesClassifier, Classifier);

function restore(classifier, stemmer) {
    classifier = Classifier.restore(classifier, stemmer);
    classifier.__proto__ = BayesClassifier.prototype;
    classifier.classifier = ApparatusBayesClassifier.restore(classifier.classifier);

    return classifier;
}

function load(filename, stemmer, callback) {
    Classifier.load(filename, function(err, classifier) {
        if (err) {
            return callback(err);
        }
        else {
            callback(err, restore(classifier, stemmer));
        }
    });
}

BayesClassifier.restore = restore;
BayesClassifier.load = load;

module.exports = BayesClassifier;

},{"./classifier":35,"apparatus":16,"util":11}],35:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var PorterStemmer = require('../stemmers/porter_stemmer'),
util = require('util'),
events = require('events'),
os = require('os');

try {
    var Threads = require('webworker-threads');
} catch (e) {
    // Since webworker-threads are optional, only thow if the module is found
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
}

function checkThreadSupport() {
    if (typeof Threads === 'undefined') {
        throw new Error('parallel classification requires the optional dependency webworker-threads');
    }
}

var Classifier = function(classifier, stemmer) {
    this.classifier = classifier;
    this.docs = [];
    this.features = {};
    this.stemmer = stemmer || PorterStemmer;
    this.lastAdded = 0;
    this.events = new events.EventEmitter();
};

function addDocument(text, classification) {

    // Ignore further processing if classification is undefined
    if(typeof classification === 'undefined') return;

    // If classification is type of string then make sure it's dosen't have blank space at both end
    if(typeof classification === 'string'){
      classification = classification.trim();
    }

    if(typeof text === 'string')
	text = this.stemmer.tokenizeAndStem(text, this.keepStops);

    if(text.length === 0) {
        // ignore empty documents
        return;
    }

    this.docs.push({
	label: classification,
	text: text
    });

    for (var i = 0; i < text.length; i++) {
        var token = text[i];
        this.features[token] = (this.features[token] || 0) + 1;
    }
}

function removeDocument(text, classification) {
  var docs = this.docs
    , doc
    , pos;

  if (typeof text === 'string') {
    text = this.stemmer.tokenizeAndStem(text, this.keepStops);
  }

  for (var i = 0, ii = docs.length; i < ii; i++) {
    doc = docs[i];
    if (doc.text.join(' ') == text.join(' ') &&
        doc.label == classification) {
      pos = i;
    }
  }

  // Remove if there's a match
  if (!isNaN(pos)) {
    this.docs.splice(pos, 1);

    for (var i = 0, ii = text.length; i < ii; i++) {
      delete this.features[text[i]];
    }
  }
}

function textToFeatures(observation) {
    var features = [];

    if(typeof observation === 'string')
	observation = this.stemmer.tokenizeAndStem(observation, this.keepStops);

    for(var feature in this.features) {
        if(observation.indexOf(feature) > -1)
            features.push(1);
        else
            features.push(0);
    }

    return features;
}

function docsToFeatures(docs) {
    var parsedDocs = [];

    for (var i = 0; i < docs.length; i++) {
        var features = [];

        for (var feature in FEATURES) {
            if (docs[i].observation.indexOf(feature) > -1)
                features.push(1);
            else
                features.push(0);
        }

        parsedDocs.push({
            index: docs[i].index,
            features: features
        });
    }

    return JSON.stringify(parsedDocs);
}

function train() {
    var totalDocs = this.docs.length;
    for(var i = this.lastAdded; i < totalDocs; i++) {
        var features = this.textToFeatures(this.docs[i].text);
        this.classifier.addExample(features, this.docs[i].label);
        this.events.emit('trainedWithDocument', {index: i, total: totalDocs, doc: this.docs[i]});
        this.lastAdded++;
    }
    this.events.emit('doneTraining', true);
    this.classifier.train();
}

function trainParallel(numThreads, callback) {
    checkThreadSupport();

    if (!callback) {
        callback = numThreads;
        numThreads = undefined;
    }

    if (isNaN(numThreads)) {
        numThreads = os.cpus().length;
    }

    var totalDocs = this.docs.length;
    var threadPool = Threads.createPool(numThreads);
    var docFeatures = {};
    var finished = 0;
    var self = this;

    // Init pool; send the features array and the parsing function
    threadPool.all.eval('var FEATURES = ' + JSON.stringify(this.features));
    threadPool.all.eval(docsToFeatures);

    // Convert docs to observation objects
    var obsDocs = [];
    for (var i = this.lastAdded; i < totalDocs; i++) {
        var observation = this.docs[i].text;
        if (typeof observation === 'string')
            observation = this.stemmer.tokenizeAndStem(observation, this.keepStops);
        obsDocs.push({
            index: i,
            observation: observation
        });
    }

    // Called when a batch completes processing
    var onFeaturesResult = function(docs) {
        setTimeout(function() {
            self.events.emit('processedBatch', {
                size: docs.length,
                docs: totalDocs,
                batches: numThreads,
                index: finished
            });
        });

        for (var j = 0; j < docs.length; j++) {
            docFeatures[docs[j].index] = docs[j].features;
        }
    };

    // Called when all batches finish processing
    var onFinished = function(err) {
        if (err) {
            threadPool.destroy();
            return callback(err);
        }

        for (var j = self.lastAdded; j < totalDocs; j++) {
            self.classifier.addExample(docFeatures[j], self.docs[j].label);
            self.events.emit('trainedWithDocument', {
                index: j,
                total: totalDocs,
                doc: self.docs[j]
            });
            self.lastAdded++;
        }

        self.events.emit('doneTraining', true);
        self.classifier.train();

        threadPool.destroy();
        callback(null);
    };

    // Split the docs and start processing
    var batchSize = Math.ceil(obsDocs.length / numThreads);
    var lastError;

    for (var i = 0; i < numThreads; i++) {
        var batchDocs = obsDocs.slice(i * batchSize, (i+1) * batchSize);
        var batchJson = JSON.stringify(batchDocs);

        threadPool.any.eval('docsToFeatures(' + batchJson + ')', function(err, docs) {
            lastError = err || lastError;
            finished++;

            if (docs) {
                docs = JSON.parse(docs);
                onFeaturesResult(docs);
            }

            if (finished >= numThreads) {
                onFinished(lastError);
            }
        });
    }
}

function trainParallelBatches(options) {
    checkThreadSupport();

    var numThreads = options && options.numThreads;
    var batchSize = options && options.batchSize;

    if (isNaN(numThreads)) {
        numThreads = os.cpus().length;
    }

    if (isNaN(batchSize)) {
        batchSize = 2500;
    }

    var totalDocs = this.docs.length;
    var threadPool = Threads.createPool(numThreads);
    var docFeatures = {};
    var finished = 0;
    var self = this;

    var abort = false;
    var onError = function(err) {
        if (!err || abort) return;
        abort = true;
        threadPool.destroy(true);
        self.events.emit('doneTrainingError', err);
    };

    // Init pool; send the features array and the parsing function
    var str = JSON.stringify(this.features);
    threadPool.all.eval('var FEATURES = ' + str + ';', onError);
    threadPool.all.eval(docsToFeatures, onError);

    // Convert docs to observation objects
    var obsDocs = [];
    for (var i = this.lastAdded; i < totalDocs; i++) {
        var observation = this.docs[i].text;
        if (typeof observation === 'string')
            observation = this.stemmer.tokenizeAndStem(observation, this.keepStops);
        obsDocs.push({
            index: i,
            observation: observation
        });
    }

    // Split the docs in batches
    var obsBatches = [];
    var i = 0;
    while (true) {
        var batch = obsDocs.slice(i * batchSize, (i+1) * batchSize);
        if (!batch || !batch.length) break;
        obsBatches.push(batch);
        i++;
    }
    obsDocs = null;
    self.events.emit('startedTraining', {
        docs: totalDocs,
        batches: obsBatches.length
    });

    // Called when a batch completes processing
    var onFeaturesResult = function(docs) {
        self.events.emit('processedBatch', {
            size: docs.length,
            docs: totalDocs,
            batches: obsBatches.length,
            index: finished
        });

        for (var j = 0; j < docs.length; j++) {
            docFeatures[docs[j].index] = docs[j].features;
        }
    };

    // Called when all batches finish processing
    var onFinished = function() {
        threadPool.destroy(true);
        abort = true;

        for (var j = self.lastAdded; j < totalDocs; j++) {
            self.classifier.addExample(docFeatures[j], self.docs[j].label);
            self.events.emit('trainedWithDocument', {
                index: j,
                total: totalDocs,
                doc: self.docs[j]
            });
            self.lastAdded++;
        }

        self.events.emit('doneTraining', true);
        self.classifier.train();
    };

    // Called to send the next batch to be processed
    var batchIndex = 0;
    var sendNext = function() {
        if (abort) return;
        if (batchIndex >= obsBatches.length) {
            return;
        }

        sendBatch(JSON.stringify(obsBatches[batchIndex]));
        batchIndex++;
    };

    // Called to send a batch of docs to the threads
    var sendBatch = function(batchJson) {
        if (abort) return;
        threadPool.any.eval('docsToFeatures(' + batchJson + ');', function(err, docs) {
            if (err) {
                return onError(err);
            }

            finished++;

            if (docs) {
                docs = JSON.parse(docs);
                setTimeout(onFeaturesResult.bind(null, docs));
            }

            if (finished >= obsBatches.length) {
                setTimeout(onFinished);
            }

            setTimeout(sendNext);
        });
    };

    // Start processing
    for (var i = 0; i < numThreads; i++) {
        sendNext();
    }
}

function retrain() {
  this.classifier = new (this.classifier.constructor)();
  this.lastAdded = 0;
  this.train();
}

function retrainParallel(numThreads, callback) {
  this.classifier = new (this.classifier.constructor)();
  this.lastAdded = 0;
  this.trainParallel(numThreads, callback);
}

function getClassifications(observation) {
    return this.classifier.getClassifications(this.textToFeatures(observation));
}

function classify(observation) {
    return this.classifier.classify(this.textToFeatures(observation));
}

function restore(classifier, stemmer) {
    classifier.stemmer = stemmer || PorterStemmer;
    classifier.events = new events.EventEmitter();
    return classifier;
}

function save(filename, callback) {
    var data = JSON.stringify(this);
    var fs = require('fs');
    var classifier = this;
    fs.writeFile(filename, data, 'utf8', function(err) {
        if(callback) {
            callback(err, err ? null : classifier);
        }
    });
}

function load(filename, callback) {
    var fs = require('fs');

    fs.readFile(filename, 'utf8', function(err, data) {
        var classifier;

        if(!err) {
            classifier = JSON.parse(data);
        }

        if(callback)
            callback(err, classifier);
    });
}

function setOptions(options){
    this.keepStops = (options.keepStops) ? true : false;
}

Classifier.prototype.addDocument = addDocument;
Classifier.prototype.removeDocument = removeDocument;
Classifier.prototype.train = train;
if (Threads) {
  Classifier.prototype.trainParallel = trainParallel;
  Classifier.prototype.trainParallelBatches = trainParallelBatches;
  Classifier.prototype.retrainParallel = retrainParallel;
}
Classifier.prototype.retrain = retrain;
Classifier.prototype.classify = classify;
Classifier.prototype.textToFeatures = textToFeatures;
Classifier.prototype.save = save;
Classifier.prototype.getClassifications = getClassifications;
Classifier.prototype.setOptions = setOptions;
Classifier.restore = restore;
Classifier.load = load;

module.exports = Classifier;

},{"../stemmers/porter_stemmer":83,"events":4,"fs":1,"os":7,"util":11,"webworker-threads":"webworker-threads"}],36:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var util = require('util'),
    Classifier = require('./classifier'),
    ApparatusLogisticRegressionClassifier = require('apparatus').LogisticRegressionClassifier;

var LogisticRegressionClassifier = function(stemmer) {
    Classifier.call(this, new ApparatusLogisticRegressionClassifier(), stemmer);
};

util.inherits(LogisticRegressionClassifier, Classifier);

function restore(classifier, stemmer) {
    classifier = Classifier.restore(classifier, stemmer);
    classifier.__proto__ = LogisticRegressionClassifier.prototype;
    classifier.classifier = ApparatusLogisticRegressionClassifier.restore(classifier.classifier);

    return classifier;
}

function load(filename, stemmer, callback) {
    Classifier.load(filename, function(err, classifier) {
        if (err) {
            callback(err);
        }
        else {
            callback(err, restore(classifier, stemmer));
        }
    });
}

function train() {
    // we need to reset the traning state because logistic regression
    // needs its matricies to have their widths synced, etc.
    this.lastAdded = 0;
    this.classifier = new ApparatusLogisticRegressionClassifier();
    Classifier.prototype.train.call(this);
}

LogisticRegressionClassifier.prototype.train = train;
LogisticRegressionClassifier.restore = restore;
LogisticRegressionClassifier.load = load;

module.exports = LogisticRegressionClassifier;

},{"./classifier":35,"apparatus":16,"util":11}],37:[function(require,module,exports){
/*
    Classifier class that provides functionality for training and
    classification
    Copyright (C) 2017 Hugo W.L. ter Doest

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var fs = require('fs');

var Context = require('./Context');
var Element = require('./Element');
var Sample = require('./Sample');
var Scaler = require('./GISScaler');
var FeatureSet = require('./FeatureSet');

function Classifier(features, sample) {
  if (features) {
    this.features = features;
  }
  else {
    this.features = new featureSet();
  }
  this.features = features;
  if (sample) {
    this.sample = sample;
  }
  else {
    this.sample = new Sample();
  }
}

// Loads a classifier from file.
// Caveat: feature functions are generated from the sample elements. You need
// to create your own specialisation of the Element class that can generate
// your own specific feature functions
Classifier.prototype.load = function(filename, elementClass, callback) {
  fs.readFile(filename, 'utf8', function(err, data) {

    if(!err) {
        classifierData = JSON.parse(data);
        var sample = new Sample();
        classifierData.sample.elements.forEach(function(elementData) {
          var elt = new elementClass(elementData.a, new Context(elementData.b.data));
          sample.addElement(elt);
        });
        var featureSet = new FeatureSet();
        sample.generateFeatures(featureSet);
        var classifier = new Classifier(featureSet, sample);
        callback(err, classifier);
    }
    else {
      if(callback) {
        callback(err);
      }
    }
  });
};

Classifier.prototype.save = function(filename, callback) {
  var data = JSON.stringify(this, null, 2);
  var classifier = this;
  fs.writeFile(filename, data, 'utf8', function(err) {
      if(callback) {
          callback(err, err ? null : classifier);
      }
  });
};

Classifier.prototype.addElement = function(x) {
  this.sample.addElement(x);
};

Classifier.prototype.addDocument = function(context, classification, elementClass) {
  Classifier.prototype.addElement(new elementClass(classification, context));
};

Classifier.prototype.train = function(maxIterations, minImprovement, approxExpectation) {
  this.scaler = new Scaler(this.features, this.sample);
  this.p = this.scaler.run(maxIterations, minImprovement, approxExpectation);
};

Classifier.prototype.getClassifications = function(b) {
  var scores = [];
  var that = this;
  this.sample.getClasses().forEach(function(a) {
    var x = new Element(a, b);
    scores.push({
      "label": a,
      "value": that.p.calculateAPriori(x)
    });
  });
  return scores;
};

Classifier.prototype.classify = function(b) {
  var scores = this.getClassifications(b);
  // Sort the scores in an array
  scores.sort(function(a, b) {
    return b.value - a.value;
  });
  // Check if the classifier discriminates
  var min = scores[scores.length - 1].value;
  var max = scores[0].value;
  if (min === max) {
      return "";
  }
  else {
    // Return the highest scoring classes
    return scores[0].label;
  }
};

module.exports = Classifier;

},{"./Context":38,"./Element":40,"./FeatureSet":42,"./GISScaler":43,"./Sample":47,"fs":1}],38:[function(require,module,exports){
/*
  Context class
  Copyright (C) 2017 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var stringify = require('json-stable-stringify');

function Context(data) {
  this.data = data;
}

// Create a predictable key string for looking up in a hash
Context.prototype.toString = function() {
  if (!this.key) {
    this.key = stringify(this.data);
  }
  return this.key;
};

module.exports = Context;

},{"json-stable-stringify":17}],39:[function(require,module,exports){
/*
    Distribution class for probability distributions
    Copyright (C) 2017 Hugo W.L. ter Doest

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var Element = require('./Element');

function Distribution(alpha, featureSet, sample) {
  this.alpha = alpha;
  this.featureSet = featureSet;
  this.sample = sample;
}

// Returns the distribution as a string that can be stored for later usage
Distribution.prototype.toString = function() {

}

Distribution.prototype.weight = function(x) {
  var product = 1;
  var that = this;

  this.alpha.forEach(function(alpha_j, j) {
    product *= Math.pow(alpha_j, that.featureSet.getFeatures()[j].apply(x));
  });
  return product;
};

Distribution.prototype.calculateAPriori = function(x) {
  if (!this.aPriorisBeforeNormalisation[x.toString()]) {
    this.aPriorisBeforeNormalisation[x.toString()] = this.weight(x);
  }
  return this.aPriorisBeforeNormalisation[x.toString()];// / this.aPrioriNormalisationConstant;
};

// Memoize a priori probabilities of sample elements
Distribution.prototype.prepareWeights = function() {
  this.aPriorisBeforeNormalisation = {};
  this.aPrioriNormalisationConstant = 0;
  var sum = 0;
  var that = this;
  this.sample.elements.forEach(function(x) {
    that.aPriorisBeforeNormalisation[x.toString()] = that.weight(x);
    sum += that.aPriorisBeforeNormalisation[x.toString()];
  });
  this.aPrioriNormalisationConstant = sum;
};

Distribution.prototype.calculateAPosteriori = function(x) {
  if (!this.aPriorisBeforeNormalisation[x.toString()]) {
    this.aPriorisBeforeNormalisation[x.toString()] = this.weight(x);
  }
  if (!this.aPosterioriNormalisationConstants[x.b.toString()]) {
    this.aPosterioriNormalisationConstants[x.b.toString()] = this.aPosterioriNormalisation(x.b);
  }
  return this.aPriorisBeforeNormalisation[x] / this.aPosterioriNormalisationConstants[x.b.toString()];
};

Distribution.prototype.aPosterioriNormalisation = function(b) {
  var sum = 0;

  var that = this;
  this.sample.getClasses().forEach(function(a) {
    sum += that.weight(new Element(a, b));
  });

  return(sum);
};

// Memoize a posteriori probabilities of sample elements
Distribution.prototype.prepareAPosterioris = function() {
  this.aPosterioriNormalisationConstants = {};

  var contextSeen = {};
  var that = this;
  this.sample.elements.forEach(function(sampleElement) {
    var context = sampleElement.b;
    if (!contextSeen[context]) {
      contextSeen[context] = true;
      that.aPosterioriNormalisationConstants[context] =
        that.aPosterioriNormalisation(context);
    }
  });
};

// Memoize all probabilities of sample elements
Distribution.prototype.prepare = function() {
  this.prepareWeights();
  //console.log("Weights prepared");
  this.prepareAPosterioris();
};

// Relative entropy between observered distribution and derived distribution
Distribution.prototype.KullbackLieblerDistance = function() {
  var sum = 0;
  var that = this;
  this.sample.elements.forEach(function(x) {
    sum += that.sample.observedProbability(x) * Math.log(that.sample.observedProbability(x) / that.calculateAPriori(x));
  });
  return sum;
};

Distribution.prototype.logLikelihood = function() {
  var sum = 0;
  var that = this;
  this.sample.elements.forEach(function(x) {
    sum += that.sample.observedProbability(x) * Math.log(that.calculateAPriori(x));
  });
  return sum;
};

Distribution.prototype.entropy = function() {
  var sum = 0;
  var that = this;
  this.sample.elements.forEach(function(x) {
    var p = that.calculateAPriori(x);
    sum += p * Math.log(p);
  });
  return sum;
};

Distribution.prototype.checkSum = function() {
  var sum = 0;
  var that = this;
  this.sample.elements.forEach(function(x) {
      sum += that.calculateAPriori(x);
  });
  //console.log("Distribution.checkSum is " + sum);
  return sum;
}

module.exports = Distribution;

},{"./Element":40}],40:[function(require,module,exports){
/*
    Element class for elements in the event space
    Copyright (C) 2017 Hugo W.L. ter Doest

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var Feature = require('./Feature');

// a is class and b is context
function Element(a, b) {
  this.a = a;
  this.b = b;
}

Element.prototype.toString = function() {
  if (!this.key) {
    this.key =  this.a + this.b.toString();
  }
  return this.key;
};

module.exports = Element;

},{"./Feature":41}],41:[function(require,module,exports){
/*
    Feature class for features that fire (or don't) on combinations of context
    and class
    Copyright (C) 2017 Hugo W.L. ter Doest

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function Feature(f, name, parameters) {
  this.evaluate = f;
  this.name = name;
  this.parameters = parameters;

  var tmp = "";
  parameters.forEach(function(par) {
    tmp += par + "|";
  });
  this.parametersKey = tmp.substr(0, tmp.length - 1);
}

Feature.prototype.apply = function(x) {
  return this.evaluate(x);
};

Feature.prototype.expectationApprox = function(p, sample) {
  var totalSum = 0;
  var that = this;
  var sum = 0;
  var seen = {};
  var A = sample.getClasses();
  sample.elements.forEach(function(sampleElement) {
    var b_i = sampleElement.b;

    if (!seen[b_i.toString()]) {
      seen[b_i.toString()] = true;
      var Element = require('./Element');

      A.forEach(function(a) {
        var x = new Element(a, b_i);
        sum += sample.observedProbabilityOfContext(b_i) * p.calculateAPosteriori(x) * that.apply(x);
      });
    }
  });
  return sum;
};

// Diect calculation of expected value of this feature according to distribution p
// In real-life applications with a lot of features this is not tractable
Feature.prototype.expectation = function(p, A, B) {
  var sum = 0;
  var that = this;
  A.forEach(function(a) {
    B.forEach(function(b) {
        var x = new Element(a, b);
        sum += (p.calculateAPriori(x) * that.apply(x));
    });
  });
  return sum;
};

// Observed expectation of this feature in the sample
Feature.prototype.observedExpectation = function(sample) {
  if (this.observedExpect) {
    return this.observedExpect;
  }
  var N = sample.size();
  var sum = 0;
  var that = this;
  sample.elements.forEach(function(x) {
    sum += that.apply(x);
  });
  this.observedExpect = sum / N;
  return this.observedExpect;
};

module.exports = Feature;

},{"./Element":40}],42:[function(require,module,exports){
/*
  Feature set class for administrating a set of unique feature
  Copyright (C) 2017 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


function FeatureSet() {
  this.features = [];
  this.map = {};
}

// Returns true if the feature did not exist and was added
FeatureSet.prototype.addFeature = function(feature) {
  if (!this.featureExists(feature)) {
    this.map[feature.name +" | " + feature.parametersKey] = true;
    this.features.push(feature);
    //console.log("FeatureSet.addFeature: feature added: " + feature.name + " - " + feature.parametersKey);
    return true;
  }
  else {
    return false;
  }
};

FeatureSet.prototype.featureExists = function(feature) {
  if (this.map[feature.name +" | " + feature.parametersKey]) {
    //console.log("FeatureSet.featureExists: feature already exists: " +
    //  feature.name + " - " + feature.parameters);
    return true;
  }
  else {
    return false;
  }
};

// Returns an array of features
// If the available array this.features is up to date it is returned immediately
FeatureSet.prototype.getFeatures = function() {
  return this.features;
};

FeatureSet.prototype.size = function() {
  return this.features.length;
};

FeatureSet.prototype.prettyPrint = function() {
  var s = "";
  Object.keys(this.map).forEach(function(key) {
    s += key + "\n";
  });
  return s;
};

module.exports = FeatureSet;

},{}],43:[function(require,module,exports){
/*
    GISScaler class that finds parameters of features
    Copyright (C) 2017 Hugo W.L. ter Doest

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var Element = require('./Element');
var Feature = require('./Feature');
var Distribution = require('./Distribution');

// classes is an array of classes
// features is an array of feature functions
function GISScaler(featureSet, sample) {
    this.featureSet = featureSet;
    this.sample = sample;
}

// Returns true if a correction feature is necessary
GISScaler.prototype.calculateMaxSumOfFeatures = function() {
  var that = this;
  this.C = 0;
  this.featureSums = {};
  var listOfSumValues = [];

  // Since feature functions are derived from the sample
  // we can use the sample to calculate the max sum
  // We look at each sample element only once
  this.sample.elements.forEach(function(x) {
    if (!that.featureSums[x.toString()]) {
      var sum = 0;
      that.featureSet.getFeatures().forEach(function(f) {
        sum += f.apply(x);
      });
      if (sum > that.C) {
        that.C = sum;
      }
      that.featureSums[x.toString()] = sum;
      listOfSumValues.push(sum);
    }
  });
  //console.log("GISScaler:calculateMaxSumOfFeatures:maxSum is " + this.C);

  // Check if a correction feature is necessary
  listOfSumValues.sort(function(a, b) {
    return a - b;
  });
  return(listOfSumValues[0] !== listOfSumValues[listOfSumValues.length - 1]);
};

GISScaler.prototype.addCorrectionFeature = function() {
  if (this.calculateMaxSumOfFeatures()) {
    //console.log("GISScaler:addCorrectionFeature:C is " + this.C);
    var that = this;

    function f(x) {
      if (that.featureSums[x.toString()] !== undefined) {
        return that.C - that.featureSums[x.toString()];
      }
      return 0;
    }

    var correctionFeature = new Feature(f, "Correction feature", []);
    //console.log("GISScaler:addCorrectionFeature:correctionFeature " + JSON.stringify(correctionFeature));
    this.featureSet.addFeature(correctionFeature);
  }
  else {
    //console.log("Correction feature not needed");
  }
};

// This is the Generalised Iterative Scaling algorithm
// It ends if the improvement in likelihood of the distribution does not
// improve more than minImprovement or if the maximum number of iterations is
// reached.
GISScaler.prototype.run = function(maxIterations, minImprovement) {
  this.iteration = 0;
  this.improvement = 0;

  this.addCorrectionFeature();
  // Build up the distribution p
  var alpha = new Array(this.featureSet.size());
  for (var i = 0; i < alpha.length; i++) {
    alpha[i] = 1;
  }
  var p = new Distribution(alpha, this.featureSet, this.sample);
  //console.log("Distribution created");
  p.prepare();
  //console.log("Distribution prepared");
  var likelihood = p.logLikelihood();
  var KLDistance = p.KullbackLieblerDistance();

  var newAlpha = new Array(this.featureSet.size());
  var observedExpectation = 0;
  var expectationApprox = 0;
  do {
    //console.log("Iteration " + this.iteration + " - Log likelihood of sample: " + likelihood + " - Entropy: " + p.entropy());
    for (var i = 0; i < this.featureSet.size(); i++) {
      observedExpectation = this.featureSet.getFeatures()[i].observedExpectation(this.sample);
      expectationApprox = this.featureSet.getFeatures()[i].expectationApprox(p, this.sample);
      //console.log("Iteration " + this.iteration + " - Feature " + i);
      newAlpha[i] = p.alpha[i] * Math.pow(observedExpectation / expectationApprox, 1 / this.C);

      //console.log("GISScaler.run: old alpha[" + i + "]: " + p.alpha[i]);
      //console.log("GISScaler.run: new alpha[" + i + "]: " + newAlpha[i]);
    }

    // Make the newly calculated parameters current parameters
    newAlpha.forEach(function(newAlpha_j, j) {
      p.alpha[j] = newAlpha_j;
    });
    // Recalculate a priori and a posteriori probabilities
    p.prepare();

    this.iteration++;
    var newLikelihood = p.logLikelihood();
    var newKLDistance = p.KullbackLieblerDistance();
    this.improvement = KLDistance - newKLDistance;
    //console.log("Iteration " + this.iteration + " - Old likelihood: " + likelihood + " - New likelihood: " + newLikelihood);
    //console.log("Iteration " + this.iteration + " - Old KL: " + KLDistance + " - New KL: " + newKLDistance);

    likelihood = newLikelihood;
    KLDistance = newKLDistance;
  } while ((this.iteration < maxIterations) && (this.improvement > minImprovement));
  //} while (iteration < maxIterations);
  /*
  var that = this;
  this.featureSet.getFeatures().forEach(function(f, j) {
    console.log("Observed expectation of feature " + j + ": " + f.observedExpectation(that.sample) +
      " - Expection of feature according to p: " + f.expectationApprox(p, that.sample));
  });
  */

  return p;
};

module.exports = GISScaler;

},{"./Distribution":39,"./Element":40,"./Feature":41}],44:[function(require,module,exports){
/*
  Corpus class specific for MaxEnt modeling
  Copyright (C) 2018 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var util = require('util');
var Sample = require('../Sample');
var Corpus = require('../../../brill_pos_tagger/lib/Corpus');

function ME_Corpus(data, BROWN, SentenceClass) {
   ME_Corpus.super_.call(this, data, BROWN, SentenceClass);
}

util.inherits(ME_Corpus, Corpus);

ME_Corpus.prototype.generateSample = function() {
  var sample = new Sample([]);
  this.sentences.forEach(function(sentence) {
    sentence.generateSampleElements(sample);
  });
  return sample;
};

// Splits the corpus in a training and testing set.
// percentageTrain is the size of the training corpus in percent
// Returns an array with two elements: training corpus, testing corpus
ME_Corpus.prototype.splitInTrainAndTest = function(percentageTrain) {
  var corpusTrain = new ME_Corpus();
  var corpusTest = new ME_Corpus();

  var p = percentageTrain / 100;
  this.sentences.forEach(function(sentence, i) {
    if (Math.random() < p) {
      corpusTrain.sentences.push(sentence);
    }
    else {
      corpusTest.sentences.push(sentence);
    }
  });
  return [corpusTrain, corpusTest];
};

module.exports = ME_Corpus;

},{"../../../brill_pos_tagger/lib/Corpus":25,"../Sample":47,"util":11}],45:[function(require,module,exports){
/*
  Sentence class specific for MaxEnt modeling
  Copyright (C) 2018 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var util = require('util');
var Context = require('../Context');
var Sentence = require('../../../brill_pos_tagger/lib/Sentence');
var Element = require('./POS_Element');

function ME_Sentence() {
   ME_Sentence.super_.call(this);
}

util.inherits(ME_Sentence, Sentence);

ME_Sentence.prototype.generateSampleElements = function(sample) {
  var sentence = this.taggedWords;
  sentence.forEach(function(token, index) {
    var x = new Element(
      token.tag,
      new Context({
        wordWindow: {},
        tagWindow: {}
      })
    );

    // Current word and tag
    x.b.data.wordWindow["0"] = token.token;
    x.b.data.tagWindow["0"] = sentence[index].tag;

    // Previous bigram
    if (index > 1) {
      x.b.data.tagWindow["-2"] = sentence[index - 2].tag;
      x.b.data.wordWindow["-2"] = sentence[index - 2].token;
    }

    // Left bigram
    if (index > 0) {
      x.b.data.tagWindow["-1"] = sentence[index - 1].tag;
      x.b.data.wordWindow["-1"] = sentence[index - 1].token;
    }

    // Right bigram
    if (index < sentence.length - 1) {
      x.b.data.tagWindow["1"] = sentence[index + 1].tag;
      x.b.data.wordWindow["1"] = sentence[index + 1].token;
    }

    // Next bigram
    if (index < sentence.length - 2) {
      x.b.data.tagWindow["2"] = sentence[index + 2].tag;
      x.b.data.wordWindow["2"] = sentence[index + 2].token;
    }

    sample.addElement(x);
  });
};

module.exports = ME_Sentence;

},{"../../../brill_pos_tagger/lib/Sentence":31,"../Context":38,"./POS_Element":46,"util":11}],46:[function(require,module,exports){
/*
  Element class for POS tagging
  Copyright (C) 2018 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


var util = require('util');
var Element = require('../Element');
var Feature = require('../Feature');

function POS_Element(a, b) {
   POS_Element.super_.call(this, a, b);
}

util.inherits(POS_Element, Element);

POS_Element.prototype.generateFeatures = function(featureSet) {
  var context = this.b.data;
  var tag = this.a;
  var token = context.wordWindow["0"];


  // Feature for the current word
  function currentWord(x) {
    if ((x.b.data.wordWindow["0"] === token) &&
        (x.a === tag)) {
        return 1;
    }
    return 0;
  }
  featureSet.addFeature(new Feature(currentWord, "wordFeature", ["0", token, "0", tag]));


  // Feature for previous bigram (previous two tags), positions -2, -1
  if (context.tagWindow["-2"]) {
    var prevPrevTag = context.tagWindow["-2"];
    var prevTag = context.tagWindow["-1"];
    function prevBigram(x) {
      if ((x.a === tag) &&
          (x.b.data.tagWindow["-2"] === prevPrevTag) &&
          (x.b.data.tagWindow["-1"] === prevTag)) {
          return 1;
        }
      return 0;
    }
    featureSet.addFeature(new Feature(prevBigram, "prevBigram", ["0", tag, "-2", prevPrevTag, "-1", prevTag]));
  }


/*
  // Feature for left bigram, positions -1, 0
  if (context.tagWindow["-1"]) {
    var prevTag = context.tagWindow["-1"];
    function leftBigram(x) {
      if ((x.b.data.tagWindow["-1"] === prevTag) &&
          (x.a === tag)) {
          return 1;
        }
      return 0;
    }
    featureSet.addFeature(new Feature(leftBigram, "leftBigram", ["0", tag, "-1", prevTag]));
  }
*/

/*

  // Feature for right bigram, positions 0, 1
  if (context.tagWindow["1"]) {
    var nextTag = context.tagWindow["1"];
    function rightBigram(x) {
      if ((x.a === tag) &&
          (x.b.data.tagWindow["1"] === nextTag)) {
          return 1;
        }
      return 0;
    }
    featureSet.addFeature(new Feature(rightBigram, "rightBigram", ["0", tag, "1", nextTag]));
  }
*/
/*
  // Feature for next bigram (next two tags), positions 1 and 2
  if (context.tagWindow["2"]) {
    var nextTag = context.tagWindow["1"];
    var nextNextTag = context.tagWindow["2"];
    function nextBigram(x) {
      if ((x.a === tag) &&
          (x.b.data.tagWindow["1"] === nextTag) &&
          (x.b.data.tagWindow["2"] === nextNextTag)) {
          return 1;
        }
      return 0;
    }
    featureSet.addFeature(new Feature(nextBigram, "nextBigram", ["0", tag, "1", nextTag, "2", nextNextTag]));
  }

  // Feature that looks at the left bigram words
  if (context.wordWindow["-1"]) {
    var prevWord = context.wordWindow["-1"];
    function leftBigramWords(x) {
      if ((x.a === tag) &&
          (x.b.data.wordWindow["0"] === token) &&
          (x.b.data.wordWindow["-1"] === prevWord)) {
          return 1;
        }
      return 0;
    }
    featureSet.addFeature(new Feature(leftBigramWords, "leftBigramWords", ["0", tag, "0", token, "-1", prevWord]));
  }

  // Feature that looks at the right bigram words
  if (context.wordWindow["1"]) {
    var nextWord = context.wordWindow["1"];
    function rightBigramWords(x) {
      if ((x.a === tag) &&
          (x.b.data.wordWindow["0"] === token) &&
          (x.b.data.wordWindow["1"] === nextWord)) {
          return 1;
        }
      return 0;
    }
    featureSet.addFeature(new Feature(rightBigramWords, "rightBigramWords", ["0", tag, "0", token, "1", nextWord]));
  }
*/

  // Feature that looks at the previous word and its category
  if (context.wordWindow["-1"]) {
    var prevWord = context.wordWindow["-1"];
    var prevTag = context.tagWindow["-1"];
    function prevWordAndCat(x) {
      if ((x.a === tag) &&
          (x.b.data.wordWindow["-1"] === prevWord) &&
          (x.b.data.tagWindow["-1"] === prevTag)) {
          return 1;
        }
      return 0;
    }
    featureSet.addFeature(new Feature(prevWordAndCat, "prevWordAndCat", ["0", tag, "-1", prevWord, "-1", prevTag]));
  }


/*
  // Feature that looks at the next word and its category
  if (context.wordWindow["1"]) {
    var nextWord = context.wordWindow["1"];
    var nextTag = context.tagWindow["1"];
    function nextWordAndCat(x) {
      if ((x.a === tag) &&
          (x.b.data.wordWindow["1"] === nextWord) &&
          (x.b.data.tagWindow["1"] === nextTag)) {
          return 1;
        }
      return 0;
    }
    featureSet.addFeature(new Feature(nextWordAndCat, "nextWordAndCat", ["0", tag, "1", nextWord, "1", nextTag]));
  }
*/
};

module.exports = POS_Element;

},{"../Element":40,"../Feature":41,"util":11}],47:[function(require,module,exports){
/*
    Sample space of observed events
    Copyright (C) 2018 Hugo W.L. ter Doest

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var Context = require('./Context');

var fs = require('fs');

function Sample(elements) {
  this.frequencyOfContext = {};
  this.frequency = {};
  this.classes = [];
  if (elements) {
    this.elements = elements;
    this.analyse();
  }
  else {
    this.elements = [];
  }
}

// Extracts classes and frequencies
Sample.prototype.analyse = function() {
  var that = this;
  this.elements.forEach(function(x) {
    if (this.classes.indexOf(x.a) === -1) {
      this.classes.push(x.a);
    }
    if (!that.frequencyOfContext[x.b.toString()]) {
      that.frequencyOfContext[x.b.toString()] = 0;
    }
    that.frequencyOfContext[x.b.toString()]++;
    if (!that.frequency[x.toString()]) {
      that.frequency[x.toString()] = 0;
    }
    that.frequency[x.toString()]++;
  });
};

Sample.prototype.addElement = function(x) {
  this.elements.push(x);
  // Update frequencies
  if (!this.frequencyOfContext[x.b.toString()]) {
    this.frequencyOfContext[x.b.toString()] = 0;
  }
  this.frequencyOfContext[x.b.toString()]++;
  if (!this.frequency[x.toString()]) {
    this.frequency[x.toString()] = 0;
  }
  this.frequency[x.toString()]++;
  // Update classes
  if (this.classes.indexOf(x.a) === -1) {
    this.classes.push(x.a);
  }
};

Sample.prototype.observedProbabilityOfContext = function(context) {
  if (this.frequencyOfContext[context.toString()]) {
    return this.frequencyOfContext[context.toString()] / this.elements.length;
  }
  else {
    return 0;
  }
};

Sample.prototype.observedProbability = function(x) {
  if (this.frequency[x.toString()]) {
    return this.frequency[x.toString()] / this.elements.length;
  }
  else {
    return 0;
  }
};

Sample.prototype.size = function() {
  return this.elements.length;
};

Sample.prototype.getClasses = function() {
  return this.classes;
};

Sample.prototype.generateFeatures = function(featureSet) {
  this.elements.forEach(function(x) {
    x.generateFeatures(featureSet);
  });
};

Sample.prototype.save = function(filename, callback) {
  var sample = this;
  var data = JSON.stringify(this, null, 2);
  fs.writeFile(filename, data, 'utf8', function(err) {
      //console.log('Sample written')
      if(callback) {
          callback(err, err ? null : sample);
      }
  });
};

// Loads a sample from file and revives the right classes, i.e. Sample and
// Element classes.
Sample.prototype.load = function(filename, elementClass, callback) {
  fs.readFile(filename, 'utf8', function(err, data) {

    if(!err) {
        var sampleData = JSON.parse(data);
        var sample = new Sample();
        sampleData.elements.forEach(function(elementData) {
          var elt = new elementClass(elementData.a, new Context(elementData.b.data));
          sample.addElement(elt);
        });
        if (!sample.frequency || !sample.frequencyOfContext) {
          sample.analyse();
        }
        if (callback) {
          callback(err, sample);
        }
    }
    else {
      if (callback) {
        callback(err);
      }
    }
  });
};

module.exports = Sample;

},{"./Context":38,"fs":1}],48:[function(require,module,exports){
/*
  Simple Example Element class
  Copyright (C) 2018 Hugo W.L. ter Doest

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var util = require('util');

var Element = require('../Element');
var Feature = require('../Feature');

function SE_Element(a, b) {
   SE_Element.super_.call(this, a, b);
}

util.inherits(SE_Element, Element);

SE_Element.prototype.generateFeatures = function(featureSet) {

  function isZero(x) {
    if ((x.a === "x") && (x.b.data === "0")) {
      return 1;
    }
    return 0;
  }
  featureSet.addFeature(new Feature(isZero, "isZero", ["0"]));

  function isOne(x) {
    if ((x.a === "y") && (x.b.data === "1")) {
      return 1;
    }
    return 0;
  }
  featureSet.addFeature(new Feature(isOne, "isOne", ["1"]));
};

module.exports = SE_Element;

},{"../Element":40,"../Feature":41,"util":11}],49:[function(require,module,exports){
/*
Copyright (c) 2011, John Crepezzi, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// Get all of the pairs of letters for a string
var letterPairs = function (str) {
  var numPairs = str.length - 1;
  var pairs = new Array(numPairs);
  for (var i = 0; i < numPairs; i++) {
    pairs[i] = str.substring(i, i + 2);
  }
  return pairs;
};

// Get all of the pairs in all of the words for a string
var wordLetterPairs = function (str) {
  var allPairs = [], pairs;
  var words = str.split(/\s+/);
  for (var i = 0; i < words.length; i++) {
    pairs = letterPairs(words[i]);
    allPairs.push.apply(allPairs, pairs);
  }
  return allPairs;
};

// Perform some sanitization steps
var sanitize = function (str) {
  return str.toLowerCase().replace(/^\s+|\s+$/g, '');
};

// Compare two strings, and spit out a number from 0-1
var compare = function (str1, str2) {
  var sanitized_str1 = sanitize(str1);
  var sanitized_str2 = sanitize(str2);
  var pairs1 = wordLetterPairs(sanitized_str1);
  var pairs2 = wordLetterPairs(sanitized_str2);
  var intersection = 0, union = pairs1.length + pairs2.length;
  if (union === 0) {
      if (sanitized_str1 === sanitized_str2) {
          return 1;
      } else {
          return 0;
      }
  } else {
    var i, j, pair1, pair2;
    for (i = 0; i < pairs1.length; i++) {
      pair1 = pairs1[i];
      for (j = 0; j < pairs2.length; j++) {
        pair2 = pairs2[j];
        if (pair1 == pair2) {
          intersection ++;
          delete pairs2[j];
          break;
        }
      }
    }
    return 2 * intersection / union;
  }
};

module.exports = compare;

},{}],50:[function(require,module,exports){
/*
	Copyright (c) 2018, Shane Caldwell, Hugo ter Doest

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
*/

// Computes the Hamming distance between two string -- intrepreted from:
// https://en.wikipedia.org/wiki/Hamming_distance
// s1 is the first string to compare
// s2 is the second string to compare
// Strings should have equal length
function HammingDistance(s1, s2, ignoreCase) {
	// Return -1 if one of the parameters is not a string
	if (typeof(s1) != "string" || typeof(s2) != "string") {
		return -1;
	}
	// Return -1 the lengths of the strings differ
	if (s1.length != s2.length) {
		return -1;
	}

	if (ignoreCase) {
		s1 = s1.toLowerCase();
		s2 = s2.toLowerCase();
	}

  var diffs = 0;
  for (var i = 0; i < s1.length; i++) {
  	if (s1[i] != s2[i]) {
  		diffs++;
		}
  }
  return diffs;
}

module.exports = HammingDistance;

},{}],51:[function(require,module,exports){
/*
Copyright (c) 2012, Adam Phillabaum, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

Unless otherwise stated by a specific section of code

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// Computes the Jaro distance between two string -- intrepreted from:
// http://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
// s1 is the first string to compare
// s2 is the second string to compare
function distance(s1, s2) {
    if (typeof(s1) !== "string" || typeof(s2) !== "string") {
        return 0;
    }

    if (s1.length === 0 || s2.length === 0) {
        return 0;
    }

    var matchWindow = (Math.floor(Math.max(s1.length, s2.length) / 2.0)) - 1;
    var matches1 = new Array(s1.length);
    var matches2 = new Array(s2.length);
    var m = 0; // number of matches
    var t = 0; // number of transpositions
    var i = 0; // index for string 1
    var k = 0; // index for string 2

    //debug helpers
    //console.log("s1: " + s1 + "; s2: " + s2);
    //console.log(" - matchWindow: " + matchWindow);

    for (i = 0; i < s1.length; i++) { // loop to find matched characters
        var start = Math.max(0, (i - matchWindow)); // use the higher of the window diff
        var end = Math.min((i + matchWindow + 1), s2.length); // use the min of the window and string 2 length

        for (k = start; k < end; k++) { // iterate second string index
            if (matches2[k]) { // if second string character already matched
                continue;
            }
            if (s1[i] !== s2[k]) { // characters don't match
                continue;
            }

            // assume match if the above 2 checks don't continue
            matches1[i] = true;
            matches2[k] = true;
            m++;
            break;
        }
    }

    // nothing matched
    if (m === 0) {
        return 0.0;
    }

    k = 0; // reset string 2 index
    for(i = 0; i < s1.length; i++) { // loop to find transpositions
        if (!matches1[i]) { // non-matching character
            continue;
        }
        while(!matches2[k]) { // move k index to the next match
            k++;
        }
        if (s1[i] !== s2[k]) { // if the characters don't match, increase transposition
          // HtD: t is always less than the number of matches m, because transpositions are a subset of matches
            t++;
        }
        k++; // iterate k index normally
    }

    // transpositions divided by 2
    t = t / 2.0;

    return ((m / s1.length) + (m / s2.length) + ((m - t) / m)) / 3.0; // HtD: therefore, m - t > 0, and m - t < m
    // HtD: => return value is between 0 and 1
}

// Computes the Winkler distance between two string -- intrepreted from:
// http://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
// s1 is the first string to compare
// s2 is the second string to compare
// dj is the Jaro Distance (if you've already computed it), leave blank and the method handles it
// ignoreCase: if true strings are first converted to lower case before comparison
function JaroWinklerDistance(s1, s2, dj, ignoreCase) {
    if (s1 === s2) {
        return 1;
    } else {
        if (ignoreCase) {
          s1 = s1.toLowerCase();
          s2 = s2.toLowerCase();
        }

        //console.log(news1);
        //console.log(news2);

        var jaro = (typeof(dj) === 'undefined') ? distance(s1, s2) : dj;
        var p = 0.1; // default scaling factor
        var l = 0 // length of the matching prefix
        while(s1[l] === s2[l] && l < 4) {
            l++;
        }

        // HtD: 1 - jaro >= 0
        return jaro + l * p * (1 - jaro);
    }
}

module.exports = JaroWinklerDistance;

},{}],52:[function(require,module,exports){
/*
Copyright (c) 2012, Sid Nallu, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
 * contribution by sidred123
 */

/*
 * Compute the Levenshtein distance between two strings.
 * Algorithm based from Speech and Language Processing - Daniel Jurafsky and James H. Martin.
 */

var _ = require('underscore');

// Walk the path back from the matchEnd to the beginning of the match.
// Do this by traversing the distanceMatrix as you would a linked list,
// following going from cell child to parent until reach row 0.
function _getMatchStart(distanceMatrix, matchEnd, sourceLength) {
  var row = sourceLength;
  var column = matchEnd;
  var tmpRow;
  var tmpColumn;

  // match will be empty string
  if (matchEnd === 0) { return 0; }

  while(row > 1 && column > 1) {
   tmpRow = row;
   tmpColumn = column;
   row = distanceMatrix[tmpRow][tmpColumn].parentCell.row;
   column = distanceMatrix[tmpRow][tmpColumn].parentCell.column;
  }

  return column-1;
}

function getMinCostSubstring(distanceMatrix, source, target) {
  var sourceLength = source.length;
  var targetLength = target.length;
  var minDistance = sourceLength + targetLength;
  var matchEnd = targetLength;

  // Find minimum value in last row of the cost matrix. This cell marks the
  // end of the match string.
  for (var column = 0; column <= targetLength; column++) {
    if (minDistance > distanceMatrix[sourceLength][column].cost) {
      minDistance = distanceMatrix[sourceLength][column].cost;
      matchEnd = column;
    }
  }

  matchStart = _getMatchStart(distanceMatrix, matchEnd, sourceLength);
  return {substring: target.slice(matchStart, matchEnd), distance: minDistance};
}

/*
* Returns the Damerau-Levenshtein distance between strings. Counts the distance
* between two strings by returning the number of edit operations required to
* convert `source` into `target`.
*
* Valid edit operations are:
*  - transposition, insertion, deletion, and substitution
*
* Options:
*  insertion_cost: (default: 1)
*  deletion_cost: number (default: 1)
*  substitution_cost: number (default: 1)
*  transposition_cost: number (default: 1)
*  search: boolean (default: false)
*  restricted: boolean (default: false)
*/
function DamerauLevenshteinDistance(source, target, options) {
    var damLevOptions = _.extend(
        { transposition_cost: 1, restricted: false },
        options || {},
        { damerau: true }
    );
    return levenshteinDistance(source, target, damLevOptions);
}

function LevenshteinDistance(source, target, options) {
    var levOptions = _.extend({}, options || {}, { damerau: false });
    return levenshteinDistance(source, target, levOptions);
}


function levenshteinDistance (source, target, options) {
    if(isNaN(options.insertion_cost)) options.insertion_cost = 1;
    if(isNaN(options.deletion_cost)) options.deletion_cost = 1;
    if(isNaN(options.substitution_cost)) options.substitution_cost = 1;

    if(typeof options.search !== 'boolean') options.search = false;

    var isUnrestrictedDamerau = options.damerau && !options.restricted;
    var isRestrictedDamerau = options.damerau && options.restricted;

    if (isUnrestrictedDamerau) {
        var lastRowMap = {};
    }

    var sourceLength = source.length;
    var targetLength = target.length;
    var distanceMatrix = [[{cost: 0}]]; //the root, has no parent cell

    for (var row =  1; row <= sourceLength; row++) {
        distanceMatrix[row] = [];
        distanceMatrix[row][0] = {cost: distanceMatrix[row-1][0].cost + options.deletion_cost, parentCell: {row: row-1, column: 0}};
    }

    for (var column = 1; column <= targetLength; column++) {
        if (options.search) {
          distanceMatrix[0][column] = {cost: 0};
        } else {
          distanceMatrix[0][column] = {cost: distanceMatrix[0][column-1].cost + options.insertion_cost, parentCell: {row: 0, column: column-1}};
        }
    }

    for (var row = 1; row <= sourceLength; row++) {
        if (isUnrestrictedDamerau) {
            var lastColMatch = null;
        }
        for (var column = 1; column <= targetLength; column++) {
            var costToInsert = distanceMatrix[row][column-1].cost + options.insertion_cost;
            var costToDelete = distanceMatrix[row-1][column].cost + options.deletion_cost;

            var sourceElement = source[row-1];
            var targetElement = target[column-1];
            var costToSubstitute = distanceMatrix[row-1][column-1].cost;
            if (sourceElement !== targetElement) {
                costToSubstitute = costToSubstitute + options.substitution_cost;
            }

            var possibleParents = [
              {cost: costToInsert, coordinates: {row: row, column: column-1}},
              {cost: costToDelete, coordinates: {row: row-1, column: column}},
              {cost: costToSubstitute, coordinates: {row: row-1, column: column-1}}
            ];

            // We can add damerau to the possibleParents if the current
            // target-letter has been encountered in our lastRowMap,
            // and if there exists a previous column in this row where the
            // row & column letters matched
            var canDamerau = isUnrestrictedDamerau
                && row > 1 && column > 1
                && lastColMatch
                && targetElement in lastRowMap;

            if (canDamerau) {
                var lastRowMatch = lastRowMap[targetElement];
                var costBeforeTransposition =
                    distanceMatrix[lastRowMatch - 1][lastColMatch - 1].cost;
                var costToTranspose = costBeforeTransposition
                    + ((row - lastRowMatch - 1) * options.deletion_cost)
                    + ((column - lastColMatch - 1) * options.insertion_cost)
                    + options.transposition_cost;
                possibleParents.push({
                    cost: costToTranspose,
                    coordinates: {
                        row: lastRowMatch - 1,
                        column: lastColMatch - 1,
                    },
                });
            }
            // Source and target chars are 1-indexed in the distanceMatrix so previous
            // source/target element is (col/row - 2)
            var canDoRestrictedDamerau = isRestrictedDamerau
                && row > 1 && column > 1
                && sourceElement === target[column - 2]
                && source[row - 2] === targetElement;

            if (canDoRestrictedDamerau) {
                var costBeforeTransposition = distanceMatrix[row - 2][column - 2].cost;
                possibleParents.push({
                    cost: costBeforeTransposition + options.transposition_cost,
                    coordinates: { row: row - 2, column: column - 2 },
                });
            }

            var minCostParent = _.min(possibleParents, function(p) { return p.cost; });

            distanceMatrix[row][column] = {cost: minCostParent.cost, parentCell: minCostParent.coordinates};

            if (isUnrestrictedDamerau) {
                lastRowMap[sourceElement] = row;
                if (sourceElement === targetElement) {
                    lastColMatch = column;
                }
            }
        }
    }

    if (!options.search) {
        return distanceMatrix[sourceLength][targetLength].cost;
    }

    return getMinCostSubstring(distanceMatrix, source, target);
}

module.exports = {
    LevenshteinDistance: LevenshteinDistance,
    DamerauLevenshteinDistance: DamerauLevenshteinDistance,
};

},{"underscore":157}],53:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

exports.SoundEx = require('./phonetics/soundex');
exports.Metaphone = require('./phonetics/metaphone');
exports.DoubleMetaphone = require('./phonetics/double_metaphone');
exports.SoundExDM = require('./phonetics/dm_soundex');
exports.PorterStemmer = require('./stemmers/porter_stemmer');
exports.PorterStemmerFa = require('./stemmers/porter_stemmer_fa');
exports.PorterStemmerFr = require('./stemmers/porter_stemmer_fr');
exports.PorterStemmerRu = require('./stemmers/porter_stemmer_ru');
exports.PorterStemmerEs = require('./stemmers/porter_stemmer_es');
exports.PorterStemmerIt = require('./stemmers/porter_stemmer_it');
exports.PorterStemmerNo = require('./stemmers/porter_stemmer_no');
exports.PorterStemmerSv = require('./stemmers/porter_stemmer_sv');
exports.PorterStemmerPt = require('./stemmers/porter_stemmer_pt');
exports.PorterStemmerNl = require('./stemmers/porter_stemmer_nl');
exports.LancasterStemmer = require('./stemmers/lancaster_stemmer');
// StemmerFr and StemmerPl are not stemmers. A Polish stemmer is
// not available, and for French PorterStemmerFr should be used.
//exports.StemmerFr = require('./stemmers/stemmer_fr');
//exports.StemmerPl = require('./stemmers/stemmer_pl');
exports.StemmerJa = require('./stemmers/stemmer_ja');
exports.StemmerId = require('./stemmers/indonesian/stemmer_id');
exports.AggressiveTokenizerNl = require('./tokenizers/aggressive_tokenizer_nl');
exports.AggressiveTokenizerFa = require('./tokenizers/aggressive_tokenizer_fa');
exports.AggressiveTokenizerFr = require('./tokenizers/aggressive_tokenizer_fr');
exports.AggressiveTokenizerRu = require('./tokenizers/aggressive_tokenizer_ru');
exports.AggressiveTokenizerEs = require('./tokenizers/aggressive_tokenizer_es');
exports.AggressiveTokenizerIt = require('./tokenizers/aggressive_tokenizer_it');
exports.AggressiveTokenizerPl = require('./tokenizers/aggressive_tokenizer_pl');
exports.AggressiveTokenizerPt = require('./tokenizers/aggressive_tokenizer_pt');
exports.AggressiveTokenizerNo = require('./tokenizers/aggressive_tokenizer_no');
exports.AggressiveTokenizerSv = require('./tokenizers/aggressive_tokenizer_sv');
exports.AggressiveTokenizerVi = require('./tokenizers/aggressive_tokenizer_vi');
exports.AggressiveTokenizer = require('./tokenizers/aggressive_tokenizer');
exports.CaseTokenizer = require('./tokenizers/tokenizer_case');
exports.RegexpTokenizer = require('./tokenizers/regexp_tokenizer').RegexpTokenizer;
exports.OrthographyTokenizer = require('./tokenizers/regexp_tokenizer').OrthographyTokenizer;
exports.WordTokenizer = require('./tokenizers/regexp_tokenizer').WordTokenizer;
exports.WordPunctTokenizer = require('./tokenizers/regexp_tokenizer').WordPunctTokenizer;
exports.TreebankWordTokenizer = require('./tokenizers/treebank_word_tokenizer');
exports.TokenizerJa = require('./tokenizers/tokenizer_ja');
exports.SentenceTokenizer = require('./tokenizers/sentence_tokenizer');
exports.BayesClassifier = require('./classifiers/bayes_classifier');
exports.LogisticRegressionClassifier = require('./classifiers/logistic_regression_classifier');
exports.NounInflector = require('./inflectors/noun_inflector');
exports.NounInflectorFr = require('./inflectors/fr/noun_inflector');
exports.NounInflectorJa = require('./inflectors/ja/noun_inflector');
exports.PresentVerbInflector = require('./inflectors/present_verb_inflector');
exports.CountInflector = require('./inflectors/count_inflector');
exports.WordNet = require('./wordnet/wordnet');
exports.TfIdf = require('./tfidf/tfidf');
exports.Trie = require('./trie/trie');
exports.SentenceAnalyzer = require('./analyzers/sentence_analyzer');
exports.stopwords = require('./util/stopwords').words;
exports.ShortestPathTree = require('./util/shortest_path_tree');
exports.Spellcheck = require('./spellcheck/spellcheck');
exports.LongestPathTree = require('./util/longest_path_tree');
exports.EdgeWeightedDigraph = require('./util/edge_weighted_digraph');
exports.NGrams = require('./ngrams/ngrams');
exports.NGramsZH = require('./ngrams/ngrams_zh');
exports.JaroWinklerDistance = require('./distance/jaro-winkler_distance');
exports.LevenshteinDistance = require('./distance/levenshtein_distance').LevenshteinDistance;
exports.DamerauLevenshteinDistance = require('./distance/levenshtein_distance').DamerauLevenshteinDistance;
exports.DiceCoefficient = require('./distance/dice_coefficient');
exports.HammingDistance = require('./distance/hamming_distance');
exports.normalize = require('./normalizers/normalizer').normalize_tokens;
exports.normalize_ja = require('./normalizers/normalizer_ja').normalize_ja;
exports.removeDiacritics = require('./normalizers/remove_diacritics');
exports.transliterate_ja = require('./transliterators/ja');
exports.BrillPOSTagger = require('./brill_pos_tagger/lib/Brill_POS_Tagger');
exports.BrillPOSTrainer = require('./brill_pos_tagger/lib/Brill_POS_Trainer');
exports.BrillPOSTester = require('./brill_pos_tagger/lib/Brill_POS_Tester');
exports.Lexicon = require('./brill_pos_tagger/lib/Lexicon');
exports.RuleSet = require('./brill_pos_tagger/lib/RuleSet');
exports.RuleTemplates = require('./brill_pos_tagger/lib/RuleTemplates');
exports.RuleTemplate = require('./brill_pos_tagger/lib/RuleTemplate');
exports.Corpus = require('./brill_pos_tagger/lib/Corpus');
exports.MaxEntClassifier = require('./classifiers/maxent/Classifier');
exports.Context = require('./classifiers/maxent/Context');
exports.Feature = require('./classifiers/maxent/Feature');
exports.FeatureSet = require('./classifiers/maxent/FeatureSet');
exports.Sample = require('./classifiers/maxent/Sample');
exports.Element = require('./classifiers/maxent/Element');
exports.SE_Element = require('./classifiers/maxent/SimpleExample/SE_Element');
exports.Sentence = require('./brill_pos_tagger/lib/Sentence');
exports.GISScaler = require('./classifiers/maxent/GISScaler');
exports.POS_Element = require('./classifiers/maxent/POS/POS_Element');
exports.ME_Sentence = require('./classifiers/maxent/POS/ME_Sentence');
exports.ME_Corpus = require('./classifiers/maxent/POS/ME_Corpus');
exports.SentimentAnalyzer = require('./sentiment/SentimentAnalyzer');
},{"./analyzers/sentence_analyzer":21,"./brill_pos_tagger/lib/Brill_POS_Tagger":22,"./brill_pos_tagger/lib/Brill_POS_Tester":23,"./brill_pos_tagger/lib/Brill_POS_Trainer":24,"./brill_pos_tagger/lib/Corpus":25,"./brill_pos_tagger/lib/Lexicon":26,"./brill_pos_tagger/lib/RuleSet":28,"./brill_pos_tagger/lib/RuleTemplate":29,"./brill_pos_tagger/lib/RuleTemplates":30,"./brill_pos_tagger/lib/Sentence":31,"./classifiers/bayes_classifier":34,"./classifiers/logistic_regression_classifier":36,"./classifiers/maxent/Classifier":37,"./classifiers/maxent/Context":38,"./classifiers/maxent/Element":40,"./classifiers/maxent/Feature":41,"./classifiers/maxent/FeatureSet":42,"./classifiers/maxent/GISScaler":43,"./classifiers/maxent/POS/ME_Corpus":44,"./classifiers/maxent/POS/ME_Sentence":45,"./classifiers/maxent/POS/POS_Element":46,"./classifiers/maxent/Sample":47,"./classifiers/maxent/SimpleExample/SE_Element":48,"./distance/dice_coefficient":49,"./distance/hamming_distance":50,"./distance/jaro-winkler_distance":51,"./distance/levenshtein_distance":52,"./inflectors/count_inflector":54,"./inflectors/fr/noun_inflector":56,"./inflectors/ja/noun_inflector":57,"./inflectors/noun_inflector":58,"./inflectors/present_verb_inflector":59,"./ngrams/ngrams":61,"./ngrams/ngrams_zh":62,"./normalizers/normalizer":63,"./normalizers/normalizer_ja":64,"./normalizers/remove_diacritics":67,"./phonetics/dm_soundex":68,"./phonetics/double_metaphone":69,"./phonetics/metaphone":70,"./phonetics/soundex":72,"./sentiment/SentimentAnalyzer":73,"./spellcheck/spellcheck":74,"./stemmers/indonesian/stemmer_id":79,"./stemmers/lancaster_stemmer":82,"./stemmers/porter_stemmer":83,"./stemmers/porter_stemmer_es":84,"./stemmers/porter_stemmer_fa":85,"./stemmers/porter_stemmer_fr":86,"./stemmers/porter_stemmer_it":87,"./stemmers/porter_stemmer_nl":88,"./stemmers/porter_stemmer_no":89,"./stemmers/porter_stemmer_pt":90,"./stemmers/porter_stemmer_ru":91,"./stemmers/porter_stemmer_sv":92,"./stemmers/stemmer_ja":98,"./tfidf/tfidf":105,"./tokenizers/aggressive_tokenizer":106,"./tokenizers/aggressive_tokenizer_es":107,"./tokenizers/aggressive_tokenizer_fa":108,"./tokenizers/aggressive_tokenizer_fr":109,"./tokenizers/aggressive_tokenizer_it":111,"./tokenizers/aggressive_tokenizer_nl":112,"./tokenizers/aggressive_tokenizer_no":113,"./tokenizers/aggressive_tokenizer_pl":114,"./tokenizers/aggressive_tokenizer_pt":115,"./tokenizers/aggressive_tokenizer_ru":116,"./tokenizers/aggressive_tokenizer_sv":117,"./tokenizers/aggressive_tokenizer_vi":118,"./tokenizers/regexp_tokenizer":120,"./tokenizers/sentence_tokenizer":121,"./tokenizers/tokenizer_case":123,"./tokenizers/tokenizer_ja":124,"./tokenizers/treebank_word_tokenizer":125,"./transliterators/ja":126,"./trie/trie":127,"./util/edge_weighted_digraph":129,"./util/longest_path_tree":130,"./util/shortest_path_tree":131,"./util/stopwords":132,"./wordnet/wordnet":148}],54:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

function nthForm(i) {
    var teenth = (i % 100);

    if(teenth > 10 && teenth < 14)
        return 'th';
    else {
        switch(i % 10) {
            case 1:
                return 'st';
                break;
            case 2:
                return 'nd';
                break;            
            case 3:
                return 'rd';
                break;
            default:
                return 'th';
        }
    }
}

function nth(i) {
    return i.toString() + nthForm(i);
}

var CountInflector = function() {
};

CountInflector.nth = nth;

module.exports = CountInflector;

},{}],55:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var FormSet = function() {
    this.regularForms = [];
    this.irregularForms = {};
}

module.exports = FormSet;

},{}],56:[function(require,module,exports){
/*
 Copyright (c) 2012, Guillaume Marty

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * A noun inflector for French.
 * Compiled from:
 * \@see http://fr.wiktionary.org/wiki/Annexe:Pluriels_irr%C3%A9guliers_en_fran%C3%A7ais
 * \@see http://fr.wikipedia.org/wiki/Pluriels_irr%C3%A9guliers_en_fran%C3%A7ais
 *
 * \@todo Take compounded noun into account (eaux-fortes, pique-nique...).
 * \@todo General note: French also requires AdjectiveInflector (femininize...).
 */

var SingularPluralInflector = require('../singular_plural_inflector'),
    util = require('util'),
    FormSet = require('../form_set');

function attach() {
  var inflector = this;

  String.prototype.singularizeNoun = function() {
    return inflector.singularize(this);
  };

  String.prototype.pluralizeNoun = function() {
    return inflector.pluralize(this);
  };
}



/**
 * @constructor
 */
var NounInflector = function() {
  // Ambiguous a.k.a. invariant.
  // \@todo Expand this list to be as comprehensive as possible.
  this.ambiguous = [
    // Nouns ending by -s
    'à-peu-près', 'à-propos', 'abattis', 'abcès', 'abois', 'abribus', 'abus',
    'accès', 'acquis', 'adénovirus', 'adonis', 'ados', 'agrès', 'aguets',
    'ailleurs', 'ais', 'albatros', 'albinos', 'alias', 'aloès', 'amaryllis',
    'amas', 'ampélopsis', 'ananas', 'anchois', 'angélus', 'anis', 'anticorps',
    'antihéros', 'antirides', 'anus', 'appas', 'appentis', 'appui-bras',
    'appuie-bras', 'arcanes', 'argus', 'arrérages', 'arrière-pays', 'as',
    'ascaris', 'asparagus', 'atlas', 'atours', 'aurochs', 'autobus',
    'autofocus', 'avant-bras', 'avant-corps', 'avant-propos', 'avers', 'avis',
    'axis', 'barbouillis', 'bas', 'beaujolais', 'beaux-arts', 'biais',
    'bibliobus', 'biceps', 'bicross', 'bien-fonds', 'bloc-notes', 'blockhaus',
    'blocus', 'blues', 'bois', 'bonus', 'bout-dehors', 'bouts-rimés',
    'branle-bas', 'bras', 'brebis', 'bris', 'brise-lames', 'brise-mottes',
    'brûlis', 'buis', 'burnous', 'bus', 'business', 'cabas', 'cacatoès',
    'cacatois', 'cactus', 'cadenas', 'cafouillis', 'caillebotis', 'calvados',
    'cambouis', 'campus', 'canevas', 'cannabis', 'carquois', 'cas',
    'casse-noisettes', 'casse-pieds', 'cassis', 'caucus', 'cens', 'cervelas',
    'chablis', 'chamois', 'chaos', 'chas', 'chasselas', 'châssis',
    'chatouillis', 'chauffe-assiettes', 'chauve-souris', 'chorus', 'choucas',
    'circoncis', 'cirrus', 'clafoutis', 'clapotis', 'cliquetis', 'clos',
    'cochylis', 'colis', 'coloris', 'commis', 'compas', 'compromis',
    'compte-chèques', 'compte-gouttes', 'compte-tours', 'concours', 'confins',
    'congrès', 'consensus', 'contrepoids', 'contresens', 'contretemps',
    'corn flakes', 'corps', 'corps-à-corps', 'corpus', 'cosinus', 'cosmos',
    'coulis', 'coupe-ongles', 'cours', 'court-jus', 'couscous', 'coutelas',
    'crocus', 'croquis', 'cross', 'cubitus', 'cumulus', 'cure-dents',
    'cure-ongles', 'cure-pipes', 'cursus', 'cyclo-cross', 'cyprès', 'dais',
    'damas', 'débarras', 'débours', 'débris', 'décès', 'dedans', 'dehors',
    'delirium tremens', 'demi-gros', 'dépens', 'dessous', 'dessus', 'détritus',
    'deux-mâts', 'deux-pièces', 'deux-points', 'deux-roues', 'deux-temps',
    'dévers', 'devis', 'diplodocus', 'discours', 'dos', 'ébats', 'éboulis',
    'échalas', 'edelweiss', 'élaeis', 'éleis', 'éléphantiasis', 'embarras',
    'empois', 'en-cas', 'encens', 'enclos', 'endos', 'engrais', 'entrelacs',
    'entremets', 'envers', 'épluche-légumes', 'ers', 'espace-temps',
    'essuie-mains', 'eucalyptus', 'ex-libris', 'excès', 'express', 'extrados',
    'faciès', 'fait-divers', 'fatras', 'faux-sens', 'favoris', 'ficus',
    'fier-à-bras', 'finnois', 'florès', 'focus', 'fœtus', 'fois', 'forceps',
    'fouillis', 'fracas', 'frais', 'français', 'franglais', 'frimas',
    'friselis', 'frisottis', 'froncis', 'frottis', 'fucus', 'gâchis', 'galetas',
    'galimatias', 'garde-à-vous', 'garde-corps', 'gargouillis', 'gars',
    'gâte-bois', 'gazouillis', 'génois', 'gibus', 'glacis', 'glas', 'gneiss',
    'gobe-mouches', 'grès', 'gribouillis', 'guet-apens', 'habeas corpus',
    'hachis', 'haras', 'hardes', 'harnais', 'haut-le-corps', 'hautbois',
    'herbe-aux-chats', 'héros', 'herpès', 'hiatus', 'hibiscus', 'hors-concours',
    'hors-pistes', 'hourdis', 'huis-clos', 'humérus', 'humus', 'ibis', 'iléus',
    'indique-fuites', 'infarctus', 'inlandsis', 'insuccès', 'intercours',
    'intrados', 'intrus', 'iris', 'isatis', 'jais', 'jars', 'jeans',
    'jeuconcours', 'judas', 'juliénas', 'jus', 'justaucorps', 'kakatoès',
    'kermès', 'kriss', 'lacis', 'laïus', 'lambris', 'lapis', 'laps', 'lapsus',
    'laquais', 'las', 'lattis', 'lave-mains', 'lavis', 'lèche-bottes',
    'lèche-vitrines', 'legs', 'lias', 'liégeois', 'lilas', 'lis', 'lœss',
    'logis', 'loris', 'lotus', 'louis', 'lupus', 'lys', 'mâchicoulis', 'madras',
    'maïs', 'malappris', 'malus', 'mânes', 'maquis', 'marais', 'maroilles',
    'marquis', 'mas', 'mass-médias', 'matelas', 'matois', 'médius', 'mépris',
    'mérinos', 'mess', 'mets', 'mi-bas', 'micro-ondes', 'mille-pattes',
    'millepertuis', 'minibus', 'minois', 'minus', 'mirabilis', 'mois',
    'monocorps', 'monte-plats', 'mors', 'motocross', 'mots-croisés', 'motus',
    'mouchetis', 'mucus', 'myosotis', 'nævus', 'négus', 'niais',
    'nimbo-stratus', 'nimbus', 'norois', 'nounours', 'nu-pieds', 'oasis',
    'obus', 'olibrius', 'omnibus', 'opus', 'os', 'ours', 'ouvre-boîtes',
    'ouvre-bouteilles', 'palais', 'palis', 'palmarès', 'palus', 'panais',
    'panaris', 'pancréas', 'papyrus', 'par-dehors', 'paradis', 'parcours',
    'pardessus', 'pare-balles', 'pare-chocs', 'parvis', 'pas', 'passe-temps',
    'pataquès', 'pathos', 'patois', 'pavois', 'pays', 'permis',
    'petit-bourgeois', 'petit-gris', 'petit-pois', 'phallus', 'phimosis',
    'pickles', 'pilotis', 'pique-fleurs', 'pis', 'pithiviers', 'pityriasis',
    'plateau-repas', 'plâtras', 'plein-temps', 'plexiglas', 'plexus', 'plus',
    'poids', 'pois', 'pont-levis', 'porte-avions', 'porte-bagages',
    'porte-billets', 'porte-bouteilles', 'porte-clés', 'porte-hélicoptères',
    'porte-jarretelles', 'porte-revues', 'pouls', 'préavis', 'presse-fruits',
    'presse-papiers', 'princeps', 'printemps', 'procès', 'processus', 'progrès',
    'propos', 'prospectus', 'protège-dents', 'psoriasis', 'pubis', 'puits',
    'pus', 'putois', 'quatre-épices', 'quatre-feuilles', 'quatre-heures',
    'quatre-mâts', 'quatre-quarts', 'quatre-temps', 'quitus', 'rabais',
    'rachis', 'radis', 'radius', 'raïs', 'ramassis', 'rébus', 'reclus',
    'recours', 'refus', 'relais', 'remords', 'remous', 'remue-méninges',
    'rendez-vous', 'repas', 'répons', 'repos', 'repris', 'reps', 'rétrovirus',
    'revers', 'rhinocéros', 'rictus', 'rince-doigts', 'ris', 'rollmops',
    'rosé-des-prés', 'roulis', 'rubis', 'salmigondis', 'salsifis', 'sans-logis',
    'sas', 'sassafras', 'sauternes', 'schnaps', 'schuss', 'secours', 'semis',
    'sens', 'serre-fils', 'serre-livres', 'sévices', 'sinus', 'skunks',
    'souris', 'sournois', 'sous-bois', 'stradivarius', 'stras', 'strass',
    'strato-cumulus', 'stratus', 'stress', 'succès', 'surdos', 'surplus',
    'surpoids', 'sursis', 'suspens', 'synopsis', 'syphilis', 'taffetas',
    'taillis', 'talus', 'tamaris', 'tamis', 'tapis', 'tas', 'taudis', 'temps',
    'tennis', 'terminus', 'terre-neuvas', 'tétanos', 'tétras', 'thalamus',
    'thermos', 'thesaurus', 'thésaurus', 'thymus', 'tire-fesses', 'tonus',
    'torchis', 'torticolis', 'tournedos', 'tournevis', 'tournis', 'tracas',
    'traîne-savates', 'travers', 'tréfonds', 'treillis', 'trépas', 'trias',
    'triceps', 'trichomonas', 'trois-étoiles', 'trois-mâts', 'trois-quarts',
    'trolleybus', 'tumulus', 'typhus', 'univers', 'us', 'utérus', 'vasistas',
    'vélocross', 'velours', 'verglas', 'verjus', 'vernis', 'vers',
    'vert-de-gris', 'vide-ordures', 'vide-poches', 'villageois', 'virus',
    'vis-à-vis', 'volubilis', 'vulgum pecus', 'waters', 'williams', 'xérès',

    // Nouns ending by -x
    'abat-voix', 'afflux', 'alpax', 'anthrax', 'apex', 'aptéryx',
    'archéoptéryx', 'arrière-faix', 'bombyx', 'borax', 'bordeaux', 'bouseux',
    'box', 'carex', 'casse-noix', 'cedex', 'céphalothorax', 'cérambyx', 'chaux',
    'choix', 'coccyx', 'codex', 'contumax', 'coqueleux', 'cortex', 'courroux',
    'croix', 'crucifix', 'culex', 'demodex', 'duplex', 'entre-deux', 'époux',
    'équivaux', 'eux', 'ex', 'faix', 'faucheux', 'faux', 'fax', 'ferreux',
    'flux', 'fox', 'freux', 'furax', 'hapax', 'harengueux', 'hélix',
    'horse-pox', 'houx', 'index', 'influx', 'inox', 'juke-box', 'kleenex',
    'lagothrix', 'larynx', 'lastex', 'latex', 'lux', 'lynx', 'macareux', 'max',
    'mésothorax', 'mi-voix', 'mirepoix', 'motteux', 'multiplex', 'murex',
    'narthex', 'noix', 'onyx', 'opopanax', 'oropharynx', 'paix', 'panax',
    'perdrix', 'pharynx', 'phénix', 'phlox', 'phoenix', 'pneumothorax', 'poix',
    'portefaix', 'pousse-cailloux', 'preux', 'prix', 'prothorax', 'pucheux',
    'pyrex', 'pyroligneux', 'quadruplex', 'queux', 'redoux', 'reflex', 'reflux',
    'relax', 'rhinopharynx', 'rose-croix', 'rouvieux', 'roux', 'rumex',
    'saindoux', 'sardonyx', 'scolex', 'sèche-cheveux', 'silex', 'simplex',
    'sioux', 'sirex', 'smilax', 'solex', 'songe-creux', 'spalax', 'sphex',
    'sphinx', 'storax', 'strix', 'styrax', 'surfaix', 'surtaux', 'syrinx',
    'tamarix', 'taux', 'télex', 'thorax', 'tord-boyaux', 'toux', 'trionyx',
    'tripoux', 'tubifex', 'vertex', 'vidéotex', 'vielleux', 'vieux',
    'violoneux', 'voix', 'volvox', 'vortex',

    // Nouns ending by -z
    'allume-gaz', 'assez', 'biogaz', 'cache-nez', 'camping-gaz', 'chez',
    'chintz', 'ersatz', 'fez', 'free-jazz', 'fritz', 'gaz', 'gin-fizz', 'hertz',
    'jazz', 'jerez', 'kibboutz', 'kilohertz', 'kolkhoz', 'kronprinz', 'lapiaz',
    'lez', 'mégahertz', 'merguez', 'nez', 'pince-nez', 'quartz', 'quiz', 'ranz',
    'raz', 'recez', 'rémiz', 'rez', 'riz', 'ruolz', 'seltz', 'serre-nez'
  ];

  this.customPluralForms = [];
  this.customSingularForms = [];
  this.singularForms = new FormSet();
  this.pluralForms = new FormSet();

  this.attach = attach;

  this.addIrregular('ail', 'aulx');
  this.addIrregular('bétail', 'bestiaux');
  this.addIrregular('bonhomme', 'bonshommes');
  this.addIrregular('ciel', 'cieux');
  this.addIrregular('monsieur', 'messieurs');
  this.addIrregular('mafioso', 'mafiosi');
  this.addIrregular('œil', 'yeux');
  this.addIrregular('putto', 'putti');
  this.addIrregular('targui', 'touareg'); // touareg -> touaregs is also OK.

  // Pluralize
  this.pluralForms.regularForms.push([/^(av|b|c|carnav|cérémoni|chac|corr|emment|emmenth|festiv|fut|gavi|gra|narv|p|récit|rég|rit|rorqu|st)al$/i, '$1als']);
  this.pluralForms.regularForms.push([/^(aspir|b|cor|ém|ferm|gemm|soupir|trav|vant|vent|vitr)ail$/i, '$1aux']);
  this.pluralForms.regularForms.push([/^(bij|caill|ch|gen|hib|jouj|p|rip|chouch)ou$/i, '$1oux']);
  this.pluralForms.regularForms.push([/^(gr|berimb|don|karb|land|pil|rest|sarr|un)au$/i, '$1aus']);
  this.pluralForms.regularForms.push([/^(bl|ém|enf|pn)eu$/i, '$1eus']);
  this.pluralForms.regularForms.push([/(au|eau|eu|œu)$/i, '$1x']);
  this.pluralForms.regularForms.push([/al$/i, 'aux']);
  this.pluralForms.regularForms.push([/(s|x)$/i, '$1']);
  this.pluralForms.regularForms.push([/(.*)$/i, '$1s']);

  // Singularize
  this.singularForms.regularForms.push([/^(aspir|b|cor|ém|ferm|gemm|soupir|trav|vant|vent|vitr)aux$/i, '$1ail']);
  this.singularForms.regularForms.push([/^(aloy|b|bouc|boy|burg|conoy|coy|cr|esquim|ét|fabli|flé|flûti|glu|gr|gru|hoy|joy|kérab|matéri|nobli|noy|pré|sen|sén|t|touch|tuss|tuy|v|ypré)aux$/i, '$1au']);
  this.singularForms.regularForms.push([/^(bij|caill|ch|gen|hib|jouj|p|rip|chouch)oux$/i, '$1ou']);
  this.singularForms.regularForms.push([/^(bis)?aïeux$/i, '$1aïeul']);
  this.singularForms.regularForms.push([/^apparaux$/i, 'appareil']); // One way transform, don't put on irregular list.
  this.singularForms.regularForms.push([/^ciels$/i, 'ciel']);
  this.singularForms.regularForms.push([/^œils$/i, 'œil']);
  this.singularForms.regularForms.push([/(eau|eu|œu)x$/i, '$1']);
  this.singularForms.regularForms.push([/aux$/i, 'al']);
  this.singularForms.regularForms.push([/(.*)s$/i, '$1']);

  this.pluralize = function(token) {
    return this.ize(token, this.pluralForms, this.customPluralForms);
  };

  this.singularize = function(token) {
    return this.ize(token, this.singularForms, this.customSingularForms);
  };
};

util.inherits(NounInflector, SingularPluralInflector);

module.exports = NounInflector;

},{"../form_set":55,"../singular_plural_inflector":60,"util":11}],57:[function(require,module,exports){
/*
 Copyright (c) 2012, Guillaume Marty

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * A noun inflector for Japanese.
 * Compiled from several sources including:
 * \@see http://answers.yahoo.com/question/index?qid=20080528201740AASBWy6
 * \@see http://www.excite.co.jp/dictionary/english_japanese/
 *
 * This script assumes input is normalized using normalizer_ja().
 * Pluralizing Japanese has a very limited interest.
 * Japanese don't usually distinct plural from singular, so even a word looking
 * like a singular might actually be a plural.
 *
 * Singularization of nouns ending by -tachi or -ra is achieved using a
 * comprehensive black list, while nouns ending by -domo or -gata use a white
 * list because there are too many exceptions.
 *
 * \@todo Singularize nouns ending by -ら, but there are too many exceptions.
 * \@todo Expand the list of common plurals ending by -domo and -gata.
 */

var SingularPluralInflector = require('../singular_plural_inflector'),
    util = require('util'),
    FormSet = require('../form_set');

function attach() {
  var inflector = this;

  String.prototype.singularizeNoun = function() {
    return inflector.singularize(this);
  };

  String.prototype.pluralizeNoun = function() {
    return inflector.pluralize(this);
  };
}



/**
 * @constructor
 */
var NounInflector = function() {
  // Ambiguous a.k.a. invariant.
  this.ambiguous = [
    'ともだち', '友だち', '友達', '遊び友達', '飲み友達', '酒飲み友達', '茶飲み友達',
    '学校友達', '女友達', '男友達', '幼友達'
  ];

  this.customPluralForms = [];
  this.customSingularForms = [];
  this.singularForms = new FormSet();
  this.pluralForms = new FormSet();

  this.attach = attach;

  this.addIrregular('神', '神神');
  this.addIrregular('人', '人人');
  this.addIrregular('年', '年年');
  this.addIrregular('月', '月月');
  this.addIrregular('日', '日日');
  this.addIrregular('星', '星星');
  this.addIrregular('島', '島島');
  this.addIrregular('我', '我我');
  this.addIrregular('山', '山山');
  this.addIrregular('国', '国国');
  this.addIrregular('所', '所所');
  this.addIrregular('隅', '隅隅');

  /**
   * Notes:
   * -たち exceptions: いたち, おいたち, ついたち, かたち, かおかたち, なりかたち, いでたち, はたち, からたち, なりたち
   * -達 exceptions: 伊達, 男伊達, 栄達, 上意下達, 熟達, 上達, 下意上達, 先達, 送達, 速達, 即日速達, 書留速達, 調達, 通達, 伝達, 到達, 配達, 牛乳配達, 新聞配達, 無料配達, 四通八達, 発達, 未発達, 御用達, 宮内庁御用達, 練達, 闊達
   * -等 exceptions: 一等, 下等, 何等, 均等, 勲等, 高等, 三等, 初等, 上等, 親等, 二親等, 数等, 対等, 中等, 同等, 特等, 二等, 品等, 不等, 平等, 悪平等, 男女平等, 不平等, 優等, 劣等
   */

  // Pluralize
  this.pluralForms.regularForms.push([/^(.+)$/i, '$1たち']);

  // Singularize
  this.singularForms.regularForms.push([/^(.+)たち$/i, function(a, mask) {
    if (['い', 'おい', 'つい', 'か', 'かおか', 'なりか', 'いで', 'は', 'から',
      'なり'].indexOf(mask) >= 0)
      return mask + 'たち';
    return mask;
  }]);
  this.singularForms.regularForms.push([/^(.+)達$/i, function(a, mask) {
    if (['伊', '伊', '栄', '上意下', '熟', '上', '下意上', '先', '送', '速',
      '即日速', '書留速', '調', '通', '伝', '到', '配', '牛乳配', '新聞配', '無料配',
      '四通八', '発', '未発', '御用', '宮内庁御用', '練', '闊'].indexOf(mask) >= 0)
      return mask + '達';
    return mask;
  }]);  // Singularize nouns ending by -等, but not exceptions.
  this.singularForms.regularForms.push([/^(.+)等$/i, function(a, mask) {
    if (['一', '下', '何', '均', '勲', '高', '三', '初', '親', '二親', '数', '対',
      '中', '同', '特', '二', '品', '不', '平', '悪平', '男女平', '不平', '優',
      '劣'].indexOf(mask) >= 0)
      return mask + '等';
    return mask;
  }]);
  this.singularForms.regularForms.push([/^(人間|わたくし|私|てまえ|手前|野郎|やろう|勇者|がき|ガキ|餓鬼|あくとう|悪党|猫|家来)(共|ども)$/i, '$1']);
  this.singularForms.regularForms.push([/^(神様|先生|あなた|大名|女中|奥様)(方|がた)$/i, '$1']);

  this.pluralize = function(token) {
    return this.ize(token, this.pluralForms, this.customPluralForms);
  };

  this.singularize = function(token) {
    return this.ize(token, this.singularForms, this.customSingularForms);
  };
};

util.inherits(NounInflector, SingularPluralInflector);

module.exports = NounInflector;

},{"../form_set":55,"../singular_plural_inflector":60,"util":11}],58:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var SingularPluralInflector = require('./singular_plural_inflector'),
    util = require('util'),
    FormSet = require('./form_set');

function attach() {
    var inflector = this;

    String.prototype.singularizeNoun = function() {
        return inflector.singularize(this);
    }

    String.prototype.pluralizeNoun = function() {
        return inflector.pluralize(this);
    }
}

var NounInflector = function() {
    this.ambiguous = [
        'bison', 'bream', 'carp', 'chassis', 'christmas', 'cod', 'corps', 'debris', 'deer',
        'diabetes', 'equipment', 'elk', 'fish', 'flounder', 'gallows', 'graffiti',
        'headquarters', 'herpes', 'highjinks', 'homework', 'information',
        'mackerel', 'mews', 'money', 'news', 'rice', 'rabies', 'salmon', 'series',
        'sheep', 'shrimp', 'species', 'swine', 'trout', 'tuna', 'whiting', 'wildebeest'
    ];

    this.customPluralForms = [];
    this.customSingularForms = [];
    this.singularForms = new FormSet();
    this.pluralForms = new FormSet();

    this.attach = attach;

    this.addIrregular("child", "children");
    this.addIrregular("man", "men");
    this.addIrregular("person", "people");
    this.addIrregular("sex", "sexes");
    this.addIrregular("mouse", "mice");
    this.addIrregular("ox", "oxen");
    this.addIrregular("foot", "feet");
    this.addIrregular("tooth", "teeth");
    this.addIrregular("goose", "geese");
    this.addIrregular("ephemeris", "ephemerides");
    this.addIrregular("cloth", "clothes");
    this.addIrregular("hero", "heroes");
    this.addIrregular("torso", "torsi");

    // see if it is possible to unify the creation of both the singular and
    // plural regexes or maybe even just have one list. with a complete list
    // of rules it may only be possible for some regular forms, but worth a shot
    this.pluralForms.regularForms.push([/([aeiou]y)$/i, '$1s']);
    this.pluralForms.regularForms.push([/y$/i, 'ies']);
    this.pluralForms.regularForms.push([/ife$/i, 'ives']);
    this.pluralForms.regularForms.push([/(antenn|formul|nebul|vertebr|vit)a$/i, '$1ae']);
    this.pluralForms.regularForms.push([/(octop|vir|radi|nucle|fung|cact|stimul|alumn|calcul|hippopotam|macrofung|phoet|syllab|troph)us$/i, '$1i']);
    this.pluralForms.regularForms.push([/(buffal|tomat|tornad)o$/i, '$1oes']);
    this.pluralForms.regularForms.push([/(sis)$/i, 'ses']);
    this.pluralForms.regularForms.push([/(matr|vert|ind|cort)(ix|ex)$/i, '$1ices']);
    this.pluralForms.regularForms.push([/sses$/i, 'sses']);
    this.pluralForms.regularForms.push([/(x|ch|ss|sh|s|z)$/i, '$1es']);
    this.pluralForms.regularForms.push([/^(?!talis|.*hu)(.*)man$/i, '$1men']);
    this.pluralForms.regularForms.push([/(.*)/i, '$1s']);

    this.singularForms.regularForms.push([/([^v])ies$/i, '$1y']);
    this.singularForms.regularForms.push([/ives$/i, 'ife']);
    this.singularForms.regularForms.push([/(antenn|formul|nebul|vertebr|vit)ae$/i, '$1a']);
    this.singularForms.regularForms.push([/(octop|vir|radi|nucle|fung|cact|stimul|alumn|calcul|hippopotam|macrofung|phoet|syllab|troph)(i)$/i, '$1us']);
    this.singularForms.regularForms.push([/(buffal|tomat|tornad)(oes)$/i, '$1o']);
    this.singularForms.regularForms.push([/(analy|naly|synop|parenthe|diagno|the)ses$/i, '$1sis']);
    this.singularForms.regularForms.push([/(vert|ind|cort)(ices)$/i, '$1ex']);
    // our pluralizer won''t cause this form of appendix (appendicies)
    // but we should handle it
    this.singularForms.regularForms.push([/(matr|append)(ices)$/i, '$1ix']);
    this.singularForms.regularForms.push([/(x|ch|ss|sh|s|z)es$/i, '$1']);
    this.singularForms.regularForms.push([/men$/i, 'man']);
    this.singularForms.regularForms.push([/ss$/i, 'ss']);
    this.singularForms.regularForms.push([/s$/i, '']);

    this.pluralize = function (token) {
        return this.ize(token, this.pluralForms, this.customPluralForms);
    };

    this.singularize = function(token) {
        return this.ize(token, this.singularForms, this.customSingularForms);
    };
};

util.inherits(NounInflector, SingularPluralInflector);

module.exports = NounInflector;

},{"./form_set":55,"./singular_plural_inflector":60,"util":11}],59:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var util = require('util'),
    SingularPluralInflector = require('./singular_plural_inflector'),
    FormSet = require('./form_set');

function attach() {
    var inflector = this;
    
    String.prototype.singularizePresentVerb = function() {
        return inflector.singularize(this);
    }
    
    String.prototype.pluralizePresentVerb = function() {
        return inflector.pluralize(this);
    }
}

var VerbInflector = function() {
    this.ambiguous = [
        'will'
    ];
    
    this.attach = attach;
        
    this.customPluralForms = [];
    this.customSingularForms = [];    
    this.singularForms = new FormSet();
    this.pluralForms = new FormSet();

    this.addIrregular("am", "are");    
    this.addIrregular("is", "are");
    this.addIrregular("was", "were");
    this.addIrregular("has", "have");
    
    this.singularForms.regularForms.push([/ed$/i, 'ed']);
    this.singularForms.regularForms.push([/ss$/i, 'sses']);
    this.singularForms.regularForms.push([/x$/i, 'xes']);    
    this.singularForms.regularForms.push([/(h|z|o)$/i, '$1es']);
    this.singularForms.regularForms.push([/$zz/i, 'zzes']);
    this.singularForms.regularForms.push([/([^a|e|i|o|u])y$/i, '$1ies']);
    this.singularForms.regularForms.push([/$/i, 's']);

    this.pluralForms.regularForms.push([/sses$/i, 'ss']);
    this.pluralForms.regularForms.push([/xes$/i, 'x']);
    this.pluralForms.regularForms.push([/([cs])hes$/i, '$1h']);
    this.pluralForms.regularForms.push([/zzes$/i, 'zz']);
    this.pluralForms.regularForms.push([/([^h|z|o|i])es$/i, '$1e']);
    this.pluralForms.regularForms.push([/ies$/i, 'y']);//flies->fly
    this.pluralForms.regularForms.push([/e?s$/i, '']); 
};

util.inherits(VerbInflector, SingularPluralInflector);

module.exports = VerbInflector;

},{"./form_set":55,"./singular_plural_inflector":60,"util":11}],60:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var TenseInflector = function () {
};

TenseInflector.prototype.addSingular = function(pattern, replacement) {
    this.customSingularForms.push([pattern, replacement]);    
};

TenseInflector.prototype.addPlural = function(pattern, replacement) {
    this.customPluralForms.push([pattern, replacement]);
};

TenseInflector.prototype.ize = function (token, formSet, customForms) {
    var restoreCase = this.restoreCase(token);
    return restoreCase(this.izeRegExps(token, customForms) || this.izeAbiguous(token) ||
        this.izeRegulars(token, formSet) || this.izeRegExps(token, formSet.regularForms) ||
        token);
}

TenseInflector.prototype.izeAbiguous = function (token) {
    if(this.ambiguous.indexOf(token.toLowerCase()) > -1)
        return token.toLowerCase();

    return false;
}

TenseInflector.prototype.pluralize = function (token) {
    return this.ize(token, this.pluralForms, this.customPluralForms);
};

TenseInflector.prototype.singularize = function(token) {
    return this.ize(token, this.singularForms, this.customSingularForms);
};    

var uppercaseify = function(token) {
    return token.toUpperCase();
}
var capitalize = function(token) {
    return token[0].toUpperCase() + token.slice(1);
}
var lowercaseify = function(token) {
    return token.toLowerCase();
}

TenseInflector.prototype.restoreCase = function(token) {
    if (token[0] === token[0].toUpperCase()) {
        if (token[1] && token[1] === token[1].toLowerCase()) {
            return capitalize;
        } else {
            return uppercaseify;
        }
    } else {
        return lowercaseify;
    }
}

TenseInflector.prototype.izeRegulars = function(token, formSet) {
    token = token.toLowerCase();
    if(formSet.irregularForms.hasOwnProperty(token) && formSet.irregularForms[token])
        return formSet.irregularForms[token];

    return false;
}

TenseInflector.prototype.addForm = function(singularTable, pluralTable, singular, plural) {
    singular = singular.toLowerCase();
    plural = plural.toLowerCase();
    pluralTable[singular] = plural;
    singularTable[plural] = singular;
};

TenseInflector.prototype.addIrregular = function(singular, plural) {
    this.addForm(this.singularForms.irregularForms, this.pluralForms.irregularForms, singular, plural);
};

TenseInflector.prototype.izeRegExps = function(token, forms) {
        var i, form;
        for(i = 0; i < forms.length; i++) {
            form = forms[i];
            
            if(token.match(form[0]))
                return token.replace(form[0], form[1]);
        }
        
        return false;
    }

module.exports = TenseInflector;

},{}],61:[function(require,module,exports){
/*
Copyright (c) 2011, 2018 Rob Ellis, Chris Umbel, Hugo W.L. ter Doest

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var _ = require("underscore")._,
    Tokenizer = require('../tokenizers/regexp_tokenizer').WordTokenizer,
    tokenizer = new Tokenizer(),
    frequencies = {},
    nrOfNgrams = 0;

exports.setTokenizer = function(t) {
    if(!_.isFunction(t.tokenize))
        throw new Error('Expected a valid Tokenizer');
    tokenizer = t;
};

exports.ngrams = function(sequence, n, startSymbol, endSymbol, stats) {
    return ngrams(sequence, n, startSymbol, endSymbol, stats);
};

exports.bigrams = function(sequence, startSymbol, endSymbol, stats) {
    return ngrams(sequence, 2, startSymbol, endSymbol, stats);
};

exports.trigrams = function(sequence, startSymbol, endSymbol, stats) {
    return ngrams(sequence, 3, startSymbol, endSymbol, stats);
};

exports.multrigrams = function(sequence, n, startSymbol, endSymbol, stats) {
    return ngrams(sequence, n, startSymbol, endSymbol, stats);
};

// Calculates a key (string) that can be used for a map
function arrayToKey(arr) {
  result = "(";
  arr.forEach(function(x) {
    result += x + ", ";
  });
  result = result.substr(0, result.length - 2) + ")";
  return result;
};

// Updates the statistics for the new ngram
function countNgrams(ngram) {
  nrOfNgrams++;
  var key = arrayToKey(ngram);
  if (!frequencies[key]) {
    frequencies[key] = 0;
  }
  frequencies[key]++;
}

// If stats is true, statistics will be returned
var ngrams = function(sequence, n, startSymbol, endSymbol, stats) {
    var result = [];
    frequencies = {};
    nrOfNgrams = 0;
    
    if (!_(sequence).isArray()) {
        sequence = tokenizer.tokenize(sequence);
    }

    var count = _.max([0, sequence.length - n + 1]);

    // Check for left padding    
    if(typeof startSymbol !== "undefined" && startSymbol !== null) {
        // Create an array of (n) start symbols
        var blanks = [];
        for(var i = 0 ; i < n ; i++) {
            blanks.push(startSymbol);
        }

        // Create the left padding
        for(var p = n - 1 ; p > 0 ; p--) {
            // Create a tuple of (p) start symbols and (n - p) words
          var ngram = blanks.slice(0, p).concat(sequence.slice(0, n - p));
          result.push(ngram);
          if (stats) {
            countNgrams(ngram);
          }
        }
    }

    // Build the complete ngrams
    for (var i = 0; i < count; i++) {
        var ngram = sequence.slice(i, i + n);
        result.push(ngram);
        if (stats) { 
          countNgrams(ngram);
        }
    }

    // Check for right padding
    if(typeof endSymbol !== "undefined" && endSymbol !== null) {
        // Create an array of (n) end symbols
        var blanks = [];
        for(var i = 0 ; i < n ; i++) {
            blanks.push(endSymbol);
        }

        // create the right padding
        for(var p = n - 1 ; p > 0 ; p--) {
            // Create a tuple of (p) start symbols and (n - p) words
          var ngram = sequence.slice(sequence.length - p, sequence.length).concat(blanks.slice(0, n - p));
          result.push(ngram);
          if (stats) {
            countNgrams(ngram);
          }
        }
    }
    
    if (stats) {
      
      // Count frequencies
      var Nr = {};
      Object.keys(frequencies).forEach(function(key) {
        if (!Nr[frequencies[key]]) {
          Nr[frequencies[key]] = 0;
        }
        Nr[frequencies[key]]++;
      });
      
      // Return the ngrams AND statistics
      return {
        "ngrams": result,
        "frequencies": frequencies,
        "Nr": Nr,
        "numberOfNgrams": nrOfNgrams
      };
      
    }
    else { // Do not break existing API of this module 
      return result;
    }
};
},{"../tokenizers/regexp_tokenizer":120,"underscore":157}],62:[function(require,module,exports){
/*
Copyright (c) 2014, Lee Wenzhu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var _ = require("underscore")._;

exports.ngrams = function(sequence, n, startSymbol, endSymbol) {
    return ngrams(sequence, n, startSymbol, endSymbol);
}

exports.bigrams = function(sequence, startSymbol, endSymbol) {
    return ngrams(sequence, 2, startSymbol, endSymbol);
}

exports.trigrams = function(sequence, startSymbol, endSymbol) {
    return ngrams(sequence, 3, startSymbol, endSymbol);
}

var ngrams = function(sequence, n, startSymbol, endSymbol) {
    var result = [], i;
    
    if (!_(sequence).isArray()) {
        sequence = sequence.split('');
    }

    var count = _.max([0, sequence.length - n + 1]);

    // Check for left padding    
    if(typeof startSymbol !== "undefined" && startSymbol !== null) {
        // Create an array of (n) start symbols
        var blanks = [];
        for(i = 0 ; i < n ; i++) {
            blanks.push(startSymbol);
        }

        // Create the left padding
        for(var p = n - 1 ; p > 0 ; p--) {
            // Create a tuple of (p) start symbols and (n - p) words
            result.push(blanks.slice(0, p).concat(sequence.slice(0, n - p)));
        }
    }

    // Build the complete ngrams
    for (i = 0; i < count; i++) {
        result.push(sequence.slice(i, i + n));
    }

    // Check for right padding
    if(typeof endSymbol !== "undefined" && endSymbol !== null) {
        // Create an array of (n) end symbols
        var blanks = [];
        for(var i = 0 ; i < n ; i++) {
            blanks.push(endSymbol);
        }

        // create the right padding
        for(var p = n - 1 ; p > 0 ; p--) {
            // Create a tuple of (p) start symbols and (n - p) words
            result.push(sequence.slice(sequence.length - p, sequence.length).concat(blanks.slice(0, n - p)));
        }
    }
    
    return result;
};


},{"underscore":157}],63:[function(require,module,exports){
/*
 Copyright (c) 2013, Kenneth Koch

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * The english normalizer will create a string in which all contractions are expanded to their 
 * full meaning (i.e. "we'll" becomes "we will"). 
 *
 * It currently works off a conversion table and falls back to a set of rules.
 * Since it is applied first, the conversion table provides an "override" for the rules.
 **/
var replacer = require('../util/utils').replacer;

var conversionTable = {
	"can't":"can not",
	"won't":"will not",
	"couldn't've":"could not have",
	"i'm":"I am",
	"how'd":"how did"
};

var rules = [
	{ regex: /([azAZ]*)n\'[tT]/g, output: "$1 not" },
	{ regex: /([azAZ]*)\'[sS]/g, output: "$1 is" },
	{ regex: /([azAZ]*)\'[lL][lL]/g, output: "$1 will" },
	{ regex: /([azAZ]*)\'[rR][eE]/g, output: "$1 are" },
	{ regex: /([azAZ]*)\'[vV][eE]/g, output: "$1 have" },
	{ regex: /([azAZ]*)\'[dD]/g, output: "$1 would" }
];

// Accepts a list of tokens to expand.
var normalize_tokens = function(tokens) {
	if(typeof tokens === "string") {
		tokens = [tokens];
	}
        var results = [];
	var rule_count = rules.length;
	var num_tokens = tokens.length;
        var i, token, r, rule;
    
        for (i = 0; i < num_tokens; i++) {
            token = tokens[i];
            // Check the conversion table
            if (conversionTable[token.toLowerCase()]) {
                results = results.concat(conversionTable[token.toLowerCase()].split(/\W+/));
            }
            
            // Apply the rules
            else {
                var matched = false;
                for ( r = 0; r < rule_count; r++) {
                    rule = rules[r];
                    if (token.match(rule.regex)) {
                        results = results.concat(token.replace(rule.regex, rule.output).split(/\W+/));
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    results.push(token);
                }
            }
        }

	return results;
};





// export the relevant stuff.
exports.normalize_tokens = normalize_tokens;





},{"../util/utils":145}],64:[function(require,module,exports){
/*
 Copyright (c) 2012, Guillaume Marty

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * Normalize Japanese inputs and expose function to perform several conversions.
 *
 * Note: The space character is treated like a roman character as it usually
 *   has the same width as them in Japanese texts.
 *
 * \@todo Replace characters range from ㈠ to ㉃, ㊀ to ㊰ and ㇰ to ㇿ.
 * \@todo Lazy initializations of conversionTables and converters.
 * \@todo Would fixHalfwidthKana be useful?
 *
 * Descriptions of functions exposed:
 * normalizeJapanese 「全角」英字・数字を「半角」、「半角」記・カタカナを「全角」に変換
 * converters.fullwidthToHalfwidth.alphabet    「全角」英字を「半角」に変換
 * converters.halfwidthToFullwidth.alphabet    「半角」英字を「全角」に変換
 * converters.fullwidthToHalfwidth.numbers     「全角」数字を「半角」に変換
 * converters.halfwidthToFullwidth.numbers     「半角」数字を「全角」に変換 「全角」スペースを「半角」
 * converters.fullwidthToHalfwidth.punctuation 「全角」記号を「半角」に変換 「半角」スペースを「全角」
 * converters.halfwidthToFullwidth.punctuation 「半角」記号を「全角」に変換
 * converters.fullwidthToHalfwidth.katakana    「全角カタカナ」を「半角カタカナ」に変換
 * converters.halfwidthToFullwidth.katakana    「半角カタカナ」を「全角カタカナ」に変換
 * converters.hiraganaToKatakana               「カタカナ」を「ひらがな」に変換
 * converters.katakanaToHiragana               「ひらがな」を「カタカナ」に変換
 */

var flip = require('../util/utils.js').flip;
var merge = require('../util/utils.js').merge;
var replacer = require('../util/utils').replacer;

// From http://fernweh.jp/b/mb_convert_kana_js/
var conversionTables = {
  fullwidthToHalfwidth: {
    alphabet: {
      'ａ': 'a',
      'ｂ': 'b',
      'ｃ': 'c',
      'ｄ': 'd',
      'ｅ': 'e',
      'ｆ': 'f',
      'ｇ': 'g',
      'ｈ': 'h',
      'ｉ': 'i',
      'ｊ': 'j',
      'ｋ': 'k',
      'ｌ': 'l',
      'ｍ': 'm',
      'ｎ': 'n',
      'ｏ': 'o',
      'ｐ': 'p',
      'ｑ': 'q',
      'ｒ': 'r',
      'ｓ': 's',
      'ｔ': 't',
      'ｕ': 'u',
      'ｖ': 'v',
      'ｗ': 'w',
      'ｘ': 'x',
      'ｙ': 'y',
      'ｚ': 'z',
      'Ａ': 'A',
      'Ｂ': 'B',
      'Ｃ': 'C',
      'Ｄ': 'D',
      'Ｅ': 'E',
      'Ｆ': 'F',
      'Ｇ': 'G',
      'Ｈ': 'H',
      'Ｉ': 'I',
      'Ｊ': 'J',
      'Ｋ': 'K',
      'Ｌ': 'L',
      'Ｍ': 'M',
      'Ｎ': 'N',
      'Ｏ': 'O',
      'Ｐ': 'P',
      'Ｑ': 'Q',
      'Ｒ': 'R',
      'Ｓ': 'S',
      'Ｔ': 'T',
      'Ｕ': 'U',
      'Ｖ': 'V',
      'Ｗ': 'W',
      'Ｘ': 'X',
      'Ｙ': 'Y',
      'Ｚ': 'Z',
      '　': ' ' // Fullwidth space
    },

    numbers: {
      '０': '0',
      '１': '1',
      '２': '2',
      '３': '3',
      '４': '4',
      '５': '5',
      '６': '6',
      '７': '7',
      '８': '8',
      '９': '9'
    },

    symbol: {
      '＿': '_',
      '－': '-',
      '，': ',',
      '；': ';',
      '：': ':',
      '！': '!',
      '？': '?',
      '．': '.',
      '（': '(',
      '）': ')',
      '［': '[',
      '］': ']',
      '｛': '{',
      '｝': '}',
      '＠': '@',
      '＊': '*',
      '＼': '\\',
      '／': '/',
      '＆': '&',
      '＃': '#',
      '％': '%',
      '｀': '`',
      '＾': '^',
      '＋': '+',
      '＜': '<',
      '＝': '=',
      '＞': '>',
      '｜': '|',
      // Never converted: '～': '~',
      '≪': '«',
      '≫': '»',
      '─': '-',
      '＄': '$',
      '＂': '"'
    },

    purePunctuation: {
      '、': '､',
      '。': '｡',
      '・': '･',
      '「': '｢',
      '」': '｣'
    },

    punctuation: {},

    katakana: {
      '゛': 'ﾞ',
      '゜': 'ﾟ',
      'ー': 'ｰ',

      'ヴ': 'ｳﾞ',
      'ガ': 'ｶﾞ',
      'ギ': 'ｷﾞ',
      'グ': 'ｸﾞ',
      'ゲ': 'ｹﾞ',
      'ゴ': 'ｺﾞ',
      'ザ': 'ｻﾞ',
      'ジ': 'ｼﾞ',
      'ズ': 'ｽﾞ',
      'ゼ': 'ｾﾞ',
      'ゾ': 'ｿﾞ',
      'ダ': 'ﾀﾞ',
      'ヂ': 'ﾁﾞ',
      'ヅ': 'ﾂﾞ',
      'デ': 'ﾃﾞ',
      'ド': 'ﾄﾞ',
      'バ': 'ﾊﾞ',
      'パ': 'ﾊﾟ',
      'ビ': 'ﾋﾞ',
      'ピ': 'ﾋﾟ',
      'ブ': 'ﾌﾞ',
      'プ': 'ﾌﾟ',
      'ベ': 'ﾍﾞ',
      'ペ': 'ﾍﾟ',
      'ボ': 'ﾎﾞ',
      'ポ': 'ﾎﾟ',

      'ァ': 'ｧ',
      'ア': 'ｱ',
      'ィ': 'ｨ',
      'イ': 'ｲ',
      'ゥ': 'ｩ',
      'ウ': 'ｳ',
      'ェ': 'ｪ',
      'エ': 'ｴ',
      'ォ': 'ｫ',
      'オ': 'ｵ',
      'カ': 'ｶ',
      'キ': 'ｷ',
      'ク': 'ｸ',
      'ケ': 'ｹ',
      'コ': 'ｺ',
      'サ': 'ｻ',
      'シ': 'ｼ',
      'ス': 'ｽ',
      'セ': 'ｾ',
      'ソ': 'ｿ',
      'タ': 'ﾀ',
      'チ': 'ﾁ',
      'ッ': 'ｯ',
      'ツ': 'ﾂ',
      'テ': 'ﾃ',
      'ト': 'ﾄ',
      'ナ': 'ﾅ',
      'ニ': 'ﾆ',
      'ヌ': 'ﾇ',
      'ネ': 'ﾈ',
      'ノ': 'ﾉ',
      'ハ': 'ﾊ',
      'ヒ': 'ﾋ',
      'フ': 'ﾌ',
      'ヘ': 'ﾍ',
      'ホ': 'ﾎ',
      'マ': 'ﾏ',
      'ミ': 'ﾐ',
      'ム': 'ﾑ',
      'メ': 'ﾒ',
      'モ': 'ﾓ',
      'ャ': 'ｬ',
      'ヤ': 'ﾔ',
      'ュ': 'ｭ',
      'ユ': 'ﾕ',
      'ョ': 'ｮ',
      'ヨ': 'ﾖ',
      'ラ': 'ﾗ',
      'リ': 'ﾘ',
      'ル': 'ﾙ',
      'レ': 'ﾚ',
      'ロ': 'ﾛ',
      'ワ': 'ﾜ',
      'ヲ': 'ｦ',
      'ン': 'ﾝ'
    }
  },

  halfwidthToFullwidth: {}
};

var fixFullwidthKana = {
  'ゝ゛': 'ゞ',
  'ヽ゛': 'ヾ',

  'う゛': 'ゔ',
  'か゛': 'が',
  'き゛': 'ぎ',
  'く゛': 'ぐ',
  'け゛': 'げ',
  'こ゛': 'ご',
  'さ゛': 'ざ',
  'し゛': 'じ',
  'す゛': 'ず',
  'せ゛': 'ぜ',
  'そ゛': 'ぞ',
  'た゛': 'だ',
  'ち゛': 'ぢ',
  'つ゛': 'づ',
  'て゛': 'で',
  'と゛': 'ど',
  'は゛': 'ば',
  'は゜': 'ぱ',
  'ひ゛': 'び',
  'ひ゜': 'ぴ',
  'ふ゛': 'ぶ',
  'ふ゜': 'ぷ',
  'へ゛': 'べ',
  'へ゜': 'ぺ',
  'ほ゛': 'ぼ',
  'ほ゜': 'ぽ',
  'っな': 'んな',
  'っに': 'んに',
  'っぬ': 'んぬ',
  'っね': 'んね',
  'っの': 'んの',

  'ウ゛': 'ヴ',
  'カ゛': 'ガ',
  'キ゛': 'ギ',
  'ク゛': 'グ',
  'ケ゛': 'ゲ',
  'コ゛': 'ゴ',
  'サ゛': 'ザ',
  'シ゛': 'ジ',
  'ス゛': 'ズ',
  'セ゛': 'ゼ',
  'ソ゛': 'ゾ',
  'タ゛': 'ダ',
  'チ゛': 'ヂ',
  'ツ゛': 'ヅ',
  'テ゛': 'デ',
  'ト゛': 'ド',
  'ハ゛': 'バ',
  'ハ゜': 'パ',
  'ヒ゛': 'ビ',
  'ヒ゜': 'ピ',
  'フ゛': 'ブ',
  'フ゜': 'プ',
  'ヘ゛': 'ベ',
  'ヘ゜': 'ペ',
  'ホ゛': 'ボ',
  'ホ゜': 'ポ',
  'ッナ': 'ンナ',
  'ッニ': 'ンニ',
  'ッヌ': 'ンヌ',
  'ッネ': 'ンネ',
  'ッノ': 'ンノ'
};

var fixCompositeSymbolsTable = {
  '㋀': '1月',
  '㋁': '2月',
  '㋂': '3月',
  '㋃': '4月',
  '㋄': '5月',
  '㋅': '6月',
  '㋆': '7月',
  '㋇': '8月',
  '㋈': '9月',
  '㋉': '10月',
  '㋊': '11月',
  '㋋': '12月',

  '㏠': '1日',
  '㏡': '2日',
  '㏢': '3日',
  '㏣': '4日',
  '㏤': '5日',
  '㏥': '6日',
  '㏦': '7日',
  '㏧': '8日',
  '㏨': '9日',
  '㏩': '10日',
  '㏪': '11日',
  '㏫': '12日',
  '㏬': '13日',
  '㏭': '14日',
  '㏮': '15日',
  '㏯': '16日',
  '㏰': '17日',
  '㏱': '18日',
  '㏲': '19日',
  '㏳': '20日',
  '㏴': '21日',
  '㏵': '22日',
  '㏶': '23日',
  '㏷': '24日',
  '㏸': '25日',
  '㏹': '26日',
  '㏺': '27日',
  '㏻': '28日',
  '㏼': '29日',
  '㏽': '30日',
  '㏾': '31日',

  '㍘': '0点',
  '㍙': '1点',
  '㍚': '2点',
  '㍛': '3点',
  '㍜': '4点',
  '㍝': '5点',
  '㍞': '6点',
  '㍟': '7点',
  '㍠': '8点',
  '㍡': '9点',
  '㍢': '10点',
  '㍣': '11点',
  '㍤': '12点',
  '㍥': '13点',
  '㍦': '14点',
  '㍧': '15点',
  '㍨': '16点',
  '㍩': '17点',
  '㍪': '18点',
  '㍫': '19点',
  '㍬': '20点',
  '㍭': '21点',
  '㍮': '22点',
  '㍯': '23点',
  '㍰': '24点',

  '㍻': '平成',
  '㍼': '昭和',
  '㍽': '大正',
  '㍾': '明治',
  '㍿': '株式会社',

  '㌀': 'アパート',
  '㌁': 'アルファ',
  '㌂': 'アンペア',
  '㌃': 'アール',
  '㌄': 'イニング',
  '㌅': 'インチ',
  '㌆': 'ウオン',
  '㌇': 'エスクード',
  '㌈': 'エーカー',
  '㌉': 'オンス',
  '㌊': 'オーム',
  '㌋': 'カイリ', //海里
  '㌌': 'カラット',
  '㌍': 'カロリー',
  '㌎': 'ガロン',
  '㌏': 'ガンマ',
  '㌐': 'ギガ',
  '㌑': 'ギニー',
  '㌒': 'キュリー',
  '㌓': 'ギルダー',
  '㌔': 'キロ',
  '㌕': 'キログラム',
  '㌖': 'キロメートル',
  '㌗': 'キロワット',
  '㌘': 'グラム',
  '㌙': 'グラムトン',
  '㌚': 'クルゼイロ',
  '㌛': 'クローネ',
  '㌜': 'ケース',
  '㌝': 'コルナ',
  '㌞': 'コーポ',
  '㌟': 'サイクル',
  '㌠': 'サンチーム',
  '㌡': 'シリング',
  '㌢': 'センチ',
  '㌣': 'セント',
  '㌤': 'ダース',
  '㌥': 'デシ',
  '㌦': 'ドル',
  '㌧': 'トン',
  '㌨': 'ナノ',
  '㌩': 'ノット',
  '㌪': 'ハイツ',
  '㌫': 'パーセント',
  '㌬': 'パーツ',
  '㌭': 'バーレル',
  '㌮': 'ピアストル',
  '㌯': 'ピクル',
  '㌰': 'ピコ',
  '㌱': 'ビル',
  '㌲': 'ファラッド',
  '㌳': 'フィート',
  '㌴': 'ブッシェル',
  '㌵': 'フラン',
  '㌶': 'ヘクタール',
  '㌷': 'ペソ',
  '㌸': 'ペニヒ',
  '㌹': 'ヘルツ',
  '㌺': 'ペンス',
  '㌻': 'ページ',
  '㌼': 'ベータ',
  '㌽': 'ポイント',
  '㌾': 'ボルト',
  '㌿': 'ホン',
  '㍀': 'ポンド',
  '㍁': 'ホール',
  '㍂': 'ホーン',
  '㍃': 'マイクロ',
  '㍄': 'マイル',
  '㍅': 'マッハ',
  '㍆': 'マルク',
  '㍇': 'マンション',
  '㍈': 'ミクロン',
  '㍉': 'ミリ',
  '㍊': 'ミリバール',
  '㍋': 'メガ',
  '㍌': 'メガトン',
  '㍍': 'メートル',
  '㍎': 'ヤード',
  '㍏': 'ヤール',
  '㍐': 'ユアン',
  '㍑': 'リットル',
  '㍒': 'リラ',
  '㍓': 'ルピー',
  '㍔': 'ルーブル',
  '㍕': 'レム',
  '㍖': 'レントゲン',
  '㍗': 'ワット'
};

// punctuation is pure_punctuation
conversionTables.fullwidthToHalfwidth.punctuation = merge(
    conversionTables.fullwidthToHalfwidth.symbol,
    conversionTables.fullwidthToHalfwidth.purePunctuation
)

// Fill in the conversion tables with the flipped tables.
conversionTables.halfwidthToFullwidth.alphabet = flip(conversionTables.fullwidthToHalfwidth.alphabet);
conversionTables.halfwidthToFullwidth.numbers = flip(conversionTables.fullwidthToHalfwidth.numbers);
conversionTables.halfwidthToFullwidth.symbol = flip(conversionTables.fullwidthToHalfwidth.symbol);
conversionTables.halfwidthToFullwidth.purePunctuation = flip(conversionTables.fullwidthToHalfwidth.purePunctuation);
conversionTables.halfwidthToFullwidth.punctuation = flip(conversionTables.fullwidthToHalfwidth.punctuation);
conversionTables.halfwidthToFullwidth.katakana = flip(conversionTables.fullwidthToHalfwidth.katakana);

// Build the normalization table.
conversionTables.normalize = merge(
    conversionTables.fullwidthToHalfwidth.alphabet,
    conversionTables.fullwidthToHalfwidth.numbers,
    conversionTables.fullwidthToHalfwidth.symbol,
    conversionTables.halfwidthToFullwidth.purePunctuation,
    conversionTables.halfwidthToFullwidth.katakana
    );

var converters = {
  fullwidthToHalfwidth: {
    alphabet: replacer(conversionTables.fullwidthToHalfwidth.alphabet),
    numbers: replacer(conversionTables.fullwidthToHalfwidth.numbers),
    symbol: replacer(conversionTables.fullwidthToHalfwidth.symbol),
    purePunctuation: replacer(conversionTables.fullwidthToHalfwidth.purePunctuation),
    punctuation: replacer(conversionTables.fullwidthToHalfwidth.punctuation),
    katakana: replacer(conversionTables.fullwidthToHalfwidth.katakana)
  },

  halfwidthToFullwidth: {
    alphabet: replacer(conversionTables.halfwidthToFullwidth.alphabet),
    numbers: replacer(conversionTables.halfwidthToFullwidth.numbers),
    symbol: replacer(conversionTables.halfwidthToFullwidth.symbol),
    purePunctuation: replacer(conversionTables.halfwidthToFullwidth.purePunctuation),
    punctuation: replacer(conversionTables.halfwidthToFullwidth.punctuation),
    katakana: replacer(conversionTables.halfwidthToFullwidth.katakana)
  },

  fixFullwidthKana: replacer(fixFullwidthKana),
  normalize: replacer(conversionTables.normalize)
};

var fixCompositeSymbols = replacer(fixCompositeSymbolsTable);


/**
 * Convert hiragana to fullwidth katakana.
 * According to http://jsperf.com/converting-japanese, these implementations are
 * faster than using lookup tables.
 *
 * @param {string} str A string.
 * @return {string} A string not containing hiragana.
 */
converters.hiraganaToKatakana = function(str) {
  str = converters.halfwidthToFullwidth.katakana(str);
  str = converters.fixFullwidthKana(str);

  str = str.replace(/ゝ/g, 'ヽ');
  str = str.replace(/ゞ/g, 'ヾ');
  //str = str.replace(/?/g, '𛀀'); // Letter archaic E

  str = str.replace(/[ぁ-ゖ]/g, function(str) {
    return String.fromCharCode(str.charCodeAt(0) + 96);
  });

  return str;
};


/**
 * Convert katakana to hiragana.
 *
 * @param {string} str A string.
 * @return {string} A string not containing katakana.
 */
converters.katakanaToHiragana = function(str) {
  str = converters.halfwidthToFullwidth.katakana(str);
  str = converters.fixFullwidthKana(str);

  str = str.replace(/ヽ/g, 'ゝ');
  str = str.replace(/ヾ/g, 'ゞ');
  //str = str.replace(/?/g, '𛀁'); // Letter archaic E

  str = str.replace(/[ァ-ヶ]/g, function(str) {
    return String.fromCharCode(str.charCodeAt(0) - 96);
  });

  return str;
};


/**
 * Fix kana and apply the following processes;
 * * Replace repeat characters
 * * Alphabet to halfwidth
 * * Numbers to halfwidth
 * * Punctuation to fullwidth
 * * Katakana to fullwidth
 * * Fix fullwidth kana
 * * Replace composite symbols
 *
 * @param {string} str
 * @return {string}
 */
var normalize_ja = function(str) {
  // Replace repeat characters.
  str = str
    .replace(/(..)々々/g, '$1$1')
    .replace(/(.)々/g, '$1$1');

  str = converters.normalize(str);
  str = converters.fixFullwidthKana(str);

  // Replace composite symbols.
  str = fixCompositeSymbols(str);

  return str;
};

exports.normalize_ja = normalize_ja;
exports.converters = converters;

},{"../util/utils":145,"../util/utils.js":145}],65:[function(require,module,exports){
/*
 Copyright (c) 2014, Kristoffer Brabrand

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * Remove commonly used diacritic marks from a string as these
 * are not used in a consistent manner. Leave only ä, ö, ü.
 */
var remove_diacritics = function(text) {
    text = text.replace('à', 'a');
    text = text.replace('À', 'A');
    text = text.replace('á', 'a');
    text = text.replace('Á', 'A');
    text = text.replace('â', 'a');
    text = text.replace('Â', 'A');
    text = text.replace('ç', 'c');
    text = text.replace('Ç', 'C');
    text = text.replace('è', 'e');
    text = text.replace('È', 'E');
    text = text.replace('é', 'e');
    text = text.replace('É', 'E');
    text = text.replace('ê', 'e');
    text = text.replace('Ê', 'E');
    text = text.replace('î', 'i');
    text = text.replace('Î', 'I');
    text = text.replace('ñ', 'n');
    text = text.replace('Ñ', 'N');
    text = text.replace('ó', 'o');
    text = text.replace('Ó', 'O');
    text = text.replace('ô', 'o');
    text = text.replace('Ô', 'O');
    text = text.replace('û', 'u');
    text = text.replace('Û', 'U');
    text = text.replace('š', 's');
    text = text.replace('Š', 'S');

    return text;
};

// export the relevant stuff.
exports.remove_diacritics = remove_diacritics;
},{}],66:[function(require,module,exports){
/*
 Copyright (c) 2017, Dogan Yazar

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * Remove commonly used diacritic marks from a string as these
 * are not used in a consistent manner. Leave only ä, ö, å.
 */
var remove_diacritics = function(text) {
    text = text.replace('à', 'a');
    text = text.replace('À', 'A');
    text = text.replace('á', 'a');
    text = text.replace('Á', 'A');
    text = text.replace('è', 'e');
    text = text.replace('È', 'E');
    text = text.replace('é', 'e');
    text = text.replace('É', 'E');

    return text;
};

// export the relevant stuff.
exports.remove_diacritics = remove_diacritics;

},{}],67:[function(require,module,exports){
/*
 Copyright (c) 2012, Alexy Maslennikov

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * Script to remove diacritics. Original source was taken from
 * http://lehelk.com/2011/05/06/script-to-remove-diacritics/
 */
var diacriticsRemovalMap = [
    {'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
    {'base':'AA','letters':/[\uA732]/g},
    {'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
    {'base':'AO','letters':/[\uA734]/g},
    {'base':'AU','letters':/[\uA736]/g},
    {'base':'AV','letters':/[\uA738\uA73A]/g},
    {'base':'AY','letters':/[\uA73C]/g},
    {'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
    {'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
    {'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
    {'base':'DZ','letters':/[\u01F1\u01C4]/g},
    {'base':'Dz','letters':/[\u01F2\u01C5]/g},
    {'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
    {'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
    {'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
    {'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
    {'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
    {'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
    {'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
    {'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
    {'base':'LJ','letters':/[\u01C7]/g},
    {'base':'Lj','letters':/[\u01C8]/g},
    {'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
    {'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
    {'base':'NJ','letters':/[\u01CA]/g},
    {'base':'Nj','letters':/[\u01CB]/g},
    {'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
    {'base':'OE','letters':/[\u0152]/g},
    {'base':'OI','letters':/[\u01A2]/g},
    {'base':'OO','letters':/[\uA74E]/g},
    {'base':'OU','letters':/[\u0222]/g},
    {'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
    {'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
    {'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
    {'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
    {'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
    {'base':'TZ','letters':/[\uA728]/g},
    {'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
    {'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
    {'base':'VY','letters':/[\uA760]/g},
    {'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
    {'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
    {'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
    {'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
    {'base':'a', 'letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
    {'base':'aa','letters':/[\uA733]/g},
    {'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
    {'base':'ao','letters':/[\uA735]/g},
    {'base':'au','letters':/[\uA737]/g},
    {'base':'av','letters':/[\uA739\uA73B]/g},
    {'base':'ay','letters':/[\uA73D]/g},
    {'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
    {'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
    {'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
    {'base':'dz','letters':/[\u01F3\u01C6]/g},
    {'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
    {'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
    {'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
    {'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
    {'base':'hv','letters':/[\u0195]/g},
    {'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
    {'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
    {'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
    {'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
    {'base':'lj','letters':/[\u01C9]/g},
    {'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
    {'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
    {'base':'nj','letters':/[\u01CC]/g},
    {'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
    {'base':'oe','letters':/[\u0153]/g},
    {'base':'oi','letters':/[\u01A3]/g},
    {'base':'ou','letters':/[\u0223]/g},
    {'base':'oo','letters':/[\uA74F]/g},
    {'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
    {'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
    {'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
    {'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
    {'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
    {'base':'tz','letters':/[\uA729]/g},
    {'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
    {'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
    {'base':'vy','letters':/[\uA761]/g},
    {'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
    {'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
    {'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
    {'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
];


module.exports = function(str) {
	var rules = diacriticsRemovalMap;
	for (var i = 0; i < rules.length; i++) {
		str = str.replace(rules[i].letters, rules[i].base);
	}
	return str;
};

},{}],68:[function(require,module,exports){
/*
Copyright (c) 2012, Alexy Maslenninkov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
 * Daitch-Mokotoff Soundex Coding
 *
 * The Daitch-Mokotoff Soundex System was created by Randy Daitch and Gary
 * Mokotoff of the Jewish Genealogical Society because they concluded the system
 * developed by Robert Russell in 1918, and in use today by the U.S. National
 * Archives and Records Administration (NARA) does not apply well to many Slavic
 * and Yiddish surnames.  It also includes refinements that are independent of
 * ethnic considerations.
 *
 * The rules for converting surnames into D-M Code numbers are listed below.
 * They are followed by the coding chart.
 *
 * 1. Names are coded to six digits, each digit representing a sound listed in
 * the coding chart (below).
 *
 * 2. When a name lacks enough coded sounds for six digits, use zeros to fill to
 * six digits. GOLDEN which has only four coded sounds [G-L-D-N] is coded as
 * 583600.
 *
 * 3. The letters A, E, I, O, U, J, and Y are always coded at the beginning of a
 * name as in Alpert 087930. In any other situation, they are ignored except
 * when two of them form a pair and the pair comes before a vowel, as in Breuer
 * 791900 but not Freud.
 *
 * 4. The letter H is coded at the beginning of a name, as in Haber 579000, or
 * preceding a vowel, as in Manheim 665600, otherwise it is not coded.
 *
 * 5. When adjacent sounds can combine to form a larger sound, they are given
 * the code number of the larger sound.  Mintz which is not coded MIN-T-Z but
 * MIN-TZ 664000.
 *
 * 6. When adjacent letters have the same code number, they are coded as one
 * sound, as in TOPF, which is not coded TO-P-F 377000 but TO-PF 370000.
 * Exceptions to this rule are the letter combinations MN and NM, whose letters
 * are coded separately, as in Kleinman, which is coded 586660 not 586600.
 *
 * 7. When a surname consists or more than one word, it is coded as if one word,
 * such as Ben Aron which is treated as Benaron.
 *
 * 8. Several letter and letter combinations pose the problem that they may
 * sound in one of two ways.  The letter and letter combinations CH, CK, C, J,
 * and RS are assigned two possible code numbers.
 *
 * For more info, see http://www.jewishgen.org/InfoFiles/soundex.html
 */

/**
 * D-M transformation table in the form of finite-state machine.
 * Every element of the table having member with zero index represents
 * legal FSM state; every non-zero key is the transition rule.
 *
 * Every legal state comprises tree values chosen according to the position
 * of the letter combination in the word:
 *   0: start of a word;
 *   1: before a vowel;
 *   2: any other situation.
 */
var codes = {
    A: {
        0: [0, -1, -1],
        I: [[0, 1, -1]],
        J: [[0, 1, -1]],
        Y: [[0, 1, -1]],
        U: [[0, 7, -1]]},
    B: [[7, 7, 7]],
    C: {
        0: [5, 5, 5],
        Z: {0: [4, 4, 4], S: [[4, 4, 4]]},
        S: {0: [4, 4, 4], Z: [[4, 4, 4]]},
        K: [[5, 5, 5], [45, 45, 45]],
        H: {0: [5, 5, 5], S: [[5, 54, 54]]}},
    D: {
        0: [3, 3, 3],
        T: [[3, 3, 3]],
        Z: {0: [4, 4, 4], H: [[4, 4, 4]], S: [[4, 4, 4]]},
        S: {0: [4, 4, 4], H: [[4, 4, 4]], Z: [[4, 4, 4]]},
        R: {S: [[4, 4, 4]], Z: [[4, 4, 4]]}},
    E: {
        0: [0, -1, -1],
        I: [[0, 1, -1]],
        J: [[0, 1, -1]],
        Y: [[0, 1, -1]],
        U: [[1, 1, -1]],
        W: [[1, 1, -1]]},
    F: {
        0: [7, 7, 7],
        B: [[7, 7, 7]]},
    G: [[5, 5, 5]],
    H: [[5, 5, -1]],
    I: {
        0: [0, -1, -1],
        A: [[1, -1, -1]],
        E: [[1, -1, -1]],
        O: [[1, -1, -1]],
        U: [[1, -1, -1]]},
    J: [[4, 4, 4]],
    K: {
        0: [5, 5, 5],
        H: [[5, 5, 5]],
        S: [[5, 54, 54]]},
    L: [[8, 8, 8]],
    M: {
        0: [6, 6, 6],
        N: [[66, 66, 66]]},
    N: {
        0: [6, 6, 6],
        M: [[66, 66, 66]]},
    O: {
        0: [0, -1, -1],
        I: [[0, 1, -1]],
        J: [[0, 1, -1]],
        Y: [[0, 1, -1]]},
    P: {
        0: [7, 7, 7],
        F: [[7, 7, 7]],
        H: [[7, 7, 7]]},
    Q: [[5, 5, 5]],
    R: {
        0: [9, 9, 9],
        Z: [[94, 94, 94], [94, 94, 94]],
        S: [[94, 94, 94], [94, 94, 94]]},
    S: {
        0: [4, 4, 4],
        Z: {0: [4, 4, 4], T: [[2, 43, 43]], C: {Z: [[2, 4, 4]], S: [[2, 4, 4]]}, D: [[2, 43, 43]]},
        D: [[2, 43, 43]],
        T: {0: [2, 43, 43], R: {Z: [[2, 4, 4]], S: [[2, 4, 4]]}, C: {H: [[2, 4, 4]]}, S: {H: [[2, 4, 4]], C: {H: [[2, 4, 4]]}}},
        C: {0: [2, 4, 4], H: {0: [4, 4, 4], T: {0: [2, 43, 43], S: {C: {H: [[2, 4, 4]]}, H: [[2, 4, 4]]}, C: {H: [[2, 4, 4]]}}, D: [[2, 43, 43]]}},
        H: {0: [4, 4, 4], T: {0: [2, 43, 43], C: {H: [[2, 4, 4]]}, S: {H: [[2, 4, 4]]}}, C: {H: [[2, 4, 4]]}, D: [[2, 43, 43]]}},
    T: {
        0: [3, 3, 3],
        C: {0: [4, 4, 4], H: [[4, 4, 4]]},
        Z: {0: [4, 4, 4], S: [[4, 4, 4]]},
        S: {0: [4, 4, 4], Z: [[4, 4, 4]], H: [[4, 4, 4]], C: {H: [[4, 4, 4]]}},
        T: {S: {0: [4, 4, 4], Z: [[4, 4, 4]], C: {H: [[4, 4, 4]]}}, C: {H: [[4, 4, 4]]}, Z: [[4, 4, 4]]},
        H: [[3, 3, 3]],
        R: {Z: [[4, 4, 4]], S: [[4, 4, 4]]}},
    U: {
        0: [0, -1, -1],
        E: [[0, -1, -1]],
        I: [[0, 1, -1]],
        J: [[0, 1, -1]],
        Y: [[0, 1, -1]]},
    V: [[7, 7, 7]],
    W: [[7, 7, 7]],
    X: [[5, 54, 54]],
    Y: [[1, -1, -1]],
    Z: {
        0: [4, 4, 4],
        D: {0: [2, 43, 43], Z: {0: [2, 4, 4], H: [[2, 4, 4]]}},
        H: {0: [4, 4, 4], D: {0: [2, 43, 43], Z: {H: [[2, 4, 4]]}}},
        S: {0: [4, 4, 4], H: [[4, 4, 4]], C: {H: [[4, 4, 4]]}}}
};


function process(word, codeLength) {
	codeLength = codeLength || 6;
    word = word.toUpperCase();
    var output = '';

    var pos = 0, lastCode = -1;
    while (pos < word.length) {
        var substr = word.slice(pos);
        var rules = findRules(substr);

        var code;
        if (pos == 0) {
            // at the beginning of the word
            code = rules.mapping[0];
        } else if (substr[rules.length] && findRules(substr[rules.length]).mapping[0] == 0) {
            // before a vowel
            code = rules.mapping[1];
        } else {
            // any other situation
            code = rules.mapping[2];
        }

        if ((code != -1) && (code != lastCode)) output += code;
        lastCode = code;
        pos += rules.length;

    }

    return normalizeLength(output, codeLength);
}


function findRules(str) {
    var state = codes[str[0]];
    var legalState = state || [[-1,-1,-1]],
        charsInvolved = 1;

    for (var offs = 1; offs < str.length; offs++) {
        if (!state || !state[str[offs]]) break;

        state = state[str[offs]];
        if (state[0]) {
            legalState = state;
            charsInvolved = offs + 1;
        }
    }

    return {
        length: charsInvolved,
        mapping: legalState[0]
    };
}


/**
 * Pad right with zeroes or cut excess symbols to fit length
 */
function normalizeLength(token, length) {
	length = length || 6;
	if (token.length < length) {
		token += (new Array(length - token.length + 1)).join('0');
	}
    return token.slice(0, length);
}

var Phonetic = require('./phonetic');
var soundex = new Phonetic();
soundex.process = process;
module.exports = soundex;


},{"./phonetic":71}],69:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Phonetic = require('./phonetic');

var DoubleMetaphone = new Phonetic();
module.exports = DoubleMetaphone;

function isVowel(c) {
	return c && c.match(/[aeiouy]/i);
}

function truncate(string, length) {
    if(string.length >= length)
        string = string.substring(0, length);

    return string;
}

function process(token, maxLength) {
	token = token.toUpperCase();
	var primary = '', secondary = '';
    var pos = 0;
    maxLength == maxLength || 32;

    function subMatch(startOffset, stopOffset, terms) {
        return subMatchAbsolute(pos + startOffset, pos + stopOffset, terms);
    }

    function subMatchAbsolute(startOffset, stopOffset, terms) {
        return terms.indexOf(token.substring(startOffset, stopOffset)) > -1;
    }

    function addSecondary(primaryAppendage, secondaryAppendage) {
    	primary += primaryAppendage;
    	secondary += secondaryAppendage;
    }

    function add(primaryAppendage) {
    	addSecondary(primaryAppendage, primaryAppendage);
    }

    function addCompressedDouble(c, encoded) {
    	if(token[pos + 1] == c)
    		pos++;
    	add(encoded || c);
    }

    function handleC() {

        if(pos >= 1 && !isVowel(token[pos - 2])
                && token[pos - 1] == 'A' && token[pos + 1] == 'H'
                    && token[pos + 2] != 'I'
                        || subMatch(-2, 4, ['BACHER', 'MACHER'])) {
            add('K');
            pos++;
        } else if(pos == 0 && token.substring(1, 6) == 'EASAR') {
            add('S');
            add('S');
            add('R');
            pos += 6;
        } else if(token.substring(pos + 1, pos + 4) == 'HIA') {
            add('K');
            pos++;
        } else if(token[pos + 1] == 'H') {
            if(pos > 0 && token.substring(pos + 2, pos + 4) == 'AE') {
                addSecondary('K', 'X');
                pos++;
            } else if(pos == 0
                        && (subMatch(1, 6, ['HARAC', 'HARIS'])
                            || subMatch(1, 4, ['HOR', 'HUM', 'HIA', 'HEM']))
                        && token.substring(pos + 1, pos + 5) != 'HORE') {
                add('K');
                pos++;
            } else {
                if((subMatchAbsolute(0, 3, ['VAN', 'VON']) || token.substring(0,  3) == 'SCH')
                    || subMatch(-2, 4, ['ORCHES', 'ARCHIT', 'ORCHID'])
                    || subMatch(2, 3, ['T', 'S'])
                    || ((subMatch(-1, 0, ['A', 'O', 'U', 'E']) || pos == 0)
                        && subMatch(2, 3, ['B', 'F', 'H', 'L', 'M', 'N', 'R', 'V', 'W']))) {
                    add('K');
                } else if(pos > 0) {

                    if(token.substring(0, 2) == 'MC') {
                        add('K');
                    } else {
                        addSecondary('X', 'K');
                    }
                } else {
                    add('X');
                }

                pos++;
            }
        } else if(token.substring(pos, pos + 2) == 'CZ'
                && token.substring(pos - 2, pos + 1) != 'WICZ') {
            addSecondary('S', 'X');
            pos++;
        } else if(token.substring(pos, pos + 3) == 'CIA') {
            add('X');
            pos += 2;
        } else if(token[pos + 1] == 'C' && pos != 1 && token[0] != 'M') {
            if(['I', 'E', 'H'].indexOf(token[pos + 2]) > -1
                    && token.substring(pos + 2, pos + 4) != 'HU') {
                if(pos == 1 && token[pos - 1] == 'A'
                        || subMatch(-1, 4, ['UCCEE', 'UCCES'])) {
                    add('KS');
                } else {
                   add('X');
                }

               pos +=2;
            } else {
                add('K');
                pos++;
            }
        } else if(['K', 'G', 'Q'].indexOf(token[pos + 1]) > -1) {
            add('K');
            pos++;
        } else if(['E', 'I', 'Y'].indexOf(token[pos + 1]) > -1) {
            if(subMatch(1, 3, ['IA', 'IE', 'IO'])) {
                addSecondary('S', 'X');
            } else {
                add('S');
            }
            pos++;
        } else {
            add('K');
            if(token[pos + 1] == ' ' && ['C', 'Q', 'G'].indexOf(token[pos + 2])) {
                pos += 2;
            } else if(['C', 'K', 'Q'].indexOf(token[pos + 1]) > -1
                    && !subMatch(1, 3, ['CE', 'CI'])) {
                pos++;
            }
        }
    }

    function handleD() {
    	if(token[pos + 1] == 'G') {
    		if(['I', 'E', 'Y'].indexOf(token[pos + 2]) > -1)  {
    			add('J');
    			pos += 2;
    		} else {
    			add('TK');
    			pos++;
    		}
	    } else if(token[pos + 1] == 'T') {
    		add('T');
	    	pos++;
    	} else
    		addCompressedDouble('D', 'T');
    }

    function handleG() {
        if(token[pos + 1] == 'H') {
            if(pos > 0 && !isVowel(token[pos - 1])) {
                add('K');
                pos++;
            } else if(pos == 0) {
                if(token[pos + 2] == 'I') {
                    add('J');
                } else {
                    add('K');
                }
                pos++;
            } else if(pos > 1
                && (['B', 'H', 'D'].indexOf(token[pos - 2]) > -1
                    || ['B', 'H', 'D'].indexOf(token[pos - 3]) > -1
                    || ['B', 'H'].indexOf(token[pos - 4]) > -1)) {
                pos++;
            } else {
                if(pos > 2
                        && token[pos - 1] == 'U'
                        && ['C', 'G', 'L', 'R', 'T'].indexOf(token[pos - 3]) > -1) {
                    add('F');
                } else if(token[pos - 1] != 'I') {
                    add('K');
                }

                pos++;
            }
        } else if(token[pos + 1] == 'N') {
            if(pos == 1 && startsWithVowel && !slavoGermanic) {
                addSecondary('KN', 'N');
            } else {
                if(token.substring(pos + 2, pos + 4) != 'EY'
                        && (token[pos + 1] != 'Y'
                            && !slavoGermanic)) {
                    addSecondary('N', 'KN');
                } else
                    add('KN');
            }
            pos++;
        } else if(token.substring(pos + 1, pos + 3) == 'LI' && !slavoGermanic) {
            addSecondary('KL', 'L');
            pos++;
        } else if(pos == 0 && (token[pos + 1] == 'Y'
                || subMatch(1, 3, ['ES', 'EP', 'EB', 'EL', 'EY', 'IB', 'IL', 'IN', 'IE', 'EI', 'ER']))) {
            addSecondary('K', 'J')
        } else {
            addCompressedDouble('G', 'K');
        }
    }

    function handleH() {
		// keep if starts a word or is surrounded by vowels
		if((pos == 0 || isVowel(token[pos - 1])) && isVowel(token[pos + 1])) {
			add('H');
			pos++;
		}
    }

    function handleJ() {
        var jose = (token.substring(pos + 1, pos + 4) == 'OSE');

        if(san || jose) {
            if((pos == 0 && token[pos + 4] == ' ')
                    || san) {
                add('H');
            } else
                add('J', 'H');
        } else {
            if(pos == 0/* && !jose*/) {
                addSecondary('J', 'A');
            } else if(isVowel(token[pos - 1]) && !slavoGermanic
                    && (token[pos + 1] == 'A' || token[pos + 1] == 'O')) {
                addSecondary('J', 'H');
            } else if(pos == token.length - 1) {
                addSecondary('J', ' ');
            } else
                addCompressedDouble('J');
        }
    }

    function handleL() {
    	if(token[pos + 1] == 'L') {
    		if(pos == token.length - 3 && (
    					subMatch(-1, 3, ['ILLO', 'ILLA', 'ALLE']) || (
    						token.substring(pos - 1, pos + 3) == 'ALLE' &&
    						(subMatch(-2, -1, ['AS', 'OS']) > -1 ||
    						['A', 'O'].indexOf(token[token.length - 1]) > -1)))) {
    			addSecondary('L', '');
    			pos++;
    			return;
    		}
    		pos++;
    	}
    	add('L');
    }

    function handleM() {
    	addCompressedDouble('M');
    	if(token[pos - 1] == 'U' && token[pos + 1] == 'B' &&
    			((pos == token.length - 2  || token.substring(pos + 2, pos + 4) == 'ER')))
    		pos++;
    }

    function handleP() {
    	if(token[pos + 1] == 'H') {
    		add('F');
    		pos++;
    	} else {
    		addCompressedDouble('P');

			if(token[pos + 1] == 'B')
    			pos++;
    	}
    }

    function handleR() {
    	if(pos == token.length - 1 && !slavoGermanic
    			&& token.substring(pos - 2, pos) == 'IE'
    			&& !subMatch(-4, -3, ['ME', 'MA'])) {
    		addSecondary('', 'R');
    	} else
	    	addCompressedDouble('R');
    }

    function handleS() {
        if(pos == 0 && token.substring(0, 5) == 'SUGAR') {
            addSecondary('X', 'S');
        } else if(token[pos + 1] == 'H') {
            if(subMatch(2, 5, ['EIM', 'OEK', 'OLM', 'OLZ'])) {
                add('S');
            } else {
                add('X');
            }
            pos++;
        } else if(subMatch(1, 3, ['IO', 'IA'])) {
            if(slavoGermanic) {
                add('S');
            } else {
                addSecondary('S', 'X');
            }
            pos++;
        } else if((pos == 0 && ['M', 'N', 'L', 'W'].indexOf(token[pos + 1]) > -1)
                || token[pos + 1] == 'Z') {
            addSecondary('S', 'X');
            if(token[pos + 1] == 'Z')
                pos++;
        } else if(token.substring(pos, pos + 2) == 'SC') {
            if(token[pos + 2] == 'H') {
                if(subMatch(3, 5, ['ER', 'EN'])) {
                    addSecondary('X', 'SK');
                } else if(subMatch(3, 5, ['OO', 'UY', 'ED', 'EM'])) {
                    add('SK');
                } else if(pos == 0 && !isVowel(token[3]) && token[3] != 'W') {
                    addSecondary('X', 'S');
                } else {
                    add('X');
                }
            } else if(['I', 'E', 'Y'].indexOf(token[pos + 2]) > -1) {
                add('S');
            } else {
                add('SK');
            }

            pos += 2;
        } else if(pos == token.length - 1
                && subMatch(-2, 0, ['AI', 'OI'])) {
            addSecondary('', 'S');
        } else if(token[pos + 1] != 'L' && (
                token[pos - 1] != 'A' && token[pos - 1] != 'I')) {
            addCompressedDouble('S');
            if(token[pos + 1] == 'Z')
                pos++;
        }
    }

    function handleT() {
        if(token.substring(pos + 1, pos + 4) == 'ION') {
            add('XN');
            pos += 3;
        } else if(subMatch(1, 3, ['IA', 'CH'])) {
            add('X');
            pos += 2;
        } else if(token[pos + 1] == 'H'
                || token.substring(1, 2) == 'TH') {
            if(subMatch(2, 4, ['OM', 'AM'])
                    || ['VAN ', 'VON '].indexOf(token.substring(0, 4)) > -1
                    || token.substring(0, 3) == 'SCH') {
                add('T');
            } else
                addSecondary('0', 'T');
            pos++;
        } else {
            addCompressedDouble('T');

            if(token[pos + 1] == 'D')
                pos++;
        }
    }

    function handleX() {
    	if(pos == 0) {
    		add('S');
    	} else if(!(pos == token.length - 1
	    		&& (['IAU', 'EAU', 'IEU'].indexOf(token.substring(pos - 3, pos)) > -1
	    			|| ['AU', 'OU'].indexOf(token.substring(pos - 2, pos)) > -1))) {
    		add('KS');
    	}
    }

    function handleW() {
        if(pos == 0) {
            if(token[1] == 'H') {
                add('A');
            } else if (isVowel(token[1])) {
                addSecondary('A', 'F');
            }
        } else if((pos == token.length - 1 && isVowel(token[pos - 1])
                    || subMatch(-1, 4, ['EWSKI', 'EWSKY', 'OWSKI', 'OWSKY'])
                    || token.substring(0, 3) == 'SCH')) {
                addSecondary('', 'F');
                pos++;
        } else if(['ICZ', 'ITZ'].indexOf(token.substring(pos + 1, pos + 4)) > -1) {
            addSecondary('TS', 'FX');
            pos += 3;
        }
    }

    function handleZ() {
        if(token[pos + 1] == 'H') {
            add('J');
            pos++;
        } else if(subMatch(1, 3, ['ZO', 'ZI', 'ZA'])
                || (slavoGermanic && pos > 0 && token[pos - 1] != 'T')) {
            addSecondary('S', 'TS');
            pos++;
        } else
            addCompressedDouble('Z', 'S');
    }

    var san = (token.substring(0, 3) == 'SAN');
    var startsWithVowel = isVowel(token[0]);
    var slavoGermanic = token.match(/(W|K|CZ|WITZ)/);

    if(subMatch(0, 2, ['GN', 'KN', 'PN', 'WR', 'PS'])) {
    	pos++;
    }

    while(pos < token.length) {

    	switch(token[pos]) {
	        case 'A': case 'E': case 'I': case 'O': case 'U': case 'Y':
	        case 'Ê': case 'É': case 'É': case'À':
		        if(pos == 0)
		        	add('A');
		        break;
		    case 'B':
		    	addCompressedDouble('B', 'P');
		    	break;
            case 'C':
                handleC();
                break;
	        case 'Ç':
	            add("S");
	            break;
	        case 'D':
	        	handleD();
	        	break;
	        case 'F': case 'K': case 'N':
	        	addCompressedDouble(token[pos]);
	        	break;
            case 'G':
                handleG();
                break;
	        case 'H':
	        	handleH();
	        	break;
            case 'J':
                handleJ();
                break;
	        case 'L':
	        	handleL();
	        	break;
	        case 'M':
	        	handleM();
	        	break;
	        case 'Ñ':
	        	add('N');
	        	break;
	        case 'P':
	        	handleP();
	        	break;
	        case 'Q':
	        	addCompressedDouble('Q', 'K');
	        	break;
	        case 'R':
	        	handleR();
	        	break;
            case 'S':
                handleS();
                break;
            case 'T':
                handleT();
                break;
	        case 'V':
	        	addCompressedDouble('V', 'F');
	        	break;
            case 'W':
                handleW();
                break;
	        case 'X':
	        	handleX();
	        	break;
	        case 'Z':
	        	handleZ();
	        	break;
    	}

        if(primary.length >= maxLength && secondary.length >= maxLength) {
            break;
        }

    	pos++;
    }

    return [truncate(primary, maxLength), truncate(secondary, maxLength)];
}

function compare(stringA, stringB) {
    var encodingsA = process(stringA),
        encodingsB = process(stringB);

    return encodingsA[0] == encodingsB[0] ||
        encodingsA[1] == encodingsB[1];
};

DoubleMetaphone.compare = compare
DoubleMetaphone.process = process;
DoubleMetaphone.isVowel = isVowel;

},{"./phonetic":71}],70:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Phonetic = require('./phonetic');

function dedup(token) {
    return token.replace(/([^c])\1/g, '$1');
}

function dropInitialLetters(token) {
    if(token.match(/^(kn|gn|pn|ae|wr)/))
        return token.substr(1, token.length - 1);
        
    return token;
}

function dropBafterMAtEnd(token) {
    return token.replace(/mb$/, 'm');
}

function cTransform(token) {
    

    token = token.replace(/([^s]|^)(c)(h)/g, '$1x$3').trim();


    token = token.replace(/cia/g, 'xia');
    token = token.replace(/c(i|e|y)/g, 's$1');
    token = token.replace(/c/g, 'k'); 
    
    return token;
}

function dTransform(token) {
    token = token.replace(/d(ge|gy|gi)/g, 'j$1');
    token = token.replace(/d/g, 't');
    
    return token;
}

function dropG(token) {
    token = token.replace(/gh(^$|[^aeiou])/g, 'h$1');
    token = token.replace(/g(n|ned)$/g, '$1');    
    
    return token;
}

function transformG(token) {
    token = token.replace(/gh/g, 'f'); 
    token = token.replace(/([^g]|^)(g)(i|e|y)/g, '$1j$3');
    token = token.replace(/gg/g, 'g');
    token = token.replace(/g/g, 'k');    
    
    return token;
}

function dropH(token) {
    return token.replace(/([aeiou])h([^aeiou]|$)/g, '$1$2');
}

function transformCK(token) {
    return token.replace(/ck/g, 'k');
}
function transformPH(token) {
    return token.replace(/ph/g, 'f');
}

function transformQ(token) {
    return token.replace(/q/g, 'k');
}

function transformS(token) {
    return token.replace(/s(h|io|ia)/g, 'x$1');
}

function transformT(token) {
    token = token.replace(/t(ia|io)/g, 'x$1');
    token = token.replace(/th/, '0');
    
    return token;
}

function dropT(token) {
    return token.replace(/tch/g, 'ch');
}

function transformV(token) {
    return token.replace(/v/g, 'f');
}

function transformWH(token) {
    return token.replace(/^wh/, 'w');
}

function dropW(token) {
    return token.replace(/w([^aeiou]|$)/g, '$1');
}

function transformX(token) {
    token = token.replace(/^x/, 's');
    token = token.replace(/x/g, 'ks');
    return token;
}

function dropY(token) {
    return token.replace(/y([^aeiou]|$)/g, '$1');
}

function transformZ(token) {
    return token.replace(/z/, 's');
}

function dropVowels(token) {
    return token.charAt(0) + token.substr(1, token.length).replace(/[aeiou]/g, '');
}

var Metaphone = new Phonetic();
module.exports = Metaphone;

Metaphone.process = function(token, maxLength) {
    maxLength == maxLength || 32;
    token = token.toLowerCase();
    token = dedup(token);
    token = dropInitialLetters(token);
    token = dropBafterMAtEnd(token);
    token = transformCK(token);
    token = cTransform(token);
    token = dTransform(token);
    token = dropG(token);
    token = transformG(token);
    token = dropH(token);
    token = transformPH(token);
    token = transformQ(token);
    token = transformS(token);
    token = transformX(token);    
    token = transformT(token);
    token = dropT(token);
    token = transformV(token);
    token = transformWH(token);
    token = dropW(token);
    token = dropY(token);
    token = transformZ(token);
    token = dropVowels(token);
    
    token.toUpperCase();
    if(token.length >= maxLength)
        token = token.substring(0, maxLength);        

    return token.toUpperCase();
};

// expose functions for testing    
Metaphone.dedup = dedup;
Metaphone.dropInitialLetters = dropInitialLetters;
Metaphone.dropBafterMAtEnd = dropBafterMAtEnd;
Metaphone.cTransform = cTransform;
Metaphone.dTransform = dTransform;
Metaphone.dropG = dropG;
Metaphone.transformG = transformG;
Metaphone.dropH = dropH;
Metaphone.transformCK = transformCK;
Metaphone.transformPH = transformPH;
Metaphone.transformQ = transformQ;
Metaphone.transformS = transformS;
Metaphone.transformT = transformT;
Metaphone.dropT = dropT;
Metaphone.transformV = transformV;
Metaphone.transformWH = transformWH;
Metaphone.dropW = dropW;
Metaphone.transformX = transformX;
Metaphone.dropY = dropY;
Metaphone.transformZ = transformZ;
Metaphone.dropVowels = dropVowels;

},{"./phonetic":71}],71:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords');
var Tokenizer = require('../tokenizers/aggressive_tokenizer'),
    tokenizer = new Tokenizer();

module.exports = function() {
    this.compare = function(stringA, stringB) {
        return this.process(stringA) == this.process(stringB);
    };

    this.attach = function() {
	var phonetic = this;

        String.prototype.soundsLike = function(compareTo) {
            return phonetic.compare(this, compareTo);
        }
        
        String.prototype.phonetics = function() {
            return phonetic.process(this);
        }
	
        String.prototype.tokenizeAndPhoneticize = function(keepStops) {
            var phoneticizedTokens = [];
            
            tokenizer.tokenize(this).forEach(function(token) {
                if(keepStops || stopwords.words.indexOf(token) < 0)
                    phoneticizedTokens.push(token.phonetics());
            });
            
            return phoneticizedTokens;
        }
    };
};

},{"../tokenizers/aggressive_tokenizer":106,"../util/stopwords":132}],72:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Phonetic = require('./phonetic');

function transformLipps(token) {
    return token.replace(/[bfpv]/g, '1');
}

function transformThroats(token) {
    return token.replace(/[cgjkqsxz]/g, '2');
}

function transformToungue(token) {
    return token.replace(/[dt]/g, '3');
}

function transformL(token) {
    return token.replace(/l/g, '4');
}

function transformHum(token) {
    return token.replace(/[mn]/g, '5');
}

function transformR(token) {
    return token.replace(/r/g, '6');
}

function condense(token) {
    return token.replace(/(\d)?\1+/g, '$1');
}

function padRight0(token) {
    if(token.length < 4)
        return token + Array(4 - token.length).join('0');
    else
        return token;
}

function transform(token) {
    return transformLipps(transformThroats(
        transformToungue(transformL(transformHum(transformR(token))))));
}

var SoundEx = new Phonetic();
module.exports = SoundEx;

SoundEx.process = function(token, maxLength) {
    token = token.toLowerCase();    
    var transformed = condense(transform(token.substr(1, token.length - 1))); // anything that isn't a digit goes
    // deal with duplicate INITIAL consonant SOUNDS
    transformed = transformed.replace(new RegExp("^" + transform(token.charAt(0))), '');
    return token.charAt(0).toUpperCase() + padRight0(transformed.replace(/\D/g, '')).substr(0, (maxLength && maxLength - 1) || 3);
};

// export for tests;
SoundEx.transformLipps = transformLipps;
SoundEx.transformThroats = transformThroats;
SoundEx.transformToungue = transformToungue;
SoundEx.transformL = transformL;
SoundEx.transformHum = transformHum;
SoundEx.transformR = transformR;
SoundEx.condense = condense;
SoundEx.padRight0 = padRight0;

},{"./phonetic":71}],73:[function(require,module,exports){
/*
  Copyright (c) 2018, Domingo Martín Mancera, Hugo W.L. ter Doest (based on https://github.com/dmarman/lorca)

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/

var languageFiles = {
  "afinn" : {
    "English": ["afinn-165", "./English/negations_en.json"],
    "Spanish": ["./Spanish/afinnShortSortedSpanish", "./Spanish/negations_es.json"]
  },
  "senticon": {
    "Spanish": ["./Spanish/senticon_es.json", "./Spanish/negations_es.json"],
    "English": ["./English/senticon_en.json", "./English/negations_en.json"],
    "Galician": ["./Galician/senticon_gl.json", ""],
    "Catalan": ["./Catalan/senticon_ca.json", ""],
    "Basque": ["./Basque/senticon_eu.json", ""]
  },
  "pattern": {
    "Dutch": ["./Dutch/pattern-sentiment-nl.json", "./Dutch/negations_du.json"],
    "Italian": ["./Italian/pattern-sentiment-it.json", ""],
    "English": ["./English/pattern-sentiment-en.json", "./English/negations_en.json"],
    "French": ["./French/pattern-sentiment-fr", ""]
  }
};

class SentimentAnalyzer {

  constructor(language, stemmer, type) {
    this.language = language;
    this.stemmer = stemmer;

    this.vocabulary = require(languageFiles[type][language][0]);
    if (type === "senticon") {
      Object.keys(this.vocabulary).forEach(word => {
        this.vocabulary[word] = this.vocabulary[word].pol;
      });
    }
    else {
      if (type == "pattern") {
        Object.keys(this.vocabulary).forEach(word => {
          this.vocabulary[word] = this.vocabulary[word].polarity;
        });
        //console.log(JSON.stringify(this.vocabulary, null, 2));
      }
    }

    this.negations = [];
    if (languageFiles[type][language][1] != "") {
      this.negations = require(languageFiles[type][language][1]).words;
    }

    if (stemmer) {
      var vocaStemmed = {};
      for(var token in this.vocabulary) {
            vocaStemmed[stemmer.stem(token)] = this.vocabulary[token];
      }
      this.vocabulary = vocaStemmed;
    }
  }

  // words is an array of words (strings)
  getSentiment(words) {
    var score = 0;
    var negator = 1;
    var nrHits = 0;

    words.forEach((token) => {
      var lowerCased = token.toLowerCase();
      if (this.negations.indexOf(lowerCased) > -1) {
        negator = -1;
        nrHits++;
      }
      else {
        // First try without stemming
        if (this.vocabulary[lowerCased] != undefined) {
          score += negator * this.vocabulary[lowerCased];
          nrHits++;
        }
        else {
          if (this.stemmer) {
            var stemmedWord = this.stemmer.stem(lowerCased);
            if(this.vocabulary[stemmedWord] != undefined) {
              score += negator * this.vocabulary[stemmedWord];
              nrHits++;
            }
          }
        }
      }
    });

    score = score / words.length;
    //console.log("Number of hits: " + nrHits);

    return score;
  }

}

module.exports = SentimentAnalyzer;

},{}],74:[function(require,module,exports){

var Trie = require('../trie/trie');

// Probabilistic spellchecker based on http://norvig.com/spell-correct.html
// The general idea is simple. Given a word, the spellchecker calculates all strings that are some user-defined edit distance away. Of those many candidates, it filters the ones that are not words and then returns an array of possible corrections in order of decreasing probability, based on the edit distance and the candidate's frequency in the input corpus
// Words that are an edit distance of n away from the mispelled word are considered infinitely more probable than words that are of an edit distance >n

// wordlist is a corpus (an array) from which word probabilities are calculated (so something like /usr/share/dict/words (on OSX) will work okay, but real world text will work better)
function Spellcheck(wordlist) {
    this.trie = new Trie();
    this.trie.addStrings(wordlist);
    this.word2frequency = {};
    for(var i in wordlist) {
        if(!this.word2frequency[wordlist[i]]) {
            this.word2frequency[wordlist[i]] = 0;
        }
        this.word2frequency[wordlist[i]]++;
    }
}

Spellcheck.prototype.isCorrect = function(word) {
    return this.trie.contains(word);
}

// Returns a list of suggested corrections, from highest to lowest probability 
// maxDistance is the maximum edit distance 
// According to Norvig, literature suggests that 80% to 95% of spelling errors are an edit distance of 1 away from the correct word. This is good, because there are roughly 54n+25 strings 1 edit distance away from any given string of length n. So after maxDistance = 2, this becomes very slow.
Spellcheck.prototype.getCorrections = function(word, maxDistance) {
    var self = this;
    if(!maxDistance) maxDistance = 1;
    var edits = this.editsWithMaxDistance(word, maxDistance);
    edits = edits.slice(1,edits.length);
    edits = edits.map(function(editList) {
       return editList.filter(function(word) { return self.isCorrect(word); })
                      .map(function(word) { return [word, self.word2frequency[word]]; })
                      .sort(function(a,b) { return a[1] > b[1] ? -1 : 1; })
                      .map(function(wordscore) { return wordscore[0]; });
    });
    var flattened = [];
    for(var i in edits) {
        if(edits[i].length) flattened = flattened.concat(edits[i]);
    }
    return flattened.filter(function (v, i, a) { return a.indexOf(v) == i });
}

// Returns all edits that are 1 edit-distance away from the input word
Spellcheck.prototype.edits = function(word) {
    var alphabet = 'abcdefghijklmnopqrstuvwxyz';
    var edits = [];
    for(var i=0; i<word.length+1; i++) {
        if(i>0) edits.push(word.slice(0,i-1)+word.slice(i,word.length)); // deletes
        if(i>0 && i<word.length+1) edits.push(word.slice(0,i-1) + word.slice(i,i+1) + word.slice(i-1, i) + word.slice(i+1,word.length)); // transposes
        for(var k=0; k<alphabet.length; k++) {
            if(i>0) edits.push(word.slice(0,i-1)+alphabet[k]+word.slice(i,word.length)); // replaces
            edits.push(word.slice(0,i)+alphabet[k]+word.slice(i,word.length)); // inserts
        }
    }
    // Deduplicate edits
    edits = edits.filter(function (v, i, a) { return a.indexOf(v) == i });
    return edits;
}

// Returns all edits that are up to "distance" edit distance away from the input word
Spellcheck.prototype.editsWithMaxDistance = function(word, distance) { 
    return this.editsWithMaxDistanceHelper(distance, [[word]]);
}

Spellcheck.prototype.editsWithMaxDistanceHelper = function(distanceCounter, distance2edits) {
    if(distanceCounter == 0) return distance2edits;
    var currentDepth = distance2edits.length-1;
    var words = distance2edits[currentDepth];
    var edits = this.edits(words[0]);
    distance2edits[currentDepth+1] = [];
    for(var i in words) {
        distance2edits[currentDepth+1] = distance2edits[currentDepth+1].concat(this.edits(words[i]));
    }
    return this.editsWithMaxDistanceHelper(distanceCounter-1, distance2edits);
}

module.exports = Spellcheck;

},{"../trie/trie":127}],75:[function(require,module,exports){
/*
Copyright (c) 2017, Alif Bhaskoro, Andy Librian, R. Kukuh (Reimplemented from https://github.com/sastrawi/sastrawi)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../../util/stopwords_id');
var Tokenizer = require('../../tokenizers/aggressive_tokenizer_id');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.addStopWord = function(stopWord) {
        stopwords.words.push(stopWord);
    };

    stemmer.addStopWords = function(moreStopWords) {
        stopwords.words = stopwords.words.concat(moreStopWords);
    };

    stemmer.removeStopWord = function(stopWord) {
        this.removeStopWords([stopWord])
    };

    stemmer.removeStopWords = function(moreStopWords) {
        moreStopWords.forEach(function(stopWord){
            var idx = stopwords.words.indexOf(stopWord);
            if (idx >= 0) {
                stopwords.words.splice(idx, 1);
            }
        });

    };


    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        var lowercaseText = text.toLowerCase();
        var tokens = new Tokenizer().tokenize(lowercaseText);

        if (keepStops) {
            tokens.forEach(function(token) {
                stemmedTokens.push(stemmer.stem(token));
            });
        }

        else {
            tokens.forEach(function(token) {
                if (stopwords.words.indexOf(token) == -1)
                    stemmedTokens.push(stemmer.stem(token));
            });
        }

        return stemmedTokens;
    };

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };

        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
    };
}

},{"../../tokenizers/aggressive_tokenizer_id":110,"../../util/stopwords_id":136}],76:[function(require,module,exports){
module.exports=[
  "aba",
  "abad",
  "abadi",
  "abadiah",
  "abah",
  "abai",
  "abaimana",
  "abaka",
  "abaktinal",
  "abakus",
  "abal-abal",
  "aban",
  "abang",
  "abangan",
  "abangga",
  "abar",
  "abatoar",
  "abau",
  "abdas",
  "abdi",
  "abdikasi",
  "abdomen",
  "abdominal",
  "abdu",
  "abduksi",
  "abduktor",
  "abece",
  "aben",
  "aberasi",
  "abet",
  "abian",
  "abid",
  "abidin",
  "abilah",
  "abing",
  "abiogenesis",
  "abiosfer",
  "abiotik",
  "abis",
  "abisal",
  "abiseka",
  "abiturien",
  "abjad",
  "abjadiah",
  "ablasi",
  "ablaut",
  "ablepsia",
  "abnormal",
  "abnormalitas",
  "abnus",
  "aboi",
  "abolisi",
  "abon",
  "abonemen",
  "abong-abong",
  "aborsi",
  "abortif",
  "abortiva",
  "abortus",
  "abrak",
  "abrakadabra",
  "abrar",
  "abras",
  "abrasi",
  "abreaksi",
  "abrek",
  "abreviasi",
  "abrikos",
  "abrit-abrit",
  "abrosfer",
  "absah",
  "absen",
  "absensi",
  "absensia",
  "absente",
  "absenteisme",
  "abses",
  "absis",
  "absolusi",
  "absolut",
  "absolutisme",
  "absonan",
  "absorb",
  "absorben",
  "absorbir",
  "absorpsi",
  "absorpsiometer",
  "absorptif",
  "abstain",
  "abstinensi",
  "abstrak",
  "abstraksi",
  "absurd",
  "absurdisme",
  "abtar",
  "abu",
  "abuan",
  "abuh",
  "abuk",
  "abulhayat",
  "abulia",
  "abun-abun",
  "abur",
  "abus",
  "abyad",
  "acah",
  "acak",
  "acala",
  "acan",
  "acang",
  "acap",
  "acar",
  "acara",
  "acaram",
  "acat",
  "acau",
  "acawi",
  "acerang",
  "aci",
  "acik",
  "aco",
  "acu",
  "acuh",
  "acum",
  "acung",
  "ada",
  "adab",
  "adad",
  "adagio",
  "adagium",
  "adakala",
  "adakalanya",
  "adakan",
  "adaks",
  "adaktil",
  "adalah",
  "adalat",
  "adam",
  "adan",
  "adang",
  "adap",
  "adaptabel",
  "adaptabilitas",
  "adaptasi",
  "adaptif",
  "adaptometer",
  "adaptor",
  "adapun",
  "adar",
  "adas",
  "adat",
  "adati",
  "adegan",
  "adeh",
  "adekuat",
  "adem",
  "adempauze",
  "adendum",
  "adenoid",
  "adenoma",
  "adenosis",
  "adhesi",
  "adhesif",
  "adi",
  "adiabatik",
  "adiabatis",
  "adiaktinik",
  "adib",
  "adibangkit",
  "adibintang",
  "adiboga",
  "adibusana",
  "adicita",
  "adidaya",
  "adigang",
  "adiguna",
  "adigung",
  "adik",
  "adika",
  "adikara",
  "adikarya",
  "adikodrati",
  "adikong",
  "adiksi",
  "adiktif",
  "adikuasa",
  "adil",
  "adiluhung",
  "adimarga",
  "adinda",
  "ading",
  "adipati",
  "adipenghantar",
  "adiposa",
  "adipositas",
  "adipura",
  "adiraja",
  "adiratna",
  "adisi",
  "adisional",
  "adisiswa",
  "aditif",
  "aditokoh",
  "adiwangsa",
  "adiwarna",
  "adiwidia",
  "adjektif",
  "adjektiva",
  "adjektival",
  "adjuvan",
  "administrasi",
  "administratif",
  "administrator",
  "admiral",
  "admisi",
  "admitans",
  "adnan",
  "adolesens",
  "adon",
  "adopsi",
  "adoptif",
  "adpertensi",
  "adrenal",
  "adrenalin",
  "adrenergik",
  "adres",
  "adsorben",
  "adsorpi",
  "adsorpsi",
  "adstringen",
  "adu",
  "aduh",
  "aduhai",
  "aduk",
  "aduksi",
  "aduktor",
  "adun",
  "adveksi",
  "adven",
  "adventisia",
  "adventisius",
  "adverbia",
  "adverbial",
  "advertensi",
  "advis",
  "advokad",
  "advokasi",
  "advokat",
  "aerasi",
  "aerator",
  "aerob",
  "aerobatik",
  "aerobik",
  "aerobika",
  "aerodinamik",
  "aerodinamika",
  "aerofisika",
  "aerofisiologi",
  "aerofon",
  "aerogram",
  "aerolit",
  "aerologi",
  "aerometer",
  "aeromovel",
  "aeronautika",
  "aeroplangton",
  "aeroplankton",
  "aeroskop",
  "aerosol",
  "aerostat",
  "aerostatika",
  "aestetika",
  "afair",
  "afal",
  "afasia",
  "afdal",
  "afdeling",
  "afdruk",
  "afek",
  "afeksi",
  "afektif",
  "aferesis",
  "afiat",
  "afidavit",
  "afiks",
  "afiksasi",
  "afiliasi",
  "afinitas",
  "afirmasi",
  "afirmatif",
  "afonia",
  "aforisme",
  "afotik",
  "afrasia",
  "afrikat",
  "afrit",
  "afrodisiak",
  "afsun",
  "afwah",
  "aga",
  "agah",
  "agak",
  "agak-agih",
  "agal",
  "agalaksia",
  "agam",
  "agama",
  "agamais",
  "agamawi",
  "agamen",
  "agamet",
  "agami",
  "agamogenesis",
  "agan",
  "agape",
  "agar",
  "agas",
  "agen",
  "agenda",
  "agens",
  "agentif",
  "agih",
  "agil",
  "agio",
  "agiria",
  "agitasi",
  "agitatif",
  "agitator",
  "aglikon",
  "aglomerasi",
  "aglomerat",
  "aglutinasi",
  "aglutinat",
  "aglutinatif",
  "aglutinin",
  "agnosia",
  "agnostik",
  "agnostisisme",
  "agogo",
  "agometer",
  "agon",
  "agonia",
  "agonis",
  "agonistik",
  "agorafobia",
  "agradasi",
  "agrafia",
  "agraria",
  "agraris",
  "agregasi",
  "agregat",
  "agregatif",
  "agresi",
  "agresif",
  "agresivitas",
  "agresor",
  "agriologi",
  "agripnia",
  "agrisilvikultur",
  "agrobis",
  "agrobisnis",
  "agroekonomi",
  "agroekosistem",
  "agrogeologi",
  "agroikos",
  "agroindustri",
  "agrokimia",
  "agronom",
  "agronomi",
  "agrostologi",
  "agrowisata",
  "aguk",
  "agul",
  "agun",
  "agung",
  "agus",
  "agustus",
  "agut",
  "ahad",
  "ahadiat",
  "ahimsa",
  "ahistoris",
  "ahkam",
  "ahlan",
  "ahli",
  "ahlulbait",
  "ahlulkitab",
  "ahlulkubur",
  "ahlunujum",
  "ahlusuluk",
  "ahlusunah",
  "ahmak",
  "ahmar",
  "aho",
  "ahsan",
  "ahwal",
  "aib",
  "ain",
  "ainulbanat",
  "ainulyakin",
  "ainunjariah",
  "air",
  "aja",
  "ajab",
  "ajaib",
  "ajaibkhanah",
  "ajak",
  "ajal",
  "ajang",
  "ajar",
  "ajek",
  "ajektifa",
  "ajektiva",
  "ajengan",
  "aji",
  "ajigineng",
  "ajimumpung",
  "ajir",
  "ajisaka",
  "ajnabi",
  "ajnas",
  "ajojing",
  "ajre",
  "aju",
  "ajudan",
  "ajufan",
  "ajujah",
  "ajuk",
  "ajun",
  "ajung",
  "ajur",
  "ajuster",
  "akad",
  "akademi",
  "akademik",
  "akademikus",
  "akademis",
  "akademisi",
  "akaid",
  "akak",
  "akal",
  "akan",
  "akang",
  "akapela",
  "akar",
  "akas",
  "akasia",
  "akatalepsia",
  "akbar",
  "akene",
  "akeo",
  "akh",
  "akhbar",
  "akhir",
  "akhirat",
  "akhirulkalam",
  "akhlak",
  "akhlaki",
  "akhwan",
  "aki",
  "akibat",
  "akidah",
  "akik",
  "akikah",
  "akil",
  "aklamasi",
  "aklasia",
  "akli",
  "akliah",
  "aklimasi",
  "aklimatisasi",
  "akmal",
  "akolade",
  "akomodasi",
  "akomodatif",
  "akor",
  "akordeon",
  "akrab",
  "akrawati",
  "akreditasi",
  "akriflavina",
  "akrilat",
  "akrilik",
  "akrobat",
  "akrobatik",
  "akrofobia",
  "akromegali",
  "akrometer",
  "akromion",
  "akronim",
  "aksa",
  "aksara",
  "akseleran",
  "akselerasi",
  "akselerator",
  "akselerometer",
  "aksen",
  "aksentologi",
  "aksentuasi",
  "aksep",
  "akseptabel",
  "akseptabilitas",
  "akseptasi",
  "akseptor",
  "akses",
  "aksesibilitas",
  "aksesori",
  "aksi",
  "aksidental",
  "aksila",
  "aksiologi",
  "aksioma",
  "aksiomatis",
  "aksis",
  "akson",
  "aksostil",
  "akta",
  "aktentas",
  "aktif",
  "akting",
  "aktinida",
  "aktinik",
  "aktinisme",
  "aktinium",
  "aktinokimia",
  "aktinolit",
  "aktinometer",
  "aktiva",
  "aktivis",
  "aktivisme",
  "aktivitas",
  "aktor",
  "aktris",
  "aktual",
  "aktualisasi",
  "aktuaria",
  "aktuaris",
  "aku",
  "akua",
  "akuades",
  "akuaduk",
  "akuakultur",
  "akualung",
  "akuamarin",
  "akuan",
  "akuarel",
  "akuaris",
  "akuarium",
  "akuarius",
  "akuatik",
  "akuifer",
  "akuisisi",
  "akuk",
  "akulturasi",
  "akumulasi",
  "akumulatif",
  "akumulator",
  "akun",
  "akuntabel",
  "akuntabilitas",
  "akuntan",
  "akuntansi",
  "akupungtur",
  "akupungturis",
  "akupunktur",
  "akur",
  "akurasi",
  "akurat",
  "akusatif",
  "akustik",
  "akustika",
  "akut",
  "akwal",
  "ala",
  "alabangka",
  "alabio",
  "alaf",
  "alai",
  "alai-belai",
  "alaihisalam",
  "alaika",
  "alaikum",
  "alak",
  "alalia",
  "alam",
  "alamah",
  "alamak",
  "alamanda",
  "alamas",
  "alamat",
  "alamatulhayat",
  "alami",
  "alamiah",
  "alamin",
  "alan-alan",
  "alang",
  "alangkah",
  "alantois",
  "alap",
  "alarm",
  "alas",
  "alat",
  "alau",
  "alawar",
  "alazon",
  "albanat",
  "albas",
  "albatros",
  "albedo",
  "albedometer",
  "albinisme",
  "albino",
  "albinoid",
  "albit",
  "albuginea",
  "album",
  "albumen",
  "albumin",
  "albuminoit",
  "albuminometer",
  "albuminuria",
  "aldehida",
  "alegori",
  "alegoris",
  "aleksandrit",
  "aleksia",
  "aleksin",
  "alel",
  "alem",
  "alergen",
  "alergi",
  "alergis",
  "alf",
  "alfa",
  "alfabet",
  "alfabetis",
  "alfaktorius",
  "alfanumerik",
  "alferes",
  "alga",
  "algilik",
  "algoid",
  "algojo",
  "algologi",
  "algometer",
  "algoritme",
  "algrafi",
  "alhamdulillah",
  "alhasil",
  "ali",
  "aliansi",
  "alias",
  "aliase",
  "alibi",
  "alienasi",
  "alif",
  "alifatik",
  "alifbata",
  "alih",
  "alihragam",
  "alik",
  "alikuot",
  "alim",
  "alimbubu",
  "alimentasi",
  "alimenter",
  "alimiah",
  "alimiat",
  "alimun",
  "alin",
  "alinea",
  "aling",
  "alip",
  "alir",
  "alis",
  "alisiklik",
  "alit",
  "aliterasi",
  "alizarin",
  "aljabar",
  "aljalil",
  "alkabir",
  "alkadim",
  "alkadir",
  "alkah",
  "alkali",
  "alkalinitas",
  "alkalis",
  "alkaloid",
  "alkalometri",
  "alkamar",
  "alkana",
  "alkari",
  "alkasyaf",
  "alkausar",
  "alkena",
  "alkil",
  "alkimia",
  "alkisah",
  "alkitab",
  "alkohol",
  "alkoholis",
  "alkoholisasi",
  "alkoholisme",
  "alkoholometer",
  "alku",
  "alkuna",
  "alkus",
  "allah",
  "allahu",
  "allahuma",
  "almaktub",
  "almalik",
  "almalun",
  "almamater",
  "almanak",
  "almandin",
  "almandina",
  "almandit",
  "almarhum",
  "almarhumah",
  "almasih",
  "almuazam",
  "almukhlis",
  "alobar",
  "alofon",
  "alograf",
  "aloi",
  "alokasi",
  "alokron",
  "aloleks",
  "alomerisme",
  "alomorf",
  "alon",
  "alonim",
  "alopati",
  "alopesia",
  "alot",
  "alotropi",
  "alpa",
  "alpaka",
  "alperes",
  "alpukah",
  "alquran",
  "altar",
  "alter",
  "alteratif",
  "alternasi",
  "alternatif",
  "alternator",
  "altimeter",
  "alto",
  "altokumulus",
  "altostratus",
  "altruis",
  "altruisme",
  "altruistis",
  "alu",
  "alufiru",
  "alum",
  "alumina",
  "aluminium",
  "alumni",
  "alumnus",
  "alun",
  "alung",
  "alup",
  "alur",
  "alusi",
  "aluvial",
  "aluvium",
  "alveolar",
  "alveolum",
  "alveolus",
  "alwah",
  "alwasi",
  "alwasia",
  "ama",
  "amabakdu",
  "amah",
  "amai-amai",
  "amal",
  "amalgam",
  "amalgamasi",
  "amalgamator",
  "amaliah",
  "aman",
  "amanah",
  "amanat",
  "amandel",
  "amandemen",
  "amang",
  "amanitin",
  "amar",
  "amarilis",
  "amat",
  "amatir",
  "amatirisme",
  "amatol",
  "ambah",
  "ambah-ambah",
  "ambai",
  "ambai-ambai",
  "ambak",
  "ambal",
  "ambalang",
  "ambalela",
  "ambang",
  "ambar",
  "ambarau",
  "ambasade",
  "ambasador",
  "ambau",
  "ambeien",
  "ambek",
  "amben",
  "amberal",
  "ambergris",
  "amberit",
  "ambet",
  "ambi",
  "ambigu",
  "ambiguitas",
  "ambil",
  "ambilingual",
  "ambin",
  "ambing",
  "ambisi",
  "ambisius",
  "ambivalen",
  "ambivalensi",
  "amblas",
  "amblek",
  "ambles",
  "ambliobia",
  "amboi",
  "ambreng-ambrengan",
  "ambring",
  "ambrol",
  "ambruk",
  "ambu-ambu",
  "ambuh",
  "ambul",
  "ambulakral",
  "ambulans",
  "ambulatori",
  "ambung",
  "ambur",
  "amburadul",
  "ambyar",
  "ameba",
  "amebiasis",
  "ameboid",
  "amebosit",
  "ameliorasi",
  "amelioratif",
  "amen",
  "amendemen",
  "amenorea",
  "amensalisme",
  "amenta",
  "amerisium",
  "amerospora",
  "amerta",
  "ametabola",
  "ametis",
  "ametobola",
  "amfetamin",
  "amfiartrosis",
  "amfibi",
  "amfibol",
  "amfibolisme",
  "amfiston",
  "amfiteater",
  "amfoterik",
  "ami",
  "amigdalin",
  "amikal",
  "amil",
  "amilase",
  "amilopektin",
  "amin",
  "amina",
  "aminisasi",
  "amino",
  "amir",
  "amirulbahar",
  "amirulhaj",
  "amirulmukminin",
  "amis",
  "amit",
  "amitosir",
  "amko",
  "ammeter",
  "amnesia",
  "amnesti",
  "amnion",
  "amniotik",
  "amoi",
  "amonia",
  "amonifikasi",
  "amonit",
  "amonium",
  "amor",
  "amoral",
  "amorf",
  "amortisasi",
  "ampai",
  "ampang",
  "ampas",
  "ampat",
  "ampe",
  "ampean",
  "ampek",
  "ampel",
  "ampela",
  "ampelam",
  "ampelas",
  "ampere",
  "amperemeter",
  "amperometri",
  "ampisilin",
  "amplas",
  "amplifikasi",
  "amplitudo",
  "amplop",
  "ampo",
  "amprok",
  "amprung",
  "ampu",
  "ampuh",
  "ampuk",
  "ampul",
  "ampula",
  "ampun",
  "amput",
  "amputasi",
  "amra",
  "amril",
  "amsal",
  "amtenar",
  "amuba",
  "amuh",
  "amuk",
  "amulet",
  "amung",
  "amunisi",
  "ana",
  "anabasis",
  "anabiosis",
  "anabolisme",
  "anadrom",
  "anaerob",
  "anaerobik",
  "anafilaksis",
  "anafora",
  "anaforis",
  "anafrodisiak",
  "anaglif",
  "anai-anai",
  "anak",
  "anakoluton",
  "anakronisme",
  "anakronistis",
  "anakrus",
  "anal",
  "analekta",
  "analeptik",
  "analgesik",
  "analis",
  "analisis",
  "analitis",
  "analog",
  "analogi",
  "analseks",
  "analsit",
  "anamel",
  "anamnesis",
  "anamorfosis",
  "ananda",
  "anang",
  "anani",
  "anapes",
  "anaptiksis",
  "anarki",
  "anarkis",
  "anarkisme",
  "anarkistis",
  "anasional",
  "anasir",
  "anastomosis",
  "anatase",
  "anatomi",
  "anatomis",
  "anbia",
  "anca",
  "ancai",
  "ancak",
  "ancala",
  "ancam",
  "ancang",
  "ancar-ancar",
  "ancoa",
  "ancol",
  "ancuk",
  "anda",
  "andai",
  "andak",
  "andaka",
  "andal",
  "andalas",
  "andalusit",
  "andam",
  "andan",
  "andang",
  "andapita",
  "andar",
  "andarah",
  "andeng-andeng",
  "anderak",
  "andesit",
  "andewi",
  "andika",
  "andiko",
  "andil",
  "andilau",
  "andok",
  "andong",
  "andragogi",
  "andrawina",
  "androgen",
  "androgini",
  "androgogi",
  "androlog",
  "andrologi",
  "anduh",
  "andur",
  "aneh",
  "aneka",
  "anekdot",
  "aneksasi",
  "anemer",
  "anemia",
  "anemofili",
  "anemograf",
  "anemogram",
  "anemometer",
  "aneroid",
  "anestesi",
  "anestesia",
  "anestesiolog",
  "anestetis",
  "aneuploid",
  "aneurisme",
  "anfas",
  "angah",
  "angan",
  "angel",
  "angga",
  "anggai",
  "anggak",
  "anggal",
  "anggan",
  "anggap",
  "anggar",
  "anggara",
  "anggau",
  "anggerka",
  "anggit",
  "angglap",
  "anggorokasih",
  "anggota",
  "anggrek",
  "angguh",
  "angguk",
  "anggul",
  "anggun",
  "anggung",
  "anggung-anggip",
  "anggur",
  "anggut",
  "anghun",
  "angin",
  "angina",
  "angiogenesis",
  "angiologi",
  "angiosperma",
  "angit",
  "angka",
  "angkak",
  "angkal-angkal",
  "angkara",
  "angkasa",
  "angkat",
  "angkel",
  "angker",
  "angket",
  "angkin",
  "angkit",
  "angklung",
  "angkong",
  "angkring",
  "angku",
  "angkuh",
  "angkuk",
  "angkul-angkul",
  "angkup",
  "angkur",
  "angkus",
  "angkusa",
  "angkut",
  "angler",
  "anglo",
  "anglong",
  "anglung",
  "angon",
  "angop",
  "angot",
  "angpau",
  "angsa",
  "angsana",
  "angsoka",
  "angsu",
  "angsur",
  "angus",
  "angut",
  "anhidrosis",
  "ani",
  "aniaya",
  "anil",
  "anilina",
  "animasi",
  "animis",
  "animisme",
  "animo",
  "aning-aning",
  "anion",
  "aniridia",
  "anis",
  "anisogamet",
  "anisogami",
  "anisokoria",
  "anisotropis",
  "anja",
  "anjak",
  "anjal",
  "anjang",
  "anjangkarya",
  "anjangsana",
  "anjar",
  "anjiman",
  "anjing",
  "anjir",
  "anjlok",
  "anju",
  "anjung",
  "anjur",
  "ankilosis",
  "anoa",
  "anode",
  "anodin",
  "anofeles",
  "anoksemia",
  "anoksik",
  "anom",
  "anomali",
  "anomi",
  "anonim",
  "anonimitas",
  "anoreksia",
  "anorganik",
  "anorgastik",
  "anortopia",
  "anosmia",
  "anotasi",
  "ansa",
  "ansambel",
  "ansar",
  "ansari",
  "anta",
  "antagonis",
  "antagonisme",
  "antagonistis",
  "antah",
  "antah-berantah",
  "antakesuma",
  "antalas",
  "antalkali",
  "antamir",
  "antan",
  "antap",
  "antar",
  "antara",
  "antarbangsa",
  "antarbenua",
  "antardaerah",
  "antari",
  "antariksa",
  "antarkelompok",
  "antarlingkungan",
  "antarmaster",
  "antarmolekul",
  "antarmuka",
  "antarnegara",
  "antarplanet",
  "antarpribadi",
  "antarpulau",
  "antarras",
  "antarruang",
  "antarsel",
  "antarsuku",
  "antartika",
  "antarwilayah",
  "antasid",
  "antasida",
  "antawacana",
  "ante",
  "antedilivium",
  "antediluvium",
  "antefiks",
  "antek",
  "anteken",
  "antelas",
  "anteliks",
  "antelmintik",
  "antelop",
  "antem",
  "antemeridiem",
  "antena",
  "antenatal",
  "anteng",
  "antenul",
  "antep",
  "anter",
  "antera",
  "anteridium",
  "anterior",
  "antero",
  "anteseden",
  "anti",
  "antianemia",
  "antiartritik",
  "antibarion",
  "antibeku",
  "antibiosis",
  "antibiotik",
  "antibodi",
  "antidepresan",
  "antidioksida",
  "antidiuretik",
  "antidot",
  "antienzim",
  "antiflogistik",
  "antigen",
  "antigravitasi",
  "antih",
  "antihistamin",
  "antijasad",
  "antik",
  "antikarat",
  "antikatalis",
  "antiklimaks",
  "antiklin",
  "antiklinal",
  "antiklor",
  "antikonsepsi",
  "antikristus",
  "antikuari",
  "antikuariat",
  "antimateri",
  "antimetari",
  "antimonium",
  "antimuntah",
  "anting",
  "antinomi",
  "antinovel",
  "antipartikel",
  "antipati",
  "antipenawar",
  "antipiretik",
  "antipode",
  "antiproton",
  "antipruritik",
  "antisemitisme",
  "antisepsis",
  "antiseptik",
  "antisiklogenesis",
  "antisiklon",
  "antisiklonal",
  "antisiklonis",
  "antisimpul",
  "antisipasi",
  "antisipatif",
  "antitank",
  "antitesis",
  "antitoksin",
  "antitragus",
  "antiwirawan",
  "antizarah",
  "antoi",
  "antologi",
  "antonim",
  "antonimi",
  "antop",
  "antosian",
  "antraknosa",
  "antraks",
  "antrasena",
  "antrasian",
  "antrasit",
  "antre",
  "antri",
  "antromometer",
  "antromorfis",
  "antropobiologi",
  "antropoda",
  "antropofagi",
  "antropogeografi",
  "antropoid",
  "antropolog",
  "antropologi",
  "antropometer",
  "antropomorfisme",
  "antroponimi",
  "antroposentris",
  "antroposentrisme",
  "antroposofi",
  "antuk",
  "antul",
  "antun",
  "antung-antung",
  "antup",
  "anturium",
  "antusias",
  "antusiasme",
  "anu",
  "anual",
  "anugerah",
  "anuitas",
  "anulir",
  "anulus",
  "anumerta",
  "anunasika",
  "anuresis",
  "anuria",
  "anus",
  "anuswara",
  "anut",
  "anyak",
  "anyam",
  "anyang",
  "anyar",
  "anyel",
  "anyelir",
  "anyep",
  "anyes",
  "anyik",
  "anyir",
  "aorta",
  "apa",
  "apabila",
  "apak",
  "apakah",
  "apakala",
  "apalagi",
  "apam",
  "apanase",
  "apar",
  "aparat",
  "aparatur",
  "aparatus",
  "apartemen",
  "apartemenisasi",
  "apartheid",
  "apartotel",
  "apas",
  "apatah",
  "apati",
  "apatis",
  "apatride",
  "ape",
  "apek",
  "apel",
  "apelativa",
  "apendektomi",
  "apendiks",
  "apendisitis",
  "apepsi",
  "apersepsi",
  "apes",
  "aphelion",
  "apheliotropisme",
  "api",
  "apik",
  "apikal",
  "apikultur",
  "apilan",
  "aping",
  "apion",
  "apit",
  "apium",
  "apkir",
  "aplasi",
  "aplaus",
  "aplikasi",
  "aplikatif",
  "aplus",
  "apnea",
  "apo",
  "apodal",
  "apoenzim",
  "apogami",
  "apoge",
  "apograf",
  "apok",
  "apokalips",
  "apokaliptik",
  "apokope",
  "apokrifa",
  "apokrin",
  "apokromatik",
  "apolitis",
  "apologetika",
  "apologetis",
  "apologi",
  "apologia",
  "apomiksis",
  "apomorfin",
  "apopleksi",
  "aposematik",
  "aposiopesis",
  "aposisi",
  "aposisional",
  "apositif",
  "apostasi",
  "apostel",
  "aposteriori",
  "apostolik",
  "apostrof",
  "apotek",
  "apoteker",
  "apotik",
  "apraksi",
  "apraksia",
  "apresiasi",
  "apresiatif",
  "apresorium",
  "april",
  "apriori",
  "aprit",
  "apron",
  "apsara",
  "apsari",
  "aptasi",
  "aptiklus",
  "apu",
  "apuh",
  "apung",
  "apuran",
  "ara",
  "arab",
  "arababu",
  "arabahu",
  "arabes",
  "arabesk",
  "arabika",
  "aragonit",
  "arah",
  "arai",
  "arak",
  "araknitis",
  "araknoid",
  "aral",
  "aram",
  "aramba",
  "arang",
  "aransemen",
  "ararut",
  "aras",
  "arasy",
  "arau",
  "arbaa",
  "arbab",
  "arbei",
  "arbiter",
  "arbitrase",
  "arbitrer",
  "arboreal",
  "arboretum",
  "arborikultur",
  "arca",
  "arcas",
  "ardi",
  "are",
  "area",
  "areal",
  "arek",
  "arem-arem",
  "aren",
  "arena",
  "areografi",
  "areola",
  "areometer",
  "arerut",
  "ares",
  "arestasi",
  "areta",
  "argari",
  "argentit",
  "argentum",
  "argirodit",
  "argol",
  "argometer",
  "argon",
  "argot",
  "argumen",
  "argumentasi",
  "argumentatif",
  "ari",
  "aria",
  "aries",
  "arif",
  "arifin",
  "arih",
  "arik",
  "aril",
  "aring",
  "ariningsun",
  "arip",
  "aris",
  "arisan",
  "aristokrasi",
  "aristokrat",
  "aristokratis",
  "aristotipe",
  "arit",
  "aritenoid",
  "aritmetika",
  "arja",
  "arkade",
  "arkais",
  "arkaisme",
  "arkan",
  "arkati",
  "arkegonium",
  "arkeolog",
  "arkeologi",
  "arkeologis",
  "arkeozoikum",
  "arketipe",
  "arkian",
  "arkifonem",
  "arkileksem",
  "arkitraf",
  "arktika",
  "arku",
  "arloji",
  "armada",
  "arnal",
  "arogan",
  "arogansi",
  "aroma",
  "aromatik",
  "arombai",
  "aron",
  "arpus",
  "arsenal",
  "arsenik",
  "arsenikum",
  "arsip",
  "arsipelago",
  "arsir",
  "arsis",
  "arsitek",
  "arsitektur",
  "arta",
  "artefak",
  "arteri",
  "arteriografi",
  "arteriola",
  "arteriosklerosis",
  "artesis",
  "artetis",
  "arti",
  "articok",
  "artifak",
  "artifisial",
  "artik",
  "artikel",
  "artikulasi",
  "artikulator",
  "artileri",
  "artiodaktil",
  "artis",
  "artisan",
  "artistik",
  "artisyok",
  "artona",
  "artotek",
  "artrobrankium",
  "artropoda",
  "aru",
  "aruan",
  "aruda",
  "aruk",
  "arumba",
  "arun",
  "arung",
  "arus",
  "arwah",
  "arwana",
  "arya",
  "aryaduta",
  "arzak",
  "asa",
  "asabat",
  "asabiah",
  "asabiyah",
  "asad",
  "asah",
  "asai",
  "asak",
  "asal",
  "asali",
  "asam",
  "asan",
  "asana",
  "asap",
  "asar",
  "asas",
  "asasi",
  "asbak",
  "asbes",
  "asbut",
  "aseksual",
  "asemble",
  "asembling",
  "asepsis",
  "aseptik",
  "aseran",
  "asese",
  "aset",
  "asetabulum",
  "asetat",
  "asetilena",
  "asetimeter",
  "aseton",
  "asfal",
  "asfar",
  "asfiksia",
  "asi",
  "asibilan",
  "asibilasi",
  "asid",
  "asidimeter",
  "asidosis",
  "asih",
  "asiklik",
  "asil",
  "asilabis",
  "asimetris",
  "asimilasi",
  "asimilatif",
  "asimtot",
  "asimus",
  "asin",
  "asindeton",
  "asing",
  "asinyor",
  "asiri",
  "asisten",
  "asistensi",
  "askar",
  "askariasis",
  "askarid",
  "askese",
  "asket",
  "asketisisme",
  "askon",
  "askriptif",
  "asli",
  "asma",
  "asmara",
  "asmaradanta",
  "asmaragama",
  "asmaraloka",
  "asmarandana",
  "asnad",
  "aso",
  "asoi",
  "asonansi",
  "asong",
  "asor",
  "asortimen",
  "asosial",
  "asosiasi",
  "asosiatif",
  "aspal",
  "asparaga",
  "asparagus",
  "aspartame",
  "aspek",
  "asperses",
  "aspiran",
  "aspirasi",
  "aspirasional",
  "aspirat",
  "aspiratif",
  "aspirator",
  "aspirin",
  "asprak",
  "asrama",
  "asrar",
  "asri",
  "assalamualaikum",
  "asta",
  "astadikpala",
  "astaga",
  "astagfirullah",
  "astaka",
  "astakona",
  "astana",
  "astasia",
  "astatik",
  "astatin",
  "astenia",
  "astenik",
  "astenopia",
  "asteositoma",
  "aster",
  "asteroid",
  "astigmatis",
  "astra",
  "astral",
  "astringen",
  "astrofisika",
  "astrolab",
  "astrolog",
  "astrologi",
  "astronaut",
  "astronautika",
  "astronom",
  "astronomi",
  "astronomis",
  "astrosit",
  "asu",
  "asuh",
  "asumsi",
  "asumtif",
  "asung",
  "asurador",
  "asuransi",
  "asusila",
  "aswa",
  "aswad",
  "aswasada",
  "asyera",
  "asyik",
  "asytoret",
  "asyura",
  "atak",
  "ataksia",
  "atap",
  "atar",
  "atas",
  "atase",
  "atau",
  "atavisme",
  "atebrin",
  "ateis",
  "ateisme",
  "ateistis",
  "atelir",
  "atensi",
  "atenuasi",
  "ateret",
  "atfal",
  "ati",
  "atlas",
  "atlet",
  "atletik",
  "atma",
  "atman",
  "atmolisis",
  "atmologi",
  "atmometer",
  "atmosfer",
  "atmosferis",
  "ato",
  "atok",
  "atol",
  "atom",
  "atomisasi",
  "atomistis",
  "atop",
  "atos",
  "atowa",
  "atraksi",
  "atraktan",
  "atraktif",
  "atresia",
  "atret",
  "atribut",
  "atributif",
  "atrisi",
  "atrium",
  "atrofi",
  "atropin",
  "atung",
  "atur",
  "atus",
  "aubade",
  "audiensi",
  "audio",
  "audiofil",
  "audiofon",
  "audiograf",
  "audiogram",
  "audiolingual",
  "audiologi",
  "audiometer",
  "audiovisual",
  "audit",
  "auditor",
  "auditorium",
  "augmentatif",
  "auk",
  "auksanometer",
  "auksi",
  "auksin",
  "aula",
  "aulia",
  "aum",
  "aung",
  "aur",
  "aura",
  "aural",
  "aurat",
  "aurikularia",
  "aurora",
  "aurum",
  "aus",
  "auskultasi",
  "autad",
  "autarki",
  "autarkis",
  "autentik",
  "autentikasi",
  "autentisitas",
  "autisme",
  "autistik",
  "auto",
  "autobiograf",
  "autobiografi",
  "autodidak",
  "autodidaktik",
  "autodin",
  "autofon",
  "autogami",
  "autogen",
  "autograf",
  "autografi",
  "autogram",
  "autoklaf",
  "autoklastik",
  "autokrasi",
  "autokrat",
  "autokton",
  "autoktonos",
  "autolisis",
  "autolitograf",
  "autologi",
  "automaton",
  "automobil",
  "automotif",
  "autopsi",
  "autoskop",
  "autosom",
  "autotoksin",
  "autotrof",
  "autotrofik",
  "autotrop",
  "autotropik",
  "auzubillah",
  "avalans",
  "aven",
  "aversi",
  "avertebrata",
  "avesta",
  "avgas",
  "aviari",
  "aviasi",
  "aviator",
  "avifauna",
  "avikultur",
  "avirulen",
  "avitaminosis",
  "avokad",
  "avontur",
  "avonturir",
  "avtur",
  "avunkulokal",
  "awa",
  "awaair",
  "awaarang",
  "awabau",
  "awabeku",
  "awabulu",
  "awabusa",
  "awadara",
  "awah",
  "awahama",
  "awai",
  "awak",
  "awal",
  "awalengas",
  "awam",
  "awamineral",
  "awan",
  "awanama",
  "awang",
  "awar",
  "awaracun",
  "awas",
  "awasenjata",
  "awat",
  "awawarna",
  "awet",
  "awewe",
  "awi",
  "awik-awik",
  "awin",
  "awur",
  "awut",
  "ayah",
  "ayahan",
  "ayahanda",
  "ayak",
  "ayal",
  "ayam",
  "ayan",
  "ayanda",
  "ayang-ayang",
  "ayap",
  "ayar",
  "ayat",
  "ayatullah",
  "ayem",
  "ayeng",
  "ayid",
  "ayit",
  "ayo",
  "ayom",
  "ayu",
  "ayuk",
  "ayum",
  "ayun",
  "ayunda",
  "ayut",
  "azab",
  "azal",
  "azali",
  "azam",
  "azan",
  "azeotrop",
  "azimat",
  "azimut",
  "aziz",
  "azmat",
  "azoikum",
  "azospermi",
  "azurit",
  "bab",
  "baba",
  "babad",
  "babah",
  "babak",
  "babakan",
  "babal",
  "baban",
  "babang",
  "babar",
  "babaring",
  "babas",
  "babat",
  "babatan",
  "babe",
  "babesiasis",
  "babet",
  "babi",
  "babil",
  "babit",
  "bablas",
  "babon",
  "babu",
  "babun",
  "babur",
  "babut",
  "baca",
  "bacah",
  "bacak",
  "bacang",
  "bacar",
  "bacek",
  "bacem",
  "bacik",
  "bacin",
  "baco",
  "bacok",
  "bacot",
  "bacul",
  "bacut",
  "bad",
  "bada",
  "badai",
  "badak",
  "badal",
  "badam",
  "badan",
  "badang",
  "badani",
  "badar",
  "badari",
  "badasi",
  "badau",
  "bade",
  "badi",
  "badik",
  "badminton",
  "badong",
  "badui",
  "baduk",
  "badung",
  "badur",
  "badut",
  "baduyut",
  "bafta",
  "bagai",
  "bagaimana",
  "bagak",
  "bagal",
  "bagan",
  "bagang",
  "bagar",
  "bagas",
  "bagasi",
  "bagat",
  "bagau",
  "bagea",
  "bagi",
  "baginda",
  "bagong",
  "bagor",
  "baguk",
  "bagul",
  "bagur",
  "bagus",
  "bah",
  "bahadur",
  "bahaduri",
  "bahagia",
  "bahak",
  "bahala",
  "bahalan",
  "baham",
  "bahan",
  "bahana",
  "bahang",
  "bahar",
  "bahara",
  "bahari",
  "baharu",
  "bahas",
  "bahasa",
  "bahaya",
  "bahenol",
  "baheula",
  "bahimiah",
  "bahkan",
  "bahri",
  "bahrulhayat",
  "bahtera",
  "bahu",
  "bahuku",
  "bahwa",
  "bahwasanya",
  "baiat",
  "baid",
  "baiduri",
  "baik",
  "bain",
  "bainah",
  "bais",
  "bait",
  "baitulharam",
  "baitullah",
  "baitulmakdis",
  "baitulmakmur",
  "baitulmal",
  "baitulmukadas",
  "baitulmukadis",
  "baja",
  "bajaj",
  "bajak",
  "bajan",
  "bajang",
  "bajar",
  "bajau",
  "bajetah",
  "baji",
  "bajigur",
  "bajik",
  "bajing",
  "baju",
  "bajul",
  "bak",
  "baka",
  "bakak",
  "bakal",
  "bakalaureat",
  "bakam",
  "bakap",
  "bakar",
  "bakarat",
  "bakas",
  "bakat",
  "bakau",
  "bakda",
  "bakdahu",
  "bakdu",
  "bakdul",
  "bakelit",
  "bakero",
  "bakh",
  "bakhil",
  "baki",
  "bakiak",
  "bakik",
  "bakir",
  "bakmi",
  "bako",
  "bakpao",
  "bakpia",
  "baksi",
  "baksis",
  "bakso",
  "baktau",
  "bakteremia",
  "bakteri",
  "bakterin",
  "bakteriofag",
  "bakteriolisis",
  "bakteriolog",
  "bakteriologi",
  "bakteriostatik",
  "bakterisida",
  "bakti",
  "baku",
  "bakul",
  "bakung",
  "bakup",
  "bakut",
  "bakwan",
  "bal",
  "bala",
  "balabad",
  "balad",
  "balada",
  "balah",
  "balai",
  "balairung",
  "balak",
  "balalaika",
  "balam",
  "balan",
  "balang",
  "balangkep",
  "balans",
  "balap",
  "balar",
  "balas",
  "balau",
  "balela",
  "balen",
  "balerina",
  "balerong",
  "balet",
  "balgam",
  "balian",
  "balig",
  "baliho",
  "balik",
  "baling",
  "balistik",
  "balistika",
  "baliu",
  "balkas",
  "balkon",
  "balneologi",
  "balneoterapi",
  "balok",
  "balon",
  "balong",
  "balot",
  "balsam",
  "balseros",
  "balu",
  "baluarti",
  "baluh",
  "balui",
  "baluk",
  "balun",
  "balung",
  "balur",
  "balut",
  "bam",
  "bambam",
  "bambang",
  "bambu",
  "bambung",
  "ban",
  "bana",
  "banal",
  "banang",
  "banar",
  "banat",
  "bancak",
  "bancang",
  "bancar",
  "bancet",
  "banci",
  "bancik",
  "bancuh",
  "bancut",
  "banda",
  "bandan",
  "bandang",
  "bandar",
  "bandara",
  "bandarsah",
  "bandasrayan",
  "bandea",
  "bandel",
  "bandela",
  "bandeng",
  "bandering",
  "banderol",
  "banding",
  "bandit",
  "banditisme",
  "bando",
  "bandongan",
  "bandos",
  "bandot",
  "bandrek",
  "bandu",
  "bandul",
  "bandung",
  "bandusa",
  "bandut",
  "bang",
  "bangai",
  "bangan",
  "bangang",
  "bangar",
  "bangas",
  "bangat",
  "bangau",
  "bangbung",
  "banget",
  "bangga",
  "banggan",
  "bangir",
  "bangka",
  "bangkah",
  "bangkai",
  "bangkal",
  "bangkang",
  "bangkar",
  "bangkas",
  "bangkasan",
  "bangkeh",
  "bangket",
  "bangking",
  "bangkir",
  "bangkis",
  "bangkit",
  "bangkong",
  "bangkot",
  "bangkrut",
  "bangku",
  "bangkut",
  "banglas",
  "bangle",
  "banglo",
  "bango",
  "bangor",
  "bangpak",
  "bangsa",
  "bangsai",
  "bangsal",
  "bangsat",
  "bangsi",
  "bangun",
  "bangus",
  "bani",
  "banian",
  "baning",
  "banir",
  "banjang",
  "banjar",
  "banjaran",
  "banji",
  "banjir",
  "banjur",
  "bank",
  "bankir",
  "bantah",
  "bantai",
  "bantal",
  "bantam",
  "bantar",
  "bantaran",
  "bantat",
  "bantau",
  "banteng",
  "banter",
  "banting",
  "bantu",
  "bantun",
  "bantut",
  "banua",
  "banyak",
  "banyo",
  "banyol",
  "banyu",
  "banyun",
  "banzai",
  "bao",
  "bap",
  "bapa",
  "bapak",
  "bapakisme",
  "bapanda",
  "bapang",
  "bapet",
  "baplang",
  "baptis",
  "bar",
  "bara",
  "baraat",
  "baragajul",
  "barah",
  "barai",
  "barak",
  "barakat",
  "barakatuh",
  "baran",
  "barang",
  "barangan",
  "barangkali",
  "barap",
  "baras",
  "barat",
  "barau-barau",
  "barbar",
  "barbarisme",
  "barbel",
  "barber",
  "barbital",
  "barbiton",
  "barbiturat",
  "barbur",
  "bardi",
  "bare-bare",
  "barel",
  "bareng",
  "barep",
  "baret",
  "barga",
  "bari",
  "barid",
  "barier",
  "barik",
  "barikade",
  "baring",
  "baringan",
  "barion",
  "baris",
  "barisfer",
  "barit",
  "barita",
  "bariton",
  "barium",
  "barjad",
  "barkas",
  "barkometer",
  "barli",
  "barograf",
  "barogram",
  "barok",
  "barologi",
  "barometer",
  "barometri",
  "baron",
  "barong",
  "barongan",
  "barongsai",
  "baroskop",
  "barotermograf",
  "barso",
  "barter",
  "baru",
  "barua",
  "baruh",
  "baruje",
  "baruna",
  "barung-barung",
  "barusan",
  "barut",
  "barzakh",
  "barzanji",
  "bas",
  "basa",
  "basa-basi",
  "basah",
  "basal",
  "basalioma",
  "basanit",
  "basat",
  "basau",
  "basi",
  "basil",
  "basilari",
  "basilika",
  "basilus",
  "basin",
  "basir",
  "basirah",
  "basis",
  "basit",
  "baskara",
  "baskat",
  "basket",
  "baskom",
  "basmi",
  "bastar",
  "basuh",
  "basung",
  "basut",
  "bata",
  "batagor",
  "batai",
  "batak",
  "batako",
  "batal",
  "batalion",
  "batalyon",
  "batang",
  "batara",
  "batari",
  "batas",
  "batekeng",
  "batel",
  "batela",
  "baterai",
  "bati",
  "batih",
  "batik",
  "batil",
  "batila",
  "batimetri",
  "batin",
  "batiplankton",
  "batir-batir",
  "batis",
  "batisfer",
  "batok",
  "batolit",
  "baton",
  "batu",
  "batuk",
  "batun",
  "batung",
  "bau",
  "baud",
  "bauk",
  "bauksit",
  "baun",
  "baung",
  "baur",
  "baureksa",
  "bausastra",
  "bausuku",
  "baut",
  "bawa",
  "bawab",
  "bawah",
  "bawak",
  "bawal",
  "bawang",
  "bawasir",
  "bawat",
  "bawel",
  "bawon",
  "baya",
  "bayak",
  "bayam",
  "bayan",
  "bayang",
  "bayangkara",
  "bayangkari",
  "bayar",
  "bayas",
  "bayat",
  "bayata",
  "bayati",
  "bayem",
  "bayi",
  "bayonet",
  "bayong",
  "bayu",
  "bayuh",
  "bayun",
  "bayung",
  "bayur",
  "bazar",
  "bazoka",
  "bea",
  "beasiswa",
  "beatifikasi",
  "bebal",
  "beban",
  "bebandos",
  "bebang",
  "bebar",
  "bebaru",
  "bebas",
  "bebat",
  "bebe",
  "bebek",
  "bebekel",
  "bebekisme",
  "bebel",
  "bebenah",
  "beber",
  "beberapa",
  "beberas",
  "bebesaran",
  "bebi",
  "bebodoran",
  "bebotoh",
  "bebrek",
  "bebuyutan",
  "becak",
  "becek",
  "beceng",
  "becokok",
  "becuk",
  "becus",
  "beda",
  "bedah",
  "bedak",
  "bedal",
  "bedama",
  "bedan",
  "bedar",
  "bedaru",
  "bedawi",
  "bedaya",
  "bedebah",
  "bedegap",
  "bedegong",
  "bedel",
  "bedeng",
  "bedil",
  "bedinde",
  "bedo",
  "bedol",
  "bedudak",
  "beduk",
  "bedukang",
  "bedung",
  "beeng",
  "bega",
  "begadang",
  "begah",
  "begal",
  "begana",
  "begana-begini",
  "begandering",
  "begandring",
  "begap",
  "begar",
  "begawan",
  "begini",
  "begitu",
  "bego",
  "begonia",
  "begroting",
  "begu",
  "beguk",
  "begundal",
  "beha",
  "behandel",
  "behena",
  "bejana",
  "bejat",
  "bek",
  "beka",
  "bekah",
  "bekakak",
  "bekakas",
  "bekal",
  "bekam",
  "bekantan",
  "bekap",
  "bekas",
  "bekat",
  "bekatul",
  "bekel",
  "beken",
  "beker",
  "bekerma",
  "bekicot",
  "bekil",
  "beking",
  "bekisar",
  "bekleding",
  "bekles",
  "beklit",
  "beksan",
  "beku",
  "bekuk",
  "bekuku",
  "bekukung",
  "bel",
  "bela",
  "belabas",
  "belacak",
  "belacan",
  "belacu",
  "belada",
  "beladau",
  "beladu",
  "belah",
  "belahak",
  "belahong",
  "belai",
  "belak",
  "belaka",
  "belakang",
  "belako",
  "belalah",
  "belalai",
  "belalak",
  "belalang",
  "belam",
  "belambang",
  "belan",
  "belanak",
  "belanda",
  "belandang",
  "belandar",
  "belandong",
  "belandung",
  "belang",
  "belanga",
  "belangah",
  "belangir",
  "belangkas",
  "belangkin",
  "belangkon",
  "belanja",
  "belantai",
  "belantan",
  "belantara",
  "belantik",
  "belantika",
  "belantuk",
  "belar",
  "belarak",
  "belas",
  "belasah",
  "belasting",
  "belasungkawa",
  "belasut",
  "belat",
  "belat-belit",
  "belata",
  "belater",
  "belati",
  "belatik",
  "belatuk",
  "belatung",
  "belau",
  "belawan",
  "beldu",
  "belebas",
  "belebat",
  "belecak",
  "beleda",
  "beledang",
  "beledi",
  "beledu",
  "beleid",
  "belek",
  "belekek",
  "belekok",
  "belel",
  "belelang",
  "belembang",
  "belencong",
  "belendong",
  "belendung",
  "beleng",
  "belenggu",
  "belengket",
  "belengkok",
  "belengkong",
  "belengset",
  "belenting",
  "belentung",
  "belepas",
  "belera",
  "belerang",
  "belerong",
  "beleter",
  "beli",
  "belia",
  "beliak",
  "belian",
  "beliau",
  "belibas",
  "belibat",
  "belibis",
  "belida",
  "beligat",
  "beligo",
  "belik",
  "belikan",
  "belikat",
  "beliku",
  "belimbing",
  "belincong",
  "beling",
  "belingkang",
  "belingsat",
  "belingut",
  "belinjo",
  "belintang",
  "belis",
  "belit",
  "belitung",
  "beliung",
  "beliut",
  "beloan",
  "belobor",
  "belodok",
  "beloh",
  "belok",
  "belokok",
  "belolang",
  "belolok",
  "belolong",
  "belon",
  "belonggok",
  "belongkang",
  "belongkeng",
  "belongkot",
  "belongkotan",
  "belongsong",
  "belontang",
  "beloon",
  "belot",
  "belotong",
  "belu",
  "belu-belai",
  "beluam",
  "beluas",
  "belubu",
  "belubur",
  "beludak",
  "beludar",
  "beludru",
  "beluhan",
  "beluk",
  "belukap",
  "belukar",
  "beluku",
  "belukut",
  "belulang",
  "beluluk",
  "belulung",
  "belum",
  "belumpai",
  "belungkang",
  "belungkur",
  "belungsing",
  "belunjur",
  "beluntas",
  "beluru",
  "belus",
  "belusuk",
  "belut",
  "beluwek",
  "bembam",
  "bemban",
  "bembar",
  "bembarap",
  "bembet",
  "bemo",
  "bemper",
  "bena",
  "benah",
  "benak",
  "benalu",
  "benam",
  "benang",
  "benar",
  "benara",
  "benatu",
  "bencah",
  "bencana",
  "bencat",
  "benci",
  "bencol",
  "bencong",
  "benda",
  "bendahara",
  "bendahari",
  "bendala",
  "bendalu",
  "bendang",
  "bendar",
  "bendara",
  "bendari",
  "bendawat",
  "bendawi",
  "bende",
  "bendel",
  "bendela",
  "bendera",
  "benderang",
  "benderung",
  "bendesa",
  "bendi",
  "bendir",
  "bendo",
  "bendoro",
  "bendu",
  "benduan",
  "bendul",
  "bendung",
  "benefaktif",
  "bengah",
  "bengal",
  "bengang",
  "bengang-bengut",
  "bengap",
  "bengawan",
  "bengek",
  "bengep",
  "benggal",
  "benggala",
  "benggang",
  "benggil",
  "benggol",
  "bengis",
  "bengkah",
  "bengkak",
  "bengkal",
  "bengkal-bengkil",
  "bengkalai",
  "bengkang-bengkok",
  "bengkang-bengkong",
  "bengkang-bengkung",
  "bengkar",
  "bengkarak",
  "bengkarap",
  "bengkaras",
  "bengkarung",
  "bengkatak",
  "bengkawan",
  "bengkawang",
  "bengkayang",
  "bengkel",
  "bengkelai",
  "bengkeng",
  "bengker",
  "bengkerap",
  "bengkil",
  "bengkok",
  "bengkol",
  "bengkong",
  "bengkos",
  "bengku",
  "bengkuang",
  "bengkudu",
  "bengkunang",
  "bengkung",
  "bengoh",
  "bengok",
  "bengong",
  "bengot",
  "bengu",
  "benguk",
  "bengul",
  "bengung",
  "beni",
  "benian",
  "benih",
  "bening",
  "benitan",
  "benjol",
  "benjut",
  "benkap",
  "bensin",
  "benta",
  "bentak",
  "bentala",
  "bentan",
  "bentang",
  "bentangkan",
  "bentangur",
  "bentar",
  "bentara",
  "bentaus",
  "benteh",
  "benteng",
  "bentes",
  "bentet",
  "bentik",
  "bentoh",
  "bentok",
  "bentol",
  "bentong",
  "bentonit",
  "bentos",
  "bentrok",
  "bentuk",
  "bentul",
  "bentulu",
  "bentur",
  "benturung",
  "bentus",
  "benua",
  "benuang",
  "benuaron",
  "benulung",
  "benum",
  "benur",
  "benyai",
  "benyek",
  "benyoh",
  "benyot",
  "benzedrin",
  "benzena",
  "benzil",
  "benzoat",
  "benzoil",
  "benzoin",
  "benzol",
  "beo",
  "beol",
  "bera",
  "berabe",
  "beragan",
  "berahi",
  "berai",
  "beraja",
  "berak",
  "berakah",
  "beraksa",
  "beram",
  "berambang",
  "beramin",
  "beranang",
  "beranda",
  "berandal",
  "berandang",
  "berang",
  "berangai",
  "berangan",
  "berangas",
  "berangasan",
  "berangga",
  "berangkal",
  "berangkat",
  "berangsang",
  "berangta",
  "berangus",
  "berani",
  "beranta",
  "berantak",
  "berantas",
  "berapa",
  "beras",
  "berat",
  "bercak",
  "berdikari",
  "berdus",
  "berebes",
  "beredel",
  "berek-berek",
  "beremban",
  "berembang",
  "berendeng",
  "bereng-bereng",
  "berengau",
  "berenggil",
  "berengos",
  "berengsek",
  "berengut",
  "berentang",
  "bereo",
  "bererot",
  "beres",
  "beresok",
  "beret",
  "berewok",
  "bergajul",
  "bergas",
  "berguk",
  "berhala",
  "beri",
  "beriang",
  "beriani",
  "berida",
  "berik",
  "beril",
  "berilium",
  "berinda",
  "bering-bering",
  "beringas",
  "beringin",
  "beringsang",
  "berisik",
  "berita",
  "berkah",
  "berkas",
  "berkat",
  "berkelium",
  "berkik",
  "berkil",
  "berko",
  "berkung",
  "berlau",
  "berlian",
  "berma",
  "bermat",
  "bermi",
  "bernas",
  "bernga",
  "beroci",
  "beroga",
  "berok",
  "berokat",
  "beron",
  "beronang",
  "berondok",
  "berondong",
  "berong",
  "berongkos",
  "berongsang",
  "berongsong",
  "beronjong",
  "beronok",
  "beronsang",
  "berontak",
  "berosot",
  "beroti",
  "beroya",
  "bersat",
  "bersih",
  "bersil",
  "bersin",
  "bersit",
  "bersut",
  "bertam",
  "bertih",
  "beru",
  "beruang",
  "beruas",
  "berubuh",
  "berudu",
  "berui",
  "beruju",
  "berujul",
  "beruk",
  "berumbun",
  "berumbung",
  "berunai",
  "berunang",
  "berungut",
  "beruntus",
  "beruri",
  "berus",
  "berwari",
  "berzanji",
  "besalen",
  "besan",
  "besar",
  "besek",
  "besel",
  "besengek",
  "beser",
  "besero",
  "beset",
  "besi",
  "besikal",
  "besing",
  "besit",
  "beskal",
  "beskap",
  "beskat",
  "beslah",
  "beslit",
  "besok",
  "besot",
  "bestari",
  "bestek",
  "bestel",
  "bestialitas",
  "bestik",
  "bestir",
  "bestral",
  "besuk",
  "besusu",
  "besut",
  "besuta",
  "bet",
  "beta",
  "betah",
  "betahak",
  "betak-betak",
  "betang",
  "betapa",
  "betara",
  "betari",
  "betas",
  "betatas",
  "betatron",
  "betau",
  "betet",
  "beti",
  "betik",
  "betina",
  "beting",
  "betinga",
  "betis",
  "betok",
  "beton",
  "betonisasi",
  "betot",
  "betul",
  "betung",
  "betutu",
  "bewok",
  "bhayangkara",
  "biadab",
  "biadat",
  "biadi",
  "biah",
  "biak",
  "biang",
  "bianglala",
  "biaperi",
  "biar",
  "biara",
  "biarpet",
  "biarpun",
  "bias",
  "biasa",
  "biat",
  "biau",
  "biawak",
  "biawan",
  "biawas",
  "biaya",
  "bibel",
  "bibi",
  "bibinda",
  "bibir",
  "bibit",
  "biblio",
  "bibliografi",
  "bibliomania",
  "bibliotek",
  "bicana",
  "bicara",
  "bicokok",
  "bicu",
  "bida",
  "bidadari",
  "bidah",
  "bidai",
  "bidak",
  "bidal",
  "bidan",
  "bidang",
  "bidar",
  "bidara",
  "bidari",
  "bidas",
  "bidet",
  "bidik",
  "bido",
  "biduan",
  "biduanda",
  "biduanita",
  "biduk",
  "bidur",
  "biduri",
  "bienial",
  "biennale",
  "bifasial",
  "bifida",
  "bigair",
  "bigami",
  "bigamis",
  "bihi",
  "bihun",
  "bijak",
  "bijaksana",
  "bijan",
  "bijana",
  "biji",
  "bijih",
  "bik",
  "bikameral",
  "bikang",
  "bikarbonat",
  "bikin",
  "bikini",
  "bikir",
  "bikonkaf",
  "bikonveks",
  "bikromat",
  "biksah",
  "biksu",
  "biksuni",
  "biku",
  "bila",
  "bilabial",
  "bilah",
  "bilai",
  "bilakmata",
  "bilal",
  "bilamana",
  "bilamasa",
  "bilang",
  "bilas",
  "bilateral",
  "bilateralisme",
  "bilga",
  "bilhak",
  "biliar",
  "bilik",
  "bilineal",
  "bilingual",
  "bilingualisme",
  "bilis",
  "biliun",
  "billahi",
  "bilokal",
  "bilur",
  "bilyet",
  "bimasakti",
  "bimbang",
  "bimbing",
  "bimbit",
  "bimetal",
  "bin",
  "bina",
  "binal",
  "binar",
  "binara",
  "binaraga",
  "binasa",
  "binatak",
  "binatang",
  "binatu",
  "binawah",
  "binayah",
  "bincacak",
  "bincang",
  "bincang-bincut",
  "bincu",
  "bincul",
  "bincut",
  "bindam",
  "bindeng",
  "binder",
  "bindu",
  "bineka",
  "binen",
  "biner",
  "bingas",
  "bingit",
  "bingka",
  "bingkah",
  "bingkai",
  "bingkas",
  "bingkatak",
  "bingkis",
  "bingung",
  "bini",
  "binjai",
  "binjat",
  "binokular",
  "binomial",
  "bintak",
  "bintal",
  "bintalak",
  "bintan",
  "bintang",
  "bintara",
  "binti",
  "bintik",
  "bintil",
  "bintit",
  "bintul",
  "bintulbahar",
  "bintur",
  "binturung",
  "biodata",
  "biodin",
  "biofera",
  "biofilm",
  "biofilter",
  "biofisik",
  "biofisika",
  "biogas",
  "biogenesis",
  "biogenik",
  "biogeografi",
  "biografi",
  "biokimia",
  "bioklimatologi",
  "biola",
  "biolinguistik",
  "biolit",
  "biolog",
  "biologi",
  "biologis",
  "bioluminesensi",
  "biomassa",
  "biomekani",
  "biometeorologi",
  "biometri",
  "biometrika",
  "bionomika",
  "biopendar",
  "bioplasma",
  "biopsi",
  "bioritme",
  "bioritmik",
  "biosekuen",
  "biosfer",
  "biosida",
  "bioskop",
  "biostatika",
  "biota",
  "biotek",
  "bioteknologi",
  "biotik",
  "biotin",
  "biotoksin",
  "biotron",
  "bipatride",
  "bipolar",
  "bipolaritas",
  "bipolisentrisme",
  "biprisma",
  "bir",
  "birah",
  "birai",
  "biram",
  "birama",
  "birang",
  "biras",
  "birat",
  "biri-biri",
  "biring",
  "birit",
  "biro",
  "birofaks",
  "birokrasi",
  "birokrat",
  "birokratis",
  "birokratisasi",
  "birokratisme",
  "birsam",
  "biru",
  "bis",
  "bisa",
  "bisai",
  "bisan",
  "bisawab",
  "bisbol",
  "biseksual",
  "bisektris",
  "biseps",
  "bisik",
  "bising",
  "bisinosis",
  "biskuit",
  "bismillah",
  "bismut",
  "bisnis",
  "bison",
  "bissu",
  "bistik",
  "bisu",
  "bisul",
  "bit",
  "biti",
  "biting",
  "bitisik",
  "bitumen",
  "biuku",
  "biumbai",
  "bius",
  "biut",
  "bivak",
  "biverbal",
  "biyuh-biyuh",
  "bizurai",
  "blabar",
  "blabitisme",
  "blakblakan",
  "blangko",
  "blantik",
  "blantika",
  "blaster",
  "blastostil",
  "blazer",
  "blek",
  "blekek",
  "blekok",
  "blenda",
  "blender",
  "blepot",
  "blewah",
  "blirik",
  "blog",
  "bloger",
  "blok",
  "blokade",
  "blokir",
  "bloknot",
  "blong",
  "blower",
  "bludrek",
  "blues",
  "blus",
  "blustru",
  "bobato",
  "bobok",
  "bobol",
  "bobos",
  "bobot",
  "bobotok",
  "bobrok",
  "bocah",
  "bocok",
  "bocong",
  "bocor",
  "bodhi",
  "bodhisatwa",
  "bodi",
  "bodoh",
  "bodok",
  "bodong",
  "bodor",
  "boga",
  "bogam",
  "bogel",
  "bogem",
  "bogi",
  "bogol",
  "bogor",
  "bogot",
  "bohemian",
  "bohlam",
  "bohong",
  "bohorok",
  "bohsia",
  "boi",
  "boikot",
  "bois",
  "bokar",
  "bokca",
  "bokek",
  "boko",
  "bokoh",
  "bokong",
  "bokop",
  "bokor",
  "boks",
  "boksen",
  "bokser",
  "bokset",
  "boksu",
  "boku",
  "bol",
  "bola",
  "bolak",
  "bolak-balik",
  "bolang-baling",
  "boleh",
  "bolero",
  "bolide",
  "boling",
  "bolometer",
  "bolong",
  "bolos",
  "bolot",
  "bolotu",
  "bolpoin",
  "bolsak",
  "bolu",
  "bom",
  "bombai",
  "bombardemen",
  "bombardir",
  "bombas",
  "bombastis",
  "bomber",
  "bomoh",
  "bomseks",
  "bon",
  "bonafide",
  "bonafiditas",
  "bonang",
  "bonanza",
  "bonar",
  "bonbon",
  "boncel",
  "bonceng",
  "boncol",
  "boncong",
  "bondol",
  "bondong",
  "bondot",
  "boneka",
  "bonet",
  "bong",
  "bongak",
  "bonggol",
  "bongkah",
  "bongkak",
  "bongkar",
  "bongkar-bangkir",
  "bongkin",
  "bongko",
  "bongkol",
  "bongkong",
  "bongkor",
  "bongkot",
  "bongkrek",
  "bonglai",
  "bongmeh",
  "bongo",
  "bongok",
  "bongsang",
  "bongsor",
  "bonjol",
  "bonjor",
  "bonsai",
  "bontak",
  "bonto",
  "bontok",
  "bontot",
  "bonus",
  "bonyok",
  "bopeng",
  "boplang",
  "bopok",
  "bopong",
  "bor",
  "bora",
  "borak",
  "boraks",
  "borang",
  "borat",
  "borci",
  "border",
  "bordes",
  "bordil",
  "bordir",
  "bordu",
  "boreal",
  "boreh",
  "borek",
  "borgol",
  "borhan",
  "borjuasi",
  "borjuis",
  "borkol",
  "boro-boro",
  "borok",
  "boron",
  "borong",
  "boros",
  "bortel",
  "bos",
  "bosan",
  "boseta",
  "bosman",
  "boson",
  "bosor",
  "bosun",
  "bot",
  "bota",
  "botak",
  "botang",
  "botani",
  "botanikus",
  "botanis",
  "botelir",
  "botlir",
  "boto",
  "botoh",
  "botok",
  "botol",
  "botor",
  "botridium",
  "botulisme",
  "bowo",
  "boya",
  "boyak",
  "boyas",
  "boyo-boyo",
  "boyong",
  "boyongan",
  "bozah",
  "bradikardi",
  "brahma",
  "brahmana",
  "brahmani",
  "brahmi",
  "brahmin",
  "braille",
  "brakiasi",
  "brakilogi",
  "brakisefalik",
  "brakistokron",
  "brakiurus",
  "braktea",
  "bramacorah",
  "brambang",
  "brana",
  "brander",
  "brankar",
  "brankas",
  "branwir",
  "braseri",
  "brata",
  "bratawali",
  "bredel",
  "breksi",
  "breksia",
  "brem",
  "bren",
  "brendi",
  "brengsek",
  "bretel",
  "brevet",
  "brifing",
  "brigade",
  "brigadir",
  "brigidig",
  "briket",
  "brilian",
  "briofita",
  "briologi",
  "briozoa",
  "brisan",
  "broiler",
  "brokade",
  "brokat",
  "broker",
  "brokoli",
  "brom",
  "bromat",
  "bromida",
  "bromin",
  "bromisme",
  "brompit",
  "brongkos",
  "bronkioli",
  "bronkitis",
  "bronkodilator",
  "bronkotomi",
  "bronkus",
  "brontosaurus",
  "bros",
  "brosur",
  "browser",
  "bruder",
  "bruk",
  "brunai",
  "brutal",
  "brutalisme",
  "bruto",
  "bua",
  "buah",
  "buai",
  "buak",
  "bual",
  "buana",
  "buang",
  "buani",
  "buar",
  "buari",
  "buas",
  "buat",
  "buaya",
  "bubar",
  "bubo",
  "bubu",
  "bubuh",
  "bubuhan",
  "bubuk",
  "bubul",
  "bubun",
  "bubung",
  "bubur",
  "bubus",
  "bubut",
  "bucu",
  "budak",
  "budanco",
  "budaya",
  "buddha",
  "buddhis",
  "buddhisme",
  "bude",
  "budek",
  "budi",
  "budian",
  "budiman",
  "budu",
  "buduk",
  "budur",
  "bueng",
  "bufer",
  "bufet",
  "bugar",
  "bugenfil",
  "bugenvil",
  "bugi-bugi",
  "bugil",
  "buhuk",
  "buhul",
  "bui",
  "buih",
  "buil",
  "bujal",
  "bujam",
  "bujang",
  "bujangga",
  "bujet",
  "bujeter",
  "bujuk",
  "bujur",
  "bujut",
  "buk",
  "buka",
  "bukan",
  "bukankah",
  "bukantah",
  "bukat",
  "bukau",
  "buket",
  "bukit",
  "buklet",
  "bukti",
  "buku",
  "bukung",
  "bukur",
  "bukut",
  "bulai",
  "bulak",
  "bulan",
  "bulang",
  "bulang-baling",
  "bulangan",
  "bular",
  "bulat",
  "bulbul",
  "buldan",
  "buldog",
  "buldoser",
  "bule",
  "buleng",
  "buletin",
  "bulevar",
  "bulgur",
  "buli-buli",
  "bulian",
  "bulimia",
  "bulir",
  "bulsak",
  "bulu",
  "bulug",
  "buluh",
  "buluk",
  "bulur",
  "bulus",
  "bum",
  "bumantara",
  "bumban",
  "bumbu",
  "bumbun",
  "bumbung",
  "bumel",
  "bumerang",
  "bumi",
  "bumiah",
  "bumiputra",
  "bumper",
  "bumpet",
  "bumping",
  "bun",
  "buna",
  "bunbunan",
  "buncah",
  "buncak",
  "buncang",
  "buncis",
  "buncit",
  "bunda",
  "bundak",
  "bundar",
  "bundas",
  "bundel",
  "bunduk",
  "bundung",
  "bung",
  "bunga",
  "bungalo",
  "bungar",
  "bungkal",
  "bungkam",
  "bungkang",
  "bungkas",
  "bungker",
  "bungkil",
  "bungking",
  "bungkuk",
  "bungkul",
  "bungkus",
  "bunglai",
  "bunglon",
  "bungsil",
  "bungsu",
  "bungur",
  "buni",
  "bunian",
  "bunjai",
  "buntak",
  "buntal",
  "buntang",
  "buntar",
  "buntat",
  "buntek",
  "buntel",
  "buntet",
  "buntil",
  "bunting",
  "buntu",
  "buntung",
  "buntut",
  "bunuh",
  "bunut",
  "bunyi",
  "bupala",
  "bupati",
  "bupet",
  "bur",
  "bura",
  "burai",
  "burak",
  "burakah",
  "buraksa",
  "buram",
  "buras",
  "burat",
  "burayak",
  "burdah",
  "bureng",
  "buret",
  "burgundi",
  "burhan",
  "burik",
  "burit",
  "burjusumbulat",
  "burkak",
  "burnout",
  "buron",
  "bursa",
  "buru",
  "buruh",
  "buruj",
  "buruk",
  "burun",
  "burung",
  "burut",
  "bus",
  "busa",
  "busai",
  "busana",
  "busar",
  "buset",
  "bushido",
  "busi",
  "busik",
  "bustan",
  "buster",
  "busuk",
  "busung",
  "busur",
  "busut",
  "buta",
  "butadiena",
  "butala",
  "butana",
  "butang",
  "butarepan",
  "butbut",
  "butek",
  "butik",
  "butir",
  "butirat",
  "butongpai",
  "butuh",
  "butul",
  "butun",
  "butut",
  "buwuh",
  "buya",
  "buyar",
  "buyung",
  "buyur",
  "buyut",
  "byarpet",
  "caba",
  "cabai",
  "cabak",
  "cabang",
  "cabar",
  "cabau",
  "cabe",
  "cabik",
  "cabir",
  "cabo",
  "cabuh",
  "cabuk",
  "cabul",
  "cabur",
  "cabut",
  "caca",
  "cacah",
  "cacak",
  "cacap",
  "cacar",
  "cacat",
  "cacau",
  "caci",
  "cacibar",
  "cacil",
  "cacing",
  "cadai",
  "cadang",
  "cadar",
  "cadas",
  "cadel",
  "cadik",
  "cadok",
  "caduk",
  "cadung",
  "caem",
  "cagak",
  "cagar",
  "cagil",
  "cagu",
  "caguh",
  "cagun",
  "cagut",
  "cah",
  "cahang",
  "cahar",
  "cahari",
  "cahaya",
  "cahi",
  "cailah",
  "caima",
  "caing",
  "cair",
  "cais",
  "caisim",
  "cak",
  "cakah",
  "cakak",
  "cakalang",
  "cakalele",
  "cakap",
  "cakar",
  "cakawari",
  "cakela",
  "cakep",
  "caki",
  "cakiak",
  "cakil",
  "cakmar",
  "cako",
  "cakra",
  "cakrabirawa",
  "cakrabuana",
  "cakram",
  "cakrawala",
  "cakruk",
  "cakup",
  "cakur",
  "cakus",
  "cal",
  "calabikang",
  "caladi",
  "calak",
  "calang",
  "calar",
  "calecer",
  "calempong",
  "caling",
  "calir",
  "calit",
  "calo",
  "calon",
  "calui",
  "caluk",
  "calung",
  "calus",
  "cam",
  "camar",
  "camat",
  "camau",
  "cambahan",
  "cambang",
  "cambuk",
  "cambul",
  "cambung",
  "camca",
  "camil",
  "campa",
  "campah",
  "campak",
  "campang",
  "campin",
  "camping",
  "camplungan",
  "campuh",
  "campung",
  "campur",
  "camuk",
  "camur",
  "canai",
  "canak",
  "canang",
  "cancan",
  "cancang",
  "cancut",
  "canda",
  "candai",
  "candak",
  "candala",
  "candang",
  "candat",
  "candi",
  "candik",
  "candit",
  "candra",
  "candradimuka",
  "candramawa",
  "candrasa",
  "candrasengkala",
  "candu",
  "candung",
  "cang",
  "cangah",
  "cangak",
  "cangam",
  "cangap",
  "cangar",
  "cangcang",
  "cangga",
  "canggaan",
  "canggah",
  "canggai",
  "canggal",
  "cangget",
  "canggih",
  "canggu",
  "canggung",
  "cangkang",
  "cangkat",
  "cangkel",
  "cangkih",
  "cangking",
  "cangkir",
  "cangklong",
  "cangkok",
  "cangkol",
  "cangkrang",
  "cangkrim",
  "cangkriman",
  "cangkring",
  "cangkuk",
  "cangkul",
  "cangkulan",
  "cangkum",
  "cangkung",
  "cangkup",
  "canguk",
  "cangut",
  "cantas",
  "cante",
  "cantel",
  "canteng",
  "cantik",
  "canting",
  "cantol",
  "cantrik",
  "cantum",
  "caos",
  "cap",
  "capa",
  "capah",
  "capai",
  "capak",
  "capal",
  "capang",
  "capar",
  "capcai",
  "cape",
  "capek",
  "capelin",
  "capgome",
  "capik",
  "capil",
  "caping",
  "capit",
  "capjiki",
  "caplak",
  "caplok",
  "capuk",
  "capung",
  "cara",
  "carah",
  "carak",
  "caraka",
  "caram",
  "caran",
  "carang",
  "caren",
  "cari",
  "carik",
  "caring",
  "carter",
  "caruk",
  "carut",
  "cas",
  "casciscus",
  "cat",
  "catat",
  "catek",
  "catu",
  "catuk",
  "catur",
  "caturjalma",
  "caturlarik",
  "caturtunggal",
  "caturwangsa",
  "caturwarga",
  "caturwarna",
  "caturwulan",
  "catut",
  "caul",
  "caung",
  "cawai",
  "cawak",
  "cawan",
  "cawangan",
  "cawat",
  "cawe-cawe",
  "cawi",
  "cawis",
  "cebak",
  "ceban",
  "cebik",
  "cebikas",
  "cebil",
  "cebir",
  "cebis",
  "cebok",
  "cebol",
  "cebong",
  "cebur",
  "cecah",
  "cecak",
  "cecap",
  "cecar",
  "cecawi",
  "cece",
  "ceceh",
  "ceceng",
  "cecengklok",
  "cecer",
  "cecere",
  "cecok",
  "cecongor",
  "cecunguk",
  "cedal",
  "cedayam",
  "cedera",
  "ceding",
  "cedok",
  "cedong",
  "ceduk",
  "cegah",
  "cegak",
  "cegar",
  "cegat",
  "ceguk",
  "cek",
  "cekah",
  "cekak",
  "cekakak",
  "cekakan",
  "cekal",
  "cekam",
  "cekang",
  "cekarau",
  "cekat",
  "cekau",
  "cekcekcek",
  "cekcok",
  "cekdam",
  "cekdel",
  "cekek",
  "cekel",
  "ceker",
  "cekeram",
  "ceki",
  "cekibar",
  "cekih",
  "cekik",
  "cekikik",
  "ceking",
  "cekit",
  "ceklek",
  "cekluk",
  "cekok",
  "cekrem",
  "cekres",
  "ceku",
  "cekuh",
  "cekuk",
  "cekung",
  "cekup",
  "cekur",
  "cekut",
  "cela",
  "celaga",
  "celah",
  "celak",
  "celaka",
  "celampak",
  "celana",
  "celang",
  "celangak",
  "celangak-celinguk",
  "celangap",
  "celapak",
  "celar",
  "celari",
  "celas",
  "celas-celus",
  "celat",
  "celatuk",
  "cele",
  "celebuk",
  "celedang-celedok",
  "celek",
  "celekeh",
  "celemek",
  "celemotan",
  "celempong",
  "celempung",
  "celeng",
  "celengan",
  "celengkak-celengkok",
  "celengkang",
  "celentang",
  "celep",
  "celepik",
  "celepuk",
  "celetuk",
  "celi",
  "celih",
  "celik",
  "celinguk",
  "celingus",
  "celis",
  "celok",
  "celomes",
  "celomok",
  "celonok",
  "celopar",
  "celorot",
  "celoteh",
  "celsius",
  "celuk",
  "celum",
  "celung",
  "celup",
  "celupak",
  "celur",
  "celuring",
  "celurit",
  "celurut",
  "celus",
  "celutak",
  "celutuk",
  "cema",
  "cemani",
  "cemar",
  "cemara",
  "cemas",
  "cemat",
  "cembeng",
  "cemberut",
  "cembul",
  "cembung",
  "cemburu",
  "cemeeh",
  "cemeh",
  "cemek",
  "cemekian",
  "cemengkian",
  "cemer",
  "cemerlang",
  "cemeti",
  "cemetuk",
  "cemomot",
  "cemong",
  "cemooh",
  "cempa",
  "cempaka",
  "cempal",
  "cempala",
  "cempana",
  "cempe",
  "cempedak",
  "cempek",
  "cempelik",
  "cempelung",
  "cempeng",
  "cempera",
  "cemperai",
  "cemperling",
  "cempiang",
  "cempil",
  "cempin",
  "cemping",
  "cemplang",
  "cemplung",
  "cempor",
  "cempreng",
  "cempres",
  "cempuling",
  "cempung",
  "cempurit",
  "cemuas",
  "cemuk",
  "cena",
  "cenak",
  "cenal-cenil",
  "cenangau",
  "cenangga",
  "cenangkas",
  "cenayang",
  "cencala",
  "cencaluk",
  "cencang",
  "cencaru",
  "cencawan",
  "cencawi",
  "cendala",
  "cendana",
  "cendang",
  "cendawan",
  "cendekia",
  "cendera",
  "cenderai",
  "cenderasa",
  "cenderawasih",
  "cenderung",
  "cendok",
  "cendol",
  "cenduai",
  "cenela",
  "ceng",
  "cengal",
  "cengam",
  "cengang",
  "cengap",
  "cengar-cengir",
  "cengbeng",
  "cengeh",
  "cengek",
  "cengeng",
  "cengengesan",
  "cenggek",
  "cengger",
  "cenggeret",
  "cengi",
  "cengir-cengir",
  "cengis",
  "cengkal",
  "cengkam",
  "cengkar",
  "cengkaruk",
  "cengkau",
  "cengkedi",
  "cengkeh",
  "cengkek",
  "cengkelong",
  "cengkeram",
  "cengkerama",
  "cengkerawak",
  "cengkerik",
  "cengkering",
  "cengkerung",
  "cengki",
  "cengkiak",
  "cengkih",
  "cengking",
  "cengkir",
  "cengkiwing",
  "cengkok",
  "cengkol",
  "cengkong",
  "cengkung",
  "cengkurai",
  "cengli",
  "cengung",
  "cengut",
  "centang",
  "centangan",
  "centeng",
  "centet",
  "centil",
  "centong",
  "centung",
  "cenung",
  "cepak",
  "cepal",
  "cepat",
  "cepek",
  "cepeng",
  "cepengan",
  "ceper",
  "cepiau",
  "ceplas-ceplos",
  "ceples",
  "ceplok",
  "ceplos",
  "cepo",
  "cepol",
  "cepu",
  "cepuk",
  "cerabah",
  "cerabih",
  "cerabut",
  "ceracak",
  "ceracam",
  "ceracap",
  "ceracau",
  "cerah",
  "cerai",
  "cerai-berai",
  "cerak",
  "ceraka",
  "cerakin",
  "ceramah",
  "cerana",
  "cerancang",
  "cerang",
  "ceranggah",
  "cerangka",
  "cerap",
  "cerat",
  "ceratai",
  "ceratuk",
  "cerau",
  "cerawat",
  "cerbak",
  "cerca",
  "cercah",
  "cercak",
  "cercap",
  "cerdas",
  "cerdik",
  "cere",
  "cerecek",
  "cerek",
  "ceremai",
  "cerempung",
  "cerepu",
  "ceret",
  "cerewet",
  "cergas",
  "ceri",
  "ceria",
  "cericap",
  "cericau",
  "cericip",
  "ceriga",
  "cerih",
  "cerita",
  "ceriwis",
  "cerkam",
  "cerkau",
  "cerlang",
  "cerlih",
  "cerling",
  "cermai",
  "cermat",
  "cermin",
  "cerna",
  "ceroboh",
  "cerobong",
  "cerocok",
  "cerocos",
  "cerompong",
  "ceronggah",
  "ceropong",
  "ceroteh",
  "cerowok",
  "cerpelai",
  "cerpen",
  "cerpenis",
  "cerpu",
  "cerucuh",
  "cerucup",
  "ceruh",
  "ceruk",
  "cerun",
  "cerup",
  "cerut",
  "cerutu",
  "cespleng",
  "cetai",
  "cetak",
  "cetar",
  "cetek",
  "ceteng",
  "ceter",
  "cetera",
  "ceteri",
  "ceteria",
  "ceti",
  "cetok",
  "cetus",
  "ceuki",
  "cewang",
  "cewek",
  "ciak",
  "cialat",
  "ciap",
  "ciar",
  "cibir",
  "cibit",
  "ciblon",
  "cibuk",
  "cicik",
  "cicil",
  "cicinda",
  "cicip",
  "cicit",
  "cidomo",
  "ciduk",
  "cigak",
  "cih",
  "cihui",
  "cik",
  "cika",
  "cikadas",
  "cikal",
  "cikar",
  "cikok",
  "cikrak",
  "ciku",
  "cikun",
  "cikut",
  "cilap",
  "cilawagi",
  "cili",
  "cilik",
  "ciling",
  "cilok",
  "ciluk",
  "cilukba",
  "cimplong",
  "cina",
  "cincang",
  "cincau",
  "cincin",
  "cincong",
  "cincu",
  "cinda",
  "cindai",
  "cindaku",
  "cinde",
  "cindil",
  "cindur",
  "cing",
  "cingak",
  "cingam",
  "cingangah",
  "cingge",
  "cingkat",
  "cingkeh",
  "cingkrang",
  "cingur",
  "cinta",
  "cintamani",
  "cinteng",
  "cintrong",
  "cip",
  "cipai",
  "cipan",
  "ciplak",
  "cipok",
  "ciprat",
  "cipta",
  "cir",
  "circir",
  "ciri",
  "cirit",
  "ciriwangi",
  "cis",
  "cit",
  "cita",
  "citra",
  "citraleka",
  "ciu",
  "cium",
  "ciut",
  "coak",
  "coang",
  "coba",
  "coban",
  "cobar-cabir",
  "cobek",
  "coblos",
  "cocok",
  "cocol",
  "cocor",
  "codak",
  "codet",
  "codot",
  "cogah",
  "cogan",
  "cogok",
  "cok",
  "cokar",
  "cokek",
  "cokelat",
  "coket",
  "coklat",
  "cokmar",
  "coko",
  "cokok",
  "cokol",
  "cokor",
  "cokorda",
  "cola-cala",
  "colak",
  "colak-caling",
  "colang-caling",
  "colek",
  "coleng",
  "colet",
  "coli",
  "colok",
  "colong",
  "colot",
  "comat-comot",
  "comberan",
  "comblang",
  "combong",
  "comek",
  "comel",
  "comor",
  "comot",
  "compang-camping",
  "compeng",
  "compes",
  "compoh",
  "compreng",
  "comro",
  "concong",
  "condong",
  "conet",
  "congak",
  "congeh",
  "congek",
  "conggah-canggih",
  "congget",
  "conggok",
  "congkah-cangkih",
  "congkah-mangkih",
  "congkak",
  "congkel",
  "congki",
  "congklak",
  "congklang",
  "congkok",
  "congkong",
  "congo",
  "congok",
  "congol",
  "congor",
  "congsam",
  "contek",
  "conteng",
  "contoh",
  "contong",
  "cop",
  "copak-capik",
  "copet",
  "coplok",
  "copot",
  "cor",
  "corak",
  "corat-coret",
  "corek",
  "coreng",
  "coret",
  "coro",
  "corob",
  "corong",
  "corot",
  "cotet",
  "cotok",
  "cowok",
  "cowokan",
  "crat-crit",
  "criping",
  "cua",
  "cuaca",
  "cuai",
  "cuak",
  "cual",
  "cuang",
  "cuar",
  "cuat",
  "cubit",
  "cublik",
  "cubung",
  "cuca",
  "cucakrawa",
  "cuci",
  "cucu",
  "cucuh",
  "cucuk",
  "cucun",
  "cucunda",
  "cucung",
  "cucup",
  "cucur",
  "cucurut",
  "cucut",
  "cudang",
  "cuek",
  "cugat",
  "cuh",
  "cuik",
  "cuil",
  "cuit",
  "cuk",
  "cuka",
  "cukai",
  "cuki",
  "cukil",
  "cukimai",
  "cukin",
  "cukit",
  "cukong",
  "cuku",
  "cukup",
  "cukur",
  "cula",
  "culak",
  "culan",
  "culas",
  "culi",
  "culiah",
  "culik",
  "culika",
  "culim",
  "culun",
  "cuma",
  "cuman",
  "cumbu",
  "cumengkling",
  "cumepak",
  "cumi-cumi",
  "cumil",
  "cuming",
  "cun",
  "cunam",
  "cundang",
  "cundrik",
  "cunduk",
  "cung",
  "cungap",
  "cungkil",
  "cungkup",
  "cungo",
  "cungul",
  "cungur",
  "cunia",
  "cup",
  "cupai",
  "cupak",
  "cupang",
  "cupar",
  "cupet",
  "cuping",
  "cuplik",
  "cupu",
  "cupul",
  "cur",
  "cura",
  "curah",
  "curai",
  "curam",
  "curang",
  "curat",
  "cureng",
  "curi",
  "curiah",
  "curiga",
  "curik",
  "curna",
  "curu",
  "cus",
  "cut",
  "cutak",
  "cutbrai",
  "cutel",
  "cuti",
  "cuwil",
  "daayah",
  "dab",
  "daba",
  "dabak",
  "dabal",
  "dabat",
  "dabih",
  "dabik",
  "dabing",
  "dabir",
  "dabit",
  "dablek",
  "dabol",
  "dabung",
  "dabus",
  "dacin",
  "dad",
  "dada",
  "dadah",
  "dadaisme",
  "dadak",
  "dadal",
  "dadali",
  "dadap",
  "dadar",
  "dadek",
  "dadi",
  "dadih",
  "dading",
  "dadu",
  "daduh",
  "daduk",
  "dadung",
  "daeng",
  "daerah",
  "daerahisme",
  "dafnah",
  "daftar",
  "daga",
  "dagang",
  "dage",
  "dagel",
  "dagi",
  "daging",
  "dagu",
  "dah",
  "dahaga",
  "dahagi",
  "dahak",
  "daham",
  "dahan",
  "dahanam",
  "dahar",
  "dahi",
  "dahiat",
  "dahina",
  "dahlia",
  "dahriah",
  "dahsyat",
  "dahulu",
  "dai",
  "daidan",
  "daidanco",
  "daif",
  "daim",
  "daiman",
  "daing",
  "daitia",
  "dajal",
  "daka",
  "dakah",
  "dakaik",
  "dakar",
  "dakhil",
  "daki",
  "dakik",
  "dakocan",
  "dakon",
  "dakron",
  "daksa",
  "daksina",
  "daktil",
  "daktilitis",
  "daktilologi",
  "daktiloskopi",
  "daku",
  "dakwa",
  "dakwah",
  "dal",
  "dalal",
  "dalalah",
  "dalalat",
  "dalam",
  "dalang",
  "daldaru",
  "dalem",
  "dalfin",
  "dali-dali",
  "dalih",
  "dalil",
  "daltonisme",
  "dalu",
  "daluang",
  "dalung",
  "dam",
  "damah",
  "damai",
  "damak",
  "damal",
  "daman",
  "damar",
  "damaru",
  "damas",
  "damat",
  "damba",
  "dambin",
  "dambir",
  "dame",
  "damen",
  "dami",
  "damik",
  "damotin",
  "dampak",
  "dampal",
  "dampan",
  "dampar",
  "dampeng",
  "dampil",
  "damping",
  "dampit",
  "damprat",
  "dampung",
  "dan",
  "dana",
  "danau",
  "danawa",
  "danda",
  "dandan",
  "dandang",
  "dandanggula",
  "dandapati",
  "dandi",
  "dang",
  "dangai",
  "dangar",
  "dangau",
  "dangdut",
  "dange",
  "danghyang",
  "dangir",
  "dangka",
  "dangkal",
  "dangkap",
  "dangkar",
  "dangkung",
  "danguk",
  "dansa",
  "dansanak",
  "danta",
  "danuh",
  "danur",
  "danyang",
  "dap",
  "dapa",
  "dapar",
  "dapat",
  "dapra",
  "dapur",
  "dar",
  "dara",
  "darab",
  "darah",
  "daras",
  "darat",
  "darau",
  "dargah",
  "dari",
  "daripada",
  "darji",
  "darma",
  "darmabakti",
  "darmakelana",
  "darmasiswa",
  "darmatirta",
  "darmawisata",
  "daro",
  "darpana",
  "daru-daru",
  "darulaitam",
  "darulakhirat",
  "darulbaka",
  "darulfana",
  "daruljalal",
  "darun",
  "darunu",
  "darurat",
  "darusalam",
  "darwis",
  "das",
  "dasa",
  "dasalomba",
  "dasar",
  "dasarian",
  "dasasila",
  "dasatitah",
  "dasawarsa",
  "dasbor",
  "dasi",
  "dasin",
  "daster",
  "dasun",
  "data",
  "datang",
  "datar",
  "datatamak",
  "dati",
  "datif",
  "datu",
  "datuk",
  "datum",
  "datung",
  "dauk",
  "daulat",
  "daun",
  "daur",
  "dawai",
  "dawan",
  "dawat",
  "dawet",
  "daya",
  "dayah",
  "dayang",
  "dayu",
  "dayuh",
  "dayuk",
  "dayung",
  "dayus",
  "dealat",
  "deaneksasi",
  "debah",
  "debak",
  "debam",
  "debap",
  "debar",
  "debarkasi",
  "debas",
  "debat",
  "debet",
  "debik",
  "debil",
  "debing",
  "debirokratisasi",
  "debit",
  "debitase",
  "debitor",
  "debitur",
  "debris",
  "debu",
  "debug",
  "debuk",
  "debum",
  "debun",
  "debung",
  "debup",
  "debur",
  "debus",
  "debut",
  "decak",
  "decap",
  "deceh",
  "decing",
  "decit",
  "decup",
  "decur",
  "decut",
  "dedah",
  "dedai",
  "dedak",
  "dedal",
  "dedalu",
  "dedap",
  "dedar",
  "dedara",
  "dedare",
  "dedas",
  "dedau",
  "dedek",
  "dedel",
  "dedemit",
  "dedengkot",
  "deder",
  "dederuk",
  "dedes",
  "dedikasi",
  "dedikatif",
  "deduksi",
  "deduktif",
  "dedulang",
  "deeskalasi",
  "defaitisme",
  "defekasi",
  "defender",
  "defensi",
  "defensif",
  "deferens",
  "defile",
  "definisi",
  "definit",
  "definitif",
  "defisien",
  "defisit",
  "deflagrasi",
  "deflagrator",
  "deflasi",
  "defleksi",
  "deflorasi",
  "defoliasi",
  "defolisasi",
  "defonologisasi",
  "deforestasi",
  "deformasi",
  "deformatif",
  "deg",
  "degam",
  "degan",
  "degap",
  "degar",
  "degen",
  "degenerasi",
  "degeneratif",
  "degil",
  "deging",
  "degradasi",
  "degresi",
  "deguk",
  "degum",
  "degung",
  "degup",
  "deh",
  "deham",
  "dehem",
  "dehidrasi",
  "dehidrat",
  "dehidrogenasi",
  "dehumanisasi",
  "deideologisasi",
  "deifikasi",
  "deiksis",
  "deiktis",
  "deislamisasi",
  "deisme",
  "dek",
  "dekade",
  "dekaden",
  "dekadensi",
  "dekagram",
  "dekah",
  "dekak",
  "dekaliter",
  "dekam",
  "dekameter",
  "dekan",
  "dekanal",
  "dekantasi",
  "dekap",
  "dekapoda",
  "dekar",
  "dekare",
  "dekat",
  "dekik",
  "dekil",
  "deking",
  "deklamasi",
  "deklamator",
  "deklarasi",
  "deklaratif",
  "deklasifikasi",
  "deklerer",
  "deklinasi",
  "deklinometer",
  "dekode",
  "dekoder",
  "dekolonisasi",
  "dekomposer",
  "dekomposisi",
  "dekompresi",
  "dekongestan",
  "dekonsentrasi",
  "dekontekstualisasi",
  "dekor",
  "dekorasi",
  "dekoratif",
  "dekorator",
  "dekosistem",
  "dekremeter",
  "dekreolisasi",
  "dekret",
  "dekriminalisasi",
  "deksa",
  "dekstrin",
  "dekstrosa",
  "deksura",
  "deku",
  "dekunci",
  "dekung",
  "dekus",
  "dekut",
  "delabialisasi",
  "delah",
  "delamak",
  "delan",
  "delap",
  "delapan",
  "delas",
  "delat",
  "delegasi",
  "delegat",
  "delegitimasi",
  "delepak",
  "deler",
  "delik",
  "delikan",
  "delikat",
  "delikates",
  "delima",
  "delineasi",
  "delinkuen",
  "delinkuensi",
  "delirium",
  "delman",
  "delong",
  "delongop",
  "delta",
  "deltoid",
  "delu",
  "delusi",
  "delusif",
  "demabrasi",
  "demagog",
  "demagogi",
  "demagogis",
  "demah",
  "demam",
  "demang",
  "demap",
  "demarkasi",
  "dembai",
  "dembam",
  "dembun",
  "demek",
  "demen",
  "demes",
  "demi",
  "demik",
  "demikian",
  "demiliterisasi",
  "demineralisasi",
  "demisioner",
  "demo",
  "demobilisan",
  "demobilisasi",
  "demograf",
  "demografi",
  "demografis",
  "demokrasi",
  "demokrat",
  "demokratis",
  "demokratisasi",
  "demon",
  "demoniak",
  "demonopolisasi",
  "demonstran",
  "demonstrasi",
  "demonstratif",
  "demonstrativa",
  "demoralisasi",
  "demosi",
  "dempak",
  "dempam",
  "dempang",
  "demper",
  "dempet",
  "dempir",
  "demplon",
  "dempok",
  "dempuk",
  "dempul",
  "dempung",
  "demung",
  "den",
  "dena",
  "denah",
  "denai",
  "denak",
  "denasalisasi",
  "denasionalisasi",
  "denawa",
  "dencang",
  "dencing",
  "denda",
  "dendam",
  "dendang",
  "dendeng",
  "dendi",
  "dendrokronologi",
  "dendrologi",
  "denervasi",
  "dengak",
  "dengan",
  "dengap",
  "dengar",
  "dengih",
  "denging",
  "dengkang",
  "dengkel",
  "dengki",
  "dengkik",
  "dengking",
  "dengkol",
  "dengkul",
  "dengkung",
  "dengkur",
  "dengkus",
  "dengu",
  "dengue",
  "denguk",
  "dengung",
  "dengus",
  "dengut",
  "denim",
  "denok",
  "denominal",
  "denominasi",
  "denotasi",
  "denotatif",
  "densimeter",
  "densitas",
  "densitometer",
  "densitometri",
  "densometer",
  "dental",
  "dentam",
  "dentang",
  "dentat",
  "dentin",
  "denting",
  "dentum",
  "dentung",
  "dentur",
  "denudasi",
  "denuklirisasi",
  "denyar",
  "denyit",
  "denyut",
  "deodoran",
  "deoknumisasi",
  "deontologi",
  "depa",
  "depak",
  "depalatalisasi",
  "depan",
  "depang",
  "depap",
  "deparpolisasi",
  "departemen",
  "departemental",
  "departementalisasi",
  "dependen",
  "dependensi",
  "depersonalisasi",
  "depersonifikasi",
  "depigmentasi",
  "depilasi",
  "deplesi",
  "depo",
  "depolarisasi",
  "depolitisasi",
  "deponir",
  "depopulasi",
  "deportasi",
  "deposan",
  "deposit",
  "deposito",
  "depot",
  "depresi",
  "depresiasi",
  "depresor",
  "deprok",
  "deprotonasi",
  "depun",
  "depus",
  "deputasi",
  "deputi",
  "dera",
  "deragem",
  "derai",
  "derajah",
  "derajang",
  "derajat",
  "derak",
  "deram",
  "deran",
  "derana",
  "derang",
  "derap",
  "deras",
  "derau",
  "derawa",
  "derebar",
  "deregulasi",
  "derek",
  "derel",
  "derep",
  "deres",
  "deresi",
  "deret",
  "dergama",
  "derik",
  "dering",
  "deringo",
  "deris",
  "derit",
  "derita",
  "deritaan",
  "derivasi",
  "derivat",
  "derivatif",
  "derji",
  "derma",
  "dermaga",
  "derman",
  "dermatitis",
  "dermatofitosis",
  "dermatolog",
  "dermatologi",
  "dermatom",
  "dermis",
  "dermoid",
  "dersana",
  "dersik",
  "deru",
  "deruji",
  "deruk",
  "derum",
  "derun",
  "derung",
  "derup",
  "derus",
  "derut",
  "desa",
  "desah",
  "desain",
  "desainer",
  "desak",
  "desakralisasi",
  "desalinasi",
  "desaneksasi",
  "desar",
  "desas-desus",
  "desau",
  "desegregasi",
  "deselerasi",
  "desember",
  "desensitisasi",
  "desentralisasi",
  "deserebrasi",
  "desersi",
  "desertir",
  "desibel",
  "desidua",
  "desigram",
  "desih",
  "desik",
  "desikan",
  "desikator",
  "desil",
  "desiliter",
  "desiliun",
  "desimal",
  "desimeter",
  "desinens",
  "desinfeksi",
  "desinfektan",
  "desing",
  "desintegrasi",
  "desir",
  "desis",
  "desit",
  "deskripsi",
  "deskriptif",
  "deskuamasi",
  "desmonem",
  "desmoplasia",
  "desmosom",
  "desorientasi",
  "desorpsi",
  "despot",
  "despotik",
  "despotisme",
  "destabilisasi",
  "destar",
  "destinasi",
  "destroyer",
  "destruksi",
  "destruktif",
  "destruktor",
  "desuk",
  "desulfurisasi",
  "desup",
  "desur",
  "desus",
  "desut",
  "detail",
  "detak",
  "detap",
  "detar",
  "detas",
  "detasemen",
  "detasering",
  "detasir",
  "deteksi",
  "detektif",
  "detektofon",
  "detektor",
  "detenidos",
  "detensi",
  "detente",
  "detergen",
  "deteriorasi",
  "determinan",
  "determinasi",
  "determinatif",
  "determinator",
  "determinis",
  "determinisme",
  "detik",
  "deting",
  "detoksifikasi",
  "detonasi",
  "detonator",
  "detritus",
  "detrusor",
  "detup",
  "detus",
  "deuterium",
  "deuterokanonika",
  "deuteron",
  "deutranomalopia",
  "deutranopia",
  "devaluasi",
  "developer",
  "deverbal",
  "deviasi",
  "devisa",
  "devosi",
  "dewa",
  "dewadaru",
  "dewala",
  "dewan",
  "dewana",
  "dewanagari",
  "dewangga",
  "dewasa",
  "dewata",
  "dewe",
  "dewi",
  "dia",
  "diabetes",
  "diad",
  "diadem",
  "diafon",
  "diaforetik",
  "diafragma",
  "diagenesis",
  "diagnosis",
  "diagnostik",
  "diagometer",
  "diagonal",
  "diagram",
  "diaken",
  "diakon",
  "diakones",
  "diakonia",
  "diakritik",
  "diakronis",
  "dialek",
  "dialektal",
  "dialektik",
  "dialektika",
  "dialektis",
  "dialektologi",
  "dialinguistik",
  "dialisis",
  "dialog",
  "dialogis",
  "diam",
  "diamagnetisme",
  "diameter",
  "diametral",
  "diamorf",
  "dian",
  "diang",
  "diaper",
  "diapositif",
  "diar",
  "diare",
  "dias",
  "diasistem",
  "diaspora",
  "diastase",
  "diastole",
  "diat",
  "diaterman",
  "diatermi",
  "diatermik",
  "diatesis",
  "diatipe",
  "diatom",
  "diatomit",
  "diatonik",
  "diatopik",
  "diayah",
  "dibasa",
  "didaktik",
  "didaktikus",
  "didaktis",
  "didih",
  "didik",
  "didis",
  "didong",
  "dielektrik",
  "diensefalon",
  "dies",
  "diesel",
  "diet",
  "dietetika",
  "difabel",
  "diferensial",
  "diferensiasi",
  "difluens",
  "difluensi",
  "difraksi",
  "difteri",
  "diftong",
  "difusi",
  "digdaya",
  "digenesis",
  "digestif",
  "digit",
  "digital",
  "digitalin",
  "digitalis",
  "digitalisasi",
  "diglosia",
  "digraf",
  "digresi",
  "digul",
  "dihedral",
  "dihidroksil",
  "dik",
  "dikara",
  "dikau",
  "dikit",
  "diklorida",
  "dikotil",
  "dikotomi",
  "dikroisme",
  "dikromat",
  "dikromatik",
  "diksa",
  "diksi",
  "diktat",
  "diktator",
  "diktatorial",
  "diktatoris",
  "dikte",
  "diktum",
  "dil",
  "dila",
  "dilak",
  "dilam",
  "dilasi",
  "dilatasi",
  "dilatometer",
  "dilema",
  "dilematik",
  "diler",
  "diletan",
  "diluvium",
  "dim",
  "dimensi",
  "dimer",
  "diminutif",
  "dimorfik",
  "dimorfisme",
  "din",
  "dina",
  "dinamik",
  "dinamika",
  "dinamis",
  "dinamisator",
  "dinamisme",
  "dinamit",
  "dinamo",
  "dinamometer",
  "dinar",
  "dinas",
  "dinasti",
  "dinding",
  "dingin",
  "dingkis",
  "dingkit",
  "dingklang",
  "dingklik",
  "dingo",
  "dini",
  "diniah",
  "diniyah",
  "dinosaurus",
  "dinul-islam",
  "diode",
  "dioesis",
  "dioksida",
  "dioksin",
  "diopsida",
  "dioptase",
  "dioptri",
  "diorama",
  "diorit",
  "dioses",
  "dipan",
  "diplo",
  "diploid",
  "diploma",
  "diplomasi",
  "diplomat",
  "diplomatik",
  "diplomatis",
  "dipsomania",
  "diptera",
  "diptotos",
  "dirah",
  "diraja",
  "direk",
  "direksi",
  "direktorat",
  "direktorium",
  "direktris",
  "direktur",
  "dirgahayu",
  "dirgantara",
  "dirham",
  "diri",
  "dirigen",
  "diris",
  "dirus",
  "disagio",
  "disain",
  "disainer",
  "disakarida",
  "disastria",
  "disbursemen",
  "disdrometer",
  "disekuilibrium",
  "disel",
  "disensus",
  "disentri",
  "disertasi",
  "disfonia",
  "disfungsi",
  "disharmoni",
  "disiden",
  "disilabik",
  "disimilasi",
  "disinfektan",
  "disinformasi",
  "disinsentif",
  "disintegrasi",
  "disiplin",
  "disjoki",
  "disjungsi",
  "disjungtif",
  "diska",
  "disket",
  "diskiasis",
  "disklimaks",
  "disko",
  "diskoid",
  "diskon",
  "diskontinu",
  "diskontinuitas",
  "diskonto",
  "diskordans",
  "diskorobik",
  "diskotek",
  "diskredit",
  "diskrepansi",
  "diskresi",
  "diskriminasi",
  "diskriminatif",
  "diskriminator",
  "diskualifikasi",
  "diskulpasi",
  "diskursif",
  "diskus",
  "diskusi",
  "dislalia",
  "disleksia",
  "dislokasi",
  "dismembrasio",
  "dismenorea",
  "dismutasi",
  "disolventia",
  "disonansi",
  "disoperasi",
  "disorder",
  "disorganisasi",
  "disorientasi",
  "disosiasi",
  "dispareunia",
  "disparitas",
  "dispensasi",
  "dispenser",
  "dispepsia",
  "dispersal",
  "dispersi",
  "disposisi",
  "disposotio",
  "disprosium",
  "disrupsi",
  "distabilitas",
  "distal",
  "distansi",
  "distikiasis",
  "distikon",
  "distilasi",
  "distilator",
  "distingsi",
  "distingtif",
  "distoma",
  "distorsi",
  "distosia",
  "distribusi",
  "distributor",
  "distrik",
  "disuasi",
  "disuria",
  "dito",
  "ditransitif",
  "diuresis",
  "diuretik",
  "diurnal",
  "divergen",
  "divergensi",
  "diversifikasi",
  "diversitas",
  "divestasi",
  "dividen",
  "divisi",
  "diwala",
  "doa",
  "doang",
  "dobel",
  "dobi",
  "doblangan",
  "doble",
  "dobol",
  "dobolo",
  "dobrak",
  "dodekagon",
  "dodekahedron",
  "dodet",
  "dodok",
  "dodol",
  "dodong",
  "dodor",
  "dodos",
  "dodot",
  "doeloe",
  "dog",
  "dogel",
  "dogeng",
  "doger",
  "dogma",
  "dogmatik",
  "dogmatis",
  "dogmatisme",
  "dogol",
  "dohok",
  "dohyo",
  "doi",
  "dok",
  "dokar",
  "doko",
  "dokoh",
  "dokok-dokok",
  "doksologi",
  "dokter",
  "doktor",
  "doktoranda",
  "doktorandus",
  "doktrin",
  "doku",
  "dokumen",
  "dokumentasi",
  "dokumenter",
  "dol",
  "dolak-dalik",
  "dolan",
  "dolar",
  "doldrum",
  "dolfin",
  "dolikosepalik",
  "dolmen",
  "dolok",
  "dolomit",
  "dom",
  "domain",
  "domba",
  "domblong",
  "domein",
  "domestik",
  "domestikasi",
  "dominan",
  "dominansi",
  "dominasi",
  "domine",
  "dominggo",
  "dominion",
  "domino",
  "domisili",
  "domot",
  "dompak",
  "dompet",
  "domplang",
  "dompleng",
  "dompol",
  "don",
  "donasi",
  "donat",
  "donatur",
  "doncang",
  "dondang",
  "donder",
  "dondon",
  "dong",
  "dongak",
  "dongan",
  "dongbret",
  "dongeng",
  "dongkak",
  "dongkel",
  "dongkok",
  "dongkol",
  "dongkrak",
  "dongkrok",
  "dongok",
  "dongpan",
  "dongsok",
  "doni",
  "donor",
  "donto",
  "dop",
  "doping",
  "dopis",
  "dor",
  "dorang",
  "dorbi",
  "dorbia",
  "dorman",
  "dormansi",
  "dorna",
  "dorong",
  "dorsal",
  "dorslah",
  "dorsopalatal",
  "dorsovelar",
  "dorsum",
  "dortrap",
  "dos",
  "dosa",
  "dosen",
  "dosin",
  "dosir",
  "dosis",
  "dot",
  "dowel",
  "dower",
  "doyak",
  "doyan",
  "doyang",
  "doyo",
  "doyong",
  "draf",
  "dragon",
  "drai",
  "drainase",
  "drakula",
  "dram",
  "drama",
  "dramatik",
  "dramatikus",
  "dramatis",
  "dramatisasi",
  "dramaturg",
  "dramaturgi",
  "draperi",
  "drastis",
  "drat",
  "drel",
  "dresoar",
  "dresur",
  "dribel",
  "drif",
  "dril",
  "drip",
  "drop",
  "droping",
  "dropsi",
  "drum",
  "drumben",
  "drumer",
  "druwe",
  "dua",
  "duafa",
  "duai",
  "duaja",
  "dualis",
  "dualisme",
  "dualistis",
  "duane",
  "duang",
  "duangsom",
  "dub",
  "dubalang",
  "dubelir",
  "dubes",
  "dubila",
  "dubing",
  "dubius",
  "duble",
  "dublir",
  "dubuk",
  "dubur",
  "duda",
  "duduk",
  "dudur",
  "dudus",
  "duel",
  "duet",
  "duga",
  "dugal",
  "dugang",
  "dugas",
  "dugdeng",
  "dugder",
  "duh",
  "duha",
  "duhai",
  "duhe",
  "duhu",
  "duilah",
  "duit",
  "duk",
  "duka",
  "dukacarita",
  "dukacita",
  "dukan",
  "dukana",
  "dukat",
  "dukaten",
  "duktulus",
  "duktus",
  "duku",
  "dukuh",
  "dukun",
  "dukung",
  "dula",
  "dulag",
  "dulang",
  "dulang-dulang",
  "duli",
  "dulur",
  "dum",
  "dumdum",
  "dumi",
  "dumping",
  "dumung",
  "dunah",
  "dunak",
  "dung",
  "dungas",
  "dungkelan",
  "dungkul",
  "dungu",
  "dungun",
  "dunia",
  "duniawi",
  "duodenum",
  "duodesimal",
  "duodrama",
  "duopoli",
  "dup",
  "dupa",
  "dupak",
  "dupleks",
  "duplik",
  "duplikasi",
  "duplikat",
  "duplikator",
  "duplisitas",
  "duplo",
  "dur",
  "dura",
  "duralumin",
  "duramater",
  "durasi",
  "durat",
  "duratif",
  "duren",
  "dureng",
  "durhaka",
  "duri",
  "durian",
  "durias",
  "duriat",
  "durja",
  "durjana",
  "durjasa",
  "durkarsa",
  "durma",
  "durna",
  "durno",
  "durnois",
  "durnoisme",
  "durometer",
  "dursila",
  "duru",
  "duruwiksa",
  "dus",
  "dusin",
  "dusta",
  "dustur",
  "dusun",
  "duta",
  "duwegan",
  "duwet",
  "duyun",
  "duyung",
  "dwiarti",
  "dwibahasa",
  "dwidarma",
  "dwidasawarsa",
  "dwifungsi",
  "dwiganda",
  "dwiguna",
  "dwilingga",
  "dwimatra",
  "dwiminggu",
  "dwimuka",
  "dwiperan",
  "dwipurwa",
  "dwisegi",
  "dwitarung",
  "dwitunggal",
  "dwiwarna",
  "dzal",
  "ebam",
  "eban",
  "ebek",
  "ebi",
  "eboni",
  "ebonit",
  "ebro",
  "eburina",
  "ecek",
  "eceng",
  "ecer",
  "eco",
  "edafik",
  "edafit",
  "edafologi",
  "edafon",
  "edan",
  "edar",
  "edema",
  "edentat",
  "edisi",
  "edit",
  "editor",
  "editorial",
  "edukasi",
  "edukatif",
  "efedrina",
  "efek",
  "efektif",
  "efektivitas",
  "efektor",
  "efelis",
  "efendi",
  "efisien",
  "efisiensi",
  "efloresensi",
  "eforus",
  "efusi",
  "egah",
  "egalisasi",
  "egalitarian",
  "egalitarianisme",
  "egalitarisme",
  "egaliter",
  "egat",
  "ego",
  "egois",
  "egoisme",
  "egoistis",
  "egol",
  "egomania",
  "egos",
  "egosentris",
  "egosentrisitas",
  "egosentrisme",
  "egrang",
  "egresif",
  "ehe",
  "eidetik",
  "eigendom",
  "eikosan",
  "einsteinium",
  "eja",
  "ejakulasi",
  "ejan",
  "ejawantah",
  "ejek",
  "ejektif",
  "ejektor",
  "ekabahasa",
  "ekad",
  "ekajati",
  "ekakarsa",
  "ekamatra",
  "ekang",
  "ekaristi",
  "ekatantri",
  "ekbalium",
  "ekdemik",
  "ekderon",
  "ekdisis",
  "ekeh",
  "ekimosis",
  "ekiofit",
  "eklektik",
  "eklektikus",
  "eklektis",
  "eklektisisme",
  "eklektisme",
  "eklips",
  "ekliptika",
  "ekliptis",
  "eklosi",
  "ekofisiologi",
  "ekofraksia",
  "ekofrasia",
  "ekografi",
  "ekogrup",
  "ekoklimat",
  "ekoklimatologi",
  "ekokronologi",
  "ekolabel",
  "ekolalia",
  "ekologi",
  "ekologis",
  "ekon",
  "ekonom",
  "ekonometri",
  "ekonomi",
  "ekonomis",
  "ekopolitik",
  "ekopraksia",
  "ekor",
  "ekornia",
  "ekosfer",
  "ekosistem",
  "ekosistematika",
  "ekospesies",
  "ekostratigrafi",
  "ekotipe",
  "ekotipifikasi",
  "ekoturisme",
  "ekozona",
  "ekrin",
  "ekrinologi",
  "eks",
  "eksak",
  "eksakta",
  "eksaltasi",
  "eksamen",
  "eksaminasi",
  "eksaminator",
  "eksantem",
  "eksantropus",
  "eksarasi",
  "eksegesis",
  "ekseget",
  "eksekusi",
  "eksekutif",
  "eksekutor",
  "eksem",
  "eksemplar",
  "eksenterasi",
  "eksentrik",
  "eksepsi",
  "ekseptor",
  "ekses",
  "eksesif",
  "eksfoliasi",
  "ekshalasi",
  "ekshibisi",
  "ekshibisionis",
  "ekshibisionisme",
  "ekshibitum",
  "eksikator",
  "eksin",
  "eksipien",
  "eksisi",
  "eksistensi",
  "eksistensialis",
  "eksistensialisme",
  "eksit",
  "eksitasi",
  "eksitus",
  "ekskavasi",
  "ekskavator",
  "eksklave",
  "eksklusif",
  "eksklusivisme",
  "ekskomunikasi",
  "ekskresi",
  "ekskreta",
  "ekskursi",
  "ekskursif",
  "eksobiologi",
  "eksobiotik",
  "eksodermis",
  "eksodos",
  "eksodus",
  "eksoenzim",
  "eksoergik",
  "eksofasia",
  "eksofora",
  "eksoftalmia",
  "eksoftalmos",
  "eksoftalmus",
  "eksogam",
  "eksogami",
  "eksogen",
  "eksogin",
  "eksoisogami",
  "eksordium",
  "eksorsis",
  "eksosfer",
  "eksospora",
  "eksostosis",
  "eksoterik",
  "eksotermik",
  "eksotik",
  "eksotis",
  "eksotisme",
  "ekspansi",
  "ekspansif",
  "ekspansionis",
  "ekspansionisme",
  "ekspansionistis",
  "ekspatriasi",
  "ekspatriat",
  "ekspedisi",
  "ekspeditor",
  "ekspektoran",
  "eksper",
  "eksperimen",
  "eksperimental",
  "ekspirasi",
  "eksplan",
  "eksplikasi",
  "eksplisit",
  "eksploit",
  "eksploitasi",
  "eksploitir",
  "eksplorasi",
  "eksploratif",
  "eksplorator",
  "eksplosi",
  "eksplosif",
  "ekspo",
  "eksponen",
  "eksponensial",
  "ekspor",
  "eksportir",
  "ekspos",
  "ekspose",
  "eksposisi",
  "ekspres",
  "ekspresi",
  "ekspresif",
  "ekspresionisme",
  "ekspresionistik",
  "ekspresivitas",
  "ekstase",
  "ekstasi",
  "ekstensi",
  "ekstensif",
  "ekstensifikasi",
  "ekstensor",
  "eksterior",
  "eksteriorisasi",
  "eksteritorialitas",
  "ekstern",
  "eksternal",
  "ekstin",
  "ekstra",
  "ekstradisi",
  "ekstrak",
  "ekstrakardial",
  "ekstraksi",
  "ekstraktif",
  "ekstrakurikuler",
  "ekstralinguistis",
  "ekstramarital",
  "ekstranei",
  "ekstraparlementer",
  "ekstrapolasi",
  "ekstraseluler",
  "ekstraterestrial",
  "ekstrateritorialitas",
  "ekstrauterin",
  "ekstraversi",
  "ekstrem",
  "ekstremis",
  "ekstremitas",
  "ekstrinsik",
  "ekstrospeksi",
  "ekstrover",
  "ekstrusi",
  "eksudasi",
  "eksudat",
  "ektoblas",
  "ektoderm",
  "ektohormon",
  "ektoparasit",
  "ektoplasma",
  "ektoterm",
  "ektotermik",
  "ekualitas",
  "ekuatif",
  "ekuator",
  "ekuilibrium",
  "ekuinoks",
  "ekuitas",
  "ekuiti",
  "ekuivalen",
  "ekuivalensi",
  "ekuivokasi",
  "ekumene",
  "ekumenis",
  "ekumenisme",
  "ela",
  "elaborasi",
  "elak",
  "elan",
  "elang",
  "elastik",
  "elastin",
  "elastis",
  "elastisitas",
  "elastomer",
  "elatif",
  "elefantiasis",
  "elegan",
  "elegansi",
  "elegi",
  "elektif",
  "elektorat",
  "elektret",
  "elektrifikasi",
  "elektrik",
  "elektris",
  "elektro",
  "elektrode",
  "elektrodinamika",
  "elektroensefalogram",
  "elektroforesis",
  "elektrokardiogram",
  "elektrokimia",
  "elektrokoagulasi",
  "elektrokusi",
  "elektrolisi",
  "elektrolisis",
  "elektrolit",
  "elektromagnet",
  "elektromagnetik",
  "elektromagnetisme",
  "elektrometalurgi",
  "elektromiografi",
  "elektromotif",
  "elektron",
  "elektronegatif",
  "elektronik",
  "elektronika",
  "elektronis",
  "elektropatologi",
  "elektropositif",
  "elektroskop",
  "elektrostatika",
  "elektroteknik",
  "elektroterapeutika",
  "elektroterapi",
  "elektrotipe",
  "elektrum",
  "elemen",
  "elementer",
  "elemi",
  "eleng",
  "elevasi",
  "elevator",
  "eliksir",
  "eliminasi",
  "eliminir",
  "eling",
  "elips",
  "elipsis",
  "elipsoid",
  "elipsometer",
  "elipsometri",
  "eliptis",
  "elite",
  "elitis",
  "elitron",
  "elo",
  "elok",
  "elokuensi",
  "elon",
  "elongasi",
  "elpiji",
  "eltor",
  "elu",
  "eluat",
  "eluen",
  "elung",
  "elus",
  "elusi",
  "elusian",
  "elusif",
  "elutriasi",
  "eluvial",
  "eluviasi",
  "eluvium",
  "email",
  "emanasi",
  "emang",
  "emansipasi",
  "emas",
  "emaskulasi",
  "emat",
  "embacang",
  "embah",
  "embak",
  "embal",
  "embalase",
  "embalau",
  "emban",
  "embar",
  "embara",
  "embarau",
  "embargo",
  "embarkasi",
  "embaru",
  "embat",
  "embek",
  "embel",
  "ember",
  "embih",
  "embik",
  "emblem",
  "embok",
  "embol",
  "emboli",
  "embolisme",
  "embolus",
  "embosur",
  "embrat",
  "embrio",
  "embriogenesis",
  "embriologi",
  "embrionik",
  "embuai",
  "embuh",
  "embun",
  "embung",
  "embus",
  "embut",
  "emendasi",
  "emeraldin",
  "emeritus",
  "emetik",
  "emetina",
  "emfisema",
  "emigran",
  "emigrasi",
  "eminen",
  "eminensi",
  "emir",
  "emirat",
  "emis",
  "emisi",
  "emisivitas",
  "emitans",
  "emiten",
  "emoh",
  "emol",
  "emolumen",
  "emong",
  "emosi",
  "emosional",
  "emosionalisme",
  "emotif",
  "empal",
  "empang",
  "empap",
  "empar",
  "empas",
  "empat",
  "empati",
  "empedal",
  "empedu",
  "empek",
  "empela",
  "empelas",
  "empenak",
  "empeng",
  "emper",
  "empet",
  "empiema",
  "empik",
  "emping",
  "empiri",
  "empiris",
  "empirisme",
  "emplasemen",
  "emplek",
  "employe",
  "empo",
  "empoh",
  "empok",
  "emporium",
  "empos",
  "empot",
  "emprak",
  "empu",
  "empuan",
  "empuk",
  "empul",
  "empulur",
  "empunya",
  "emrat",
  "emulasi",
  "emulator",
  "emulsi",
  "emulsifikasi",
  "emut",
  "enak",
  "enam",
  "enamel",
  "enap",
  "enartrosis",
  "enas",
  "enau",
  "encal",
  "encang",
  "enceh",
  "encek",
  "encel",
  "encer",
  "encik",
  "encim",
  "encit",
  "encok",
  "encot",
  "endak",
  "endal",
  "endang",
  "endap",
  "endas",
  "endasan",
  "endemi",
  "endemis",
  "endilau",
  "endoderm",
  "endoderma",
  "endodermis",
  "endofit",
  "endogami",
  "endogen",
  "endokardia",
  "endokrin",
  "endokrinologi",
  "endolimfa",
  "endometriosis",
  "endometrium",
  "endomiksis",
  "endomiokarditis",
  "endomisium",
  "endon",
  "endong",
  "endoparasit",
  "endoplasma",
  "endorfin",
  "endosemen",
  "endosentris",
  "endoskeleton",
  "endoskop",
  "endoskopi",
  "endosmosis",
  "endosperma",
  "endotel",
  "endoterm",
  "endotermal",
  "endotermis",
  "endotoksin",
  "endrin",
  "enduk",
  "endul",
  "enduro",
  "endus",
  "endut",
  "enek",
  "eneng",
  "energetik",
  "energi",
  "energik",
  "enes",
  "enfitotik",
  "engah",
  "engap-engap",
  "engas",
  "enggak",
  "enggan",
  "enggang",
  "engget",
  "enggil",
  "enggok",
  "engkah",
  "engkak",
  "engkang",
  "engkau",
  "engket-engket",
  "engkoh",
  "engkol",
  "engkong",
  "engku",
  "engkuk",
  "engsel",
  "enigma",
  "enjak",
  "enjal",
  "enjambemen",
  "enjelai",
  "enjin",
  "enjut",
  "enkapsulasi",
  "enklave",
  "enklitik",
  "enkode",
  "enkripsi",
  "enkulturasi",
  "enologi",
  "enom",
  "ensambel",
  "ensefalitis",
  "ensefalitogen",
  "ensefalograf",
  "ensefalografi",
  "ensefalogram",
  "ensefalomielitis",
  "ensefalon",
  "ensiform",
  "ensiklik",
  "ensiklopedia",
  "ensiklopedis",
  "ensopor",
  "entah",
  "entak",
  "entalpi",
  "entar",
  "entas",
  "ente",
  "enten",
  "enteng",
  "entente",
  "enteritis",
  "enterograf",
  "enterologi",
  "enteron",
  "enteropati",
  "enterosel",
  "enterostomi",
  "enterotoksin",
  "enterovirus",
  "entit",
  "entitas",
  "entoderm",
  "entogenus",
  "entok",
  "entomofili",
  "entomolog",
  "entomologi",
  "entong",
  "entot",
  "entozoa",
  "entozoik",
  "entre",
  "entrepot",
  "entri",
  "entropi",
  "enukleasi",
  "enumerasi",
  "enuresis",
  "envoi",
  "enyah",
  "enyak",
  "enzim",
  "enzimolisis",
  "enzimologi",
  "enzootik",
  "eolit",
  "eon",
  "eosen",
  "eosin",
  "eozoikum",
  "epak",
  "epek",
  "epentesis",
  "epibentos",
  "epidemi",
  "epidemiologi",
  "epidermis",
  "epidiaskop",
  "epifaring",
  "epifil",
  "epifiotik",
  "epifisis",
  "epifit",
  "epifiton",
  "epifora",
  "epigastrium",
  "epigenesis",
  "epiglotis",
  "epigon",
  "epigraf",
  "epigrafi",
  "epigram",
  "epik",
  "epikotil",
  "epikuris",
  "epilepsi",
  "epileptik",
  "epilog",
  "epimisium",
  "epinasti",
  "epinefrina",
  "epinurim",
  "episentrum",
  "episiklik",
  "episiotomi",
  "episkopal",
  "episkopat",
  "episode",
  "episodik",
  "epispora",
  "epistaksis",
  "epistel",
  "epistemologi",
  "epistola",
  "epitaf",
  "epitaksi",
  "epitel",
  "epitelioma",
  "epitermal",
  "epitet",
  "epizoik",
  "epizootik",
  "epok",
  "epoksi",
  "epolet",
  "eponim",
  "epos",
  "epsilon",
  "era",
  "eradikasi",
  "eradiksi",
  "erak",
  "eram",
  "erang",
  "erat",
  "erata",
  "erbis",
  "erbium",
  "ercis",
  "ereh",
  "erek-erek",
  "ereksi",
  "erektor",
  "ereng",
  "erepsin",
  "eret",
  "erg",
  "ergasiofit",
  "ergonomi",
  "ergonomika",
  "ergonomis",
  "ergosterol",
  "ergot",
  "ergoterapi",
  "erik",
  "ering",
  "erisipelas",
  "eritema",
  "eritroblas",
  "eritrosit",
  "erong",
  "eror",
  "erosentrisme",
  "erosi",
  "erot",
  "erotik",
  "erotika",
  "erotis",
  "erotisisme",
  "erotisme",
  "erpah",
  "erpak",
  "erti",
  "eru",
  "erupsi",
  "es",
  "esa",
  "esai",
  "esais",
  "esak",
  "esek",
  "eselon",
  "esembling",
  "esens",
  "esensi",
  "esensial",
  "esensialitas",
  "eskader",
  "eskadron",
  "eskalasi",
  "eskalator",
  "eskapisme",
  "eskas",
  "eskatologi",
  "eskatologis",
  "esofagus",
  "esok",
  "esot",
  "esoteris",
  "estafet",
  "ester",
  "estesia",
  "estetik",
  "estetika",
  "estetikus",
  "estetis",
  "estimasi",
  "estriol",
  "estrogen",
  "estron",
  "estrus",
  "estuari",
  "estuarin",
  "eta",
  "etalase",
  "etana",
  "etanol",
  "etape",
  "etatisme",
  "etek",
  "eter",
  "eteris",
  "eternit",
  "etik",
  "etika",
  "etiket",
  "etil",
  "etilena",
  "etimologi",
  "etimologis",
  "etimon",
  "etiolin",
  "etiologi",
  "etis",
  "etmoid",
  "etnik",
  "etnis",
  "etnobotani",
  "etnograf",
  "etnografi",
  "etnografis",
  "etnolinguistik",
  "etnolog",
  "etnologi",
  "etnologis",
  "etnomusikolog",
  "etnomusikologi",
  "etnopolitik",
  "etnosentrisme",
  "etologi",
  "etos",
  "etsa",
  "eudaemonisme",
  "eufemisme",
  "eufemistis",
  "eufoni",
  "eufonium",
  "euforia",
  "euforian",
  "eugenetika",
  "eugenika",
  "eugenol",
  "eukaliptol",
  "eukaliptus",
  "eukarion",
  "eukariota",
  "eulogi",
  "euploid",
  "eurasia",
  "eurihalin",
  "europium",
  "eurosentris",
  "euseksual",
  "eusinantropus",
  "eutanasia",
  "eutektik",
  "eutenika",
  "eutrofikasi",
  "evakuasi",
  "evaluasi",
  "evaluatif",
  "evangeli",
  "evangelis",
  "evaporasi",
  "evaporator",
  "evaporimeter",
  "evapotranspirasi",
  "eversi",
  "eviden",
  "eviserasi",
  "evokasi",
  "evokatif",
  "evolusi",
  "evolusioner",
  "evolusionisme",
  "ewa",
  "eyang",
  "eyel",
  "faal",
  "faali",
  "fabel",
  "fabula",
  "faden",
  "fadihat",
  "fadil",
  "fadilat",
  "faedah",
  "fafa",
  "fagosit",
  "fagositosis",
  "fagot",
  "fahombe",
  "fahrenheit",
  "fahsya",
  "fail",
  "fajar",
  "fakih",
  "fakir",
  "faks",
  "faksi",
  "faksimile",
  "fakta",
  "faktif",
  "faktitius",
  "faktor",
  "faktual",
  "faktur",
  "fakultas",
  "fakultatif",
  "falah",
  "falaj",
  "falak",
  "falakiah",
  "falsafah",
  "falsafi",
  "fam",
  "famili",
  "familia",
  "familier",
  "familiisme",
  "familisme",
  "fana",
  "fanatik",
  "fanatisme",
  "fanfare",
  "fani",
  "fantasi",
  "fantastis",
  "fantom",
  "farad",
  "faraid",
  "faraj",
  "farak",
  "fardu",
  "farik",
  "faring",
  "faringal",
  "faringalisasi",
  "faringitis",
  "farisi",
  "farji",
  "farmakodinamika",
  "farmakokinetika",
  "farmakolog",
  "farmakologi",
  "farmakologis",
  "farmakope",
  "farmakoseutika",
  "farmasi",
  "farsakh",
  "fasad",
  "fasakh",
  "fase",
  "faset",
  "fasia",
  "fasid",
  "fasih",
  "fasihat",
  "fasik",
  "fasilitas",
  "fasilitator",
  "fasis",
  "fasisme",
  "fastabikhulkhairat",
  "fatah",
  "fatal",
  "fatala",
  "fatalis",
  "fatalisme",
  "fatalitas",
  "fatamorgana",
  "fatanah",
  "fatihah",
  "fatimah",
  "fatir",
  "fatom",
  "fatometer",
  "fatri",
  "fatsun",
  "fatur",
  "fatwa",
  "fauna",
  "faunistik",
  "favorit",
  "favoritisme",
  "febrin",
  "februari",
  "federal",
  "federalis",
  "federalisme",
  "federalistis",
  "federasi",
  "feko",
  "fekundasi",
  "fekunditas",
  "felon",
  "felspar",
  "feminin",
  "feminisme",
  "fenakit",
  "fengsui",
  "fenit",
  "fenol",
  "fenologi",
  "fenomena",
  "fenomenal",
  "fenomenalisme",
  "fenomenologi",
  "fenosis",
  "fenotipe",
  "feodal",
  "feodalisme",
  "feodalistis",
  "feral",
  "feri",
  "feritin",
  "fermen",
  "fermentasi",
  "fermion",
  "fermium",
  "feromagnetik",
  "feromagnetisme",
  "feromon",
  "feronikel",
  "fertil",
  "fertilasi",
  "fertilisasi",
  "fertilitas",
  "fertilizin",
  "ferum",
  "feses",
  "festival",
  "fetis",
  "fetor",
  "fetus",
  "fiasko",
  "fiat",
  "fiber",
  "fibrasi",
  "fibriblas",
  "fibril",
  "fibrilasi",
  "fibrin",
  "fibrinogen",
  "fibrokistik",
  "fidah",
  "fider",
  "fidiah",
  "fidusia",
  "fidyah",
  "figur",
  "figuran",
  "figuratif",
  "fiil",
  "fikih",
  "fikli",
  "fikologi",
  "fikrah",
  "fiksasi",
  "fiksi",
  "fiktif",
  "fikus",
  "filamen",
  "filantrop",
  "filantropi",
  "filantropis",
  "filaria",
  "filariasis",
  "filateli",
  "filatelik",
  "filatelis",
  "filharmoni",
  "filial",
  "filibuster",
  "film",
  "filmis",
  "filo",
  "filodendron",
  "filogenesis",
  "filogeni",
  "filolog",
  "filologi",
  "filologis",
  "filopur",
  "filosof",
  "filosofi",
  "filosofis",
  "filsafat",
  "filsuf",
  "filter",
  "filtrasi",
  "filtrat",
  "filum",
  "fimbria",
  "final",
  "finansial",
  "finir",
  "finis",
  "fiolaks",
  "firajullah",
  "firasat",
  "firauniah",
  "firdaus",
  "firdausi",
  "firjatullah",
  "firkah",
  "firma",
  "firman",
  "firn",
  "fisi",
  "fisibel",
  "fisibilitas",
  "fisik",
  "fisika",
  "fisiognomi",
  "fisiognomis",
  "fisiologi",
  "fisiologis",
  "fisioterapi",
  "fisis",
  "fiskal",
  "fit",
  "fiting",
  "fitnah",
  "fitofag",
  "fitofogus",
  "fitogeni",
  "fitogeografi",
  "fitokimia",
  "fitologi",
  "fitometer",
  "fiton",
  "fitopatologi",
  "fitosanitasi",
  "fitososiologi",
  "fitosterol",
  "fitostrot",
  "fitotoksin",
  "fitotoksoid",
  "fitotopografi",
  "fitotron",
  "fitrah",
  "fitri",
  "flakon",
  "flamboyan",
  "flamingo",
  "flanel",
  "flat",
  "flegma",
  "flegmatis",
  "fleksi",
  "fleksibel",
  "fleksibilitas",
  "fleksor",
  "flensa",
  "flip-plop",
  "flis",
  "floem",
  "flop",
  "flora",
  "floret",
  "flotasi",
  "flotet",
  "flu",
  "fluensi",
  "fluida",
  "fluks",
  "fluktuasi",
  "fluktuatif",
  "fluor",
  "fluoresen",
  "fluoresens",
  "fluorin",
  "fluorit",
  "fobia",
  "fokimeter",
  "fokstrot",
  "fokus",
  "folder",
  "foli",
  "folikel",
  "folio",
  "folklor",
  "folksong",
  "fon",
  "fonasi",
  "fondamen",
  "fondasi",
  "fonds",
  "fonem",
  "fonemik",
  "fonemis",
  "fonetik",
  "fonetis",
  "fonik",
  "fonis",
  "fonograf",
  "fonografi",
  "fonologi",
  "fonologis",
  "fonon",
  "fonotaktik",
  "fonotipi",
  "foramen",
  "foraminifera",
  "forensik",
  "forklif",
  "forma",
  "formal",
  "formalin",
  "formalistis",
  "formalitas",
  "forman",
  "formasi",
  "format",
  "formatif",
  "formatir",
  "formatur",
  "formika",
  "formula",
  "formulasi",
  "formulator",
  "formulir",
  "fornifikasi",
  "fornikasi",
  "forsep",
  "forsir",
  "forsit",
  "forte",
  "fortifikasi",
  "fortin",
  "forum",
  "fosfat",
  "fosfina",
  "fosfit",
  "fosfor",
  "fosforesens",
  "fosforilase",
  "fosforus",
  "fosgen",
  "fosil",
  "foto",
  "fotodiode",
  "fotoelektron",
  "fotoemisi",
  "fotogenik",
  "fotograf",
  "fotografer",
  "fotografi",
  "fotografis",
  "fotograver",
  "fotogravur",
  "fotokimia",
  "fotokonduksi",
  "fotokonduktivitas",
  "fotokonduktor",
  "fotokopi",
  "fotokromi",
  "fotokromik",
  "fotolisis",
  "fotolitografi",
  "fotometer",
  "fotometri",
  "fotomikrografi",
  "fotomodel",
  "foton",
  "fotoperiodisme",
  "fotosel",
  "fotosfer",
  "fotosintesis",
  "fotostat",
  "fototaksis",
  "fototropis",
  "fototustel",
  "fovea",
  "foya",
  "fragmen",
  "fragmentaris",
  "fragmentasi",
  "fraksi",
  "fraksinasi",
  "fraktur",
  "fraktus",
  "frambusia",
  "fransium",
  "frasa",
  "frase",
  "fraseologi",
  "frater",
  "fraternitas",
  "freatofit",
  "fregat",
  "frekuen",
  "frekuensi",
  "frekuentatif",
  "frenologi",
  "freon",
  "frib",
  "frigid",
  "frigorigraf",
  "frigorimeter",
  "frikatif",
  "friksi",
  "fron",
  "front",
  "frontal",
  "fruktosa",
  "frustrasi",
  "fuad",
  "fugasitas",
  "fujur",
  "fukaha",
  "fukara",
  "fuksina",
  "fulgurit",
  "fuli",
  "fulminat",
  "fulus",
  "fumarol",
  "fumigan",
  "fumigasi",
  "fumigator",
  "fundamen",
  "fundamental",
  "fundamentalis",
  "fundamentalisme",
  "fundamentalistis",
  "fungi",
  "fungibel",
  "fungisida",
  "fungistatik",
  "fungoid",
  "fungsi",
  "fungsional",
  "fungsionalisasi",
  "fungsionalisme",
  "fungsionalitas",
  "fungsionaris",
  "fungus",
  "furfural",
  "furkan",
  "furnitur",
  "furqan",
  "furuk",
  "fusi",
  "fusta",
  "fusuk",
  "futual",
  "futur",
  "futurisme",
  "futuristik",
  "futuristis",
  "futurolog",
  "futurologi",
  "futurologis",
  "fyord",
  "gaba-gaba",
  "gabah",
  "gabai",
  "gabak",
  "gabardin",
  "gabas",
  "gabir",
  "gableg",
  "gablek",
  "gabor",
  "gabro",
  "gabruk",
  "gabuk",
  "gabung",
  "gabus",
  "gaco",
  "gacok",
  "gacong",
  "gada",
  "gadai",
  "gadamala",
  "gadang",
  "gading",
  "gadis",
  "gado",
  "gadolinit",
  "gadolinium",
  "gadon",
  "gaduh",
  "gaduk",
  "gadung",
  "gadungan",
  "gaek",
  "gaet",
  "gafar",
  "gaflah",
  "gaflat",
  "gaftar",
  "gafur",
  "gaga",
  "gagah",
  "gagai",
  "gagak",
  "gagal",
  "gagang",
  "gagap",
  "gagas",
  "gagau",
  "gagu",
  "gaguk",
  "gah",
  "gaham",
  "gahar",
  "gahara",
  "gahari",
  "gaharu",
  "gai",
  "gaib",
  "gail",
  "gain",
  "gaing",
  "gairah",
  "gait",
  "gajah",
  "gajak",
  "gaji",
  "gajih",
  "gajul",
  "gajus",
  "gakang",
  "gakari",
  "gala",
  "galaba",
  "galaganjur",
  "galagasi",
  "galah",
  "galai",
  "galak",
  "galaksi",
  "galaktometer",
  "galaktorea",
  "galaktosa",
  "galaktosemia",
  "galaktosuria",
  "galan",
  "galang",
  "galanggasi",
  "galar",
  "galas",
  "galat",
  "galau",
  "galbani",
  "galeng",
  "galeri",
  "galgal",
  "gali",
  "galias",
  "galib",
  "galibut",
  "galih",
  "galiot",
  "galir",
  "galium",
  "galiung",
  "galon",
  "galu-galu",
  "galuh",
  "galung",
  "galungan",
  "galur",
  "galvanis",
  "galvanisasi",
  "galvanometer",
  "galvanometri",
  "galvanoskop",
  "galyas",
  "gam",
  "gama",
  "gamak",
  "gamal",
  "gamalisasi",
  "gamam",
  "gaman",
  "gamang",
  "gamat",
  "gambang",
  "gambar",
  "gambas",
  "gambir",
  "gamblang",
  "gambling",
  "gambuh",
  "gambus",
  "gambut",
  "gambyong",
  "gamelan",
  "gamet",
  "gametangium",
  "gametofit",
  "gametogenesis",
  "gametosit",
  "gamik",
  "gamis",
  "gamit",
  "gamma",
  "gamopetal",
  "gamosepal",
  "gampang",
  "gampar",
  "gamparan",
  "gamping",
  "gamuh",
  "gana",
  "gana-gini",
  "ganal",
  "ganang",
  "ganar",
  "ganas",
  "gancang",
  "gancar",
  "ganco",
  "gancu",
  "ganda",
  "gandal",
  "gandapura",
  "gandar",
  "gandaria",
  "gandarukem",
  "gandarusa",
  "gandarwa",
  "gandasturi",
  "gandasuli",
  "gandek",
  "gandem",
  "ganden",
  "gandeng",
  "gandes",
  "gandewa",
  "gandi",
  "gandik",
  "gandin",
  "ganding",
  "gandok",
  "gandola",
  "gandos",
  "gandringan",
  "gandrung",
  "gandu",
  "ganduh",
  "gandul",
  "gandum",
  "gandung",
  "gang",
  "ganggam",
  "ganggang",
  "ganggu",
  "ganggut",
  "ganglion",
  "gangsa",
  "gangsal",
  "gangsar",
  "gangsi",
  "gangsir",
  "gangster",
  "gani",
  "ganih",
  "ganimah",
  "ganja",
  "ganjak",
  "ganjal",
  "ganjar",
  "ganjat",
  "ganjen",
  "ganjil",
  "ganjing",
  "ganjling",
  "ganjur",
  "ganoid",
  "gantal",
  "gantang",
  "gantar",
  "gantel",
  "ganteng",
  "ganti",
  "gantih",
  "gantilan",
  "ganting",
  "gantol",
  "gantole",
  "gantung",
  "ganyah",
  "ganyang",
  "ganyar",
  "ganyong",
  "ganyut",
  "gaok",
  "gap",
  "gapah",
  "gapah-gopoh",
  "gapai",
  "gapil",
  "gapit",
  "gaple",
  "gaplek",
  "gaplok",
  "gapuk",
  "gapura",
  "gar",
  "gara-gara",
  "garah",
  "garai",
  "garam",
  "garan",
  "garang",
  "garangan",
  "garansi",
  "garap",
  "garasi",
  "garau",
  "garba",
  "garbarata",
  "garbis",
  "garda",
  "gardan",
  "gardu",
  "garebek",
  "gari",
  "garib",
  "garindin",
  "garing",
  "garis",
  "garit",
  "garizah",
  "garmen",
  "garnet",
  "garnis",
  "garnisun",
  "garong",
  "garpu",
  "garu",
  "garuda",
  "garuk",
  "garung",
  "garut",
  "garwa",
  "gas",
  "gasab",
  "gasak",
  "gasal",
  "gasang",
  "gasatrin",
  "gasifikasi",
  "gasing",
  "gasket",
  "gasolin",
  "gasometer",
  "gaster",
  "gastrektomi",
  "gastrin",
  "gastritis",
  "gastroenteritis",
  "gastroenterolog",
  "gastroenterologi",
  "gastrointestinal",
  "gastronomi",
  "gastrula",
  "gastrulasi",
  "gatal",
  "gatot",
  "gatra",
  "gatrik",
  "gatuk",
  "gauk",
  "gaukang",
  "gaul",
  "gaun",
  "gaung",
  "gaut",
  "gawai",
  "gawal",
  "gawan",
  "gawang",
  "gawar",
  "gawat",
  "gawir",
  "gaya",
  "gayal",
  "gayam",
  "gayang",
  "gayat",
  "gayau",
  "gayem",
  "gayeng",
  "gayuh",
  "gayuk",
  "gayun",
  "gayung",
  "gayut",
  "gaz",
  "gazal",
  "gebah",
  "gebang",
  "gebar",
  "gebeng",
  "geber",
  "geblak",
  "geblek",
  "geblok",
  "gebogan",
  "gebok",
  "gebos",
  "gebot",
  "gebrak",
  "gebu",
  "gebuk",
  "gebung",
  "gebyah-uyah",
  "gebyar",
  "gebyur",
  "gecar",
  "gecek",
  "gecer",
  "gecul",
  "gedabah",
  "gedana-gedini",
  "gedang",
  "gede",
  "gedebak-gedebuk",
  "gedebar-gedebur",
  "gedebeg",
  "gedebok",
  "gedebuk",
  "gedebung",
  "gedek",
  "gedembai",
  "gedembal",
  "gedempol",
  "gedeng",
  "gedi",
  "gedik",
  "gedok",
  "gedombak",
  "gedombrongan",
  "gedong",
  "gedor",
  "gedubang",
  "gedung",
  "geduyut",
  "gegabah",
  "gegadan",
  "gegai",
  "gegak",
  "gegala",
  "gegaman",
  "gegana",
  "gegaokan",
  "gegap",
  "gegar",
  "gegares",
  "gegas",
  "gegat",
  "gegau",
  "gegep",
  "geger",
  "gegetar",
  "gegetun",
  "gegisik",
  "gegua",
  "geiger",
  "geiser",
  "gejah",
  "gejala",
  "gejolak",
  "gejos",
  "gejuju",
  "gel",
  "gela",
  "gelabah",
  "gelabir",
  "gelabur",
  "geladak",
  "geladeri",
  "geladi",
  "geladir",
  "geladrah",
  "gelagah",
  "gelagap",
  "gelagar",
  "gelagat",
  "gelak",
  "gelakak",
  "gelalar",
  "gelam",
  "gelama",
  "gelamai",
  "gelambir",
  "gelandang",
  "gelandot",
  "gelang",
  "gelanggang",
  "gelangsar",
  "gelantang",
  "gelanting",
  "gelantung",
  "gelap",
  "gelapung",
  "gelar",
  "gelas",
  "gelasak",
  "gelasir",
  "gelatak",
  "gelatik",
  "gelatin",
  "gelatuk",
  "gelayangan",
  "gelayar",
  "gelayut",
  "gelebah",
  "gelebap",
  "gelebar",
  "geleber",
  "gelebuk",
  "geleca",
  "gelecik",
  "geledah",
  "geledang",
  "geledek",
  "geleding",
  "geledur",
  "gelegah",
  "gelegak",
  "gelegar",
  "gelegata",
  "gelek",
  "gelekak",
  "gelekek",
  "gelema",
  "gelemat",
  "gelemberan",
  "gelembong",
  "gelembung",
  "gelembur",
  "gelempang",
  "gelemprang",
  "gelenang",
  "gelendo",
  "gelendong",
  "gelendot",
  "geleng",
  "gelenggang",
  "gelentang",
  "gelenting",
  "gelenyar",
  "gelepai",
  "gelepar",
  "gelepek",
  "gelepot",
  "gelepung",
  "gelepur",
  "geler",
  "gelesek",
  "geleser",
  "gelesot",
  "geleta",
  "geletak",
  "geletar",
  "geletek",
  "geletik",
  "geleting",
  "geletis",
  "geletuk",
  "geli",
  "geliang",
  "geliat",
  "gelibir",
  "gelicik",
  "geliga",
  "geligi",
  "geligin",
  "geligis",
  "geligit",
  "gelignit",
  "gelimang",
  "gelimantang",
  "gelimbir",
  "gelimir",
  "gelimpang",
  "gelimun",
  "gelincir",
  "gelincuh",
  "gelinding",
  "gelinggam",
  "gelinggaman",
  "gelinggang",
  "gelingsir",
  "gelinjang",
  "gelintang",
  "gelintar",
  "gelintin",
  "gelinting",
  "gelintir",
  "gelipar",
  "gelisah",
  "gelita",
  "gelitar",
  "gelitik",
  "gelo",
  "gelobak",
  "gelobok",
  "gelocak",
  "gelodar",
  "gelodok",
  "gelogok",
  "gelohok",
  "gelojoh",
  "gelomang",
  "gelombang",
  "gelompar",
  "gelondong",
  "geloneng",
  "gelonggong",
  "gelongsor",
  "gelontor",
  "gelopak",
  "gelora",
  "gelosang",
  "geloso",
  "gelosok",
  "gelotak",
  "geluduk",
  "geluga",
  "gelugu",
  "gelugur",
  "gelugut",
  "geluh",
  "geluk",
  "gelulur",
  "gelumang",
  "gelumat",
  "geluncur",
  "gelundung",
  "gelung",
  "gelup",
  "gelupur",
  "gelut",
  "gema",
  "gemah",
  "gemak",
  "gemal",
  "geman",
  "gemang",
  "gemap",
  "gemar",
  "gemas",
  "gemaung",
  "gemawan",
  "gembak",
  "gembala",
  "gembar-gembor",
  "gembel",
  "gembeng",
  "gembil",
  "gembili",
  "gembira",
  "gemblak",
  "gembleng",
  "gemblong",
  "gemblung",
  "gembok",
  "gembol",
  "gembolo",
  "gembong",
  "gembor",
  "gembos",
  "gembreng",
  "gembrot",
  "gembul",
  "gembung",
  "gembur",
  "gembus",
  "gembut",
  "gemebyar",
  "gemelentam",
  "gemeletak",
  "gemeletap",
  "gemeletek",
  "gemeletuk",
  "gemelugut",
  "gementam",
  "gementar",
  "gemercak",
  "gemercik",
  "gemerencang",
  "gemerencik",
  "gemerencing",
  "gemerencung",
  "gemeresak",
  "gemeresik",
  "gemeretak",
  "gemeretuk",
  "gemeretup",
  "gemerlap",
  "gemertak",
  "gemertuk",
  "gemerusuk",
  "gemetar",
  "gemi",
  "gemik",
  "gemilang",
  "gemilap",
  "geming",
  "gemini",
  "gemintang",
  "geminte",
  "gemirang",
  "gempa",
  "gempal",
  "gempar",
  "gempil",
  "gempita",
  "gempol",
  "gempor",
  "gempul-gempul",
  "gempur",
  "gemrobyos",
  "gemuk",
  "gemul",
  "gemulai",
  "gemulung",
  "gemuntur",
  "gemuruh",
  "gen",
  "gena",
  "genah",
  "genahar",
  "genang",
  "genap",
  "gencar",
  "gencat",
  "gencel",
  "gencer",
  "gencet",
  "gencir",
  "gendak",
  "gendala",
  "gendam",
  "gendang",
  "gendar",
  "gendarmeri",
  "gendeng",
  "gender",
  "genderang",
  "genderuwo",
  "gendewa",
  "gending",
  "gendis",
  "gendon",
  "gendong",
  "genduk",
  "gendut",
  "genealogi",
  "genealogis",
  "genegin",
  "geneng",
  "generalis",
  "generalisasi",
  "generalisimo",
  "generasi",
  "generatif",
  "generator",
  "generik",
  "genesis",
  "genetika",
  "genetis",
  "geng",
  "genggam",
  "genggang",
  "genggong",
  "gengsah",
  "gengsi",
  "gengsot",
  "genial",
  "genialitas",
  "genikulum",
  "genis",
  "genit",
  "genital",
  "genitalia",
  "genitif",
  "genius",
  "genjah",
  "genjang",
  "genjang-genjot",
  "genjer",
  "genjik",
  "genjot",
  "genjrang",
  "genjring",
  "genjur",
  "genom",
  "genosida",
  "genotipe",
  "genre",
  "genta",
  "gentala",
  "gentar",
  "gentas",
  "gentat",
  "gentayang",
  "gentel",
  "genteng",
  "gentian",
  "genting",
  "gentong",
  "gentrifikasi",
  "gentur",
  "gentus",
  "genus",
  "genyot",
  "geobotani",
  "geodesi",
  "geofisika",
  "geofisis",
  "geofon",
  "geognosi",
  "geografi",
  "geografis",
  "geohidrologi",
  "geokimia",
  "geokronologi",
  "geolog",
  "geologi",
  "geologis",
  "geomansi",
  "geometri",
  "geometris",
  "geomorfologi",
  "geonomi",
  "geopolitik",
  "geosentris",
  "geosinkronis",
  "geostasioner",
  "geostatika",
  "geoteknik",
  "geoteknologi",
  "geotermal",
  "geotermi",
  "geotermometer",
  "gepeng",
  "gepit",
  "geplak",
  "gepok",
  "geprak",
  "gepuk",
  "gera",
  "gerabah",
  "gerabak",
  "gerabang",
  "geradi",
  "geragai",
  "geragap",
  "geragas",
  "geragau",
  "geragih",
  "geragot",
  "geraguk",
  "gerah",
  "geraham",
  "gerai",
  "gerak",
  "geram",
  "geraman",
  "geramang",
  "geramsut",
  "geramus",
  "gerang",
  "gerangan",
  "geranggang",
  "geranium",
  "gerantak",
  "gerantang",
  "geranyam",
  "gerapai",
  "gerapu",
  "gerat",
  "geratak",
  "geratih",
  "gerau",
  "gerawan",
  "gerawat",
  "gerayah",
  "gerayang",
  "gerbak",
  "gerbang",
  "gerbas-gerbus",
  "gerbera",
  "gerbong",
  "gerbus",
  "gerda",
  "gerdam",
  "gerdan",
  "gerdum",
  "gerebek",
  "gerecak",
  "gerecok",
  "gereget",
  "gereh",
  "gereja",
  "gerejani",
  "gerejawi",
  "gerek",
  "geremet",
  "gerempang",
  "gerencang",
  "gerendel",
  "gerendeng",
  "gerenek",
  "gereneng",
  "gereng-gereng",
  "gerengseng",
  "gerenik",
  "gerenjeng",
  "gerenjet",
  "gerentang",
  "gerenyau",
  "gerenyeng",
  "gerenyet",
  "gerenying",
  "gerenyit",
  "gerenyot",
  "gerepe",
  "gerepek",
  "gerepes",
  "geresek",
  "geret",
  "geretak",
  "geretang",
  "gergaji",
  "gergajul",
  "gergasi",
  "gergeran",
  "gerha",
  "gerhana",
  "geriak",
  "geriak-geriuk",
  "geriap",
  "geriatrik",
  "geribik",
  "gericau",
  "geridip",
  "geridit",
  "geriditpidit",
  "gerigi",
  "gerigik",
  "gerigis",
  "gerih",
  "gerik",
  "gerilya",
  "gerim",
  "gerimis",
  "gerincing",
  "gerinda",
  "gerindin",
  "gerinding",
  "gering",
  "geringging",
  "geringgingan",
  "geringsing",
  "gerinjal",
  "gerinjam",
  "gerinting",
  "gerinyau",
  "gerip",
  "geripir",
  "geripis",
  "gerisik",
  "gerising",
  "gerit",
  "geriuk",
  "gerlap",
  "gerlip",
  "germang",
  "germanium",
  "germinal",
  "germisida",
  "germo",
  "germut",
  "gero",
  "geroak",
  "gerobak",
  "gerobok",
  "gerobyak",
  "gerocok",
  "gerodak",
  "gerogol",
  "gerogot",
  "gerohok",
  "gerohong",
  "gerojok",
  "gerombol",
  "gerombong",
  "gerompok",
  "gerong",
  "geronggang",
  "geronium",
  "gerontokrasi",
  "gerontol",
  "gerontologi",
  "geronyot",
  "geropes",
  "geropyok",
  "geros",
  "gerosak",
  "gerot-gerot",
  "gerowong",
  "gerowot",
  "gerpol",
  "gersak",
  "gersang",
  "gersik",
  "gertak",
  "gertik",
  "gertuk",
  "geru",
  "gerugut",
  "geruh",
  "geruit",
  "gerumit",
  "gerumpung",
  "gerumuk",
  "gerumut",
  "gerun",
  "gerundang",
  "gerundel",
  "gerung",
  "gerunggung",
  "gerunyam",
  "gerup",
  "gerupis",
  "gerupuk",
  "gerus",
  "gerut",
  "gerutu",
  "gerutup",
  "gerutus",
  "gesa",
  "gesek",
  "gesel",
  "geser",
  "gesit",
  "gesper",
  "gestikulasi",
  "geta",
  "getah",
  "getak-getuk",
  "getang",
  "getap",
  "getar",
  "getas",
  "getek",
  "getem-getem",
  "geti-geti",
  "getik",
  "getil",
  "getir",
  "getis",
  "getok",
  "getol",
  "getu",
  "getuk",
  "getun",
  "geulis",
  "gewang",
  "gial",
  "giam",
  "giat",
  "gibah",
  "gibang",
  "gibas",
  "giblet",
  "gibtah",
  "gidik",
  "gigahertz",
  "gigantisme",
  "gigi",
  "gigih",
  "gigil",
  "gigir",
  "gigis",
  "gigit",
  "gigolo",
  "gila",
  "gilang",
  "gilap",
  "gilas",
  "gilbet",
  "gili",
  "gilik",
  "giling",
  "gilir",
  "gim",
  "gimbal",
  "gimnasium",
  "gimnastik",
  "gimpal",
  "gin",
  "ginang",
  "gincu",
  "ginding",
  "ginekolog",
  "ginekologi",
  "ginekomasti",
  "ginesium",
  "gingivitis",
  "ginglimus",
  "gingsir",
  "gingsul",
  "ginjal",
  "ginjean",
  "ginkang",
  "ginogenesis",
  "ginseng",
  "gips",
  "gipsi",
  "gir",
  "girah",
  "giral",
  "girang",
  "girap-girap",
  "giras",
  "girasol",
  "giri",
  "girik",
  "girikan",
  "giring",
  "giris",
  "giro",
  "giroskop",
  "girostat",
  "girostatika",
  "gisar",
  "gisik",
  "gisil",
  "gita",
  "gitapati",
  "gitar",
  "gitaris",
  "gites",
  "gitik",
  "gitok",
  "giuk",
  "giur",
  "giwang",
  "gizi",
  "glabela",
  "gladiator",
  "gladiol",
  "glamor",
  "glandula",
  "glans",
  "glasial",
  "glasir",
  "glasnos",
  "glaukoma",
  "glegek",
  "glenik",
  "glenoid",
  "gletser",
  "glidik",
  "glikogen",
  "glikogenesis",
  "glikogenolisis",
  "glikol",
  "glikolisis",
  "glikosid",
  "glikosida",
  "glikosidasa",
  "glikosidase",
  "glikosuria",
  "gliserida",
  "gliserol",
  "global",
  "globalisasi",
  "globalisme",
  "globe",
  "globulin",
  "globus",
  "glokidium",
  "glomerulus",
  "glomus",
  "glosarium",
  "glosem",
  "glosematik",
  "glositas",
  "glositis",
  "glotal",
  "glotalisasi",
  "glotis",
  "glukagon",
  "glukosa",
  "glukosan",
  "glukosida",
  "gluten",
  "gnomon",
  "goak",
  "gob",
  "goba",
  "gobak",
  "gobang",
  "gobar",
  "gobek",
  "gobet",
  "goblok",
  "gocap",
  "gocek",
  "gocoh",
  "goda",
  "godak",
  "godam",
  "godek",
  "godok",
  "godong",
  "godot",
  "goel",
  "gogoh",
  "gogok",
  "gogos",
  "gogrok",
  "gohok",
  "gohong",
  "gojek",
  "gojlok",
  "gokar",
  "gol",
  "golak",
  "golak-galik",
  "golbi",
  "golek",
  "goleng",
  "goler",
  "golf",
  "golok",
  "golong",
  "golput",
  "gom",
  "gombak",
  "gombal",
  "gombang",
  "gombeng",
  "gombrang",
  "gombroh",
  "gombyok",
  "gompal",
  "gompiok",
  "gonad",
  "gondang",
  "gondas-gandes",
  "gondok",
  "gondol",
  "gondola",
  "gondong",
  "gondorukem",
  "gondrong",
  "gong",
  "gonggo",
  "gonggok",
  "gonggong",
  "gongli",
  "gongseng",
  "gongyo",
  "goni",
  "gonidium",
  "goniometri",
  "gonjak",
  "gonjang",
  "gonjang-ganjing",
  "gonjing",
  "gonjlang",
  "gonjlang-ganjling",
  "gonjok",
  "gonjong",
  "gonokokus",
  "gonore",
  "gonrang",
  "gontaganti",
  "gontai",
  "gontok",
  "gonyak",
  "gonyeh",
  "gonyel",
  "gonyoh",
  "gopek",
  "gopoh",
  "gorap",
  "gorden",
  "gorek",
  "goreng",
  "gores",
  "gori",
  "gorila",
  "gorilya",
  "goroh",
  "gorok",
  "gorong-gorong",
  "gosan",
  "gosip",
  "gosok",
  "gosong",
  "gospel",
  "got",
  "gotes",
  "gotik",
  "gotong",
  "gotri",
  "gotrok",
  "gotun",
  "gowok",
  "goyah",
  "goyak",
  "goyang",
  "grabadan",
  "grad",
  "gradasi",
  "gradien",
  "gradual",
  "gradualisme",
  "graf",
  "grafem",
  "grafemik",
  "grafemis",
  "grafetik",
  "grafik",
  "grafika",
  "grafis",
  "grafit",
  "grafitasi",
  "grafolog",
  "grafologi",
  "graha",
  "grahita",
  "gram",
  "gramatika",
  "gramatikal",
  "grambyang",
  "gramofon",
  "granat",
  "granit",
  "granolitik",
  "granula",
  "granulasi",
  "granulosit",
  "grapyak",
  "grasi",
  "gratak",
  "gratifikasi",
  "gratis",
  "gravel",
  "graver",
  "gravimeter",
  "gravitas",
  "gravitasi",
  "grecok",
  "gregarius",
  "grehon",
  "grempel",
  "gres",
  "gresek-gresek",
  "gria",
  "grip",
  "griya",
  "grogi",
  "gronjong",
  "gros",
  "grosir",
  "grup",
  "gruwung",
  "gua",
  "gual",
  "guam",
  "guanidina",
  "guanin",
  "guanina",
  "guano",
  "guar",
  "gubah",
  "gubal",
  "gubang",
  "gubel",
  "gubernemen",
  "gubernur",
  "gubit",
  "gubris",
  "gubuk",
  "guci",
  "gudam",
  "gudang",
  "gudangan",
  "gude",
  "gudeg",
  "guderi",
  "gudi",
  "gudik",
  "gudu-gudu",
  "gue",
  "gugah",
  "gugat",
  "gugu",
  "guguh",
  "guguk",
  "gugup",
  "gugur",
  "gugus",
  "guit",
  "gujirak",
  "gujirat",
  "gukakas",
  "gul",
  "gula",
  "gulah",
  "gulai",
  "gulali",
  "gulam",
  "gulambai",
  "gulana",
  "gulang-gulang",
  "gulat",
  "guli",
  "guliga",
  "guling",
  "gulir",
  "gulita",
  "gulma",
  "gulud",
  "gulung",
  "gulut",
  "gum",
  "guma",
  "gumal",
  "gumam",
  "gumba",
  "gumbaan",
  "gumbang",
  "gumbar",
  "gumboro",
  "gumbuk",
  "gumebruk",
  "gumelaran",
  "gumpal",
  "gumpil",
  "gumuk",
  "gumul",
  "gumun",
  "gun",
  "guna",
  "gunawan",
  "guncang",
  "gunci",
  "gundah",
  "gundal",
  "gundala",
  "gundang",
  "gundar",
  "gundi",
  "gundik",
  "gundu",
  "gunduk",
  "gundul",
  "gung",
  "gunggung",
  "gunjai",
  "gunjing",
  "gunolugu",
  "gunrit",
  "gunseikan",
  "guntai",
  "guntak",
  "guntang",
  "guntil",
  "gunting",
  "guntung",
  "guntur",
  "gunung",
  "gunyam",
  "gup",
  "gurab",
  "gurah",
  "guram",
  "gurami",
  "gurat",
  "gurau",
  "gurdan",
  "gurdi",
  "guri",
  "gurih",
  "gurik",
  "gurindam",
  "guring",
  "gurit",
  "gurita",
  "gurnadur",
  "guru",
  "gurub",
  "guruh",
  "guruk",
  "gurun",
  "gurung",
  "gurur",
  "gus",
  "gusah",
  "gusar",
  "gusel",
  "gusi",
  "gusrek",
  "gusti",
  "gusul",
  "gusur",
  "gutasi",
  "gutik",
  "gutuk",
  "guyon",
  "guyub",
  "guyur",
  "habenula",
  "habib",
  "habibi",
  "habibulah",
  "habibullah",
  "habis",
  "habitat",
  "habituasi",
  "habitus",
  "habluk",
  "hablun",
  "hablur",
  "habsyi",
  "habuan",
  "habuk",
  "habung",
  "had",
  "hadanah",
  "hadap",
  "hadas",
  "hadat",
  "hadiah",
  "hadir",
  "hadirat",
  "hadirin",
  "hadis",
  "hadron",
  "hafal",
  "hafiz",
  "hafnium",
  "hagiografi",
  "hahnium",
  "hai",
  "haid",
  "haik",
  "haiking",
  "haiku",
  "hail",
  "hailai",
  "haj",
  "hajah",
  "hajar",
  "hajat",
  "haji",
  "hajib",
  "hajim",
  "hajis",
  "hak",
  "hakaik",
  "hakam",
  "hakikat",
  "hakiki",
  "hakim",
  "hakimah",
  "hakul",
  "hakulah",
  "hakulyakin",
  "hal",
  "hala",
  "halai-balai",
  "halaik",
  "halakah",
  "halal",
  "halalbihalal",
  "halaman",
  "halang",
  "halau",
  "halazon",
  "halba",
  "haleluya",
  "halia",
  "halilintar",
  "halim",
  "halimbubu",
  "halimun",
  "halimunan",
  "halipan",
  "halitosis",
  "halkah",
  "halma",
  "halo",
  "halobion",
  "halofili",
  "halofit",
  "halofita",
  "halofob",
  "halogen",
  "halogenasi",
  "halotan",
  "halsduk",
  "halte",
  "halter",
  "haluan",
  "halus",
  "halusinasi",
  "halusinogen",
  "halwa",
  "ham",
  "hama",
  "hamal",
  "hamatum",
  "hamba",
  "hambali",
  "hambar",
  "hambat",
  "hambur",
  "hamburger",
  "hamdalah",
  "hamdu",
  "hamik",
  "hamil",
  "haminte",
  "hampa",
  "hampang",
  "hampar",
  "hampir",
  "hamud",
  "hamulus",
  "hamun",
  "hamzah",
  "hana",
  "hanacaraka",
  "hanafi",
  "hancing",
  "hancur",
  "handai",
  "handam",
  "handaruan",
  "handasah",
  "handelar",
  "handuk",
  "hang",
  "hangar",
  "hangat",
  "hanger",
  "hanggar",
  "hangit",
  "hangus",
  "hanif",
  "hanjuang",
  "hansop",
  "hantai",
  "hantam",
  "hantap",
  "hantar",
  "hantir",
  "hantu",
  "hanya",
  "hanyut",
  "hap",
  "hapetan",
  "haplografi",
  "haploid",
  "haplologi",
  "hapus",
  "hara",
  "harak",
  "harakah",
  "harakat",
  "harakiri",
  "haram",
  "harap",
  "harawan",
  "harbi",
  "hardik",
  "harem",
  "harendong",
  "harfiah",
  "harga",
  "hari",
  "haribaan",
  "harimau",
  "haring",
  "harini",
  "haris",
  "harisah",
  "harit",
  "harkat",
  "harmoni",
  "harmonik",
  "harmonika",
  "harmonis",
  "harmonisasi",
  "harmonium",
  "harnet",
  "harpa",
  "harpis",
  "harpun",
  "hart",
  "harta",
  "hartal",
  "haru",
  "haruan",
  "harum",
  "harungguan",
  "harus",
  "has",
  "hasab",
  "hasad",
  "hasai",
  "hasan",
  "hasar",
  "hasib",
  "hasid",
  "hasil",
  "hasrat",
  "hasta",
  "hasta-wara",
  "hasud",
  "hasut",
  "hasyiah",
  "hasyis",
  "hati",
  "hatif",
  "hatta",
  "hatur",
  "haud",
  "haudah",
  "haukalah",
  "haul",
  "haur",
  "hauri",
  "haus",
  "haustorium",
  "haver",
  "hawa",
  "hawar",
  "hawari",
  "hawiah",
  "hayat",
  "hayati",
  "hayo",
  "heban",
  "hebat",
  "heboh",
  "hebras",
  "hebring",
  "hedonis",
  "hedonisme",
  "hegelianisme",
  "hegemoni",
  "hegemonik",
  "hegemonisme",
  "hegemonnisme",
  "heiho",
  "heksadesimal",
  "heksagon",
  "heksahedron",
  "heksaklorida",
  "heksameter",
  "heksana",
  "heksapoda",
  "hektar",
  "hektare",
  "hektograf",
  "hektogram",
  "hektoliter",
  "hektometer",
  "hela",
  "helah",
  "helai",
  "helat",
  "helicak",
  "helikopter",
  "heling",
  "heliofit",
  "heliofobi",
  "heliograf",
  "heliogram",
  "heliometer",
  "heliosentrik",
  "helioskop",
  "heliotaksis",
  "helioterapi",
  "heliotrop",
  "heliotropisme",
  "helipad",
  "helium",
  "helm",
  "helmintologi",
  "hem",
  "hemat",
  "hematit",
  "hematite",
  "hematofobia",
  "hematologi",
  "hematom",
  "hematometra",
  "hematuri",
  "hembak",
  "hembalang",
  "hembus",
  "hemeralopi",
  "hemikordat",
  "hemiplegia",
  "hemisfer",
  "hemodialisis",
  "hemofilia",
  "hemoglobin",
  "hemolisis",
  "hemopoiesis",
  "hemopteran",
  "hemoragi",
  "hemoroid",
  "hemosit",
  "hemositometer",
  "hemostasis",
  "hemostatik",
  "hempap",
  "hempas",
  "hendak",
  "hendam",
  "hendel",
  "heng",
  "hengit",
  "hengkang",
  "hening",
  "henoteisme",
  "henry",
  "hentar",
  "henti",
  "henyak",
  "hepar",
  "hepatitis",
  "heptagon",
  "heptahedron",
  "heptameter",
  "heptana",
  "heraldik",
  "heran",
  "herba",
  "herbarium",
  "herbisida",
  "herbivor",
  "herbivora",
  "herder",
  "hereditas",
  "herediter",
  "heregistrasi",
  "heresi",
  "hering",
  "hermafrodit",
  "hermafroditisme",
  "hermetis",
  "hernia",
  "hero",
  "heroik",
  "heroin",
  "heroisme",
  "herpes",
  "herpetolog",
  "herpetologi",
  "hertz",
  "hesperidin",
  "heterodin",
  "heterodoks",
  "heterofemi",
  "heterofil",
  "heterofit",
  "heterogamet",
  "heterogami",
  "heterogen",
  "heterogenitas",
  "heterograf",
  "heterografi",
  "heteroklitus",
  "heteronim",
  "heteronimi",
  "heteronomi",
  "heteroseksual",
  "heteroseksualitas",
  "heterosfer",
  "heterosiklis",
  "heterosis",
  "heterospora",
  "heterostili",
  "heterotrof",
  "heterozigot",
  "heuristis",
  "hewan",
  "hewani",
  "hia",
  "hialin",
  "hialit",
  "hias",
  "hiatus",
  "hibah",
  "hibal",
  "hibat",
  "hibernasi",
  "hibiskus",
  "hibob",
  "hibrida",
  "hibridis",
  "hibridisasi",
  "hibuk",
  "hibur",
  "hidang",
  "hidatod",
  "hidayah",
  "hidayat",
  "hidrasi",
  "hidrat",
  "hidraulik",
  "hidraulika",
  "hidraulis",
  "hidrida",
  "hidrodinamika",
  "hidrofili",
  "hidrofit",
  "hidrofobia",
  "hidrofoil",
  "hidrofon",
  "hidrogen",
  "hidrogenasi",
  "hidrogeologi",
  "hidrograf",
  "hidrografi",
  "hidrogram",
  "hidrokarbon",
  "hidroklorida",
  "hidrokori",
  "hidroksida",
  "hidroksil",
  "hidrolika",
  "hidrolisis",
  "hidrologi",
  "hidrometeorologi",
  "hidrometer",
  "hidrometri",
  "hidromini",
  "hidronan",
  "hidropati",
  "hidroperoksida",
  "hidroponik",
  "hidropsoma",
  "hidrosfer",
  "hidrosiklon",
  "hidroskop",
  "hidrostatika",
  "hidrostatis",
  "hidroterapi",
  "hidrotermal",
  "hidu",
  "hidung",
  "hidup",
  "hiena",
  "hierarki",
  "hierarkis",
  "hieroglif",
  "hifa",
  "higiene",
  "higienis",
  "higrograf",
  "higrogram",
  "higrometer",
  "higrometri",
  "higroskop",
  "higroskopis",
  "higrotermograf",
  "higrotermogram",
  "hijab",
  "hijaiah",
  "hijau",
  "hijrah",
  "hijriah",
  "hikayat",
  "hikmah",
  "hikmat",
  "hilal",
  "hilang",
  "hilap",
  "hilau",
  "hilir",
  "hilofagus",
  "himanga",
  "himar",
  "himen",
  "himenium",
  "himne",
  "himpun",
  "hina",
  "hinap",
  "hinayana",
  "hindar",
  "hindi",
  "hindu",
  "hinduisme",
  "hingga",
  "hinggap",
  "hinggut",
  "hio",
  "hiosiamina",
  "hiosin",
  "hip",
  "hipantium",
  "hiperaktif",
  "hiperamnesi",
  "hiperbarik",
  "hiperbol",
  "hiperbolis",
  "hiperemia",
  "hiperestesia",
  "hipergami",
  "hiperkelas",
  "hiperkinesis",
  "hiperklas",
  "hiperkorek",
  "hiperkritis",
  "hiperlipemia",
  "hipermetropia",
  "hiperon",
  "hiperopia",
  "hiperparasit",
  "hiperplasia",
  "hiperseks",
  "hiperseksual",
  "hipersensitif",
  "hipersonik",
  "hipersonika",
  "hipertensi",
  "hipertonik",
  "hipertradisional",
  "hipertrikosis",
  "hipertrofi",
  "hipervitaminosis",
  "hipnosis",
  "hipnoterapi",
  "hipnotis",
  "hipnotisme",
  "hipoblas",
  "hipodermis",
  "hipodermoklisis",
  "hipodrom",
  "hipofisis",
  "hipofremia",
  "hipogen",
  "hipoglikemia",
  "hipokondria",
  "hipokotil",
  "hipokrisi",
  "hipokrit",
  "hipokritis",
  "hipolimnion",
  "hipomastia",
  "hipomnesia",
  "hiponim",
  "hipopituitarisme",
  "hipoplankton",
  "hipoplasia",
  "hipopotamus",
  "hiposentrum",
  "hipotaksis",
  "hipotek",
  "hipotensi",
  "hipotenusa",
  "hipotermia",
  "hipotesis",
  "hipotetis",
  "hipotiroid",
  "hipotiroidisme",
  "hipotonik",
  "hipovitaminosis",
  "hipsometer",
  "hipui",
  "hirap",
  "hirau",
  "hirsutisme",
  "hiru-biru",
  "hiru-hara",
  "hirudin",
  "hiruk",
  "hirup",
  "his",
  "hisab",
  "histamina",
  "histerektomi",
  "histeria",
  "histeris",
  "histerisis",
  "histidina",
  "histogeni",
  "histokimia",
  "histologi",
  "histon",
  "histopatologi",
  "histori",
  "historikus",
  "historiografi",
  "historis",
  "historisisme",
  "historisitas",
  "hit",
  "hitam",
  "hitung",
  "hiu",
  "hiyayat",
  "hobat",
  "hobi",
  "hobo",
  "hodadoda",
  "hodah",
  "hodometer",
  "hoi",
  "hokah",
  "hoki",
  "hol",
  "holi",
  "holisme",
  "holistis",
  "holmium",
  "holobentos",
  "holoenzim",
  "holofit",
  "holofitik",
  "holofrasis",
  "hologamet",
  "hologami",
  "holograf",
  "holografis",
  "hologram",
  "holokrim",
  "holokrin",
  "holoplankton",
  "holosen",
  "holozoik",
  "homeostasis",
  "homili",
  "hominid",
  "hominoid",
  "homo",
  "homofon",
  "homofoni",
  "homogami",
  "homogen",
  "homogeni",
  "homogenitas",
  "homograf",
  "homografi",
  "homogram",
  "homoiotermal",
  "homolog",
  "homologi",
  "homonim",
  "homonimi",
  "homorgan",
  "homoseks",
  "homoseksual",
  "homoseksualisme",
  "homoseksualitas",
  "homosfer",
  "homospora",
  "homoterm",
  "homozigot",
  "honae",
  "honcoe",
  "honji",
  "honor",
  "honorarium",
  "honorer",
  "honorifik",
  "hop",
  "hopagen",
  "hopbiro",
  "hopkantor",
  "hopyes",
  "horak",
  "horas",
  "hore",
  "horizon",
  "horizontal",
  "hormat",
  "hormon",
  "hornblenda",
  "horor",
  "horoskop",
  "hortikultura",
  "hortikulturis",
  "hoskut",
  "hospital",
  "hostel",
  "hostes",
  "hosti",
  "hot",
  "hotel",
  "howitzer",
  "huakiau",
  "hubar",
  "hubaya-hubaya",
  "hububan",
  "hubulwatan",
  "hubung",
  "huda",
  "hudai",
  "hudhud",
  "hudud",
  "hufaz",
  "huh",
  "hujah",
  "hujaj",
  "hujan",
  "hujat",
  "huji",
  "hujin",
  "hujung",
  "hukah",
  "hukama",
  "hukum",
  "hula-hula",
  "hulam",
  "huler",
  "hulu",
  "hulubalang",
  "hulul",
  "hulur",
  "huma",
  "human",
  "humaniora",
  "humanis",
  "humanisasi",
  "humanisme",
  "humanistis",
  "humanitas",
  "humaniter",
  "humas",
  "humbalang",
  "humektan",
  "humerus",
  "humidifikasi",
  "humiditas",
  "humifikasi",
  "humin",
  "humor",
  "humoris",
  "humoristis",
  "humorolog",
  "humus",
  "hun",
  "huncue",
  "huni",
  "hunjam",
  "hunjuk",
  "hunkue",
  "hunus",
  "hura-hura",
  "hurah",
  "huria",
  "huriah",
  "hurikan",
  "huru-hara",
  "huruf",
  "hus",
  "husnulkhatimah",
  "hut",
  "hutan",
  "hutang",
  "huyung",
  "ialah",
  "iambus",
  "iatrogenik",
  "iba",
  "ibadah",
  "ibadat",
  "ibadurahman",
  "iban",
  "ibar-ibar",
  "ibarat",
  "ibayuh",
  "ibid",
  "ibidem",
  "ibing",
  "iblis",
  "ibni",
  "ibnu",
  "ibra",
  "ibrit",
  "ibtida",
  "ibtidaiah",
  "ibu",
  "ibul",
  "ibun",
  "ibunda",
  "ibung",
  "ibus",
  "icak-icak",
  "ida",
  "idafi",
  "idah",
  "idam",
  "idap",
  "idarah",
  "idas",
  "ide",
  "ideal",
  "idealis",
  "idealisasi",
  "idealisme",
  "idealistis",
  "idem",
  "identifikasi",
  "identik",
  "identitas",
  "ideofon",
  "ideograf",
  "ideografi",
  "ideografis",
  "ideogram",
  "ideologi",
  "ideologis",
  "ideosinkretik",
  "idep",
  "idiil",
  "idiolek",
  "idiom",
  "idiomatis",
  "idiomatologi",
  "idiosi",
  "idiosinkrasi",
  "idiosinkretik",
  "idiot",
  "idola",
  "idrak",
  "idu",
  "iduladha",
  "idulfitri",
  "ifah",
  "ifrit",
  "iftar",
  "iftitah",
  "iga",
  "igal",
  "igau",
  "iglo",
  "ihdad",
  "ihram",
  "ihsan",
  "ihsanat",
  "ihsas",
  "ihtifal",
  "ihtikar",
  "ihtilam",
  "ihtimal",
  "ihwal",
  "ijab",
  "ijabat",
  "ijajil",
  "ijarah",
  "ijas",
  "ijazah",
  "ijbar",
  "ijeman",
  "ijil",
  "ijmak",
  "ijmal",
  "ijon",
  "ijtihad",
  "ijtimaiah",
  "ijtimak",
  "ijuk",
  "ikab",
  "ikal",
  "ikamah",
  "ikan",
  "ikat",
  "ikebana",
  "ikhbar",
  "ikhlas",
  "ikhtiar",
  "ikhtiari",
  "ikhtilaf",
  "ikhtiogeografi",
  "ikhtiosarkotoksisme",
  "ikhtiotoksisme",
  "ikhtisar",
  "ikhwan",
  "iklan",
  "iklim",
  "ikon",
  "ikonis",
  "ikonograf",
  "ikonografi",
  "ikonoklasme",
  "ikonometer",
  "ikrab",
  "ikram",
  "ikrar",
  "iktibar",
  "iktidal",
  "iktikad",
  "iktikaf",
  "iktiografi",
  "iktiolit",
  "iktiologi",
  "iktiologis",
  "iktirad",
  "iktiraf",
  "iktisab",
  "ikuh",
  "ikut",
  "ilafi",
  "ilah",
  "ilahi",
  "ilahiah",
  "ilahiat",
  "ilai",
  "ilak",
  "ilam-ilam",
  "ilanun",
  "ilar",
  "ilas",
  "ilat",
  "ilegal",
  "iler",
  "iles",
  "ileum",
  "ilham",
  "ili",
  "ilian",
  "iling",
  "ilmiah",
  "ilmu",
  "ilu",
  "iluminasi",
  "ilusi",
  "ilusif",
  "ilusionis",
  "ilustrasi",
  "ilustratif",
  "ilustrator",
  "imago",
  "imaji",
  "imajinasi",
  "imajinatif",
  "imajiner",
  "imak",
  "imam",
  "imamah",
  "imamologi",
  "iman",
  "imanen",
  "imanensi",
  "imani",
  "imbak",
  "imbal",
  "imbang",
  "imbas",
  "imbau",
  "imbesil",
  "imbesilitas",
  "imbibisi",
  "imbit",
  "imbuh",
  "imigran",
  "imigrasi",
  "iming-iming",
  "imitasi",
  "imitatif",
  "imitator",
  "imkan",
  "imla",
  "imlek",
  "imobilisasi",
  "impak",
  "impas",
  "impase",
  "impedans",
  "impedansi",
  "impek",
  "imperatif",
  "imperfek",
  "imperfeksi",
  "imperial",
  "imperialis",
  "imperialisme",
  "imperium",
  "impersonal",
  "impersonalia",
  "impersonalitas",
  "impi",
  "impit",
  "implan",
  "implantasi",
  "implemen",
  "implementasi",
  "implikasi",
  "implisit",
  "implosif",
  "implosit",
  "impor",
  "importasi",
  "importir",
  "impoten",
  "impotensi",
  "impregnasi",
  "impresariat",
  "impresario",
  "impresi",
  "impresif",
  "impresionis",
  "impresionisme",
  "impresionistik",
  "imprimatur",
  "improvisasi",
  "impuls",
  "impulsif",
  "imsak",
  "imsakiah",
  "imtihan",
  "imun",
  "imunisasi",
  "imunitas",
  "imunokimia",
  "imunokompromi",
  "imunologi",
  "imunologis",
  "imunosupresi",
  "imunoterapi",
  "ina",
  "inadaptabilitas",
  "inai",
  "inang",
  "inangda",
  "inap",
  "inartikulat",
  "inas",
  "inaugurasi",
  "inayat",
  "inca",
  "incang-incut",
  "incar",
  "inci",
  "incit",
  "incling",
  "incrit",
  "incu",
  "incut",
  "indah",
  "indang",
  "indap",
  "indarus",
  "indayang",
  "indebitum",
  "indehoi",
  "indekos",
  "indeks",
  "inden",
  "independen",
  "inderawasih",
  "indeterminisme",
  "indigenos",
  "indigo",
  "indik",
  "indikan",
  "indikasi",
  "indikatif",
  "indikator",
  "inding",
  "indisipliner",
  "indium",
  "individu",
  "individual",
  "individualis",
  "individualisasi",
  "individualisme",
  "individualistis",
  "individualitas",
  "individuasi",
  "indoktrinasi",
  "indolen",
  "indolensi",
  "indologi",
  "indonesia",
  "indonesianisasi",
  "indra",
  "indraloka",
  "indranila",
  "indria",
  "indriawi",
  "indu",
  "induk",
  "induksi",
  "induktans",
  "induktansi",
  "induktif",
  "induktor",
  "indung",
  "indusemen",
  "industri",
  "inefisiensi",
  "inersia",
  "infak",
  "infanteri",
  "infantil",
  "infantilisasi",
  "infantilisme",
  "infarktus",
  "infeksi",
  "inferensi",
  "inferensial",
  "inferior",
  "inferioritas",
  "inferno",
  "infertil",
  "infertilitas",
  "infiks",
  "infiltrasi",
  "infiltrometer",
  "infinitif",
  "infiradi",
  "inflamasi",
  "inflasi",
  "inflatoar",
  "infleksi",
  "infleksibel",
  "infleksif",
  "infloresen",
  "infloresens",
  "influensa",
  "influenza",
  "info",
  "informal",
  "informan",
  "informasi",
  "informatif",
  "informatika",
  "inframerah",
  "infrasonik",
  "infrastruktur",
  "infus",
  "inga",
  "ingar",
  "ingat",
  "ingau",
  "inggang-inggung",
  "inggris",
  "inggu",
  "inggung",
  "ingin",
  "ingkah",
  "ingkar",
  "ingkir",
  "ingresif",
  "ingsar",
  "ingsun",
  "ingsut",
  "ingus",
  "inheren",
  "inhibisi",
  "inhibitor",
  "ini",
  "inisial",
  "inisiasi",
  "inisiatif",
  "inisiator",
  "injak",
  "injap",
  "injeksi",
  "injil",
  "injin",
  "inkarnasi",
  "inkarserasi",
  "inkarsunah",
  "inkaso",
  "inklaring",
  "inklinasi",
  "inklinometer",
  "inklusif",
  "inkognito",
  "inkompabilitas",
  "inkompatibilitas",
  "inkompeten",
  "inkomplet",
  "inkonfeso",
  "inkonsisten",
  "inkonsistensi",
  "inkonstitusional",
  "inkonvensional",
  "inkorporasi",
  "inkremental",
  "inkubasi",
  "inkubator",
  "inkulturasi",
  "inlander",
  "inohong",
  "inokulasi",
  "inovasi",
  "inovatif",
  "inovator",
  "insaf",
  "insan",
  "insanan",
  "insang",
  "insani",
  "insanulkamil",
  "insar",
  "insek",
  "insekta",
  "insektari",
  "insektisida",
  "insektivor",
  "insektivora",
  "insektologi",
  "inseminasi",
  "insentif",
  "insersi",
  "inses",
  "inset",
  "insiden",
  "insidental",
  "insinerator",
  "insinuasi",
  "insinuatif",
  "insinye",
  "insinyur",
  "inskripsi",
  "inslan",
  "insolven",
  "insomnia",
  "inspeksi",
  "inspektorat",
  "inspektur",
  "inspirasi",
  "instabilitas",
  "instalasi",
  "instalatur",
  "instan",
  "instansi",
  "insting",
  "instingtif",
  "institusi",
  "institusional",
  "institut",
  "instruksi",
  "instruksional",
  "instruktif",
  "instruktur",
  "instrumen",
  "instrumental",
  "instrumentalia",
  "instrumentalis",
  "instrumentasi",
  "insubordinasi",
  "insulator",
  "insuler",
  "insulin",
  "insulinde",
  "insya",
  "intai",
  "intan",
  "integral",
  "integralistik",
  "integrasi",
  "integrasionis",
  "integritas",
  "integumen",
  "intel",
  "intelek",
  "intelektual",
  "intelektualisasi",
  "intelektualisme",
  "inteligen",
  "inteligensi",
  "inteligensia",
  "intelijen",
  "intendans",
  "intens",
  "intensi",
  "intensif",
  "intensifikasi",
  "intensional",
  "intensitas",
  "interaksi",
  "interaksionistik",
  "interaktif",
  "interdepartemental",
  "interdependen",
  "interdiksi",
  "interdisipliner",
  "interegnum",
  "interelasi",
  "interen",
  "interes",
  "interesan",
  "interetnik",
  "interferens",
  "interferensi",
  "interferometer",
  "interferon",
  "interglasial",
  "interim",
  "interinsuler",
  "interior",
  "interjeksi",
  "interkom",
  "interkoneksi",
  "interkonsonantal",
  "interkontinental",
  "interlokal",
  "interlokutor",
  "interlud",
  "intermeso",
  "intermezo",
  "intermolekuler",
  "intern",
  "internal",
  "internalisasi",
  "internasional",
  "internasionalisasi",
  "internat",
  "internir",
  "internis",
  "internuntius",
  "interogasi",
  "interogatif",
  "interogator",
  "interpelan",
  "interpelasi",
  "interpelator",
  "interpiu",
  "interpolasi",
  "interpretasi",
  "interpretatif",
  "interpretator",
  "interpreter",
  "intersepsi",
  "intertestial",
  "intertidal",
  "interupsi",
  "interval",
  "intervensi",
  "intervensionisme",
  "interviu",
  "interzona",
  "inti",
  "intifadah",
  "intiha",
  "intikad",
  "intim",
  "intima",
  "intimasi",
  "intimidasi",
  "intip",
  "intipati",
  "intisari",
  "intoksikasi",
  "intoleran",
  "intonasi",
  "intradermal",
  "intrakalimat",
  "intrakurikuler",
  "intralinguistis",
  "intramembran",
  "intramolekul",
  "intramuskuler",
  "intransitif",
  "intraseluler",
  "intrauniversiter",
  "intravaskuler",
  "intravena",
  "intrik",
  "intrinsik",
  "intro",
  "introduksi",
  "introjeksi",
  "introspeksi",
  "introver",
  "intrusi",
  "intuisi",
  "intuitif",
  "intumesensi",
  "invaginasi",
  "invalid",
  "invasi",
  "invensi",
  "inventaris",
  "inventarisasi",
  "inventif",
  "inventor",
  "inventori",
  "inventoriminat",
  "inversi",
  "invertebrata",
  "investasi",
  "investigasi",
  "investigatif",
  "investor",
  "invitasi",
  "invois",
  "involusi",
  "inyik",
  "inzar",
  "inziaj",
  "iodin",
  "ion",
  "ionisasi",
  "ionosfer",
  "iota",
  "ipar",
  "ipis",
  "ipon",
  "iprit",
  "ipuh",
  "ipuk",
  "ipung",
  "iqamat",
  "iqra",
  "ira",
  "iradat",
  "iradiasi",
  "irafah",
  "irah-irahan",
  "iram",
  "irama",
  "iras",
  "irasional",
  "irasionalitas",
  "iri",
  "iridium",
  "irigasi",
  "irigator",
  "irik",
  "iring",
  "iris",
  "irit",
  "iritabilitas",
  "iritasi",
  "iritatif",
  "ironi",
  "ironis",
  "irsyad",
  "irung",
  "irus",
  "isa",
  "isak",
  "isalohipse",
  "isap",
  "isbat",
  "iseng",
  "isentropik",
  "isi",
  "isim",
  "isis",
  "isit",
  "iskemia",
  "islah",
  "islam",
  "islami",
  "islamiah",
  "islamis",
  "islamisasi",
  "islamisme",
  "islamologi",
  "isoaglutinin",
  "isobar",
  "isobarik",
  "isobat",
  "isobron",
  "isodin",
  "isodinamik",
  "isofase",
  "isofen",
  "isofet",
  "isoflor",
  "isofon",
  "isogamet",
  "isogami",
  "isoglos",
  "isogon",
  "isogram",
  "isohalin",
  "isohel",
  "isohiet",
  "isohips",
  "isokal",
  "isokalori",
  "isokemi",
  "isokeraunik",
  "isokor",
  "isokorik",
  "isokronisme",
  "isolasi",
  "isolasionisme",
  "isolatif",
  "isolator",
  "isoleks",
  "isolemen",
  "isolir",
  "isomer",
  "isometrik",
  "isomorf",
  "isomorfis",
  "isomorfisme",
  "isonefel",
  "isonomi",
  "isopal",
  "isopiestik",
  "isoplet",
  "isoriza",
  "isosilabisme",
  "isotah",
  "isoterm",
  "isotermal",
  "isotop",
  "isotrop",
  "isotropik",
  "isovolumik",
  "isra",
  "israf",
  "istal",
  "istan",
  "istana",
  "istanggi",
  "istaz",
  "istazah",
  "istiadat",
  "istianah",
  "istiazah",
  "istibdad",
  "istibra",
  "istidlal",
  "istidraj",
  "istifham",
  "istigasah",
  "istigfar",
  "istihadah",
  "istihsan",
  "istikamah",
  "istikharah",
  "istikhlaf",
  "istiklal",
  "istikmal",
  "istilah",
  "istima",
  "istimaiah",
  "istimewa",
  "istimna",
  "istimtak",
  "istinggar",
  "istinja",
  "istiqlal",
  "istirahat",
  "istislah",
  "istislam",
  "istisna",
  "istitaah",
  "istiwa",
  "istri",
  "isu",
  "isya",
  "isyarat",
  "isytiak",
  "isyu",
  "italik",
  "item",
  "iterasi",
  "iterbium",
  "itibak",
  "itibar",
  "itidal",
  "itifak",
  "itihad",
  "itik",
  "itikad",
  "itikaf",
  "itil",
  "itisal",
  "itlak",
  "itrium",
  "itu",
  "iudisasi",
  "iur",
  "iwad",
  "iya",
  "izah",
  "izin",
  "jaat",
  "jab",
  "jabal",
  "jabang",
  "jabar",
  "jabariah",
  "jabat",
  "jabir",
  "jables",
  "jabrik",
  "jabung",
  "jadah",
  "jadam",
  "jadayat",
  "jadi",
  "jaduk",
  "jadwal",
  "jaga",
  "jagabaya",
  "jagabela",
  "jagal",
  "jagang",
  "jagapati",
  "jagaraga",
  "jagat",
  "jagawana",
  "jago",
  "jagra",
  "jagrak",
  "jaguar",
  "jagung",
  "jagur",
  "jah",
  "jaha",
  "jahan",
  "jahanam",
  "jahar",
  "jaharu",
  "jahat",
  "jahe",
  "jahil",
  "jahiliah",
  "jahiriah",
  "jahit",
  "jahul",
  "jail",
  "jainisme",
  "jaipong",
  "jais",
  "jaiz",
  "jaja",
  "jajah",
  "jajak",
  "jajal",
  "jajan",
  "jajar",
  "jaka",
  "jakal",
  "jakas",
  "jaket",
  "jaksa",
  "jaksi",
  "jakun",
  "jala",
  "jalabria",
  "jalad",
  "jalak",
  "jalal",
  "jalan",
  "jalang",
  "jalangkote",
  "jalangkung",
  "jalar",
  "jali",
  "jalibut",
  "jalil",
  "jalin",
  "jalma",
  "jalu",
  "jalur",
  "jam",
  "jamaah",
  "jamadat",
  "jamah",
  "jamak",
  "jamal",
  "jaman",
  "jamang",
  "jambak",
  "jambal",
  "jamban",
  "jambang",
  "jambar",
  "jambat",
  "jambe",
  "jambiah",
  "jambian",
  "jamblang",
  "jambon",
  "jambore",
  "jambret",
  "jambu",
  "jambul",
  "jambulan",
  "jambur",
  "jamhur",
  "jamiah",
  "jamiatul",
  "jamik",
  "jamil",
  "jamin",
  "jamis",
  "jamiyah",
  "jamiyatul",
  "jampal",
  "jampen",
  "jampi",
  "jampuk",
  "jamrah",
  "jamrud",
  "jamu",
  "jamung",
  "jamur",
  "janabah",
  "janabijana",
  "janah",
  "janat",
  "janda",
  "jangak",
  "jangan",
  "jangar",
  "jangat",
  "janggal",
  "janggelan",
  "janggi",
  "janggolan",
  "janggung",
  "janggut",
  "jangka",
  "jangkah",
  "jangkang",
  "jangkap",
  "jangkar",
  "jangkat",
  "jangkau",
  "jangki",
  "jangkih",
  "jangkih-mangkih",
  "jangking",
  "jangkir",
  "jangkit",
  "jangkrik",
  "jangkung",
  "jangla",
  "jangol",
  "jani",
  "janik",
  "janin",
  "janjang",
  "janji",
  "jantan",
  "jantang",
  "jantina",
  "jantuk",
  "jantung",
  "jantur",
  "janturan",
  "januari",
  "janubi",
  "janur",
  "jap",
  "japan",
  "japin",
  "japu",
  "japuk",
  "jara",
  "jarab",
  "jarah",
  "jarak",
  "jaram",
  "jaran",
  "jaranan",
  "jarang",
  "jaras",
  "jarem",
  "jargon",
  "jari",
  "jariah",
  "jariji",
  "jarimah",
  "jaring",
  "jarit",
  "jarjau",
  "jaro",
  "jarotan",
  "jarum",
  "jarwa",
  "jas",
  "jasa",
  "jasad",
  "jasadi",
  "jasmani",
  "jasmaniah",
  "jasus",
  "jaswadi",
  "jatah",
  "jatayu",
  "jati",
  "jatilan",
  "jatmika",
  "jatuh",
  "jatukrama",
  "jauh",
  "jauhar",
  "jauhari",
  "jauza",
  "jawab",
  "jawang",
  "jawanisasi",
  "jawara",
  "jawat",
  "jawawut",
  "jawer",
  "jawi",
  "jawil",
  "jaya",
  "jayacihna",
  "jayapatra",
  "jayasong",
  "jayastamba",
  "jayeng",
  "jaz",
  "jazam",
  "jazirah",
  "jazirat",
  "jebab",
  "jebah",
  "jebai",
  "jebak",
  "jebang",
  "jebar",
  "jebat",
  "jeblok",
  "jeblos",
  "jebluk",
  "jebol",
  "jebor",
  "jebrol",
  "jebuh",
  "jebung",
  "jebur",
  "jeda",
  "jeding",
  "jedot",
  "jegal",
  "jegang",
  "jegil",
  "jegogan",
  "jegung",
  "jejabah",
  "jejak",
  "jejaka",
  "jejal",
  "jejap",
  "jejas",
  "jejengkok",
  "jejer",
  "jejunum",
  "jejuri",
  "jeket",
  "jeksi",
  "jel",
  "jela",
  "jelabak",
  "jelabir",
  "jeladan",
  "jeladren",
  "jeladri",
  "jelaga",
  "jelagra",
  "jelah",
  "jelai",
  "jelajah",
  "jelak",
  "jelalat",
  "jelamprang",
  "jelanak",
  "jelang",
  "jelangak",
  "jelangkung",
  "jelantah",
  "jelapak",
  "jelapang",
  "jelar",
  "jelarang",
  "jelas",
  "jelata",
  "jelatang",
  "jelau",
  "jelawat",
  "jelejeh",
  "jelek",
  "jelempah",
  "jelengar",
  "jelentik",
  "jelepak",
  "jelepok",
  "jeli",
  "jelih",
  "jelijih",
  "jelimet",
  "jelimpat",
  "jeling",
  "jelir",
  "jelit",
  "jelita",
  "jelma",
  "jelu",
  "jeluak",
  "jeluang",
  "jelujur",
  "jeluk",
  "jelum",
  "jelungkap",
  "jeluntung",
  "jelunut",
  "jelur-jelir",
  "jelus",
  "jelut",
  "jelutung",
  "jem",
  "jemaah",
  "jemaat",
  "jemah",
  "jemala",
  "jemang",
  "jemari",
  "jemaring",
  "jemawa",
  "jemba",
  "jembak",
  "jembalang",
  "jembar",
  "jembatan",
  "jembel",
  "jember",
  "jembiah",
  "jembrana",
  "jembut",
  "jemeki",
  "jemerlang",
  "jempalik",
  "jempalit",
  "jempana",
  "jemparing",
  "jempol",
  "jempul",
  "jemput",
  "jemu",
  "jemuas",
  "jemuju",
  "jemur",
  "jenahar",
  "jenak",
  "jenaka",
  "jenama",
  "jenang",
  "jenangau",
  "jenat",
  "jenawi",
  "jenayah",
  "jenazah",
  "jendal",
  "jendala",
  "jendel",
  "jendela",
  "jendera",
  "jenderal",
  "jendol",
  "jendul",
  "jenela",
  "jeneng",
  "jenewer",
  "jeng",
  "jengah",
  "jengang",
  "jengat",
  "jengek",
  "jenggala",
  "jenggar",
  "jengger",
  "jengget",
  "jengglong",
  "jenggot",
  "jengguk",
  "jenggul",
  "jenggut",
  "jengit",
  "jengkal",
  "jengkang",
  "jengkek",
  "jengkel",
  "jengkelit",
  "jengkeng",
  "jengker",
  "jengket",
  "jengki",
  "jengking",
  "jengkit",
  "jengkol",
  "jengkolet",
  "jengkot",
  "jenglong",
  "jenguh",
  "jenguk",
  "jengul",
  "jenis",
  "jenius",
  "jenjam",
  "jenjang",
  "jenjeng",
  "jentaka",
  "jentang",
  "jentayu",
  "jentelmen",
  "jentera",
  "jentik",
  "jentur",
  "jenu",
  "jenuh",
  "jepa",
  "jepet",
  "jepit",
  "jeprat",
  "jepret",
  "jepun",
  "jeput",
  "jera",
  "jerabai",
  "jeradik",
  "jeragih",
  "jerah",
  "jerahak",
  "jerahap",
  "jerait",
  "jeram",
  "jeramah",
  "jerambah",
  "jerambai",
  "jerambang",
  "jerambung",
  "jerami",
  "jeran",
  "jerang",
  "jerangan",
  "jerangau",
  "jerangkah",
  "jerangkak",
  "jerangkang",
  "jerangkong",
  "jerap",
  "jerapah",
  "jerat",
  "jerau",
  "jeraus",
  "jerawat",
  "jerba",
  "jerbak",
  "jereket",
  "jeremak",
  "jeremba",
  "jerembap",
  "jerembat",
  "jerembet",
  "jerembun",
  "jerempak",
  "jereng",
  "jerepet",
  "jeri",
  "jeriau",
  "jerigen",
  "jerih",
  "jeriji",
  "jeriken",
  "jering",
  "jeringing",
  "jerit",
  "jerjak",
  "jerkah",
  "jerkat",
  "jermal",
  "jermang",
  "jernang",
  "jernih",
  "jero",
  "jeroan",
  "jerohok",
  "jerojol",
  "jerongkang",
  "jerongkes",
  "jerongkok",
  "jerongkong",
  "jerubung",
  "jeruji",
  "jeruju",
  "jeruk",
  "jerukun",
  "jerukup",
  "jerum",
  "jerumat",
  "jerumbai",
  "jerumun",
  "jerumus",
  "jerun",
  "jerung",
  "jerungkau",
  "jerungkis",
  "jerungkung",
  "jerunuk",
  "jerupih",
  "jesben",
  "jet",
  "jetis",
  "jetsam",
  "jetset",
  "jewer",
  "jiawang",
  "jib",
  "jibaku",
  "jibilah",
  "jibrail",
  "jibril",
  "jibti",
  "jibun",
  "jicap",
  "jicapgo",
  "jicing",
  "jidal",
  "jidar",
  "jidat",
  "jidur",
  "jigong",
  "jigrah",
  "jih",
  "jihad",
  "jihat",
  "jijik",
  "jijit",
  "jijitsu",
  "jika",
  "jikalau",
  "jil",
  "jila",
  "jilah",
  "jilam",
  "jilat",
  "jilbab",
  "jilid",
  "jim",
  "jimahir",
  "jimak",
  "jimakir",
  "jimat",
  "jimawal",
  "jimbit",
  "jimpit",
  "jin",
  "jinak",
  "jinayah",
  "jindra",
  "jinem",
  "jineman",
  "jineng",
  "jingap",
  "jingau",
  "jingga",
  "jinggring",
  "jingkat",
  "jingkik",
  "jingkrak",
  "jingo",
  "jingoisme",
  "jingu",
  "jinjang",
  "jinjing",
  "jinjit",
  "jinsom",
  "jintan",
  "jip",
  "jipang",
  "jiplak",
  "jipro",
  "jir",
  "jirak",
  "jiran",
  "jirat",
  "jirian",
  "jirus",
  "jisim",
  "jitah",
  "jitak",
  "jitok",
  "jitu",
  "jiwa",
  "jiwat",
  "jiwatman",
  "jiwit",
  "jizyah",
  "jlegur",
  "joang",
  "jobak",
  "jobong",
  "jodang",
  "jodoh",
  "jodong",
  "jogan",
  "jogar",
  "joget",
  "joging",
  "joglo",
  "johan",
  "johar",
  "johari",
  "jojing",
  "jojol",
  "jok",
  "joki",
  "jolak",
  "jolek",
  "joli",
  "jolok",
  "jolong",
  "jolor",
  "jombang",
  "jomlo",
  "jompak",
  "jompo",
  "jongang",
  "jonget",
  "jongga",
  "jonggol",
  "jonggolan",
  "jongjorang",
  "jongkang",
  "jongkar-jangkir",
  "jongkat-jangkit",
  "jongki",
  "jongko",
  "jongkok",
  "jongkong",
  "jongos",
  "jonjot",
  "jontoh",
  "jontor",
  "jontrot",
  "joran",
  "joreng",
  "jori",
  "jorjoran",
  "jorok",
  "jorong",
  "josna",
  "jota",
  "jotang",
  "jotos",
  "joule",
  "jrambah",
  "jreng",
  "jua",
  "juadah",
  "juak",
  "jual",
  "juan",
  "juandang",
  "juang",
  "juar",
  "juara",
  "jubah",
  "jubel",
  "jubin",
  "jublag",
  "jublek",
  "judek",
  "judes",
  "judi",
  "judo",
  "judogi",
  "judoka",
  "judul",
  "juek",
  "juga",
  "juhi",
  "juhut",
  "juih",
  "juita",
  "juja",
  "jujah",
  "jujai",
  "jujitsu",
  "juju",
  "jujuh",
  "jujur",
  "jujuran",
  "jujut",
  "jukstaposisi",
  "jukut",
  "julab",
  "julai",
  "julang",
  "julat",
  "juli",
  "juling",
  "julir",
  "julo",
  "juluk",
  "julung",
  "julur",
  "jumadilakhir",
  "jumadilawal",
  "jumantan",
  "jumantara",
  "jumat",
  "jumbai",
  "jumbil",
  "jumbo",
  "jumbuh",
  "jumbul",
  "jumeneng",
  "jumhur",
  "jumjumah",
  "jumlah",
  "jumpa",
  "jumpalit",
  "jumpang",
  "jumpelang",
  "jumpul",
  "jumput",
  "jumrah",
  "jumud",
  "jun",
  "junam",
  "jundai",
  "jung",
  "jungat",
  "junggang",
  "jungkal",
  "jungkang",
  "jungkar",
  "jungkat",
  "jungkir",
  "jungkit",
  "jungkol",
  "jungur",
  "jungut",
  "juni",
  "junior",
  "junjung",
  "junta",
  "juntai",
  "juntrung",
  "junub",
  "junun",
  "jupang",
  "jura",
  "juragan",
  "jurai",
  "jurang",
  "juri",
  "jurik",
  "juring",
  "juris",
  "jurit",
  "jurnal",
  "jurnalis",
  "jurnalisme",
  "jurnalistik",
  "juru",
  "juruh",
  "jurung",
  "jurus",
  "jus",
  "justifikasi",
  "justru",
  "juta",
  "jute",
  "juvenil",
  "juz",
  "kaabah",
  "kaba",
  "kabah",
  "kabak",
  "kabang-kabang",
  "kabar",
  "kabaret",
  "kabat",
  "kabau",
  "kabel",
  "kabihat",
  "kabil",
  "kabilah",
  "kabin",
  "kabinet",
  "kabir",
  "kabisat",
  "kabit",
  "kaboi",
  "kabriolet",
  "kabruk",
  "kabu-kabu",
  "kabuki",
  "kabul",
  "kabumbu",
  "kabung",
  "kabupaten",
  "kabur",
  "kabus",
  "kabut",
  "kaca",
  "kacak",
  "kacam",
  "kacamata",
  "kacang",
  "kacapiring",
  "kacapuri",
  "kacar",
  "kacau",
  "kacau-balau",
  "kacauan",
  "kacek",
  "kacer",
  "kaci",
  "kacici",
  "kacip",
  "kacir",
  "kaco",
  "kacrek",
  "kacu",
  "kacuk",
  "kacukan",
  "kacung",
  "kad",
  "kada",
  "kadahajat",
  "kadal",
  "kadam",
  "kadang",
  "kadar",
  "kadariah",
  "kadas",
  "kadaster",
  "kadasteral",
  "kadastral",
  "kadaver",
  "kade",
  "kademat",
  "kadensa",
  "kader",
  "kadera",
  "kaderisasi",
  "kades",
  "kadet",
  "kadi",
  "kadim",
  "kadipaten",
  "kadir",
  "kadiriah",
  "kadmium",
  "kado",
  "kadofor",
  "kadok",
  "kadru",
  "kadung",
  "kadut",
  "kaedah",
  "kaf",
  "kafaah",
  "kafah",
  "kafan",
  "kafarat",
  "kafe",
  "kafeina",
  "kafetaria",
  "kafi",
  "kafil",
  "kafilah",
  "kafir",
  "kafiri",
  "kaftan",
  "kagak",
  "kaget",
  "kagok",
  "kagum",
  "kah",
  "kahaf",
  "kahak",
  "kahan",
  "kahang",
  "kahar",
  "kahat",
  "kahin",
  "kahrab",
  "kahwa",
  "kahwaji",
  "kahyangan",
  "kaidah",
  "kaifiah",
  "kaifiat",
  "kail",
  "kailalo",
  "kaimat",
  "kain",
  "kaing",
  "kainit",
  "kainofobia",
  "kais",
  "kaisar",
  "kait",
  "kajai",
  "kajang",
  "kajangan",
  "kajen",
  "kaji",
  "kak",
  "kakaban",
  "kakafoni",
  "kakagau",
  "kakah",
  "kakak",
  "kakaktua",
  "kakanda",
  "kakang",
  "kakao",
  "kakap",
  "kakas",
  "kakawin",
  "kakbah",
  "kakek",
  "kakerlak",
  "kaki",
  "kakodil",
  "kakofoni",
  "kakografi",
  "kakok",
  "kakologi",
  "kakostokrasi",
  "kakrupukan",
  "kaksa",
  "kaktus",
  "kaku",
  "kakuminal",
  "kakus",
  "kala",
  "kalah",
  "kalai",
  "kalajengking",
  "kalaka",
  "kalakanji",
  "kalakati",
  "kalakeran",
  "kalakian",
  "kalam",
  "kalamba",
  "kalamdan",
  "kalamin",
  "kalamisani",
  "kalamkari",
  "kalandar",
  "kalander",
  "kalang",
  "kalap",
  "kalar",
  "kalas",
  "kalat",
  "kalau",
  "kalaupun",
  "kalawija",
  "kalaza",
  "kalbi",
  "kalbu",
  "kaldera",
  "kaldron",
  "kaldu",
  "kalebas",
  "kaleidoskop",
  "kaleidoskopis",
  "kalem",
  "kalempagi",
  "kalender",
  "kaleng",
  "kali",
  "kalian",
  "kaliber",
  "kalibit",
  "kalibrasi",
  "kalibut",
  "kalicau",
  "kalifornium",
  "kaligraf",
  "kaligrafi",
  "kaligrafis",
  "kalih",
  "kalikausar",
  "kaliki",
  "kalimah",
  "kalimantang",
  "kalimat",
  "kalimatullah",
  "kalimatusyahadat",
  "kalimayah",
  "kalimpanang",
  "kalingan",
  "kalio",
  "kaliper",
  "kalipso",
  "kaliptra",
  "kalis",
  "kalistenik",
  "kalium",
  "kalk",
  "kalkalah",
  "kalkarium",
  "kalkasar",
  "kalkausar",
  "kalkopirit",
  "kalkosium",
  "kalkulasi",
  "kalkulator",
  "kalkulus",
  "kalkun",
  "kalo",
  "kalomel",
  "kalong",
  "kalongwese",
  "kalongwewe",
  "kalor",
  "kalori",
  "kalorimeter",
  "kalorimetri",
  "kalorisitas",
  "kalowatan",
  "kalpataru",
  "kalsedon",
  "kalsiferol",
  "kalsifikasi",
  "kalsinasi",
  "kalsit",
  "kalsium",
  "kalui",
  "kalumet",
  "kalung",
  "kalus",
  "kalut",
  "kam",
  "kama",
  "kamajaya",
  "kamal",
  "kamalir",
  "kamantuhu",
  "kamar",
  "kamarban",
  "kamariah",
  "kamas",
  "kamat",
  "kamba",
  "kamban",
  "kambang",
  "kambar",
  "kambeh",
  "kambeli",
  "kamber",
  "kambi",
  "kambing",
  "kambium",
  "kambrik",
  "kambrium",
  "kambuh",
  "kambus",
  "kambut",
  "kamelia",
  "kamera",
  "kamerad",
  "kamfana",
  "kamfer",
  "kamfor",
  "kamhar",
  "kami",
  "kamikaze",
  "kamil",
  "kamilmukamil",
  "kamir",
  "kamis",
  "kamisa",
  "kamisol",
  "kamisosolen",
  "kamit",
  "kamitua",
  "kamka",
  "kamkama",
  "kamomil",
  "kamp",
  "kampa",
  "kampai",
  "kampalogi",
  "kampanologi",
  "kampanye",
  "kampas",
  "kampemen",
  "kamper",
  "kampil",
  "kamping",
  "kampiun",
  "kampos",
  "kampret",
  "kampuh",
  "kampul",
  "kampung",
  "kampus",
  "kamrad",
  "kamsen",
  "kamsia",
  "kamu",
  "kamuflase",
  "kamus",
  "kan",
  "kana",
  "kanaah",
  "kanaat",
  "kanabis",
  "kanak-kanak",
  "kanal",
  "kanalisasi",
  "kanan",
  "kanang",
  "kancah",
  "kancap",
  "kanceh",
  "kancera",
  "kancil",
  "kancing",
  "kancung",
  "kancut",
  "kanda",
  "kandang",
  "kandar",
  "kandas",
  "kandel",
  "kandela",
  "kandi",
  "kandidat",
  "kandidiasis",
  "kandil",
  "kandis",
  "kandul",
  "kandung",
  "kandut",
  "kane",
  "kang",
  "kangar",
  "kangen",
  "kangka",
  "kangkang",
  "kangkung",
  "kangmas",
  "kangsa",
  "kangsar",
  "kangtau",
  "kanguru",
  "kanibal",
  "kanibalisasi",
  "kanibalisme",
  "kanigara",
  "kanilem",
  "kanina",
  "kanisah",
  "kanjal",
  "kanjang",
  "kanjar",
  "kanjeng",
  "kanji",
  "kanker",
  "kano",
  "kanoman",
  "kanon",
  "kanonir",
  "kanonis",
  "kanopi",
  "kans",
  "kansel",
  "kanselari",
  "kanselir",
  "kanser",
  "kanstof",
  "kanta",
  "kantan",
  "kantang",
  "kantar",
  "kantata",
  "kanti",
  "kantih",
  "kantil",
  "kantilever",
  "kantin",
  "kanto",
  "kantong",
  "kantor",
  "kantuk",
  "kantung",
  "kanun",
  "kanvas",
  "kanya",
  "kanyon",
  "kaok",
  "kaolin",
  "kaon",
  "kaos",
  "kaotis",
  "kap",
  "kapa",
  "kapabel",
  "kapah",
  "kapai",
  "kapak",
  "kapal",
  "kapan",
  "kapang",
  "kapar",
  "kaparinyo",
  "kapas",
  "kapasitans",
  "kapasitas",
  "kapasitor",
  "kapat",
  "kapel",
  "kapela",
  "kaper",
  "kapi",
  "kapilaritas",
  "kapiler",
  "kapiran",
  "kapis",
  "kapisa",
  "kapit",
  "kapita",
  "kapital",
  "kapitalis",
  "kapitalisme",
  "kapitalistis",
  "kapitan",
  "kapitol",
  "kapitulasi",
  "kapitulum",
  "kaplares",
  "kaplars",
  "kapling",
  "kaplok",
  "kapok",
  "kapon",
  "kaporit",
  "kappa",
  "kaprah",
  "kapri",
  "kaprikornus",
  "kapsalon",
  "kapsel",
  "kapstan",
  "kapster",
  "kapstok",
  "kapsul",
  "kapten",
  "kapu",
  "kapuk",
  "kapung",
  "kapur",
  "kapurancang",
  "kara",
  "karabin",
  "karaeng",
  "karaf",
  "karagen",
  "karah",
  "karahah",
  "karakter",
  "karakterisasi",
  "karakteristik",
  "karakterologi",
  "karam",
  "karamba",
  "karambol",
  "karamel",
  "karang",
  "karangkitri",
  "karangwulu",
  "karantina",
  "karaoke",
  "karap",
  "karapaks",
  "karapan",
  "karar",
  "karas",
  "karat",
  "karate",
  "karategi",
  "karateka",
  "karau",
  "karavan",
  "karawitan",
  "karbiah",
  "karbid",
  "karbida",
  "karbohidrase",
  "karbohidrat",
  "karboksil",
  "karbol",
  "karbolat",
  "karbolik",
  "karbon",
  "karbonado",
  "karbonan",
  "karbonat",
  "karbonil",
  "karbonisasi",
  "karborundum",
  "karburasi",
  "karburator",
  "karcis",
  "kardamunggu",
  "kardan",
  "kardia",
  "kardiak",
  "kardigan",
  "kardil",
  "kardinal",
  "kardiograf",
  "kardiografi",
  "kardiogram",
  "kardiolog",
  "kardiologi",
  "kardiovaskular",
  "karditis",
  "kardus",
  "karel",
  "karembong",
  "karena",
  "karengga",
  "kareseh-peseh",
  "karet",
  "kargo",
  "kari",
  "karib",
  "karibu",
  "karier",
  "karies",
  "karih",
  "karikatur",
  "karikatural",
  "karikaturis",
  "karil",
  "karim",
  "karimah",
  "karina",
  "karinasi",
  "karisma",
  "karismatik",
  "karismatis",
  "karitas",
  "karitatif",
  "karkas",
  "karkata",
  "karkum",
  "karkun",
  "karma",
  "karmina",
  "karminatif",
  "karnaval",
  "karnivor",
  "karosel",
  "karoseri",
  "karotena",
  "karotenoid",
  "karotis",
  "karpai",
  "karpel",
  "karper",
  "karpet",
  "karpopodil",
  "karsa",
  "karsinogen",
  "karsinogenik",
  "karsinologi",
  "karsinoma",
  "karst",
  "karteker",
  "kartel",
  "karti",
  "kartika",
  "kartilago",
  "kartografi",
  "kartogram",
  "karton",
  "kartonase",
  "kartotek",
  "kartu",
  "kartun",
  "kartunis",
  "karu",
  "karuan",
  "karuhun",
  "karun",
  "karung",
  "karunia",
  "karunkel",
  "karusi",
  "karut",
  "karya",
  "karyah",
  "karyasiswa",
  "karyat",
  "karyawisata",
  "kas",
  "kasa",
  "kasab",
  "kasabandiah",
  "kasad",
  "kasah",
  "kasai",
  "kasak-kusuk",
  "kasam",
  "kasang",
  "kasap",
  "kasar",
  "kasasi",
  "kasatmata",
  "kasau",
  "kasdu",
  "kasein",
  "kasemat",
  "kasemek",
  "kasep",
  "kaserin",
  "kaserol",
  "kaset",
  "kasi",
  "kasid",
  "kasidah",
  "kasih",
  "kasihan",
  "kasiku",
  "kasim",
  "kasima",
  "kasino",
  "kasintu",
  "kasip",
  "kasir",
  "kasiterit",
  "kaskade",
  "kaskaya",
  "kasmaran",
  "kasmir",
  "kasmutik",
  "kaspe",
  "kasrah",
  "kasregister",
  "kassia",
  "kasta",
  "kastal",
  "kastanyet",
  "kastel",
  "kasti",
  "kastrasi",
  "kastroli",
  "kasturi",
  "kasual",
  "kasualisme",
  "kasualitas",
  "kasuari",
  "kasuarina",
  "kasui",
  "kasuis",
  "kasuistik",
  "kasur",
  "kasus",
  "kasut",
  "kaswah",
  "kata",
  "katabalik",
  "katabatik",
  "katabolisme",
  "katadrom",
  "katafalk",
  "katafora",
  "katah",
  "katai",
  "katak",
  "kataka",
  "katakana",
  "kataklisme",
  "katakomba",
  "katalase",
  "katalepsi",
  "katalina",
  "katalis",
  "katalisasi",
  "katalisator",
  "katalisis",
  "katalisit",
  "katalog",
  "katalogisasi",
  "katalogus",
  "katamaran",
  "katang-katang",
  "katapel",
  "katar",
  "katarak",
  "katarsis",
  "katartik",
  "katastrofe",
  "katatoni",
  "katatonia",
  "katawi",
  "kate",
  "katebelece",
  "katedral",
  "kategori",
  "kategorial",
  "kategoris",
  "kategorisasi",
  "katek",
  "katekese",
  "katekis",
  "katekisasi",
  "katekismus",
  "katekumen",
  "katel",
  "katelum",
  "kater",
  "katering",
  "kates",
  "kateter",
  "katetometer",
  "kati",
  "katib",
  "katibin",
  "katifah",
  "katifan",
  "katik",
  "katil",
  "katimaha",
  "katimumul",
  "kation",
  "katir",
  "katirah",
  "katiti",
  "katode",
  "katok",
  "katolik",
  "katrol",
  "katuk",
  "katul",
  "katun",
  "katung",
  "katup",
  "katut",
  "katvanga",
  "katwal",
  "kau",
  "kaukab",
  "kaukasoid",
  "kaukus",
  "kaul",
  "kaula",
  "kauli",
  "kaum",
  "kaung",
  "kaupui",
  "kaus",
  "kausa",
  "kausal",
  "kausalitas",
  "kausatif",
  "kaustik",
  "kaustiksoda",
  "kaut",
  "kavaleri",
  "kaveling",
  "kaver",
  "kaviar",
  "kawa-kawa",
  "kawah",
  "kawak",
  "kawal",
  "kawan",
  "kawang",
  "kawanua",
  "kawasan",
  "kawat",
  "kawi",
  "kawih",
  "kawijayan",
  "kawin",
  "kawista",
  "kawruh",
  "kawuk",
  "kawula",
  "kawung",
  "kaya",
  "kayai",
  "kayak",
  "kayambang",
  "kayan",
  "kayang",
  "kayangan",
  "kayau",
  "kayu",
  "kayuh",
  "kayun",
  "kebab",
  "kebabal",
  "kebah",
  "kebaji",
  "kebal",
  "kebam",
  "kebas",
  "kebat",
  "kebaya",
  "kebayan",
  "kebel",
  "kebelet",
  "kebembem",
  "kebin",
  "kebiri",
  "keblangsak",
  "keblinger",
  "kebo",
  "kebon",
  "kebuk",
  "kebul",
  "kebuli",
  "kebun",
  "kebur",
  "keburu",
  "kebut",
  "kebyar",
  "kecai",
  "kecak",
  "kecalingan",
  "kecam",
  "kecambah",
  "kecamuk",
  "kecandan",
  "kecantol",
  "kecap",
  "kecapi",
  "kecar",
  "kece",
  "kecebong",
  "kecek",
  "kecele",
  "keceng",
  "kecepek",
  "kecer",
  "kecewa",
  "keci",
  "keciak",
  "kecibak",
  "kecibeling",
  "kecik",
  "kecil",
  "kecimik",
  "kecimpring",
  "kecimpung",
  "kecimus",
  "kecipak",
  "kecipir",
  "kecipuk",
  "kecit",
  "keciut",
  "kecoak",
  "kecoh",
  "kecombrang",
  "kecong",
  "kecrek",
  "kecu",
  "kecuali",
  "kecubung",
  "kecuh-kecah",
  "kecumik",
  "kecundang",
  "kecup",
  "kecut",
  "kedabu",
  "kedadak",
  "kedah",
  "kedai",
  "kedak",
  "kedal",
  "kedaluwarsa",
  "kedam",
  "kedang",
  "kedangkai",
  "kedangkan",
  "kedangsa",
  "kedap",
  "kedasih",
  "kedau",
  "kedaung",
  "kedayan",
  "kedebong",
  "kedek",
  "kedekai",
  "kedeki",
  "kedekik",
  "kedekut",
  "kedelai",
  "kedele",
  "kedemat",
  "kedemplung",
  "kedempung",
  "kedengkang",
  "kedengkik",
  "keder",
  "kedera",
  "kederang",
  "kedewaga",
  "kedi",
  "kedidi",
  "kedik",
  "kedikit",
  "kedip",
  "kedodoran",
  "kedok",
  "kedondong",
  "kedongdong",
  "kedongkok",
  "kedot",
  "keduduk",
  "keduk",
  "kedul",
  "kedumung",
  "kedung",
  "kedut",
  "keferdom",
  "kehel",
  "keibodan",
  "kejai",
  "kejam",
  "kejamas",
  "kejan",
  "kejang",
  "kejap",
  "kejar",
  "kejat",
  "kejawen",
  "kejen",
  "kejer",
  "keji",
  "kejibeling",
  "kejip",
  "kejolak",
  "kejora",
  "keju",
  "kejuju",
  "kejur",
  "kejut",
  "kek",
  "kekah",
  "kekal",
  "kekam",
  "kekandi",
  "kekang",
  "kekapas",
  "kekar",
  "kekara",
  "kekas",
  "kekat",
  "kekau",
  "kekawin",
  "kekeba",
  "kekebik",
  "kekeh",
  "kekek",
  "kekel",
  "kekemben",
  "kekep",
  "keker",
  "keki",
  "kekitir",
  "kekok",
  "kekol",
  "kekrupukan",
  "kelab",
  "kelabak",
  "kelabang",
  "kelabat",
  "kelabau",
  "kelabu",
  "keladak",
  "keladan",
  "keladau",
  "keladi",
  "kelah",
  "kelahi",
  "kelai",
  "kelak",
  "kelak-kelik",
  "kelak-keluk",
  "kelakah",
  "kelakanji",
  "kelakar",
  "kelalang",
  "kelam",
  "kelamai",
  "kelamarin",
  "kelambai",
  "kelambir",
  "kelambit",
  "kelambu",
  "kelambur",
  "kelamin",
  "kelamkari",
  "kelana",
  "kelandera",
  "kelang",
  "kelang-kelok",
  "kelangkan",
  "kelangkang",
  "kelanjar",
  "kelantang",
  "kelap",
  "kelapa",
  "kelar",
  "kelara",
  "kelarah",
  "kelarai",
  "kelaras",
  "kelari",
  "kelas",
  "kelasa",
  "kelasah",
  "kelasak",
  "kelasi",
  "kelat",
  "kelati",
  "kelawan",
  "kelayan",
  "kelayang",
  "kelayu",
  "kelder",
  "kelebat",
  "kelebek",
  "kelebet",
  "kelebu",
  "kelebuk",
  "kelebut",
  "keledai",
  "keledang",
  "keledar",
  "keledek",
  "kelejat",
  "kelek",
  "kelekap",
  "kelekatu",
  "kelelap",
  "kelelawar",
  "kelelesa",
  "kelelot",
  "kelemak-kelemek",
  "kelemantang",
  "kelemayar",
  "kelemayuh",
  "kelembahang",
  "kelembai",
  "kelembak",
  "kelemban",
  "kelembuai",
  "kelempai",
  "kelemping",
  "kelemton",
  "kelemumur",
  "kelemur",
  "kelencer",
  "kelendara",
  "keleneng",
  "kelengar",
  "kelenggara",
  "kelengkeng",
  "kelengkiak",
  "kelening",
  "kelenjar",
  "kelentang",
  "kelenteng",
  "kelentik",
  "kelenting",
  "kelentit",
  "kelentong",
  "kelentung",
  "kelenung",
  "kelenyit",
  "kelep",
  "kelepai",
  "kelepak",
  "kelepat",
  "kelepek",
  "kelepet",
  "kelepik",
  "kelepir",
  "kelepit",
  "kelepuk",
  "kelepur",
  "keler",
  "kelereng",
  "kelesa",
  "kelesah",
  "keleseh",
  "kelesek",
  "kelesot",
  "keletah",
  "keletak",
  "keletang",
  "keletar",
  "keleti",
  "keletik",
  "keletuk",
  "keletung",
  "kelewang",
  "keli",
  "kelian",
  "keliar",
  "kelibang",
  "kelibat",
  "kelicap",
  "kelici",
  "kelicik",
  "kelih",
  "kelijak",
  "kelik",
  "kelika",
  "kelikah",
  "kelikat",
  "keliki",
  "kelikih",
  "kelikik",
  "kelikir",
  "keliling",
  "kelilip",
  "kelim",
  "kelimat",
  "kelimpanan",
  "kelimpungan",
  "kelimun",
  "kelimut",
  "kelinci",
  "kelincir",
  "kelindan",
  "keling",
  "kelingking",
  "kelingsir",
  "kelining",
  "kelinjat",
  "kelintang",
  "kelintar",
  "kelinting",
  "kelip",
  "kelipat",
  "kelir",
  "keliru",
  "kelis",
  "kelisera",
  "kelisere",
  "kelit",
  "keliti",
  "kelitik",
  "keliwon",
  "kelobot",
  "kelobotisme",
  "kelocak",
  "keloceh",
  "kelodan",
  "keloelektrovolt",
  "keloid",
  "kelojot",
  "kelok",
  "kelokak",
  "kelola",
  "kelolong",
  "kelom",
  "kelombeng",
  "kelompang",
  "kelompen",
  "kelompok",
  "kelon",
  "keloneng",
  "kelonet",
  "kelong",
  "kelongkong",
  "kelongsong",
  "kelontang",
  "kelontang-kelantung",
  "kelontong",
  "kelonyo",
  "kelop",
  "kelopak",
  "kelor",
  "kelorak",
  "kelos",
  "kelosok",
  "kelotok",
  "keloyak",
  "keloyang",
  "keloyor",
  "kelp",
  "kelu",
  "kelua",
  "keluai",
  "keluak",
  "keluan",
  "keluang",
  "keluangsa",
  "keluar",
  "keluarga",
  "kelubak",
  "kelubi",
  "keluburan",
  "keluh",
  "kelui",
  "keluih",
  "keluk",
  "kelukup",
  "kelukur",
  "keluli",
  "kelulu",
  "kelulus",
  "kelulut",
  "kelumit",
  "kelumpang",
  "kelumun",
  "kelun",
  "keluna",
  "kelunak",
  "kelung",
  "kelupas",
  "kelupur",
  "keluron",
  "keluruk",
  "kelurut",
  "kelus",
  "kelusuh-kelasah",
  "kelut",
  "kelutum",
  "keluwung",
  "keluyuk",
  "keluyur",
  "kemah",
  "kemal",
  "kemala",
  "kemam",
  "kemamang",
  "keman",
  "kemandang",
  "kemandoran",
  "kemang",
  "kemangi",
  "kemarau",
  "kemari",
  "kemarin",
  "kemaruk",
  "kemas",
  "kemat",
  "kematu",
  "kematus",
  "kemayu",
  "kembal",
  "kembali",
  "kemban",
  "kembang",
  "kembar",
  "kembara",
  "kembatu",
  "kembayat",
  "kembeng",
  "kembera",
  "kembili",
  "kemboja",
  "kembol",
  "kembu",
  "kembuk",
  "kembung",
  "kembur",
  "kembut",
  "kemeja",
  "kemejan",
  "kemekmek",
  "kemelut",
  "kemenakan",
  "kemendalam",
  "kemendang",
  "kemendur",
  "kementam",
  "kemenyan",
  "kemerakan",
  "kemesu",
  "kemi",
  "kemih",
  "kemik",
  "kemilap",
  "kemiluminesens",
  "kemiri",
  "kemit",
  "kemlaka",
  "kemlandingan",
  "kemloko",
  "kemoceng",
  "kemokinesis",
  "kemon",
  "kemopsikiatri",
  "kemoterapi",
  "kempa",
  "kempal",
  "kempang",
  "kempas",
  "kempek",
  "kempes",
  "kempetai",
  "kempis",
  "kempit",
  "kemplang",
  "kempot",
  "kempu",
  "kempuh",
  "kempul",
  "kempunan",
  "kempung",
  "kemput",
  "kempyang",
  "kemu",
  "kemucing",
  "kemudi",
  "kemudian",
  "kemudu",
  "kemukus",
  "kemul",
  "kemumu",
  "kemuncak",
  "kemuncup",
  "kemundir",
  "kemung",
  "kemungkus",
  "kemuning",
  "kemunting",
  "kemurgi",
  "kemut",
  "kemutul",
  "ken",
  "kena",
  "kenaf",
  "kenal",
  "kenan",
  "kenang",
  "kenanga",
  "kenap",
  "kenapa",
  "kenapang",
  "kenari",
  "kenas",
  "kencan",
  "kencana",
  "kencang",
  "kencar",
  "kenceng",
  "kencing",
  "kencit",
  "kencong",
  "kencrang-kencring",
  "kencreng",
  "kencung",
  "kencur",
  "kendaga",
  "kendal",
  "kendala",
  "kendali",
  "kendana",
  "kendang",
  "kendara",
  "kendati",
  "kendayakan",
  "kendeka",
  "kenderi",
  "kendi",
  "kendil",
  "kendit",
  "kendo",
  "kendong",
  "kenduduk",
  "kendung",
  "kendungan",
  "kendur",
  "kenduri",
  "kenek",
  "keneker",
  "kenem",
  "kenematik",
  "kenes",
  "keng",
  "kengkang",
  "kengkeng",
  "kenidai",
  "kenikir",
  "kening",
  "kenohong",
  "kenong",
  "kenop",
  "kensel",
  "kental",
  "kentang",
  "kentar",
  "kentara",
  "kenteng",
  "kentrung",
  "kentung",
  "kentut",
  "kenur",
  "kenya",
  "kenyal",
  "kenyam",
  "kenyang",
  "kenyat",
  "kenyat-kenyit",
  "kenyet-kenyut",
  "kenyi",
  "kenyih",
  "kenyir",
  "kenyit",
  "kenyut",
  "keok",
  "keong",
  "kep",
  "kepada",
  "kepah",
  "kepai",
  "kepak",
  "kepal",
  "kepala",
  "kepalang",
  "kepam",
  "kepang",
  "kepar",
  "keparat",
  "kepayang",
  "kepecong",
  "kepek",
  "kepel",
  "kepencong",
  "kepeng",
  "keper",
  "keperancak",
  "kepet",
  "kepetang",
  "kepialu",
  "kepiat",
  "kepik",
  "kepil",
  "kepincut",
  "kepinding",
  "keping",
  "kepingin",
  "kepinis",
  "kepinjal",
  "kepiri",
  "kepis",
  "kepit",
  "kepiting",
  "keplak",
  "kepleset",
  "keplok",
  "kepodang",
  "kepoh",
  "kepol",
  "kepompong",
  "keponakan",
  "kepot",
  "keprak",
  "keprek",
  "kepret",
  "kepris",
  "kepruk",
  "kepuh",
  "kepuk",
  "kepul",
  "kepulaga",
  "kepundan",
  "kepundung",
  "kepung",
  "kepurun",
  "keputren",
  "kepuyuk",
  "kera",
  "kerabang",
  "kerabat",
  "kerabik",
  "kerabu",
  "keracak",
  "keracap",
  "keraeng",
  "kerah",
  "kerahi",
  "kerai",
  "kerajang",
  "kerajat",
  "kerak",
  "kerakah",
  "kerakal",
  "kerakap",
  "kerakeling",
  "keram",
  "kerama",
  "keraman",
  "keramas",
  "keramat",
  "keramba",
  "kerambil",
  "kerambit",
  "keramboja",
  "keramik",
  "keramikus",
  "kerampagi",
  "kerampang",
  "keramunting",
  "keran",
  "kerancang",
  "keranda",
  "kerang",
  "kerang-keroh",
  "kerangas",
  "kerangka",
  "kerangkai",
  "kerangkeng",
  "kerani",
  "keranjang",
  "keranjat",
  "keranji",
  "keranjingan",
  "keranta",
  "kerantong",
  "kerap",
  "kerapu",
  "keras",
  "kerasan",
  "kerat",
  "keratabasa",
  "keratin",
  "keratitis",
  "keratoelastin",
  "keraton",
  "kerau",
  "kerawai",
  "kerawak",
  "kerawang",
  "kerawat",
  "kerawit",
  "kerbang",
  "kerbat",
  "kerbau",
  "kerbuk",
  "kercap-kercip",
  "kercap-kercup",
  "kercing",
  "kercit",
  "kercup",
  "kercut",
  "kerdak",
  "kerdam",
  "kerdil",
  "kerdom",
  "kerdut",
  "kere",
  "kerebok",
  "kereceng",
  "kerecik",
  "keredak",
  "keredep",
  "keredok",
  "keredong",
  "kerek",
  "kereket",
  "kerekot",
  "kerekut",
  "keremi",
  "keremot",
  "kerempagi",
  "kerempeng",
  "kerempung",
  "keremus",
  "keren",
  "kerencang",
  "kerencung",
  "kerendang",
  "kereneng",
  "kereng",
  "kerengga",
  "kerenggamunggu",
  "kerengkam",
  "kerengkiang",
  "kerentam",
  "kerentang",
  "kerenting",
  "kerenyam",
  "kerenyot",
  "kerepas",
  "kerepek",
  "kerepes",
  "kerepot",
  "kerepyak",
  "kerese",
  "kerese-pese",
  "keresek",
  "kereseng",
  "keresot",
  "kereta",
  "keretan",
  "keretek",
  "keretot",
  "keretut",
  "kereweng",
  "keri",
  "keriang-keriut",
  "keriap",
  "kerias",
  "keriau",
  "kerical",
  "kericau",
  "keridas",
  "keridik",
  "kerih",
  "kerik",
  "kerikal",
  "kerikam",
  "kerikil",
  "kerikit",
  "kerimut",
  "kerinan",
  "kerincing",
  "kerinding",
  "kering",
  "keringat",
  "keriningan",
  "kerinjal",
  "kerinjang",
  "kerinjing",
  "kerintil",
  "kerinting",
  "kerip",
  "keripik",
  "keriput",
  "keris",
  "kerisi",
  "kerisik",
  "kerising",
  "kerisut",
  "kerit",
  "keritik",
  "keriting",
  "keriuk",
  "keriut",
  "kerja",
  "kerjang",
  "kerjantara",
  "kerjap",
  "kerkah",
  "kerkak",
  "kerkap",
  "kerkau",
  "kerkop",
  "kerkup",
  "kerlap",
  "kerling",
  "kerlip",
  "kermak",
  "kermanici",
  "kermi",
  "kernai",
  "kerneli",
  "kernet",
  "kernu",
  "kernyat-kernyut",
  "kernyau",
  "kernyih",
  "kernying",
  "kernyit",
  "kernyut",
  "kero",
  "kerobak",
  "kerobat",
  "kerobek",
  "keroco",
  "kerocok",
  "kerogen",
  "keroh",
  "kerok",
  "kerokot",
  "keromong",
  "keron",
  "keroncang",
  "keroncong",
  "keroncor",
  "kerong",
  "kerongkongan",
  "kerongsang",
  "kerontang",
  "kerop",
  "keropak",
  "keropas-keropis",
  "keropeng",
  "keropok",
  "keropong",
  "keropos",
  "kerosak",
  "kerosek",
  "kerosi",
  "kerosin",
  "kerosok",
  "kerosong",
  "kerot",
  "kerotak",
  "kerotot",
  "keroyok",
  "kerpai",
  "kerpak",
  "kerpas",
  "kerpubesi",
  "kerpuk",
  "kerpus",
  "kers",
  "kersai",
  "kersak",
  "kersang",
  "kersani",
  "kersen",
  "kersik",
  "kersuk",
  "kertaaji",
  "kertah",
  "kertak",
  "kertang",
  "kertap",
  "kertas",
  "kertau",
  "kertuk",
  "kertus",
  "keruan",
  "kerubim",
  "kerubin",
  "kerubung",
  "kerubut",
  "kerucil",
  "kerucut",
  "kerudung",
  "keruh",
  "keruing",
  "keruit",
  "keruk",
  "kerukut",
  "kerul",
  "keruma",
  "kerumit",
  "kerumuk",
  "kerumun",
  "kerumus",
  "kerun",
  "kerung",
  "kerunkel",
  "keruntang-pungkang",
  "kerunting",
  "keruntung",
  "kerunyut",
  "kerup",
  "kerupuk",
  "kerut",
  "kerutak",
  "kerutup",
  "keruyuk",
  "kes",
  "kesah",
  "kesak",
  "kesal",
  "kesam",
  "kesambet",
  "kesambi",
  "kesan",
  "kesana",
  "kesandung",
  "kesang",
  "kesangsang",
  "kesap-kesip",
  "kesasar",
  "kesat",
  "kesatria",
  "kesek",
  "kesel",
  "keselak",
  "keseleo",
  "kesemek",
  "kesengsem",
  "keseran",
  "keseser",
  "keset",
  "kesi",
  "kesiap",
  "kesik",
  "kesima",
  "kesimbukan",
  "kesini",
  "kesip",
  "kesitu",
  "kesiur",
  "keskul",
  "kesmaran",
  "kesohor",
  "kesomplok",
  "kesongo",
  "kesot",
  "kesrakat",
  "kesting",
  "kesturi",
  "kesu-kesi",
  "kesuh-kesih",
  "kesuk-kesik",
  "kesuma",
  "kesumat",
  "kesumba",
  "kesup",
  "kesusu",
  "kesut",
  "keta",
  "ketaban",
  "ketai",
  "ketak",
  "ketakar",
  "ketakong",
  "ketal",
  "ketam",
  "ketambak",
  "ketampi",
  "ketan",
  "ketang",
  "ketap",
  "ketapak",
  "ketapang",
  "ketapek",
  "ketar",
  "ketarap",
  "ketat",
  "ketaton",
  "ketawa",
  "ketaya",
  "ketayap",
  "ketegar",
  "ketek",
  "ketel",
  "ketela",
  "ketemu",
  "keten",
  "ketena",
  "keteng",
  "ketepel",
  "ketepeng",
  "keter",
  "ketes",
  "keteter",
  "ketgat",
  "keti",
  "ketiak",
  "ketial",
  "ketiap",
  "ketiau",
  "ketiban",
  "ketiding",
  "ketik",
  "ketika",
  "ketil",
  "ketilang",
  "ketimbang",
  "ketimbis",
  "ketimbul",
  "ketimbung",
  "keting",
  "ketinjau",
  "ketinting",
  "ketip",
  "ketiplak",
  "ketipung",
  "ketirah",
  "ketis",
  "ketitir",
  "ketlingsut",
  "ketogenesis",
  "ketok",
  "ketola",
  "ketombe",
  "keton",
  "ketonemia",
  "ketonggeng",
  "ketonuria",
  "ketopong",
  "ketoprak",
  "ketosa",
  "ketrek",
  "ketu",
  "ketua",
  "ketuat",
  "ketuban",
  "ketuir",
  "ketuk",
  "ketul",
  "ketumbar",
  "ketumbi",
  "ketumbit",
  "ketumbu",
  "ketumpang",
  "ketun",
  "ketungging",
  "ketup",
  "ketupa",
  "ketupat",
  "ketupuk",
  "ketur",
  "ketus",
  "kev",
  "kewalahan",
  "keweni",
  "kewer",
  "kewes",
  "kewuh",
  "kha",
  "khabis",
  "khadam",
  "khadim",
  "khafi",
  "khair",
  "khairat",
  "khalas",
  "khalayak",
  "khali",
  "khalifah",
  "khalifatulah",
  "khalifatullah",
  "khalik",
  "khalikah",
  "khalikul",
  "khalil",
  "khalilullah",
  "khalis",
  "khalwat",
  "khamar",
  "khamir",
  "khamsin",
  "khamzab",
  "khanjar",
  "kharab",
  "khas",
  "khasi",
  "khasiat",
  "khat",
  "khatam",
  "khatib",
  "khatifah",
  "khatimah",
  "khatulistiwa",
  "khauf",
  "khaul",
  "khawas",
  "khawasulkhawas",
  "khawatir",
  "khayal",
  "khayali",
  "khazanah",
  "khi",
  "khianat",
  "khiar",
  "khidaah",
  "khidmah",
  "khidmat",
  "khilaf",
  "khilafiah",
  "khinzir",
  "khisit",
  "khitah",
  "khitan",
  "khitbah",
  "khizanatulkitab",
  "khoja",
  "khojah",
  "khotbah",
  "khuduk",
  "khulafa",
  "khuldi",
  "khuluk",
  "khunsa",
  "khurafat",
  "khusuf",
  "khusus",
  "khusyuk",
  "kia",
  "kiah",
  "kiai",
  "kiak",
  "kial",
  "kiam",
  "kiamat",
  "kiambang",
  "kian",
  "kiang-kiut",
  "kiani",
  "kiap",
  "kiar",
  "kiara",
  "kias",
  "kiasi",
  "kiasmus",
  "kiat",
  "kiaupau",
  "kibang",
  "kibar",
  "kibas",
  "kibernetika",
  "kibir",
  "kiblat",
  "kiblik",
  "kibriah",
  "kibul",
  "kicang-kecoh",
  "kicang-kicu",
  "kicau",
  "kici",
  "kicik",
  "kicu",
  "kicuh",
  "kicut",
  "kida-kida",
  "kidal",
  "kidam",
  "kidang",
  "kidar",
  "kidul",
  "kidung",
  "kifayah",
  "kifoskaliose",
  "kifoskaliosis",
  "kihanat",
  "kijai",
  "kijang",
  "kijil",
  "kijing",
  "kikih",
  "kikik",
  "kikil",
  "kikir",
  "kikis",
  "kikitir",
  "kikuk",
  "kikus",
  "kila",
  "kilah",
  "kilai",
  "kilan",
  "kilang",
  "kilap",
  "kilar",
  "kilas",
  "kilat",
  "kilau",
  "kili",
  "kilik",
  "kilir",
  "kiln",
  "kilo",
  "kilogram",
  "kilohertz",
  "kilokalori",
  "kiloliter",
  "kilometer",
  "kiloton",
  "kilovolt",
  "kilowatt",
  "kilowattjam",
  "kilus",
  "kim",
  "kima",
  "kimah",
  "kimantu",
  "kimar",
  "kimbah",
  "kimbang",
  "kimbul",
  "kimia",
  "kimiawi",
  "kimkha",
  "kimlo",
  "kimo",
  "kimograf",
  "kimono",
  "kimpal",
  "kimpul",
  "kimpus",
  "kimput",
  "kimus",
  "kina",
  "kinang",
  "kinantan",
  "kinanti",
  "kinasa",
  "kinasih",
  "kinca",
  "kincah",
  "kincak",
  "kincang",
  "kincau",
  "kincir",
  "kincit",
  "kincung",
  "kincup",
  "kindap",
  "kinematika",
  "kinematograf",
  "kinesika",
  "kinesimeter",
  "kineskop",
  "kinestesia",
  "kinestesiometer",
  "kinestesis",
  "kinetik",
  "kinetika",
  "kinetokardiografi",
  "kingking",
  "kingkip",
  "kingkit",
  "kingkong",
  "kini",
  "kinine",
  "kinja",
  "kinjat",
  "kinjeng",
  "kinred",
  "kintaka",
  "kintal",
  "kinte",
  "kintil",
  "kinyang",
  "kio",
  "kios",
  "kipa",
  "kipai",
  "kipang",
  "kipas",
  "kiper",
  "kiprah",
  "kiprat",
  "kipsiau",
  "kipu",
  "kir",
  "kira",
  "kiraah",
  "kiraat",
  "kirab",
  "kirai",
  "kiramat",
  "kiran",
  "kirana",
  "kirap",
  "kiras",
  "kirau",
  "kirbat",
  "kiri",
  "kirik",
  "kirim",
  "kirinyu",
  "kirip",
  "kiris",
  "kirita",
  "kirmizi",
  "kiru",
  "kiruh",
  "kirung",
  "kisa",
  "kisah",
  "kisai",
  "kisar",
  "kisas",
  "kisat",
  "kisi",
  "kisik",
  "kismat",
  "kismis",
  "kisruh",
  "kista",
  "kisut",
  "kiswah",
  "kit",
  "kita",
  "kitab",
  "kitabulah",
  "kitang",
  "kitar",
  "kitik",
  "kitin",
  "kiting",
  "kitir",
  "kitorang",
  "kitri",
  "kits",
  "kiu",
  "kiuk",
  "kiwari",
  "kiwi",
  "kizib",
  "klaim",
  "klakklik",
  "klakson",
  "klamidospora",
  "klan",
  "klandestin",
  "klangenan",
  "klante",
  "klarifikasi",
  "klarinet",
  "klasemen",
  "klasifikasi",
  "klasik",
  "klasikal",
  "klasis",
  "klasisisme",
  "klausa",
  "klaustrofobia",
  "klaustrum",
  "klausul",
  "klaver",
  "klavikor",
  "klavikula",
  "klaviola",
  "kleder",
  "kleidotomi",
  "kleistogami",
  "klem",
  "klemensi",
  "klen",
  "klenengan",
  "klengkeng",
  "klenik",
  "klenteng",
  "klep",
  "klepon",
  "klepsidra",
  "kleptofobi",
  "kleptoman",
  "kleptomania",
  "kleptomaniak",
  "klerek",
  "klerikal",
  "klerikus",
  "klerus",
  "klien",
  "klik",
  "kliker",
  "klimaks",
  "klimakterium",
  "klimaktorium",
  "klimatografi",
  "klimatolog",
  "klimatologi",
  "klimis",
  "klimograf",
  "klimosekuen",
  "klimoskop",
  "klin",
  "klinik",
  "klining",
  "klinis",
  "klinisi",
  "klinometer",
  "klip",
  "kliping",
  "klir",
  "kliring",
  "klise",
  "klistron",
  "klitelum",
  "klitik",
  "klitoris",
  "kliwon",
  "kliyengan",
  "kloaka",
  "klon",
  "klona",
  "kloning",
  "klonograf",
  "klonus",
  "klop",
  "klor",
  "kloral",
  "kloramina",
  "klorat",
  "klorida",
  "kloridimeter",
  "klorin",
  "klorinasi",
  "klorit",
  "klorobenzena",
  "klorofil",
  "kloroform",
  "kloroformat",
  "klorokuin",
  "klorolignin",
  "kloroplas",
  "kloroprena",
  "klorosis",
  "kloset",
  "klub",
  "kluntang-kluntung",
  "klusium",
  "knalpot",
  "knop",
  "knot",
  "koa",
  "koagel",
  "koagregasi",
  "koagulan",
  "koagulasi",
  "koak",
  "koaksi",
  "koaksial",
  "koala",
  "koalisi",
  "koana",
  "koar",
  "kobah",
  "kobak",
  "kobalamin",
  "kobalt",
  "kobar",
  "kober",
  "koboi",
  "koboisme",
  "kobok",
  "kobol",
  "kobongan",
  "kobra",
  "kocah-kacih",
  "kocak",
  "kocar-kacir",
  "kocek",
  "koci",
  "kocilembik",
  "kocoh",
  "kocok",
  "kocolan",
  "kocong",
  "kocor",
  "koda",
  "kodak",
  "kode",
  "kodein",
  "kodeks",
  "kodi",
  "kodifikasi",
  "kodok",
  "kodominan",
  "kodrat",
  "kodrati",
  "koe",
  "koedukasi",
  "koefisien",
  "koeksistensi",
  "koenzim",
  "koersi",
  "koersif",
  "kofaktor",
  "kofein",
  "kofermen",
  "kognat",
  "kognatif",
  "kognisi",
  "kognitif",
  "koh",
  "kohabitasi",
  "koheren",
  "koherensi",
  "kohesi",
  "kohesif",
  "kohir",
  "kohlea",
  "kohol",
  "kohong",
  "kohor",
  "koil",
  "koin",
  "koinseden",
  "koinsiden",
  "koinsidensi",
  "koipuk",
  "koit",
  "koitus",
  "koja",
  "kojah",
  "kojang",
  "kojoh",
  "kojol",
  "kojor",
  "kok",
  "koka",
  "kokah",
  "kokaina",
  "kokainisasi",
  "kokainisme",
  "kokang",
  "kokarde",
  "kokas",
  "koki",
  "kokila",
  "koklea",
  "kokoa",
  "kokoh",
  "kokok",
  "kokokbeluk",
  "kokol",
  "kokon",
  "kokosan",
  "kokot",
  "kokpit",
  "koksa",
  "koktail",
  "kokurikuler",
  "kokus",
  "kol",
  "kola",
  "kolaborasi",
  "kolaborator",
  "kolagen",
  "kolak",
  "kolam",
  "kolang-kaling",
  "kolaps",
  "kolaret",
  "kolase",
  "kolateral",
  "kolator",
  "kolega",
  "kolegial",
  "kolegialitas",
  "koleh-koleh",
  "kolek",
  "koleksi",
  "kolekte",
  "kolektif",
  "kolektivis",
  "kolektivisasi",
  "kolektivisme",
  "kolektivitas",
  "kolektor",
  "kolembeng",
  "kolemia",
  "koleng",
  "koleoptil",
  "kolera",
  "kolese",
  "kolesom",
  "kolesterin",
  "kolesterol",
  "koli",
  "kolibri",
  "koligasi",
  "kolik",
  "kolimasi",
  "kolina",
  "kolintang",
  "koliseng",
  "kolitis",
  "kolkhoz",
  "kolodion",
  "kolofon",
  "kologen",
  "koloid",
  "koloidal",
  "kolok",
  "kolokasi",
  "kolokium",
  "kolom",
  "kolomben",
  "kolon",
  "kolone",
  "kolonel",
  "kolong",
  "koloni",
  "kolonial",
  "kolonialis",
  "kolonialisme",
  "kolonis",
  "kolonisasi",
  "kolonoskop",
  "kolonye",
  "kolor",
  "kolorimeter",
  "kolorimetri",
  "kolosal",
  "kolosom",
  "kolostomi",
  "kolostrum",
  "kolot",
  "kolportir",
  "kolt",
  "kolum",
  "kolumela",
  "kolumnis",
  "kolumnus",
  "kolusi",
  "koluvium",
  "kom",
  "koma",
  "komaliwan",
  "koman",
  "komandan",
  "komandemen",
  "komanditer",
  "komando",
  "komaran",
  "komat-kamit",
  "kombat",
  "kombinasi",
  "kombo",
  "kombor",
  "kombusio",
  "komedi",
  "komedian",
  "komendur",
  "komeng",
  "komensal",
  "komensalisme",
  "komentar",
  "komentator",
  "komersial",
  "komersialisasi",
  "komet",
  "komfortabel",
  "komidi",
  "komik",
  "komikal",
  "komikus",
  "kominusi",
  "komis",
  "komisar",
  "komisariat",
  "komisaris",
  "komisi",
  "komisioner",
  "komisura",
  "komit",
  "komite",
  "komitmen",
  "komkoma",
  "komoditas",
  "komodo",
  "komodor",
  "kompak",
  "kompanyon",
  "komparasi",
  "komparatif",
  "komparator",
  "kompartemen",
  "kompas",
  "kompatibel",
  "kompatibilitas",
  "kompatriot",
  "kompendium",
  "kompeni",
  "kompensasi",
  "kompes",
  "kompeten",
  "kompetensi",
  "kompetisi",
  "kompetitif",
  "kompetitor",
  "kompi",
  "kompilasi",
  "kompilator",
  "komplain",
  "kompleks",
  "kompleksitas",
  "komplemen",
  "komplementer",
  "komplet",
  "komplikasi",
  "komplikatif",
  "komplimen",
  "komplot",
  "kompon",
  "komponen",
  "kompong",
  "komponis",
  "kompor",
  "kompos",
  "komposer",
  "komposisi",
  "komposit",
  "kompositum",
  "komprador",
  "komprang",
  "komprehensif",
  "kompres",
  "kompresi",
  "kompresor",
  "kompromi",
  "kompromistis",
  "kompulsi",
  "kompulsif",
  "komputer",
  "komputerisasi",
  "komtabilitas",
  "komunal",
  "komunalisme",
  "komunalistik",
  "komune",
  "komuni",
  "komunikabilitas",
  "komunikan",
  "komunikasi",
  "komunikatif",
  "komunikator",
  "komunike",
  "komunis",
  "komunisme",
  "komunistis",
  "komunistofobi",
  "komunistofobia",
  "komunitas",
  "komutator",
  "komuter",
  "konan",
  "konco",
  "koncoisme",
  "kondang",
  "kondangan",
  "konde",
  "kondektur",
  "kondensasi",
  "kondensat",
  "kondensator",
  "kondensor",
  "kondilus",
  "kondisi",
  "kondom",
  "kondominium",
  "kondomisasi",
  "kondor",
  "kondrin",
  "kondroblas",
  "konduite",
  "konduksi",
  "konduktans",
  "konduktimeter",
  "konduktivitas",
  "konduktor",
  "kondusif",
  "koneksi",
  "koneksitas",
  "konektor",
  "konfederasi",
  "konfeksi",
  "konferensi",
  "konfesi",
  "konfigurasi",
  "konfiks",
  "konfirmasi",
  "konflik",
  "konform",
  "konformitas",
  "konfrontasi",
  "konfrontatif",
  "kongenital",
  "kongesti",
  "kongkalikong",
  "kongko",
  "kongkoan",
  "kongkong",
  "kongkret",
  "konglomerasi",
  "konglomerat",
  "kongregasi",
  "kongres",
  "kongresis",
  "kongsi",
  "konifera",
  "konis",
  "konjugan",
  "konjugasi",
  "konjungsi",
  "konjungter",
  "konjungtif",
  "konjungtiva",
  "konjungtivitis",
  "konjungtor",
  "konjungtur",
  "konkaf",
  "konklaf",
  "konklusi",
  "konklusif",
  "konkologi",
  "konkomitan",
  "konkordansi",
  "konkordat",
  "konkresi",
  "konkret",
  "konkretisasi",
  "konkuisnador",
  "konkuren",
  "konkurensi",
  "konkurs",
  "konoid",
  "konon",
  "konosemen",
  "konotasi",
  "konotatif",
  "konperensi",
  "konsekrasi",
  "konsekuen",
  "konsekuensi",
  "konsekutif",
  "konseli",
  "konseling",
  "konselor",
  "konsensus",
  "konsentrasi",
  "konsentrat",
  "konsentrik",
  "konsentris",
  "konsep",
  "konsepsi",
  "konsepsional",
  "konseptor",
  "konseptual",
  "konseptualisasi",
  "konser",
  "konsertina",
  "konserto",
  "konservasi",
  "konservasionis",
  "konservatif",
  "konservatisme",
  "konservator",
  "konservatori",
  "konservatorium",
  "konsesi",
  "konsesif",
  "konsesional",
  "konsiderans",
  "konsiderasi",
  "konsili",
  "konsiliasi",
  "konsinyasi",
  "konsinyatir",
  "konsisten",
  "konsistensi",
  "konsistori",
  "konsol",
  "konsolasi",
  "konsolidasi",
  "konsonan",
  "konsonansi",
  "konsonantal",
  "konsorsium",
  "konspirasi",
  "konspiratif",
  "konspirator",
  "konstabel",
  "konstan",
  "konstanta",
  "konstantagravitasi",
  "konstatasi",
  "konstatatif",
  "konstatir",
  "konstelasi",
  "konstipasi",
  "konstituante",
  "konstituen",
  "konstitusi",
  "konstitusional",
  "konstitusionalisme",
  "konstriksi",
  "konstriktor",
  "konstruksi",
  "konstruktif",
  "konstruktivisme",
  "konsul",
  "konsulat",
  "konsulen",
  "konsuler",
  "konsultan",
  "konsultasi",
  "konsumen",
  "konsumer",
  "konsumerisme",
  "konsumsi",
  "konsumtif",
  "kontak",
  "kontal-kantil",
  "kontaminasi",
  "kontan",
  "kontang-kanting",
  "konte",
  "konteks",
  "kontekstual",
  "kontekstualisme",
  "kontemplasi",
  "kontemplatif",
  "kontemporer",
  "konten",
  "konter",
  "kontes",
  "kontestan",
  "kontet",
  "kontiguitas",
  "kontinen",
  "kontinental",
  "kontingen",
  "kontinu",
  "kontinuitas",
  "kontinum",
  "kontoid",
  "kontol",
  "kontra",
  "kontrabande",
  "kontrabas",
  "kontradiksi",
  "kontradiktif",
  "kontraindikasi",
  "kontrak",
  "kontraksi",
  "kontraktor",
  "kontraktual",
  "kontraproduktif",
  "kontras",
  "kontrasepsi",
  "kontraseptif",
  "kontravensi",
  "kontribusi",
  "kontributor",
  "kontrol",
  "kontrolir",
  "kontroversi",
  "kontroversial",
  "kontur",
  "konus",
  "konveks",
  "konveksi",
  "konvektif",
  "konvensi",
  "konvensional",
  "konvergen",
  "konvergensi",
  "konversasi",
  "konversi",
  "konveyor",
  "konvoi",
  "konvolusi",
  "konvulsan",
  "konvulsi",
  "konyak",
  "konyal",
  "konyan",
  "konyol",
  "kooperasi",
  "kooperatif",
  "kooperativisme",
  "kooperator",
  "kooptasi",
  "koordinasi",
  "koordinat",
  "koordinatif",
  "koordinator",
  "kop",
  "kopah",
  "kopaiba",
  "kopak",
  "kopal",
  "kopat-kapit",
  "kopbal",
  "kopek",
  "kopel",
  "kopelrim",
  "koper",
  "koperasi",
  "kopet",
  "kopi",
  "kopiah",
  "kopilot",
  "kopling",
  "koplo",
  "kopok",
  "kopolimer",
  "kopong",
  "kopra",
  "koprafagia",
  "koprak",
  "kopral",
  "koprok",
  "koprol",
  "koprolit",
  "kopula",
  "kopulasi",
  "kopulatif",
  "kopyok",
  "kopyor",
  "kor",
  "koral",
  "koralit",
  "koran",
  "korano",
  "korban",
  "korden",
  "kordial",
  "kordit",
  "kordon",
  "korduroi",
  "kored",
  "koreferensialitas",
  "korek",
  "koreke",
  "koreksi",
  "korektif",
  "korektor",
  "korelasi",
  "korelatif",
  "korenah",
  "koreng",
  "koreograf",
  "koreografer",
  "koreografi",
  "koreografis",
  "kores",
  "koresponden",
  "korespondensi",
  "koret",
  "koridor",
  "korion",
  "kornea",
  "kornel",
  "korner",
  "kornet",
  "koroh",
  "koroid",
  "korok",
  "korologi",
  "korona",
  "koronal",
  "koroner",
  "korong",
  "korosi",
  "korosif",
  "korporasi",
  "korporat",
  "korporatif",
  "korporatisme",
  "korps",
  "korpulensi",
  "korpus",
  "korsase",
  "korsel",
  "korselet",
  "korset",
  "korsleting",
  "korteks",
  "kortikulus",
  "korting",
  "kortison",
  "korugator",
  "korundum",
  "korup",
  "korupsi",
  "koruptif",
  "koruptor",
  "korve",
  "korvet",
  "kosak-kasik",
  "kosakata",
  "kosar",
  "kosbas",
  "kosek",
  "kosekan",
  "kosel",
  "kosen",
  "koset",
  "kosinus",
  "kosmetik",
  "kosmetilogi",
  "kosmetolog",
  "kosmetologi",
  "kosmetologis",
  "kosmis",
  "kosmogoni",
  "kosmografi",
  "kosmologi",
  "kosmologis",
  "kosmonaut",
  "kosmopolit",
  "kosmopolitan",
  "kosmopolitanisme",
  "kosmos",
  "kosmotron",
  "kosokbali",
  "kosong",
  "kostum",
  "kota",
  "kotah",
  "kotai",
  "kotak",
  "kotak-katik",
  "kotaklema",
  "kotek",
  "koteka",
  "koteks",
  "koteng",
  "koterek",
  "kotes",
  "kotiledon",
  "kotipa",
  "kotok",
  "kotong",
  "kotor",
  "kotrek",
  "kovalensi",
  "kover",
  "kowan",
  "kowek",
  "koyak",
  "koyam",
  "koyan",
  "koyok",
  "krai",
  "krakal",
  "kram",
  "krama",
  "kranapaksa",
  "krangeyan",
  "kraniologi",
  "kraniometri",
  "kraniotomi",
  "kranium",
  "krans",
  "krasis",
  "krayon",
  "kreasi",
  "kreatif",
  "kreativitas",
  "kreator",
  "krebo",
  "krecek",
  "kredibilitas",
  "kredit",
  "kreditabel",
  "kreditor",
  "kredo",
  "krem",
  "kremasi",
  "krematori",
  "krematorium",
  "kreol",
  "kreolin",
  "kreolisasi",
  "kreosol",
  "kresendo",
  "kresol",
  "kretin",
  "kribo",
  "kricak",
  "krida",
  "krifoli",
  "krim",
  "kriminal",
  "kriminalis",
  "kriminalisasi",
  "kriminalitas",
  "kriminolog",
  "kriminologi",
  "kriminologis",
  "kring",
  "krio",
  "kriofil",
  "kriofit",
  "kriogen",
  "kriogenika",
  "krioterapi",
  "kripta",
  "kriptogam",
  "kriptografi",
  "kriptogram",
  "kriptol",
  "kripton",
  "krisan",
  "krisantemum",
  "krisis",
  "krisma",
  "krisoberil",
  "krisofil",
  "krisolit",
  "krisopras",
  "krista",
  "kristal",
  "kristalisasi",
  "kristalografi",
  "kristaloid",
  "kristalosa",
  "kristen",
  "kristiani",
  "kristus",
  "kriteria",
  "kriterium",
  "kritik",
  "kritikus",
  "kritis",
  "kritisi",
  "kriya",
  "krobongan",
  "kroco",
  "kroket",
  "krol",
  "krom",
  "kromat",
  "kromatid",
  "kromatika",
  "kromatin",
  "kromatis",
  "kromatofor",
  "kromatografi",
  "kromit",
  "kromium",
  "kromo",
  "kromofil",
  "kromofob",
  "kromogen",
  "kromong",
  "kromosfer",
  "kromosom",
  "kromotropi",
  "krompyang",
  "kronem",
  "kroni",
  "kronik",
  "kroniometri",
  "kronis",
  "kronisme",
  "kronobiologi",
  "kronogram",
  "kronologi",
  "kronologis",
  "kronometer",
  "kronosekuen",
  "kronoskop",
  "krosboi",
  "kroto",
  "kru",
  "kruistik",
  "kruk",
  "krukat",
  "krusial",
  "krustasea",
  "ksatria",
  "ksi",
  "kuaci",
  "kuadran",
  "kuadrat",
  "kuadratika",
  "kuadratur",
  "kuadratus",
  "kuadrenium",
  "kuadriliun",
  "kuadripartit",
  "kuadrisep",
  "kuadrupel",
  "kuadrupleks",
  "kuadruplet",
  "kuah",
  "kuai",
  "kuak",
  "kuala",
  "kualat",
  "kuali",
  "kualifikasi",
  "kualitas",
  "kualitatif",
  "kualon",
  "kuang",
  "kuangkiut",
  "kuangwung",
  "kuantifikasi",
  "kuantitas",
  "kuantitatif",
  "kuantum",
  "kuap",
  "kuar",
  "kuari",
  "kuarik",
  "kuark",
  "kuarsa",
  "kuarsit",
  "kuart",
  "kuartal",
  "kuarter",
  "kuarterner",
  "kuartet",
  "kuartil",
  "kuarto",
  "kuas",
  "kuasa",
  "kuasar",
  "kuasi",
  "kuat",
  "kuatren",
  "kuau",
  "kuaya",
  "kuayah",
  "kuayan",
  "kubah",
  "kubak",
  "kubang",
  "kubik",
  "kubil",
  "kubin",
  "kubis",
  "kubisme",
  "kubistik",
  "kubit",
  "kuboid",
  "kubra",
  "kubti",
  "kubu",
  "kubul",
  "kubung",
  "kubur",
  "kubus",
  "kucai",
  "kucak",
  "kucam",
  "kucandan",
  "kucar-kacir",
  "kucek",
  "kucel",
  "kucica",
  "kucil",
  "kucindan",
  "kucing",
  "kucir",
  "kucup",
  "kucur",
  "kuda",
  "kudai",
  "kudang",
  "kudap",
  "kudeta",
  "kudi",
  "kudian",
  "kudis",
  "kudu",
  "kuduk",
  "kudung",
  "kudup",
  "kudus",
  "kue",
  "kueni",
  "kuesioner",
  "kuetiau",
  "kufu",
  "kufur",
  "kui",
  "kuih",
  "kuil",
  "kuilu",
  "kuin",
  "kuing",
  "kuini",
  "kuinina",
  "kuintal",
  "kuintesens",
  "kuintet",
  "kuintil",
  "kuintiliun",
  "kuintuplet",
  "kuir",
  "kuis",
  "kuit",
  "kuitansi",
  "kujang",
  "kujarat",
  "kujung",
  "kujur",
  "kujut",
  "kuk",
  "kukabura",
  "kukai",
  "kukang",
  "kukila",
  "kuku",
  "kukuh",
  "kukuk",
  "kukul",
  "kukup",
  "kukur",
  "kukuruyuk",
  "kukus",
  "kulah",
  "kulai",
  "kulak",
  "kulakasar",
  "kulan",
  "kulansing",
  "kulasentana",
  "kulat",
  "kulawangsa",
  "kuli",
  "kuliah",
  "kulik-kulik",
  "kulikat",
  "kulim",
  "kulimat",
  "kuliner",
  "kulintang",
  "kulir",
  "kulit",
  "kulkas",
  "kulminasi",
  "kulon",
  "kulot",
  "kult",
  "kultivar",
  "kultivasi",
  "kultur",
  "kultural",
  "kulturisasi",
  "kultus",
  "kulub",
  "kuluk",
  "kulum",
  "kulup",
  "kulur",
  "kulut",
  "kulzum",
  "kuma-kuma",
  "kumai",
  "kumal",
  "kuman",
  "kumandang",
  "kumanga",
  "kumat",
  "kumba",
  "kumbah",
  "kumbang",
  "kumbar",
  "kumbik",
  "kumbu",
  "kumbuh",
  "kumena",
  "kumico",
  "kuminter",
  "kumis",
  "kumkuma",
  "kumpai",
  "kumpal",
  "kumpar",
  "kumpi",
  "kumpul",
  "kumuh",
  "kumulasi",
  "kumulatif",
  "kumulonimbus",
  "kumulus",
  "kumur",
  "kumus",
  "kumut",
  "kunang-kunang",
  "kunani",
  "kunar-kunar",
  "kunarpa",
  "kunca",
  "kuncah",
  "kuncen",
  "kunci",
  "kuncir",
  "kuncit",
  "kuncung",
  "kuncup",
  "kundai",
  "kundang",
  "kundi",
  "kundur",
  "kunduran",
  "kunfayakun",
  "kung",
  "kungfu",
  "kungkang",
  "kungki",
  "kungkum",
  "kungkung",
  "kuning",
  "kuningan",
  "kunjung",
  "kuno",
  "kunta",
  "kuntau",
  "kuntilanak",
  "kuntit",
  "kuntuan",
  "kuntul",
  "kuntum",
  "kuntung",
  "kunut",
  "kunyah",
  "kunyam",
  "kunyit",
  "kunyuk",
  "kuorum",
  "kuosien",
  "kuota",
  "kup",
  "kupa",
  "kupahan",
  "kupak",
  "kupang",
  "kupas",
  "kupat",
  "kupat-kapit",
  "kupe",
  "kupel",
  "kupi",
  "kupil",
  "kuping",
  "kupir",
  "kuplet",
  "kupluk",
  "kupnat",
  "kupon",
  "kuproprotein",
  "kuprum",
  "kupu-kupu",
  "kupui",
  "kupur",
  "kur",
  "kura",
  "kurai",
  "kurambit",
  "kurang",
  "kurap",
  "kuras",
  "kurasani",
  "kurasao",
  "kuratif",
  "kurator",
  "kuratorium",
  "kurau",
  "kurawal",
  "kurban",
  "kurcaci",
  "kuren",
  "kuret",
  "kuretase",
  "kuria",
  "kuricak",
  "kurigram",
  "kurik",
  "kurikuler",
  "kurikulum",
  "kuring",
  "kuriositas",
  "kuripan",
  "kurir",
  "kuririk",
  "kurium",
  "kurkatovium",
  "kurkuma",
  "kurltase",
  "kurma",
  "kurs",
  "kursemangat",
  "kursi",
  "kursif",
  "kursor",
  "kursus",
  "kurtase",
  "kurun",
  "kurung",
  "kurus",
  "kuruyuk",
  "kurva",
  "kurvalinier",
  "kurvatur",
  "kus",
  "kusa",
  "kusal",
  "kusam",
  "kusanin",
  "kusat-mesat",
  "kusau",
  "kusen",
  "kusik",
  "kusir",
  "kuskus",
  "kuspis",
  "kusruk",
  "kusta",
  "kusu",
  "kusuf",
  "kusuk",
  "kusuma",
  "kusut",
  "kuta",
  "kutaha",
  "kutak",
  "kutang",
  "kutat",
  "kutat-kutet",
  "kuteks",
  "kuteri",
  "kuti",
  "kutik",
  "kutikula",
  "kutil",
  "kutin",
  "kuting",
  "kutip",
  "kutu",
  "kutub",
  "kutubaru",
  "kutubusitah",
  "kutuk",
  "kutung",
  "kutut",
  "kuud",
  "kuwu",
  "kuwuk",
  "kuwung-kuwung",
  "kuwur",
  "kuya",
  "kuyang",
  "kuyu",
  "kuyuh",
  "kuyup",
  "kwartet",
  "kwartir",
  "kwasiorkor",
  "kweni",
  "kwetiau",
  "kwosien",
  "laal",
  "lab",
  "laba",
  "labah-labah",
  "labak",
  "labang",
  "labas",
  "label",
  "labelum",
  "laberang",
  "labi-labi",
  "labial",
  "labialisasi",
  "labil",
  "labiodental",
  "labiovelar",
  "labirin",
  "labium",
  "laboran",
  "laboratoris",
  "laboratorium",
  "labrak",
  "labrakan",
  "labrang",
  "labres",
  "labrum",
  "labu",
  "labuda",
  "labuh",
  "labun",
  "labur",
  "labut",
  "lacak",
  "laci",
  "lacur",
  "lacut",
  "lada",
  "ladah",
  "ladam",
  "ladan",
  "ladang",
  "laden",
  "ladi",
  "lading",
  "ladu",
  "ladung",
  "lafal",
  "laga",
  "lagak",
  "lagam",
  "lagan",
  "lagang",
  "lagau",
  "lagi",
  "lagiah",
  "lago",
  "lagonder",
  "lagu",
  "laguh-lagah",
  "laguna",
  "lagwu",
  "lah",
  "lahab",
  "lahad",
  "lahak",
  "lahan",
  "lahang",
  "lahap",
  "lahar",
  "lahir",
  "lahiriah",
  "lai",
  "laici",
  "laif",
  "laik",
  "lailah",
  "lailatulkadar",
  "lain",
  "lais",
  "laja",
  "lajak",
  "lajang",
  "lajat",
  "lajnah",
  "laju",
  "lajur",
  "lak",
  "lakab",
  "lakak",
  "lakar",
  "lakara",
  "laken",
  "lakeri",
  "laki",
  "laklak",
  "laklakan",
  "lakmus",
  "laknat",
  "laknatullah",
  "lakon",
  "lakonik",
  "lakonisme",
  "lakrimator",
  "laksa",
  "laksamana",
  "laksana",
  "laksatif",
  "laksmi",
  "laktase",
  "laktasi",
  "laktat",
  "laktogen",
  "laktoglobulin",
  "laktometer",
  "lakton",
  "laktosa",
  "laku",
  "lakum",
  "lakuna",
  "lakur",
  "lakustrin",
  "lala",
  "lalah",
  "lalai",
  "lalak",
  "lalandak",
  "lalang",
  "lalap",
  "lalat",
  "lalau",
  "laler",
  "lali",
  "lalim",
  "lalu",
  "lalu-lalang",
  "lam",
  "lama",
  "lamalif",
  "laman",
  "lamang",
  "lamar",
  "lamat-lamat",
  "lambai",
  "lambak",
  "lamban",
  "lambang",
  "lambar",
  "lambat",
  "lambda",
  "lambe",
  "lambert",
  "lambit",
  "lambo",
  "lambu",
  "lambuk",
  "lambung",
  "lambur",
  "lamdukpai",
  "lamela",
  "lamender",
  "lamin",
  "lamina",
  "laminah",
  "laminasi",
  "laminating",
  "lampai",
  "lampam",
  "lampan",
  "lampang",
  "lampar",
  "lampas",
  "lampau",
  "lampeni",
  "lampes",
  "lampias",
  "lampik",
  "lampin",
  "lamping",
  "lampion",
  "lampir",
  "lampit",
  "lampok",
  "lampor",
  "lampu",
  "lampung",
  "lampus",
  "lamtoro",
  "lamtoronisasi",
  "lamun",
  "lamur",
  "lamusir",
  "lana",
  "lanang",
  "lanar",
  "lanau",
  "lanbau",
  "lanca",
  "lancang",
  "lancap",
  "lancar",
  "lancia",
  "lancing",
  "lancip",
  "lancit",
  "lancong",
  "lancung",
  "lancur",
  "lancut",
  "landa",
  "landahur",
  "landai",
  "landak",
  "landang",
  "landap",
  "landas",
  "landau",
  "landors",
  "landrad",
  "landuk",
  "landung",
  "landur",
  "lang",
  "langah",
  "langak-languk",
  "langau",
  "langen",
  "langendrian",
  "langenswara",
  "langgah",
  "langgai",
  "langgam",
  "langgan",
  "langgang",
  "langgar",
  "langgas",
  "langgayan",
  "langgeng",
  "langguk",
  "langgung",
  "langi",
  "langir",
  "langis",
  "langit",
  "langka",
  "langkah",
  "langkai",
  "langkan",
  "langkang",
  "langkap",
  "langkara",
  "langkas",
  "langkat",
  "langkau",
  "langking",
  "langkisan",
  "langkitang",
  "langkong",
  "langkup",
  "langlai",
  "langlang",
  "langsai",
  "langsam",
  "langsang",
  "langsar",
  "langsat",
  "langse",
  "langseng",
  "langsep",
  "langsi",
  "langsing",
  "langsir",
  "langsuir",
  "langsung",
  "langu",
  "langut",
  "lanhir",
  "lanja",
  "lanjai",
  "lanjak",
  "lanjam",
  "lanjang",
  "lanjar",
  "lanjau",
  "lanji",
  "lanjuk",
  "lanjung",
  "lanjur",
  "lanjut",
  "lanolin",
  "lanset",
  "lansia",
  "lansir",
  "lanskap",
  "lantah",
  "lantai",
  "lantak",
  "lantam",
  "lantan",
  "lantang",
  "lantanum",
  "lantar",
  "lantas",
  "lantera",
  "lantesari",
  "lantik",
  "lantin",
  "lanting",
  "lantip",
  "lantun",
  "lantung",
  "lantur",
  "lanugo",
  "lanun",
  "lanus",
  "lanyah",
  "lanyak",
  "lanyau",
  "laocu",
  "laos",
  "laoteng",
  "lap",
  "lapah",
  "lapak",
  "lapang",
  "lapar",
  "laparoskop",
  "laparoskopi",
  "lapat-lapat",
  "lapektomi",
  "lapel",
  "lapih",
  "lapik",
  "lapili",
  "lapir",
  "lapis",
  "lapislazuli",
  "lapo",
  "lapor",
  "laptop",
  "lapuk",
  "lapun",
  "lapur",
  "lara",
  "larah",
  "larai",
  "larak",
  "laram",
  "larang",
  "larap",
  "laras",
  "larat",
  "larau",
  "largisimo",
  "largo",
  "lari",
  "larih",
  "larik",
  "laring",
  "laringal",
  "laringitis",
  "laringoskop",
  "laris",
  "larnaks",
  "laron",
  "lars",
  "laru",
  "larung",
  "larut",
  "larva",
  "larvarium",
  "las",
  "lasa",
  "lasah",
  "lasak",
  "lasana",
  "lasat",
  "laser",
  "lasi",
  "lasinia",
  "laskar",
  "laso",
  "lasparaginase",
  "lasuh",
  "lat",
  "lata",
  "latah",
  "latak",
  "latam",
  "latar",
  "latas",
  "lateks",
  "laten",
  "latensi",
  "lateral",
  "laterit",
  "latif",
  "latifundium",
  "latih",
  "lating",
  "latis",
  "latma",
  "latosol",
  "latuh",
  "latuk",
  "latung",
  "latur",
  "lauh",
  "lauk",
  "laun",
  "laung",
  "laur",
  "laut",
  "lauya",
  "lava",
  "lavase",
  "lavendel",
  "lavender",
  "lawa",
  "lawah",
  "lawak",
  "lawalata",
  "lawamah",
  "lawan",
  "lawang",
  "lawar",
  "lawas",
  "lawat",
  "lawazim",
  "lawe",
  "lawean",
  "lawi",
  "lawina",
  "lawon",
  "lawrensium",
  "layah",
  "layak",
  "layam",
  "layan",
  "layang",
  "layap",
  "layar",
  "layas",
  "layat",
  "layer",
  "layon",
  "layu",
  "layuh",
  "layuk",
  "layung",
  "layur",
  "layut",
  "laza",
  "lazim",
  "lazuardi",
  "leak",
  "lebah",
  "lebai",
  "lebak",
  "lebam",
  "leban",
  "lebang",
  "lebap",
  "lebar",
  "lebaran",
  "lebas",
  "lebat",
  "leber",
  "lebih",
  "lebuh",
  "lebuk",
  "lebum",
  "lebun",
  "lebung",
  "lebur",
  "lecah",
  "lecak",
  "lecap",
  "lecat",
  "leceh",
  "lecek",
  "lecer",
  "lecet",
  "leci",
  "lecit",
  "leco",
  "lecok",
  "lecuh",
  "lecun",
  "lecup",
  "lecur",
  "lecut",
  "ledak",
  "ledang",
  "ledek",
  "ledeng",
  "ledes",
  "leding",
  "ledos",
  "ledre",
  "leduk",
  "ledung",
  "lefa",
  "lega",
  "legak-legok",
  "legal",
  "legalisasi",
  "legalitas",
  "legam",
  "legap",
  "legar",
  "legasi",
  "legasteni",
  "legat",
  "legataris",
  "legato",
  "legator",
  "lege",
  "legek",
  "legen",
  "legenda",
  "legendaris",
  "leger",
  "leges",
  "leghorn",
  "legi",
  "legih",
  "legio",
  "legislasi",
  "legislatif",
  "legislator",
  "legisme",
  "legit",
  "legitimaris",
  "legitimas",
  "legitimasi",
  "legitimitas",
  "legiun",
  "lego",
  "legok",
  "legong",
  "legu",
  "legum",
  "legunder",
  "legundi",
  "legung",
  "legup-legup",
  "leha-leha",
  "lehar",
  "leher",
  "lei",
  "leja",
  "lejang",
  "lejar",
  "lejas",
  "lejit",
  "lejok",
  "leka",
  "lekah",
  "lekak-lekuk",
  "lekam",
  "lekang",
  "lekap",
  "lekap-lekup",
  "lekar",
  "lekas",
  "lekat",
  "lekemia",
  "lekir",
  "lekit",
  "lekok",
  "lekosit",
  "leksem",
  "leksikal",
  "leksikograf",
  "leksikografi",
  "leksikografis",
  "leksikolog",
  "leksikologi",
  "leksikon",
  "leksikostatistik",
  "leksis",
  "lekton",
  "lektor",
  "lektur",
  "leku",
  "lekuh-lekih",
  "lekuk",
  "lekum",
  "lekun",
  "lekung",
  "lekup-lekap",
  "lela",
  "lelabah",
  "lelah",
  "lelai",
  "lelaki",
  "lelancur",
  "lelang",
  "lelangon",
  "lelangse",
  "lelap",
  "lelar",
  "lelas",
  "lelat",
  "lelatu",
  "lelawa",
  "lele",
  "leleh",
  "lelembut",
  "lelemuku",
  "lelep",
  "leler",
  "leles",
  "lelet",
  "lelewa",
  "leli",
  "lelonobroto",
  "leluasa",
  "lelucon",
  "leluhur",
  "leluing",
  "lelung",
  "lelungit",
  "leluri",
  "lem",
  "lema",
  "lemah",
  "lemak",
  "lemang",
  "lemari",
  "lemas",
  "lemata",
  "lemau",
  "lembaga",
  "lembah",
  "lembai",
  "lembak",
  "lembam",
  "lemban",
  "lembang",
  "lembap",
  "lembar",
  "lembayung",
  "lembega",
  "lembek",
  "lembeng",
  "lembidang",
  "lembing",
  "lembok",
  "lembora",
  "lembu",
  "lembung",
  "lembur",
  "lemburu",
  "lembut",
  "lemena",
  "lemender",
  "lemes",
  "lemidi",
  "lemo",
  "lemon",
  "lempah",
  "lempai",
  "lempang",
  "lempap",
  "lempar",
  "lempari",
  "lempaung",
  "lempem",
  "lempenai",
  "lempeng",
  "lemper",
  "lemping",
  "lempit",
  "lempoh",
  "lempuh",
  "lempuk",
  "lempung",
  "lempuyang",
  "lempuyangan",
  "lemur",
  "lemuru",
  "lemusir",
  "lena",
  "lenan",
  "lencana",
  "lencang",
  "lenceng",
  "lencet",
  "lenci",
  "lencir",
  "lencit",
  "lencong",
  "lencun",
  "lenda",
  "lendaian",
  "lendeh",
  "lender",
  "lendir",
  "lendot",
  "lendung",
  "lendut",
  "leng",
  "lenga",
  "lengah",
  "lengai",
  "lengak",
  "lengan",
  "lengang",
  "lengar",
  "lengas",
  "lengat",
  "lenge",
  "lenggak",
  "lenggana",
  "lengganan",
  "lenggang",
  "lenggara",
  "lenggek",
  "lengger",
  "lenggok",
  "lenggong",
  "lenggor",
  "lenggundi",
  "lenggut",
  "lengit",
  "lengkai",
  "lengkanas",
  "lengkang",
  "lengkap",
  "lengkara",
  "lengkeng",
  "lengkesa",
  "lengket",
  "lengkiang",
  "lengking",
  "lengkitang",
  "lengkok",
  "lengkong",
  "lengkuas",
  "lengkung",
  "lengkur",
  "lengoh",
  "lengong",
  "lengos",
  "lengseng",
  "lengser",
  "lengset",
  "lenguh",
  "lengung",
  "lening",
  "lenis",
  "lenitrik",
  "lenja",
  "lenjan",
  "lenjaran",
  "lenjing",
  "lenjuang",
  "lenong",
  "lenor",
  "lens",
  "lensa",
  "lenser",
  "lenset",
  "lenso",
  "lentam-lentum",
  "lentang",
  "lentang-lentok",
  "lenteng",
  "lentera",
  "lentik",
  "lenting",
  "lentisel",
  "lentoid",
  "lentok",
  "lentong",
  "lentuk",
  "lentum",
  "lentung",
  "lentur",
  "lentus",
  "lenung",
  "lenyah",
  "lenyai",
  "lenyak",
  "lenyap",
  "lenyau",
  "lenyeh",
  "lenyet",
  "lenyut",
  "leo",
  "leonid",
  "leontin",
  "leot",
  "lepa",
  "lepai",
  "lepak",
  "lepang",
  "lepap",
  "lepas",
  "lepat",
  "lepau",
  "lepe",
  "lepek",
  "leper",
  "leperi",
  "lepes",
  "lepet",
  "lepih",
  "lepik",
  "lepit",
  "leplap",
  "lepoh",
  "lepok",
  "lepot",
  "lepra",
  "leproma",
  "lepromin",
  "leproseri",
  "leptodos",
  "leptoskop",
  "leptosom",
  "lepu",
  "lepuh",
  "lepuk",
  "lepur",
  "lerah",
  "lerai",
  "lerak",
  "lerang",
  "lerap",
  "lereng",
  "leret",
  "lerok",
  "lerot",
  "lerum",
  "les",
  "lesa",
  "lesak",
  "lesan",
  "lesang",
  "lesap",
  "lesat",
  "lesbi",
  "lesbian",
  "lesbianisme",
  "leseh",
  "lesek",
  "leset",
  "lesi",
  "lesing",
  "lesir",
  "lesit",
  "lesitin",
  "lesitina",
  "lesnar",
  "lesot",
  "lesplang",
  "lestari",
  "lestek",
  "lesterung",
  "lesu",
  "lesung",
  "lesus",
  "lesut",
  "leta",
  "letai",
  "letak",
  "letal",
  "letalitas",
  "letang",
  "letargi",
  "lete-lete",
  "letek",
  "leter",
  "leterseter",
  "letih",
  "letik",
  "leting",
  "letis",
  "letnan",
  "letoi",
  "letos",
  "letraset",
  "letuk",
  "letum",
  "letung",
  "letup",
  "letur",
  "letus",
  "leuca",
  "leukemia",
  "leukoderma",
  "leukofit",
  "leukoma",
  "leukonisia",
  "leukopenia",
  "leukoplakia",
  "leukore",
  "leukorea",
  "leukosit",
  "leukositometer",
  "leukositosis",
  "level",
  "lever",
  "leveransir",
  "levertran",
  "levirat",
  "levitin",
  "levulosa",
  "lewa",
  "lewah",
  "lewar",
  "lewat",
  "lewisid",
  "lewu",
  "leyeh",
  "leyot",
  "lezat",
  "liabilitas",
  "lian",
  "liana",
  "liang",
  "liangliong",
  "liar",
  "lias",
  "liat",
  "liau",
  "libas",
  "libat",
  "libei",
  "liberal",
  "liberalis",
  "liberalisasi",
  "liberalisme",
  "liberalistis",
  "liberasi",
  "liberator",
  "libero",
  "libidis",
  "libido",
  "libitum",
  "libra",
  "librasi",
  "libreto",
  "libur",
  "licak",
  "licau",
  "lici",
  "licik",
  "licin",
  "licurai",
  "lid",
  "lidah",
  "lidas",
  "lidi",
  "lidid",
  "lifo",
  "lift",
  "lifter",
  "liga",
  "ligamen",
  "ligan",
  "ligar",
  "ligas",
  "ligasi",
  "ligat",
  "ligatur",
  "ligih",
  "lignin",
  "lignit",
  "lignoselulosa",
  "lignosulfonat",
  "lignotuber",
  "lihai",
  "lihat",
  "lik",
  "likantropi",
  "likas",
  "likat",
  "likir",
  "liku",
  "likuid",
  "likuida",
  "likuidasi",
  "likuiditas",
  "likur",
  "likut",
  "lil",
  "lila",
  "lilah",
  "lilan",
  "lilau",
  "lili",
  "lilin",
  "liliput",
  "lilit",
  "lillahi",
  "lima",
  "liman",
  "limar",
  "limas",
  "limau",
  "limbah",
  "limbai",
  "limbak",
  "limban",
  "limbang",
  "limbat",
  "limbing",
  "limbubu",
  "limbuk",
  "limbung",
  "limbur",
  "limfa",
  "limfadema",
  "limfadenitis",
  "limfadenoma",
  "limfadenosis",
  "limfaderitis",
  "limfangioma",
  "limfatik",
  "limfoblartoma",
  "limfoblas",
  "limfoblastoma",
  "limfografi",
  "limfoma",
  "limfonodus",
  "limfopenia",
  "limfosit",
  "limfositopenia",
  "limfositosis",
  "limit",
  "limitasi",
  "limitatif",
  "limnetik",
  "limnologi",
  "limnoplankton",
  "limpa",
  "limpah",
  "limpap",
  "limpapas",
  "limpas",
  "limpau",
  "limpit",
  "limpoh",
  "limpung",
  "limun",
  "limusin",
  "limut",
  "lin",
  "linang",
  "linau",
  "lincah",
  "lincak",
  "lincam",
  "lincir",
  "lincun",
  "lindak",
  "lindang",
  "lindap",
  "lindas",
  "lindik",
  "lindis",
  "lindu",
  "lindung",
  "lindur",
  "linear",
  "linen",
  "ling",
  "lingar",
  "lingat",
  "lingga",
  "linggam",
  "linggata",
  "linggayuran",
  "linggi",
  "linggis",
  "lingkap",
  "lingkar",
  "lingkawa",
  "lingkis",
  "lingkung",
  "lingkup",
  "linglung",
  "lingsa",
  "lingsang",
  "lingsir",
  "lingsu",
  "lingua",
  "linguafon",
  "linguis",
  "linguistik",
  "lini",
  "linier",
  "linimen",
  "lining",
  "linjak",
  "linoleum",
  "linsang",
  "lintabung",
  "lintadu",
  "lintah",
  "lintang",
  "lintap",
  "lintar",
  "lintas",
  "lintibang",
  "linting",
  "lintir",
  "lintuh",
  "lintup",
  "linu",
  "linuhung",
  "linyak",
  "linyar",
  "lio",
  "liofilisasi",
  "liong",
  "liontin",
  "lipai",
  "lipan",
  "lipas",
  "lipase",
  "lipat",
  "lipektomi",
  "lipemia",
  "lipid",
  "lipiodol",
  "lipit",
  "liplap",
  "lipoksidase",
  "lipolisis",
  "lipoprotein",
  "lipstik",
  "lipu",
  "lipur",
  "liput",
  "lir",
  "lira",
  "lirida",
  "lirih",
  "lirik",
  "liris",
  "lis",
  "lisah",
  "lisan",
  "lisani",
  "lisensi",
  "lisimeter",
  "lisis",
  "lisol",
  "lisong",
  "lisplang",
  "lister",
  "listeria",
  "listrik",
  "lisu",
  "lisus",
  "lisut",
  "litah",
  "litak",
  "litani",
  "liter",
  "literator",
  "literer",
  "litium",
  "litografi",
  "litologi",
  "litoral",
  "litosfer",
  "litotes",
  "litotomi",
  "litsus",
  "liturgi",
  "liturgis",
  "liuk",
  "liung-liung",
  "liur",
  "liut",
  "liver",
  "liwa",
  "liwan",
  "liwat",
  "liwet",
  "loak",
  "lob",
  "loba",
  "lobak",
  "loban",
  "loberci",
  "lobi",
  "lobster",
  "locok",
  "locot",
  "lodan",
  "lodeh",
  "lodoh",
  "lodong",
  "log",
  "logam",
  "logaritma",
  "logat",
  "logawiah",
  "logika",
  "logis",
  "logistik",
  "logo",
  "logogram",
  "logopedia",
  "logotip",
  "loh",
  "loha",
  "lohok",
  "lohor",
  "loji",
  "lok",
  "loka",
  "lokacipta",
  "lokakarya",
  "lokal",
  "lokalis",
  "lokalisasi",
  "lokan",
  "lokananta",
  "lokap",
  "lokasi",
  "lokastiti",
  "lokatif",
  "lokatikranta",
  "lokatraya",
  "lokawarta",
  "lokawidura",
  "lokawigna",
  "lokawiruda",
  "lokawisata",
  "lokcuan",
  "lokek",
  "lokeswara",
  "loket",
  "loki",
  "lokia",
  "lokika",
  "lokio",
  "loklok",
  "lokomobil",
  "lokomotif",
  "lokos",
  "loksek",
  "loksun",
  "loktong",
  "lokus",
  "lokusi",
  "lolak",
  "loleng",
  "loloh",
  "lolohan",
  "lolong",
  "lolos",
  "lomba",
  "lombar",
  "lombok",
  "lombong",
  "lomek",
  "lomot",
  "lompat",
  "lompayang",
  "lompok",
  "lompong",
  "lonan",
  "loncat",
  "loncek",
  "lonceng",
  "loncer",
  "lonco",
  "loncos",
  "londang",
  "londong",
  "loneng",
  "long",
  "longak-longok",
  "longdres",
  "longgar",
  "longgok",
  "longgor",
  "longitudinal",
  "longo",
  "longok",
  "longong",
  "longser",
  "longsor",
  "longtorso",
  "lonjak",
  "lonjong",
  "lonjor",
  "lonsong",
  "lontai",
  "lontang-lanting",
  "lontang-lantung",
  "lontar",
  "lontara",
  "lonte",
  "lontok",
  "lontong",
  "lonyok",
  "lop",
  "lopak",
  "lopek",
  "loper",
  "lopis",
  "lopor",
  "lor",
  "lorah",
  "loran",
  "lorat",
  "lorber",
  "lorek",
  "loreng",
  "lori",
  "lornyet",
  "lorong",
  "lorot",
  "los",
  "lose",
  "losin",
  "losion",
  "losmen",
  "loso",
  "losong",
  "lot",
  "lota",
  "lotak",
  "lotek",
  "loteng",
  "lotis",
  "lotong",
  "lotre",
  "lotus",
  "lowong",
  "loya",
  "loyak",
  "loyal",
  "loyalis",
  "loyalitas",
  "loyang",
  "loyar",
  "loyo",
  "loyong",
  "lozenge",
  "luah",
  "luak",
  "luang",
  "luap",
  "luar",
  "luas",
  "luat",
  "luban",
  "lubang",
  "luber",
  "lubuk",
  "lucah",
  "lucu",
  "lucup",
  "lucut",
  "ludah",
  "ludat",
  "ludes",
  "luding",
  "ludruk",
  "lues",
  "lugas",
  "lugu",
  "lugut",
  "luhak",
  "luhmahful",
  "luhung",
  "luhur",
  "luih",
  "luik",
  "luing",
  "luk",
  "luka",
  "lukah",
  "lukat",
  "lukeh",
  "lukis",
  "luks",
  "luku",
  "lukut",
  "lulai",
  "luli",
  "luluh",
  "luluk",
  "lulum",
  "lulup",
  "lulur",
  "lulus",
  "lulut",
  "lum",
  "lumai",
  "lumang",
  "lumar",
  "lumas",
  "lumat",
  "lumayan",
  "lumba-lumba",
  "lumbal",
  "lumbu",
  "lumbung",
  "lumen",
  "lumer",
  "lumi-lumi",
  "luminositas",
  "lumpang",
  "lumpektomi",
  "lumpia",
  "lumping",
  "lumpuh",
  "lumpuk",
  "lumpur",
  "lumrah",
  "lumsum",
  "lumuh",
  "lumur",
  "lumus",
  "lumut",
  "lunak",
  "lunas",
  "lunau",
  "luncai",
  "luncas",
  "luncung",
  "luncur",
  "lundang",
  "lundi",
  "lundu",
  "luner",
  "lung",
  "lungguh",
  "lungkah",
  "lungkang",
  "lungkum",
  "lunglai",
  "lunglung",
  "lungsar",
  "lungse",
  "lungsin",
  "lungsung",
  "lungsur",
  "lungun",
  "lunjur",
  "lunta",
  "luntang",
  "luntang-lantung",
  "luntas",
  "luntur",
  "lunyah",
  "lunyai",
  "lup",
  "lupa",
  "lupat",
  "lupi",
  "lupuh",
  "lupuk",
  "lupung",
  "lupus",
  "luput",
  "lurah",
  "lurik",
  "luru",
  "lurub",
  "luruh",
  "lurus",
  "lurut",
  "lus",
  "lusa",
  "lusin",
  "lustrum",
  "lusuh",
  "lut",
  "lutetium",
  "luti",
  "lutu",
  "lutung",
  "lutut",
  "luweng",
  "luwes",
  "luyak",
  "luyu",
  "luyut",
  "maab",
  "maaf",
  "mabriuk",
  "mabrur",
  "mabuh",
  "mabuk",
  "mabul",
  "macakal",
  "macam",
  "macan",
  "macapat",
  "mace",
  "macet",
  "macis",
  "mad",
  "mada",
  "madah",
  "madali",
  "madam",
  "madang",
  "madani",
  "madar",
  "madat",
  "madewi",
  "madi",
  "madia",
  "madik",
  "madinding",
  "madmadah",
  "mado",
  "madona",
  "madras",
  "madrasah",
  "madu",
  "madukara",
  "madumangsa",
  "madya",
  "maesan",
  "maesenas",
  "maestro",
  "mafela",
  "mafhum",
  "mafia",
  "mafioso",
  "mafsadah",
  "mafsadat",
  "mag",
  "magainin",
  "magalah",
  "magandi",
  "magang",
  "magasin",
  "magel",
  "magenta",
  "magersari",
  "magfirah",
  "magfirat",
  "magi",
  "magis",
  "magister",
  "magistrat",
  "maglub",
  "magma",
  "magnesium",
  "magnesol",
  "magnet",
  "magnetik",
  "magnetika",
  "magnetis",
  "magnetisme",
  "magnetit",
  "magnetometer",
  "magnetor",
  "magnetostatika",
  "magnitudo",
  "magrib",
  "magribi",
  "magrur",
  "magun",
  "mah",
  "maha",
  "mahabah",
  "mahabintang",
  "mahadewa",
  "mahadewi",
  "mahaduta",
  "mahaguru",
  "mahah",
  "mahajana",
  "mahakala",
  "mahakarya",
  "mahakuasa",
  "mahal",
  "mahamen",
  "mahamenteri",
  "mahamulia",
  "mahang",
  "mahaparana",
  "mahapatih",
  "mahar",
  "maharaja",
  "maharajalela",
  "maharana",
  "maharani",
  "mahardika",
  "maharesi",
  "maharupa",
  "mahasiswa",
  "mahasiswi",
  "mahasuci",
  "mahatahu",
  "mahatma",
  "mahatur",
  "mahayana",
  "mahbub",
  "mahbubah",
  "mahbubat",
  "mahdi",
  "maherat",
  "mahesa",
  "maheswara",
  "mahfuz",
  "mahia",
  "mahimahi",
  "mahir",
  "mahkamah",
  "mahkota",
  "mahligai",
  "mahmud",
  "mahoni",
  "mahraj",
  "mahram",
  "mahsul",
  "mahsyar",
  "mahwu",
  "mahyong",
  "mahzurat",
  "mai",
  "maido",
  "maimun",
  "main",
  "mair",
  "mairat",
  "maizena",
  "maja",
  "majaan",
  "majakane",
  "majakaya",
  "majakeling",
  "majal",
  "majalah",
  "majas",
  "majasi",
  "majati",
  "majedub",
  "majekeling",
  "majelis",
  "majemuk",
  "majenun",
  "majikan",
  "majir",
  "majizat",
  "majong",
  "maju",
  "majuh",
  "majuj",
  "majun",
  "majung",
  "majusi",
  "maka",
  "makadam",
  "makadasang",
  "makadok",
  "makalah",
  "makalangkang",
  "makam",
  "makan",
  "makantah",
  "makantuh",
  "makanya",
  "makao",
  "makaopo",
  "makar",
  "makara",
  "makaroni",
  "makas",
  "makbud",
  "makbul",
  "makcik",
  "makcomblang",
  "makda",
  "makdan",
  "makelar",
  "makerel",
  "maket",
  "makhdum",
  "makhluk",
  "makhraj",
  "maki",
  "makin",
  "making",
  "makiyah",
  "makjuj",
  "maklaf",
  "maklum",
  "maklumat",
  "maklun",
  "makmal",
  "makmum",
  "makmur",
  "makna",
  "maknawi",
  "makramat",
  "makrame",
  "makrifat",
  "makrifatullah",
  "makro",
  "makroekonomi",
  "makrofita",
  "makrofotografi",
  "makroftalmus",
  "makrogametosit",
  "makrohistori",
  "makrokosmos",
  "makrokriminologi",
  "makrolinguistik",
  "makromelia",
  "makrometeorologi",
  "makromolekul",
  "makrosefalik",
  "makroskopis",
  "makrosmatik",
  "makrosmatis",
  "makrososiologi",
  "makruf",
  "makruh",
  "maksi",
  "maksiat",
  "maksila",
  "maksim",
  "maksimal",
  "maksimum",
  "maksud",
  "maksum",
  "maktab",
  "maktub",
  "makua",
  "makul",
  "makula",
  "makulat",
  "makurung",
  "makuta",
  "makyong",
  "makzul",
  "mal",
  "mala",
  "malabau",
  "malabsorpsi",
  "malafide",
  "malafungsi",
  "malagandang",
  "malagizi",
  "malah",
  "malai",
  "malaik",
  "malaikat",
  "malaikatulmaut",
  "malaise",
  "malak",
  "malaka",
  "malakama",
  "malakat",
  "malakit",
  "malakofili",
  "malakologi",
  "malakut",
  "malam",
  "malan",
  "malang",
  "malangbang",
  "malap",
  "malapari",
  "malapetaka",
  "malapraktek",
  "malapraktik",
  "malar",
  "malaria",
  "malas",
  "malasia",
  "malasuai",
  "malatindak",
  "malau",
  "maldistribusi",
  "male",
  "maleman",
  "maleo",
  "maleolus",
  "mali-mali",
  "maligai",
  "malih",
  "malik",
  "maliki",
  "malikuljabar",
  "malikulmuluk",
  "malim",
  "maling",
  "malis",
  "malisol",
  "malka",
  "malnutrisi",
  "maloklusi",
  "malt",
  "maltase",
  "maltosa",
  "malu",
  "malun",
  "malung",
  "mam",
  "mama",
  "mamah",
  "mamai",
  "mamak",
  "mamalia",
  "maman",
  "mamanah",
  "mamanda",
  "mamang",
  "mamano",
  "mamat",
  "mambang",
  "mambek",
  "mambo",
  "mambruk",
  "mambu",
  "mambung",
  "mamduhah",
  "mami",
  "mamik",
  "mamlakat",
  "mamografi",
  "mampai",
  "mampat",
  "mampir",
  "mampu",
  "mampung",
  "mampus",
  "mamut",
  "man",
  "mana",
  "manah",
  "manai",
  "manajemen",
  "manajer",
  "manajerial",
  "manakala",
  "manakan",
  "manakib",
  "manalagi",
  "manasik",
  "manasongo",
  "manasuka",
  "manau",
  "mancanegara",
  "mancawarna",
  "manci",
  "mancis",
  "mancung",
  "mancur",
  "manda",
  "mandah",
  "mandai",
  "mandala",
  "mandalika",
  "mandam",
  "mandar",
  "mandarin",
  "mandat",
  "mandataris",
  "mandau",
  "mandeh",
  "mandek",
  "mandelevium",
  "mandi",
  "mandibula",
  "mandil",
  "mandir",
  "mandiri",
  "mandolin",
  "mandor",
  "mandraguna",
  "mandril",
  "mandrin",
  "mandul",
  "mandung",
  "maneken",
  "manerisme",
  "manfaat",
  "mang",
  "mangan",
  "mangap",
  "mangas",
  "mangau",
  "mangayubagya",
  "mangga",
  "manggah",
  "manggala",
  "manggar",
  "manggis",
  "manggung",
  "mangir",
  "mangkak",
  "mangkanya",
  "mangkar",
  "mangkas",
  "mangkat",
  "mangkel",
  "mangkih",
  "mangkir",
  "mangkok",
  "mangkubumi",
  "mangkuk",
  "mangkus",
  "mangsa",
  "mangsi",
  "mangu",
  "mangun",
  "mangut",
  "mani",
  "mania",
  "maniak",
  "manifes",
  "manifestasi",
  "manifesto",
  "manik",
  "manik-depresif",
  "manikam",
  "manikdepresi",
  "manikmaya",
  "manikur",
  "manila",
  "manimba",
  "manipol",
  "manipulasi",
  "manipulatif",
  "manipulator",
  "manira",
  "manis",
  "manise",
  "manja",
  "manjapada",
  "manjau",
  "manjeri",
  "manjing",
  "manjung",
  "manjur",
  "manol",
  "manometer",
  "manora",
  "manostat",
  "manset",
  "mansiang",
  "mansukh",
  "manta",
  "mantan",
  "mantap",
  "mantari",
  "mantel",
  "manten",
  "manti",
  "mantik",
  "mantiki",
  "mantisa",
  "mantissa",
  "mantra",
  "mantram",
  "mantri",
  "mantu",
  "mantuk",
  "manual",
  "manufaktur",
  "manufakturing",
  "manuk",
  "manumisio",
  "manumpak",
  "manunggal",
  "manusia",
  "manusiawi",
  "manuskrip",
  "manut",
  "manuver",
  "manuwa",
  "manyala",
  "manyar",
  "manzil",
  "manzilah",
  "maois",
  "map",
  "mapak",
  "mapalus",
  "mapan",
  "mar",
  "mara",
  "marah",
  "maraja",
  "marak",
  "marakas",
  "marambung",
  "maramus",
  "maranta",
  "marapulai",
  "maras",
  "maraton",
  "marbling",
  "marbut",
  "marcapada",
  "mardatilah",
  "mardatillah",
  "mardud",
  "mare",
  "marem",
  "maret",
  "marfuk",
  "marga",
  "margalit",
  "margarin",
  "margasatwa",
  "margin",
  "marginal",
  "marginalisasi",
  "marginalisme",
  "margrit",
  "marhaban",
  "marhaen",
  "marhaenis",
  "marhaenisme",
  "marhum",
  "marhumah",
  "mari",
  "maria",
  "marikan",
  "marikh",
  "marikultur",
  "marimu",
  "marina",
  "marinade",
  "marine",
  "marinir",
  "marinyo",
  "marinyu",
  "marital",
  "maritim",
  "mariyuana",
  "marjik",
  "marjinal",
  "mark",
  "marka",
  "markado",
  "markah",
  "markas",
  "markasit",
  "marketri",
  "markis",
  "markisa",
  "markoni",
  "markonis",
  "markusip",
  "marlin",
  "marmelade",
  "marmer",
  "marmot",
  "maro",
  "marpaud",
  "mars",
  "marsaoleh",
  "marsekal",
  "marsepen",
  "marsose",
  "martabak",
  "martaban",
  "martabat",
  "martandang",
  "martil",
  "martini",
  "martir",
  "maru",
  "marus",
  "marut",
  "marwas",
  "marxisme",
  "marzipan",
  "mas",
  "masa",
  "masai",
  "masak",
  "masakan",
  "masakat",
  "masala",
  "masalah",
  "masam",
  "masap",
  "masase",
  "masayu",
  "masbuk",
  "masdar",
  "masehi",
  "masektomi",
  "maser",
  "maserasi",
  "mashaf",
  "masif",
  "masih",
  "masin",
  "masinal",
  "masing-masing",
  "masinis",
  "masir",
  "masjid",
  "masjidilaksa",
  "masjidilharam",
  "maskanat",
  "maskapai",
  "maskara",
  "maskat",
  "maskawin",
  "masker",
  "maskodok",
  "maskon",
  "maskot",
  "maskulin",
  "maskulinitas",
  "maskumambang",
  "maslahat",
  "masnawi",
  "masohi",
  "masoi",
  "masokhis",
  "masokhisme",
  "masokisme",
  "mason",
  "masori",
  "masrum",
  "massa",
  "massal",
  "mastautin",
  "mastektomi",
  "master",
  "masterplan",
  "mastik",
  "mastitis",
  "mastodon",
  "mastuli",
  "masturbasi",
  "masuk",
  "masuliah",
  "masya",
  "masyakah",
  "masyarakat",
  "masygul",
  "masyhadat",
  "masyhur",
  "masyrik",
  "masyuk",
  "mat",
  "mata",
  "matador",
  "matahari",
  "matakao",
  "matalamat",
  "matan",
  "matang",
  "mate",
  "matematika",
  "matematikus",
  "matematis",
  "materi",
  "material",
  "materialistis",
  "materiil",
  "mati",
  "matine",
  "matlak",
  "matoa",
  "maton",
  "matra",
  "matras",
  "matres",
  "matriarkal",
  "matriarkat",
  "matriks",
  "matrikulasi",
  "matrilineal",
  "matrilokal",
  "matris",
  "matronim",
  "matros",
  "matu",
  "matur",
  "maturasi",
  "maturitas",
  "mau",
  "mauizah",
  "maujud",
  "maujudat",
  "maukhid",
  "maukif",
  "maukuf",
  "maula",
  "maulai",
  "maulana",
  "maulhayat",
  "maulid",
  "maulidurasul",
  "maulud",
  "maung",
  "maupun",
  "mausoleum",
  "maut",
  "mauz",
  "mawadah",
  "mawar",
  "mawas",
  "maweda",
  "mawin",
  "mawon",
  "mawut",
  "maya",
  "mayam",
  "mayang",
  "mayangda",
  "mayapada",
  "mayas",
  "mayat",
  "mayeng",
  "mayokratio",
  "mayones",
  "mayor",
  "mayoret",
  "mayoritas",
  "mayung",
  "mayur",
  "mazarin",
  "mazbah",
  "mazhab",
  "mazi",
  "mazkur",
  "mazmumah",
  "mazmur",
  "mbah",
  "mbak",
  "mbakyu",
  "mbeling",
  "mbok",
  "mbokmas",
  "meander",
  "mebel",
  "mecis",
  "medali",
  "medalion",
  "medan",
  "medang",
  "mede",
  "media",
  "medial",
  "median",
  "mediasi",
  "mediastinum",
  "mediator",
  "medik",
  "medikamentosa",
  "medikasi",
  "mediko",
  "medikolegal",
  "medikus",
  "medil",
  "medio",
  "medis",
  "medisinal",
  "medit",
  "meditasi",
  "mediterania",
  "medium",
  "medok",
  "medu",
  "medula",
  "medusa",
  "mega",
  "megabyte",
  "megafon",
  "megah",
  "megak",
  "megakredit",
  "megal-megol",
  "megalit",
  "megalitikum",
  "megalomania",
  "megalomaniak",
  "megalopolis",
  "megalosit",
  "megamerger",
  "megan",
  "megaohm",
  "megap-megap",
  "megapolis",
  "megaproyek",
  "megar",
  "megaspora",
  "megasporangium",
  "megasporofil",
  "megat",
  "megaton",
  "megatren",
  "megatruh",
  "megawatt",
  "meger",
  "megrek-megrek",
  "mei",
  "meiosis",
  "meja",
  "mejam",
  "mejan",
  "mejana",
  "mejeng",
  "mek",
  "mekanik",
  "mekanika",
  "mekanikgraha",
  "mekanis",
  "mekanisasi",
  "mekanisme",
  "mekanolinguistik",
  "mekap",
  "mekar",
  "meko",
  "mekonium",
  "mel",
  "melabuai",
  "melambang",
  "melamin",
  "melanesia",
  "melangkup",
  "melanin",
  "melanisme",
  "melankolia",
  "melankolis",
  "melankonis",
  "melanoderma",
  "melar",
  "melarat",
  "melas",
  "melase",
  "melasma",
  "melati",
  "melawah",
  "melayu",
  "melek",
  "melela",
  "melempem",
  "meleng",
  "meler",
  "melesek",
  "meleset",
  "melik",
  "melilin",
  "melinjo",
  "melintir",
  "melit",
  "melitofili",
  "meliwis",
  "melodi",
  "melodika",
  "melodius",
  "melodrama",
  "melodramatik",
  "melodramatis",
  "melompong",
  "melon",
  "melor",
  "melotot",
  "melpari",
  "melukut",
  "melulu",
  "melur",
  "mem",
  "memang",
  "memar",
  "membal",
  "memble",
  "membran",
  "memedi",
  "memek",
  "memelas",
  "memo",
  "memoar",
  "memorabilia",
  "memorandum",
  "memorat",
  "memori",
  "memorial",
  "mempan",
  "mempelai",
  "mempelam",
  "mempelas",
  "mempelasari",
  "mempening",
  "memper",
  "mempitis",
  "memplak",
  "mempurung",
  "memutah",
  "mena",
  "menaga",
  "menak",
  "menampun",
  "menang",
  "menantu",
  "menara",
  "menat",
  "mencak",
  "mencelat",
  "menceng",
  "menceret",
  "mencit",
  "mencla-mencle",
  "menclok",
  "mencok",
  "mencong",
  "mencos",
  "mencret",
  "mendak",
  "mendap",
  "mendapa",
  "mendeleka",
  "mendelevium",
  "mendeng",
  "mendiang",
  "mendikai",
  "mending",
  "mendira",
  "mendoan",
  "mendonan",
  "mendong",
  "mendreng",
  "mendu",
  "mendung",
  "mendur",
  "mendura",
  "mendut",
  "menep",
  "menepaat",
  "mengah",
  "mengangah",
  "mengap",
  "mengapa",
  "mengapmendam",
  "mengeh",
  "mengerawan",
  "mengerna",
  "menget",
  "mengga",
  "menggala",
  "menggusta",
  "mengi",
  "mengiang",
  "mengicip",
  "mengirat",
  "mengkal",
  "mengkali",
  "mengkara",
  "mengkaras",
  "mengkelan",
  "mengkerang",
  "mengkeret",
  "mengking",
  "mengkirai",
  "mengkirik",
  "mengkis",
  "mengkona",
  "mengkuang",
  "mengkudu",
  "mengok",
  "mengor",
  "mengot",
  "mengsol",
  "mengsong",
  "mengung",
  "menhir",
  "meni",
  "meningitis",
  "menir",
  "meniran",
  "meniskus",
  "menit",
  "menjangan",
  "menong",
  "menopause",
  "menor",
  "menoragia",
  "menostaksis",
  "mens",
  "menserendahi",
  "mensiang",
  "menstruasi",
  "mensurasi",
  "mentah",
  "mentak",
  "mental",
  "mentalitas",
  "mentang",
  "mentari",
  "mentaruh",
  "mentas",
  "mentaus",
  "mentega",
  "menteleng",
  "menteng",
  "mentereng",
  "menteri",
  "mentibu",
  "mentifakta",
  "mentigi",
  "mentilau",
  "mentimun",
  "mentis",
  "mentok",
  "mentol",
  "mentolo",
  "mentor",
  "mentora",
  "mentua",
  "mentul",
  "menu",
  "menuet",
  "menung",
  "menur",
  "meong",
  "mepet",
  "meracang",
  "meraga",
  "meragi",
  "merah",
  "merajak",
  "merak",
  "merakan",
  "meralgia",
  "merambai",
  "merambung",
  "merana",
  "merang",
  "meranggi",
  "merangsi",
  "merangu",
  "meranti",
  "merapu",
  "merat",
  "merawal",
  "merawan",
  "merbah",
  "merbau",
  "merbaya",
  "merbuk",
  "merbulan",
  "mercak-mercik",
  "mercon",
  "mercu",
  "mercusuar",
  "merdangga",
  "merdeka",
  "merdesa",
  "merdinah",
  "merdu",
  "merduk",
  "mere",
  "merek",
  "mereka",
  "merem",
  "merembung",
  "mereng",
  "meres",
  "mergat",
  "merger",
  "mergul",
  "meri",
  "meriam",
  "meriang",
  "merica",
  "meridian",
  "merih",
  "merik",
  "merikan",
  "merikarp",
  "merinding",
  "mering",
  "meristem",
  "merjan",
  "merkah",
  "merkantilisme",
  "merkubang",
  "merkuri",
  "merkurium",
  "merkurius",
  "merkuro",
  "merkurokrom",
  "merlilin",
  "merlimau",
  "merogoni",
  "merosot",
  "merot",
  "merpati",
  "merpaud",
  "merpitis",
  "merpoyan",
  "merserisasi",
  "mersik",
  "merta",
  "mertamu",
  "mertapal",
  "mertayam",
  "mertega",
  "mertelu",
  "mertua",
  "meru",
  "meruap",
  "merubi",
  "merunggai",
  "merut",
  "merwatin",
  "mes",
  "mesa",
  "mesan",
  "mesara",
  "mesem",
  "mesin",
  "mesiu",
  "mesjid",
  "meskalin",
  "meskalina",
  "meski",
  "mesmerisme",
  "mesoderm",
  "mesodermik",
  "mesofili",
  "mesofit",
  "mesolitik",
  "mesolitikum",
  "mesometeorologi",
  "mesomorf",
  "meson",
  "mesopause",
  "mesosfer",
  "mesotel",
  "mesotoraks",
  "mesozoa",
  "mesozoikum",
  "mesra",
  "mester",
  "mesti",
  "mestika",
  "mestizo",
  "mesui",
  "mesum",
  "mesut",
  "meta",
  "metabahasa",
  "metabolik",
  "metabolis",
  "metabolisme",
  "metabolit",
  "metafil",
  "metafisik",
  "metafisika",
  "metafora",
  "metaforis",
  "metah",
  "metai",
  "metal",
  "metalik",
  "metalinguistik",
  "metalografi",
  "metaloid",
  "metalurgi",
  "metalurgis",
  "metamorf",
  "metamorfis",
  "metamorfisme",
  "metamorfosis",
  "metana",
  "metanefros",
  "metanol",
  "metari",
  "metasenter",
  "metastasis",
  "metatarsus",
  "metatesis",
  "metazoa",
  "mete",
  "meteor",
  "meteorit",
  "meteorograf",
  "meteorogram",
  "meteoroid",
  "meteorologi",
  "meteorologis",
  "meter",
  "meterai",
  "metil",
  "metode",
  "metodik",
  "metodis",
  "metodologi",
  "metonimi",
  "metonimia",
  "metrik",
  "metris",
  "metro",
  "metrologi",
  "metromini",
  "metronimik",
  "metronom",
  "metronomis",
  "metropolis",
  "metropolisasi",
  "metropolitan",
  "metroragia",
  "metrum",
  "meunasah",
  "mewah",
  "mewari",
  "mewek",
  "mezanin",
  "mezbah",
  "mezosopran",
  "mi",
  "miak",
  "miana",
  "miang",
  "miap",
  "miasma",
  "midar",
  "midi",
  "midik",
  "midodareni",
  "mieloma",
  "migrain",
  "migran",
  "migrasi",
  "migren",
  "mihrab",
  "mihun",
  "miiofili",
  "mijil",
  "miju",
  "mik",
  "mika",
  "mikat",
  "mikologi",
  "mikoprotein",
  "mikosis",
  "mikotoksin",
  "mikraj",
  "mikro",
  "mikroanalisis",
  "mikroangiopati",
  "mikrob",
  "mikrobe",
  "mikrobiologi",
  "mikrobiologis",
  "mikrobisida",
  "mikrobus",
  "mikroekonomi",
  "mikroelektronika",
  "mikroelemen",
  "mikrofag",
  "mikrofarad",
  "mikrofilm",
  "mikrofita",
  "mikrofon",
  "mikrofotografi",
  "mikrogelombang",
  "mikrograf",
  "mikrografika",
  "mikrogram",
  "mikrohabitat",
  "mikrohistori",
  "mikrohm",
  "mikroklimat",
  "mikrokomputer",
  "mikrokosmos",
  "mikrolet",
  "mikrolinguistik",
  "mikrolit",
  "mikrom",
  "mikromanipulasi",
  "mikrometer",
  "mikrometri",
  "mikron",
  "mikroorganisme",
  "mikroprosesor",
  "mikrosefalia",
  "mikrosekon",
  "mikroskop",
  "mikroskopis",
  "mikrospora",
  "mikrotom",
  "mikrovilus",
  "mikrowatt",
  "mikser",
  "miksoedema",
  "mil",
  "milad",
  "milenium",
  "miliampere",
  "miliar",
  "miliarder",
  "miliaria",
  "milibar",
  "milieu",
  "miligram",
  "milik",
  "mililiter",
  "milimeter",
  "milimikron",
  "milimol",
  "milioner",
  "milir",
  "milisi",
  "militan",
  "militansi",
  "militer",
  "militerisme",
  "militeristis",
  "miliun",
  "miliuner",
  "milivolt",
  "milu",
  "mim",
  "mimbar",
  "mimeograf",
  "mimesis",
  "mimi",
  "mimik",
  "mimikri",
  "mimis",
  "mimisan",
  "mimosa",
  "mimpi",
  "min",
  "mina",
  "minangsraya",
  "minat",
  "minder",
  "mindi",
  "mindoan",
  "mindring",
  "mineral",
  "mineralisasi",
  "mineralogi",
  "mineralogis",
  "minggat",
  "minggir",
  "minggu",
  "minhaj",
  "mini",
  "miniatur",
  "minibasket",
  "minibus",
  "minikar",
  "minikata",
  "minikomputer",
  "minim",
  "minimal",
  "minimarket",
  "minimum",
  "minium",
  "minor",
  "minoritas",
  "minta",
  "mintak",
  "mintakat",
  "mintakulburuj",
  "mintal",
  "minterat",
  "mintuna",
  "minum",
  "minus",
  "minyak",
  "mioglobin",
  "miokardia",
  "mioma",
  "miop",
  "miopia",
  "miosis",
  "miotik",
  "mipis",
  "mirah",
  "mirai",
  "mirakel",
  "mirat",
  "miriapod",
  "mirih",
  "mirik",
  "miring",
  "mirip",
  "miris",
  "mirmekofag",
  "mirmekofili",
  "mirmekologi",
  "misa",
  "misai",
  "misal",
  "misan",
  "misantrop",
  "misbah",
  "misdinar",
  "misi",
  "misil",
  "misiologi",
  "misionaris",
  "misioner",
  "miskal",
  "miskin",
  "miskram",
  "misoa",
  "misofobia",
  "misogami",
  "misoginis",
  "mispersepsi",
  "miss",
  "mistar",
  "mister",
  "misteri",
  "misterius",
  "mistik",
  "mistis",
  "mistisisme",
  "mistri",
  "misuh",
  "miswat",
  "mitasi",
  "mite",
  "mitisida",
  "mitogen",
  "mitologi",
  "mitologis",
  "mitos",
  "mitosis",
  "mitra",
  "mitraliur",
  "mizab",
  "mizan",
  "mnemonik",
  "moa",
  "mob",
  "mobil",
  "mobilet",
  "mobilisasi",
  "mobilisator",
  "mobilitas",
  "moblong",
  "mobokrasi",
  "mochi",
  "modal",
  "modalitas",
  "modar",
  "mode",
  "model",
  "modeling",
  "modem",
  "moderamen",
  "moderat",
  "moderato",
  "moderator",
  "modern",
  "modernisasi",
  "modernisme",
  "modernitas",
  "modernomaniak",
  "modifikasi",
  "modifikatif",
  "modin",
  "modis",
  "modiste",
  "modol",
  "modul",
  "modular",
  "modulasi",
  "modulator",
  "modus",
  "mofet",
  "moga",
  "mogok",
  "mohair",
  "mohon",
  "mohor",
  "mojah",
  "mojang",
  "mok",
  "moka",
  "mokal",
  "moke",
  "moko",
  "moksa",
  "mol",
  "mola",
  "molar",
  "mole",
  "molek",
  "molekul",
  "molekuler",
  "moler",
  "moles",
  "molibden",
  "molibdenum",
  "molor",
  "molos",
  "molotov",
  "moluska",
  "momen",
  "momental",
  "momentum",
  "momok",
  "momong",
  "momot",
  "monarki",
  "moncong",
  "moncor",
  "mondar-mandir",
  "mondeling",
  "mondial",
  "mondok",
  "mondolan",
  "mondong",
  "monel",
  "moneter",
  "mong",
  "monggo",
  "monggol",
  "mongkok",
  "mongmong",
  "mongolisme",
  "mongoloid",
  "monisme",
  "monitor",
  "mono",
  "monoatom",
  "monodi",
  "monodrama",
  "monofag",
  "monofobia",
  "monofonir",
  "monogam",
  "monogami",
  "monogini",
  "monografi",
  "monogram",
  "monokarpa",
  "monokel",
  "monokini",
  "monoklin",
  "monoklinal",
  "monokotil",
  "monokotiledon",
  "monokrasi",
  "monokrom",
  "monokromatis",
  "monokromator",
  "monoksida",
  "monokultur",
  "monolingual",
  "monolit",
  "monolitik",
  "monolog",
  "monoloyalitas",
  "monomania",
  "monomer",
  "monoploid",
  "monopoli",
  "monopolistik",
  "monopsoni",
  "monorel",
  "monosakarida",
  "monosem",
  "monosemantik",
  "monosemi",
  "monosilabel",
  "monosilabisme",
  "monosit",
  "monospermi",
  "monoteis",
  "monoteisme",
  "monotipe",
  "monoton",
  "monsinyur",
  "monster",
  "monstera",
  "monsun",
  "montase",
  "montering",
  "montir",
  "montit",
  "montok",
  "monumen",
  "monumental",
  "monyet",
  "monyong",
  "monyos",
  "mop",
  "mopela",
  "mopit",
  "morak",
  "moral",
  "moralis",
  "moralisasi",
  "moralisme",
  "moralistis",
  "moralitas",
  "morat-marit",
  "moratorium",
  "morbiditas",
  "morbili",
  "mordan",
  "moreng",
  "mores",
  "morf",
  "morfem",
  "morfemik",
  "morfemis",
  "morfin",
  "morfinis",
  "morfofonem",
  "morfofonemik",
  "morfofonemis",
  "morfofonologi",
  "morfogenesis",
  "morfologi",
  "mori",
  "moril",
  "mormon",
  "moron",
  "morong",
  "morse",
  "mortalitas",
  "mortar",
  "mortir",
  "mosaik",
  "mosi",
  "mosok",
  "moster",
  "mota",
  "motel",
  "motif",
  "motivasi",
  "motivator",
  "moto",
  "motor",
  "motorik",
  "motoris",
  "motorisasi",
  "motorsaikel",
  "moyang",
  "mozah",
  "mozaik",
  "mu",
  "mua",
  "muadin",
  "muai",
  "muak",
  "muakadah",
  "mual",
  "mualaf",
  "mualamat",
  "mualif",
  "mualim",
  "muamalah",
  "muamalat",
  "muanas",
  "muara",
  "muarikh",
  "muas",
  "muasasah",
  "muasir",
  "muat",
  "muazam",
  "muazin",
  "mubah",
  "mubalig",
  "mubaligah",
  "mubarak",
  "mubarat",
  "mubazir",
  "mubtadi",
  "mubut",
  "mucikari",
  "mud",
  "muda",
  "mudah",
  "mudakar",
  "mudarabah",
  "mudarat",
  "mudasir",
  "mudat",
  "mudigah",
  "mudik",
  "mudra",
  "mudun",
  "mufaham",
  "mufakat",
  "mufarik",
  "mufasal",
  "mufasir",
  "muflis",
  "mufrad",
  "mufsidin",
  "mufti",
  "mugabat",
  "muhabah",
  "muhadarah",
  "muhadat",
  "muhajat",
  "muhajir",
  "muhajirin",
  "muhal",
  "muhalil",
  "muhami",
  "muhammad",
  "muharam",
  "muhasabah",
  "muhib",
  "muhibah",
  "muhit",
  "muhlikah",
  "muhrim",
  "muhsin",
  "muhtasyam",
  "muih",
  "mujadalah",
  "mujadid",
  "mujahadat",
  "mujahid",
  "mujahidin",
  "mujair",
  "mujang",
  "mujarab",
  "mujarad",
  "mujari",
  "mujbir",
  "mujtahid",
  "mujtamak",
  "mujur",
  "muk",
  "muka",
  "mukabalah",
  "mukadam",
  "mukadas",
  "mukadim",
  "mukadimah",
  "mukadin",
  "mukadis",
  "mukah",
  "mukalaf",
  "mukalid",
  "mukaram",
  "mukatabah",
  "mukena",
  "mukhabarah",
  "mukhalaf",
  "mukhalafah",
  "mukhalif",
  "mukhalis",
  "mukhlis",
  "mukhtasar",
  "mukibat",
  "mukim",
  "mukimin",
  "mukjizat",
  "mukmin",
  "mukminat",
  "mukminin",
  "mukoprotein",
  "mukosa",
  "mukositis",
  "muktabar",
  "muktamad",
  "muktamar",
  "muktamirin",
  "muktazilah",
  "mukun",
  "mula",
  "mulai",
  "mulakat",
  "mulamasah",
  "mulas",
  "mulat",
  "mulato",
  "mulazamah",
  "mulhid",
  "mulia",
  "mullah",
  "mulsa",
  "multazam",
  "multibahasa",
  "multidimensi",
  "multidisipliner",
  "multietnik",
  "multifaset",
  "multifungsi",
  "multigravida",
  "multiguna",
  "multikompleks",
  "multikrisis",
  "multikultur",
  "multikulturalisme",
  "multilateral",
  "multilingual",
  "multilingualisme",
  "multimedia",
  "multimeter",
  "multimilioner",
  "multinasional",
  "multinegara",
  "multiorgan",
  "multipara",
  "multipel",
  "multipleks",
  "multiplikasi",
  "multiplikator",
  "multipolar",
  "multiprosesor",
  "multirasial",
  "multirasialisme",
  "multiseluler",
  "multivalen",
  "multivalensi",
  "multivitamin",
  "muluk",
  "mulur",
  "mulus",
  "mulut",
  "mumayiz",
  "mumbang",
  "mumbul",
  "mumbung",
  "mumet",
  "mumi",
  "mumifikasi",
  "mumpung",
  "mumpuni",
  "mumuk",
  "mumur",
  "mumut",
  "munafik",
  "munafikin",
  "munajat",
  "munajim",
  "munasabah",
  "muncang",
  "munci",
  "muncikari",
  "muncrat",
  "muncul",
  "muncus",
  "mundam",
  "munding",
  "mundu",
  "mundur",
  "mung",
  "munggu",
  "munggur",
  "mungil",
  "mungkar",
  "mungkin",
  "mungkir",
  "mungkum",
  "mungkur",
  "mungmung",
  "mungsi",
  "mungut",
  "munib",
  "munjung",
  "muno",
  "munsyi",
  "muntaber",
  "muntah",
  "muntaha",
  "muntu",
  "muntul",
  "muntup",
  "munyuk",
  "muon",
  "mupaham",
  "muparik",
  "mupus",
  "mur",
  "mura",
  "murad",
  "muradif",
  "murah",
  "murai",
  "murakab",
  "murakabi",
  "mural",
  "muram",
  "murang",
  "muras",
  "murba",
  "murbei",
  "murca",
  "muri",
  "murid",
  "muring",
  "muris",
  "murka",
  "murni",
  "mursal",
  "mursyid",
  "murtad",
  "muruah",
  "murung",
  "murup",
  "murus",
  "mus",
  "musaadah",
  "musabab",
  "musabaqah",
  "musafir",
  "musafirin",
  "musakat",
  "musala",
  "musang",
  "musara",
  "museolog",
  "museologi",
  "museum",
  "mushaf",
  "musibah",
  "musik",
  "musikal",
  "musikalisasi",
  "musikalitas",
  "musikolog",
  "musikologi",
  "musikologis",
  "musikus",
  "musim",
  "musisi",
  "muskil",
  "muskovit",
  "muslih",
  "muslihat",
  "muslim",
  "muslimat",
  "muslimin",
  "muslin",
  "musnah",
  "muspra",
  "mustahak",
  "mustahik",
  "mustahil",
  "mustaid",
  "mustajab",
  "mustak",
  "mustaka",
  "mustakim",
  "mustamik",
  "mustang",
  "musuh",
  "musyarakah",
  "musyarakat",
  "musyarik",
  "musyawarah",
  "musyawarat",
  "musyrik",
  "musyrikin",
  "musytak",
  "musytari",
  "mutabar",
  "mutagen",
  "mutah",
  "mutakadim",
  "mutakalim",
  "mutakhir",
  "mutaki",
  "mutalaah",
  "mutamad",
  "mutan",
  "mutasawif",
  "mutasi",
  "mutawif",
  "mute",
  "mutiara",
  "mutih",
  "mutilasi",
  "mutisme",
  "mutlak",
  "mutmainah",
  "mutu",
  "mutualisme",
  "mutung",
  "muwafakat",
  "muwahid",
  "muwajahah",
  "muwakal",
  "muwakil",
  "muwari",
  "muzah",
  "muzakar",
  "muzakarah",
  "muzaki",
  "muzamil",
  "muzawir",
  "muzhab",
  "naam",
  "nabatah",
  "nabati",
  "nabi",
  "nabtun",
  "nabu",
  "nada",
  "nadi",
  "nadim",
  "nadir",
  "naf",
  "nafar",
  "nafas",
  "nafi",
  "nafiri",
  "nafkah",
  "nafsi",
  "nafsu",
  "nafta",
  "naftal",
  "naftalena",
  "naftena",
  "naftol",
  "naga",
  "nagam",
  "nagara",
  "nagari",
  "nagasari",
  "nahak",
  "nahas",
  "nahdiyin",
  "nahi",
  "nahkoda",
  "nahu",
  "naib",
  "naif",
  "naik",
  "naim",
  "najam",
  "najasah",
  "najasat",
  "najis",
  "nak",
  "naka",
  "nakal",
  "nakara",
  "nakhoda",
  "nal",
  "nala",
  "nalam",
  "nalar",
  "nali",
  "nalih",
  "naluri",
  "naluriah",
  "nama",
  "namaskara",
  "namatad",
  "namatium",
  "nambi",
  "namnam",
  "nampan",
  "namun",
  "nan",
  "nanah",
  "nanang",
  "nanap",
  "nanaplankton",
  "nanar",
  "nanas",
  "nandu",
  "nandung",
  "nang",
  "nangka",
  "nangkoda",
  "nangkring",
  "nangui",
  "naning",
  "nanofarad",
  "nanofosil",
  "nanogram",
  "nanometer",
  "nanti",
  "napal",
  "napalm",
  "napas",
  "napuh",
  "naqal",
  "naqli",
  "nara",
  "narablog",
  "narapati",
  "narapidana",
  "narapraja",
  "narasi",
  "narasumber",
  "naratif",
  "narator",
  "narkolepsi",
  "narkomaniak",
  "narkose",
  "narkosis",
  "narkotik",
  "narpati",
  "narsis",
  "narsisisme",
  "narsisme",
  "narwastu",
  "nas",
  "nasab",
  "nasabah",
  "nasakh",
  "nasal",
  "nasalisasi",
  "nasar",
  "nasehat",
  "nasel",
  "nasi",
  "nasib",
  "nasihat",
  "nasion",
  "nasional",
  "nasionalis",
  "nasionalisasi",
  "nasionalisme",
  "nasionalistis",
  "nasionisme",
  "naskah",
  "nasofaring",
  "nasrani",
  "nasti",
  "nasut",
  "natal",
  "natalis",
  "natalitas",
  "natang",
  "natar",
  "natijah",
  "nativis",
  "nativisme",
  "nativistik",
  "natolokal",
  "natrium",
  "natur",
  "natura",
  "natural",
  "naturalis",
  "naturalisasi",
  "naturalisme",
  "naturalistis",
  "naturopatis",
  "naung",
  "nauplius",
  "nausea",
  "nautik",
  "nautika",
  "nautikal",
  "nautilus",
  "nauzubillah",
  "navigasi",
  "navigator",
  "nawa",
  "nawaitu",
  "nawala",
  "nawalapradata",
  "nayaka",
  "nayam",
  "nayap",
  "nazam",
  "nazar",
  "nazi",
  "naziisme",
  "nazim",
  "nazir",
  "ndoro",
  "ndoroisme",
  "neala",
  "nealogi",
  "nebeng",
  "nebula",
  "nebulium",
  "neces",
  "necis",
  "nefoskop",
  "nefrektomi",
  "nefridium",
  "nefrit",
  "nefritis",
  "nefroblastoma",
  "nefrologi",
  "nefron",
  "nefrosis",
  "negara",
  "negasi",
  "negatif",
  "negativisme",
  "negativistik",
  "neger",
  "negeri",
  "negosi",
  "negosiasi",
  "negosiator",
  "negrito",
  "negro",
  "negroid",
  "negus",
  "neka",
  "nekad",
  "nekara",
  "nekat",
  "nekel",
  "neko",
  "nekrofag",
  "nekrofagus",
  "nekrofili",
  "nekrofilia",
  "nekrogeografi",
  "nekrolog",
  "nekrologi",
  "nekromansi",
  "nekropolis",
  "nekropsi",
  "nekrosis",
  "neksus",
  "nektar",
  "nelangsa",
  "nelayan",
  "nemagon",
  "nematoda",
  "nematologi",
  "nematosida",
  "nematosis",
  "nenda",
  "nendatan",
  "nenek",
  "nenekanda",
  "nenen",
  "nenenda",
  "nener",
  "nenes",
  "neng",
  "neodarwinisme",
  "neodimium",
  "neofeodalisme",
  "neofeodalistis",
  "neoiknologi",
  "neoimpresionisme",
  "neokarpi",
  "neoklasik",
  "neoklasisisme",
  "neoklasisme",
  "neokolonialisme",
  "neoliberalisme",
  "neolit",
  "neolitik",
  "neolitikum",
  "neologi",
  "neologisme",
  "neolokal",
  "neon",
  "neonatal",
  "neonatus",
  "neontologi",
  "neoplasma",
  "neoplatonisme",
  "neoprena",
  "neositosis",
  "neotipologi",
  "neovirus",
  "neozoikum",
  "nepotis",
  "nepotisme",
  "neptunium",
  "neptunus",
  "neraca",
  "nerak",
  "neraka",
  "neritik",
  "neritopelagik",
  "neritoplankton",
  "neroglia",
  "nervasi",
  "nervur",
  "nesa",
  "nestapa",
  "nestor",
  "net",
  "neting",
  "neto",
  "netra",
  "netral",
  "netralis",
  "netralisasi",
  "netralisme",
  "netralitas",
  "neural",
  "neuralgia",
  "neurastenia",
  "neuritis",
  "neuroblastoma",
  "neuroglia",
  "neurolinguistik",
  "neurolog",
  "neurologi",
  "neurologis",
  "neuron",
  "neurosis",
  "neurotik",
  "neurotransmiter",
  "neustonologi",
  "neutrino",
  "neutron",
  "newton",
  "ngabei",
  "ngaben",
  "ngablak",
  "ngabur",
  "ngakngikngok",
  "ngalau",
  "ngalor-ngidul",
  "nganga",
  "ngap-ngap",
  "ngapain",
  "ngarai",
  "ngeang",
  "ngebet",
  "ngebut",
  "ngeceng",
  "ngeden",
  "ngedumel",
  "ngelindur",
  "ngemil",
  "ngenas",
  "ngengat",
  "ngenyek",
  "ngeong",
  "ngeres",
  "ngeri",
  "ngiang",
  "ngilu",
  "ngoko",
  "ngos-ngosan",
  "ngot-ngotan",
  "ngowos",
  "ngoyo",
  "ngung",
  "nia",
  "niaga",
  "nian",
  "niasin",
  "niat",
  "nibung",
  "nica",
  "nidasi",
  "nidera",
  "nidikola",
  "nidulus",
  "nifak",
  "nifas",
  "nih",
  "nihil",
  "nihilis",
  "nihilisme",
  "nijas",
  "nik",
  "nikah",
  "nikel",
  "nikmat",
  "nikotin",
  "niktigami",
  "nila",
  "nilai",
  "nilakandi",
  "nilam",
  "nilau",
  "nilon",
  "nimbostratus",
  "nimbrung",
  "nimfomania",
  "ninabobo",
  "ning",
  "ningnong",
  "ningrat",
  "nini",
  "ninik",
  "ninitowok",
  "niobium",
  "nipah",
  "nipis",
  "nira",
  "niraksara",
  "nirgagasan",
  "nirgesekan",
  "nirguna",
  "nirkabel",
  "nirlaba",
  "nirleka",
  "nirmala",
  "nirselera",
  "nirwana",
  "nirwarta",
  "nisab",
  "nisan",
  "nisbah",
  "nisbi",
  "niscaya",
  "niskala",
  "nista",
  "nistagmus",
  "nistatin",
  "nitrat",
  "nitrifikasi",
  "nitrobenzena",
  "nitrofili",
  "nitrofit",
  "nitrogen",
  "nitrogliserin",
  "nitroselulosa",
  "niyaga",
  "noa",
  "nobat",
  "nobelium",
  "noda",
  "nodulus",
  "nodus",
  "noem",
  "noja",
  "noken",
  "noktah",
  "nokturia",
  "nokturnal",
  "nol",
  "nomad",
  "nomenklatur",
  "nomina",
  "nominal",
  "nominalisasi",
  "nominalisme",
  "nominasi",
  "nominatif",
  "nominator",
  "nomine",
  "nomogram",
  "nomokrasi",
  "nomor",
  "nomplok",
  "non",
  "nona",
  "nonagresi",
  "nonaktif",
  "nonblok",
  "nondepartemen",
  "nondepartemental",
  "none",
  "nonekonomi",
  "noneksakta",
  "nonfiksi",
  "nonformal",
  "nong-nong",
  "nongol",
  "nongrata",
  "nonhistoris",
  "noni",
  "nonilium",
  "nonindustri",
  "nonintervensi",
  "nonius",
  "nonkimia",
  "nonkombatan",
  "nonkonvensional",
  "nonkooperasi",
  "nonkooperatif",
  "nonmedis",
  "nonmigas",
  "nonmiliter",
  "nonok",
  "nonol",
  "nonong",
  "nonpatogenik",
  "nonpemerintah",
  "nonpolitik",
  "nonpredikatif",
  "nonpribumi",
  "nonproduktif",
  "nonprofit",
  "nonprotein",
  "nonsens",
  "nonsilabis",
  "nonstandar",
  "nonstop",
  "nonteknis",
  "nontradisional",
  "nonverbal",
  "nopek",
  "norak",
  "norit",
  "norma",
  "normal",
  "normalisasi",
  "normatif",
  "nosologi",
  "nostalgia",
  "nostrum",
  "not",
  "nota",
  "notabene",
  "notariat",
  "notaris",
  "notasi",
  "notes",
  "notifikasi",
  "notok",
  "notula",
  "notulis",
  "nova",
  "novel",
  "novela",
  "novelet",
  "novelis",
  "november",
  "novena",
  "novokaina",
  "nrima",
  "nuansa",
  "nubuat",
  "nudis",
  "nudisme",
  "nugat",
  "nugraha",
  "nujum",
  "nukil",
  "nukleat",
  "nukleolus",
  "nukleon",
  "nukleoprotein",
  "nukleus",
  "nuklida",
  "nuklir",
  "nulipara",
  "numeralia",
  "numerik",
  "numeris",
  "numismatika",
  "nun",
  "nunatak",
  "nung",
  "nunsius",
  "nunut",
  "nur",
  "nuraga",
  "nurani",
  "nurbisa",
  "nuri",
  "nuriah",
  "nus",
  "nusa",
  "nusaindah",
  "nusakambangan",
  "nusantara",
  "nusyu",
  "nusyus",
  "nutan",
  "nutasi",
  "nutfah",
  "nutriea",
  "nutrisi",
  "nutrisionis",
  "nutrisisme",
  "nuzul",
  "nuzulul",
  "nyai",
  "nyak",
  "nyala",
  "nyalang",
  "nyalar",
  "nyalawadi",
  "nyale",
  "nyali",
  "nyaman",
  "nyambing",
  "nyamik",
  "nyamleng",
  "nyampang",
  "nyamplung",
  "nyamuk",
  "nyamur",
  "nyana",
  "nyang",
  "nyanya",
  "nyanyah",
  "nyanyang",
  "nyanyar",
  "nyanyi",
  "nyanyu",
  "nyanyuk",
  "nyapang",
  "nyapnyap",
  "nyarang",
  "nyarik",
  "nyaring",
  "nyaris",
  "nyata",
  "nyatuh",
  "nyawa",
  "nyawang",
  "nyelekit",
  "nyemplong",
  "nyentrik",
  "nyenyai",
  "nyenyak",
  "nyenyat",
  "nyenyeh",
  "nyenyep",
  "nyenyet",
  "nyepi",
  "nyeri",
  "nyerocos",
  "nyi",
  "nyilih",
  "nyingnying",
  "nyinyir",
  "nyiri",
  "nyiru",
  "nyit",
  "nyiur",
  "nyolnyolan",
  "nyolo",
  "nyoman",
  "nyong",
  "nyonya",
  "nyonyeh",
  "nyonyong",
  "nyonyor",
  "nyungsung",
  "nyunyut",
  "nyureng",
  "nyut",
  "oase",
  "oasis",
  "obar",
  "obat",
  "obduksi",
  "obelisk",
  "obeng",
  "obesitas",
  "obi",
  "obituarium",
  "objek",
  "objektif",
  "objektivisme",
  "objektivitas",
  "oblak",
  "oblasi",
  "obligasi",
  "oblong",
  "obo",
  "obor",
  "obral",
  "obras",
  "obrol",
  "obrus",
  "observasi",
  "observatorium",
  "obsesi",
  "obsesif",
  "obsidian",
  "obsolet",
  "obstetri",
  "obstruen",
  "obstruksi",
  "obversi",
  "obviatif",
  "obyek",
  "obyektif",
  "obyektivisme",
  "obyektivitas",
  "oceh",
  "odalan",
  "ode",
  "odekolonye",
  "odinometer",
  "oditur",
  "odoh",
  "odol",
  "odometer",
  "odontoblas",
  "odontoid",
  "odontologi",
  "odoran",
  "oedipus-kompleks",
  "oersted",
  "ofensif",
  "oferte",
  "ofisial",
  "ofset",
  "oftalmia",
  "oftalmoskop",
  "oga",
  "ogah",
  "ogah-agih",
  "ogak-agik",
  "ogak-ogak",
  "ogam",
  "ogel",
  "ogok",
  "ogonium",
  "ohm",
  "ohmmeter",
  "oikumene",
  "oja",
  "ojeg",
  "ojek",
  "ojok",
  "okarina",
  "oke",
  "oker",
  "oklokrasi",
  "oklusi",
  "oklusif",
  "oknum",
  "okok",
  "oksalat",
  "oksiasetilena",
  "oksida",
  "oksidan",
  "oksidasi",
  "oksidator",
  "oksigen",
  "oksigenase",
  "oksimoron",
  "oksitetrasiklin",
  "oksiton",
  "oktaf",
  "oktagon",
  "oktahedron",
  "oktal",
  "oktana",
  "oktet",
  "oktober",
  "oktroi",
  "okulasi",
  "okuler",
  "okulis",
  "okultis",
  "okultisme",
  "okupasi",
  "okupasional",
  "olah",
  "olahraga",
  "olak",
  "olak-alik",
  "olanda",
  "olang-aling",
  "oleander",
  "olefin",
  "oleh",
  "olek",
  "oleng",
  "oleografi",
  "oleometer",
  "oleovitamin",
  "oles",
  "olet",
  "oleum",
  "oli",
  "olia",
  "oligarki",
  "oligofagus",
  "oligofrenia",
  "oligopoli",
  "oligopolistis",
  "oligopsoni",
  "oligosen",
  "oligositemia",
  "oligotrofik",
  "oliman",
  "olimpiade",
  "oliva",
  "olivin",
  "olok",
  "olong-olong",
  "om",
  "oma",
  "ombak",
  "ombang-ambing",
  "ombyok",
  "omega",
  "omel",
  "omikron",
  "omnibus",
  "omnivor",
  "omnivora",
  "omong",
  "ompol",
  "ompong",
  "ompreng",
  "omprong",
  "ompu",
  "omset",
  "omslah",
  "omzet",
  "onagata",
  "onak",
  "onani",
  "onar",
  "oncat",
  "once",
  "oncek",
  "oncen",
  "oncer",
  "oncom",
  "oncor",
  "onde-onde",
  "ondel-ondel",
  "onder",
  "onderdil",
  "onderdistrik",
  "onderneming",
  "onderok",
  "ondo",
  "ondoafi",
  "ondok",
  "ondos",
  "oneng-oneng",
  "ong",
  "ongahangih",
  "ongeh",
  "onggok",
  "ongji",
  "ongkang",
  "ongkok",
  "ongkos",
  "ongok",
  "ongol-ongol",
  "oniks",
  "onkogen",
  "onkologi",
  "onomasiologi",
  "onomastika",
  "onomatologi",
  "onomatope",
  "ons",
  "onslah",
  "ontogeni",
  "ontologi",
  "ontologis",
  "ontran-ontran",
  "onyah-anyih",
  "onyak-anyik",
  "onyang",
  "onyok",
  "onyot",
  "oogenesis",
  "oolit",
  "opa",
  "opak",
  "opak-apik",
  "opal",
  "opalesen",
  "opas",
  "opasitas",
  "opelet",
  "open",
  "opendim",
  "openkap",
  "oper",
  "opera",
  "operasi",
  "operasional",
  "operasionalisasi",
  "operatif",
  "operator",
  "operet",
  "operkulum",
  "opini",
  "opisometer",
  "opium",
  "oplah",
  "oplet",
  "oplos",
  "opmak",
  "opname",
  "oponen",
  "opor",
  "oportunis",
  "oportunisme",
  "oportunistis",
  "oportunitas",
  "oposan",
  "oposisi",
  "oppo",
  "opsen",
  "opseter",
  "opsi",
  "opsin",
  "opsinder",
  "opsiner",
  "opsional",
  "opsir",
  "opstal",
  "optatif",
  "optik",
  "optika",
  "optimal",
  "optimalisasi",
  "optimis",
  "optimisme",
  "optimistis",
  "optimum",
  "optis",
  "optisien",
  "optoelektronika",
  "optometri",
  "optometris",
  "opus",
  "orak",
  "orak-arik",
  "orakel",
  "oral",
  "oralit",
  "orang",
  "orang-aring",
  "oranye",
  "orasi",
  "orat-oret",
  "orator",
  "oratoria",
  "oratoris",
  "oratorium",
  "orbit",
  "orbita",
  "orbital",
  "orde",
  "order",
  "ordi",
  "ordinal",
  "ordinasi",
  "ordinat",
  "ordiner",
  "ordner",
  "ordo",
  "ordonans",
  "ordonansi",
  "oren",
  "oreng",
  "oreol",
  "oret",
  "organ",
  "organdi",
  "organel",
  "organik",
  "organis",
  "organisasi",
  "organisator",
  "organisatoris",
  "organisir",
  "organisme",
  "organismus",
  "organogram",
  "organon",
  "orgasme",
  "orgasmik",
  "orgel",
  "orien",
  "oriental",
  "orientalis",
  "orientasi",
  "origami",
  "orion",
  "orisinal",
  "orisinalitas",
  "orkes",
  "orkestra",
  "orkestrasi",
  "ornamen",
  "ornamental",
  "ornamentasi",
  "ornitologi",
  "ornitologis",
  "ornitosis",
  "orografi",
  "orografik",
  "orografis",
  "orok",
  "orong-orong",
  "ortodidaktik",
  "ortodoks",
  "ortodoksi",
  "ortodrom",
  "ortoepi",
  "ortografi",
  "ortografis",
  "ortoklas",
  "ortopedagogik",
  "ortopedi",
  "ortopedis",
  "ose",
  "osean",
  "oseanarium",
  "oseanografi",
  "oseanologi",
  "osifikasi",
  "osikel",
  "osilasi",
  "osilator",
  "osilograf",
  "osilogram",
  "osiloskop",
  "oskilator",
  "oskulum",
  "osmium",
  "osmometer",
  "osmoregulasi",
  "osmose",
  "osmosis",
  "osomosis",
  "ostentasi",
  "osteoblas",
  "osteoklas",
  "osteologi",
  "osteopati",
  "osteoporosis",
  "ostium",
  "otak",
  "otak-atik",
  "otak-otak",
  "otar",
  "otek",
  "otentik",
  "oto",
  "otobus",
  "otofon",
  "otologi",
  "otomat",
  "otomatis",
  "otomatisasi",
  "otomobil",
  "otomotif",
  "otonom",
  "otonomi",
  "otopet",
  "otorisasi",
  "otoritas",
  "otoriter",
  "otoritet",
  "otoskop",
  "otot",
  "ototipi",
  "oval",
  "ovarium",
  "ovasi",
  "oven",
  "over",
  "overaktif",
  "overakting",
  "overal",
  "overdosis",
  "overkompensasi",
  "overpopulasi",
  "overproduksi",
  "oversimplifikasi",
  "overste",
  "oviduk",
  "ovipar",
  "oviparitas",
  "ovipositor",
  "ovitesis",
  "ovovivipar",
  "ovulasi",
  "ovulum",
  "ovum",
  "oyak",
  "oyek",
  "oyok",
  "oyong",
  "oyot",
  "ozokerit",
  "ozon",
  "ozonisasi",
  "ozonisator",
  "ozonometer",
  "pabean",
  "pabrik",
  "pabrikan",
  "pabrikasi",
  "pacai",
  "pacak",
  "pacal",
  "pacangan",
  "pacar",
  "pacat",
  "pacau",
  "pace",
  "pacek",
  "paceklik",
  "pacet",
  "pacih",
  "pacik",
  "pacok",
  "pacu",
  "pacuk",
  "pacul",
  "pada",
  "padah",
  "padahal",
  "padak",
  "padam",
  "padan",
  "padang",
  "padas",
  "padasan",
  "padat",
  "padepokan",
  "padi",
  "padma",
  "padmasana",
  "padmi",
  "padri",
  "padu",
  "padudan",
  "paduk",
  "paduka",
  "paduraksa",
  "paedofil",
  "paes",
  "pagan",
  "paganisme",
  "pagar",
  "pagas",
  "pagebluk",
  "pagelaran",
  "pagi",
  "pagina",
  "pagoda",
  "pagon",
  "pagositosis",
  "pagu",
  "pagun",
  "pagupon",
  "pagut",
  "paguyuban",
  "pah",
  "paha",
  "pahala",
  "paham",
  "pahang",
  "pahar",
  "pahat",
  "paheman",
  "pahit",
  "pahlawan",
  "pahter",
  "pai",
  "paidon",
  "pail",
  "pailit",
  "paing",
  "paip",
  "pair",
  "pais",
  "paitua",
  "paja",
  "pajak",
  "pajan",
  "pajang",
  "pajuan",
  "pajuh",
  "pakai",
  "pakal",
  "pakan",
  "pakanira",
  "pakansi",
  "pakar",
  "pakaryan",
  "pakat",
  "pakau",
  "pakcik",
  "pakde",
  "pakem",
  "paket",
  "pakihang",
  "pakihi",
  "paking",
  "pakis",
  "paklik",
  "pakma",
  "pakpui",
  "pakpung",
  "paksa",
  "paksi",
  "paksina",
  "pakta",
  "pakter",
  "paku",
  "pakuh",
  "pakuk",
  "pakuncen",
  "pakus",
  "pal",
  "pala",
  "paladium",
  "palagan",
  "palai",
  "palak",
  "palaka",
  "palam",
  "palamarta",
  "palang",
  "palapa",
  "palar",
  "palari",
  "palas",
  "palasik",
  "palat",
  "palatabilitas",
  "palatal",
  "palatalisasi",
  "palatografi",
  "palatogram",
  "palatum",
  "palau",
  "palawa",
  "palawija",
  "paldu",
  "pale",
  "palem",
  "palen",
  "paleoantropologi",
  "paleobotani",
  "paleoekologi",
  "paleogeografi",
  "paleografi",
  "paleografis",
  "paleoklimatologi",
  "paleolitik",
  "paleolitikum",
  "paleontologi",
  "paleosen",
  "paleozoikum",
  "pales",
  "palet",
  "pali",
  "paliatif",
  "paliatip",
  "palindrom",
  "paling",
  "palinologi",
  "palis",
  "palit",
  "palka",
  "pallawa",
  "palmarosa",
  "palmin",
  "palmistri",
  "palmit",
  "palmitat",
  "palolo",
  "palpasi",
  "palsu",
  "paltu",
  "palu",
  "paluh",
  "palun",
  "palung",
  "palut",
  "pamah",
  "paman",
  "pameget",
  "pamer",
  "pamflet",
  "pamit",
  "pamong",
  "pamor",
  "pampa",
  "pampan",
  "pampang",
  "pampas",
  "pampat",
  "pamper",
  "pampiniform",
  "pamrih",
  "pamungkas",
  "pan",
  "pana",
  "panah",
  "panai",
  "panakawan",
  "panar",
  "panas",
  "panasea",
  "panau",
  "panca",
  "pancabicara",
  "pancabuta",
  "pancacita",
  "pancadarma",
  "pancaindera",
  "pancaindra",
  "pancaka",
  "pancakara",
  "pancakembar",
  "pancal",
  "pancalima",
  "pancalogam",
  "pancalomba",
  "pancalongok",
  "pancamarga",
  "pancamuka",
  "pancang",
  "pancaniti",
  "pancapersada",
  "pancar",
  "pancaragam",
  "pancarajadiraja",
  "pancaroba",
  "pancarona",
  "pancasila",
  "pancasilais",
  "pancasona",
  "pancasuara",
  "pancasuda",
  "pancausaha",
  "pancawalikrama",
  "pancawara",
  "pancawarna",
  "pancawarsa",
  "panci",
  "pancing",
  "pancir",
  "pancit",
  "panco",
  "pancong",
  "pancung",
  "pancur",
  "pancut",
  "pandai",
  "pandak",
  "pandam",
  "pandan",
  "pandang",
  "pandau",
  "pandawa",
  "pandega",
  "pandemi",
  "pandemik",
  "pandialektal",
  "pandir",
  "pandit",
  "pandom",
  "pandu",
  "panekuk",
  "panel",
  "panelis",
  "panembahan",
  "panembrama",
  "panen",
  "panewu",
  "pangabekti",
  "pangah",
  "pangan",
  "pangeran",
  "pangestu",
  "panggak",
  "panggal",
  "panggang",
  "panggar",
  "panggau",
  "panggih",
  "panggil",
  "panggon",
  "panggu",
  "panggul",
  "panggung",
  "pangkah",
  "pangkai",
  "pangkal",
  "pangkas",
  "pangkat",
  "pangkek",
  "pangkin",
  "pangking",
  "pangkon",
  "pangku",
  "pangkung",
  "pangkur",
  "panglima",
  "pangling",
  "panglong",
  "pangolat",
  "pangonan",
  "pangpet",
  "pangpung",
  "pangreh",
  "pangrehpraja",
  "pangrukti",
  "pangsa",
  "pangsek",
  "pangsi",
  "pangsit",
  "panguk",
  "pangur",
  "pangus",
  "panik",
  "paniki",
  "panil",
  "panili",
  "paninggil",
  "paningset",
  "panir",
  "paniradia",
  "panitera",
  "panitia",
  "panja",
  "panjak",
  "panjang",
  "panjar",
  "panjarwala",
  "panjat",
  "panjer",
  "panji",
  "panjing",
  "panjul",
  "panjunan",
  "panjut",
  "pankreas",
  "pankromatis",
  "pankronis",
  "panlektal",
  "panleukapema",
  "panleukopenia",
  "panoptikum",
  "panorama",
  "panser",
  "pantai",
  "pantak",
  "pantalon",
  "pantang",
  "pantar",
  "pantas",
  "pantat",
  "pantau",
  "panteis",
  "panteisme",
  "panteistis",
  "pantek",
  "pantekosta",
  "panteon",
  "panter",
  "panti",
  "pantik",
  "panting",
  "pantis",
  "panto",
  "pantofel",
  "pantograf",
  "pantomim",
  "pantri",
  "pantul",
  "pantun",
  "panus",
  "panutan",
  "panyembrama",
  "pao-pao",
  "papa",
  "papacang",
  "papah",
  "papain",
  "papak",
  "papakerma",
  "papan",
  "papar",
  "paparazi",
  "papas",
  "papat",
  "papatong",
  "papi",
  "papil",
  "papila",
  "papirus",
  "papras",
  "paprika",
  "papui",
  "par",
  "para",
  "parab",
  "parabasis",
  "parabel",
  "parabiosis",
  "parabola",
  "paradam",
  "parade",
  "paradigma",
  "paradigmatis",
  "paradiso",
  "paradoks",
  "paradoksal",
  "parados",
  "paraf",
  "parafasia",
  "parafemia",
  "parafin",
  "parafrasa",
  "parafrase",
  "parafrenia",
  "paragaster",
  "paragog",
  "paragon",
  "paragraf",
  "parah",
  "parak",
  "paralaks",
  "paraldehida",
  "paralel",
  "paralelisasi",
  "paralelisme",
  "paralelogram",
  "paralgesia",
  "paralinguistik",
  "paralinguistis",
  "paralipsis",
  "paralisis",
  "paralitis",
  "param",
  "paramaarta",
  "paramarta",
  "paramasastra",
  "paramedis",
  "paramen",
  "parameter",
  "paramiliter",
  "parampara",
  "paran",
  "parang",
  "paranoia",
  "paranoid",
  "paranormal",
  "paranpara",
  "parap",
  "parapalatal",
  "parapati",
  "paraplasme",
  "paraplegia",
  "parapodium",
  "parapsikolog",
  "parapsikologi",
  "paras",
  "parasetamol",
  "parasintesis",
  "parasit",
  "parasitisme",
  "parasitoid",
  "parasitologi",
  "parasitoma",
  "parasitopolis",
  "parasut",
  "parasutis",
  "parataksis",
  "parataktis",
  "paratesis",
  "paratifus",
  "paratiroid",
  "parau",
  "pare",
  "parenial",
  "parenkim",
  "parental",
  "parentesis",
  "parestesia",
  "parewa",
  "parfum",
  "parga",
  "parhelion",
  "pari",
  "paria",
  "parididimis",
  "parih",
  "parik",
  "parikan",
  "paring",
  "paripurna",
  "paris",
  "parit",
  "paritas",
  "pariwara",
  "pariwisata",
  "parji",
  "parka",
  "parket",
  "parkinson",
  "parkinsonisme",
  "parkir",
  "parkit",
  "parlemen",
  "parlementaria",
  "parlementarisme",
  "parlementer",
  "parmitu",
  "paro",
  "parodi",
  "paroki",
  "parokial",
  "parokialisme",
  "parolfaktori",
  "paron",
  "paronim",
  "paronisia",
  "paronomasia",
  "parotitis",
  "pars",
  "parser",
  "parsi",
  "parsial",
  "partai",
  "partenogenesis",
  "partial",
  "partikel",
  "partikelir",
  "partikularisme",
  "partisan",
  "partisi",
  "partisipan",
  "partisipasi",
  "partitif",
  "partitur",
  "partner",
  "partus",
  "paru",
  "paruh",
  "parun",
  "parut",
  "parvenu",
  "parwa",
  "pas",
  "pasah",
  "pasai",
  "pasak",
  "pasal",
  "pasang",
  "pasanggiri",
  "pasar",
  "pasara",
  "pasaraya",
  "pasase",
  "pasasir",
  "pasat",
  "pascabedah",
  "pascadoktoral",
  "pascajual",
  "pascakawin",
  "pascakrisis",
  "pascalahir",
  "pascalarva",
  "pascalikuidasi",
  "pascamodern",
  "pascamodernisme",
  "pascaoperasi",
  "pascapanen",
  "pascaperang",
  "pascaproduksi",
  "pascareformasi",
  "pascasarjana",
  "pascausaha",
  "pascayuwana",
  "paseban",
  "paser",
  "paset",
  "pasfoto",
  "pasi",
  "pasien",
  "pasif",
  "pasifikasi",
  "pasifisme",
  "pasigrafi",
  "pasik",
  "pasilan",
  "pasim",
  "pasimologi",
  "pasir",
  "pasirah",
  "pasit",
  "pasiva",
  "paskah",
  "pasmat",
  "pasmen",
  "pasok",
  "pasowan",
  "paspor",
  "pasrah",
  "pasta",
  "pastel",
  "pasteur",
  "pasteurisasi",
  "pasti",
  "pastiles",
  "pastor",
  "pastoral",
  "pastoran",
  "pastur",
  "pastura",
  "pasu",
  "pasuel",
  "pasuk",
  "pasumandan",
  "pasung",
  "patah",
  "pataka",
  "patam",
  "patang",
  "patar",
  "patek",
  "patela",
  "paten",
  "pater",
  "patera",
  "pateram",
  "paternalis",
  "paternalisme",
  "paternalistis",
  "patet",
  "patetis",
  "patgulipat",
  "pati",
  "patih",
  "patik",
  "patikim",
  "patil",
  "patin",
  "patina",
  "pating",
  "patio",
  "patirasa",
  "patiseri",
  "patka",
  "patogen",
  "patogenesis",
  "patogenik",
  "patois",
  "patok",
  "patokimia",
  "patol",
  "patola",
  "patolog",
  "patologi",
  "patologis",
  "patolopolis",
  "patos",
  "patra",
  "patrap",
  "patri",
  "patriark",
  "patriarkat",
  "patrilineal",
  "patrimonium",
  "patriot",
  "patriotik",
  "patriotisme",
  "patroli",
  "patron",
  "patronasi",
  "patrun",
  "patuh",
  "patuk",
  "patung",
  "patungan",
  "patut",
  "pauh",
  "pauhi",
  "pauk",
  "paul",
  "paun",
  "paung",
  "paus",
  "pause",
  "paut",
  "paviliun",
  "pawai",
  "pawak",
  "pawaka",
  "pawana",
  "pawang",
  "pawiyatan",
  "pawukon",
  "paya",
  "payah",
  "payang",
  "payar",
  "payau",
  "payet",
  "payon",
  "payu",
  "payudara",
  "payung",
  "peang",
  "pecah",
  "pecai",
  "pecak",
  "pecal",
  "pecara",
  "pecat",
  "pece",
  "pecel",
  "peci",
  "pecicilan",
  "pecinan",
  "pecok",
  "pecuk",
  "pecun",
  "pecut",
  "peda",
  "pedada",
  "pedadah",
  "pedagog",
  "pedagogi",
  "pedagogis",
  "pedak",
  "pedaka",
  "pedal",
  "pedanda",
  "pedang",
  "pedapa",
  "pedar",
  "pedas",
  "pedati",
  "pedel",
  "pedena",
  "pedendang",
  "pedengan",
  "pedepokan",
  "pedestrian",
  "pedet",
  "pedewakan",
  "pediatri",
  "pedih",
  "pedikur",
  "pedis",
  "pedisel",
  "pedogenesis",
  "pedok",
  "pedologi",
  "pedoman",
  "pedometer",
  "pedongkang",
  "pedot",
  "peduli",
  "pedunkel",
  "pedusi",
  "pedut",
  "pegagang",
  "pegah",
  "pegal",
  "pegan",
  "pegang",
  "pegar",
  "pegari",
  "pegas",
  "pegat",
  "pegawai",
  "pego",
  "pegoh",
  "pegon",
  "peguam",
  "pegun",
  "pehong",
  "pei",
  "pejajaran",
  "pejaka",
  "pejal",
  "pejam",
  "pejatian",
  "pejera",
  "pek",
  "peka",
  "pekaja",
  "pekak",
  "pekakak",
  "pekan",
  "pekarang",
  "pekasam",
  "pekaseh",
  "pekat",
  "pekatu",
  "pekatul",
  "pekau",
  "pekerti",
  "pekik",
  "peking",
  "pekir",
  "pekis",
  "pekiwan",
  "pekojan",
  "peksi",
  "pektik",
  "pektil",
  "pektin",
  "peku",
  "pekuk",
  "pekulun",
  "pekung",
  "pekur",
  "pel",
  "pelabi",
  "pelabur",
  "pelaga",
  "pelagas",
  "pelagis",
  "pelagra",
  "pelah",
  "pelak",
  "pelalah",
  "pelamin",
  "pelampang",
  "pelampung",
  "pelan",
  "pelana",
  "pelancar",
  "pelanduk",
  "pelang",
  "pelangai",
  "pelanggi",
  "pelangi",
  "pelangkin",
  "pelangpang",
  "pelantar",
  "pelanting",
  "pelas",
  "pelasah",
  "pelasik",
  "pelaspas",
  "pelasuh",
  "pelat",
  "pelata",
  "pelatuk",
  "pelawa",
  "pelayon",
  "pelbagai",
  "pelbak",
  "pelbet",
  "pelebat",
  "pelebaya",
  "pelebegu",
  "pelebon",
  "pelecet",
  "pelecok",
  "peleh",
  "pelek",
  "pelekat",
  "pelekok",
  "pelekuk",
  "pelembaya",
  "pelencit",
  "pelengak",
  "pelengan",
  "pelengset",
  "pelepah",
  "peles",
  "pelesat",
  "peleset",
  "pelesir",
  "pelesit",
  "pelet",
  "peletek",
  "peletik",
  "peleting",
  "peleton",
  "pelias",
  "pelihara",
  "pelik",
  "pelikan",
  "pelikel",
  "pelinggam",
  "pelinteng",
  "pelintir",
  "pelipir",
  "pelipis",
  "pelir",
  "pelisir",
  "pelisit",
  "pelit",
  "pelita",
  "pelitur",
  "pelo",
  "pelog",
  "peloh",
  "pelojok",
  "pelonco",
  "pelong",
  "pelopor",
  "pelor",
  "pelorot",
  "pelosok",
  "pelosot",
  "pelota",
  "pelotaris",
  "pelotot",
  "pelples",
  "pelpolisi",
  "pels",
  "peluang",
  "peluh",
  "peluit",
  "peluk",
  "peluluk",
  "pelulut",
  "pelumpung",
  "pelungpung",
  "pelupuh",
  "pelupuk",
  "peluru",
  "peluruh",
  "pelus",
  "pelvis",
  "pemair",
  "pemali",
  "pemarip",
  "pematah",
  "pematang",
  "pemayang",
  "pembarap",
  "pembayan",
  "pemendak",
  "pemeo",
  "pemetikan",
  "pemidang",
  "pemindang",
  "peminggir",
  "pempek",
  "pemuda",
  "pemudi",
  "pemuras",
  "pen",
  "pena",
  "penak",
  "penaka",
  "penalti",
  "penampan",
  "penampang",
  "penanggah",
  "penaram",
  "penasaran",
  "penat",
  "penatu",
  "penatua",
  "penca",
  "pencak",
  "pencalang",
  "pencar",
  "pencet",
  "pencil",
  "pencok",
  "pencong",
  "pencu",
  "pencut",
  "penda",
  "pendaga",
  "pendahan",
  "pendak",
  "pendam",
  "pendapa",
  "pendar",
  "pendaringan",
  "pendek",
  "pendekar",
  "pendet",
  "pendeta",
  "pending",
  "pendok",
  "pendongkok",
  "pendopo",
  "pendua",
  "penduk",
  "pendulum",
  "penembahan",
  "penes",
  "penetrasi",
  "penetron",
  "penewu",
  "pengalasan",
  "penganak",
  "penganan",
  "pengang",
  "pengantin",
  "pengap",
  "pengapuh",
  "pengar",
  "pengaruh",
  "pengat",
  "pengatu",
  "pengawinan",
  "pengeng",
  "pengerih",
  "pengga",
  "penggaga",
  "penggah",
  "penggal",
  "penggar",
  "penggawa",
  "penghulu",
  "pengin",
  "pengkal",
  "pengkar",
  "pengki",
  "pengkis",
  "pengkol",
  "pengkor",
  "pengos",
  "penguin",
  "pengulun",
  "peni",
  "peniaram",
  "pening",
  "peningset",
  "penis",
  "penisilin",
  "penisilinat",
  "penitensi",
  "peniti",
  "penjajap",
  "penjalin",
  "penjara",
  "penjaruman",
  "penjor",
  "penjuna",
  "penjura",
  "penjuru",
  "penmes",
  "penologi",
  "penomah",
  "pensi",
  "pensil",
  "pensiun",
  "pentagin",
  "pentagon",
  "pentagor",
  "pentagram",
  "pentahedron",
  "pental",
  "pentameter",
  "pentan",
  "pentana",
  "pentang",
  "pentar",
  "pentas",
  "pentatonik",
  "pentil",
  "pentilasi",
  "penting",
  "pentode",
  "pentol",
  "pentosa",
  "pentotal",
  "pentung",
  "penuh",
  "penyap",
  "penyek",
  "penyet",
  "penyok",
  "penyu",
  "peok",
  "peot",
  "pepagan",
  "pepah",
  "pepak",
  "pepaku",
  "peparu",
  "pepas",
  "pepat",
  "pepatah",
  "pepaya",
  "pepe",
  "pepek",
  "pepeling",
  "peper",
  "pepermin",
  "pepes",
  "pepet",
  "pepindan",
  "peplum",
  "pepsin",
  "pepsina",
  "pepsinogen",
  "peptida",
  "peptidase",
  "peptik",
  "pepton",
  "pepuju",
  "pepunden",
  "pepung",
  "peputut",
  "per",
  "pera",
  "perabot",
  "perabung",
  "perada",
  "peragat",
  "perah",
  "perahu",
  "perai",
  "peraji",
  "perak",
  "peraka",
  "peram",
  "perambut",
  "peran",
  "perancah",
  "perang",
  "perangah",
  "perangai",
  "peranggang",
  "peranggu",
  "peranggul",
  "perangin",
  "perangkap",
  "perangkat",
  "peranjat",
  "peranti",
  "peranye",
  "perap",
  "peras",
  "peras-perus",
  "perasat",
  "perasukan",
  "perat",
  "perata",
  "perawan",
  "perawas",
  "perawi",
  "perawis",
  "perbal",
  "perban",
  "perbani",
  "perbatin",
  "perbawa",
  "perbegu",
  "perbekel",
  "perca",
  "percaya",
  "percik",
  "percis",
  "percit",
  "percul",
  "percuma",
  "perdah",
  "perdana",
  "perdata",
  "perdeo",
  "perdikan",
  "perdom",
  "perdu",
  "pere",
  "peredus",
  "pereh",
  "perei",
  "perek",
  "perekik",
  "perempuan",
  "perencah",
  "perenggan",
  "perengkat",
  "perengus",
  "perengut",
  "perenial",
  "perenkum",
  "perenyak",
  "perenyuk",
  "perepat",
  "peres",
  "peresau",
  "peresih",
  "perestroika",
  "peretel",
  "perewa",
  "perfek",
  "perfeksi",
  "perfeksionis",
  "perfeksionisme",
  "perfektif",
  "perforasi",
  "perforator",
  "performa",
  "pergam",
  "pergat",
  "pergata",
  "pergedel",
  "pergi",
  "pergok",
  "pergol",
  "pergola",
  "perhati",
  "peri",
  "peria",
  "perian",
  "periang",
  "periantium",
  "peribahasa",
  "periboga",
  "peribudi",
  "peridi",
  "perifer",
  "periferal",
  "periferalis",
  "periferi",
  "perifiton",
  "perifrasa",
  "perifrase",
  "perifrastis",
  "perige",
  "perigel",
  "perigi",
  "perih",
  "perihal",
  "perihelion",
  "perikarditis",
  "perikardium",
  "perikemanusiaan",
  "perikondrium",
  "periksa",
  "perilaku",
  "perimbas",
  "perimeter",
  "perimisium",
  "perimpin",
  "perimping",
  "perinci",
  "perincit",
  "perineorium",
  "perineum",
  "perineurium",
  "pering",
  "peringgan",
  "peringgi",
  "peringgitan",
  "peringis",
  "peringkat",
  "perintah",
  "periodat",
  "periode",
  "periodik",
  "periodisasi",
  "periodonsium",
  "periodontium",
  "periorbita",
  "periosteum",
  "perirana",
  "perisa",
  "perisai",
  "periskop",
  "perispora",
  "peristalsis",
  "peristaltik",
  "peristerit",
  "peristiwa",
  "peristonium",
  "perit",
  "peritoneum",
  "peritonitis",
  "periuk",
  "perivaskuler",
  "perjaka",
  "perji",
  "perkakas",
  "perkale",
  "perkamen",
  "perkara",
  "perkasa",
  "perkedel",
  "perkelang",
  "perkolar",
  "perkolasi",
  "perkolator",
  "perkoler",
  "perkosa",
  "perkusi",
  "perkutut",
  "perlahan",
  "perlak",
  "perlambang",
  "perleng",
  "perlente",
  "perlenteh",
  "perli",
  "perlina",
  "perling",
  "perlintih",
  "perlip",
  "perlit",
  "perlop",
  "perlu",
  "perlup",
  "perlus",
  "permadani",
  "permai",
  "permaisuri",
  "permak",
  "permalin",
  "permana",
  "permanen",
  "permanganat",
  "permasan",
  "permata",
  "permeabel",
  "permeabilitas",
  "permen",
  "permil",
  "permisi",
  "permisif",
  "permutasi",
  "pernah",
  "pernak",
  "pernekel",
  "pernik",
  "pernikel",
  "pernis",
  "perogol",
  "perohong",
  "peroi",
  "peroksida",
  "peroksidase",
  "peroksisom",
  "peroksisoma",
  "peroman",
  "perompak",
  "peron",
  "peroneal",
  "peronyok",
  "perop",
  "perosok",
  "perosot",
  "perot",
  "perpatih",
  "perpetuasi",
  "perponding",
  "pers",
  "persada",
  "persangga",
  "persegi",
  "persekot",
  "persekusi",
  "persen",
  "persentase",
  "persentil",
  "persepsi",
  "perseptif",
  "perseptivitas",
  "persero",
  "persetan",
  "perseus",
  "perseverasi",
  "persih",
  "persik",
  "persil",
  "persis",
  "persisi",
  "perslah",
  "persneling",
  "person",
  "persona",
  "personal",
  "personalia",
  "personalisme",
  "personalitas",
  "personel",
  "personifikasi",
  "perspektif",
  "perspektivisme",
  "persuasi",
  "persuasif",
  "pertal",
  "pertama",
  "pertepel",
  "pertiwi",
  "pertua",
  "perturbasi",
  "pertusis",
  "peruak",
  "peruan",
  "peruang",
  "perubalsem",
  "perudang",
  "peruk",
  "perum",
  "perumpung",
  "perun",
  "perunggu",
  "perunjung",
  "perupuk",
  "perus",
  "perusi",
  "perut",
  "perversi",
  "perwara",
  "perwira",
  "pes",
  "pesa",
  "pesai",
  "pesak",
  "pesakin",
  "pesam",
  "pesan",
  "pesanggrahan",
  "pesantren",
  "pesara",
  "pesat",
  "pesawat",
  "pese",
  "peseh",
  "pesek",
  "peser",
  "pesero",
  "peset",
  "pesi",
  "pesiar",
  "pesimis",
  "pesimisme",
  "pesimistis",
  "pesing",
  "pesirah",
  "pesisir",
  "pesok",
  "pesolot",
  "pesona",
  "pesong",
  "pesta",
  "pestaka",
  "pestisida",
  "pestol",
  "pesuk",
  "pesut",
  "pet",
  "peta",
  "petah",
  "petai",
  "petak",
  "petaka",
  "petal",
  "petala",
  "petaling",
  "petam",
  "petamari",
  "petan",
  "petanen",
  "petang",
  "petaram",
  "petarang",
  "petarangan",
  "petaruan",
  "petas",
  "petatang-peteteng",
  "petatus",
  "petegian",
  "petek",
  "petel",
  "petenteng",
  "petepete",
  "peterana",
  "peterseli",
  "petes",
  "peti",
  "petia",
  "petik",
  "petikrah",
  "petikut",
  "petilan",
  "peting",
  "petinggi",
  "petiolus",
  "petir",
  "petis",
  "petisi",
  "petitih",
  "petitum",
  "petogram",
  "petola",
  "petopan",
  "petor",
  "petrodolar",
  "petrografi",
  "petrogram",
  "petrokimia",
  "petrol",
  "petrolatum",
  "petroleum",
  "petrologi",
  "petromaks",
  "petsai",
  "petuah",
  "petuding",
  "petuduh",
  "petuk",
  "petunia",
  "peturun",
  "petus",
  "petut",
  "pewaka",
  "pewat",
  "peyek",
  "peyorasi",
  "peyot",
  "phi",
  "piadah",
  "piagam",
  "piah",
  "piak",
  "pial",
  "piala",
  "pialang",
  "pialing",
  "pialu",
  "piama",
  "piang",
  "pianggang",
  "pianggu",
  "pianika",
  "pianis",
  "piano",
  "pianola",
  "piantan",
  "piara",
  "piarit",
  "pias",
  "piaster",
  "piat",
  "piatu",
  "piawai",
  "pica",
  "picah",
  "picik",
  "picing",
  "picis",
  "picit",
  "pico",
  "picu",
  "picung",
  "pidana",
  "pidato",
  "pidi",
  "piezoelektrik",
  "piezoelektrisitas",
  "piezometer",
  "pigmen",
  "pigmentasi",
  "pigmi",
  "pigura",
  "pihak",
  "pijah",
  "pijak",
  "pijar",
  "pijat",
  "pijin",
  "pijinasi",
  "pijit",
  "pika",
  "pikap",
  "pikat",
  "pikau",
  "pike",
  "piket",
  "pikir",
  "piknik",
  "piknometer",
  "pikofarad",
  "pikogram",
  "pikolo",
  "piktografi",
  "piktogram",
  "pikul",
  "pikun",
  "pikup",
  "pil",
  "pilah",
  "pilak",
  "pilang",
  "pilar",
  "pilas",
  "pilaster",
  "pilau",
  "pileh",
  "pilek",
  "pileren",
  "pilih",
  "pilin",
  "pilis",
  "pilon",
  "pilong",
  "pilorus",
  "pilositas",
  "pilot",
  "pilsener",
  "pilu",
  "pilus",
  "pimpel",
  "pimpin",
  "pimping",
  "pin",
  "pina-pina",
  "pinak",
  "pinang",
  "pinar",
  "pincang",
  "pincuk",
  "pincut",
  "pinda",
  "pindah",
  "pindai",
  "pindang",
  "pines",
  "pinga",
  "pingai",
  "pinggah",
  "pinggan",
  "pinggang",
  "pinggir",
  "pinggul",
  "pingit",
  "pingkal",
  "pingkau",
  "pingpong",
  "pingsan",
  "pingul",
  "pinis",
  "pinisepuh",
  "pinisi",
  "pinjal",
  "pinjam",
  "pinjung",
  "pinset",
  "pinta",
  "pintal",
  "pintan",
  "pintang",
  "pintar",
  "pintas",
  "pintil",
  "pintu",
  "pintur",
  "pinus",
  "piogenik",
  "pion",
  "pioner",
  "piong",
  "pionir",
  "pipa",
  "pipet",
  "pipi",
  "pipih",
  "pipil",
  "pipis",
  "pipit",
  "pir",
  "pirai",
  "piramid",
  "piramida",
  "piramidal",
  "pirang",
  "piranograf",
  "piranogram",
  "piranometer",
  "pirasat",
  "pirau",
  "pireksia",
  "pirektik",
  "piretrum",
  "pirian",
  "piriform",
  "pirik",
  "piring",
  "pirit",
  "pirofilit",
  "pirofobia",
  "piroksen",
  "pirolisis",
  "piromania",
  "pirometalurgi",
  "pirometer",
  "piroteknik",
  "pirsa",
  "piruet",
  "pirus",
  "pis",
  "pisah",
  "pisang",
  "pisau",
  "pises",
  "pisiformis",
  "pisik",
  "pisin",
  "pisit",
  "pisitan",
  "pisovonus",
  "pispot",
  "pistol",
  "pistom",
  "piston",
  "pisuh",
  "pit",
  "pita",
  "pitak",
  "pitam",
  "pitanggang",
  "pitar",
  "pitarah",
  "pitawat",
  "piting",
  "pitiriasis",
  "pitis",
  "pitometer",
  "piton",
  "pitot",
  "pitut",
  "piuh",
  "piung",
  "piut",
  "piutang",
  "pivot",
  "piwulang",
  "piyik",
  "piza",
  "plafon",
  "plagiarisme",
  "plagiat",
  "plagiator",
  "plagioklas",
  "plakat",
  "plaket",
  "plaksegel",
  "plamir",
  "plan",
  "planaria",
  "planel",
  "planet",
  "planetarium",
  "planetoid",
  "plang",
  "plangkan",
  "planimeter",
  "planimetri",
  "planing",
  "planisfer",
  "plankton",
  "plano",
  "planologi",
  "planologis",
  "planospora",
  "plantase",
  "planula",
  "plasenta",
  "plaser",
  "plasma",
  "plasmodium",
  "plasmosis",
  "plastid",
  "plastik",
  "plastin",
  "plastis",
  "plastisitas",
  "plastogami",
  "plastometer",
  "plastron",
  "platelet",
  "platform",
  "platina",
  "platinoid",
  "platinum",
  "platisma",
  "plato",
  "platonik",
  "platonisme",
  "plaza",
  "plebisit",
  "pleidoi",
  "pleiogami",
  "pleistosen",
  "pleksus",
  "plengkung",
  "pleno",
  "pleonasme",
  "pleopod",
  "plerem",
  "plester",
  "pletora",
  "pleura",
  "plinplan",
  "plintat-plintut",
  "plinteng",
  "plintit",
  "pliosaurus",
  "pliosen",
  "ploi",
  "ploidi",
  "plombir",
  "plonci",
  "plonco",
  "plong",
  "plonga-plongo",
  "plontos",
  "plosif",
  "plot",
  "plug",
  "plumbago",
  "plumbum",
  "plumbung",
  "plural",
  "pluralis",
  "pluralisme",
  "pluralistis",
  "pluriform",
  "plus",
  "pluto",
  "plutokrasi",
  "plutonik",
  "plutonium",
  "pluvial",
  "pluviograf",
  "pluviometer",
  "pneumatika",
  "pneumatofos",
  "pneumatokista",
  "pneumonia",
  "poal",
  "poces",
  "poci",
  "pocok",
  "pocong",
  "podemporem",
  "podikal",
  "podium",
  "poetika",
  "pof",
  "pogrom",
  "pohon",
  "poikilohalin",
  "poikiloterm",
  "poin",
  "point",
  "poise",
  "poiseuille",
  "pojok",
  "pok",
  "pokah",
  "pokeng",
  "poker",
  "poket",
  "poko",
  "pokok",
  "pokrol",
  "poksai",
  "pokta",
  "pol",
  "pola",
  "polah",
  "polan",
  "polang",
  "polarimeter",
  "polarimetri",
  "polaris",
  "polarisasi",
  "polaritas",
  "poldan",
  "polder",
  "polemik",
  "polemis",
  "polen",
  "poleng",
  "polenter",
  "poler",
  "poles",
  "polet",
  "poliandri",
  "poliantus",
  "poliester",
  "polifagia",
  "polifase",
  "polifoni",
  "poligam",
  "poligami",
  "poligini",
  "poliglot",
  "poliglotisme",
  "poligon",
  "poligraf",
  "polihalin",
  "polikel",
  "poliket",
  "poliklinik",
  "polikrom",
  "polikultur",
  "polimer",
  "polimerisasi",
  "polinia",
  "polio",
  "polip",
  "polipeptida",
  "polipetal",
  "poliploid",
  "polipropilena",
  "polis",
  "polisakarida",
  "polisemi",
  "polisentrisme",
  "polisepal",
  "polisi",
  "polisiklis",
  "polisilogisme",
  "polisindeton",
  "polisional",
  "polispermi",
  "polister",
  "politbiro",
  "politeis",
  "politeisme",
  "politeistis",
  "politeknik",
  "politena",
  "politik",
  "politika",
  "politikus",
  "politis",
  "politisasi",
  "poliuretan",
  "polivini",
  "polizoa",
  "polka",
  "polkadot",
  "polmah",
  "polo",
  "polok",
  "polones",
  "polong",
  "polonium",
  "polonter",
  "polos",
  "polusi",
  "polutan",
  "polutif",
  "poma",
  "pomade",
  "pomologi",
  "pompa",
  "pompang",
  "pompon",
  "pompong",
  "pon",
  "ponakan",
  "ponco",
  "pondamen",
  "pondar",
  "ponderabilitas",
  "pondik",
  "pondoh",
  "pondok",
  "pondong",
  "pongah",
  "ponggang",
  "ponggok",
  "pongkol",
  "pongsu",
  "poni",
  "ponil",
  "ponok",
  "ponor",
  "pons",
  "pontang-panting",
  "ponten",
  "pontoh",
  "ponton",
  "poo",
  "pop",
  "popelin",
  "popi",
  "popok",
  "popor",
  "popularisasi",
  "popularitas",
  "populasi",
  "populer",
  "populis",
  "populisme",
  "pora",
  "porah",
  "porak-parik",
  "porak-peranda",
  "porak-poranda",
  "porfiria",
  "pori",
  "porisitas",
  "porno",
  "pornografi",
  "pornografis",
  "porok",
  "porong",
  "poros",
  "porositas",
  "porot",
  "porselen",
  "porsi",
  "porta",
  "portabel",
  "portal",
  "portepel",
  "portik",
  "portir",
  "porto",
  "portofolio",
  "pos",
  "pose",
  "poser",
  "posesif",
  "posisi",
  "positif",
  "positivisme",
  "positivistik",
  "positron",
  "positronium",
  "poskar",
  "poso",
  "posologi",
  "postar",
  "poster",
  "posterior",
  "postulat",
  "postur",
  "pot",
  "potas",
  "potasium",
  "potator",
  "potehi",
  "potel",
  "potensi",
  "potensial",
  "potensiometer",
  "potia",
  "potlot",
  "potol",
  "potong",
  "potret",
  "poundal",
  "poyang",
  "praanggapan",
  "praba",
  "prabu",
  "pradana",
  "pradesa",
  "pradesain",
  "pradini",
  "praduga",
  "pragmatik",
  "pragmatika",
  "pragmatis",
  "pragmatisme",
  "prah",
  "prahara",
  "prahoto",
  "prairi",
  "praja",
  "prajaksa",
  "prajurit",
  "prakala",
  "prakarsa",
  "prakarya",
  "prakata",
  "prakilang",
  "prakira",
  "prakondisi",
  "prakonsepsi",
  "praksis",
  "praktek",
  "praktik",
  "praktikan",
  "praktikum",
  "praktis",
  "praktisi",
  "pralahir",
  "pramenstruasi",
  "prameswari",
  "pramodern",
  "pramubakti",
  "pramubarang",
  "pramubayi",
  "pramudi",
  "pramugara",
  "pramugari",
  "pramujasa",
  "pramuka",
  "pramukamar",
  "pramuniaga",
  "pramupintu",
  "pramuria",
  "pramusaji",
  "pramusiwi",
  "pramutamu",
  "pramuwisata",
  "pramuwisma",
  "pranala",
  "pranata",
  "pranatacara",
  "pranatal",
  "prangas",
  "prangko",
  "pranikah",
  "prapalatal",
  "prapatan",
  "prapendapat",
  "praperadilan",
  "prapromosi",
  "prapuber",
  "prapubertas",
  "prapuna",
  "prapustaka",
  "prarasa",
  "prarekam",
  "praremaja",
  "prasaja",
  "prasangka",
  "prasaran",
  "prasarana",
  "prasasti",
  "prasawya",
  "prasejahtera",
  "prasejarah",
  "prasekolah",
  "praseminar",
  "praseodimium",
  "prasetia",
  "prasi",
  "prasmanan",
  "prastudi",
  "prasyarat",
  "pratersier",
  "pratinjau",
  "prawacana",
  "prawira",
  "prayang",
  "prayitna",
  "prayojana",
  "prayuwana",
  "preadvis",
  "preambul",
  "preantena",
  "preasetabulum",
  "predasi",
  "predator",
  "predestinasi",
  "predikat",
  "predikatif",
  "prediksi",
  "predisposisi",
  "preferensi",
  "prefiks",
  "prehistori",
  "prei",
  "prekositas",
  "prekursor",
  "preliminer",
  "prelude",
  "preman",
  "prematur",
  "premi",
  "premis",
  "premium",
  "premolar",
  "prenatal",
  "prenjak",
  "preparat",
  "preposisi",
  "prepotensi",
  "prerogatif",
  "pres",
  "presbiopia",
  "presbiterium",
  "preseden",
  "presensi",
  "presentabel",
  "presentasi",
  "presentil",
  "preservasi",
  "presesi",
  "presiden",
  "presidensial",
  "presidentil",
  "presidium",
  "presiositas",
  "presipitasi",
  "presisi",
  "preskripsi",
  "preskriptif",
  "prestasi",
  "prestise",
  "prestisius",
  "presto",
  "presumsi",
  "pretel",
  "pretensi",
  "prevalensi",
  "preventif",
  "preview",
  "prewangan",
  "pria",
  "priagung",
  "priayi",
  "pribadi",
  "pribumi",
  "prihatin",
  "prima",
  "primadona",
  "primas",
  "primata",
  "primbon",
  "primer",
  "primitif",
  "primogenetur",
  "primordial",
  "primordialisme",
  "primpen",
  "pringas-pringis",
  "pringgitan",
  "prinsip",
  "prinsipiil",
  "prioritas",
  "pripih",
  "pris",
  "prisma",
  "prit",
  "privasi",
  "privat",
  "privatisasi",
  "prive",
  "privilese",
  "pro",
  "proaktif",
  "probabilitas",
  "problem",
  "problematik",
  "procot",
  "prodemokrasi",
  "prodeo",
  "produk",
  "produksi",
  "produktif",
  "produktivitas",
  "produsen",
  "produser",
  "proenzim",
  "prof",
  "profan",
  "profanitas",
  "profase",
  "profesi",
  "profesional",
  "profesionalisme",
  "profesionalitas",
  "profesor",
  "profetik",
  "profil",
  "profilaksis",
  "profit",
  "profitabel",
  "profitabilitas",
  "proforma",
  "progeni",
  "progesteron",
  "prognosis",
  "program",
  "programa",
  "progres",
  "progresif",
  "progresivitas",
  "prohibisi",
  "proklamasi",
  "proklamator",
  "proklitik",
  "proksimal",
  "proksimat",
  "prokurasi",
  "prokurator",
  "prolat",
  "prolegomena",
  "proleksem",
  "proletar",
  "proletariat",
  "proletarisasi",
  "proliferasi",
  "prolog",
  "promenade",
  "prometium",
  "prominen",
  "prominensia",
  "promiskuitas",
  "promontorium",
  "promosi",
  "promotif",
  "promotor",
  "promovendus",
  "pronomina",
  "pronominal",
  "pronominalisasi",
  "prop",
  "propaganda",
  "propagandis",
  "propana",
  "propelan",
  "propeler",
  "properti",
  "propfan",
  "propilena",
  "propinsi",
  "proporsi",
  "proporsional",
  "proposal",
  "proposisi",
  "propulsi",
  "prosa",
  "prosais",
  "prosede",
  "prosedur",
  "prosedural",
  "prosenium",
  "proses",
  "prosesi",
  "prosesor",
  "proskonion",
  "proskriptivisme",
  "prosodi",
  "prosodis",
  "prospek",
  "prospeksi",
  "prospektif",
  "prospektus",
  "prostaglandin",
  "prostat",
  "prostitusi",
  "protagonis",
  "protaktinium",
  "protandri",
  "protandris",
  "protasis",
  "proteid",
  "protein",
  "proteinuria",
  "proteksi",
  "proteksionisme",
  "protektif",
  "protektorat",
  "proteolisis",
  "proteolitik",
  "protes",
  "protese",
  "protesis",
  "protestan",
  "protestantisme",
  "protista",
  "proto",
  "protofon",
  "protogenesis",
  "protokol",
  "protokoler",
  "protolisis",
  "protolitik",
  "proton",
  "protoneolitik",
  "protoplasma",
  "protoraks",
  "prototipe",
  "protozoa",
  "protrombin",
  "protuberansia",
  "provinsi",
  "provinsialisme",
  "provisi",
  "provisional",
  "provitamin",
  "provokasi",
  "provokatif",
  "provokator",
  "provokatur",
  "provos",
  "proyek",
  "proyeksi",
  "proyektil",
  "proyektor",
  "prudensial",
  "prurigo",
  "psalm",
  "psamolitoral",
  "pseudo",
  "pseudokata",
  "pseudomorf",
  "pseudonim",
  "psi",
  "psike",
  "psikiater",
  "psikiatri",
  "psikis",
  "psikoanalisis",
  "psikodrama",
  "psikofarmakologi",
  "psikofisiologis",
  "psikokinesis",
  "psikolepsi",
  "psikolinguistik",
  "psikolog",
  "psikologi",
  "psikologis",
  "psikometri",
  "psikometrika",
  "psikomotor",
  "psikomotorik",
  "psikoneurosis",
  "psikopat",
  "psikopati",
  "psikopatologi",
  "psikosastra",
  "psikoseksual",
  "psikosis",
  "psikosomatik",
  "psikoteknik",
  "psikoteknis",
  "psikoterapi",
  "psikotes",
  "psikotropika",
  "psikrofili",
  "psikrometer",
  "psikrometri",
  "psitakosis",
  "psoriasis",
  "pterodaktil",
  "pteropoda",
  "ptialin",
  "ptomaina",
  "puadai",
  "puah",
  "puak",
  "puaka",
  "pual",
  "pualam",
  "puan",
  "puas",
  "puasa",
  "puatang",
  "pub",
  "puber",
  "pubertas",
  "pubesens",
  "publik",
  "publikasi",
  "publisis",
  "publisistik",
  "publisitas",
  "pucang",
  "pucat",
  "pucik",
  "pucuk",
  "pucung",
  "pudar",
  "pudat",
  "pudel",
  "puder",
  "pudi",
  "puding",
  "pudur",
  "puerpera",
  "puerperium",
  "pugak",
  "pugar",
  "pugas",
  "puguh",
  "puih",
  "puing",
  "puisi",
  "puitis",
  "puitisasi",
  "puja",
  "pujangga",
  "puji",
  "pujuk",
  "pujur",
  "pujut",
  "pukah",
  "pukal",
  "pukang",
  "pukas",
  "pukat",
  "pukau",
  "puki",
  "pukul",
  "pul",
  "pula",
  "pulai",
  "pulan",
  "pulang",
  "pulas",
  "pulasan",
  "pulasari",
  "pulau",
  "pulen",
  "pulih",
  "pulik",
  "pulover",
  "pulp",
  "pulpa",
  "pulpen",
  "pulper",
  "pulsa",
  "pulsar",
  "pulsasi",
  "puluh",
  "pulun",
  "pulung",
  "pulut",
  "puma",
  "pumpun",
  "pun",
  "punah",
  "punai",
  "punakawan",
  "punar",
  "punat",
  "punca",
  "puncak",
  "punci",
  "pundak",
  "punden",
  "pundi",
  "punding",
  "punduh",
  "punduk",
  "pundung",
  "pung",
  "pungak-pinguk",
  "punggah",
  "punggai",
  "punggal",
  "punggawa",
  "pungguk",
  "punggung",
  "punggur",
  "pungkah",
  "pungkang",
  "pungkas",
  "pungkur",
  "pungli",
  "pungsi",
  "pungtuasi",
  "punguk",
  "pungut",
  "punia",
  "punjul",
  "punjung",
  "punjut",
  "punk",
  "puntal",
  "punti",
  "puntianak",
  "puntir",
  "puntuk",
  "puntul",
  "puntung",
  "punuk",
  "punya",
  "pupa",
  "pupil",
  "pupu",
  "pupuan",
  "pupuh",
  "pupuk",
  "pupur",
  "pupus",
  "puput",
  "pura",
  "purba",
  "purbakala",
  "purbani",
  "purbasangka",
  "purbawisesa",
  "purdah",
  "pure",
  "purgatif",
  "puri",
  "purifikasi",
  "purik",
  "puring",
  "puris",
  "purisme",
  "puristis",
  "puritan",
  "puritanisme",
  "purna",
  "purnabakti",
  "purnaintegrasi",
  "purnajabatan",
  "purnajual",
  "purnakarya",
  "purnama",
  "purnapugar",
  "purnasarjana",
  "purnatugas",
  "purnawaktu",
  "purpura",
  "purser",
  "puruk",
  "puruk-parak",
  "purun",
  "purus",
  "purusa",
  "purut",
  "purwa",
  "purwakanti",
  "purwapada",
  "purwarupa",
  "pus",
  "pusa",
  "pusak",
  "pusaka",
  "pusang",
  "pusar",
  "pusara",
  "pusat",
  "puser",
  "pusing",
  "puskesmas",
  "puso",
  "puspa",
  "puspadana",
  "puspadanta",
  "puspamala",
  "pusparagam",
  "puspas",
  "puspawarna",
  "puspita",
  "pusta",
  "pustaha",
  "pustaka",
  "pustakaloka",
  "pusu",
  "pusung",
  "pusut",
  "putar",
  "putat",
  "puter",
  "puti",
  "putih",
  "putik",
  "puting",
  "putra",
  "putranda",
  "putrawali",
  "putrefaksi",
  "putresin",
  "putri",
  "putriditas",
  "putu",
  "putus",
  "putut",
  "puvi-puvi",
  "puyan",
  "puyeng",
  "puyer",
  "puyonghai",
  "puyu",
  "puyuh",
  "qaf",
  "qari",
  "qariah",
  "qasar",
  "qiamulail",
  "qiraah",
  "qiraat",
  "qudsi",
  "quran",
  "raba",
  "raba-rubu",
  "rabak",
  "raban",
  "rabana",
  "rabani",
  "rabas",
  "rabat",
  "rabet",
  "rabi",
  "rabies",
  "rabik",
  "rabit",
  "rabiulakhir",
  "rabiulawal",
  "rabotase",
  "rabu",
  "rabuk",
  "rabulizat",
  "rabun",
  "rabung",
  "rabut",
  "racak",
  "racau",
  "racik",
  "racuh",
  "racun",
  "rad",
  "rada",
  "radaah",
  "radah",
  "radai",
  "radak",
  "radang",
  "radar",
  "radas",
  "raden",
  "rades",
  "radi",
  "radiah",
  "radial",
  "radian",
  "radians",
  "radiasi",
  "radiator",
  "radif",
  "radikal",
  "radikalisasi",
  "radikalisme",
  "radiks",
  "radikula",
  "radin",
  "radio",
  "radioaktif",
  "radioaktivitas",
  "radiogenetika",
  "radiogoniometer",
  "radiogoniometri",
  "radiograf",
  "radiografi",
  "radiogram",
  "radioisotop",
  "radiokarbon",
  "radiokimia",
  "radiolisis",
  "radiolog",
  "radiologi",
  "radiolokasi",
  "radiometer",
  "radiosonde",
  "radiotelefoni",
  "radiotelegrafi",
  "radiotelegrafis",
  "radioterapi",
  "radis",
  "radium",
  "radius",
  "radon",
  "radu",
  "radurisasi",
  "rafak",
  "rafaksi",
  "rafe",
  "rafi",
  "rafia",
  "rafidi",
  "rafik",
  "raflesia",
  "raga",
  "ragam",
  "ragang",
  "ragas",
  "ragawi",
  "ragi",
  "ragib",
  "ragil",
  "ragu",
  "raguk",
  "ragum",
  "ragung",
  "ragut",
  "rahak",
  "rahang",
  "rahap",
  "raharja",
  "rahasia",
  "rahat",
  "rahayu",
  "rahib",
  "rahim",
  "rahimakallah",
  "rahimakumullah",
  "rahmah",
  "rahman",
  "rahmat",
  "rahmatullah",
  "rahu",
  "rai",
  "raib",
  "raigedeg",
  "raih",
  "raimuna",
  "rais",
  "raja",
  "rajab",
  "rajabiah",
  "rajah",
  "rajalela",
  "rajam",
  "rajang",
  "rajapati",
  "rajawali",
  "rajim",
  "rajin",
  "rajok",
  "rajuk",
  "rajul",
  "rajungan",
  "rajut",
  "rak",
  "raka",
  "rakaat",
  "rakah",
  "rakanita",
  "rakap",
  "rakat",
  "rakawira",
  "rakbol",
  "raket",
  "rakila",
  "rakis",
  "rakit",
  "rakitis",
  "rakna",
  "raksa",
  "raksabumi",
  "raksasa",
  "raksi",
  "rakuk",
  "rakung",
  "rakus",
  "rakut",
  "rakyat",
  "rakyu",
  "ralat",
  "ralip",
  "ram",
  "rama",
  "rama-rama",
  "ramadan",
  "ramah",
  "ramai",
  "ramal",
  "ramanda",
  "ramania",
  "rambah",
  "rambai",
  "rambak",
  "ramban",
  "rambang",
  "rambat",
  "rambeh",
  "rambih",
  "rambu",
  "rambun",
  "rambung",
  "rambut",
  "rambutan",
  "rambuti",
  "rames",
  "rami",
  "ramin",
  "ramirezi",
  "rampa",
  "rampai",
  "rampak",
  "rampang",
  "rampas",
  "rampat",
  "ramping",
  "rampok",
  "rampuh",
  "rampung",
  "rampus",
  "ramu",
  "ramus",
  "rana",
  "ranah",
  "ranai",
  "ranap",
  "ranca",
  "rancah",
  "rancak",
  "rancam",
  "rancang",
  "rancap",
  "rancau",
  "rancu",
  "rancung",
  "randa",
  "randa-rondo",
  "randah",
  "randai",
  "randajawan",
  "randak",
  "randat",
  "randau",
  "randek",
  "randi",
  "randu",
  "randuk",
  "randung",
  "rang",
  "rangah",
  "rangai",
  "rangak",
  "rangam",
  "rangas",
  "rangga",
  "ranggah",
  "ranggak",
  "ranggas",
  "ranggeh",
  "ranggi",
  "ranggit",
  "ranggul",
  "ranggung",
  "rangin",
  "rangina",
  "rangka",
  "rangkai",
  "rangkak",
  "rangkam",
  "rangkang",
  "rangkap",
  "rangkaya",
  "rangket",
  "rangkiang",
  "rangkik",
  "rangking",
  "rangkit",
  "rangkok",
  "rangkul",
  "rangkum",
  "rangkung",
  "rangkup",
  "rangkus",
  "rangkut",
  "rango-rango",
  "rangrang",
  "rangrangan",
  "rangsang",
  "rangu",
  "rangum",
  "rangup",
  "rani",
  "ranjah",
  "ranjang",
  "ranjau",
  "ranji",
  "ranjing",
  "rankine",
  "ransel",
  "ransum",
  "rantai",
  "rantam",
  "rantang",
  "rantas",
  "rantau",
  "rante",
  "ranti",
  "ranting",
  "rantuk",
  "rantus",
  "ranum",
  "ranyah",
  "ranyang",
  "ranyau",
  "ranyun",
  "rap",
  "rapah",
  "rapai",
  "rapak",
  "rapal",
  "rapang",
  "rapat",
  "rapel",
  "rapi",
  "rapiah",
  "rapik",
  "rapor",
  "rapsodi",
  "rapu",
  "rapuh",
  "rapun",
  "rapung",
  "rapus",
  "raraha",
  "rarai",
  "rarak",
  "rarangan",
  "raras",
  "ras",
  "rasa",
  "rasai",
  "rasam",
  "rasamala",
  "rasan",
  "rasau",
  "rasberi",
  "rase",
  "rasem",
  "rasi",
  "rasia",
  "rasial",
  "rasialis",
  "rasialisme",
  "rasian",
  "rasio",
  "rasional",
  "rasionalis",
  "rasionalisasi",
  "rasionalisme",
  "rasionalitas",
  "rasisme",
  "raster",
  "rasuk",
  "rasul",
  "rasuli",
  "rasulullah",
  "rasyid",
  "rasywah",
  "rat",
  "rata",
  "ratah",
  "ratap",
  "ratib",
  "ratifikasi",
  "ratna",
  "ratu",
  "ratus",
  "rau",
  "raudah",
  "raudatul",
  "raudatulatfal",
  "raum",
  "raun",
  "raung",
  "raup",
  "raut",
  "rawa",
  "rawah",
  "rawai",
  "rawak",
  "rawan",
  "rawang",
  "rawat",
  "rawatib",
  "rawi",
  "rawin",
  "rawit",
  "rawon",
  "rawuh",
  "raya",
  "rayah",
  "rayan",
  "rayang",
  "rayap",
  "rayau",
  "rayon",
  "rayonisasi",
  "rayu",
  "razia",
  "reagen",
  "reagensia",
  "reak",
  "reaksi",
  "reaksioner",
  "reaktan",
  "reaktans",
  "reaktansi",
  "reaktif",
  "reaktivitas",
  "reakton",
  "reaktor",
  "reaktualisasi",
  "real",
  "realis",
  "realisasi",
  "realisme",
  "realistis",
  "realitas",
  "realokasi",
  "realpolitik",
  "reasuransi",
  "reaumur",
  "reba",
  "rebab",
  "rebah",
  "rebak",
  "reban",
  "rebana",
  "rebas",
  "rebat",
  "rebeh",
  "rebek",
  "rebes",
  "rebet",
  "rebewes",
  "reboisasi",
  "rebon",
  "rebu",
  "rebuk",
  "rebung",
  "rebus",
  "rebut",
  "reca",
  "recak",
  "receh",
  "recet",
  "recik",
  "recok",
  "recup",
  "reda",
  "redah",
  "redaksi",
  "redaksional",
  "redaktur",
  "redam",
  "redang",
  "redap",
  "redefinisi",
  "redih",
  "redik",
  "redoks",
  "reduksi",
  "reduksionisme",
  "redum",
  "redup",
  "reduplikasi",
  "redusir",
  "redut",
  "reedukasi",
  "reekspor",
  "referat",
  "referen",
  "referendaris",
  "referendum",
  "referensi",
  "referensial",
  "reflasi",
  "refleks",
  "refleksi",
  "reflektif",
  "reflektor",
  "reformasi",
  "reformis",
  "refraksi",
  "refraktometer",
  "refraktor",
  "refrein",
  "refrigerator",
  "regah",
  "regan",
  "regang",
  "regas",
  "regat",
  "regata",
  "regel",
  "regen",
  "regenarasi",
  "regenerasi",
  "reges",
  "regi",
  "regio",
  "region",
  "regional",
  "regionalisme",
  "register",
  "registrasi",
  "regisur",
  "reglemen",
  "reglementer",
  "regol",
  "regresi",
  "regresif",
  "regu",
  "reguk",
  "regularisasi",
  "regulasi",
  "regulatif",
  "regulator",
  "reguler",
  "regup",
  "rehab",
  "rehabilitasi",
  "rehabilitatif",
  "rehal",
  "rehat",
  "rehidrasi",
  "reideologisasi",
  "reindoktrinasi",
  "reinkarnasi",
  "reintegrasi",
  "reinterpretasi",
  "reinvestasi",
  "reja",
  "rejab",
  "rejah",
  "rejan",
  "rejang",
  "rejasa",
  "rejeh",
  "rejeng",
  "rejuk",
  "rek",
  "reka",
  "rekah",
  "rekal",
  "rekalkulasi",
  "rekalsitran",
  "rekam",
  "rekan",
  "rekanalisasi",
  "rekanita",
  "rekap",
  "rekapangan",
  "rekapitalisasi",
  "rekapitulasi",
  "rekat",
  "rekata",
  "rekayasa",
  "reken",
  "rekening",
  "rekes",
  "rekisitor",
  "rekisitur",
  "reklamasi",
  "reklame",
  "reklasering",
  "reklasifikasi",
  "rekognisi",
  "rekoleksi",
  "rekombinan",
  "rekombinasi",
  "rekomendasi",
  "rekonsiliasi",
  "rekonstruksi",
  "rekonstruktif",
  "rekonvensi",
  "rekor",
  "rekreasi",
  "rekrut",
  "rekrutmen",
  "reksa",
  "rekstok",
  "rektifikasi",
  "rekto",
  "rektor",
  "rekuiem",
  "rekuisisi",
  "rekuisitor",
  "rekurs",
  "rel",
  "rela",
  "relai",
  "relaks",
  "relaksasi",
  "relang",
  "relap",
  "relas",
  "relasi",
  "relatif",
  "relativisasi",
  "relativisme",
  "relativitas",
  "relau",
  "relban",
  "relevan",
  "relevansi",
  "reli",
  "reliabel",
  "reliabilitas",
  "relief",
  "religi",
  "religiositas",
  "religius",
  "relik",
  "relikui",
  "relikwi",
  "relokasi",
  "reluk",
  "relung",
  "rem",
  "rema",
  "remah",
  "remai",
  "remaja",
  "remak",
  "remanen",
  "remang",
  "remas",
  "rematik",
  "rematisme",
  "rematoid",
  "rembah",
  "rembang",
  "rembas",
  "rembat",
  "rembega",
  "rembes",
  "rembet",
  "rembih",
  "rembuk",
  "rembulan",
  "rembunai",
  "remburs",
  "rembut",
  "remedi",
  "remedial",
  "remediasi",
  "remeh",
  "remenia",
  "remet",
  "remi",
  "remiak",
  "remiling",
  "reminisensi",
  "remis",
  "remisi",
  "remoh",
  "rempa",
  "rempah",
  "rempak",
  "rempela",
  "rempelas",
  "rempenai",
  "rempeyek",
  "rempong",
  "rempuh",
  "rempuk",
  "rempus",
  "remujung",
  "remuk",
  "remunerasi",
  "remunggai",
  "rena",
  "renah",
  "renai",
  "renaisans",
  "renal",
  "renang",
  "rencah",
  "rencak",
  "rencam",
  "rencana",
  "rencang",
  "rencat",
  "renceh",
  "renceng",
  "rencet",
  "rencong",
  "renda",
  "rendabel",
  "rendah",
  "rendam",
  "rendang",
  "rendemen",
  "rendeng",
  "rendet",
  "rendong",
  "renegosiasi",
  "renek",
  "renes",
  "reng",
  "rengadean",
  "rengap",
  "rengas",
  "rengat",
  "rengeh",
  "rengek",
  "rengeng",
  "rengga",
  "renggam",
  "renggang",
  "renggat",
  "renggek",
  "rengges",
  "rengginang",
  "renggut",
  "rengit",
  "rengkah",
  "rengkam",
  "rengkeh",
  "rengket",
  "rengkit",
  "rengkong",
  "rengkudah",
  "rengkuh",
  "rengrengan",
  "rengsa",
  "rengus",
  "rengut",
  "renik",
  "renin",
  "renium",
  "renjana",
  "renjatan",
  "renjeng",
  "renjis",
  "renjong",
  "renjul",
  "renkinang",
  "renovasi",
  "renta",
  "rentabilitas",
  "rentak",
  "rentaka",
  "rental",
  "rentan",
  "rentang",
  "rentap",
  "rentas",
  "rente",
  "renteng",
  "rentenir",
  "rentet",
  "renti",
  "rentik",
  "renumerasi",
  "renung",
  "renvoi",
  "renyah",
  "renyai",
  "renyam",
  "renyang",
  "renyap",
  "renyau",
  "renyeh",
  "renyek",
  "renyem",
  "renyuk",
  "renyut",
  "reog",
  "reol",
  "reologi",
  "reometri",
  "reorganisasi",
  "reorientasi",
  "reostat",
  "reot",
  "rep-repan",
  "repang",
  "reparasi",
  "repas",
  "repatrian",
  "repatriasi",
  "repek",
  "repertoar",
  "repertorium",
  "repes",
  "repet",
  "repeten",
  "repetisi",
  "repetitif",
  "repetitor",
  "repih",
  "replik",
  "replika",
  "repolarisasi",
  "repormir",
  "reportase",
  "reporter",
  "reposisi",
  "repot",
  "representasi",
  "representatif",
  "represi",
  "represif",
  "reproduksi",
  "reprografi",
  "reptil",
  "reptilia",
  "republik",
  "republiken",
  "repuh",
  "repui",
  "reput",
  "reputasi",
  "rerak",
  "rerangka",
  "reranting",
  "reras",
  "rerata",
  "reresanan",
  "rerongkong",
  "rerot",
  "rerugi",
  "reruntuk",
  "resa",
  "resah",
  "resak",
  "resam",
  "resan",
  "resap",
  "resbang",
  "resek",
  "resensi",
  "resensor",
  "resep",
  "resepsi",
  "resepsionis",
  "reseptif",
  "reseptor",
  "reserse",
  "resersir",
  "reservat",
  "reserve",
  "reservoir",
  "reses",
  "resesi",
  "resi",
  "residen",
  "residivis",
  "residivisme",
  "residivistis",
  "residu",
  "resik",
  "resiko",
  "resimen",
  "resin",
  "resinol",
  "resipien",
  "resiprok",
  "resiprokal",
  "resistan",
  "resistans",
  "resistansi",
  "resistor",
  "resital",
  "resitasi",
  "resmi",
  "resolusi",
  "resonan",
  "resonansi",
  "resonator",
  "resor",
  "resorpsi",
  "resorsinol",
  "resosialisasi",
  "respek",
  "respirasi",
  "respirator",
  "responden",
  "respons",
  "responsi",
  "responsif",
  "restan",
  "restiformis",
  "restitusi",
  "restoran",
  "restorasi",
  "restriksi",
  "restriktif",
  "restrukturisasi",
  "restu",
  "restung",
  "resu",
  "resultan",
  "resume",
  "resurjensi",
  "ret",
  "reta",
  "retail",
  "retak",
  "retardasi",
  "retas",
  "retek",
  "retenidos",
  "retensi",
  "retet",
  "retih",
  "retikuler",
  "retina",
  "retinakulum",
  "retinitis",
  "retok",
  "retorik",
  "retorika",
  "retoris",
  "retorsi",
  "retradisionalisasi",
  "retreatisme",
  "retret",
  "retribusi",
  "retro",
  "retroaktif",
  "retrofleks",
  "retrofleksi",
  "retrogresi",
  "retrogresif",
  "retrolingual",
  "retromamal",
  "retromandibuler",
  "retrospeksi",
  "retur",
  "retus",
  "reumatismos",
  "reuni",
  "reunifikasi",
  "revaksinasi",
  "revaluasi",
  "revans",
  "reverberasi",
  "revisi",
  "revisibilitas",
  "revisionis",
  "revitalisasi",
  "revolusi",
  "revolusioner",
  "revolver",
  "rewak",
  "rewan",
  "rewanda",
  "rewang",
  "rewel",
  "rewet",
  "reyal",
  "reyot",
  "rezeki",
  "rezim",
  "rho",
  "ria",
  "riadat",
  "riah",
  "riak",
  "rial",
  "riam",
  "rian",
  "riang",
  "riap",
  "rias",
  "riba",
  "ribang",
  "ribat",
  "ribatat",
  "riben",
  "riboflavin",
  "ribosom",
  "ribu",
  "ribut",
  "rica",
  "ricau",
  "ricik",
  "ricuh",
  "rida",
  "ridan",
  "ridi",
  "riding",
  "ridip",
  "ridu",
  "rigai",
  "rigi-rigi",
  "rihat",
  "rihlah",
  "riil",
  "rijal",
  "rijalugaib",
  "rijalulgaib",
  "rijang",
  "rikuh",
  "rileks",
  "rilis",
  "rim",
  "rima",
  "rimas",
  "rimata",
  "rimba",
  "rimbas",
  "rimbat",
  "rimbawan",
  "rimbun",
  "rime",
  "rimis",
  "rimpang",
  "rimpel",
  "rimpi",
  "rimpuh",
  "rimpung",
  "rinai",
  "rincih",
  "rincis",
  "rincu",
  "rindang",
  "rinding",
  "rindu",
  "ring",
  "ringan",
  "ringgit",
  "ringih",
  "ringik",
  "ringin",
  "ringis",
  "ringkai",
  "ringkas",
  "ringkih",
  "ringkik",
  "ringking",
  "ringkuk",
  "ringkus",
  "ringsek",
  "ringsing",
  "rini",
  "rinitis",
  "rinjing",
  "rinoskop",
  "rintang",
  "rintas",
  "rintih",
  "rintik",
  "rintis",
  "rinyai",
  "riol",
  "ripit",
  "ripta",
  "ripuh",
  "ripuk",
  "ririt",
  "risa",
  "risak",
  "risalah",
  "risau",
  "riset",
  "risi",
  "risik",
  "risiko",
  "risit",
  "riskan",
  "rit",
  "ritel",
  "ritma",
  "ritme",
  "ritmis",
  "ritual",
  "ritul",
  "ritus",
  "riuh",
  "riuk",
  "riung",
  "rival",
  "rivalitas",
  "riwan",
  "riwayat",
  "robak-rabik",
  "robat-rabit",
  "robek",
  "roboh",
  "robok",
  "robot",
  "robotika",
  "rocet",
  "roda",
  "rodan",
  "rodat",
  "rodensial",
  "rodentisida",
  "rodi",
  "rodium",
  "rodok",
  "rodolit",
  "rodong",
  "roga",
  "rogoh",
  "rogok",
  "rogol",
  "roh",
  "rohani",
  "rohaniah",
  "rohmat",
  "rohulkudus",
  "roi",
  "rojeng",
  "rojol",
  "rok",
  "rokade",
  "roker",
  "roket",
  "roki",
  "rokok",
  "rol",
  "rolet",
  "rolpres",
  "roma",
  "roman",
  "romanistik",
  "romansa",
  "romantik",
  "romantika",
  "romantikus",
  "romantis",
  "romantisisme",
  "romawi",
  "rombak",
  "rombang-rambing",
  "rombeng",
  "rombik",
  "rombohedron",
  "romboid",
  "rombok",
  "rombong",
  "rombus",
  "romet",
  "romok",
  "romol-romol",
  "romong",
  "rompak",
  "rompal",
  "rompang",
  "rompeng",
  "rompes",
  "rompi",
  "rompoh",
  "rompok",
  "rompong",
  "rompyok",
  "romsus",
  "romusa",
  "rona",
  "ronce",
  "roncet",
  "ronda",
  "rondah-rondih",
  "ronde",
  "rondo",
  "rondok",
  "roneo",
  "rong",
  "rongak",
  "rongga",
  "ronggang",
  "ronggeng",
  "ronggok",
  "ronggong",
  "rongkoh",
  "rongkok",
  "rongkol",
  "rongkong",
  "rongos",
  "rongrong",
  "rongseng",
  "rongsok",
  "ronta",
  "rontek",
  "rontgen",
  "rontok",
  "ronyeh",
  "ronyok",
  "ropak-rapik",
  "rorehe",
  "rorod",
  "ros",
  "rosario",
  "rosbang",
  "rosela",
  "roseng",
  "roseola",
  "roset",
  "rosin",
  "rosok",
  "rosot",
  "rotan",
  "rotasi",
  "rotator",
  "roti",
  "rotograf",
  "rotok",
  "rowa",
  "rowot",
  "royak",
  "royal",
  "royalti",
  "royan",
  "royemen",
  "royer",
  "royong",
  "rua",
  "ruadat",
  "ruah",
  "ruai",
  "ruak",
  "ruam",
  "ruang",
  "ruap",
  "ruas",
  "ruat",
  "ruaya",
  "ruba-ruba",
  "rubah",
  "rubai",
  "rubaiat",
  "ruban",
  "rubanat",
  "rubel",
  "rubela",
  "rubeola",
  "rubiah",
  "rubidium",
  "rubik",
  "rubin",
  "rubing",
  "rubrik",
  "rubu",
  "rubung",
  "rucah",
  "rudah",
  "rudal",
  "rudapaksa",
  "rudi",
  "rudimen",
  "rudin",
  "rudu",
  "rudus",
  "rugbi",
  "rugi",
  "ruh",
  "ruhbahnat",
  "ruhban",
  "ruhbanat",
  "ruhbaniat",
  "ruilslag",
  "ruing",
  "ruit",
  "rujah",
  "rujak",
  "ruji",
  "rujuk",
  "rukam",
  "rukhsah",
  "rukiah",
  "ruko",
  "ruku",
  "rukuh",
  "rukuk",
  "rukun",
  "rukyat",
  "rukyatulhilal",
  "rum",
  "rumah",
  "rumal",
  "rumba",
  "rumbah",
  "rumbai",
  "rumbia",
  "rumbing",
  "rumbu",
  "rumen",
  "rumenia",
  "rumi",
  "rumin",
  "ruminansi",
  "ruminansia",
  "rumit",
  "rumor",
  "rumpakan",
  "rumpang",
  "rumpi",
  "rumpil",
  "rumpon",
  "rumpun",
  "rumput",
  "rumrum",
  "rumuk",
  "rumung",
  "rumus",
  "runcing",
  "runcit",
  "runding",
  "rundu-rundu",
  "runduk",
  "rundung",
  "rungau",
  "runggas",
  "runggu",
  "runggu-rangga",
  "rungguh",
  "runggut",
  "rungkau",
  "rungkuh",
  "rungkun",
  "rungkup",
  "rungu",
  "rungus",
  "rungut",
  "runjam",
  "runjang",
  "runjau",
  "runjung",
  "runtai",
  "runtang-runtung",
  "runtas",
  "runti",
  "runtih",
  "runtuh",
  "runtun",
  "runtut",
  "runut",
  "runyam",
  "runyut",
  "ruok",
  "rupa",
  "rupee",
  "rupiah",
  "rurut",
  "rusa",
  "rusak",
  "rusuh",
  "rusuk",
  "rutab",
  "rute",
  "rutenium",
  "ruterfordium",
  "rutin",
  "rutuk",
  "rutup",
  "ruwah",
  "ruwat",
  "ruwet",
  "ruyak",
  "ruyap",
  "ruyung",
  "ruyup",
  "saadah",
  "saadin",
  "saanen",
  "saat",
  "sab-sab",
  "saba",
  "sabah",
  "sabak",
  "saban",
  "sabana",
  "sabang",
  "sabar",
  "sabas",
  "sabasani",
  "sabat",
  "sabatikal",
  "sabda",
  "sabel",
  "saben",
  "sabet",
  "sabi",
  "sabil",
  "sabilillah",
  "sabit",
  "sabitah",
  "sableng",
  "sablon",
  "sabo",
  "sabot",
  "sabotase",
  "sabsab",
  "sabtu",
  "sabuk",
  "sabun",
  "sabung",
  "sabur",
  "sabut",
  "sad",
  "sadah",
  "sadai",
  "sadak",
  "sadang",
  "sadap",
  "sadar",
  "sadariah",
  "sadarulkalam",
  "sadarusalam",
  "sadau",
  "sadel",
  "sadik",
  "sadin",
  "sading",
  "sadir",
  "sadis",
  "sadisme",
  "sadistis",
  "sado",
  "sadrah",
  "sadran",
  "sadu",
  "sadur",
  "saf",
  "safa",
  "safar",
  "safari",
  "safi",
  "safih",
  "safinah",
  "safinatunajah",
  "safir",
  "safrah",
  "safron",
  "safsaf",
  "safsah",
  "saga",
  "sagai",
  "sagang",
  "sagar",
  "sagitarius",
  "sagon",
  "sagu",
  "saguer",
  "sagur",
  "sah",
  "sahabat",
  "sahaja",
  "saham",
  "sahan",
  "sahang",
  "sahap",
  "sahara",
  "saharah",
  "sahaya",
  "sahayanda",
  "sahda",
  "sahdu",
  "sahi",
  "sahib",
  "sahibulbait",
  "sahibulhajat",
  "sahibulhikayat",
  "sahifah",
  "sahih",
  "sahir",
  "sahkan",
  "sahmura",
  "sahur",
  "sahut",
  "sai",
  "saif",
  "sailan",
  "sailo",
  "saing",
  "sains",
  "saintis",
  "sair",
  "sais",
  "saja",
  "sajadah",
  "sajak",
  "sajang",
  "sajen",
  "saji",
  "sak",
  "saka",
  "sakai",
  "sakal",
  "sakang",
  "sakap",
  "sakar",
  "sakarida",
  "sakarimeter",
  "sakarin",
  "sakarosa",
  "sakat",
  "sake",
  "sakelar",
  "sakelek",
  "sakhawat",
  "sakhi",
  "sakhrat",
  "sakhsi",
  "saki",
  "sakinah",
  "saking",
  "sakit",
  "saklek",
  "sakral",
  "sakramen",
  "sakramental",
  "sakramentalia",
  "sakratulmaut",
  "sakrilegi",
  "sakristi",
  "sakrokoksigeal",
  "sakrolumbal",
  "sakrum",
  "saksama",
  "saksang",
  "saksi",
  "saksofon",
  "sakti",
  "saku",
  "sakura",
  "sal",
  "sala",
  "salaf",
  "salah",
  "salai",
  "salak",
  "salam",
  "salang",
  "salar",
  "salaris",
  "salasal",
  "salat",
  "salatin",
  "saldo",
  "sale",
  "saleh",
  "salem",
  "salep",
  "sali",
  "salib",
  "salihah",
  "salim",
  "salin",
  "salina",
  "salindia",
  "salindra",
  "saling",
  "salinisasi",
  "salinitas",
  "salinometer",
  "salip",
  "salir",
  "salira",
  "salivasi",
  "salju",
  "salmon",
  "salmonela",
  "salon",
  "salpeter",
  "salping",
  "saltasi",
  "salto",
  "saluir",
  "saluk",
  "salung",
  "salur",
  "salut",
  "salvarsan",
  "salvo",
  "sama",
  "samad",
  "samak",
  "saman",
  "samanera",
  "samaniah",
  "samapta",
  "samar",
  "samara",
  "samarium",
  "samas",
  "samawi",
  "samba",
  "sambal",
  "sambalewa",
  "sambang",
  "sambangan",
  "sambar",
  "sambat",
  "sambau",
  "samben",
  "sambet",
  "sambi",
  "sambil",
  "sambiloto",
  "sambit",
  "sambuk",
  "sambung",
  "sambur",
  "sambut",
  "sami",
  "samidra",
  "samijaga",
  "samin",
  "samir",
  "samo-samo",
  "samovar",
  "sampa",
  "sampah",
  "sampai",
  "sampak",
  "sampakan",
  "sampan",
  "sampang",
  "sampanye",
  "sampar",
  "samparan",
  "sampat",
  "sampean",
  "sampek",
  "sampel",
  "samper",
  "sampeyan",
  "sampil",
  "sampilik",
  "samping",
  "sampir",
  "sampling",
  "samplok",
  "sampo",
  "sampu",
  "sampuk",
  "sampul",
  "sampur",
  "samsak",
  "samsam",
  "samseng",
  "samsir",
  "samsiti",
  "samsu",
  "samudra",
  "samuh",
  "samum",
  "samun",
  "samurai",
  "sana",
  "sanad",
  "sanak",
  "sanat",
  "sanatogen",
  "sanatorium",
  "sanatulhijriah",
  "sanatulmiladiah",
  "sanawiah",
  "sanca",
  "sanda",
  "sandal",
  "sandang",
  "sandar",
  "sandel",
  "sandera",
  "sandi",
  "sanding",
  "sandiwara",
  "sando",
  "sandung",
  "sandungan",
  "sanering",
  "sang",
  "sanga",
  "sangai",
  "sangan",
  "sangar",
  "sangat",
  "sangau",
  "sangga",
  "sanggah",
  "sanggam",
  "sanggama",
  "sanggan",
  "sanggang",
  "sanggar",
  "sanggarunggi",
  "sanggat",
  "sanggep",
  "sanggerah",
  "sangging",
  "sanggit",
  "sanggrah",
  "sanggraloka",
  "sanggul",
  "sanggup",
  "sanggurdi",
  "sangha",
  "sangih",
  "sangir",
  "sangit",
  "sangka",
  "sangkak",
  "sangkakala",
  "sangkal",
  "sangkala",
  "sangkan",
  "sangkar",
  "sangkil",
  "sangku",
  "sangkul",
  "sangkur",
  "sangkuriang",
  "sangkut",
  "sangkut-paut",
  "sangli",
  "sangling",
  "sanglir",
  "sangon",
  "sangrai",
  "sangsai",
  "sangsam",
  "sangsang",
  "sangsi",
  "sangu",
  "sanguifikasi",
  "sangulun",
  "sangyang",
  "sani",
  "sanik",
  "sanitas",
  "sanitasi",
  "saniter",
  "sanjai",
  "sanjak",
  "sanjang",
  "sanjung",
  "sanksi",
  "sano",
  "sansai",
  "sanseviera",
  "sanskerta",
  "santa",
  "santai",
  "santak",
  "santam",
  "santan",
  "santap",
  "santase",
  "santau",
  "santer",
  "santet",
  "santiaji",
  "santing",
  "santir",
  "santo",
  "santonin",
  "santri",
  "santun",
  "santung",
  "sanubari",
  "sap",
  "sapa",
  "sapai",
  "saparantu",
  "sapat",
  "sapau",
  "sapersi",
  "sapi",
  "sapih",
  "sapir",
  "sapit",
  "sapogenin",
  "saponin",
  "saprofit",
  "sapta",
  "saptadarma",
  "saptamarga",
  "saptapesona",
  "sapu",
  "saput",
  "saputangan",
  "sar",
  "sara",
  "saradasi",
  "saraf",
  "sarak",
  "saran",
  "sarana",
  "sarang",
  "sarangan",
  "sarap",
  "sarasehan",
  "sarat",
  "sarau",
  "sarden",
  "sardencis",
  "sarean",
  "sareh",
  "sarekat",
  "saren",
  "sarengat",
  "sarhad",
  "sari",
  "saridele",
  "sarik",
  "sarikan",
  "saring",
  "sarira",
  "sarirah",
  "sarit",
  "sarjana",
  "sarju",
  "sarkasme",
  "sarkastis",
  "sarkode",
  "sarkoderma",
  "sarkofagus",
  "sarkolema",
  "sarkologi",
  "sarkoma",
  "sarkoplasma",
  "saron",
  "sarsaparila",
  "sartan",
  "saru",
  "saruk",
  "sarung",
  "sarut",
  "sarwa",
  "sasa",
  "sasak",
  "sasakala",
  "sasana",
  "sasando",
  "sasap",
  "sasar",
  "sasau",
  "sasi",
  "sasian",
  "sasis",
  "sasmita",
  "sastra",
  "sasus",
  "sat",
  "satai",
  "satak",
  "satang",
  "satanologi",
  "satar",
  "sate",
  "satelit",
  "satih",
  "satin",
  "satinet",
  "satir",
  "satire",
  "satiris",
  "sato",
  "satori",
  "satpam",
  "satria",
  "satron",
  "satu",
  "saturnus",
  "saturometer",
  "satwa",
  "satyagraha",
  "satyalencana",
  "satyawacana",
  "sau",
  "saudagar",
  "saudara",
  "saudari",
  "sauh",
  "saujana",
  "sauk",
  "saum",
  "sauna",
  "saung",
  "saur",
  "saus",
  "saut",
  "sauvinis",
  "sauvinisme",
  "sauvinistis",
  "saw",
  "sawa",
  "sawab",
  "sawah",
  "sawai",
  "sawala",
  "sawan",
  "sawang",
  "sawangan",
  "sawar",
  "sawat",
  "sawer",
  "sawi",
  "sawit",
  "sawo",
  "sawut",
  "saya",
  "sayak",
  "sayang",
  "sayap",
  "sayat",
  "sayembara",
  "sayet",
  "sayib",
  "sayid",
  "sayidani",
  "sayidi",
  "sayidina",
  "sayu",
  "sayung",
  "sayup",
  "sayur",
  "seba",
  "sebab",
  "sebahat",
  "sebai",
  "sebak",
  "sebal",
  "sebam",
  "sebar",
  "sebarang",
  "sebarau",
  "sebasah",
  "sebat",
  "sebaur",
  "sebekah",
  "sebel",
  "sebelas",
  "sebeng",
  "sebentar",
  "seberang",
  "seberhana",
  "sebet",
  "sebit",
  "seblang",
  "sebrot",
  "sebu",
  "sebuk",
  "sebum",
  "sebun",
  "sebura",
  "seburas",
  "seburu",
  "seburus",
  "seburut",
  "sebut",
  "secang",
  "seceng",
  "secerek",
  "secina",
  "sedahan",
  "sedak",
  "sedam",
  "sedan",
  "sedang",
  "sedap",
  "sedat",
  "sedatif",
  "sedativa",
  "sedawai",
  "sedekah",
  "sedekap",
  "sedelinggam",
  "sedeng",
  "sederhana",
  "sederum",
  "sedia",
  "sediakala",
  "sedih",
  "sedikit",
  "sedimen",
  "sedimentasi",
  "sedimenter",
  "sedingin",
  "sedong",
  "sedot",
  "sedu",
  "seduayah",
  "seduh",
  "sefalopoda",
  "sefalotoraks",
  "seg",
  "sega",
  "segah",
  "segak",
  "segala",
  "segan",
  "seganda",
  "segani",
  "segar",
  "segara",
  "segata",
  "segeger",
  "segeh",
  "segel",
  "segenap",
  "segera",
  "segi",
  "segianya",
  "segitiga",
  "segmen",
  "segmental",
  "segmentasi",
  "segregasi",
  "seguna",
  "seh",
  "seharah",
  "sehat",
  "sehingga",
  "seia",
  "seilometer",
  "sein",
  "seismik",
  "seismograf",
  "seismogram",
  "seismolog",
  "seismologi",
  "seismometer",
  "sejahtera",
  "sejajar",
  "sejak",
  "sejarah",
  "sejarawan",
  "sejari",
  "sejat",
  "sejati",
  "sejingkat",
  "sejuk",
  "sek",
  "seka",
  "sekadar",
  "sekah",
  "sekak",
  "sekakar",
  "sekakmat",
  "sekal",
  "sekala",
  "sekali",
  "sekaligus",
  "sekalipun",
  "sekalor",
  "sekam",
  "sekan",
  "sekang",
  "sekap",
  "sekapar",
  "sekar",
  "sekarang",
  "sekarat",
  "sekat",
  "sekata",
  "sekaten",
  "sekati",
  "sekaut",
  "sekeber",
  "sekebun",
  "sekedeng",
  "sekeduduk",
  "sekedup",
  "sekelat",
  "sekelebatan",
  "sekelian",
  "sekema",
  "sekendal",
  "sekendi",
  "sekengkeng",
  "sekepat",
  "sekeram",
  "sekeri",
  "sekerindangan",
  "sekering",
  "sekesel",
  "seketeng",
  "sekh",
  "sekian",
  "sekilwak",
  "sekip",
  "sekira",
  "sekiram",
  "sekitar",
  "seko",
  "sekoci",
  "sekoi",
  "sekolah",
  "sekon",
  "sekongkol",
  "sekonyong-konyong",
  "sekop",
  "sekopong",
  "sekoteng",
  "sekrap",
  "sekresi",
  "sekret",
  "sekreta",
  "sekretariat",
  "sekretaris",
  "sekretin",
  "sekring",
  "sekrip",
  "sekrup",
  "seks",
  "seksi",
  "seksmaniak",
  "seksolog",
  "seksologi",
  "seksologis",
  "sekstan",
  "sekstet",
  "seksual",
  "seksualitas",
  "sektarian",
  "sektarianisme",
  "sekte",
  "sektor",
  "sektoral",
  "sekuas",
  "sekui",
  "sekul",
  "sekularis",
  "sekularisasi",
  "sekularisme",
  "sekularitas",
  "sekuler",
  "sekulir",
  "sekunar",
  "sekunder",
  "sekunyit",
  "sekuritas",
  "sekuriti",
  "sekutu",
  "sel",
  "sela",
  "selabar",
  "selaber",
  "selaberak",
  "selada",
  "seladang",
  "seladon",
  "selagi",
  "selai",
  "selain",
  "selaju",
  "selak",
  "selaka",
  "selakarang",
  "selaku",
  "selalu",
  "selam",
  "selamat",
  "selamba",
  "selampai",
  "selampe",
  "selampek",
  "selampit",
  "selan",
  "selancak",
  "selancang",
  "selancar",
  "selang",
  "selangat",
  "selangka",
  "selangkang",
  "selangkup",
  "selanting",
  "selap",
  "selapan",
  "selaput",
  "selar",
  "selara",
  "selarak",
  "selaras",
  "selarung",
  "selasa",
  "selasar",
  "selasih",
  "selat",
  "selatan",
  "selawah",
  "selawat",
  "selawe",
  "selaya",
  "selayun",
  "selayur",
  "sele",
  "selebaran",
  "selebran",
  "selebrasi",
  "selebritas",
  "selebriti",
  "selebu",
  "seleder",
  "selederi",
  "seledri",
  "seleguri",
  "selekeh",
  "selekoh",
  "selekor",
  "seleksi",
  "selekta",
  "selektif",
  "selektivitas",
  "seleler",
  "selembana",
  "selembubu",
  "selempada",
  "selempang",
  "selempukau",
  "selempuri",
  "selendang",
  "selender",
  "selendro",
  "selenggara",
  "selengkatan",
  "selenium",
  "selenografi",
  "selenologi",
  "selentang-selenting",
  "selentik",
  "selenting",
  "seleo",
  "selepa",
  "selepang",
  "selepat",
  "selepe",
  "seleper",
  "selepetan",
  "selepi",
  "selera",
  "selerak",
  "selerang",
  "seleret",
  "selesa",
  "selesai",
  "selesma",
  "seletuk",
  "seleweng",
  "selia",
  "seliap",
  "selibat",
  "selibu",
  "selibut",
  "selidik",
  "seligi",
  "seligit",
  "selimang",
  "selimpang",
  "selimpat",
  "selimut",
  "selinap",
  "selindung",
  "seling",
  "selingar",
  "selingkit",
  "selingkuh",
  "selingkup",
  "selip",
  "selipar",
  "selir",
  "selira",
  "selirak",
  "selirat",
  "seliri",
  "selisih",
  "selisik",
  "selisip",
  "selisir",
  "selit",
  "seliwer",
  "selo",
  "selofan",
  "selok",
  "seloka",
  "selokan",
  "seloki",
  "selom",
  "selomot",
  "selompret",
  "selon",
  "selonding",
  "selong",
  "selongkar",
  "selongsong",
  "selonjor",
  "selonong",
  "selop",
  "seloroh",
  "selot",
  "seloyak",
  "seloyong",
  "selter",
  "seluang",
  "seluar",
  "selubung",
  "seludang",
  "seludu",
  "seluduk",
  "seludup",
  "selui",
  "seluk",
  "seluk-beluk",
  "selukat",
  "selukung",
  "seluler",
  "seluloid",
  "selulosa",
  "selulup",
  "selulur",
  "selumar",
  "selumbar",
  "selumbari",
  "selumbat",
  "selumu",
  "selumur",
  "seluncur",
  "selundat",
  "selundup",
  "selungkang",
  "selungkup",
  "selup",
  "selupan",
  "selupat",
  "selurah",
  "seluru",
  "seluruh",
  "selusuh",
  "selusup",
  "selusur",
  "selut",
  "sema",
  "semadi",
  "semafor",
  "semah",
  "semai",
  "semaja",
  "semak",
  "semalu",
  "semambu",
  "semampai",
  "semampang",
  "semampat",
  "seman",
  "semanak",
  "semandan",
  "semandarasa",
  "semandarasah",
  "semandera",
  "semang",
  "semangat",
  "semanggi",
  "semangka",
  "semangkok",
  "semangkuk",
  "semantan",
  "semantik",
  "semantis",
  "semantung",
  "semaput",
  "semara",
  "semarai",
  "semarak",
  "semaram",
  "semarmendem",
  "semat",
  "semata",
  "semawang",
  "semawar",
  "semaya",
  "semayam",
  "semayi",
  "sembab",
  "sembabat",
  "sembada",
  "sembagi",
  "sembah",
  "sembahyang",
  "sembai",
  "sembak",
  "sembam",
  "sembap",
  "sembar",
  "sembarang",
  "sembari",
  "sembat",
  "sembawang",
  "sembayan",
  "sembelih",
  "sembelit",
  "sember",
  "semberap",
  "semberip",
  "sembesi",
  "sembeta",
  "sembiang",
  "sembilan",
  "sembilang",
  "sembilik",
  "sembilu",
  "sembir",
  "sembirat",
  "semboyan",
  "sembrani",
  "sembrono",
  "sembuang",
  "sembuh",
  "sembul",
  "sembung",
  "sembunyi",
  "sembur",
  "semburat",
  "semburit",
  "semecah",
  "semedera",
  "semejana",
  "semeleh",
  "sememeh",
  "semen",
  "semena",
  "semenanjung",
  "semenda",
  "semendarasa",
  "semenggah",
  "semenjak",
  "semenjana",
  "sementang",
  "sementara",
  "sementasi",
  "sementelah",
  "sementung",
  "semerawang",
  "semerbak",
  "semerdanta",
  "semesta",
  "semester",
  "semi",
  "semiang",
  "semidiurnal",
  "semifinal",
  "semifinalis",
  "semiidiom",
  "semikonduktor",
  "semilat",
  "seminai",
  "seminar",
  "seminari",
  "seminaris",
  "seminau",
  "semiologi",
  "semiotik",
  "semiotika",
  "semipermanen",
  "semir",
  "semitisme",
  "semivokal",
  "semok",
  "sempada",
  "sempadan",
  "sempak",
  "sempal",
  "sempalai",
  "sempana",
  "sempang",
  "sempat",
  "sempelah",
  "sempena",
  "sempil",
  "sempit",
  "semplak",
  "sempoyong",
  "sempoyongan",
  "semprit",
  "semprong",
  "semprot",
  "sempul",
  "sempur",
  "sempuras",
  "sempurna",
  "semrawut",
  "semringah",
  "semsem",
  "semu",
  "semua",
  "semunding",
  "semunian",
  "semur",
  "semut",
  "sen",
  "sena",
  "senak",
  "senam",
  "senamaki",
  "senandika",
  "senandung",
  "senang",
  "senangin",
  "senantan",
  "senantiasa",
  "senapan",
  "senapati",
  "senar",
  "senarai",
  "senario",
  "senat",
  "senator",
  "senawan",
  "senawar",
  "senawat",
  "senawi",
  "senda",
  "sendal",
  "sendalu",
  "sendam",
  "sendang",
  "sendar",
  "sendarat",
  "sendaren",
  "sendat",
  "sendawa",
  "sendayan",
  "sendayang",
  "sendel",
  "sendeng",
  "sender",
  "senderik",
  "senderung",
  "senderut",
  "sendi",
  "sending",
  "sendiri",
  "sendocong",
  "sendok",
  "sendon",
  "sendorong",
  "sendratari",
  "sendu",
  "senduduk",
  "senduk",
  "senen",
  "senewen",
  "seng",
  "sengaja",
  "sengal",
  "sengam",
  "sengangar",
  "sengangkar",
  "sengap",
  "sengar",
  "sengar-sengir",
  "sengarat",
  "sengaring",
  "sengat",
  "sengau",
  "sengelat",
  "senget",
  "senggak",
  "senggang",
  "senggara",
  "senggat",
  "senggau",
  "senggayut",
  "senggerahan",
  "senggeruk",
  "sengget",
  "senggiling",
  "senggol",
  "senggora",
  "senggugu",
  "senggugut",
  "sengguk",
  "senggulung",
  "senggut",
  "sengih",
  "sengingih",
  "sengir",
  "sengit",
  "sengkak",
  "sengkal",
  "sengkalan",
  "sengkang",
  "sengkar",
  "sengkarut",
  "sengkawang",
  "sengkayan",
  "sengked",
  "sengkedan",
  "sengkek",
  "sengkela",
  "sengkelang",
  "sengkelat",
  "sengkeling",
  "sengkelit",
  "sengkenit",
  "sengker",
  "sengketa",
  "sengkil",
  "sengkilit",
  "sengkuang",
  "sengkuap",
  "sengon",
  "sengsai",
  "sengsam",
  "sengsara",
  "sengsem",
  "sengsurit",
  "senguk",
  "sengungut",
  "sengut",
  "seni",
  "senigai",
  "senil",
  "senilitas",
  "seniman",
  "senin",
  "senior",
  "senioritas",
  "senja",
  "senjak",
  "senjang",
  "senjata",
  "senjolong",
  "senjong",
  "senohong",
  "senonoh",
  "senoyong",
  "sensasi",
  "sensasional",
  "sensibel",
  "sensibilitas",
  "sensitif",
  "sensitivitas",
  "sensor",
  "sensoris",
  "sensual",
  "sensualisme",
  "sensualitas",
  "sensur",
  "sensus",
  "senta",
  "sentada",
  "sentadu",
  "sentagi",
  "sentak",
  "sentaka",
  "sental",
  "sentali",
  "sentana",
  "sentap",
  "sentara",
  "senteng",
  "senter",
  "senterpor",
  "senti",
  "sentiare",
  "sentiasa",
  "sentigram",
  "sentil",
  "sentiliter",
  "sentimen",
  "sentimental",
  "sentimentalitas",
  "sentimentil",
  "sentimeter",
  "senting",
  "sentiong",
  "sentiung",
  "sentol",
  "sentong",
  "sentosa",
  "sentra",
  "sentral",
  "sentralisasi",
  "sentralistis",
  "sentrifugal",
  "sentripetal",
  "sentrum",
  "sentuh",
  "sentuk",
  "sentul",
  "sentung",
  "senu",
  "senuh",
  "senuk",
  "senunggang",
  "senur",
  "senyampang",
  "senyap",
  "senyar",
  "senyawa",
  "senyum",
  "senyur",
  "seok",
  "seolah-olah",
  "sep",
  "sepada",
  "sepah",
  "sepai",
  "sepak",
  "sepakat",
  "sepal",
  "sepala-pala",
  "sepam",
  "sepan",
  "sepanar",
  "sepandri",
  "sepang",
  "sepangkalan",
  "separasi",
  "separatis",
  "separatisme",
  "separbang",
  "sepasin",
  "sepat",
  "sepatbor",
  "sepatu",
  "sepeda",
  "sepedas",
  "sepegoh",
  "sepekuk",
  "sepel",
  "sepele",
  "sepeling",
  "sepen",
  "sepenuh",
  "seperah",
  "seperantu",
  "sepersi",
  "seperti",
  "sepesan",
  "sepet",
  "sepetir",
  "sepi",
  "sepih",
  "sepiker",
  "sepir",
  "sepit",
  "seples",
  "sepoi",
  "seprai",
  "seprei",
  "sepsis",
  "september",
  "septima",
  "septum",
  "sepuh",
  "sepuit",
  "sepuk",
  "sepukal",
  "sepul",
  "sepulih",
  "sepuluh",
  "sepupu",
  "sepur",
  "seput",
  "sera",
  "serabi",
  "serabut",
  "serabutan",
  "seraga",
  "seragam",
  "serah",
  "serahi",
  "serai",
  "serak",
  "serakah",
  "seram",
  "serama",
  "serambi",
  "serampang",
  "serampin",
  "serampu",
  "serampuk",
  "seran",
  "serana",
  "seranah",
  "serandang",
  "serandau",
  "serandib",
  "serandung",
  "serang",
  "serangga",
  "serangguh",
  "seranggung",
  "serangkak",
  "serangsang",
  "serani",
  "seranograf",
  "seranometer",
  "seranta",
  "serap",
  "serapah",
  "serapat",
  "serasa",
  "serasah",
  "serasi",
  "serat",
  "seratah",
  "serati",
  "seratung",
  "serau",
  "seraumeter",
  "seraut",
  "serawak",
  "serawal",
  "seraya",
  "serba",
  "serbaada",
  "serbaakal",
  "serbabaru",
  "serbabisa",
  "serbadua",
  "serbaemas",
  "serbaguna",
  "serbah-serbih",
  "serbaindah",
  "serbak",
  "serbakeemasan",
  "serbakurang",
  "serbamacam",
  "serban",
  "serbaneka",
  "serbaputih",
  "serbarumah",
  "serbasalah",
  "serbasama",
  "serbasusah",
  "serbat",
  "serbausaha",
  "serbet",
  "serbi",
  "serbu",
  "serbuk",
  "serdadu",
  "serdak",
  "serdam",
  "serdang",
  "serdawa",
  "serdi",
  "serdih",
  "serealia",
  "serealin",
  "sereat",
  "serebral",
  "serebrospinal",
  "serebrum",
  "seregang",
  "sereh",
  "serembah-serembih",
  "seremban",
  "seremoni",
  "seremonial",
  "serempak",
  "serempet",
  "serempu",
  "serendah",
  "serendeng",
  "sereng",
  "serengam",
  "serengeh",
  "serengit",
  "serenjak",
  "serenjang",
  "serenta",
  "serentak",
  "serep",
  "seresin",
  "seret",
  "sergah",
  "sergam",
  "sergap",
  "sergut",
  "seri",
  "serial",
  "seriap",
  "seriat",
  "seriawan",
  "seribulan",
  "seriding",
  "serigading",
  "serigala",
  "serigunting",
  "serik",
  "serikat",
  "serikaya",
  "serimala",
  "serimpet",
  "serimpi",
  "serimpung",
  "serindai",
  "serindit",
  "sering",
  "seringai",
  "seringing",
  "seriosa",
  "serit",
  "serium",
  "serius",
  "serkah",
  "serkai",
  "serkap",
  "serkup",
  "serlah",
  "serling",
  "sermangin",
  "sermet",
  "sernak",
  "sero",
  "serobeh",
  "serobok",
  "serobot",
  "serografi",
  "seroja",
  "serok",
  "serologi",
  "serombong",
  "serompok",
  "serondeng",
  "serondok",
  "serondol",
  "serondong",
  "serong",
  "seronok",
  "seroplastik",
  "seropot",
  "serositas",
  "serosoh",
  "serot",
  "seroyong",
  "serpentina",
  "serpih",
  "sersan",
  "serse",
  "sersi",
  "serta",
  "sertifikasi",
  "sertifikat",
  "sertu",
  "seru",
  "seruak",
  "seruas",
  "seruda",
  "serudi",
  "seruduk",
  "serugah",
  "serugat",
  "seruh",
  "serui",
  "seruit",
  "seruk",
  "serul",
  "seruling",
  "serum",
  "serumat",
  "serumen",
  "serumpu",
  "serun",
  "serunai",
  "serunda",
  "serundang",
  "serundeng",
  "seruni",
  "serunjang",
  "seruntun",
  "serupih",
  "seruput",
  "seruru",
  "serut",
  "serutu",
  "seruyuk",
  "servis",
  "sesah",
  "sesai",
  "sesaing",
  "sesajen",
  "sesak",
  "sesal",
  "sesam",
  "sesamoid",
  "sesanti",
  "sesap",
  "sesar",
  "sesat",
  "sesawi",
  "sesenap",
  "seser",
  "sesi",
  "sesil",
  "sesira",
  "sesium",
  "sesoca",
  "sespan",
  "sestina",
  "sesuai",
  "sesuatu",
  "sesumbar",
  "set",
  "seta",
  "setabelan",
  "setagen",
  "setai",
  "setaka",
  "setakona",
  "setal",
  "setambun",
  "setan",
  "setana",
  "setang",
  "setangan",
  "setanggi",
  "setapak",
  "setaria",
  "setat",
  "setawar",
  "setebal",
  "seteger",
  "seteheng",
  "setek",
  "seteker",
  "setel",
  "setela",
  "seteleng",
  "setem",
  "setempel",
  "seten",
  "setenggar",
  "seter",
  "seteranah",
  "seteru",
  "setewel",
  "seti",
  "setia",
  "setiabu",
  "setiar",
  "setiga",
  "setik",
  "setin",
  "setinggi",
  "setip",
  "setir",
  "setirman",
  "setiwel",
  "setoka",
  "setokin",
  "setolop",
  "setom",
  "seton",
  "setop",
  "setoples",
  "setor",
  "setori",
  "setoter",
  "setra",
  "setrap",
  "setrat",
  "setren",
  "setreng",
  "setrik",
  "setrika",
  "setrimin",
  "setrip",
  "setruk",
  "setrum",
  "setrup",
  "setti",
  "setu",
  "setuil",
  "setum",
  "setung",
  "setup",
  "seturi",
  "seturu",
  "seudati",
  "sewa",
  "sewah",
  "sewaka",
  "sewal",
  "sewar",
  "sewat",
  "sewot",
  "sewu",
  "sfenoidal",
  "sferoid",
  "sferometer",
  "sfigmograf",
  "sfigmomanometer",
  "sfikmograf",
  "sfingofili",
  "sfingter",
  "sfinks",
  "sia",
  "siaga",
  "siah",
  "siak",
  "siakap",
  "siakon",
  "sial",
  "sialang",
  "sialit",
  "siam",
  "siamang",
  "sian",
  "sianamida",
  "sianang",
  "siang",
  "sianggit",
  "sianida",
  "sianometer",
  "sianometri",
  "sianosis",
  "siantan",
  "siap",
  "siap-sedia",
  "siap-siaga",
  "siapa",
  "siapuh",
  "siar",
  "siarah",
  "siarat",
  "siasat",
  "siat",
  "siau",
  "sibak",
  "sibar",
  "sibernetika",
  "sibilan",
  "sibir",
  "sibuk",
  "sibur",
  "sibusuk",
  "sice",
  "sicerek",
  "sida",
  "sidai",
  "sidamukti",
  "sidang",
  "sidat",
  "siderit",
  "sidi",
  "sidik",
  "siding",
  "sidomukti",
  "sidratulmuntaha",
  "siduga",
  "siduk",
  "sif",
  "sifat",
  "sifatullah",
  "sifer",
  "sifilis",
  "sifilobia",
  "sifiloid",
  "sifir",
  "sifon",
  "sigai",
  "sigak",
  "sigando",
  "sigap",
  "sigar",
  "sigaret",
  "sigasir",
  "sigenting",
  "siger",
  "sigi",
  "sigilografi",
  "sigma",
  "signifikan",
  "signifikansi",
  "signifikasi",
  "sigot",
  "sigung",
  "sih",
  "sihir",
  "sijik",
  "sijil",
  "sika",
  "sikah",
  "sikai",
  "sikak",
  "sikap",
  "sikari",
  "sikas",
  "sikat",
  "sikedempung",
  "sikeras",
  "sikik",
  "sikikih",
  "sikin",
  "sikit",
  "siklik",
  "siklis",
  "sikloid",
  "siklon",
  "sikloparafin",
  "siklotron",
  "siklus",
  "siksa",
  "siku",
  "sikudidi",
  "sikudomba",
  "sikut",
  "sil",
  "sila",
  "silabel",
  "silabis",
  "silabus",
  "silah",
  "silalatu",
  "silam",
  "silampukau",
  "silang",
  "silap",
  "silara",
  "silase",
  "silat",
  "silaturahmi",
  "silau",
  "silengah",
  "silet",
  "silih",
  "silik",
  "silika",
  "silikat",
  "silikon",
  "silikona",
  "silikosis",
  "silinder",
  "silindris",
  "silindroid",
  "silir",
  "silium",
  "silo",
  "silogisme",
  "silok",
  "silologi",
  "silometer",
  "siloptik",
  "silsilah",
  "silt",
  "silu",
  "siluet",
  "siluk",
  "siluman",
  "silungkang",
  "silvika",
  "silvikultur",
  "silvisida",
  "simak",
  "simalakama",
  "simalu",
  "simaung",
  "simbah",
  "simbai",
  "simbang",
  "simbar",
  "simbat",
  "simbion",
  "simbiosis",
  "simbiotis",
  "simbiou",
  "simbok",
  "simbol",
  "simbolis",
  "simbolisme",
  "simbukan",
  "simbur",
  "simetri",
  "simetris",
  "simfisis",
  "simfoni",
  "simifisis",
  "simile",
  "simpai",
  "simpak",
  "simpan",
  "simpang",
  "simpang-siur",
  "simpanse",
  "simpat",
  "simpati",
  "simpatik",
  "simpatisan",
  "simpel",
  "simpetal",
  "simping",
  "simpir",
  "simpleks",
  "simplifikasi",
  "simplistis",
  "simposium",
  "simpuh",
  "simpuk",
  "simpul",
  "simpur",
  "simtom",
  "simtomatis",
  "simtomatologi",
  "simulasi",
  "simulator",
  "simulfiks",
  "simultan",
  "simuntu",
  "sin",
  "sinaga",
  "sinagoga",
  "sinagoge",
  "sinambung",
  "sinanaga",
  "sinansari",
  "sinar",
  "sinatan",
  "sinau",
  "sinawar",
  "sindap",
  "sinden",
  "sinder",
  "sindeton",
  "sindikalisme",
  "sindikasi",
  "sindikat",
  "sindir",
  "sindrom",
  "sindur",
  "sineas",
  "sinekdoke",
  "sinektika",
  "sinema",
  "sinemapleks",
  "sinemaskop",
  "sinematik",
  "sinematograf",
  "sinematografi",
  "sinematografis",
  "sinemikrografik",
  "sineol",
  "sinepleks",
  "sinergi",
  "sinergis",
  "sinergisme",
  "sineskop",
  "sinestesia",
  "sinetron",
  "sing",
  "singa",
  "singahak",
  "singelar",
  "singga",
  "singgah",
  "singgan",
  "singgang",
  "singgasana",
  "singgel",
  "singgir",
  "singgit",
  "singgul",
  "singgung",
  "singit",
  "singkak",
  "singkang",
  "singkap",
  "singkat",
  "singkeh",
  "singkek",
  "singkil",
  "singkir",
  "singkong",
  "singkup",
  "singkur",
  "singlet",
  "singsat",
  "singse",
  "singset",
  "singsing",
  "singularis",
  "singulum",
  "singulun",
  "singunen",
  "sini",
  "sinis",
  "sinisme",
  "sinjang",
  "sinklin",
  "sinkonina",
  "sinkope",
  "sinkretis",
  "sinkretisasi",
  "sinkretisme",
  "sinkron",
  "sinkronis",
  "sinkronisasi",
  "sinkronisme",
  "sinode",
  "sinolog",
  "sinologi",
  "sinom",
  "sinoman",
  "sinonim",
  "sinonimi",
  "sinopsis",
  "sinoptis",
  "sinovia",
  "sinovial",
  "sinovitas",
  "sinovitis",
  "sinrili",
  "sinse",
  "sintagma",
  "sintagmatis",
  "sintaksis",
  "sintaktis",
  "sintal",
  "sintar",
  "sintas",
  "sinter",
  "sinterklas",
  "sintese",
  "sintesis",
  "sintetik",
  "sintetis",
  "sinting",
  "sintir",
  "sintonik",
  "sintren",
  "sintua",
  "sintuk",
  "sintulang",
  "sintung",
  "sinu",
  "sinuhun",
  "sinus",
  "sinusal",
  "sinusitis",
  "sinusoid",
  "sinyal",
  "sinyalemen",
  "sinyalir",
  "sinyo",
  "sinyokolas",
  "sio",
  "sioca",
  "siong",
  "siongka",
  "sip",
  "sipahi",
  "sipai",
  "sipangkalan",
  "sipat",
  "sipatung",
  "sipedas",
  "sipesan",
  "sipi",
  "sipil",
  "sipir",
  "sipit",
  "sipolan",
  "sipongang",
  "sipu",
  "sipulut",
  "siput",
  "sir",
  "sira",
  "sirah",
  "siram",
  "sirangkak",
  "sirap",
  "sirat",
  "siratalmustakim",
  "siraut",
  "sirene",
  "sirep",
  "siri",
  "siriasis",
  "sirib",
  "sirih",
  "sirik",
  "siring",
  "siringitis",
  "sirip",
  "sirkam",
  "sirke",
  "sirkol",
  "sirkuit",
  "sirkulasi",
  "sirkuler",
  "sirkumfiks",
  "sirkumfleks",
  "sirkus",
  "sirlak",
  "sirna",
  "sirokumulus",
  "sirop",
  "sirostratus",
  "sirsak",
  "siru",
  "sirup",
  "sirus",
  "sis",
  "sisa",
  "sisal",
  "sisalak",
  "sisi",
  "sisih",
  "sisik",
  "sisip",
  "sisir",
  "sista",
  "sistaltik",
  "sistem",
  "sistematik",
  "sistematika",
  "sistematis",
  "sistematisasi",
  "sistematisir",
  "sistemis",
  "sistemisasi",
  "sisterna",
  "sistitis",
  "sistole",
  "sistolik",
  "sisurut",
  "siswa",
  "siswi",
  "sit",
  "sita",
  "sitak",
  "sitat",
  "siter",
  "siti",
  "sitinggil",
  "sitir",
  "sitokrom",
  "sitolilis",
  "sitolisis",
  "sitologi",
  "sitoplasma",
  "sitrat",
  "sitrin",
  "sitrun",
  "situ",
  "situasi",
  "situasional",
  "situn",
  "situs",
  "siuh",
  "siuk",
  "siul",
  "siuman",
  "siung",
  "siur",
  "siut",
  "sivilisasi",
  "siwalan",
  "siwaratri",
  "siwer",
  "sizigi",
  "skafa",
  "skala",
  "skalanisasi",
  "skalar",
  "skalop",
  "skandal",
  "skandium",
  "skarifikasi",
  "skatola",
  "skatologi",
  "skedul",
  "skelet",
  "skema",
  "skematis",
  "skenario",
  "skene",
  "skeptis",
  "skeptisisme",
  "sketsa",
  "ski",
  "skiameter",
  "skiatika",
  "skilot",
  "skip",
  "skiping",
  "skisma",
  "skizofrenia",
  "skizoid",
  "sklerenkima",
  "sklerosis",
  "skleroterapi",
  "skolastik",
  "skolastikus",
  "skolastisi",
  "skolastisisme",
  "skombroid",
  "skop",
  "skopometer",
  "skor",
  "skorbut",
  "skorpio",
  "skors",
  "skorsing",
  "skrin",
  "skrining",
  "skrip",
  "skripsi",
  "skrobikulus",
  "skrotum",
  "skuadron",
  "skuas",
  "skuat",
  "skuos",
  "skuter",
  "slagorde",
  "slah",
  "slang",
  "slebor",
  "slendro",
  "sling",
  "slintat-slintut",
  "slip",
  "slof",
  "slogan",
  "smes",
  "smokel",
  "snob",
  "snobisme",
  "soak",
  "soal",
  "soang",
  "soarma",
  "soba",
  "soban",
  "sobat",
  "sobek",
  "sobok",
  "soda",
  "sodet",
  "sodium",
  "sodok",
  "sodomasosisme",
  "sodomi",
  "sodomia",
  "sodor",
  "soe",
  "sofa",
  "sofis",
  "sofisme",
  "sofistri",
  "sofitel",
  "soga",
  "sogan",
  "sogang",
  "sogo",
  "sogok",
  "sohar",
  "sohib",
  "sohor",
  "sohun",
  "soja",
  "sok",
  "soka",
  "sokah",
  "soker",
  "soket",
  "sokom",
  "sokong",
  "sol",
  "solah",
  "solak",
  "solang",
  "solanina",
  "solar",
  "solarimeter",
  "solder",
  "solek",
  "solempis",
  "solenoide",
  "solfatar",
  "solfatara",
  "solid",
  "solidaritas",
  "solider",
  "soliditas",
  "solilokui",
  "solinometer",
  "solipsisme",
  "solis",
  "soliter",
  "solo",
  "solois",
  "solok",
  "solokan",
  "solot",
  "solum",
  "solusi",
  "solvabilitas",
  "solven",
  "som",
  "soma",
  "somah",
  "somasi",
  "somatis",
  "somatomegali",
  "sombok",
  "sombol",
  "sombong",
  "sombrero",
  "someng",
  "somnambulis",
  "somnambulisme",
  "sompek",
  "sompeng",
  "somplak",
  "somplok",
  "sompoh",
  "sompok",
  "sompong",
  "sompret",
  "sonar",
  "sonata",
  "sonatina",
  "sondai",
  "sondanco",
  "sondang",
  "sondase",
  "sondek",
  "sonder",
  "sondok",
  "sondong",
  "soneta",
  "songar",
  "songel",
  "songgeng",
  "songket",
  "songkok",
  "songkro",
  "songong",
  "songsong",
  "sonik",
  "sono",
  "sonogram",
  "sonokeling",
  "sonor",
  "sonoran",
  "sontak",
  "sontek",
  "sontok",
  "sontoloyo",
  "sop",
  "sopak",
  "sopan",
  "sopek",
  "sopi",
  "sopir",
  "soporifik",
  "sopran",
  "sorak",
  "sorang",
  "sorban",
  "sorbet",
  "sore",
  "sorek",
  "soren",
  "sorgum",
  "sori",
  "sorog",
  "sorok",
  "sorong",
  "sorot",
  "sortir",
  "sosi",
  "sosial",
  "sosialis",
  "sosialisasi",
  "sosialisme",
  "sosialistis",
  "sosio",
  "sosio-kultural",
  "sosiobiolog",
  "sosiodemokrasi",
  "sosiodrama",
  "sosiokultural",
  "sosiolek",
  "sosiolinguistik",
  "sosiolog",
  "sosiologi",
  "sosiologis",
  "sosiometri",
  "sosionasional",
  "sosiopat",
  "sosis",
  "sositet",
  "sosoh",
  "sosok",
  "sosor",
  "soto",
  "sotoh",
  "sotong",
  "sotor",
  "soun",
  "sowan",
  "sowang",
  "soyak",
  "spageti",
  "spalasi",
  "span",
  "spanduk",
  "spaning",
  "sparing",
  "spasi",
  "spasial",
  "spasmodis",
  "spasmus",
  "spastik",
  "spatbor",
  "spatula",
  "spedometer",
  "spektakel",
  "spektakuler",
  "spektator",
  "spektograf",
  "spektogram",
  "spektrograf",
  "spektrogram",
  "spektrokimia",
  "spektrometer",
  "spektroskop",
  "spektrum",
  "spekuk",
  "spekulan",
  "spekulasi",
  "spekulatif",
  "spekulator",
  "speleologi",
  "spelter",
  "sperma",
  "spermaseti",
  "spermatid",
  "spermatofora",
  "spermatogenesis",
  "spermatosit",
  "spermatozoa",
  "spermatozoid",
  "spesial",
  "spesialis",
  "spesialisasi",
  "spesialistis",
  "spesies",
  "spesifik",
  "spesifikasi",
  "spesimen",
  "spidol",
  "spidometer",
  "spikul",
  "spil",
  "spina",
  "spion",
  "spionase",
  "spiral",
  "spiralisasi",
  "spirilum",
  "spirit",
  "spiritis",
  "spiritisme",
  "spiritual",
  "spiritualisasi",
  "spiritualisme",
  "spiritus",
  "spirometer",
  "spons",
  "sponsor",
  "spontan",
  "spontanitas",
  "spora",
  "sporadis",
  "sporangium",
  "sporofil",
  "sport",
  "sportif",
  "sportivitas",
  "spring",
  "sprint",
  "sprinter",
  "sputnik",
  "sputum",
  "sreg",
  "sregep",
  "srempet",
  "sri",
  "srigading",
  "srigunggu",
  "srigunting",
  "srikandi",
  "srikaya",
  "srimanganti",
  "sripah",
  "sripanggung",
  "sriti",
  "stabil",
  "stabilisasi",
  "stabilisator",
  "stabilitas",
  "stabilizer",
  "stadion",
  "stadium",
  "staf",
  "stafilitis",
  "stagnan",
  "stagnasi",
  "staking",
  "stalagmit",
  "stalagmometri",
  "stalaktit",
  "stalinisme",
  "stalon",
  "stamba",
  "stambon",
  "stambuk",
  "stambul",
  "stamen",
  "stamina",
  "stan",
  "standar",
  "standardisasi",
  "stanplat",
  "stanum",
  "stanza",
  "stapler",
  "staples",
  "start",
  "starter",
  "stasi",
  "stasioner",
  "stasis",
  "stasiun",
  "statis",
  "statistik",
  "statistika",
  "statistis",
  "stator",
  "status",
  "statuta",
  "statuter",
  "stearat",
  "stearin",
  "steatit",
  "steatosis",
  "stegodon",
  "steik",
  "stek",
  "steker",
  "stela",
  "steling",
  "stema",
  "stemma",
  "stempel",
  "sten",
  "stengun",
  "steno",
  "stenografer",
  "stenografi",
  "stenogram",
  "stensil",
  "step",
  "stepa",
  "stepler",
  "steradian",
  "stereo",
  "stereofoni",
  "stereofonik",
  "stereognosis",
  "stereograf",
  "stereografi",
  "stereoisomerisme",
  "stereokimia",
  "stereometri",
  "stereoskop",
  "stereotip",
  "stereotipikal",
  "steril",
  "sterilisasi",
  "sterilitas",
  "steroid",
  "steroidal",
  "sterol",
  "stetoskop",
  "stevador",
  "stibium",
  "stigma",
  "stigmata",
  "stik",
  "stiker",
  "stilbestrol",
  "stilir",
  "stilistika",
  "stilograf",
  "stimulan",
  "stimulans",
  "stimulasi",
  "stimulatif",
  "stimulator",
  "stimulus",
  "stipendium",
  "stipulasi",
  "stirena",
  "stoikiometri",
  "stok",
  "stokastik",
  "stoker",
  "stol",
  "stoliditas",
  "stolon",
  "stomata",
  "stomatitis",
  "stomatogastrik",
  "stomatoskop",
  "stop",
  "stoper",
  "stopkeran",
  "stopkontak",
  "stoples",
  "stori",
  "stormking",
  "strabotomi",
  "strata",
  "strategem",
  "strategi",
  "strategis",
  "stratifikasi",
  "stratigrafi",
  "strato",
  "stratokumulus",
  "stratopause",
  "stratopouse",
  "stratosfer",
  "stratum",
  "stratus",
  "streng",
  "streptokokus",
  "streptomisin",
  "stres",
  "striker",
  "strimin",
  "strip",
  "striptis",
  "stroberi",
  "strobila",
  "stroboskop",
  "stroke",
  "stromking",
  "strontium",
  "struktur",
  "struktural",
  "strukturalisasi",
  "strukturalisme",
  "struma",
  "studen",
  "studi",
  "studio",
  "stuko",
  "stupa",
  "sua",
  "suah",
  "suai",
  "suak",
  "suaka",
  "suam",
  "suami",
  "suaminda",
  "suang",
  "suangi",
  "suap",
  "suar",
  "suara",
  "suarang",
  "suargaloka",
  "suari",
  "suasa",
  "suasana",
  "suat",
  "suatu",
  "sub",
  "subak",
  "subal",
  "subam",
  "suban",
  "subang",
  "subbab",
  "subbagian",
  "subdirektorat",
  "subentri",
  "suberat",
  "suberin",
  "subetnik",
  "subfilum",
  "subgeneralisasi",
  "subgenus",
  "subhana",
  "subhanallah",
  "subhat",
  "subirigasi",
  "subjek",
  "subjektif",
  "subjektivisme",
  "subkategorisasi",
  "subkelas",
  "subklas",
  "subkontraktor",
  "subkultur",
  "sublema",
  "subletal",
  "sublim",
  "sublimasi",
  "sublimat",
  "submarine",
  "submukosa",
  "subordinasi",
  "subordinat",
  "suborganisasi",
  "subsider",
  "subsidi",
  "subskrip",
  "subsonik",
  "substandar",
  "substansi",
  "substansial",
  "substantif",
  "substitusi",
  "substitutif",
  "substrat",
  "subtil",
  "subtonik",
  "subtropik",
  "subuco",
  "subuh",
  "subunit",
  "subur",
  "subversi",
  "subversif",
  "subyek",
  "subyektif",
  "subyektivisme",
  "suceng",
  "suci",
  "suda",
  "sudah",
  "sudet",
  "sudi",
  "sudip",
  "sudoriferus",
  "sudra",
  "sudu",
  "suduayah",
  "suduk",
  "sudung",
  "sudut",
  "suf",
  "sufah",
  "sufal",
  "sufi",
  "sufiks",
  "sufisme",
  "sufrah",
  "sugar",
  "sugesti",
  "sugi",
  "sugih",
  "suguh",
  "sugul",
  "sugun",
  "suh",
  "suhad",
  "suhian",
  "suhu",
  "suhuf",
  "suhun",
  "suiseki",
  "suit",
  "sujana",
  "sujen",
  "suji",
  "sujud",
  "suka",
  "sukacita",
  "sukade",
  "sukamandi",
  "sukan",
  "sukar",
  "sukarela",
  "sukaria",
  "sukat",
  "sukduf",
  "suke",
  "suket",
  "suki",
  "suklapaksa",
  "sukma",
  "sukrosa",
  "sukses",
  "suksesi",
  "suksesif",
  "suku",
  "sukuisme",
  "sukun",
  "sula",
  "sulah",
  "sulalah",
  "sulalat",
  "sulam",
  "sulang",
  "sulap",
  "sulat-sulit",
  "sulbi",
  "sulfanasi",
  "sulfanilamida",
  "sulfat",
  "sulfhidril",
  "sulfolipid",
  "sulfonamida",
  "sulfur",
  "sulfurasi",
  "suli",
  "sulih",
  "suling",
  "sulit",
  "sultan",
  "sultanat",
  "sultani",
  "suluh",
  "suluk",
  "sulung",
  "sulur",
  "sulut",
  "sum",
  "sumah",
  "sumarah",
  "sumare",
  "sumasi",
  "sumba",
  "sumbang",
  "sumbangsih",
  "sumbar",
  "sumbat",
  "sumbel",
  "sumber",
  "sumbi",
  "sumbing",
  "sumbu",
  "sumbuk",
  "sumbul",
  "sumbung",
  "sumbur",
  "sumbut",
  "sumeh",
  "sumengit",
  "sumilir",
  "sumir",
  "sumirat",
  "sumo",
  "sumpah",
  "sumpal",
  "sumpek",
  "sumpel",
  "sumping",
  "sumpit",
  "sumsum",
  "sumur",
  "sumurung",
  "sun",
  "sunah",
  "sunam",
  "sunan",
  "sunat",
  "sunatullah",
  "sunbulat",
  "sundai",
  "sundak",
  "sundal",
  "sundang",
  "sundari",
  "sundep",
  "sunduk",
  "sundul",
  "sundus",
  "sundusin",
  "sundut",
  "sungai",
  "sungga",
  "sunggi",
  "sungging",
  "sunggit",
  "sungguh",
  "sungguhpun",
  "sungil",
  "sungkah",
  "sungkai",
  "sungkal",
  "sungkan",
  "sungkap",
  "sungkawa",
  "sungkem",
  "sungkit",
  "sungkuk",
  "sungkum",
  "sungkup",
  "sungkur",
  "sungkuran",
  "sungsang",
  "sungu",
  "sungut",
  "suni",
  "sunjam",
  "sunti",
  "suntiabu",
  "suntih",
  "suntik",
  "sunting",
  "suntuk",
  "sunu",
  "sunukung",
  "sunyata",
  "sunyi",
  "sup",
  "supa",
  "supai",
  "supaya",
  "supel",
  "super",
  "superblok",
  "supercepat",
  "superfisial",
  "superfosfat",
  "superheterodin",
  "superinfeksi",
  "superintenden",
  "superior",
  "superioritas",
  "superjet",
  "superkomputer",
  "superkonduktivitas",
  "superkonduktor",
  "superlatif",
  "superlativisme",
  "superlunar",
  "supermarket",
  "supermen",
  "supernatural",
  "supernova",
  "superskrip",
  "superskripsi",
  "supersonik",
  "superstar",
  "superstruktur",
  "supervisi",
  "supervisor",
  "suplai",
  "suplemen",
  "suplementasi",
  "suplesi",
  "supletoar",
  "suporter",
  "suportif",
  "supra",
  "supraalami",
  "suprafiks",
  "supramolekuler",
  "supranasional",
  "suprarene",
  "suprarenoma",
  "suprasasti",
  "suprasegmental",
  "supremasi",
  "supresif",
  "supresor",
  "surah",
  "surahi",
  "surai",
  "suralaya",
  "suraloka",
  "suram",
  "surat",
  "surati",
  "surau",
  "suraya",
  "surealis",
  "surealisme",
  "suren",
  "surfaktan",
  "surga",
  "surgaloka",
  "surgawi",
  "suri",
  "surian",
  "surih",
  "surili",
  "surjan",
  "surogat",
  "surplus",
  "suruh",
  "suruk",
  "surup",
  "surut",
  "survei",
  "surya",
  "suryakanta",
  "suryani",
  "sus",
  "susah",
  "susastra",
  "suseptibilitas",
  "susila",
  "susilat",
  "suspender",
  "suspensi",
  "suster",
  "susu",
  "susuh",
  "susuk",
  "susul",
  "susun",
  "susung",
  "susup",
  "susur",
  "susut",
  "sut",
  "sutan",
  "suten",
  "sutil",
  "sutra",
  "sutradara",
  "sutura",
  "suul",
  "suun",
  "suuzan",
  "suvenir",
  "suwarnabumi",
  "suwarnadwipa",
  "suwir",
  "suwita",
  "svedberg",
  "swa",
  "swabakar",
  "swabela",
  "swadana",
  "swadarma",
  "swadaya",
  "swadesi",
  "swadidik",
  "swadisiplin",
  "swagriya",
  "swahara",
  "swaharga",
  "swaimbas",
  "swak",
  "swakaji",
  "swakarsa",
  "swakarya",
  "swakelola",
  "swakendali",
  "swakontradiksi",
  "swalayan",
  "swanama",
  "swanggi",
  "swapraja",
  "swarabakti",
  "swasembada",
  "swasensor",
  "swasraya",
  "swasta",
  "swastanisasi",
  "swastiastu",
  "swastika",
  "swatabur",
  "swatantra",
  "swausaha",
  "sweter",
  "swike",
  "swimpak",
  "swipoa",
  "syabah",
  "syabas",
  "syafaat",
  "syafakat",
  "syafii",
  "syah",
  "syahadat",
  "syahadatain",
  "syahbandar",
  "syahda",
  "syahdan",
  "syahdu",
  "syahid",
  "syahriah",
  "syahsiah",
  "syahwat",
  "syair",
  "syairi",
  "syajar",
  "syajarah",
  "syak",
  "syaka",
  "syakban",
  "syakduf",
  "syakhsi",
  "syakir",
  "syal",
  "syala",
  "syam",
  "syamali",
  "syaman",
  "syamanisme",
  "syamsi",
  "syamsiah",
  "syamsir",
  "syamsu",
  "syantung",
  "syar",
  "syarab",
  "syarah",
  "syarak",
  "syarat",
  "syarbat",
  "syarekat",
  "syariat",
  "syarif",
  "syarifah",
  "syarik",
  "syarikat",
  "syatar",
  "syaulam",
  "syawal",
  "syeir",
  "syekh",
  "syeti",
  "syiar",
  "syikak",
  "syin",
  "syirik",
  "syiwa",
  "syiwaratri",
  "syogun",
  "syok",
  "syubhat",
  "syuhada",
  "syukur",
  "syumuliah",
  "syur",
  "syura",
  "syurah",
  "syuriah",
  "syuruk",
  "syuting",
  "taajul",
  "taala",
  "taaruf",
  "taasub",
  "taat",
  "taawud",
  "taazur",
  "tabah",
  "tabak",
  "tabal",
  "taban",
  "tabar-tabar",
  "tabarak",
  "tabaruk",
  "tabayun",
  "tabe",
  "tabel",
  "tabela",
  "tabelaris",
  "tabernakel",
  "tabia",
  "tabiat",
  "tabib",
  "tabii",
  "tabiin",
  "tabik",
  "tabir",
  "tablet",
  "tablig",
  "tablo",
  "tabloid",
  "tabo",
  "tabok",
  "tabrak",
  "tabu",
  "tabuh",
  "tabuhan",
  "tabula",
  "tabulasi",
  "tabulator",
  "tabulatur",
  "tabun",
  "tabung",
  "tabur",
  "tabut",
  "tabzir",
  "taci",
  "tadabur",
  "tadah",
  "tadaruk",
  "tadarus",
  "tadbir",
  "tadi",
  "tadir",
  "tadung",
  "tadwin",
  "taekwondo",
  "taeniasis",
  "taf",
  "tafadal",
  "tafahus",
  "tafakur",
  "tafeta",
  "tafsir",
  "tagak",
  "tagal",
  "tagan",
  "tagar",
  "tageh",
  "tagih",
  "tago",
  "tagut",
  "tahajud",
  "tahak",
  "tahal",
  "tahalul",
  "tahan",
  "tahana",
  "tahang",
  "tahap",
  "tahar",
  "taharah",
  "tahbis",
  "tahi",
  "tahiat",
  "tahil",
  "tahir",
  "tahkik",
  "tahkim",
  "tahlil",
  "tahmid",
  "tahniah",
  "tahnik",
  "tahsil",
  "tahu",
  "tahun",
  "taib",
  "taifun",
  "taiga",
  "taiko",
  "taipan",
  "tais",
  "taiso",
  "taja",
  "tajak",
  "tajali",
  "tajam",
  "tajarud",
  "tajau",
  "tajdid",
  "tajen",
  "taji",
  "tajin",
  "tajnis",
  "tajribah",
  "taju",
  "tajuk",
  "tajung",
  "tajur",
  "tajusalatin",
  "tajwid",
  "tak",
  "takabur",
  "takaful",
  "takah",
  "takak",
  "takal",
  "takang-takik",
  "takar",
  "takarir",
  "takarub",
  "takat",
  "takbir",
  "takbiratulihram",
  "takdim",
  "takdir",
  "takdis",
  "takeh",
  "takel",
  "takeyari",
  "takhayul",
  "takhlik",
  "takhsis",
  "takhta",
  "taki",
  "takigrafi",
  "takik",
  "takimeter",
  "takir",
  "takisme",
  "takjil",
  "takjub",
  "taklid",
  "taklif",
  "taklik",
  "taklikat",
  "taklim",
  "taklimat",
  "takluk",
  "takma",
  "takmurni",
  "takoah",
  "takol",
  "takometer",
  "takraw",
  "takrif",
  "takrim",
  "takrir",
  "taksa",
  "taksasi",
  "taksem",
  "taksi",
  "taksidermi",
  "taksimeter",
  "taksin",
  "taksir",
  "taksologi",
  "takson",
  "taksonomi",
  "taktik",
  "taktil",
  "taktis",
  "takuh",
  "takuk",
  "takung",
  "takur",
  "takut",
  "takwa",
  "takwil",
  "takwim",
  "takwin",
  "takyin",
  "takziah",
  "takzim",
  "takzir",
  "tal",
  "tala",
  "talabiah",
  "talah",
  "talak",
  "talam",
  "talang",
  "talar",
  "talas",
  "talasemia",
  "talasofit",
  "talbiah",
  "talek",
  "talempong",
  "talen",
  "talenan",
  "talenta",
  "tali",
  "talib",
  "talibun",
  "talium",
  "talk",
  "talkin",
  "talon",
  "talu",
  "talun",
  "talupuh",
  "talut",
  "tam",
  "tamadun",
  "tamah",
  "tamak",
  "tamam",
  "taman",
  "tamar",
  "tamarinda",
  "tamasya",
  "tamat",
  "tamatulkalam",
  "tambah",
  "tambak",
  "tambakan",
  "tambal",
  "tamban",
  "tambang",
  "tambar",
  "tambat",
  "tamber",
  "tambera",
  "tambi",
  "tambo",
  "tamborin",
  "tambuh",
  "tambul",
  "tambun",
  "tambung",
  "tambur",
  "tambus",
  "tameng",
  "tamimah",
  "tampah",
  "tampak",
  "tampal",
  "tampan",
  "tampang",
  "tampar",
  "tampas",
  "tampel",
  "tampi",
  "tampik",
  "tampil",
  "tampin",
  "tamping",
  "tampon",
  "tamponade",
  "tampuk",
  "tampung",
  "tampus",
  "tamsil",
  "tamtam",
  "tamtama",
  "tamu",
  "tamuk",
  "tamyiz",
  "tan",
  "tanah",
  "tanai",
  "tanak",
  "tanam",
  "tanang",
  "tanau",
  "tanazul",
  "tanbiat",
  "tanbihat",
  "tancang",
  "tancap",
  "tanda",
  "tandak",
  "tandan",
  "tandang",
  "tandas",
  "tandem",
  "tandik",
  "tandikat",
  "tandil",
  "tanding",
  "tandon",
  "tandu",
  "tanduk",
  "tandun",
  "tandur",
  "tandus",
  "tanfiziah",
  "tang",
  "tangan",
  "tangap",
  "tangar",
  "tangas",
  "tangeh",
  "tangen",
  "tangga",
  "tanggah",
  "tanggal",
  "tanggam",
  "tanggang",
  "tanggap",
  "tanggar",
  "tanggetong",
  "tangguh",
  "tangguk",
  "tanggul",
  "tanggulang",
  "tanggung",
  "tangis",
  "tangkah",
  "tangkai",
  "tangkaian",
  "tangkal",
  "tangkap",
  "tangkar",
  "tangkas",
  "tangki",
  "tangkil",
  "tangkis",
  "tangkue",
  "tangkuk",
  "tangkul",
  "tangkup",
  "tangkur",
  "tangkut",
  "tanglung",
  "tango",
  "tangsa",
  "tangsel",
  "tangsi",
  "tani",
  "tania",
  "tanin",
  "tanjak",
  "tanji",
  "tanjidor",
  "tanju",
  "tanjul",
  "tanjung",
  "tanjur",
  "tank",
  "tanker",
  "tanpa",
  "tansi",
  "tantang",
  "tante",
  "tanti",
  "tantiem",
  "tantrisme",
  "tanur",
  "tanwin",
  "tanwir",
  "tanwujud",
  "tanya",
  "tanzih",
  "tanzil",
  "taocang",
  "taoci",
  "taoco",
  "taoge",
  "taoisme",
  "taoke",
  "taosi",
  "tap",
  "tapa",
  "tapai",
  "tapak",
  "tapal",
  "tapang",
  "tapestri",
  "tapi",
  "tapih",
  "tapin",
  "tapioka",
  "tapir",
  "tapis",
  "taplak",
  "taprofit",
  "taptibau",
  "taptu",
  "tapui",
  "tapuk",
  "tapung",
  "tapus",
  "tar",
  "tara",
  "taraf",
  "tarah",
  "tarak",
  "taraksasin",
  "taram",
  "tarang",
  "tarantisme",
  "tarantula",
  "tarap",
  "taraqi",
  "tarasul",
  "tarawangsa",
  "tarawih",
  "tarbiah",
  "tarbil",
  "tarbus",
  "tarcis",
  "tarekat",
  "target",
  "tarhim",
  "tari",
  "tarif",
  "tarik",
  "tarikat",
  "tarikh",
  "taring",
  "taris",
  "tarjih",
  "tarkas",
  "tarling",
  "tarmak",
  "tarpaulin",
  "tarsus",
  "tartar",
  "tartil",
  "tartir",
  "tartrat",
  "taruh",
  "taruk",
  "taruko",
  "tarum",
  "tarung",
  "tarup",
  "tarzan",
  "tas",
  "tasa",
  "tasai",
  "tasak",
  "tasalsul",
  "tasamuh",
  "tasaruf",
  "tasawuf",
  "tasbeh",
  "tasbih",
  "tasdik",
  "tasel",
  "tashih",
  "tasik",
  "taslim",
  "tasmik",
  "tasrif",
  "tasrih",
  "taswir",
  "tasyahud",
  "tasyakur",
  "tasyaum",
  "tasyayuh",
  "tasybih",
  "tasydid",
  "tasyhid",
  "tasyrih",
  "tasyrik",
  "tata",
  "tataganing",
  "tatah",
  "tatai",
  "tatak",
  "tatal",
  "tatami",
  "tatanan",
  "tatang",
  "tatap",
  "tatar",
  "tatih",
  "tating",
  "tatkala",
  "tato",
  "tau",
  "taubat",
  "taucang",
  "taufah",
  "taufik",
  "tauhid",
  "tauhidiah",
  "tauke",
  "taul",
  "tauliah",
  "taun",
  "taung",
  "taur",
  "taurat",
  "tauret",
  "taurus",
  "taut",
  "tautofoni",
  "tautologi",
  "tautomerisme",
  "tautonimi",
  "tautonomi",
  "tawa",
  "tawadu",
  "tawaduk",
  "tawaf",
  "tawajuh",
  "tawak",
  "tawakal",
  "tawan",
  "tawang",
  "tawar",
  "tawarik",
  "tawaruk",
  "tawas",
  "tawasul",
  "tawes",
  "tawon",
  "tawur",
  "tayamum",
  "tayang",
  "tayib",
  "tayibah",
  "tayub",
  "tayum",
  "tazkirah",
  "tean",
  "teater",
  "teatris",
  "tebah",
  "tebak",
  "tebal",
  "teban",
  "tebang",
  "tebar",
  "tebas",
  "tebat",
  "tebeng",
  "teberau",
  "tebing",
  "tebok",
  "tebon",
  "tebu",
  "tebuhar",
  "tebuk",
  "tebung",
  "tebus",
  "tedak",
  "tedarus",
  "tedas",
  "tedeng",
  "tedong",
  "teduh",
  "tedung",
  "tefrit",
  "tega",
  "tegah",
  "tegak",
  "tegal",
  "tegang",
  "tegap",
  "tegar",
  "tegari",
  "tegarun",
  "tegas",
  "tegel",
  "tegil",
  "tegmen",
  "teguh",
  "teguk",
  "tegun",
  "tegur",
  "teh",
  "teisme",
  "teja",
  "teji",
  "teka",
  "tekaan",
  "tekad",
  "tekah",
  "tekak",
  "tekalak",
  "tekam",
  "tekan",
  "tekang",
  "tekap",
  "tekar",
  "tekat",
  "tekek",
  "tekel",
  "teken",
  "teker",
  "teki",
  "tekidanto",
  "tekik",
  "tekis",
  "teklek",
  "teklok",
  "teknifon",
  "teknik",
  "teknikus",
  "teknis",
  "teknisi",
  "teknokrasi",
  "teknokrat",
  "teknokratik",
  "teknokratisme",
  "teknologi",
  "teknonim",
  "teknonimi",
  "teko",
  "tekoan",
  "tekoh",
  "tekokak",
  "tekong",
  "tekor",
  "tekoran",
  "tekpi",
  "teks",
  "tekstil",
  "tekstur",
  "tekstural",
  "tekte",
  "tektek",
  "tektit",
  "tektogenesa",
  "tektonik",
  "tektonis",
  "tektum",
  "tekua",
  "tekuk",
  "tekukur",
  "tekun",
  "tekung",
  "tekur",
  "tel",
  "tela",
  "telaah",
  "telabang",
  "telabat",
  "telacak",
  "teladan",
  "teladas",
  "telaga",
  "telah",
  "telajak",
  "telak",
  "telakup",
  "telampung",
  "telan",
  "telancang",
  "telang",
  "telangkai",
  "telangkup",
  "telanjang",
  "telanjur",
  "telantar",
  "telap",
  "telapak",
  "telas",
  "telat",
  "telatah",
  "telatap",
  "telaten",
  "telau",
  "tele",
  "telearsika",
  "teledek",
  "teledor",
  "teledrama",
  "telefon",
  "telefoni",
  "telefoto",
  "telegenik",
  "telegraf",
  "telegrafi",
  "telegrafis",
  "telegram",
  "telegrap",
  "telekan",
  "telekap",
  "telekinesis",
  "telekomedi",
  "telekomunikasi",
  "teleks",
  "teleku",
  "telekung",
  "telelensa",
  "telemeter",
  "telemetri",
  "telempap",
  "telempong",
  "teleng",
  "telenovela",
  "telentang",
  "teleologi",
  "teleost",
  "telepati",
  "telepok",
  "telepon",
  "teleprinter",
  "telepromter",
  "telepuk",
  "teler",
  "telerang",
  "teles",
  "teleskop",
  "telestesia",
  "televisi",
  "telgram",
  "telik",
  "telikung",
  "telimpuh",
  "telinak",
  "telinga",
  "telingkah",
  "telingkung",
  "teliti",
  "telmotofit",
  "telop",
  "telor",
  "telotak",
  "telpon",
  "teluh",
  "teluk",
  "teluki",
  "telungkup",
  "telunjuk",
  "telur",
  "telurat",
  "telurit",
  "telus",
  "telusuk",
  "telusur",
  "telut",
  "telutuh",
  "telutur",
  "telutut",
  "tem",
  "tema",
  "temaah",
  "temabur",
  "temaha",
  "temahak",
  "temak",
  "temalang",
  "temali",
  "teman",
  "temangau",
  "temangga",
  "temanten",
  "temara",
  "temaram",
  "temas",
  "tematik",
  "tematis",
  "tematisasi",
  "temayun",
  "tembadau",
  "tembaga",
  "tembak",
  "tembakang",
  "tembakau",
  "tembakul",
  "tembam",
  "tembang",
  "tembarau",
  "tembatar",
  "tembatu",
  "tembek",
  "tembekar",
  "tembel",
  "tembelang",
  "tembelian",
  "tembeliung",
  "tembelok",
  "tembem",
  "tembera",
  "temberam",
  "temberang",
  "temberas",
  "temberek",
  "tembereng",
  "temberih",
  "temberos",
  "tembesu",
  "tembiang",
  "tembikai",
  "tembikar",
  "tembilang",
  "tembilar",
  "tembiring",
  "tembis",
  "tembok",
  "tembolok",
  "tembong",
  "tembosa",
  "tembra",
  "tembu",
  "tembuk",
  "tembuku",
  "tembung",
  "tembuni",
  "tembus",
  "tembusu",
  "temegun",
  "temeh",
  "temengalan",
  "temenggung",
  "temenung",
  "temesar",
  "temetu",
  "temiang",
  "temilang",
  "temin",
  "temokus",
  "temoleh",
  "tempa",
  "tempah",
  "tempala",
  "tempan",
  "tempang",
  "tempap",
  "tempat",
  "tempaus",
  "tempawak",
  "tempawan",
  "tempayak",
  "tempayan",
  "tempayung",
  "tempe",
  "tempek",
  "tempel",
  "tempelak",
  "tempeleng",
  "temperamen",
  "temperamental",
  "temperas",
  "temperatur",
  "temperau",
  "tempiar",
  "tempias",
  "tempik",
  "tempilai",
  "tempinah",
  "tempinis",
  "templek",
  "templok",
  "tempo",
  "tempoh",
  "tempolong",
  "temponek",
  "tempong",
  "temporal",
  "temporer",
  "tempoyak",
  "tempoyan",
  "tempua",
  "tempuh",
  "tempui",
  "tempuling",
  "tempunai",
  "tempunik",
  "tempur",
  "tempurung",
  "tempus",
  "tempuyung",
  "temu",
  "temucut",
  "temukut",
  "temungkul",
  "temuras",
  "temurat",
  "temut-temut",
  "tenaga",
  "tenahak",
  "tenak",
  "tenam",
  "tenang",
  "tenar",
  "tenat",
  "tenda",
  "tendang",
  "tendas",
  "tendensi",
  "tendensius",
  "tender",
  "tendinitis",
  "tendo",
  "tendon",
  "tener",
  "teng",
  "tengadah",
  "tengah",
  "tengak",
  "tengalan",
  "tengar",
  "tengara",
  "tengas",
  "tenggadai",
  "tenggak",
  "tenggala",
  "tenggalung",
  "tenggan",
  "tenggang",
  "tenggara",
  "tenggarang",
  "tenggat",
  "tenggayun",
  "tenggayung",
  "tenggehem",
  "tenggek",
  "tenggelam",
  "tengger",
  "tenggiling",
  "tenggiri",
  "tenggiring",
  "tenggok",
  "tenggorok",
  "tengguli",
  "tengik",
  "tengil",
  "tengkalak",
  "tengkalang",
  "tengkaluk",
  "tengkam",
  "tengkang",
  "tengkar",
  "tengkarah",
  "tengkarap",
  "tengkaras",
  "tengkawang",
  "tengkek",
  "tengkel",
  "tengkelek",
  "tengker",
  "tengkerong",
  "tengkes",
  "tengking",
  "tengkoh",
  "tengkolok",
  "tengkorak",
  "tengku",
  "tengkujuh",
  "tengkuk",
  "tengkulak",
  "tengkuluk",
  "tengkurap",
  "tengkuyung",
  "tengok",
  "tengteng",
  "tengu",
  "tenis",
  "tenjet",
  "tenok",
  "tenong",
  "tenor",
  "tensi",
  "tentakel",
  "tentamen",
  "tentang",
  "tentara",
  "tentatif",
  "tentawan",
  "tenteng",
  "tenteram",
  "tentir",
  "tentu",
  "tenuk",
  "tenun",
  "tenung",
  "teodolit",
  "teokrasi",
  "teokratis",
  "teolog",
  "teologi",
  "teologis",
  "teoretikus",
  "teoretis",
  "teori",
  "teorisasi",
  "teosofi",
  "teosofis",
  "tepa",
  "tepak",
  "tepam",
  "tepas",
  "tepat",
  "tepeh",
  "tepek",
  "tepekong",
  "teperam",
  "tepes",
  "tepet",
  "tepi",
  "tepik",
  "tepis",
  "teplok",
  "tepo",
  "tepok",
  "tepos",
  "teptibau",
  "tepu",
  "tepuk",
  "tepung",
  "tepurang",
  "tepus",
  "ter",
  "tera",
  "teracak",
  "terada",
  "terajam",
  "teraju",
  "terak",
  "terakota",
  "terakup",
  "teral",
  "terala",
  "terali",
  "teraling",
  "teramisin",
  "terampil",
  "teran",
  "teranas",
  "terang",
  "terap",
  "terapang",
  "terapeutik",
  "terapi",
  "terarium",
  "teras",
  "terasi",
  "teraso",
  "terasul",
  "teratai",
  "teratak",
  "teratap",
  "teratologi",
  "teratu",
  "terau",
  "terawang",
  "teraweh",
  "terban",
  "terbang",
  "terbis",
  "terbit",
  "terbium",
  "terbul",
  "terbut",
  "terein",
  "terem",
  "terenang",
  "terendak",
  "terenen",
  "terentang",
  "terenyuh",
  "teres",
  "teret",
  "teretet",
  "teri",
  "teriak",
  "teriba",
  "terigu",
  "terik",
  "terika",
  "terikit",
  "teriko",
  "terima",
  "terin",
  "terindil",
  "tering",
  "teripang",
  "terista",
  "teritih",
  "teritik",
  "teritip",
  "teritis",
  "teritorial",
  "teritorium",
  "teriujung",
  "terjal",
  "terjang",
  "terjemah",
  "terjun",
  "terka",
  "terkadang",
  "terkam",
  "terkap",
  "terkul",
  "terkup",
  "terlak",
  "terlalu",
  "terlut",
  "term",
  "termaestesia",
  "termal",
  "termin",
  "terminal",
  "terminasi",
  "terminografi",
  "terminologi",
  "termion",
  "termionika",
  "termistor",
  "termodinamika",
  "termodinamis",
  "termoelektris",
  "termoelektrisitas",
  "termofili",
  "termofilik",
  "termofosforesens",
  "termograf",
  "termogram",
  "termohigrograf",
  "termokimia",
  "termoklin",
  "termolabil",
  "termolisis",
  "termolistrik",
  "termoluminesens",
  "termometer",
  "termonuklir",
  "termoplastik",
  "termos",
  "termosfer",
  "termostat",
  "terna",
  "ternak",
  "terobos",
  "terok",
  "teroka",
  "terombol",
  "teromol",
  "terompah",
  "terompet",
  "terondol",
  "terong",
  "terongko",
  "teropong",
  "teror",
  "teroris",
  "terorisme",
  "terowongan",
  "terpa",
  "terpal",
  "terpana",
  "terpedo",
  "terpentin",
  "tersier",
  "tertawa",
  "tertib",
  "terubuk",
  "terubus",
  "terucuk",
  "terucukan",
  "teruk",
  "terum",
  "terumba",
  "terumbu",
  "terumbuk",
  "teruna",
  "terung",
  "terungku",
  "teruntum",
  "terup",
  "terus",
  "terusi",
  "terwelu",
  "terzina",
  "tes",
  "tesaurus",
  "tesis",
  "tesmak",
  "testa",
  "testamen",
  "tester",
  "testes",
  "testikel",
  "testimonium",
  "testing",
  "testis",
  "testosteron",
  "teta",
  "tetak",
  "tetal",
  "tetampan",
  "tetamu",
  "tetangga",
  "tetanus",
  "tetap",
  "tetapi",
  "tetar",
  "tetas",
  "teteguk",
  "teteh",
  "tetek",
  "tetelan",
  "tetelo",
  "teter",
  "teterapan",
  "tetes",
  "tetibar",
  "tetibau",
  "tetikus",
  "tetirah",
  "tetiron",
  "tetoron",
  "tetra",
  "tetrahidrokanabinol",
  "tetrahidron",
  "tetraklorida",
  "tetraploid",
  "tetris",
  "tetua",
  "tetuang",
  "tewas",
  "teyan",
  "tezi",
  "theta",
  "tiada",
  "tiaga",
  "tiam",
  "tian",
  "tiang",
  "tiangui",
  "tiap",
  "tiara",
  "tiarap",
  "tib",
  "tiba",
  "tiban",
  "tidak",
  "tidur",
  "tifa",
  "tifus",
  "tiga",
  "tigari",
  "tigas",
  "tihul",
  "tijaniah",
  "tik",
  "tika",
  "tikai",
  "tikam",
  "tikar",
  "tikas",
  "tike",
  "tiket",
  "tikim",
  "tikpi",
  "tikung",
  "tikus",
  "tilam",
  "tilan",
  "tilang",
  "tilap",
  "tilas",
  "tilawah",
  "tilde",
  "tilik",
  "tim",
  "timah",
  "timang",
  "timarah",
  "timba",
  "timbal",
  "timbang",
  "timbau",
  "timbel",
  "timbil",
  "timbo",
  "timbre",
  "timbrung",
  "timbuk",
  "timbul",
  "timbun",
  "timburu",
  "timbus",
  "timi",
  "timol",
  "timpa",
  "timpal",
  "timpang",
  "timpani",
  "timpanitis",
  "timpanum",
  "timpas",
  "timpuh",
  "timpuk",
  "timpus",
  "timu-timu",
  "timun",
  "timur",
  "timus",
  "tin",
  "tindak",
  "tindan",
  "tindas",
  "tindawan",
  "tindih",
  "tindik",
  "tindis",
  "tiner",
  "ting",
  "tinggal",
  "tinggam",
  "tinggi",
  "tinggung",
  "tingi",
  "tingkah",
  "tingkal",
  "tingkalak",
  "tingkap",
  "tingkar",
  "tingkarang",
  "tingkarung",
  "tingkas",
  "tingkat",
  "tingkeb",
  "tingkis",
  "tingkrang",
  "tingkuh",
  "tingting",
  "tingtong",
  "tingtur",
  "tinja",
  "tinjak",
  "tinjau",
  "tinju",
  "tinta",
  "tinting",
  "tintir",
  "tinulat",
  "tip",
  "tipar",
  "tipe",
  "tipi",
  "tipikal",
  "tipis",
  "tipograf",
  "tipografi",
  "tipologi",
  "tipologis",
  "tipu",
  "tir",
  "tirah",
  "tirai",
  "tirakat",
  "tiram",
  "tiran",
  "tirani",
  "tiras",
  "tiraton",
  "tirau",
  "tiri",
  "tiris",
  "tirkah",
  "tiroid",
  "tiroiditis",
  "tiroksin",
  "tirta",
  "tiru",
  "tirus",
  "tis",
  "tisik",
  "tisotropi",
  "tisu",
  "titah",
  "titanium",
  "titar",
  "titel",
  "titer",
  "titi",
  "titik",
  "titilasi",
  "titimangsa",
  "titinada",
  "titip",
  "titir",
  "titis",
  "titisara",
  "titit",
  "titrasi",
  "titrimetri",
  "tituler",
  "tiung",
  "tiup",
  "tiwah",
  "tiwikrama",
  "tiwul",
  "tmesis",
  "toapekong",
  "toas",
  "tobak",
  "tobang",
  "tobat",
  "toblos",
  "toboh",
  "tobong",
  "tobralko",
  "todak",
  "todong",
  "toga",
  "togan",
  "toge",
  "togel",
  "togok",
  "toh",
  "tohok",
  "tohor",
  "toilet",
  "tok",
  "tokak",
  "tokcer",
  "toke",
  "tokek",
  "toko",
  "tokoh",
  "tokok",
  "tokong",
  "toksemia",
  "toksikogenik",
  "toksikolog",
  "toksikologi",
  "toksin",
  "toktok",
  "tol",
  "tolak",
  "tolan",
  "tolap",
  "toleh",
  "toleran",
  "toleransi",
  "tolerir",
  "tolok",
  "tolol",
  "tolong",
  "toluena",
  "tom",
  "toman",
  "tomang",
  "tomat",
  "tombak",
  "tomboi",
  "tombok",
  "tombol",
  "tombola",
  "tombong",
  "tombru",
  "tomong",
  "tompel",
  "ton",
  "tona",
  "tonase",
  "tonem",
  "tonetika",
  "tong",
  "tonggak",
  "tonggara",
  "tonggek",
  "tonggeret",
  "tonggok",
  "tonggong",
  "tonggos",
  "tongkah",
  "tongkang",
  "tongkat",
  "tongkeng",
  "tongkol",
  "tongkor",
  "tongkrong",
  "tongol",
  "tongong",
  "tongpes",
  "tongsan",
  "tongseng",
  "tongsit",
  "tongtong",
  "tonik",
  "tonikum",
  "tonil",
  "tonis",
  "tonisitas",
  "tonit",
  "tonjok",
  "tonjol",
  "tonometer",
  "tonsil",
  "tonton",
  "tonus",
  "top",
  "topan",
  "topang",
  "topas",
  "topdal",
  "topek",
  "topeng",
  "topes",
  "tophit",
  "topi",
  "topiari",
  "topik",
  "topikalisasi",
  "topikalitas",
  "topo",
  "topografi",
  "topografis",
  "topong",
  "toponimi",
  "torak",
  "toraks",
  "torani",
  "toreh",
  "torek",
  "tores",
  "torida",
  "torium",
  "tornado",
  "torne",
  "toro",
  "torpedo",
  "torpedor",
  "torsi",
  "torso",
  "tortor",
  "torus",
  "tos",
  "tosan",
  "toserba",
  "total",
  "totalisator",
  "totalitas",
  "totaliter",
  "totaliterisme",
  "totau",
  "totem",
  "totemisme",
  "totemproparte",
  "totok",
  "totol",
  "towel",
  "toya",
  "toyor",
  "tra",
  "trabekula",
  "tradisi",
  "tradisional",
  "tradisionalisme",
  "trafo",
  "tragedi",
  "tragikomedi",
  "tragis",
  "tragus",
  "trailer",
  "trakeid",
  "trakom",
  "traksi",
  "traktasi",
  "traktat",
  "traktir",
  "traktor",
  "traktus",
  "trama",
  "trampolin",
  "trans",
  "transaksi",
  "transduksi",
  "transek",
  "transeksual",
  "transenden",
  "transendental",
  "transfer",
  "transfigurasi",
  "transformasi",
  "transformasionalis",
  "transformatif",
  "transformator",
  "transfusi",
  "transgenik",
  "transisi",
  "transistor",
  "transit",
  "transitif",
  "transkrip",
  "transkripsi",
  "translasi",
  "transliterasi",
  "translokasi",
  "translusens",
  "transmigran",
  "transmigrasi",
  "transmisi",
  "transmiter",
  "transmogrifikasi",
  "transmutasi",
  "transnasional",
  "transonik",
  "transparan",
  "transparansi",
  "transpirasi",
  "transplantasi",
  "transpor",
  "transportasi",
  "transposisi",
  "transversal",
  "transvetisme",
  "trap",
  "trapesium",
  "trapezoid",
  "tras",
  "trauler",
  "trauma",
  "traumatis",
  "travesti",
  "trawler",
  "trayek",
  "trek",
  "trekbal",
  "trem",
  "trema",
  "trematoda",
  "trembesi",
  "tremer",
  "tremor",
  "tren",
  "trendi",
  "trengginas",
  "trenyuh",
  "tres",
  "tresna",
  "tri",
  "trias",
  "triatlon",
  "tribokelistrikan",
  "tribologi",
  "tribrata",
  "tribunal",
  "tribune",
  "tributa",
  "trica",
  "tridarma",
  "tridentat",
  "trienial",
  "triennale",
  "trifoliat",
  "triftong",
  "trigatra",
  "trigemius",
  "trigliserida",
  "trigonometri",
  "trigraf",
  "trihidrik",
  "trik",
  "triko",
  "trikotomi",
  "trikuspid",
  "tril",
  "trilateral",
  "trilingga",
  "trilipat",
  "triliun",
  "trilogi",
  "trilomba",
  "trim",
  "trimatra",
  "trimurti",
  "trinil",
  "trinitas",
  "trinitrotoluena",
  "trio",
  "triode",
  "trip",
  "tripartit",
  "tripleks",
  "triplet",
  "triplik",
  "tripod",
  "triprasetia",
  "trips",
  "tripsin",
  "tripsinogen",
  "triptofan",
  "triptotos",
  "trisep",
  "trisula",
  "tritunggal",
  "triturasi",
  "triumvirat",
  "trivalen",
  "trivialitas",
  "triwangsa",
  "triwindu",
  "triwulan",
  "trofi",
  "trofoblas",
  "troi",
  "troika",
  "trokanter",
  "trokea",
  "troli",
  "trombin",
  "trombon",
  "trombosis",
  "trombosit",
  "trombus",
  "tromol",
  "trompet",
  "trompong",
  "tropik",
  "tropika",
  "tropis",
  "tropisme",
  "tropopause",
  "troposfer",
  "tropus",
  "tros",
  "trotoar",
  "trubadur",
  "truf",
  "truk",
  "truntum",
  "trusa",
  "tsar",
  "tsunami",
  "tsuru",
  "tua",
  "tuah",
  "tuai",
  "tuak",
  "tual",
  "tuala",
  "tualang",
  "tuam",
  "tuan",
  "tuang",
  "tuangku",
  "tuanku",
  "tuap",
  "tuar",
  "tuarang",
  "tuas",
  "tuba",
  "tubagus",
  "tuban",
  "tube",
  "tubektomi",
  "tuberkulosis",
  "tubi",
  "tubin",
  "tubir",
  "tubruk",
  "tubuh",
  "tuding",
  "tuduh",
  "tudung",
  "tufa",
  "tufah",
  "tugal",
  "tugar",
  "tugas",
  "tugi",
  "tugu",
  "tugur",
  "tuhan",
  "tuhfah",
  "tuhfahlulajnas",
  "tuhfahtulajnas",
  "tuhfat",
  "tuhmah",
  "tuhu",
  "tuidi",
  "tuil",
  "tuit",
  "tujah",
  "tuji",
  "tuju",
  "tujuh",
  "tujul",
  "tuk",
  "tukai",
  "tukak",
  "tukal",
  "tukam",
  "tukang",
  "tukar",
  "tukas",
  "tukik",
  "tukil",
  "tukmis",
  "tuksedo",
  "tuku",
  "tukuk",
  "tukul",
  "tukun",
  "tukung",
  "tukup",
  "tula",
  "tulah",
  "tulak",
  "tulang",
  "tular",
  "tulat",
  "tule",
  "tulen",
  "tuli",
  "tulis",
  "tulium",
  "tulu",
  "tulup",
  "tulus",
  "tum",
  "tuma",
  "tuman",
  "tumang",
  "tumbakan",
  "tumbal",
  "tumbang",
  "tumbas",
  "tumben",
  "tumbu",
  "tumbuh",
  "tumbuk",
  "tumbung",
  "tumenggung",
  "tumika",
  "tumis",
  "tumit",
  "tumor",
  "tumpah",
  "tumpak",
  "tumpal",
  "tumpang",
  "tumpang-tindih",
  "tumpas",
  "tumpat",
  "tumpeng",
  "tumper",
  "tumpil",
  "tumplak",
  "tumplek",
  "tumpu",
  "tumpuk",
  "tumpul",
  "tumpur",
  "tumtam",
  "tumu",
  "tumungkul",
  "tumus",
  "tun",
  "tuna",
  "tunaaksara",
  "tunabusana",
  "tunadaksa",
  "tunaganda",
  "tunagizi",
  "tunagrahita",
  "tunai",
  "tunak",
  "tunakarya",
  "tunalaras",
  "tunam",
  "tunan",
  "tunanetra",
  "tunang",
  "tunapolitik",
  "tunarungu",
  "tunas",
  "tunasosial",
  "tunasusila",
  "tunatenaga",
  "tunawicara",
  "tunawisma",
  "tunda",
  "tundan",
  "tundang",
  "tundra",
  "tunduk",
  "tundun",
  "tundung",
  "tung",
  "tungau",
  "tunggak",
  "tunggal",
  "tungganai",
  "tunggang",
  "tunggik",
  "tungging",
  "tunggu",
  "tunggul",
  "tungkahan",
  "tungkai",
  "tungkak",
  "tungkap",
  "tungku",
  "tungkul",
  "tungkup",
  "tungkus",
  "tungro",
  "tungsten",
  "tungu",
  "tunik",
  "tunjal",
  "tunjam",
  "tunjang",
  "tunjuk",
  "tunjung",
  "tuntas",
  "tuntun",
  "tuntung",
  "tuntut",
  "tunu",
  "tupai",
  "tur",
  "tura",
  "turang",
  "turangga",
  "turap",
  "turas",
  "turba",
  "turbiditas",
  "turbin",
  "turbogenerator",
  "turbojet",
  "turbulen",
  "turbulensi",
  "turfat",
  "turgor",
  "turi",
  "turiang",
  "turinisasi",
  "turis",
  "turisme",
  "turistik",
  "turkuois",
  "turmalin",
  "turnamen",
  "turne",
  "turnoi",
  "tursi",
  "turun",
  "turus",
  "turut",
  "tus",
  "tusam",
  "tusir",
  "tuslah",
  "tustel",
  "tusuk",
  "tuter",
  "tutor",
  "tutorial",
  "tuts",
  "tutu",
  "tutuh",
  "tutuk",
  "tutul",
  "tutung",
  "tutup",
  "tutur",
  "tutut",
  "tuwuhan",
  "tuwung",
  "tuyuk",
  "tuyul",
  "uai",
  "uak",
  "uan",
  "uanda",
  "uang",
  "uap",
  "uar",
  "uba",
  "ubah",
  "uban",
  "ubang",
  "ubar",
  "ubat",
  "ubek",
  "ubel",
  "uber",
  "ubet",
  "ubi",
  "ubikuitas",
  "ubin",
  "ubit",
  "ubrak-abrik",
  "ubub",
  "ubudiah",
  "ubun-ubun",
  "ubung",
  "ubur-ubur",
  "ubyang-ubyung",
  "ucap",
  "ucek",
  "uci-uci",
  "ucis",
  "ucok",
  "ucu",
  "ucus",
  "uda",
  "udak",
  "udam",
  "udang",
  "udani",
  "udap",
  "udar",
  "udara",
  "ude",
  "udek",
  "udel",
  "udeng",
  "udet",
  "udi",
  "udik",
  "udim",
  "udo",
  "udu",
  "uduh",
  "uduk",
  "udut",
  "uek",
  "ufti",
  "ufuk",
  "ugahari",
  "ugal-ugalan",
  "ugem",
  "uger",
  "uget-uget",
  "ugut",
  "uhu",
  "uih",
  "uik",
  "uir-uir",
  "uis",
  "uit",
  "ujana",
  "ujang",
  "ujar",
  "uji",
  "uju",
  "ujub",
  "ujud",
  "ujuk",
  "ujul",
  "ujung",
  "ukas",
  "ukhrawi",
  "ukhuwah",
  "ukik",
  "ukir",
  "uktab",
  "ukulele",
  "ukup",
  "ukur",
  "ula-ula",
  "ulah",
  "ulak",
  "ulam",
  "ulama",
  "ulan",
  "ulang",
  "ulang-alik",
  "ulang-aling",
  "ulap-ulap",
  "ular",
  "ulas",
  "ulat",
  "ulayah",
  "ulayat",
  "ulek",
  "ulem",
  "ulen",
  "ules",
  "ulet",
  "uli",
  "ulik",
  "ulin",
  "uling",
  "ulir",
  "ulit",
  "ulna",
  "ulos",
  "ultima",
  "ultimatum",
  "ultimo",
  "ultimogenitur",
  "ultra",
  "ultrafilter",
  "ultramarin",
  "ultramikroskopik",
  "ultramikroskopiks",
  "ultramodern",
  "ultrasonik",
  "ultrasonika",
  "ultrasonografi",
  "ultraungu",
  "ultraviolet",
  "ulu",
  "uluk",
  "ulun",
  "ulung",
  "ulup",
  "ulur",
  "uma",
  "umak",
  "uman",
  "umang-umang",
  "umara",
  "umat",
  "umbai",
  "umbalan",
  "umban",
  "umbang",
  "umbang-ambing",
  "umbar",
  "umbara",
  "umbi",
  "umbilikus",
  "umbin",
  "umbisi",
  "umbo",
  "umbra",
  "umbu",
  "umbuk",
  "umbul",
  "umbur-umbur",
  "umbut",
  "umi",
  "umlaut",
  "umpak",
  "umpama",
  "umpan",
  "umpat",
  "umpet",
  "umpil",
  "umpuk",
  "umpun",
  "umput",
  "umrah",
  "umu",
  "umuk",
  "umum",
  "umun",
  "umur",
  "unam",
  "uncang",
  "uncang-uncit",
  "uncit",
  "uncu",
  "uncue",
  "uncui",
  "unda",
  "undagi",
  "undak",
  "undan",
  "undang",
  "undi",
  "unduh",
  "unduk-unduk",
  "undung-undung",
  "undur",
  "unek-unek",
  "ungah-angih",
  "ungam",
  "ungar",
  "unggah",
  "unggal",
  "unggang-anggit",
  "unggas",
  "unggat-unggit",
  "unggis",
  "unggit",
  "unggul",
  "unggun",
  "unggut",
  "ungka",
  "ungkah",
  "ungkai",
  "ungkak",
  "ungkal",
  "ungkap",
  "ungkat",
  "ungkau",
  "ungkil",
  "ungkir",
  "ungkit",
  "ungkul",
  "ungkur",
  "ungsi",
  "ungti",
  "ungu",
  "unguis",
  "uni",
  "uniat",
  "unifikasi",
  "uniform",
  "uniformitas",
  "unik",
  "unilateral",
  "unilineal",
  "unilinear",
  "union",
  "uniseks",
  "uniseluler",
  "unit",
  "unitaris",
  "unitarisme",
  "univalen",
  "universal",
  "universalia",
  "universalisme",
  "universalitas",
  "universiade",
  "universitas",
  "universiter",
  "universitet",
  "universum",
  "unjuk",
  "unjun",
  "unjung",
  "unjur",
  "unjut",
  "unsur",
  "unsuri",
  "unta",
  "untai",
  "untal",
  "untang-anting",
  "unti",
  "until",
  "unting",
  "untir",
  "untuk",
  "untun",
  "untung",
  "untut",
  "unun",
  "unyai",
  "upa",
  "upaboga",
  "upacara",
  "upaduta",
  "upah",
  "upajiwa",
  "upak",
  "upakara",
  "upakarti",
  "upam",
  "upan",
  "upanishad",
  "upar",
  "upau",
  "upawasa",
  "upaya",
  "upet",
  "upeti",
  "upih",
  "upik",
  "upil",
  "upsilon",
  "ura-ura",
  "uraemia",
  "urah",
  "urai",
  "urak",
  "urakus",
  "uran-uran",
  "uranisme",
  "uranium",
  "uranologi",
  "uranus",
  "urap",
  "uras",
  "urat",
  "urban",
  "urbanisasi",
  "urbanisme",
  "urdu",
  "urea",
  "uremia",
  "ureter",
  "uretra",
  "uretritis",
  "urgen",
  "urgensi",
  "uri",
  "urian",
  "uribang",
  "urik",
  "urinalisis",
  "urine",
  "uring",
  "urinoar",
  "urinometer",
  "urip",
  "uris",
  "urit",
  "urita",
  "uritan",
  "urna",
  "urolog",
  "urologi",
  "uroskopi",
  "uruk",
  "urun",
  "urung",
  "urup",
  "urus",
  "urut",
  "usada",
  "usah",
  "usaha",
  "usai",
  "usak",
  "usali",
  "usam",
  "usang",
  "usap",
  "usar",
  "usat",
  "user-user",
  "usia",
  "usik",
  "usil",
  "usir",
  "uskup",
  "usrek",
  "ustad",
  "ustaz",
  "ustazah",
  "usuk",
  "usul",
  "usuluddin",
  "usung",
  "usur",
  "usus",
  "usut",
  "uswah",
  "utak-atik",
  "utama",
  "utang",
  "utar-utar",
  "utara",
  "utarid",
  "utas",
  "uterus",
  "utih",
  "utik",
  "utilitas",
  "utopia",
  "utopis",
  "utopisme",
  "utrikel",
  "utrolokal",
  "utuh",
  "utus",
  "uvula",
  "uvular",
  "uwar",
  "uwungan",
  "uwur",
  "uyuh",
  "uzlah",
  "uzur",
  "vagina",
  "vak",
  "vakansi",
  "vakasi",
  "vakatur",
  "vakbon",
  "vaksin",
  "vaksinasi",
  "vakum",
  "vakuol",
  "vakuola",
  "valas",
  "valensi",
  "valentin",
  "valentine",
  "valeria",
  "valid",
  "validitas",
  "valis",
  "valium",
  "valorisasi",
  "valuta",
  "vampir",
  "vanadium",
  "vandal",
  "vandalisme",
  "vandalistis",
  "vandel",
  "vanili",
  "varia",
  "variabel",
  "variabilitas",
  "varian",
  "variansi",
  "variasi",
  "variatif",
  "varietas",
  "variola",
  "varises",
  "vas",
  "vasal",
  "vasektomi",
  "vaselin",
  "vaskular",
  "vaskularisasi",
  "vaskuler",
  "vaskulum",
  "vasodilasi",
  "vasodilator",
  "vasomotor",
  "vatikan",
  "vaucer",
  "vedda",
  "veddoid",
  "veem",
  "vegetarian",
  "vegetarir",
  "vegetaris",
  "vegetarisme",
  "vegetasi",
  "vektor",
  "velamentum",
  "velar",
  "velarisasi",
  "velodrom",
  "velositas",
  "velum",
  "vena",
  "venal",
  "venalitas",
  "vendeta",
  "vendor",
  "ventilasi",
  "ventilator",
  "ventrikel",
  "ventrikulus",
  "venus",
  "verba",
  "verbal",
  "verbalisan",
  "verbalisasi",
  "verbalisme",
  "verbalistis",
  "verbatim",
  "verbena",
  "verdigris",
  "verifikasi",
  "verifikatur",
  "veritisme",
  "verkoper",
  "vermilium",
  "vermiliun",
  "vermiseli",
  "vermisida",
  "vernis",
  "veronal",
  "verset",
  "versi",
  "verso",
  "verstek",
  "versus",
  "vertebra",
  "vertebrata",
  "vertikal",
  "verzet",
  "vespa",
  "veste",
  "vestibul",
  "vestibula",
  "vestibulum",
  "vet",
  "veter",
  "veteran",
  "veterinarian",
  "veteriner",
  "vetiver",
  "veto",
  "vetsin",
  "via",
  "viabel",
  "viabilitas",
  "viaduk",
  "vibran",
  "vibrasi",
  "vibrator",
  "vibrio",
  "vide",
  "video",
  "videofon",
  "videoklip",
  "videoteks",
  "vigia",
  "vigili",
  "vignet",
  "vikariat",
  "vikaris",
  "vila",
  "vinil",
  "vinyet",
  "viol",
  "viola",
  "violces",
  "violet",
  "violin",
  "violinis",
  "violis",
  "virga",
  "virginia",
  "virgo",
  "virilis",
  "virilisme",
  "virilitas",
  "virilokal",
  "virologi",
  "virtual",
  "virtuoso",
  "virulen",
  "virulensi",
  "virus",
  "visa",
  "visera",
  "visi",
  "visibel",
  "visibilitas",
  "visioner",
  "visitasi",
  "visitator",
  "visiun",
  "viskometer",
  "viskose",
  "viskositas",
  "vista",
  "visual",
  "visualisasi",
  "visum",
  "visus",
  "vitakultur",
  "vital",
  "vitalitas",
  "vitamin",
  "vitelin",
  "vitiligo",
  "vitreositas",
  "vitrifikasi",
  "vitriol",
  "vivarium",
  "vivifikasi",
  "vivipar",
  "vla",
  "vlek",
  "voal",
  "vodka",
  "vokabularium",
  "vokabuler",
  "vokal",
  "vokalia",
  "vokalis",
  "vokasional",
  "vokatif",
  "vokoid",
  "volatil",
  "volatilitas",
  "voli",
  "volt",
  "voltameter",
  "voltase",
  "volume",
  "volumeter",
  "volumetri",
  "volunter",
  "vonis",
  "vopo",
  "vorteks",
  "voting",
  "votum",
  "vrah",
  "vrahoto",
  "vulgar",
  "vulgata",
  "vulger",
  "vulkan",
  "vulkanis",
  "vulkanisasi",
  "vulkanolog",
  "vulkanologi",
  "vulkavit",
  "vulpen",
  "vulva",
  "vulvektomi",
  "vuring",
  "waad",
  "waadat",
  "wabah",
  "wabakdu",
  "wabarakatuh",
  "wacana",
  "wadah",
  "wadak",
  "wadal",
  "wadam",
  "wadat",
  "wadi",
  "wadon",
  "waduh",
  "waduk",
  "wadung",
  "wafa",
  "wafak",
  "wafat",
  "wage",
  "wagon",
  "wagu",
  "wah",
  "wahah",
  "wahai",
  "waham",
  "wahana",
  "wahdah",
  "wahdaniah",
  "wahdiah",
  "wahib",
  "wahid",
  "wahyu",
  "wai",
  "waid",
  "waima",
  "waisak",
  "waisya",
  "waitankung",
  "wajah",
  "wajan",
  "wajar",
  "wajib",
  "wajik",
  "wak",
  "wakaf",
  "wakil",
  "waktu",
  "wakun",
  "wakwak",
  "walabi",
  "walad",
  "walafiat",
  "walah",
  "walak",
  "walakhir",
  "walakin",
  "walang",
  "walangkopo",
  "walango",
  "walat",
  "walau",
  "walaupun",
  "waledan",
  "waleh",
  "walet",
  "walhal",
  "walhasil",
  "wali",
  "walikukun",
  "walimah",
  "walimana",
  "waliullah",
  "wallahi",
  "wallahualam",
  "wals",
  "waluh",
  "waluku",
  "wambrau",
  "wan",
  "wana",
  "wanara",
  "wanawisata",
  "wanda",
  "wandu",
  "wang",
  "wangi",
  "wangkang",
  "wangsa",
  "wangsit",
  "wani",
  "wanita",
  "wanodya",
  "wantah",
  "wantek",
  "wanti-wanti",
  "wantilan",
  "wara",
  "warak",
  "warakawuri",
  "waralaba",
  "warangan",
  "waranggana",
  "warangka",
  "waras",
  "warasah",
  "warawiri",
  "wardi",
  "warga",
  "wari",
  "waria",
  "warid",
  "waringin",
  "waris",
  "warita",
  "warkat",
  "warna",
  "warna-warni",
  "warok",
  "warsa",
  "warta",
  "waru",
  "waruga",
  "waruna",
  "warung",
  "warwar",
  "wasahlan",
  "wasak",
  "wasal",
  "wasalam",
  "wasangka",
  "wasi",
  "wasiat",
  "wasilah",
  "wasir",
  "wasit",
  "wasitah",
  "waskita",
  "waskom",
  "waslah",
  "waslap",
  "waspada",
  "wastafel",
  "waswas",
  "watak",
  "watan",
  "watang",
  "watas",
  "watase",
  "watermantel",
  "watermark",
  "waterpas",
  "waterpruf",
  "watt",
  "watu",
  "wau",
  "wawa",
  "wawancara",
  "wawanmuka",
  "wawanrembuk",
  "wawas",
  "wawu",
  "wayang",
  "wayuh",
  "wazari",
  "wazir",
  "weda",
  "wedam",
  "wedana",
  "wedang",
  "wedani",
  "wedar",
  "wede",
  "wedel",
  "weduk",
  "wegah",
  "weh",
  "weharima",
  "wejang",
  "wekel",
  "weker",
  "welahar",
  "welas",
  "weling",
  "welirang",
  "welit",
  "welter",
  "welut",
  "wenang",
  "wenter",
  "werak",
  "werangka",
  "werda",
  "werdatama",
  "were",
  "werek",
  "wereng",
  "werit",
  "werst",
  "wese",
  "wesel",
  "weselbor",
  "wesi",
  "wesket",
  "westernis",
  "westernisasi",
  "wet",
  "wetan",
  "weton",
  "wewarah",
  "wewaton",
  "wewe",
  "wibawa",
  "wicaksana",
  "wicara",
  "widi",
  "widiaiswara",
  "widiwasa",
  "widodari",
  "widoro",
  "widuri",
  "widyaiswara",
  "widyawisata",
  "wig",
  "wigata",
  "wihara",
  "wijaya",
  "wijayakusuma",
  "wijayamala",
  "wijayamulia",
  "wijdaniah",
  "wijen",
  "wiji",
  "wijik",
  "wikalat",
  "wiku",
  "wiladah",
  "wilah",
  "wilangon",
  "wilayah",
  "wilis",
  "wilwatikta",
  "wimana",
  "winaya",
  "windu",
  "wing",
  "wingit",
  "winglet",
  "winter",
  "wira",
  "wirabank",
  "wiracarita",
  "wiraga",
  "wirakarya",
  "wirang",
  "wiraniaga",
  "wirasuara",
  "wiraswasta",
  "wirid",
  "wiru",
  "wisa",
  "wisal",
  "wisata",
  "wisaya",
  "wisesa",
  "wisik",
  "wiski",
  "wisma",
  "wisnu",
  "wisuda",
  "witir",
  "wiwaha",
  "wiweka",
  "wiyaga",
  "wiyata",
  "wizurai",
  "wodka",
  "wol",
  "wolanda",
  "wolfram",
  "wombat",
  "won",
  "wong",
  "wora-wari",
  "wortel",
  "wosi",
  "wotogal-agil",
  "wrang",
  "wreda",
  "wredatama",
  "wregu",
  "wrisaba",
  "wudani",
  "wudu",
  "wuduk",
  "wujud",
  "wuker",
  "wukerar",
  "wuku",
  "wukuf",
  "wulan",
  "wulang",
  "wulu",
  "wulung",
  "wungon",
  "wungu",
  "wuwungan",
  "xantat",
  "xantena",
  "xantofil",
  "xenia",
  "xenofili",
  "xenofobia",
  "xenoglosia",
  "xenograf",
  "xenokrasi",
  "xenolit",
  "xenomania",
  "xenon",
  "xerofil",
  "xerofit",
  "xeroftalmia",
  "xerografi",
  "xerosis",
  "xifoid",
  "xilem",
  "xilena",
  "xilofon",
  "xilograf",
  "xilografi",
  "xiloid",
  "xiloidina",
  "xilol",
  "xilologi",
  "xilonit",
  "xilosa",
  "yad",
  "yahud",
  "yahudi",
  "yahudiah",
  "yahwe",
  "yais",
  "yaitu",
  "yakin",
  "yakis",
  "yakitori",
  "yakjuj",
  "yakni",
  "yaksa",
  "yakun",
  "yakut",
  "yamtuan",
  "yang",
  "yantra",
  "yard",
  "yargon",
  "yasan",
  "yasmin",
  "yasti",
  "yatim",
  "yaum",
  "yaumudin",
  "yaumulakhir",
  "yaumulaza",
  "yaumuljamak",
  "yaumuljaza",
  "yaumulkiamah",
  "yaumulmahsyar",
  "yayasan",
  "yayi",
  "yayu",
  "yehova",
  "yel",
  "yen",
  "yeyunum",
  "yodium",
  "yoga",
  "yoghurt",
  "yogi",
  "yogia",
  "yohimbina",
  "yojana",
  "yokal",
  "yolk",
  "yos",
  "yosong",
  "yoyo",
  "yubileum",
  "yuda",
  "yudikatif",
  "yudisial",
  "yudisium",
  "yudo",
  "yudoka",
  "yuk",
  "yunani",
  "yunda",
  "yunior",
  "yunta",
  "yupa",
  "yupiter",
  "yura",
  "yuran",
  "yuridis",
  "yuris",
  "yurisdiksi",
  "yurisprudensi",
  "yustisi",
  "yute",
  "yuvenil",
  "yuwana",
  "yuwaraja",
  "yuyitsu",
  "yuyu",
  "zabah",
  "zabaniah",
  "zabarjad",
  "zabib",
  "zabur",
  "zadah",
  "zahid",
  "zai",
  "zaim",
  "zair",
  "zaitun",
  "zakar",
  "zakat",
  "zakelek",
  "zakiah",
  "zakum",
  "zal",
  "zalim",
  "zalir",
  "zaman",
  "zamin",
  "zamindar",
  "zamrud",
  "zamzam",
  "zan",
  "zanggi",
  "zantara",
  "zarafah",
  "zarah",
  "zaratit",
  "zariah",
  "zariat",
  "zat",
  "zatua",
  "zawal",
  "zawiat",
  "zebra",
  "zebu",
  "zelot",
  "zen",
  "zend-avesta",
  "zendeling",
  "zending",
  "zeni",
  "zenit",
  "zeolit",
  "zeoponik",
  "zero",
  "zet",
  "zeta",
  "ziadah",
  "ziarah",
  "zib",
  "zig-zag",
  "zigomorf",
  "zigot",
  "zikir",
  "zilullah",
  "zimase",
  "zimi",
  "zimogen",
  "zimolisis",
  "zimosis",
  "zimotik",
  "zimurgi",
  "zina",
  "zindik",
  "zink",
  "zinkografi",
  "zion",
  "zionis",
  "zionisme",
  "zirafah",
  "zirah",
  "zirbad",
  "zirkonia",
  "zirkonium",
  "zirnikh",
  "ziter",
  "zodiak",
  "zoetrop",
  "zohal",
  "zohrah",
  "zohrat",
  "zona",
  "zonasi",
  "zonder",
  "zone",
  "zoning",
  "zoofit",
  "zoofobia",
  "zoogani",
  "zoogeografi",
  "zoologi",
  "zoonosis",
  "zoosemiotika",
  "zuama",
  "zuhud",
  "zuhur",
  "zulfikar",
  "zulhijah",
  "zulkaidah",
  "zulmat",
  "zulu",
  "zurafah",
  "zuriah",
  "zus",
  ""
]
},{}],77:[function(require,module,exports){
/*
Copyright (c) 2017, Alif Bhaskoro, Andy Librian, R. Kukuh (Reimplemented from https://github.com/sastrawi/sastrawi)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.

var Removal = require("./removal");

// Make global variable for dictionary
var dictionary = [];
function loadDictionary(){
    var fs = require('fs');
    //var dirname = __dirname + "/../../../../data/kata-dasar.txt";
    //var fin = fs.readFileSync(dirname).toString().split("\n");
    var fin = require('./data/kata-dasar.json');
    fin.forEach(function (word) {
      if (word) {
        dictionary.push(word.trim());
      }
    });
}
loadDictionary();

function PrefixRules() {
	var PrefixRules = this;

	this.removal = undefined;
	this.current_word = undefined;

	// Find certain word in dictionary
	function find(word) {
	    return (dictionary.indexOf(word) != -1);
	}

	// Run the array of disambiguate rules on input word
	function runDisambiguator(disambiguateRules, word){
		var result = undefined;
	
		for(var i in disambiguateRules){
	    	result = disambiguateRules[i](word);
	    	if(find(result)){
	    		break;
	    	}
	    }
	    
	    if(result==undefined){
	    	this.current_word = word;
	    	this.removal = undefined;
	    	return this;
	    }

	    return createResultObject(result, word, "DP");
	}

	function createResultObject(result, word, type){
		var removedPart = word.replace(result, '');
		var removal = new Removal(word, result, removedPart, type);

		this.removal = removal;
		this.current_word = result;
		
		return this;
	}

	PrefixRules.RemovePlainPrefix = function(word){
		var result = word.replace(/^(di|ke|se)/, '');
		if(result!=word){
			var removedPart = word.replace(result, '');

			var removal = new Removal(word, result, removedPart, 'DP');

			this.removal = removal;
		}
		else{
			this.removal = undefined;
		}
		this.current_word = result;
		return this;
	}

	// RULE 1
	function disambiguateRule1A(word){
		// Rule 1a : berV -> ber-V
		var matches = word.match(/^ber([aiueo].*)$/);
	    if(matches){
	        return matches[1];
	    }
	}

	function disambiguateRule1B(word){
		// Rule 1b : berV -> be-rV
	    var matches = word.match(/^ber([aiueo].*)$/);
	    if(matches){
	        return 'r' + matches[1];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule1 = function(word){
		// Push rules 1A & 1B
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule1A);
		disambiguateRules.push(disambiguateRule1B);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 2
	function disambiguateRule2(word){
		// Rule 2 : berCAP -> ber-CAP where C != 'r' AND P != 'er'
		var matches = word.match(/^ber([bcdfghjklmnpqrstvwxyz])([a-z])(.*)/);
	    if(matches){
	    	if(matches[3].match(/^er(.*)$/)){
	    		return
	    	}
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule2 = function(word){
		// Push rule 2
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule2);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 3
	function disambiguateRule3(word){
		// Rule 3 : berCAerV -> ber-CAerV where C != 'r'
		var matches = word.match(/ber([bcdfghjklmnpqrstvwxyz])([a-z])er([aiueo])(.*)/);
	    if(matches){
	    	if(matches[1] == "r"){
	    		return
	    	}
	        return matches[1] + matches[2] + "er" + matches[3] + matches[4];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule3 = function(word){
		// Push rule 3
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule3);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 4
	function disambiguateRule4(word){
		// Rule 4 : belajar -> ajar
		if(word == "belajar"){
			return "ajar";
		}
	}

	PrefixRules.DisambiguatorPrefixRule4 = function(word){
		// Push rule 4
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule4);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 5
	function disambiguateRule5(word){
		// Rule 5 : beC1erC2 -> be-C1erC2 where C1 != 'r'
		var matches = word.match(/be([bcdfghjklmnpqstvwxyz])(er[bcdfghjklmnpqrstvwxyz])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule5 = function(word){
		// Push rule 5
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule5);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 6
	function disambiguateRule6a(word){
		// Rule 6a : terV -> ter-V
		var matches = word.match(/^ter([aiueo].*)$/);
	    if(matches){
	        return matches[1];
	    }
	}

	function disambiguateRule6b(word){
		// Rule 6b : terV -> te-rV
		var matches = word.match(/^ter([aiueo].*)$/);
	    if(matches){
	        return "r" + matches[1];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule6 = function(word){
		// Push rule 6
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule6a);
		disambiguateRules.push(disambiguateRule6b);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 7
	function disambiguateRule7(word){
		// Rule 7 : terCerv -> ter-CerV where C != 'r'
		var matches = word.match(/^ter([bcdfghjklmnpqrstvwxyz])er([aiueo].*)$/);
	    if(matches){
	    	if(matches[1]=="r"){
	    		return
	    	}
	        return matches[1] + "er" + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule7 = function(word){
		// Push rule 7
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule7);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 8
	function disambiguateRule8(word){
		// Rule 8 : terCP -> ter-CP where C != 'r' and P != 'er'
		var matches = word.match(/^ter([bcdfghjklmnpqrstvwxyz])(.*)$/);
	    if(matches){
	    	if(matches[1]=="r" || matches[2].match(/^er(.*)$/)){
	    		return
	    	}
	        return matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule8 = function(word){
		// Push rule 8
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule8);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 9
	function disambiguateRule9(word){
		// Rule 9 : te-C1erC2 -> te-C1erC2 where C1 != 'r'
		var matches = word.match(/^te([bcdfghjklmnpqrstvwxyz])er([bcdfghjklmnpqrstvwxyz])(.*)$/);
	    if(matches){
	    	if(matches[1]=="r"){
	    		return
	    	}
	        return matches[1] + "er" + matches[2] + matches[3];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule9 = function(word){
		// Push rule 9
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule9);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 10
	function disambiguateRule10(word){
		// Rule 10 : me{l|r|w|y}V -> me-{l|r|w|y}V
		var matches = word.match(/^me([lrwy])([aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule10 = function(word){
		// Push rule 10
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule10);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 11
	function disambiguateRule11(word){
		// Rule 11 : mem{b|f|v} -> mem-{b|f|v}
		var matches = word.match(/^mem([bfv])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule11 = function(word){
		// Push rule 11
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule11);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 12
	function disambiguateRule12(word){
		// Nazief and Adriani Rule 12 : beC1erC2 -> be-C1erC2 where C1 != 'r'
        // Modified by Jelita Asian's CS Rule 12 : mempe -> mem-pe to stem mempengaruhi
		var matches = word.match(/^mempe(.*)$/);
	    if(matches){
	        return "pe" + matches[1];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule12 = function(word){
		// Push rule 12
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule12);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 13
	function disambiguateRule13a(word){
		// Rule 13a : mem{rV|V} -> me-m{rV|V}
		var matches = word.match(/^mem([aiueo])(.*)$/);
	    if(matches){
	        return "m" + matches[1] + matches[2];
	    }
	}

	function disambiguateRule13b(word){
		// Rule 13b : mem{rV|V} -> me-p{rV|V}
		var matches = word.match(/^mem([aiueo])(.*)$/);
	    if(matches){
	        return "p" + matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule13 = function(word){
		// Push rule 13
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule13a);
		disambiguateRules.push(disambiguateRule13b);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 14
	function disambiguateRule14(word){
		/*Rule 14 modified by Andy Librian : men{c|d|j|s|t|z} -> men-{c|d|j|s|t|z}
        in order to stem mentaati
  
        Rule 14 modified by ECS: men{c|d|j|s|z} -> men-{c|d|j|s|z}
        in order to stem mensyaratkan, mensyukuri
  
        Original CS Rule no 14 was : men{c|d|j|z} -> men-{c|d|j|z}*/
		var matches = word.match(/^men([cdjstz])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule14 = function(word){
		// Push rule 14
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule14);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 15
	function disambiguateRule15a(word){
		// Rule 15a : men{V} -> me-n{V}
		var matches = word.match(/^men([aiueo])(.*)$/);
	    if(matches){
	        return "n" + matches[1] + matches[2];
	    }
	}

	function disambiguateRule15b(word){
		// Rule 15b : men{V} -> me-t{V}
		var matches = word.match(/^men([aiueo])(.*)$/);
	    if(matches){
	        return "t" + matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule15 = function(word){
		// Push rule 15
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule15a);
		disambiguateRules.push(disambiguateRule15b);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 16
	function disambiguateRule16(word){
		// Original Nazief and Adriani's Rule 16 : meng{g|h|q} -> meng-{g|h|q}
        // Modified Jelita Asian's CS Rule 16 : meng{g|h|q|k} -> meng-{g|h|q|k} to stem mengkritik
		var matches = word.match(/^meng([g|h|q|k])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule16 = function(word){
		// Push rule 16
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule16);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 17
	function disambiguateRule17a(word){
		// Rule 17a : mengV -> meng-V
		var matches = word.match(/^meng([aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2];
	    }
	}

	function disambiguateRule17b(word){
		// Rule 17b : mengV -> meng-kV
		var matches = word.match(/^meng([aiueo])(.*)$/);
	    if(matches){
	        return "k" + matches[1] + matches[2];
	    }
	}

	function disambiguateRule17c(word){
		// Rule 17c : mengV -> meng-V- where V = 'e'
		var matches = word.match(/^menge(.*)$/);
	    if(matches){
	        return matches[1];
	    }
	}

	function disambiguateRule17d(word){
		// Rule 17d : mengV -> me-ngV
		var matches = word.match(/^meng([aiueo])(.*)$/);
	    if(matches){
	        return "ng" + matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule17 = function(word){
		// Push rule 17
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule17a);
		disambiguateRules.push(disambiguateRule17b);
		disambiguateRules.push(disambiguateRule17c);
		disambiguateRules.push(disambiguateRule17d);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 18
	function disambiguateRule18a(word){
		// Rule 18a : menyV -> me-nyV to stem menyala -> nyala
		var matches = word.match(/^meny([aiueo])(.*)$/);
	    if(matches){
	        return "ny" + matches[1] + matches[2];
	    }
	}

	function disambiguateRule18b(word){
		// Original Rule 18b : menyV -> meny-sV
        // Modified by CC (shifted into 18b, see also 18a)
		var matches = word.match(/^meny([aiueo])(.*)$/);
	    if(matches){
	        return "s" + matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule18 = function(word){
		// Push rule 18
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule18a);
		disambiguateRules.push(disambiguateRule18b);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 19
	function disambiguateRule19(word){
		// Original Rule 19 : mempV -> mem-pV where V != 'e'
        // Modified Rule 19 by ECS : mempA -> mem-pA where A != 'e' in order to stem memproteksi
		var matches = word.match(/^memp([abcdfghijklmopqrstuvwxyz])(.*)$/);
	    if(matches){
	        return "p" + matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule19 = function(word){
		// Push rule 19
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule19);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 20
	function disambiguateRule20(word){
		// Rule 20 : pe{w|y}V -> pe-{w|y}V
		var matches = word.match(/^pe([wy])([aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule20 = function(word){
		// Push rule 20
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule20);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 21
	function disambiguateRule21a(word){
		// Rule 21a : perV -> per-V
		var matches = word.match(/^per([aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2];
	    }
	}

	function disambiguateRule21b(word){
		// Rule 21b : perV -> pe-rV
		var matches = word.match(/^pe(r[aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule21= function(word){
		// Push rule 21
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule21a);
		disambiguateRules.push(disambiguateRule21b);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 23
	function disambiguateRule23(word){
		// Rule 23 : perCAP -> per-CAP where C != 'r' AND P != 'er'
		var matches = word.match(/^per([bcdfghjklmnpqrstvwxyz])([a-z])(.*)$/);
	    if(matches){
	    	if(matches[3].match(/^er(.*)$/)){
	    		return
	    	}
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule23 = function(word){
		// Push rule 23
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule23);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 24
	function disambiguateRule24(word){
		// Rule 24 : perCAerV -> per-CAerV where C != 'r'
		var matches = word.match(/^per([bcdfghjklmnpqrstvwxyz])([a-z])er([aiueo])(.*)$/);
	    if(matches){
	    	if(matches[1] == "r"){
	    		return
	    	}
	        return matches[1] + matches[2] + "er" + matches[3] + matches[4];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule24 = function(word){
		// Push rule 24
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule24);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 25
	function disambiguateRule25(word){
		// Rule 25 : pem{b|f|v} -> pem-{b|f|v}
		var matches = word.match(/^pem([bfv])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule25 = function(word){
		// Push rule 25
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule25);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 26
	function disambiguateRule26a(word){
		// Rule 26a : pem{rV|V} -> pe-m{rV|V}
		var matches = word.match(/^pem([aiueo])(.*)$/);
	    if(matches){
	        return "m" + matches[1] + matches[2];
	    }
	}

	function disambiguateRule26b(word){
		// Rule 26b : pem{rV|V} -> pe-p{rV|V}
		var matches = word.match(/^pem([aiueo])(.*)$/);
	    if(matches){
	        return "p" + matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule26 = function(word){
		// Push rule 26
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule26a);
		disambiguateRules.push(disambiguateRule26b);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 27
	function disambiguateRule27(word){
		// Rule 27 : pen{c|d|j|s|t|z} -> pen-{c|d|j|s|t|z}
		var matches = word.match(/^pen([cdjstz])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule27 = function(word){
		// Push rule 27
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule27);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 28
	function disambiguateRule28a(word){
		// Rule 28a : pen{V} -> pe-n{V}
		var matches = word.match(/^pen([aiueo])(.*)$/);
	    if(matches){
	        return "n" + matches[1] + matches[2];
	    }
	}

	function disambiguateRule28b(word){
		// Rule 28b : pen{V} -> pe-t{V}
		var matches = word.match(/^pen([aiueo])(.*)$/);
	    if(matches){
	        return "t" + matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule28 = function(word){
		// Push rule 28
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule28a);
		disambiguateRules.push(disambiguateRule28b);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 29
	function disambiguateRule29(word){
		// Rule 29 by ECS : pengC -> peng-C
		var matches = word.match(/^peng([bcdfghjklmnpqrstvwxyz])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule29 = function(word){
		// Push rule 29
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule29);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 30
	function disambiguateRule30a(word){
		// Rule 30a : pengV -> peng-V
		var matches = word.match(/^peng([aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2];
	    }
	}

	function disambiguateRule30b(word){
		// Rule 30b : pengV -> peng-kV
		var matches = word.match(/^peng([aiueo])(.*)$/);
	    if(matches){
	        return "k" + matches[1] + matches[2];
	    }
	}

	function disambiguateRule30c(word){
		// Rule 30c : pengV -> pengV- where V = 'e'
		var matches = word.match(/^penge(.*)$/);
	    if(matches){
	        return matches[1];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule30 = function(word){
		// Push rule 30
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule30a);
		disambiguateRules.push(disambiguateRule30b);
		disambiguateRules.push(disambiguateRule30c);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 31
	function disambiguateRule31a(word){
		// Rule 31a : penyV -> pe-nyV
		var matches = word.match(/^peny([aiueo])(.*)$/);
	    if(matches){
	        return "ny" + matches[1] + matches[2];
	    }
	}

	function disambiguateRule31b(word){
		// Original Rule 31 : penyV -> peny-sV
		var matches = word.match(/^peny([aiueo])(.*)$/);
	    if(matches){
	        return "s" + matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule31 = function(word){
		// Push rule 31
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule31a);
		disambiguateRules.push(disambiguateRule31b);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 32
	function disambiguateRule32(word){
		// Rule 32 : pelV -> pe-lV except pelajar -> ajar
		if(word=="pelajar"){
			return "ajar";
		}
		var matches = word.match(/^pe(l[aiueo])(.*)/);
	    if(matches){
	        return matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule32 = function(word){
		// Push rule 32
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule32);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 34
	function disambiguateRule34(word){
		// Rule 34 : peCP -> pe-CP where C != {r|w|y|l|m|n} and P != 'er'
		var matches = word.match(/^pe([bcdfghjklmnpqrstvwxyz])(.*)$/);
	    if(matches){
	    	if(matches[2].match(/^er(.*)$/)){
	    		return
	    	}
	        return matches[1] + matches[2];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule34 = function(word){
		// Push rule 34
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule34);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 35
	function disambiguateRule35(word){
		// Rule 35 : terC1erC2 -> ter-C1erC2 where C1 != {r}
		var matches = word.match(/^ter([bcdfghjkpqstvxz])(er[bcdfghjklmnpqrstvwxyz])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule35 = function(word){
		// Push rule 35
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule35);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 36
	function disambiguateRule36(word){
		// Rule 36 : peC1erC2 -> pe-C1erC2 where C1 != {r|w|y|l|m|n}
		var matches = word.match(/^pe([bcdfghjkpqstvxz])(er[bcdfghjklmnpqrstvwxyz])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule36 = function(word){
		// Push rule 36
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule36);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 37
	function disambiguateRule37a(word){
		// Rule 37a : CerV -> CerV
		var matches = word.match(/^([bcdfghjklmnpqrstvwxyz])(er[aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	function disambiguateRule37b(word){
		// Rule 37b : CerV -> CV
		var matches = word.match(/^([bcdfghjklmnpqrstvwxyz])er([aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule37 = function(word){
		// Push rule 37
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule37a);
		disambiguateRules.push(disambiguateRule37b);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 38
	function disambiguateRule38a(word){
		// Rule 38a : CelV -> CelV
		var matches = word.match(/^([bcdfghjklmnpqrstvwxyz])(el[aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	function disambiguateRule38b(word){
		// Rule 38b : CelV -> CV
		var matches = word.match(/^([bcdfghjklmnpqrstvwxyz])el([aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule38 = function(word){
		// Push rule 38
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule38a);
		disambiguateRules.push(disambiguateRule38b);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 39
	function disambiguateRule39a(word){
		// Rule 39a : CemV -> CemV
		var matches = word.match(/^([bcdfghjklmnpqrstvwxyz])(em[aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	function disambiguateRule39b(word){
		// Rule 39b : CemV -> CV
		var matches = word.match(/^([bcdfghjklmnpqrstvwxyz])em([aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule39 = function(word){
		// Push rule 39
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule39a);
		disambiguateRules.push(disambiguateRule39b);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 40
	function disambiguateRule40a(word){
		// Rule 40a : CinV -> CinV
		var matches = word.match(/^([bcdfghjklmnpqrstvwxyz])(in[aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	function disambiguateRule40b(word){
		// Rule 40b : CinV -> CV
		var matches = word.match(/^([bcdfghjklmnpqrstvwxyz])in([aiueo])(.*)$/);
	    if(matches){
	        return matches[1] + matches[2] + matches[3];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule40 = function(word){
		// Push rule 40
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule40a);
		disambiguateRules.push(disambiguateRule40b);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 41
	function disambiguateRule41(word){
		// Rule 41 : kuA -> ku-A
		var matches = word.match(/^ku(.*)$/);
	    if(matches){
	        return matches[1];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule41 = function(word){
		// Push rule 41
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule41);

	    return runDisambiguator(disambiguateRules, word);
	}

	// RULE 42
	function disambiguateRule42(word){
		// Rule 42 : kauA -> kau-A
		var matches = word.match(/^kau(.*)$/);
	    if(matches){
	        return matches[1];
	    }
	}

	PrefixRules.DisambiguatorPrefixRule42 = function(word){
		// Push rule 42
		var disambiguateRules = [];
		disambiguateRules.push(disambiguateRule42);

	    return runDisambiguator(disambiguateRules, word);
	}
}

module.exports 	= PrefixRules;

// Initalize prefix rules array
var rules 		= [];
var pr = new PrefixRules();

// Push all rules
rules.push(pr.RemovePlainPrefix);
rules.push(pr.DisambiguatorPrefixRule1);
rules.push(pr.DisambiguatorPrefixRule2);
rules.push(pr.DisambiguatorPrefixRule3);
rules.push(pr.DisambiguatorPrefixRule4);
rules.push(pr.DisambiguatorPrefixRule5);
rules.push(pr.DisambiguatorPrefixRule6);
rules.push(pr.DisambiguatorPrefixRule7);
rules.push(pr.DisambiguatorPrefixRule8);
rules.push(pr.DisambiguatorPrefixRule9);
rules.push(pr.DisambiguatorPrefixRule10);
rules.push(pr.DisambiguatorPrefixRule11);
rules.push(pr.DisambiguatorPrefixRule12);
rules.push(pr.DisambiguatorPrefixRule13);
rules.push(pr.DisambiguatorPrefixRule14);
rules.push(pr.DisambiguatorPrefixRule15);
rules.push(pr.DisambiguatorPrefixRule16);
rules.push(pr.DisambiguatorPrefixRule17);
rules.push(pr.DisambiguatorPrefixRule18);
rules.push(pr.DisambiguatorPrefixRule19);
rules.push(pr.DisambiguatorPrefixRule20);
rules.push(pr.DisambiguatorPrefixRule21);
rules.push(pr.DisambiguatorPrefixRule23);
rules.push(pr.DisambiguatorPrefixRule24);
rules.push(pr.DisambiguatorPrefixRule25);
rules.push(pr.DisambiguatorPrefixRule26);
rules.push(pr.DisambiguatorPrefixRule27);
rules.push(pr.DisambiguatorPrefixRule28);
rules.push(pr.DisambiguatorPrefixRule29);
rules.push(pr.DisambiguatorPrefixRule30);
rules.push(pr.DisambiguatorPrefixRule31);
rules.push(pr.DisambiguatorPrefixRule32);
rules.push(pr.DisambiguatorPrefixRule34);
rules.push(pr.DisambiguatorPrefixRule35);
rules.push(pr.DisambiguatorPrefixRule36);
rules.push(pr.DisambiguatorPrefixRule37);
rules.push(pr.DisambiguatorPrefixRule38);
rules.push(pr.DisambiguatorPrefixRule39);
rules.push(pr.DisambiguatorPrefixRule40);
rules.push(pr.DisambiguatorPrefixRule41);
rules.push(pr.DisambiguatorPrefixRule42);

PrefixRules.rules = rules;

},{"./data/kata-dasar.json":76,"./removal":78,"fs":1}],78:[function(require,module,exports){
/*
Copyright (c) 2017, Alif Bhaskoro, Andy Librian, R. Kukuh (Reimplemented from https://github.com/sastrawi/sastrawi)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.

function Removal (original_word, result, removedPart, affixType) {
    this.original_word 	= original_word;
    this.result 		= result;
    this.removedPart 	= removedPart
    this.affixType 		= affixType;
}
 
Removal.prototype.getOriginalWord = function() {
    return this.original_word;
};

Removal.prototype.getResult = function() {
    return this.result;
};

Removal.prototype.getRemovedPart = function() {
    return this.removedPart;
};

Removal.prototype.getAffixType = function() {
    return this.affixType;
};

module.exports = Removal;
},{}],79:[function(require,module,exports){
/*
Copyright (c) 2017, Alif Bhaskoro, Andy Librian, R. Kukuh (Reimplemented from https://github.com/sastrawi/sastrawi)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var baseStemmer = require('./base_stemmer_id');
var stemmer = new baseStemmer();

// Dictionary
var dictionary = [];
loadDictionary();

// Rules
var SuffixRules = require("./suffix_rules");
var PrefixRules = require("./prefix_rules");

var suffix_rules = SuffixRules.rules;
var prefix_rules = PrefixRules.rules;

// Removals
var removals;

// Words
var original_word;
var current_word;

module.exports = stemmer;

// perform full stemming algorithm on a single word
stemmer.stem = function(token) {
    // Cache stemmer not yet implemented
    // Set to lowercase
    token = token.toLowerCase();

    //Initiate everything
    removals = [];

    if(isPlural(token)){
        return stemPluralWord(token);
    }
    else{
        return stemSingularWord(token);
    }
};

// Stem for plural word
function stemPluralWord(plural_word){
    var matches = plural_word.match(/^(.*)-(.*)$/);
    if(!matches){
        return plural_word;
    }
    words = [matches[1], matches[2]];

    //malaikat-malaikat-nya -> malaikat malaikat-nya
    suffix = words[1];
    suffixes = ["ku", "mu", "nya", "lah", "kah", "tah", "pun"];
    matches = words[0].match(/^(.*)-(.*)$/);
    if(suffixes.indexOf(suffix) != -1 && matches){
        words[0] = matches[1];
        words[1] = matches[2] + '-' + suffix;
    }

    //berbalas-balasan -> balas
    rootWord1 = stemSingularWord(words[0]);
    rootWord2 = stemSingularWord(words[1]);

    //meniru-nirukan -> tiru
    if(!find(words[1]) && rootWord2==words[1]){
        rootWord2 = stemSingularWord("me" + words[1]);
    }
    if(rootWord1==rootWord2){
        return rootWord1;
    }
    else{
        return plural_word;
    }
}

// Stem for singular word
function stemSingularWord(word){
    original_word = word; // Save the original word for reverting later
    current_word = word;

    // Step 1
    if(current_word.length>3){
        // Step 2-5
        stemmingProcess();
    }

    // Step 6
    if(find(current_word)){
        return current_word;
    }
    else{
        return original_word;
    }
}

// Return true if word is in plural form ex: gelas-gelas, else false
function isPlural(token){
    var matches = token.match(/^(.*)-(ku|mu|nya|lah|kah|tah|pun)$/);
    if(matches){
        return matches[1].search('-') != -1;
    }
    return token.search('-') != -1;
}

// Find certain word in dictionary
function find(word) {
    return (dictionary.indexOf(word) != -1);
}

function loadDictionary(){
    var fs = require('fs');
    //var dirname = __dirname + "/../../../../data/kata-dasar.txt";
    //var fin = fs.readFileSync(dirname).toString().split("\n");
    var fin = require('./data/kata-dasar.json');
    fin.forEach(function (word) {
        if (word) {
          dictionary.push(word.trim());
        }
    });
}

// Stemming from step 2-5
function stemmingProcess(){
    if(find(current_word))
        return

    // Confix Stripping
    // Try to remove prefixes first before suffixes if the specification is met
    if(precedenceAdjustmentSpecification(original_word)){
        // Step 4, 5
        removePrefixes();
        if(find(current_word))
            return

        // Step 2, 3
        removeSuffixes();
        if(find(current_word)){
            return
        }
        else{
            // if the trial is failed, restore the original word
            // and continue to normal rule precedence (suffix first, prefix afterwards)
            current_word = original_word;
            removals = []
        }
    }

    // Step 2, 3
    removeSuffixes();
    if(find(current_word))
        return

    // Step 4, 5
    removePrefixes();
    if(find(current_word))
        return

    //ECS Loop Restore Prefixes
    loopRestorePrefixes();
}

// Remove Suffixes
function removeSuffixes(){
    for(var i in suffix_rules){
        resultObj = suffix_rules[i](current_word);

        // Add result to variable
        if(resultObj.removal!=undefined){
            removals.push(resultObj.removal);
        }
        current_word = resultObj.current_word;

        if(find(current_word))
            return current_word;
    }
}

// Remove Prefixes
function removePrefixes(){
    for(var i=0; i<3; i++){
        var removalCount = removals.length;
        checkPrefixRules();
        if(find(current_word))
            return current_word;
    }
}

function checkPrefixRules(){
    var removalCount = removals.length;
    var j = 0;
    for(j=0; j<prefix_rules.length; j++){
        resultObj = prefix_rules[j](current_word);

        // Add result to variable
        if(resultObj.removal!=undefined){
            removals.push(resultObj.removal);
        }
        current_word = resultObj.current_word;

        if(find(current_word))
            return current_word;
        if(removals.length>removalCount){
            return
        }
    }
}

// Loop Restore Prefixes
function loopRestorePrefixes(){
    restorePrefix();

    var reversed_removals = removals.reverse();
    var temp_current_word = current_word;

    for(var i in reversed_removals){
        current_removal = reversed_removals[i];

        if(!isSuffixRemovals(current_removal)){
            continue
        }

        if(current_removal.getRemovedPart() == "kan"){
            current_word = current_removal.getResult() + "k";

            // Step 4, 5
            removePrefixes();
            if(find(current_word))
                return
            current_word = current_removal.getResult() + "kan";
        }
        else{
            current_word = current_removal.getOriginalWord();
        }

        // Step 4, 5
        removePrefixes();
        if(find(current_word))
            return

        current_word = temp_current_word;
    }
}

function isSuffixRemovals(removal){
    var type = removal.getAffixType();
    if(type == "DS" || type == "PP" || type == "P"){
        return true;
    }
    return false;
}
function restorePrefix(){
    for(var i=0; i<removals.length; i++){
        current_word = removals[i].getOriginalWord();
        break;
    }

    for(var i=0; i<removals.length; i++){
        if(removals[i].getAffixType() == "DP"){
            removals.splice(i, 1);
            i--;
        }
    }
}

// Check if word require precedence adjustment or not
// Adjustment means remove prefix then suffix instead of remove suffix then prefix
function precedenceAdjustmentSpecification(word){
    var regex_rules = [
        /^be(.*)lah$/,
        /^be(.*)an$/,
        /^me(.*)i$/,
        /^di(.*)i$/,
        /^pe(.*)i$/,
        /^ter(.*)i$/,
    ];

    for(var i in regex_rules){
        if(word.match(regex_rules[i])){
            return true;
        }
    }
    return false;
}

//exports for tests
stemmer.isPlural = isPlural;
stemmer.dictionary = dictionary;
stemmer.a = suffix_rules[0];

},{"./base_stemmer_id":75,"./data/kata-dasar.json":76,"./prefix_rules":77,"./suffix_rules":80,"fs":1}],80:[function(require,module,exports){
/*
Copyright (c) 2017, Alif Bhaskoro, Andy Librian, R. Kukuh (Reimplemented from https://github.com/sastrawi/sastrawi)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// a list of commonly used words that have little meaning and can be excluded
// from analysis.

var Removal = require("./removal");

function SuffixRules() {
	var SuffixRules = this;

	this.removal = undefined;
	this.current_word = undefined;

	function createResultObject(result, word, type){
		if(result!=word){
			var removedPart = word.replace(result, '');

			var removal = new Removal(word, result, removedPart, type);

			this.removal = removal;
		}
		else{
			this.removal = undefined;
		}
		this.current_word = result;
		return this;
	}

	SuffixRules.RemoveInflectionalParticle = function(word){
		var result = word.replace(/-*(lah|kah|tah|pun)$/, '');
		return createResultObject(result, word, "P");
	}

	SuffixRules.RemoveInflectionalPossessivePronoun = function(word){
		var result = word.replace(/-*(ku|mu|nya)$/, '');
		return createResultObject(result, word, "PP");
	}

	SuffixRules.RemoveDerivationalSuffix = function(word){
		var result = word.replace(/(is|isme|isasi|i|kan|an)$/, '');
		return createResultObject(result, word, "DS");
	}
}

module.exports = SuffixRules;

// Initalize suffix rules array
var rules = [];
var sr = new SuffixRules();

rules.push(sr.RemoveInflectionalParticle);
rules.push(sr.RemoveInflectionalPossessivePronoun);
rules.push(sr.RemoveDerivationalSuffix);

SuffixRules.rules = rules;

},{"./removal":78}],81:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

exports.rules = {
    "a": [
        {
            "continuation": false, 
            "intact": true, 
            "pattern": "ia", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": true, 
            "pattern": "a", 
            "size": "1"
        }
    ], 
    "b": [
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "bb", 
            "size": "1"
        }
    ], 
    "c": [
        {
            "appendage": "s", 
            "continuation": false, 
            "intact": false, 
            "pattern": "ytic", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ic", 
            "size": "2"
       }, 
        {
            "appendage": "t", 
            "continuation": true, 
            "intact": false, 
            "pattern": "nc", 
            "size": "1"
        }
    ], 
    "d": [
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "dd", 
            "size": "1"
        }, 
        {
            "appendage": "y", 
            "continuation": true, 
            "intact": false, 
            "pattern": "ied", 
            "size": "3"
        }, 
        {
            "appendage": "ss", 
            "continuation": false, 
            "intact": false, 
            "pattern": "ceed", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "eed", 
            "size": "1"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ed", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "hood", 
            "size": "4"
        }
    ], 
    "e": [
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "e", 
            "size": "1"
        }
    ], 
    "f": [
        {
            "appendage": "v", 
            "continuation": false, 
            "intact": false, 
            "pattern": "lief", 
            "size": "1"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "if", 
            "size": "2"
        }
    ], 
    "g": [
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ing", 
            "size": "3"
        }, 
        {
            "appendage": "y", 
            "continuation": false, 
            "intact": false, 
            "pattern": "iag", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ag", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "gg", 
            "size": "1"
        }
    ], 
    "h": [
        {
            "continuation": false, 
            "intact": true, 
            "pattern": "th", 
            "size": "2"
        }, 
        {
            "appendage": "ct", 
            "continuation": false, 
            "intact": false, 
            "pattern": "guish", 
            "size": "5"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ish", 
            "size": "3"
        }
    ], 
    "i": [
        {
            "continuation": false, 
            "intact": true, 
            "pattern": "i", 
            "size": "1"
        }, 
        {
            "appendage": "y", 
            "continuation": true, 
            "intact": false, 
            "pattern": "i", 
            "size": "1"
        }
    ], 
    "j": [
        {
            "appendage": "d", 
            "continuation": false, 
            "intact": false, 
            "pattern": "ij", 
            "size": "1"
        }, 
        {
            "appendage": "s", 
            "continuation": false, 
            "intact": false, 
            "pattern": "fuj", 
            "size": "1"
        }, 
        {
            "appendage": "d", 
            "continuation": false, 
            "intact": false, 
            "pattern": "uj", 
            "size": "1"
        }, 
        {
            "appendage": "d", 
            "continuation": false, 
            "intact": false, 
            "pattern": "oj", 
            "size": "1"
        }, 
        {
            "appendage": "r", 
            "continuation": false, 
            "intact": false, 
            "pattern": "hej", 
            "size": "1"
        }, 
        {
            "appendage": "t", 
            "continuation": false, 
            "intact": false, 
            "pattern": "verj", 
            "size": "1"
        }, 
        {
            "appendage": "t", 
            "continuation": false, 
            "intact": false, 
            "pattern": "misj", 
            "size": "2"
        }, 
        {
            "appendage": "d", 
            "continuation": false, 
            "intact": false, 
            "pattern": "nj", 
            "size": "1"
        }, 
        {
            "appendage": "s", 
            "continuation": false, 
            "intact": false, 
            "pattern": "j", 
            "size": "1"
        }
    ], 
    "l": [
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ifiabl", 
            "size": "6"
        }, 
        {
            "appendage": "y", 
            "continuation": false, 
            "intact": false, 
            "pattern": "iabl", 
            "size": "4"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "abl", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ibl", 
            "size": "3"
        }, 
        {
            "appendage": "l", 
            "continuation": true, 
            "intact": false, 
            "pattern": "bil", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "cl", 
            "size": "1"
        }, 
        {
            "appendage": "y", 
            "continuation": false, 
            "intact": false, 
            "pattern": "iful", 
            "size": "4"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ful", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ul", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ial", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ual", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "al", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ll", 
            "size": "1"
        }
    ], 
    "m": [
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ium", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": true, 
            "pattern": "um", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ism", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "mm", 
            "size": "1"
        }
    ], 
    "n": [
        {
            "appendage": "j", 
            "continuation": true, 
            "intact": false, 
            "pattern": "sion", 
            "size": "4"
        }, 
        {
            "appendage": "ct", 
            "continuation": false, 
            "intact": false, 
            "pattern": "xion", 
            "size": "4"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ion", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ian", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "an", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "een", 
            "size": "0"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "en", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "nn", 
            "size": "1"
        }
    ], 
    "p": [
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ship", 
            "size": "4"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "pp", 
            "size": "1"
        }
    ], 
    "r": [
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "er", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ear", 
            "size": "0"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ar", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "or", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ur", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "rr", 
            "size": "1"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "tr", 
            "size": "1"
        }, 
        {
            "appendage": "y", 
            "continuation": true, 
            "intact": false, 
            "pattern": "ier", 
            "size": "3"
        }
    ], 
    "s": [
        {
            "appendage": "y", 
            "continuation": true, 
            "intact": false, 
            "pattern": "ies", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "sis", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "is", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ness", 
            "size": "4"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ss", 
            "size": "0"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ous", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": true, 
            "pattern": "us", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": true, 
            "pattern": "s", 
            "size": "1"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "s", 
            "size": "0"
        }
    ], 
    "t": [
        {
            "appendage": "y", 
            "continuation": false, 
            "intact": false, 
            "pattern": "plicat", 
            "size": "4"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "at", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ment", 
            "size": "4"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ent", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ant", 
            "size": "3"
        }, 
        {
            "appendage": "b", 
            "continuation": false, 
            "intact": false, 
            "pattern": "ript", 
            "size": "2"
        }, 
        {
            "appendage": "b", 
            "continuation": false, 
            "intact": false, 
            "pattern": "orpt", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "duct", 
            "size": "1"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "sumpt", 
            "size": "2"
        }, 
        {
            "appendage": "iv", 
            "continuation": false, 
            "intact": false, 
            "pattern": "cept", 
            "size": "2"
        }, 
        {
            "appendage": "v", 
            "continuation": false, 
            "intact": false, 
            "pattern": "olut", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "sist", 
            "size": "0"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ist", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "tt", 
            "size": "1"
        }
    ], 
    "u": [
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "iqu", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ogu", 
            "size": "1"
        }
    ], 
    "v": [
        {
            "appendage": "j", 
            "continuation": true, 
            "intact": false, 
            "pattern": "siv", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "eiv", 
            "size": "0"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "iv", 
            "size": "2"
        }
    ], 
    "y": [
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "bly", 
            "size": "1"
        }, 
        {
            "appendage": "y", 
            "continuation": true, 
            "intact": false, 
            "pattern": "ily", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ply", 
            "size": "0"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ly", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ogy", 
            "size": "1"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "phy", 
            "size": "1"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "omy", 
            "size": "1"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "opy", 
            "size": "1"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ity", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ety", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "lty", 
            "size": "2"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "istry", 
            "size": "5"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ary", 
            "size": "3"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "ory", 
            "size": "3"
        }, 
        {
            "continuation": false, 
            "intact": false, 
            "pattern": "ify", 
            "size": "3"
        }, 
        {
            "appendage": "t", 
            "continuation": true, 
            "intact": false, 
            "pattern": "ncy", 
            "size": "2"
        }, 
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "acy", 
            "size": "3"
        }
    ], 
    "z": [
        {
            "continuation": true, 
            "intact": false, 
            "pattern": "iz", 
            "size": "2"
        }, 
        {
            "appendage": "s", 
            "continuation": false, 
            "intact": false, 
            "pattern": "yz", 
            "size": "1"
        }
    ]
};


},{}],82:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer');
var ruleTable = require('./lancaster_rules').rules;

function acceptable(candidate) {
    if (candidate.match(/^[aeiou]/))
        return (candidate.length > 1);
    else
        return (candidate.length > 2 && candidate.match(/[aeiouy]/));
}

// take a token, look up the applicatble rule section and attempt some stemming!
function applyRuleSection(token, intact) {
    var section = token.substr( - 1);
    var rules = ruleTable[section];

    if (rules) {
        for (var i = 0; i < rules.length; i++) {
            if ((intact || !rules[i].intact)
            // only apply intact rules to intact tokens
            && token.substr(0 - rules[i].pattern.length) == rules[i].pattern) {
                // hack off only as much as the rule indicates
                var result = token.substr(0, token.length - rules[i].size);

                // if the rules wants us to apply an appendage do so
                if (rules[i].appendage)
                    result += rules[i].appendage;

                if (acceptable(result)) {
                    token = result;

                    // see what the rules wants to do next
                    if (rules[i].continuation) {
                        // this rule thinks there still might be stem left. keep at it.
                        // since we've applied a change we'll pass false in for intact
                        return applyRuleSection(result, false);
                    } else {
                        // the rule thinks we're done stemming. drop out.
                        return result;
                    }
                }
            }
        }
    }

    return token;
}

var LancasterStemmer = new Stemmer();
module.exports = LancasterStemmer;

LancasterStemmer.stem = function(token) {
    return applyRuleSection(token.toLowerCase(), true);
}
},{"./lancaster_rules":81,"./stemmer":93}],83:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer');

// denote groups of consecutive consonants with a C and consecutive vowels
// with a V.
function categorizeGroups(token) {
    return token.replace(/[^aeiouy]+y/g, 'CV').replace(/[aeiou]+/g, 'V').replace(/[^V]+/g, 'C');
}

// denote single consonants with a C and single vowels with a V
function categorizeChars(token) {
    return token.replace(/[^aeiouy]y/g, 'CV').replace(/[aeiou]/g, 'V').replace(/[^V]/g, 'C');
}

// calculate the "measure" M of a word. M is the count of VC sequences dropping
// an initial C if it exists and a trailing V if it exists.
function measure(token) {
    if(!token)
    	return -1;

    return categorizeGroups(token).replace(/^C/, '').replace(/V$/, '').length / 2;
}

// determine if a token end with a double consonant i.e. happ
function endsWithDoublCons(token) {
    return token.match(/([^aeiou])\1$/);
}

// replace a pattern in a word. if a replacement occurs an optional callback
// can be called to post-process the result. if no match is made NULL is
// returned.
function attemptReplace(token, pattern, replacement, callback) {
    var result = null;
    
    if((typeof pattern == 'string') && token.substr(0 - pattern.length) == pattern)
        result = token.replace(new RegExp(pattern + '$'), replacement);
    else if((pattern instanceof RegExp) && token.match(pattern))
        result = token.replace(pattern, replacement);
        
    if(result && callback)
        return callback(result);
    else
        return result;
}

// attempt to replace a list of patterns/replacements on a token for a minimum
// measure M.
function attemptReplacePatterns(token, replacements, measureThreshold) {
    var replacement = token;

    for(var i = 0; i < replacements.length; i++) {   
    	if(measureThreshold == null || measure(attemptReplace(token, replacements[i][0], replacements[i][1])) > measureThreshold) {
    	    replacement = attemptReplace(replacement, replacements[i][0], replacements[i][2]) || replacement;
        }
    }
    
    return replacement;
}

// replace a list of patterns/replacements on a word. if no match is made return
// the original token.
function replacePatterns(token, replacements, measureThreshold) {
    return attemptReplacePatterns(token, replacements, measureThreshold) || token;
}

// TODO: this should replace all of the messy replacement stuff above
function replaceRegex(token, regex, includeParts, minimumMeasure) {
    var parts;
    var result = '';

    if(regex.test(token)) {
        parts = regex.exec(token);

        includeParts.forEach(function(i) {
            result += parts[i];
        });
    }

    if(measure(result) > minimumMeasure) {
        return result;
    }

    return null;
}

// step 1a as defined for the porter stemmer algorithm. 
function step1a(token) {    
    if(token.match(/(ss|i)es$/)) {
        return token.replace(/(ss|i)es$/, '$1');
    }

    if(token.substr(-1) == 's' && token.substr(-2, 1) != 's' && token.length > 2) {
        return token.replace(/s?$/, '');
    }

    return token;
}

// step 1b as defined for the porter stemmer algorithm. 
function step1b(token) {   
    if(token.substr(-3) == 'eed') {
        if(measure(token.substr(0, token.length - 3)) > 0)
            return token.replace(/eed$/, 'ee');
    } else {
        var result = attemptReplace(token, /(ed|ing)$/, '', function(token) {
            if(categorizeGroups(token).indexOf('V') >= 0) {
                result = attemptReplacePatterns(token, [['at', '', 'ate'],  ['bl', '', 'ble'], ['iz', '', 'ize']]);

                if(result != token) {
        		    return result;
        		} else {
        		  if(endsWithDoublCons(token) && token.match(/[^lsz]$/)) {
        			 return token.replace(/([^aeiou])\1$/, '$1');
                    }

        		  if(measure(token) == 1 && categorizeChars(token).substr(-3) == 'CVC' && token.match(/[^wxy]$/)) {
        			 return token + 'e';
                    }
        		}                

        		return token;
    	    }
    	    
    	    return null;
    	});
    	
    	if(result) {
    	    return result;
        }
    }

    return token;   
}

// step 1c as defined for the porter stemmer algorithm. 
function step1c(token) {
    var categorizedGroups = categorizeGroups(token);

    if(token.substr(-1) == 'y' && categorizedGroups.substr(0, categorizedGroups.length - 1).indexOf('V') > -1) {
        return token.replace(/y$/, 'i');
    }

    return token;
}

// step 2 as defined for the porter stemmer algorithm. 
function step2(token) {
    token = replacePatterns(token, [['ational', '', 'ate'], ['tional', '', 'tion'], ['enci', '', 'ence'], ['anci', '', 'ance'],
        ['izer', '', 'ize'], ['abli', '', 'able'], ['bli', '', 'ble'], ['alli', '', 'al'], ['entli', '', 'ent'], ['eli', '', 'e'],
        ['ousli', '', 'ous'], ['ization', '', 'ize'], ['ation', '', 'ate'], ['ator', '', 'ate'],['alism', '', 'al'],
        ['iveness', '', 'ive'], ['fulness', '', 'ful'], ['ousness', '', 'ous'], ['aliti', '', 'al'],
        ['iviti', '', 'ive'], ['biliti', '', 'ble'], ['logi', '', 'log']], 0);

    return token;
}

// step 3 as defined for the porter stemmer algorithm. 
function step3(token) {
    return replacePatterns(token, [['icate', '', 'ic'], ['ative', '', ''], ['alize', '', 'al'],
				   ['iciti', '', 'ic'], ['ical', '', 'ic'], ['ful', '', ''], ['ness', '', '']], 0);
}

// step 4 as defined for the porter stemmer algorithm. 
function step4(token) {
    return replaceRegex(token, /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/, [1], 1) || 
        replaceRegex(token, /^(.+?)(s|t)(ion)$/, [1, 2], 1) ||
        token; 
}

// step 5a as defined for the porter stemmer algorithm. 
function step5a(token) {
    var m = measure(token.replace(/e$/, ''));



    if(m > 1 || (m == 1 && !(categorizeChars(token).substr(-4, 3) == 'CVC' && token.match(/[^wxy].$/)))) {
        token = token.replace(/e$/, '');
    }

    return token;
}

// step 5b as defined for the porter stemmer algorithm. 
function step5b(token) {
    if(measure(token) > 1) {
       return token.replace(/ll$/, 'l'); 
    }
    
    return token;
}

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;


// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
    if(token.length < 3) return token;
    return step5b(step5a(step4(step3(step2(step1c(step1b(step1a(token.toLowerCase())))))))).toString();
};

//exports for tests
PorterStemmer.categorizeGroups = categorizeGroups;
PorterStemmer.measure = measure;
PorterStemmer.step1a = step1a;
PorterStemmer.step1b = step1b;
PorterStemmer.step1c = step1c;
PorterStemmer.step2 = step2;
PorterStemmer.step3 = step3;
PorterStemmer.step4 = step4;
PorterStemmer.step5a = step5a;
PorterStemmer.step5b = step5b;

},{"./stemmer":93}],84:[function(require,module,exports){
/*
  Copyright (c) 2018, Domingo Martín Mancera

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/

'use strict';

var Stemmer = require('./stemmer_es');

// Inherit from the utility class in stemmer_es
class PorterStemmer extends Stemmer
{
    constructor() {
      super();
    }

    isVowel(c)
    {
        var regex = /[aeiouáéíóú]/gi;

        return regex.test(c);
    }

    nextVowelPosition(word, start = 0)
    {
        var length = word.length;

        for(var position = start; position < length; position++){
            if(this.isVowel(word[position])){
                return position;
            }
        }

        return length;
    }

    nextConsonantPosition(word, start = 0)
    {
        var length = word.length;

        for(var position = start; position < length; position++){
            if(!this.isVowel(word[position])){
                return position;
            }
        }

        return length;
    }

    endsIn(word, suffix)
    {
        if(word.length < suffix.length){
            return false;
        }

        return (word.slice(-suffix.length) === suffix);
    }

    endsInArr(word, suffixes)
    {
        var matches = [];
        for(var i in suffixes) {
            if(this.endsIn(word, suffixes[i])){
                matches.push(suffixes[i]);
            }
        }
        var longest = matches.sort(function (a, b) {
            return b.length - a.length;
        })[0];

        if(longest){
            return longest
        } else {
            return '';
        }
    }

    removeAccent(word)
    {
        var accentedVowels = ['á', 'é', 'í', 'ó', 'ú'];
        var vowels = ['a', 'e', 'i', 'o', 'u'];

        for(var i in accentedVowels){
            word = word.replace(accentedVowels[i], vowels[i]);
        }

        return word;
    }

    stem(word)
    {
        var length = word.length;

        word.toLowerCase();

        if(length < 2){
            return this.removeAccent(word);
        }

        var r1, r2, rv;
        r1 = length;
        r2 = length;
        rv = length;

        // R1 is the region after the first non-vowel following a vowel, or is the null region
        // at the end of the word if there is no such non-vowel.
        for(var i = 0; i < (length - 1) && r1 == length; i++){
            if(this.isVowel(word[i]) && !this.isVowel(word[i + 1])){
                r1 = i + 2;
            }
        }

        // R2 is the region after the first non-vowel following a vowel in R1,
        // or is the null region at the end of the word if there is no such non-vowel.
        for(var i = r1; i < (length - 1) && r2 == length; i++){
            if(this.isVowel(word[i]) && !this.isVowel(word[i + 1])){
                r2 = i + 2;
            }
        }

        if(length > 3){
            if(!this.isVowel(word[1])){
                rv = this.nextVowelPosition(word, 2) + 1;
            } else if(this.isVowel(word[0]) && this.isVowel(word[1])){
                rv = this.nextConsonantPosition(word, 2) + 1;
            } else {
                rv = 3;
            }
        }

        var r1Text = word.slice(r1);
        var r2Text = word.slice(r2);
        var rvText = word.slice(rv);
        var originalWord = word;

        // Step 0: Attached pronoun
        var pronounSuffix = ['me', 'se', 'sela', 'selo', 'selas', 'selos', 'la', 'le', 'lo', 'las', 'les', 'los', 'nos'];
        var pronounSuffixPre1 = ['iéndo', 'ándo', 'ár', 'ér', 'ír'];
        var pronounSuffixPre2 = ['iendo', 'ando', 'ar', 'er', 'ir'];

        var suffix = this.endsInArr(word, pronounSuffix);

        if(suffix != ''){
            var preSuffix = this.endsInArr(rvText.slice(0, -suffix.length), pronounSuffixPre1);

            if(preSuffix != ''){
                word = this.removeAccent(word.slice(0, -suffix.length));
            } else {
                preSuffix = this.endsInArr(rvText.slice(0, -suffix.length), pronounSuffixPre2);

                if(preSuffix != '' || (this.endsIn(word.slice(0, -suffix.length), 'uyendo'))){

                    word = word.slice(0, -suffix.length);
                }
            }
        }

        if(word != originalWord){
            r1Text = word.slice(r1);
            r2Text = word.slice(r2);
            rvText = word.slice(rv);
        }

        var wordAfter0 = word;

        if(( suf = this.endsInArr(r2Text, ['anza', 'anzas', 'ico', 'ica', 'icos', 'icas', 'ismo', 'ismos',
                                            'able', 'ables', 'ible', 'ibles', 'ista', 'istas', 'oso', 'osa',
                                            'osos', 'osas', 'amiento', 'amientos', 'imiento', 'imientos'])) != '')
        {
            word = word.slice(0, -suf.length);
		}
        else if((suf = this.endsInArr(r2Text, ['icadora', 'icador', 'icación', 'icadoras', 'icadores', 'icaciones',
                                            'icante', 'icantes', 'icancia', 'icancias', 'adora', 'ador', 'ación',
                                            'adoras', 'adores', 'aciones', 'ante', 'antes', 'ancia', 'ancias'])) != '')
        {
            word = word.slice(0, -suf.length);
		}
        else if((suf = this.endsInArr(r2Text, ['logía', 'logías'])) != ''){
            word = word.slice(0, -suf.length) + 'log';
		}
        else if((suf = this.endsInArr(r2Text, ['ución', 'uciones'])) != ''){
            word = word.slice(0, -suf.length) + 'u';
		}
        else if((suf = this.endsInArr(r2Text, ['encia', 'encias'])) != ''){
            word = word.slice(0, -suf.length) + 'ente';
		}
        else if((suf = this.endsInArr(r2Text, ['ativamente', 'ivamente', 'osamente', 'icamente', 'adamente'])) != ''){
            word = word.slice(0, -suf.length);
		}
        else if((suf = this.endsInArr(r1Text, ['amente'])) != ''){
			word = word.slice(0, -suf.length);
		}
        else if((suf = this.endsInArr(r2Text, ['antemente', 'ablemente', 'iblemente', 'mente'])) != ''){
			word = word.slice(0, -suf.length);
		}
        else if((suf = this.endsInArr(r2Text, ['abilidad', 'abilidades', 'icidad', 'icidades', 'ividad', 'ividades', 'idad', 'idades'])) != ''){
			word = word.slice(0, -suf.length);
		}
        else if((suf = this.endsInArr(r2Text, ['ativa', 'ativo', 'ativas', 'ativos', 'iva', 'ivo', 'ivas', 'ivos'])) != ''){
            word = word.slice(0, -suf.length);
		}

        if(word != wordAfter0){
            r1Text = word.slice(r1);
            r2Text = word.slice(r2);
            rvText = word.slice(rv);
        }
        var wordAfter1 = word;

        if(wordAfter0 === wordAfter1){

            // Do step 2a if no ending was removed by step 1.
            var suf = this.endsInArr(rvText, ['ya', 'ye', 'yan', 'yen', 'yeron', 'yendo', 'yo', 'yó', 'yas', 'yes', 'yais', 'yamos']);

			if(suf != '' && (word.slice(-suf.length - 1, -suf.length) == 'u')){
                word = word.slice(0, -suf.length);
			}

            if(word != wordAfter1){
				r1Text = word.slice(r1);
                r2Text = word.slice(r2);
                rvText = word.slice(rv);
            }

			var wordAfter2a = word;
            // Do Step 2b if step 2a was done, but failed to remove a suffix.
            if (wordAfter2a == wordAfter1) {
                if((suf = this.endsInArr(rvText, ['arían', 'arías', 'arán', 'arás', 'aríais', 'aría', 'aréis',
                                                    'aríamos', 'aremos', 'ará', 'aré', 'erían', 'erías', 'erán',
                                                    'erás', 'eríais', 'ería', 'eréis', 'eríamos', 'eremos', 'erá',
                                                    'eré', 'irían', 'irías', 'irán', 'irás', 'iríais', 'iría', 'iréis',
                                                    'iríamos', 'iremos', 'irá', 'iré', 'aba', 'ada', 'ida', 'ía', 'ara',
                                                    'iera', 'ad', 'ed', 'id', 'ase', 'iese', 'aste', 'iste', 'an',
                                                    'aban', 'ían', 'aran', 'ieran', 'asen', 'iesen', 'aron', 'ieron',
                                                    'ado', 'ido', 'ando', 'iendo', 'ió', 'ar', 'er', 'ir', 'as', 'abas',
                                                    'adas', 'idas', 'ías', 'aras', 'ieras', 'ases', 'ieses', 'ís', 'áis',
                                                    'abais', 'íais', 'arais', 'ierais', '  aseis', 'ieseis', 'asteis',
                                                    'isteis', 'ados', 'idos', 'amos', 'ábamos', 'íamos', 'imos', 'áramos',
                                                    'iéramos', 'iésemos', 'ásemos'])) != '')
                {
                    word = word.slice(0, -suf.length);
                }else if((suf = this.endsInArr(rvText, ['en', 'es', 'éis', 'emos'])) != '') {
					word = word.slice(0, -suf.length);
                    if(this.endsIn(word, 'gu')){
                        word = word.slice(0, -1);
					}
				}
            }
        }

        r1Text = word.slice(r1);
        r2Text = word.slice(r2);
        rvText = word.slice(rv);

        if ((suf = this.endsInArr(rvText, ['os', 'a', 'o', 'á', 'í', 'ó'])) != '') {
			word = word.slice(0, -suf.length);
		} else if ((this.endsInArr(rvText , ['e','é'])) != '') {
			word = word.slice(0, -1);
			rvText = word.slice(rv);
			if (this.endsIn(rvText, 'u') && this.endsIn(word, 'gu')) {
				word = word.slice(0, -1);
			}
		}

		return this.removeAccent(word);
    }

}

module.exports = new PorterStemmer();

},{"./stemmer_es":94}],85:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel
Farsi Porter Stemmer by Fardin Koochaki <me@fardinak.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_fa');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

// disabled stemming for Farsi
// Farsi stemming will be supported soon
PorterStemmer.stem = function(token) {
    return token;
};
},{"./stemmer_fa":95}],86:[function(require,module,exports){
'use strict';

/*
Copyright (c) 2014, Ismaël Héry

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
 * Spec for the French Porter Stemmer can be found at:
 * http://snowball.tartarus.org/algorithms/french/stemmer.html
 */

var Stemmer = require('./stemmer_fr');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

// Export
PorterStemmer.stem = stem;

// Exports for test purpose
PorterStemmer.prelude = prelude;
PorterStemmer.regions = regions;
PorterStemmer.endsinArr = endsinArr;

/**
 * Stem a word thanks to Porter Stemmer rules
 * @param  {String} token Word to be stemmed
 * @return {String}       Stemmed word
 */
function stem(token) {
  token = prelude(token.toLowerCase());

  if (token.length == 1)
    return token;

  var regs = regions(token);

  var r1_txt, r2_txt, rv_txt;
  r1_txt = token.substring(regs.r1);
  r2_txt = token.substring(regs.r2);
  rv_txt = token.substring(regs.rv);

  // Step 1
  var beforeStep1 = token;
  var suf, pref2, pref3, letterBefore, letter2Before, i;
  var doStep2a = false;

  if ((suf = endsinArr(r2_txt, ['ance', 'iqUe', 'isme', 'able', 'iste', 'eux', 'ances', 'iqUes', 'ismes', 'ables', 'istes'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(token, ['icatrice', 'icateur', 'ication', 'icatrices', 'icateurs', 'ications'])) != '') {
    if (endsinArr(r2_txt, ['icatrice', 'icateur', 'ication', 'icatrices', 'icateurs', 'ications']) != '') {
      token = token.slice(0, -suf.length); // delete
    } else {
      token = token.slice(0, -suf.length) + 'iqU'; // replace by iqU
    }
  } else if ((suf = endsinArr(r2_txt, ['atrice', 'ateur', 'ation', 'atrices', 'ateurs', 'ations'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r2_txt, ['logie', 'logies'])) != '') {
    token = token.slice(0, -suf.length) + 'log'; // replace with log
  } else if ((suf = endsinArr(r2_txt, ['usion', 'ution', 'usions', 'utions'])) != '') {
    token = token.slice(0, -suf.length) + 'u'; // replace with u
  } else if ((suf = endsinArr(r2_txt, ['ence', 'ences'])) != '') {
    token = token.slice(0, -suf.length) + 'ent'; // replace with ent
  }
  // ement(s)
  else if ((suf = endsinArr(r1_txt, ['issement', 'issements'])) != '') {
    if (!isVowel(token[token.length - suf.length - 1])) {
      token = token.slice(0, -suf.length); // delete
      r1_txt = token.substring(regs.r1);
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
  } else if ((suf = endsinArr(r2_txt, ['ativement', 'ativements'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r2_txt, ['ivement', 'ivements'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(token, ['eusement', 'eusements'])) != '') {
    if ((suf = endsinArr(r2_txt, ['eusement', 'eusements'])) != '')
      token = token.slice(0, -suf.length); // delete
    else if ((suf = endsinArr(r1_txt, ['eusement', 'eusements'])) != '')
      token = token.slice(0, -suf.length) + 'eux'; // replace by eux
    else if ((suf = endsinArr(rv_txt, ['ement', 'ements'])) != '')
      token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r2_txt, ['ablement', 'ablements', 'iqUement', 'iqUements'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(rv_txt, ['ièrement', 'ièrements', 'Ièrement', 'Ièrements'])) != '') {
    token = token.slice(0, -suf.length) + 'i'; // replace by i
  } else if ((suf = endsinArr(rv_txt, ['ement', 'ements'])) != '') {
    token = token.slice(0, -suf.length); // delete
  }
  // ité(s)
  else if ((suf = endsinArr(token, ['icité', 'icités'])) != '') {
    if (endsinArr(r2_txt, ['icité', 'icités']) != '')
      token = token.slice(0, -suf.length); // delete
    else
      token = token.slice(0, -suf.length) + 'iqU'; // replace by iqU
  } else if ((suf = endsinArr(token, ['abilité', 'abilités'])) != '') {
    if (endsinArr(r2_txt, ['abilité', 'abilités']) != '')
      token = token.slice(0, -suf.length); // delete
    else
      token = token.slice(0, -suf.length) + 'abl'; // replace by abl
  } else if ((suf = endsinArr(r2_txt, ['ité', 'ités'])) != '') {
    token = token.slice(0, -suf.length); // delete if in R2
  } else if ((suf = endsinArr(token, ['icatif', 'icative', 'icatifs', 'icatives'])) != '') {
    if ((suf = endsinArr(r2_txt, ['icatif', 'icative', 'icatifs', 'icatives'])) != '') {
      token = token.slice(0, -suf.length); // delete
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
    if ((suf = endsinArr(r2_txt, ['atif', 'ative', 'atifs', 'atives'])) != '') {
      token = token.slice(0, -suf.length - 2) + 'iqU'; // replace with iqU
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
  } else if ((suf = endsinArr(r2_txt, ['atif', 'ative', 'atifs', 'atives'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r2_txt, ['if', 'ive', 'ifs', 'ives'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(token, ['eaux'])) != '') {
    token = token.slice(0, -suf.length) + 'eau'; // replace by eau
  } else if ((suf = endsinArr(r1_txt, ['aux'])) != '') {
    token = token.slice(0, -suf.length) + 'al'; // replace by al
  } else if ((suf = endsinArr(r2_txt, ['euse', 'euses'])) != '') {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r1_txt, ['euse', 'euses'])) != '') {
    token = token.slice(0, -suf.length) + 'eux'; // replace by eux
  } else if ((suf = endsinArr(rv_txt, ['amment'])) != '') {
    token = token.slice(0, -suf.length) + 'ant'; // replace by ant
    doStep2a = true;
  } else if ((suf = endsinArr(rv_txt, ['emment'])) != '') {
    token = token.slice(0, -suf.length) + 'ent'; // replace by ent
    doStep2a = true;
  } else if ((suf = endsinArr(rv_txt, ['ment', 'ments'])) != '') {
    // letter before must be a vowel in RV
    letterBefore = token[token.length - suf.length - 1];
    if (isVowel(letterBefore) && endsin(rv_txt, letterBefore + suf)) {
      token = token.slice(0, -suf.length); // delete
      doStep2a = true;
    }
  }

  // re compute regions
  r1_txt = token.substring(regs.r1);
  r2_txt = token.substring(regs.r2);
  rv_txt = token.substring(regs.rv);

  // Step 2a
  var beforeStep2a = token;
  var step2aDone = false;
  if (beforeStep1 === token || doStep2a) {
    step2aDone = true;
    if ((suf = endsinArr(rv_txt, ['îmes', 'ît', 'îtes', 'i', 'ie', 'Ie', 'ies', 'ir', 'ira', 'irai', 'iraIent', 'irais', 'irait', 'iras', 'irent', 'irez', 'iriez', 'irions', 'irons', 'iront', 'is', 'issaIent', 'issais', 'issait', 'issant', 'issante', 'issantes', 'issants', 'isse', 'issent', 'isses', 'issez', 'issiez', 'issions', 'issons', 'it'])) != '') {
      letterBefore = token[token.length - suf.length - 1];
      if (!isVowel(letterBefore) && endsin(rv_txt, letterBefore + suf))
        token = token.slice(0, -suf.length); // delete
    }
  }

  // Step 2b
  if (step2aDone && token === beforeStep2a) {
    if ((suf = endsinArr(rv_txt, ['é', 'ée', 'ées', 'és', 'èrent', 'er', 'era', 'erai', 'eraIent', 'erais', 'erait', 'eras', 'erez', 'eriez', 'erions', 'erons', 'eront', 'ez', 'iez', 'Iez'])) != '') {
      token = token.slice(0, -suf.length); // delete
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    } else if ((suf = endsinArr(rv_txt, ['ions'])) != '' && endsinArr(r2_txt, ['ions'])) {
      token = token.slice(0, -suf.length); // delete
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
    // add 'Ie' suffix to pass test for 'évanouie'
    else if ((suf = endsinArr(rv_txt, ['âmes', 'ât', 'âtes', 'a', 'ai', 'aIent', 'ais', 'ait', 'ant', 'ante', 'antes', 'ants', 'as', 'asse', 'assent', 'asses', 'assiez', 'assions'])) != '') {
      token = token.slice(0, -suf.length); // delete

      letterBefore = token[token.length - 1];
      if (letterBefore === 'e' && endsin(rv_txt, 'e' + suf))
        token = token.slice(0, -1);

      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
  }

  // Step 3
  if (!(token === beforeStep1)) {
    if (token[token.length - 1] === 'Y')
      token = token.slice(0, -1) + 'i';
    if (token[token.length - 1] === 'ç')
      token = token.slice(0, -1) + 'c';
  } // Step 4
  else {
    letterBefore = token[token.length - 1];
    letter2Before = token[token.length - 2];

    if (letterBefore === 's' && ['a', 'i', 'o', 'u', 'è', 's'].indexOf(letter2Before) == -1) {
      token = token.slice(0, -1);
      r1_txt = token.substring(regs.r1);
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }

    if ((suf = endsinArr(r2_txt, ['ion'])) != '') {
      letterBefore = token[token.length - suf.length - 1];
      if (letterBefore === 's' || letterBefore === 't') {
        token = token.slice(0, -suf.length); // delete
        r1_txt = token.substring(regs.r1);
        r2_txt = token.substring(regs.r2);
        rv_txt = token.substring(regs.rv);
      }
    }

    if ((suf = endsinArr(rv_txt, ['ier', 'ière', 'Ier', 'Ière'])) != '') {
      token = token.slice(0, -suf.length) + 'i'; // replace by i
      r1_txt = token.substring(regs.r1);
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
    if ((suf = endsinArr(rv_txt, 'e')) != '') {
      token = token.slice(0, -suf.length); // delete
      r1_txt = token.substring(regs.r1);
      r2_txt = token.substring(regs.r2);
      rv_txt = token.substring(regs.rv);
    }
    if ((suf = endsinArr(rv_txt, 'ë')) != '') {
      if (token.slice(token.length - 3, -1) === 'gu')
        token = token.slice(0, -suf.length); // delete
    }
  }

  // Step 5
  if ((suf = endsinArr(token, ['enn', 'onn', 'ett', 'ell', 'eill'])) != '') {
    token = token.slice(0, -1); // delete last letter
  }

  // Step 6
  i = token.length - 1;
  while (i > 0) {
    if (!isVowel(token[i])) {
      i--;
    } else if (i !== token.length - 1 && (token[i] === 'é' || token[i] === 'è')) {
      token = token.substring(0, i) + 'e' + token.substring(i + 1, token.length);
      break;
    } else {
      break;
    }
  }

  return token.toLowerCase();

};

/**
 * Compute r1, r2, rv regions as required by french porter stemmer algorithm
 * @param  {String} token Word to compute regions on
 * @return {Object}       Regions r1, r2, rv as offsets from the begining of the word
 */
function regions(token) {
  var r1, r2, rv, len;
  var i;

  r1 = r2 = rv = len = token.length;

  // R1 is the region after the first non-vowel following a vowel,
  for (var i = 0; i < len - 1 && r1 == len; i++) {
    if (isVowel(token[i]) && !isVowel(token[i + 1])) {
      r1 = i + 2;
    }
  }
  // Or is the null region at the end of the word if there is no such non-vowel.

  // R2 is the region after the first non-vowel following a vowel in R1
  for (i = r1; i < len - 1 && r2 == len; i++) {
    if (isVowel(token[i]) && !isVowel(token[i + 1])) {
      r2 = i + 2;
    }
  }
  // Or is the null region at the end of the word if there is no such non-vowel.

  // RV region
  var three = token.slice(0, 3);
  if (isVowel(token[0]) && isVowel(token[1])) {
    rv = 3;
  }
  if (three === 'par' || three == 'col' || three === 'tap')
    rv = 3;
  // the region after the first vowel not at the beginning of the word or null
  else {
    for (i = 1; i < len - 1 && rv == len; i++) {
      if (isVowel(token[i])) {
        rv = i + 1;
      }
    }
  }

  return {
    r1: r1,
    r2: r2,
    rv: rv
  };
};

/**
 * Pre-process/prepare words as required by french porter stemmer algorithm
 * @param  {String} token Word to be prepared
 * @return {String}       Prepared word
 */
function prelude(token) {
  token = token.toLowerCase();

  var result = '';
  var i = 0;

  // special case for i = 0 to avoid '-1' index
  if (token[i] === 'y' && isVowel(token[i + 1])) {
    result += token[i].toUpperCase();
  } else {
    result += token[i];
  }

  for (i = 1; i < token.length; i++) {
    if ((token[i] === 'u' || token[i] === 'i') && isVowel(token[i - 1]) && isVowel(token[i + 1])) {
      result += token[i].toUpperCase();
    } else if (token[i] === 'y' && (isVowel(token[i - 1]) || isVowel(token[i + 1]))) {
      result += token[i].toUpperCase();
    } else if (token[i] === 'u' && token[i - 1] === 'q') {
      result += token[i].toUpperCase();
    } else {
      result += token[i];
    }
  }

  return result;
};

/**
 * Return longest matching suffixes for a token or '' if no suffix match
 * @param  {String} token    Word to find matching suffix
 * @param  {Array} suffixes  Array of suffixes to test matching
 * @return {String}          Longest found matching suffix or ''
 */
function endsinArr(token, suffixes) {
  var i, longest = '';
  for (i = 0; i < suffixes.length; i++) {
    if (endsin(token, suffixes[i]) && suffixes[i].length > longest.length)
      longest = suffixes[i];
  }

  return longest;
};


function isVowel(letter) {
  return (letter == 'a' || letter == 'e' || letter == 'i' || letter == 'o' || letter == 'u' || letter == 'y' || letter == 'â' || letter == 'à' || letter == 'ë' ||
    letter == 'é' || letter == 'ê' || letter == 'è' || letter == 'ï' || letter == 'î' || letter == 'ô' || letter == 'û' || letter == 'ù');
};

function endsin(token, suffix) {
  if (token.length < suffix.length) return false;
  return (token.slice(-suffix.length) == suffix);
};

},{"./stemmer_fr":96}],87:[function(require,module,exports){
/*
Copyright (c) 2012, Leonardo Fenu, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_it');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;


function isVowel(letter){
	return (letter == 'a' || letter == 'e' || letter == 'i' || letter == 'o' || letter == 'u' || letter == 'à' ||
			letter == 'è' || letter == 'ì' || letter == 'ò' || letter == 'ù');
};

function getNextVowelPos(token,start){
	start = start + 1;
	var length = token.length;
	for (var i = start; i < length; i++) {
		if (isVowel(token[i])) {
			return i;
		}
	}
	return length;
};

function getNextConsonantPos(token,start){
	length=token.length
			for (var i = start; i < length; i++)
				if (!isVowel(token[i])) return i;
			return length;
};


function endsin(token, suffix) {
	if (token.length < suffix.length) return false;
	return (token.slice(-suffix.length) == suffix);
};

function endsinArr(token, suffixes) {
	for(var i=0;i<suffixes.length;i++){
		if (endsin(token, suffixes[i])) return suffixes[i];
	}
	return '';
};

function replaceAcute(token) {
	var str=token.replace(/á/gi,'à');
	str=str.replace(/é/gi,'è');
	str=str.replace(/í/gi,'ì');
	str=str.replace(/ó/gi,'ò');
	str=str.replace(/ú/gi,'ù');
	return str;
};

function vowelMarking(token) {
	function replacer(match, p1, p2, p3){
  		return p1+p2.toUpperCase()+p3;
	};	
	str=token.replace(/([aeiou])(i|u)([aeiou])/g, replacer);	
	return str;
}


// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
	
	token = token.toLowerCase();
	token = replaceAcute(token);
	token = token.replace(/qu/g,'qU');	
	token = vowelMarking(token);
	
	if (token.length<3){
		return token;
	}

	var r1 = r2 = rv = len = token.length;
	// R1 is the region after the first non-vowel following a vowel, 
	for(var i=0; i < token.length-1 && r1==len;i++){
 		if(isVowel(token[i]) && !isVowel(token[i+1]) ){
 			r1=i+2;
 		}
	}
	// Or is the null region at the end of the word if there is no such non-vowel.  

	// R2 is the region after the first non-vowel following a vowel in R1
	for(var i=r1; i< token.length-1 && r2==len;i++){
		if(isVowel(token[i]) && !isVowel(token[i+1])){
			r2=i+2;
		}
	}

	// Or is the null region at the end of the word if there is no such non-vowel. 

	// If the second letter is a consonant, RV is the region after the next following vowel, 
	
	// RV as follow

	if (len > 3) {
		if(!isVowel(token[1])) {
			// If the second letter is a consonant, RV is the region after the next following vowel
			rv = getNextVowelPos(token, 1) +1;
		} else if (isVowel(token[0]) && isVowel(token[1])) { 
			// or if the first two letters are vowels, RV is the region after the next consonant
			rv = getNextConsonantPos(token, 2) + 1;
		} else {
			//otherwise (consonant-vowel case) RV is the region after the third letter. But RV is the end of the word if these positions cannot be found.
			rv = 3;
		}
	}

	var r1_txt = token.substring(r1);
	var r2_txt = token.substring(r2);
	var rv_txt = token.substring(rv);

	var token_orig = token;

	// Step 0: Attached pronoun

	var pronoun_suf = new Array('glieli','glielo','gliene','gliela','gliele','sene','tene','cela','cele','celi','celo','cene','vela','vele','veli','velo','vene','mela','mele','meli','melo','mene','tela','tele','teli','telo','gli','ci', 'la','le','li','lo','mi','ne','si','ti','vi');	
	var pronoun_suf_pre1 = new Array('ando','endo');	
	var pronoun_suf_pre2 = new Array('ar', 'er', 'ir');
	var suf = endsinArr(token, pronoun_suf);

	if (suf!='') {
		var pre_suff1 = endsinArr(rv_txt.slice(0,-suf.length),pronoun_suf_pre1);
		var pre_suff2 = endsinArr(rv_txt.slice(0,-suf.length),pronoun_suf_pre2);	
		
		if (pre_suff1 != '') {
			token = token.slice(0,-suf.length);
		}
		if (pre_suff2 != '') {
			token = token.slice(0,  -suf.length)+ 'e';
		}
	}

	if (token != token_orig) {
		r1_txt = token.substring(r1);
		r2_txt = token.substring(r2);
		rv_txt = token.substring(rv);
	}

	var token_after0 = token;

	// Step 1:  Standard suffix removal
	
	if ((suf = endsinArr(r2_txt, new  Array('ativamente','abilamente','ivamente','osamente','icamente'))) != '') {
		token = token.slice(0, -suf.length);	// delete
	} else if ((suf = endsinArr(r2_txt, new  Array('icazione','icazioni','icatore','icatori','azione','azioni','atore','atori'))) != '') {
		token = token.slice(0,  -suf.length);	// delete
	} else if ((suf = endsinArr(r2_txt, new  Array('logia','logie'))) != '') {
		token = token.slice(0,  -suf.length)+ 'log'; // replace with log
	} else if ((suf =endsinArr(r2_txt, new  Array('uzione','uzioni','usione','usioni'))) != '') {
		token = token.slice(0,  -suf.length) + 'u'; // replace with u
	} else if ((suf = endsinArr(r2_txt, new  Array('enza','enze'))) != '') {
		token = token.slice(0,  -suf.length)+ 'ente'; // replace with ente
	} else if ((suf = endsinArr(rv_txt, new  Array('amento', 'amenti', 'imento', 'imenti'))) != '') {
		token = token.slice(0,  -suf.length);	// delete
	} else if ((suf = endsinArr(r1_txt, new  Array('amente'))) != '') {
		token = token.slice(0,  -suf.length); // delete
	} else if ((suf = endsinArr(r2_txt, new Array('atrice','atrici','abile','abili','ibile','ibili','mente','ante','anti','anza','anze','iche','ichi','ismo','ismi','ista','iste','isti','istà','istè','istì','ico','ici','ica','ice','oso','osi','osa','ose'))) != '') {
		token = token.slice(0,  -suf.length); // delete
	} else if ((suf = endsinArr(r2_txt, new  Array('abilità', 'icità', 'ività', 'ità'))) != '') {
		token = token.slice(0,  -suf.length); // delete
	} else if ((suf = endsinArr(r2_txt, new  Array('icativa','icativo','icativi','icative','ativa','ativo','ativi','ative','iva','ivo','ivi','ive'))) != '') {
		token = token.slice(0,  -suf.length);
	}
	
	
	if (token != token_after0) {
		r1_txt = token.substring(r1);
		r2_txt = token.substring(r2);
		rv_txt = token.substring(rv);
	}
	

	var token_after1 = token;
	
	// Step 2:  Verb suffixes

	if (token_after0 == token_after1) {
		if ((suf = endsinArr(rv_txt, new Array('erebbero','irebbero','assero','assimo','eranno','erebbe','eremmo','ereste','eresti','essero','iranno','irebbe','iremmo','ireste','iresti','iscano','iscono','issero','arono','avamo','avano','avate','eremo','erete','erono','evamo','evano','evate','iremo','irete','irono','ivamo','ivano','ivate','ammo','ando','asse','assi','emmo','enda','ende','endi','endo','erai','Yamo','iamo','immo','irai','irei','isca','isce','isci','isco','erei','uti','uto','ita','ite','iti','ito','iva','ivi','ivo','ono','uta','ute','ano','are','ata','ate','ati','ato','ava','avi','avo','erà','ere','erò','ete','eva','evi','evo','irà','ire','irò','ar','ir'))) != '') {
			token = token.slice(0, -suf.length);
		}
	}

	
	r1_txt = token.substring(r1);
	r2_txt = token.substring(r2);
	rv_txt = token.substring(rv);

	// Always do step 3. 

	if ((suf = endsinArr(rv_txt, new Array('ia', 'ie', 'ii', 'io', 'ià', 'iè','iì', 'iò','a','e','i','o','à','è','ì','ò'))) != '') {
		token = token.slice(0, -suf.length);
	} 

	r1_txt = token.substring(r1);
	r2_txt = token.substring(r2);
	rv_txt = token.substring(rv);
	
	if ((suf =endsinArr(rv_txt, new  Array('ch'))) != '') {
		token = token.slice(0,  -suf.length) + 'c'; // replace with c
	} else if ((suf =endsinArr(rv_txt, new  Array('gh'))) != '') {
		token = token.slice(0,  -suf.length) + 'g'; // replace with g
	}

	
	r1_txt = token.substring(r1);
	r2_txt = token.substring(r2);
	rv_txt = token.substring(rv);

	return token.toLowerCase();

};
},{"./stemmer_it":97}],88:[function(require,module,exports){
/*
Copyright (c) 2018, Hugo W.L. ter Doest

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
 * Spec for the Dutch Porter Stemmer can be found at:
 * http://snowball.tartarus.org/algorithms/dutch/stemmer.html
 */
'use strict'

var Stemmer = require('./stemmer_nl');

const DEBUG = false;
const vowels = "aeiouèy";


function isVowel(x) {
    return vowels.indexOf(x) > -1;
}


// * Return longest matching suffixes for a token or '' if no suffix match
String.prototype.endsinArr = function(suffixes) {
  var i, longest = '';
  for (i = 0; i < suffixes.length; i++) {
    if (this.endsin(suffixes[i]) && suffixes[i].length > longest.length)
      longest = suffixes[i];
  }

  if (DEBUG && longest != "") {
    console.log("Matched suffix: " + longest);
  }
  return longest;
};
  

// Returns true if token has suffix
String.prototype.endsin = function(suffix) {
  if (this.length < suffix.length) return false;
  return (this.slice(-suffix.length) == suffix);
};


// Removes a suffix of len characters and returns the string
String.prototype.removeSuffix = function(len) {
  return this.substr(0, this.length - len);
};


// Define undoubling the ending as removing the last letter if the word ends kk, dd or tt.
String.prototype.undoubleEnding = function() {
  if (this.substr(-2) == "kk" || this.substr(-2) == "tt" || this.substr(-2) == "dd") {
      return this.substr(0, this.length - 1);
  }
  else {
    return this;
  }
}


class PorterStemmer extends Stemmer {
  constructor() {
    super();
  }


  replaceAccentedCharacters(word) {
    var accentedCharactersMapping = {
      "ä": "a",
      "ë": "e",
      "ï": "i",
      "ö": "o",
      "ü": "u",
      "á": "a",
      "é": "e",
      "í": "i",
      "ó": "o",
      "ú": "u"
    }
    var result = word;
    for (var x in accentedCharactersMapping) {
      result = result.replace(new RegExp(x, "g"), accentedCharactersMapping[x]);
    }
    if (DEBUG) {
      console.log("replaceAccentedCharacters: " + result);
    }
    return result;
  }


  //Put initial y, y after a vowel, and i between vowels into upper case.
  handleYI(word) {
    // Initial y
    var result = word.replace(/^y/, "Y");
    if (DEBUG) {
      console.log("handleYI: initial y: " + result);
    }
    // y after vowel
   result = result.replace(/([aeioué])y/g, "$1Y");
    if (DEBUG) {
      console.log("handleYI: y after vowel: " + result);
    }
    // i between vowels
    var result = result.replace(/([aeioué])i([aeioué])/g, "$1I$2");
    if (DEBUG) {
      console.log("handleYI: i between vowels:" + result);
    }
    return result;
  }


  // Determines R1 and R2; adapted from the French Porter Stemmer
  markRegions(token) {
    var r1, r2, len;

    r1 = r2 = len = token.length;

    // R1 is the region after the first non-vowel following a vowel,
    for (var i = 0; i < len - 1 && r1 == len; i++) {
      if (isVowel(token[i]) && !isVowel(token[i + 1])) {
        r1 = i + 2;
      }
    }
    // Or is the null region at the end of the word if there is no such non-vowel.

    // R1 is adjusted such that the region before it contains at least 3 characters
    if (r1 != len) {
      // R1 is not null
      if (r1 < 3) {
        // Region before does not contain at least 3 characters
        if (len > 3) {
          r1 = 3;
          // Now R1 contains at least 3 characters
        }
        else {
          // It is not possible to make the region before long enough
          r1 = len;
        }
      }
    }

    // R2 is the region after the first non-vowel following a vowel in R1
    for (i = r1; i < len - 1 && r2 == len; i++) {
      if (isVowel(token[i]) && !isVowel(token[i + 1])) {
        r2 = i + 2;
      }
    }
    // Or is the null region at the end of the word if there is no such non-vowel.

    if (DEBUG) {
      console.log("Regions r1 = " + r1 + " r2 = " + r2);
    }

    this.r1 = r1;
    this.r2 = r2;
  }


  prelude(word) {
    var result = this.replaceAccentedCharacters(word);
    result = this.handleYI(result);
    this.markRegions(result);
    if (DEBUG) {
      console.log("Prelude: " + result);
    }
    return result;
  }

  
  // (1b) en   ene => delete if in R1 and preceded by a valid en-ending, and then undouble the ending
  // Define a valid en-ending as a non-vowel, and not gem.
  // Define undoubling the ending as removing the last letter if the word ends kk, dd or tt.
  step1b(word, suffixes) {
    var result = word;
    
    var match = result.endsinArr(suffixes);
    if (match != "") {
      var pos = result.length - match.length;
      if (pos >= this.r1) {
        // check the character before the matched en/ene AND check for gem
        if (!isVowel(result[pos - 1]) && result.substr(pos - 3, 3) !== "gem") {
          // delete
          result = result.removeSuffix(match.length);
          // Undouble the ending
          result = result.undoubleEnding();
        }
      }
    }
    if (DEBUG) {
      console.log("step 1b: " + result);
    }
    return result;
  }

  
  step1(word) {
    var result = word;
    // (1a) heden => replace with heid if in R1
    if (result.endsin("heden") && result.length - 5 >= this.r1) {
      result = result.removeSuffix(5);
      result += "heid";
    }
    if (DEBUG) {
      console.log("step 1a: " + result);
    }

    result = this.step1b(result, ["en", "ene"]);

    // (1c) s   se => delete if in R1 and preceded by a valid s-ending
    // Define a valid s-ending as a non-vowel other than j.
    var match = result.endsinArr(["se", "s"]);
    if (match != "") {
      var pos = result.length - match.length;
      if (pos >= this.r1) {
        // check the character before the matched s/se
        // HtD: if there is a s before the s/se the suffix should stay
        //if (!isVowel(result[pos - 1]) && result[pos - 1] != "j") {
        if (!isVowel(result[pos - 1]) && !result.match(/[js]se?$/)) {
          result = result.removeSuffix(match.length);
        }
      }  
    }
    if (DEBUG) {
      console.log("step 1c: " + result);
    }
    return result;
  }


  // Delete suffix e if in R1 and preceded by a non-vowel, and then undouble the ending
  step2(word) {
    var result = word;
    if (result.endsin("e") && this.r1 < result.length) {
      if (result.length > 1 && !isVowel(result[result.length - 2])) {
        // Delete
        result = result.removeSuffix(1);
        this.suffixeRemoved = true;
        // Undouble the ending
        result = result.undoubleEnding();
      }
    }


    if (DEBUG) {
      console.log("step2: " + result);
    }
    return result;
  }


  // Step 3a: heid => delete heid if in R2 and not preceded by c, and treat a preceding en as in step 1(b)
  step3a(word) {
    var result = word;
    if (result.endsin("heid") && result.length - 4 >= this.r2 && result[result.length - 5] != "c") {
      // Delete
      result = result.removeSuffix(4);
      // Treat a preceding en as in step 1b
      result = this.step1b(result, ["en"]);
    }
    if (DEBUG) {
      console.log("step 3a: " + result);
    }
    return result;
  }

  
  // d suffixes: Search for the longest among the following suffixes, and perform the action indicated.
  step3b(word) {
    var result = word;

    // end   ing => delete if in R2; if preceded by ig, delete if in R2 and not preceded by e, otherwise undouble the ending
    var suf = "";
    if (suf = result.endsinArr(["end", "ing"])) {
      if ((result.length - 3) >= this.r2) {
        // Delete suffix
        result = result.removeSuffix(3);
        //this.regions(result);
        if (result.endsin("ig") && (result.length - 2 >= this.r2) && result[result.length - 3] != "e") {
          // Delete suffix
          result = result.removeSuffix(2);
        }
        else {
          result = result.undoubleEnding();
        }
      }
    }
      
    // ig => delete if in R2 and not preceded by e
    if (result.endsin("ig") && this.r2 <= result.length - 2 && result[result.length - 3] != "e") {
      result = result.removeSuffix(2);
    }
        
    // lijk => delete if in R2, and then repeat step 2
    if (result.endsin("lijk") && this.r2 <= result.length - 4) {
      result = result.removeSuffix(4);
      // repeat step 2
      result = this.step2(result);
    }

    // baar => delete if in R2
    if (result.endsin("baar") && this.r2 <= result.length - 4) {
      result = result.removeSuffix(4);
    }    

    // bar => delete if in R2 and if step 2 actually removed an e
    if (result.endsin("bar") && this.r2 <= result.length - 3 && this.suffixeRemoved) {
      result = result.removeSuffix(3);
    }    
    
    if (DEBUG) {
      console.log("step 3b: " + result);
    }
    return result;
  }

  
  // undouble vowel => If the words ends CVD, where C is a non-vowel,
  // D is a non-vowel other than I, and V is double a, e, o or u,
  // remove one of the vowels from V (for example, maan -> man, brood -> brod)
  step4(word) {
    var result = word;
    
    if (result.match(/[bcdfghjklmnpqrstvwxz](aa|ee|oo|uu)[bcdfghjklmnpqrstvwxz]$/)) {
      result = result.substr(0, result.length - 2) + result[result.length - 1];
    }
    
    if (DEBUG) {
      console.log("step4: " + result);
    }
    return result;
  }

  // Turn I and Y back into lower case.
  postlude(word) {
    return word.toLowerCase();
  }

  stem(word) {
    return this.postlude(this.step4(this.step3b(this.step3a(this.step2(this.step1(this.prelude(word)))))));
  }
}


module.exports = new PorterStemmer();

},{"./stemmer_nl":99}],89:[function(require,module,exports){
/*
Copyright (c) 2014, Kristoffer Brabrand

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_no');

// Get the part of the token after the first non-vowel following a vowel
function getR1(token) {
    var match = token.match(/[aeiouyæåø]{1}[^aeiouyæåø]([A-Za-z0-9_æøåÆØÅäÄöÖüÜ]+)/);

    if (match) {
        var preR1Length = match.index + 2;

        if (preR1Length < 3 && preR1Length > 0) {
            return token.slice(3);
        } else if (preR1Length >= 3) {
            return match[1];
        } else {
            return token;
        }
    }

    return null;
}

function step1(token) {
    // Perform step 1a-c
    var step1aResult = step1a(token),
        step1bResult = step1b(token),
        step1cResult = step1c(token);

    // Returne the shortest result string (from 1a, 1b and 1c)
    if (step1aResult.length < step1bResult.length) {
        return (step1aResult.length < step1cResult.length) ? step1aResult : step1cResult;
    } else {
        return (step1bResult.length < step1cResult.length) ? step1bResult : step1cResult;
    }
}

// step 1a as defined for the porter stemmer algorithm.
function step1a(token) {
    var r1 = getR1(token);

    if (!r1) {
        return token;
    }

    var r1Match = r1.match(/(a|e|ede|ande|ende|ane|ene|hetene|en|heten|ar|er|heter|as|es|edes|endes|enes|hetenes|ens|hetens|ers|ets|et|het|ast)$/);

    if (r1Match) {
        return token.replace(new RegExp(r1Match[1] + '$'), '');
    }

    return token;
}

// step 1b as defined for the porter stemmer algorithm.
function step1b(token) {
    var r1 = getR1(token);

    if (!r1) {
        return token;
    }

    if (token.match(/(b|c|d|f|g|h|j|l|m|n|o|p|r|t|v|y|z)s$/)) {
        return token.slice(0, -1);
    }

    if (token.match(/([^aeiouyæåø]k)s$/)) {
        return token.slice(0, -1);
    }

    return token;
}

// step 1c as defined for the porter stemmer algorithm.
function step1c(token) {
    var r1 = getR1(token);

    if (!r1) {
        return token;
    }

    if (r1.match(/(erte|ert)$/)) {
        return token.replace(/(erte|ert)$/, 'er');
    }

    return token;
}

// step 2 as defined for the porter stemmer algorithm.
function step2(token) {
    var r1 = getR1(token);

    if (!r1) {
        return token;
    }

    if (r1.match(/(d|v)t$/)) {
        return token.slice(0, -1);
    }

    return token;
}

// step 3 as defined for the porter stemmer algorithm.
function step3(token) {
    var r1 = getR1(token);

    if (!r1)
        return token;

    var r1Match = r1.match(/(leg|eleg|ig|eig|lig|elig|els|lov|elov|slov|hetslov)$/);

    if (r1Match) {
        return token.replace(new RegExp(r1Match[1] + '$'), '');
    }

    return token;
}

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
    return step3(step2(step1(token.toLowerCase()))).toString();
};

//exports for tests
PorterStemmer.getR1  = getR1;
PorterStemmer.step1  = step1;
PorterStemmer.step1a = step1a;
PorterStemmer.step1b = step1b;
PorterStemmer.step1c = step1c;
PorterStemmer.step2  = step2;
PorterStemmer.step3  = step3;
},{"./stemmer_no":100}],90:[function(require,module,exports){
/*
Copyright (c) 2015, Luís Rodrigues

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

module.exports = (function () {
  'use strict';

  var Stemmer     = require('./stemmer_pt'),
    Token         = require('./token'),
    PorterStemmer = new Stemmer();

  /**
   * Marks a region after the first non-vowel following a vowel, or the
   * null region at the end of the word if there is no such non-vowel.
   *
   * @param {Object} token Token to stem.
   * @param {Number} start Start index (defaults to 0).
   * @param {Number}       Region start index.
   */
   var markRegionN = function (start) {
    var index = start || 0,
      length = this.string.length,
      region = length;

    while (index < length - 1 && region === length) {
      if (this.hasVowelAtIndex(index) && !this.hasVowelAtIndex(index + 1)) {
        region = index + 2;
      }
      index++;
    }

    return region;
  };

  /**
   * Mark RV.
   *
   * @param  {Object} token Token to stem.
   * @return {Number}       Region start index.
   */
  var markRegionV = function () {
    var rv = this.string.length;

    if (rv > 3) {
      if (!this.hasVowelAtIndex(1)) {
        rv = this.nextVowelIndex(2) + 1;

      } else if (this.hasVowelAtIndex(0) && this.hasVowelAtIndex(1)) {
        rv = this.nextConsonantIndex(2) + 1;

      } else {
        rv = 3;
      }
    }

    return rv;
  };

  /**
   * Prelude.
   *
   * Nasalised vowel forms should be treated as a vowel followed by a consonant.
   *
   * @param  {String} token Word to stem.
   * @return {String}       Stemmed token.
   */
  function prelude (token) {
    return token
    .replaceAll('ã', 'a~')
    .replaceAll('õ', 'o~');
  }

  /**
   * Step 1: Standard suffix removal.
   *
   * This step should always be performed.
   *
   * @param  {Token} token Word to stem.
   * @return {Token}       Stemmed token.
   */
  function standardSuffix (token) {

    token.replaceSuffixInRegion([
      'amentos', 'imentos', 'aço~es', 'adoras', 'adores', 'amento', 'imento',

      'aça~o', 'adora', 'ância', 'antes', 'ismos', 'istas',

      'ador', 'ante', 'ável', 'ezas', 'icas', 'icos', 'ismo', 'ista', 'ível',
      'osas', 'osos',

      'eza', 'ica', 'ico', 'osa', 'oso'

      ], '', 'r2');

    token.replaceSuffixInRegion(['logias', 'logia'], 'log', 'r2');

    // token.replaceSuffixInRegion(['uço~es', 'uça~o'], 'u', 'r1');

    token.replaceSuffixInRegion(['ências', 'ência'], 'ente', 'r2');

    token.replaceSuffixInRegion([
      'ativamente', 'icamente', 'ivamente', 'osamente', 'adamente'
    ], '', 'r2');

    token.replaceSuffixInRegion('amente', '', 'r1');

    token.replaceSuffixInRegion([
      'antemente', 'avelmente', 'ivelmente', 'mente'
    ], '', 'r2');

    token.replaceSuffixInRegion([
      'abilidades', 'abilidade',
      'icidades', 'icidade',
      'ividades', 'ividade',
      'idades', 'idade'
    ], '', 'r2');

    token.replaceSuffixInRegion([
      'ativas', 'ativos', 'ativa', 'ativo',
      'ivas', 'ivos', 'iva', 'ivo'
    ], '', 'r2');

    if (token.hasSuffix('eiras') || token.hasSuffix('eira')) {
      token.replaceSuffixInRegion(['iras', 'ira'], 'ir', 'rv');
    }

    return token;
  }

  /**
   * Step 2: Verb suffix removal.
   *
   * Perform this step if no ending was removed in step 1.
   *
   * @param  {Token} token   Token to stem.
   * @return {Token}         Stemmed token.
   */
  function verbSuffix (token) {

    token.replaceSuffixInRegion([
      'aríamos', 'ássemos', 'eríamos', 'êssemos', 'iríamos', 'íssemos',

      'áramos', 'aremos', 'aríeis', 'ásseis', 'ávamos', 'éramos', 'eremos',
      'eríeis', 'ésseis', 'íramos', 'iremos', 'iríeis', 'ísseis',

      'ara~o', 'ardes', 'areis', 'áreis', 'ariam', 'arias', 'armos', 'assem',
      'asses', 'astes', 'áveis', 'era~o', 'erdes', 'ereis', 'éreis', 'eriam',
      'erias', 'ermos', 'essem', 'esses', 'estes', 'íamos', 'ira~o', 'irdes',
      'ireis', 'íreis', 'iriam', 'irias', 'irmos', 'issem', 'isses', 'istes',

      'adas', 'ados', 'amos', 'ámos', 'ando', 'aram', 'aras', 'arás', 'arei',
      'arem', 'ares', 'aria', 'asse', 'aste', 'avam', 'avas', 'emos', 'endo',
      'eram', 'eras', 'erás', 'erei', 'erem', 'eres', 'eria', 'esse', 'este',
      'idas', 'idos', 'íeis', 'imos', 'indo', 'iram', 'iras', 'irás', 'irei',
      'irem', 'ires', 'iria', 'isse', 'iste',

      'ada', 'ado', 'ais', 'ara', 'ará', 'ava', 'eis', 'era', 'erá', 'iam',
      'ias', 'ida', 'ido', 'ira', 'irá',

      'am', 'ar', 'as', 'ei', 'em', 'er', 'es', 'eu', 'ia', 'ir', 'is', 'iu', 'ou'

    ], '', 'rv');

    return token;
  }

  /**
   * Step 3: Delete suffix i.
   *
   * Perform this step if the word was changed, in RV and preceded by c.
   *
   * @param  {Token} token   Token to stem.
   * @return {Token}         Stemmed token.
   */
  function iPrecededByCSuffix (token) {

    if (token.hasSuffix('ci')) {
      token.replaceSuffixInRegion('i', '', 'rv');
    }

    return token;
  }

  /**
   * Step 4: Residual suffix.
   *
   * Perform this step if steps 1 and 2 did not alter the word.
   *
   * @param  {Token} token Token to stem.
   * @return {Token}       Stemmed token.
   */
  function residualSuffix (token) {

    token.replaceSuffixInRegion(['os', 'a', 'i', 'o', 'á', 'í', 'ó'], '', 'rv');

    return token;
  }

  /**
   * Step 5: Residual form.
   *
   * This step should always be performed.
   *
   * @param  {Token} token Token to stem.
   * @return {Token}       Stemmed token.
   */
  function residualForm (token) {

    var tokenString = token.string;

    if (token.hasSuffix('gue') || token.hasSuffix('gué') || token.hasSuffix('guê')) {
      token.replaceSuffixInRegion(['ue', 'ué', 'uê'], '', 'rv');
    }

    if (token.hasSuffix('cie') || token.hasSuffix('cié') || token.hasSuffix('ciê')) {
      token.replaceSuffixInRegion(['ie', 'ié', 'iê'], '', 'rv');
    }

    if (tokenString === token.string) {
      token.replaceSuffixInRegion(['e', 'é', 'ê'], '', 'rv');
    }

    token.replaceSuffixInRegion('ç', 'c', 'all');

    return token;
  }

  /**
   * Postlude.
   *
   * Turns a~, o~ back into ã, õ.
   *
   * @param  {String} token Word to stem.
   * @return {String}       Stemmed token.
   */
  function postlude (token) {
    return token
      .replaceAll('a~', 'ã')
      .replaceAll('o~', 'õ');
  }

  /**
   * Stems a word using a Porter stemmer algorithm.
   *
   * @param  {String} word Word to stem.
   * @return {String}      Stemmed token.
   */
  PorterStemmer.stem = function (word) {
    var token = new Token(word.toLowerCase()),
      original;

    token = prelude(token);

    token.usingVowels('aeiouáéíóúâêôàãõ')
      .markRegion('all', 0)
      .markRegion('r1', null, markRegionN)
      .markRegion('r2', token.regions.r1, markRegionN)
      .markRegion('rv', null, markRegionV);

    original = token.string;

    // Always do step 1.
    token = standardSuffix(token);

    // Do step 2 if no ending was removed by step 1.
    if (token.string === original) {
      token = verbSuffix(token);
    }

    // If the last step to be obeyed — either step 1 or 2 — altered the word,
    // do step 3. Alternatively, if neither steps 1 nor 2 altered the word, do
    // step 4.
    token = token.string !== original ? iPrecededByCSuffix(token) : residualSuffix(token);

    // Always do step 5.
    token = residualForm(token);

    token = postlude(token);

    return token.string;
  };

  return PorterStemmer;
})();

},{"./stemmer_pt":101,"./token":104}],91:[function(require,module,exports){
/*
Copyright (c) 2012, Polyakov Vladimir, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_ru');

var PorterStemmer = new Stemmer();
module.exports = PorterStemmer;

function attemptReplacePatterns(token, patterns) {
	var replacement = null;
	var i = 0, isReplaced = false;
	while ((i < patterns.length) && !isReplaced) {
		if (patterns[i][0].test(token)) {
			replacement = token.replace(patterns[i][0], patterns[i][1]);
			isReplaced = true;
		}
		i++;
	}
	return replacement;
};

function perfectiveGerund(token) {
	var result = attemptReplacePatterns(token, [
			[/[ая]в(ши|шись)$/g, ''],
			[/(ив|ивши|ившись|ывши|ывшись|ыв)$/g, '']
		]);
	return result;
};

function adjectival(token) {
	var result = adjective(token);
	if (result != null) {
		var pariticipleResult = participle(result);
		result = pariticipleResult ? pariticipleResult : result;
	}
	return result;
};

function adjective(token) {
	var result = attemptReplacePatterns(token, [
			[/(ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)$/g, '']
		]);
	return result;
};

function participle(token) {
	var result = attemptReplacePatterns(token, [
		[/([ая])(ем|нн|вш|ющ|щ)$/g, '$1'],
		[/(ивш|ывш|ующ)$/g, '']
	]);
	return result;
};

function reflexive(token) {
	var result = attemptReplacePatterns(token, [
		[/(ся|сь)$/g, '']
	]);
	return result;
};

function verb(token) {
	var result = attemptReplacePatterns(token, [
		[/([ая])(ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно)$/g, '$1'],
		[/(ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ен|ило|ыло|ено|ят|ует|ит|ыт|ены|ить|ыть|ишь|ую|ю)$/g, '']
	]);
	return result;
};

function noun(token) {
	var result = attemptReplacePatterns(token, [
		[/(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/g, '']
	]);
	return result;
};

function superlative (token) {
	var result = attemptReplacePatterns(token, [
		[/(ейш|ейше)$/g, '']
	]);
	return result;
};

function derivational (token) {
	var result = attemptReplacePatterns(token, [
		[/(ост|ость)$/g, '']
	]);
	return result;
};

// perform full stemming algorithm on a single word
PorterStemmer.stem = function(token) {
	token = token.toLowerCase().replace(/ё/g, 'е');
	var volwesRegexp = /^(.*?[аеиоюяуыиэ])(.*)$/g;
	var RV = volwesRegexp.exec(token);
	if (!RV || RV.length < 3) {
		return token;
	}
	var head = RV[1];
	RV = RV[2];
	volwesRegexp.lastIndex = 0;
	var R2 = volwesRegexp.exec(RV);
	var result = perfectiveGerund(RV);
	if (result === null) {
		var resultReflexive = reflexive(RV) || RV;
		result = adjectival(resultReflexive);
		if (result === null) {
			result = verb(resultReflexive);
			if (result === null) {
				result = noun(resultReflexive);
				if (result === null) {
					result = resultReflexive;
				}
			}
		}
	}
	result = result.replace(/и$/g, '');
	var derivationalResult = result
	if (R2 && R2[2]) {
		derivationalResult = derivational(R2[2]);
		if (derivationalResult != null) {
			derivationalResult = derivational(result);
		} else {
			derivationalResult = result;
		}
	}

	var superlativeResult = superlative(derivationalResult) || derivationalResult;

	superlativeResult = superlativeResult.replace(/(н)н/g, '$1');
	superlativeResult = superlativeResult.replace(/ь$/g, '');
	return head + superlativeResult;
};

},{"./stemmer_ru":102}],92:[function(require,module,exports){
/*
Copyright (c) 2017, Dogan Yazar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Stemmer = require('./stemmer_sv')

//Get R1 region
function getRegions(str) {
  const match = str.match(/[aeiouyäåö][^aeiouyäåö]([a-zåäö]+)/)
  let r1 = ''
  if (match && match[1]) {
    r1 = match[1]
    if (match.index + 2 < 3) { //Not clear why we need this! Algorithm does not describe this part!
      r1 = str.slice(3)
    }
  }
  return {
    r1,
    rest: str.slice(0, str.length - r1.length)
  }
}

function step1a(str, regions = getRegions(str)) {
  const r1 = regions.r1
  if (!r1) {
    return str
  }

  const regEx = /(heterna|hetens|anden|andes|andet|arens|arnas|ernas|heten|heter|ornas|ande|ades|aren|arna|arne|aste|erna|erns|orna|ade|are|ast|ens|ern|het|ad|ar|as|at|en|er|es|or|a|e)$/
  const match = r1.match(regEx)
  return match ? regions.rest + r1.slice(0, match.index) : str
}

function step1b(str, regions = getRegions(str)) {
  if (regions.r1 && str.match(/(b|c|d|f|g|h|j|k|l|m|n|o|p|r|t|v|y)s$/)) {
    return str.slice(0, -1)
  }

  return str
}

function step1(str) {
  const regions = getRegions(str)
  const resA = step1a(str, regions)
  const resB = step1b(str, regions)

  return resA.length < resB.length ? resA : resB
}

function step2(str, regions = getRegions(str)) {
  const r1 = regions.r1
  if (r1 && r1.match(/(dd|gd|nn|dt|gt|kt|tt)$/)) {
    return str.slice(0, -1)
  }
  return str
}

function step3(str, regions = getRegions(str)) {
  const r1 = regions.r1
  if (r1) {
    if (r1.match(/(lös|full)t$/)) {
      return str.slice(0, -1)
    }

    const match = r1.match(/(lig|ig|els)$/)
    return match ? regions.rest + r1.slice(0, match.index) : str
  }

  return str
}

function stem(_str) {
  const str = _str.toLowerCase()
  return step3(step2(step1(str)))
}

var PorterStemmer = new Stemmer()
module.exports = PorterStemmer

// perform full stemming algorithm on a single word
PorterStemmer.stem = stem

},{"./stemmer_sv":103}],93:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords');
var Tokenizer = require('../tokenizers/aggressive_tokenizer');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.addStopWord = function(stopWord) {
        stopwords.words.push(stopWord);
    };

    stemmer.addStopWords = function(moreStopWords) {
        stopwords.words = stopwords.words.concat(moreStopWords);
    };

    stemmer.removeStopWord = function(stopWord) {
        this.removeStopWords([stopWord])
    };

    stemmer.removeStopWords = function(moreStopWords) {
        moreStopWords.forEach(function(stopWord){
            var idx = stopwords.words.indexOf(stopWord);
            if (idx >= 0) {
                stopwords.words.splice(idx, 1);
            }
        });

    };


    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        var lowercaseText = text.toLowerCase();
        var tokens = new Tokenizer().tokenize(lowercaseText);

        if (keepStops) {
            tokens.forEach(function(token) {
                stemmedTokens.push(stemmer.stem(token));
            });
        }

        else {
            tokens.forEach(function(token) {
                if (stopwords.words.indexOf(token) == -1)
                    stemmedTokens.push(stemmer.stem(token));
            });
        }

        return stemmedTokens;
    };

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };

        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
    };
}

},{"../tokenizers/aggressive_tokenizer":106,"../util/stopwords":132}],94:[function(require,module,exports){
/*
Copyright (c) 2012, 2018 David Przybilla, Chris Umbel, Hugo W.L. ter Doest 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_es');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_es');

class Stemmer {
    constructor() {
      
    }

    stem(token) {
        return token;
    };

    tokenizeAndStem(text, keepStops) {
        var stemmedTokens = [];
        
        var that = this;
        new Tokenizer().tokenize(text).forEach(function(token) {
            if (keepStops || stopwords.words.indexOf(token) == -1) {
                var resultToken = token.toLowerCase();
                if (resultToken.match(new RegExp('[a-záéíóúüñ0-9]+', 'gi'))) {
                    resultToken = that.stem(resultToken);
                }
                stemmedTokens.push(resultToken);
            }
        });
        
        return stemmedTokens;
    };

    attach() {
      var that = this;
      String.prototype.stem = function() {
            return that.stem(this);
        };
        
      String.prototype.tokenizeAndStem = function(keepStops) {
          return that.tokenizeAndStem(this, keepStops);
      };
    };
}

module.exports = Stemmer;

},{"../tokenizers/aggressive_tokenizer_es":107,"../util/stopwords_es":133}],95:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel
Farsi Stemmer by Fardin Koochaki <me@fardinak.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_fa');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_fa');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        
        new Tokenizer().tokenize(text).forEach(function(token) {
            if(keepStops || stopwords.words.indexOf(token) == -1)
                stemmedTokens.push(stemmer.stem(token));
        });
        
        return stemmedTokens;
    };

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };
        
        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
    };
}

},{"../tokenizers/aggressive_tokenizer_fa":108,"../util/stopwords_fa":134}],96:[function(require,module,exports){
/*
Copyright (c) 2014, Ismaël Héry

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_fr');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_fr');

module.exports = function() {
   var stemmer = this;

   stemmer.stem = function(token) {
      return token;
   };

   stemmer.tokenizeAndStem = function(text, keepStops) {
      var stemmedTokens = [];

      new Tokenizer().tokenize(text).forEach(function(token) {
         if (keepStops || stopwords.words.indexOf(token) == -1) {
            var resultToken = token.toLowerCase();
            if (resultToken.match(/[a-zâàëéêèïîôûùç0-9]/gi)) {
               resultToken = stemmer.stem(resultToken);
            }
            stemmedTokens.push(resultToken);
         }
      });

      return stemmedTokens;
   };

   stemmer.attach = function() {
      String.prototype.stem = function() {
         return stemmer.stem(this);
      };

      String.prototype.tokenizeAndStem = function(keepStops) {
         return stemmer.tokenizeAndStem(this, keepStops);
      };
   };
}

},{"../tokenizers/aggressive_tokenizer_fr":109,"../util/stopwords_fr":135}],97:[function(require,module,exports){
var stopwords = require('../util/stopwords_it');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_it');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        
        new Tokenizer().tokenize(text).forEach(function(token) {
            if (keepStops || stopwords.words.indexOf(token) == -1) {
                var resultToken = token.toLowerCase();
                if (resultToken.match(/[a-zàèìòù0-9]/gi)) {
                    resultToken = stemmer.stem(resultToken);
                }
                stemmedTokens.push(resultToken);
            }
        });
        
        return stemmedTokens;
    };

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };
        
        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
    };
}
},{"../tokenizers/aggressive_tokenizer_it":111,"../util/stopwords_it":137}],98:[function(require,module,exports){
/*
 Copyright (c) 2012, Guillaume Marty

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * A very basic stemmer that performs the following steps:
 * * Stem katakana.
 * Inspired by:
 * http://svn.apache.org/repos/asf/lucene/dev/trunk/lucene/analysis/kuromoji/src/java/org/apache/lucene/analysis/ja/JapaneseKatakanaStemFilter.java
 *
 * This script assumes input is normalized using normalizer_ja().
 *
 * \@todo Use .bind() in StemmerJa.prototype.attach().
 */

var Tokenizer = require('../tokenizers/tokenizer_ja');
var stopwords = require('../util/stopwords_ja');



/**
 * @constructor
 */
var StemmerJa = function() {
};


/**
 * Tokenize and stem a text.
 * Stop words are excluded except if the second argument is true.
 *
 * @param {string} text
 * @param {boolean} keepStops Whether to keep stop words from the output or not.
 * @return {Array.<string>}
 */
StemmerJa.prototype.tokenizeAndStem = function(text, keepStops) {
  var self = this;
  var stemmedTokens = [];
  var tokens = new Tokenizer().tokenize(text);

  // This is probably faster than an if at each iteration.
  if (keepStops) {
    tokens.forEach(function(token) {
      var resultToken = token.toLowerCase();
      resultToken = self.stem(resultToken);
      stemmedTokens.push(resultToken);
    });
  } else {
    tokens.forEach(function(token) {
      if (stopwords.indexOf(token) == -1) {
        var resultToken = token.toLowerCase();
        resultToken = self.stem(resultToken);
        stemmedTokens.push(resultToken);
      }
    });
  }

  return stemmedTokens;
};


/**
 * Stem a term.
 *
 * @param {string} token
 * @return {string}
 */
StemmerJa.prototype.stem = function(token) {
  token = this.stemKatakana(token);

  return token;
};


/**
 * Remove the final prolonged sound mark on katakana if length is superior to
 * a threshold.
 *
 * @param {string} token A katakana string to stem.
 * @return {string} A katakana string stemmed.
 */
StemmerJa.prototype.stemKatakana = function(token) {
  var HIRAGANA_KATAKANA_PROLONGED_SOUND_MARK = 'ー';
  var DEFAULT_MINIMUM_LENGTH = 4;

  if (token.length >= DEFAULT_MINIMUM_LENGTH
      && token.slice(-1) === HIRAGANA_KATAKANA_PROLONGED_SOUND_MARK
      && this.isKatakana(token)) {
    token = token.slice(0, token.length - 1);
  }
  return token;
};


/**
 * Is a string made of fullwidth katakana only?
 * This implementation is the fastest I know:
 * http://jsperf.com/string-contain-katakana-only/2
 *
 * @param {string} str A string.
 * @return {boolean} True if the string has katakana only.
 */
StemmerJa.prototype.isKatakana = function(str) {
  return !!str.match(/^[゠-ヿ]+$/);
};

// Expose an attach function that will patch String with new methods.
StemmerJa.prototype.attach = function() {
  var self = this;

  String.prototype.stem = function() {
    return self.stem(this);
  };

  String.prototype.tokenizeAndStem = function(keepStops) {
    return self.tokenizeAndStem(this, keepStops);
  };
};

module.exports = StemmerJa;

},{"../tokenizers/tokenizer_ja":124,"../util/stopwords_ja":138}],99:[function(require,module,exports){
/*
Copyright (c) 2018 Hugo W.L. ter Doest 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_nl');
var Tokenizer = require('../tokenizers/aggressive_tokenizer');

class Stemmer {
    constructor() {
      
    }

    stem(token) {
        return token;
    };

    tokenizeAndStem(text, keepStops) {
        var stemmedTokens = [];
        
        var that = this;
        new Tokenizer().tokenize(text).forEach(function(token) {
            if (keepStops || stopwords.words.indexOf(token) == -1) {
                var resultToken = token.toLowerCase();
                if (resultToken.match(new RegExp('[a-zäëïöüáéíóúè0-9]+', 'gi'))) {
                    resultToken = that.stem(resultToken);
                }
                stemmedTokens.push(resultToken);
            }
        });
        
        return stemmedTokens;
    };

    attach() {
      var that = this;
      String.prototype.stem = function() {
            return that.stem(this);
        };
        
      String.prototype.tokenizeAndStem = function(keepStops) {
          return that.tokenizeAndStem(this, keepStops);
      };
    };
}

module.exports = Stemmer;
},{"../tokenizers/aggressive_tokenizer":106,"../util/stopwords_nl":139}],100:[function(require,module,exports){
/*
Copyright (c) 2014, Kristoffer Brabrand

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_no');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_no');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.addStopWord = function(stopWord) {
        stopwords.words.push(stopWord);
    };

    stemmer.addStopWords = function(moreStopWords) {
        stopwords.words = stopwords.words.concat(moreStopWords);
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];

        new Tokenizer().tokenize(text).forEach(function(token) {
            if(keepStops || stopwords.words.indexOf(token.toLowerCase()) == -1)
                stemmedTokens.push(stemmer.stem(token));
        });

        return stemmedTokens;
    };

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };

        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
    };
}

},{"../tokenizers/aggressive_tokenizer_no":113,"../util/stopwords_no":140}],101:[function(require,module,exports){
/*
Copyright (c) 2014, Ismaël Héry

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

module.exports = function () {
  'use strict';

  var Stemmer = this,
    stopwords = require('../util/stopwords_pt'),
    Tokenizer = require('../tokenizers/aggressive_tokenizer_pt');

  Stemmer.stem = function (token) {
    return token;
  };

  Stemmer.addStopWords = function (word) {
    stopwords.words.push(word);
  };

  Stemmer.addStopWords = function (words) {
    stopwords.words = stopwords.words.concat(words);
  };

  Stemmer.tokenizeAndStem = function(text, keepStops) {
    var stemmedTokens = [];

    var tokenStemmer = function (token) {
      if (keepStops || stopwords.words.indexOf(token.toLowerCase()) === -1) {
        stemmedTokens.push(Stemmer.stem(token));
      }
    };

    new Tokenizer().tokenize(text).forEach(tokenStemmer);

    return stemmedTokens;
  };

  Stemmer.attach = function () {
    String.prototype.stem = function () {
      return Stemmer.stem(this);
    };

    String.prototype.tokenizeAndStem = function (keepStops) {
      return Stemmer.tokenizeAndStem(this, keepStops);
    };
  };
};

},{"../tokenizers/aggressive_tokenizer_pt":115,"../util/stopwords_pt":141}],102:[function(require,module,exports){
/*
Copyright (c) 2012, Polyakov Vladimir, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_ru');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_ru');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];
        
        new Tokenizer().tokenize(text).forEach(function(token) {
            if (keepStops || stopwords.words.indexOf(token) == -1) {
                var resultToken = token.toLowerCase();
                if (resultToken.match(new RegExp('[а-яё0-9]+', 'gi'))) {
                    resultToken = stemmer.stem(resultToken);
                }
                stemmedTokens.push(resultToken);
            }
        });
        
        return stemmedTokens;
    };

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };
        
        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
    };
}

},{"../tokenizers/aggressive_tokenizer_ru":116,"../util/stopwords_ru":142}],103:[function(require,module,exports){
/*
Copyright (c) 2017, Dogan Yazar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var stopwords = require('../util/stopwords_sv');
var Tokenizer = require('../tokenizers/aggressive_tokenizer_sv');

module.exports = function() {
    var stemmer = this;

    stemmer.stem = function(token) {
        return token;
    };

    stemmer.addStopWord = function(stopWord) {
        stopwords.words.push(stopWord);
    };

    stemmer.addStopWords = function(moreStopWords) {
        stopwords.words = stopwords.words.concat(moreStopWords);
    };

    stemmer.tokenizeAndStem = function(text, keepStops) {
        var stemmedTokens = [];

        new Tokenizer().tokenize(text).forEach(function(token) {
            if(keepStops || stopwords.words.indexOf(token.toLowerCase()) == -1)
                stemmedTokens.push(stemmer.stem(token));
        });

        return stemmedTokens;
    };

    stemmer.attach = function() {
        String.prototype.stem = function() {
            return stemmer.stem(this);
        };

        String.prototype.tokenizeAndStem = function(keepStops) {
            return stemmer.tokenizeAndStem(this, keepStops);
        };
    };
}

},{"../tokenizers/aggressive_tokenizer_sv":117,"../util/stopwords_sv":143}],104:[function(require,module,exports){
/*
Copyright (c) 2015, Luís Rodrigues

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

module.exports = (function () {
  'use strict';

  /**
   * Stemmer token constructor.
   *
   * @param {String} string Token string.
   */
  var Token = function (string) {
    this.vowels   = '';
    this.regions  = {};
    this.string   = string;
    this.original = string;
  }

  /**
   * Set vowels.
   *
   * @param  {String|Array} vowels List of vowels.
   * @return {Token}               Token instance.
   */
  Token.prototype.usingVowels = function (vowels) {
    this.vowels = vowels;
    return this;
  };

  /**
   * Marks a region by defining its starting index or providing a callback
   * function that does.
   *
   * @param  {String}       region   Region name.
   * @param  {Array|Number} args     Callback arguments or region start index.
   * @param  {Function}     callback Function that determines the start index (optional).
   * @param  {Object}       context  Callback context (optional, defaults to this).
   * @return {Token}                 Token instance.
   */
  Token.prototype.markRegion = function (region, args, callback, context) {
    if (typeof callback === 'function') {
      this.regions[region] = callback.apply(context || this, [].concat(args));

    } else if (!isNaN(args)) {
      this.regions[region] = args;
    }

    return this;
  };

  /**
   * Replaces all instances of a string with another.
   *
   * @param  {String} find    String to be replaced.
   * @param  {String} replace Replacement string.
   * @return {Token}          Token instance.
   */
  Token.prototype.replaceAll = function (find, replace) {
    this.string = this.string.split(find).join(replace);
    return this;
  };

  /**
   * Replaces the token suffix if in a region.
   *
   * @param  {String} suffix  Suffix to replace.
   * @param  {String} replace Replacement string.
   * @param  {String} region  Region name.
   * @return {Token}          Token instance.
   */
  Token.prototype.replaceSuffixInRegion = function (suffix, replace, region) {
    var suffixes = [].concat(suffix);
    for (var i = 0; i < suffixes.length; i++) {
      if (this.hasSuffixInRegion(suffixes[i], region)) {
        this.string = this.string.slice(0, -suffixes[i].length) + replace;
        return this;
      }
    }
    return this;
  };

  /**
   * Determines whether the token has a vowel at the provided index.
   *
   * @param  {Integer} index Character index.
   * @return {Boolean}       Whether the token has a vowel at the provided index.
   */
  Token.prototype.hasVowelAtIndex = function (index) {
    return this.vowels.indexOf(this.string[index]) !== -1;
  };

  /**
   * Finds the next vowel in the token.
   *
   * @param  {Integer} start Starting index offset.
   * @return {Integer}       Vowel index, or the end of the string.
   */
  Token.prototype.nextVowelIndex = function (start) {
    var index = (start >= 0 && start < this.string.length) ? start : this.string.length;
    while (index < this.string.length && !this.hasVowelAtIndex(index)) {
      index++;
    }
    return index;
  };

  /**
   * Finds the next consonant in the token.
   *
   * @param  {Integer} start Starting index offset.
   * @return {Integer}       Consonant index, or the end of the string.
   */
  Token.prototype.nextConsonantIndex = function (start) {
    var index = (start >= 0 && start < this.string.length) ? start : this.string.length;
    while (index < this.string.length && this.hasVowelAtIndex(index)) {
      index++;
    }
    return index;
  };

  /**
   * Determines whether the token has the provided suffix.
   * @param  {String}  suffix Suffix to match.
   * @return {Boolean}        Whether the token string ends in suffix.
   */
  Token.prototype.hasSuffix = function (suffix) {
    return this.string.slice(-suffix.length) === suffix;
  };

  /**
   * Determines whether the token has the provided suffix within the specified
   * region.
   *
   * @param  {String}  suffix Suffix to match.
   * @param  {String}  region Region name.
   * @return {Boolean}        Whether the token string ends in suffix.
   */
  Token.prototype.hasSuffixInRegion = function (suffix, region) {
    var regionStart = this.regions[region] || 0,
      suffixStart   = this.string.length - suffix.length;
    return this.hasSuffix(suffix) && suffixStart >= regionStart;
  };

  return Token;
})();

},{}],105:[function(require,module,exports){
(function (Buffer){
/*
Copyright (c) 2011, Rob Ellis, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var _ = require("underscore")._,
    Tokenizer = require('../tokenizers/regexp_tokenizer').WordTokenizer,
    tokenizer = new Tokenizer(),
    stopwords = require('../util/stopwords').words,
    fs = require('fs');

function buildDocument(text, key) {
    var stopOut;

    if(typeof text === 'string') {
        text = tokenizer.tokenize(text.toLowerCase());
        stopOut = true;
    } else if(!_.isArray(text)) {
        stopOut = false;
        return text;
    }

    return text.reduce(function(document, term) {
        // next line solves https://github.com/NaturalNode/natural/issues/119
        if(typeof document[term] === 'function') document[term] = 0;
        if(!stopOut || stopwords.indexOf(term) < 0)
            document[term] = (document[term] ? document[term] + 1 : 1);
        return document;
    }, {__key: key});
}

function tf(term, document) {
    return document[term] ? document[term]: 0;
}

function documentHasTerm(term, document) {
    return document[term] && document[term] > 0;
}

function TfIdf(deserialized) {
    if(deserialized)
        this.documents = deserialized.documents;
    else
        this.documents = [];

    this._idfCache = {};
}

// backwards compatibility for < node 0.10
function isEncoding(encoding) {
    if (typeof Buffer.isEncoding !== 'undefined')
        return Buffer.isEncoding(encoding);
    switch ((encoding + '').toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
        case 'raw':
            return true;
    }
    return false;
}

module.exports = TfIdf;
TfIdf.tf = tf;

TfIdf.prototype.idf = function(term, force) {

    // Lookup the term in the New term-IDF caching,
    // this will cut search times down exponentially on large document sets.
    if(this._idfCache[term] && this._idfCache.hasOwnProperty(term) && force !== true)
        return this._idfCache[term];

    var docsWithTerm = this.documents.reduce(function(count, document) {
        return count + (documentHasTerm(term, document) ? 1 : 0);
    }, 0);

    var idf = 1 + Math.log((this.documents.length) / ( 1 + docsWithTerm ));

    // Add the idf to the term cache and return it
    this._idfCache[term] = idf;
    return idf;
};

// If restoreCache is set to true, all terms idf scores currently cached will be recomputed.
// Otherwise, the cache will just be wiped clean
TfIdf.prototype.addDocument = function(document, key, restoreCache) {
    this.documents.push(buildDocument(document, key));

    // make sure the cache is invalidated when new documents arrive
    if(restoreCache === true) {
        for(var term in this._idfCache) {
            // invoking idf with the force option set will
            // force a recomputation of the idf, and it will
            // automatically refresh the cache value.
            this.idf(term, true);
        }
    }   else {
        this._idfCache = {};
    }
};

// If restoreCache is set to true, all terms idf scores currently cached will be recomputed.
// Otherwise, the cache will just be wiped clean
TfIdf.prototype.addFileSync = function(path, encoding, key, restoreCache) {
    if(!encoding)
        encoding = 'utf8';
    if(!isEncoding(encoding))
        throw new Error('Invalid encoding: ' + encoding);

    var document = fs.readFileSync(path, encoding);
    this.documents.push(buildDocument(document, key));

    // make sure the cache is invalidated when new documents arrive
    if(restoreCache === true) {
        for(var term in this._idfCache) {
            // invoking idf with the force option set will
            // force a recomputation of the idf, and it will
            // automatically refresh the cache value.
            this.idf(term, true);
        }
    }
    else {
        this._idfCache = {};
    }
};

TfIdf.prototype.tfidf = function(terms, d) {
    var _this = this;

    if(!_.isArray(terms)) {
        terms = tokenizer.tokenize(terms.toString().toLowerCase());
    }

    return terms.reduce(function(value, term) {
        var idf = _this.idf(term);
        idf = idf === Infinity ? 0 : idf;
        return value + (tf(term, _this.documents[d]) * idf);
    }, 0.0);
};

TfIdf.prototype.listTerms = function(d) {
    var terms = [];
    var _this = this;
    for(var term in this.documents[d]) {
      if (this.documents[d]) {
          if(term != '__key') {
              terms.push({"term": term, 
                          "tf": tf(term, _this.documents[d]),
                          "idf": _this.idf(term),
                          "tfidf": _this.tfidf(term, d)});
          }
      }
    }

    return terms.sort(function(x, y) { return y.tfidf - x.tfidf; });
};

TfIdf.prototype.tfidfs = function(terms, callback) {
    var tfidfs = new Array(this.documents.length);

    for(var i = 0; i < this.documents.length; i++) {
        tfidfs[i] = this.tfidf(terms, i);

        if(callback)
            callback(i, tfidfs[i], this.documents[i].__key);
    }

    return tfidfs;
};

// Define a tokenizer other than the default "WordTokenizer"
TfIdf.prototype.setTokenizer = function(t) {
    if(!_.isFunction(t.tokenize))
        throw new Error('Expected a valid Tokenizer');
    tokenizer = t;
};

// Define a stopwords other than the default
TfIdf.prototype.setStopwords = function(customStopwords) {
  
  if (!Array.isArray(customStopwords))
    return false;
  
  customStopwords.forEach(stopword => {
    if ((typeof stopword) != 'string')
      return false;
  });
  
  stopwords = customStopwords;
  return true;
  
}

}).call(this,require("buffer").Buffer)
},{"../tokenizers/regexp_tokenizer":120,"../util/stopwords":132,"buffer":3,"fs":1,"underscore":157}],106:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/\W+/));
};

},{"./tokenizer":122,"util":11}],107:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel,David Przybilla

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/[^a-zA-Zá-úÁ-ÚñÑüÜ]+/));
};

},{"./tokenizer":122,"util":11}],108:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel
Farsi Aggressive Tokenizer by Fardin Koochaki <me@fardinak.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.clearEmptyString = function(array) {
	return array.filter(function(a) {
		return a != '';
	});
};

AggressiveTokenizer.prototype.clearText = function(text) {
	return text.replace(new RegExp('\.\:\+\-\=\(\)\"\'\!\?\،\,\؛\;', 'g'), ' ');
};

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    text = this.clearText(text);
    return this.clearEmptyString(text.split(/\s+/));
};

},{"./tokenizer":122,"util":11}],109:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/[^a-z0-9äâàéèëêïîöôùüûœç]+/i));
};

},{"./tokenizer":122,"util":11}],110:[function(require,module,exports){
/*
Copyright (c) 2017, Alif Bhaskoro, Andy Librian, R. Kukuh (Reimplemented from https://github.com/sastrawi/sastrawi)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

// Remove all non alphanumeric characters except '-'
// Replace more than one space character to ' '
function normalizeText(text){
	result = text.replace(/[^a-z0-9 -]/g, ' ').replace(/( +)/g, ' ');
	return result;
}

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by space
    text = normalizeText(text);
    return this.trim(text.split(' '));
};

},{"./tokenizer":122,"util":11}],111:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel,David Przybilla

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/\W+/));
};

},{"./tokenizer":122,"util":11}],112:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel, Martijn de Boer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/[^a-zA-Z0-9_']+/));
};

},{"./tokenizer":122,"util":11}],113:[function(require,module,exports){
/*
Copyright (c) 2014, Kristoffer Brabrand

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    normalizer = require('../normalizers/normalizer_no'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    text = normalizer.remove_diacritics(text);

    // break a string up into an array of tokens by anything non-word
    return this.trim(text.split(/[^A-Za-z0-9_æøåÆØÅäÄöÖüÜ]+/));
};

},{"../normalizers/normalizer_no":65,"./tokenizer":122,"util":11}],114:[function(require,module,exports){
/*
Copyright (c) 2013, Paweł Łaskarzewski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);
};

util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.withoutEmpty = function(array) {
	return array.filter(function(a) {return a;});
};

AggressiveTokenizer.prototype.clearText = function(text) {
	return text.replace(/[^a-zążśźęćńół0-9]/gi, ' ').replace(/[\s\n]+/g, ' ').trim();
};

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.withoutEmpty(this.clearText(text).split(' '));
};

},{"./tokenizer":122,"util":11}],115:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel,David Przybilla

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.withoutEmpty = function(array) {
	return array.filter(function(a) {return a;});
};

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.withoutEmpty(this.trim(text.split(/[^a-zA-Zà-úÀ-Ú]/)));
};

},{"./tokenizer":122,"util":11}],116:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);    
};

util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.withoutEmpty = function(array) {
	return array.filter(function(a) {return a;});
};

AggressiveTokenizer.prototype.clearText = function(text) {
	return text.replace(/[^a-zа-яё0-9]/gi, ' ').replace(/[\s\n]+/g, ' ').trim();
};

AggressiveTokenizer.prototype.tokenize = function(text) {
    // break a string up into an array of tokens by anything non-word
    return this.withoutEmpty(this.clearText(text).split(' '));
};

},{"./tokenizer":122,"util":11}],117:[function(require,module,exports){
/*
Copyright (c) 2017, Dogan Yazar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
    normalizer = require('../normalizers/normalizer_sv'),
    util = require('util');

var AggressiveTokenizer = function() {
    Tokenizer.call(this);
};
util.inherits(AggressiveTokenizer, Tokenizer);

module.exports = AggressiveTokenizer;

AggressiveTokenizer.prototype.tokenize = function(text) {
    text = normalizer.remove_diacritics(text);

    // break a string up into an array of tokens by anything non-word
    // Ü is not part of swedish alphabet but there are words using it like müsli and München 
    return this.trim(text.split(/[^A-Za-z0-9_åÅäÄöÖüÜ\-]+/));
};

},{"../normalizers/normalizer_sv":66,"./tokenizer":122,"util":11}],118:[function(require,module,exports){
/*
Copyright (c) 2018, Javis1205 (Github account name)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Tokenizer = require('./tokenizer'),
util = require('util');

var AggressiveTokenizer = function() {
  Tokenizer.call(this);
};

util.inherits(AggressiveTokenizer, Tokenizer);

// break a string up into an array of tokens by anything non-word
AggressiveTokenizer.prototype.tokenize = function(text) {
  return this.trim(text.split(/[^a-z0-9àáảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]+/i));
};

module.exports = AggressiveTokenizer;
},{"./tokenizer":122,"util":11}],119:[function(require,module,exports){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
THE SOFTWARE.
*/


/***
};