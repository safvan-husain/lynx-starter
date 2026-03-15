/**
 * Lightweight UTF-8 Encoder/Decoder for environments without TextEncoder/TextDecoder.
 */

export class StdbTextEncoder {
  encode(str: string): Uint8Array {
    const buf = new Uint8Array(str.length * 3);
    let offset = 0;
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 128) {
        buf[offset++] = c;
      } else if (c < 2048) {
        buf[offset++] = 192 | (c >> 6);
        buf[offset++] = 128 | (c & 63);
      } else if (c < 55296 || c >= 57344) {
        buf[offset++] = 224 | (c >> 12);
        buf[offset++] = 128 | ((c >> 6) & 63);
        buf[offset++] = 128 | (c & 63);
      } else {
        // Surrogate pair
        c = 65536 + (((c & 1023) << 10) | (str.charCodeAt(++i) & 1023));
        buf[offset++] = 240 | (c >> 18);
        buf[offset++] = 128 | ((c >> 12) & 63);
        buf[offset++] = 128 | ((c >> 6) & 63);
        buf[offset++] = 128 | (c & 63);
      }
    }
    return buf.subarray(0, offset);
  }
}

export class StdbTextDecoder {
  decode(bytes: Uint8Array): string {
    let res = '';
    let i = 0;
    while (i < bytes.length) {
      const b = bytes[i++];
      if (b < 128) {
        res += String.fromCharCode(b);
      } else if (b < 224) {
        res += String.fromCharCode(((b & 31) << 6) | (bytes[i++] & 63));
      } else if (b < 240) {
        res += String.fromCharCode(
          ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)
        );
      } else {
        const code =
          ((b & 7) << 18) |
          ((bytes[i++] & 63) << 12) |
          ((bytes[i++] & 63) << 6) |
          (bytes[i++] & 63);
        if (code < 65536) {
          res += String.fromCharCode(code);
        } else {
          const s = code - 65536;
          res += String.fromCharCode(0xd800 | (s >> 10), 0xdc00 | (s & 1023));
        }
      }
    }
    return res;
  }
}

let sharedEncoder: { encode: (s: string) => Uint8Array } | undefined;
let sharedDecoder: { decode: (b: Uint8Array) => string } | undefined;

export const getTextEncoder = () => {
  if (sharedEncoder) return sharedEncoder;
  if (typeof TextEncoder !== 'undefined') {
    sharedEncoder = new TextEncoder();
  } else {
    sharedEncoder = new StdbTextEncoder();
  }
  return sharedEncoder;
};

export const getTextDecoder = () => {
  if (sharedDecoder) return sharedDecoder;
  if (typeof TextDecoder !== 'undefined') {
    sharedDecoder = new TextDecoder('utf-8');
  } else {
    sharedDecoder = new StdbTextDecoder();
  }
  return sharedDecoder;
};
