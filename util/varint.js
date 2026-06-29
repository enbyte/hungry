function encodeVarint(n) {
  n >>>= 0;
  const bytes = [];
  while (n >= 0x80) {
    bytes.push((n & 0x7F) | 0x80);
    n >>>= 7;
  }
  bytes.push(n & 0x7F);
  return bytes;
}

function encodeVarintSigned(n) {
  n = n | 0;
  return encodeVarint((n << 1) ^ (n >> 31));
}

function decodeVarint(bytes, offset) {
  let result = 0;
  let shift = 0;
  let pos = offset;
  let count = 0;
  while (count++ < 5) {
    const byte = bytes[pos++];
    result |= (byte & 0x7F) << shift;
    if ((byte & 0x80) === 0) return { value: result, length: pos - offset };
    shift += 7;
  }
  throw new Error("Varint too large");
}

function decodeVarintSigned(bytes, offset) {
  const { value, length } = decodeVarint(bytes, offset);
  return { value: (value >>> 1) ^ -(value & 1), length };
}

function varintSize(n) {
  n >>>= 0;
  let size = 0;
  do { size++; n >>>= 7; } while (n > 0);
  return size;
}

function zigzagSize(n) {
  n = n | 0;
  return varintSize((n << 1) ^ (n >> 31));
}

module.exports = {
  encodeVarint,
  encodeVarintSigned,
  decodeVarint,
  decodeVarintSigned,
  varintSize,
  zigzagSize
};
