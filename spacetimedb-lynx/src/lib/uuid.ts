import { Timestamp } from './timestamp';
import { AlgebraicType } from './algebraic_type';

export type UuidAlgebraicType = {
  tag: 'Product';
  value: {
    elements: [
      {
        name: '__uuid__';
        algebraicType: { tag: 'U128' };
      },
    ];
  };
};

/**
 * Supported UUID versions.
 *
 * - `Nil` – The "Nil" UUID (all zeros)
 * - `V4`  – Version 4: random
 * - `V7`  – Version 7: timestamp + counter + random
 * - `Max` – The "Max" UUID (all ones)
 */
type UuidVersion = 'Nil' | 'V4' | 'V7' | 'Max';

/**
 * A universally unique identifier (UUID).
 *
 * Supports UUID `Nil`, `Max`, `V4` (random), and `V7`
 * (timestamp + counter + random).
 *
 * Internally represented as an unsigned 128-bit between 0 and `MAX_UUID`.
 */
export class Uuid {
  __uuid__: string;

  /**
   * The nil UUID (all zeros).
   */
  static readonly NIL = new Uuid('0'.repeat(32));
  
  /**
   * The max UUID (all ones).
   */
  static readonly MAX = new Uuid('f'.repeat(32));

  /**
   * Create a UUID from a raw 128-bit value.
   *
   * @param u - Unsigned 128-bit integer hex string
   */
  constructor(u: string | number) {
    if (typeof u === 'number') {
      this.__uuid__ = u.toString(16).padStart(32, '0');
    } else {
      let hex = u.startsWith('0x') ? u.slice(2) : u;
      hex = hex.replace(/-/g, '').toLowerCase();
      this.__uuid__ = hex.padStart(32, '0');
    }
    
    if (this.__uuid__.length > 32) {
      throw new Error('Invalid UUID: hex string too long for 128-bit');
    }
  }

  /**
   * Create a UUID `v4` from explicit random bytes.
   */
  static fromRandomBytesV4(bytes: Uint8Array): Uuid {
    if (bytes.length !== 16) throw new Error('UUID v4 requires 16 bytes');
    const arr = new Uint8Array(bytes);
    arr[6] = (arr[6] & 0x0f) | 0x40; // version 4
    arr[8] = (arr[8] & 0x3f) | 0x80; // variant
    return new Uuid(Uuid.bytesToHex(arr));
  }

  static fromCounterV7(
    counter: { value: number },
    now: Timestamp,
    randomBytes: Uint8Array
  ): Uuid {
    if (randomBytes.length !== 4) {
      throw new Error('`fromCounterV7` requires `randomBytes.length == 4`');
    }

    // 31-bit monotonic counter with wraparound
    const counterVal = counter.value;
    counter.value = (counterVal + 1) & 0x7fffffff;

    // 48-bit unix timestamp (ms)
    // Timestamp.toMillis() now returns number (safe up to 53 bits)
    const tsMs = now.toMillis();
    if (tsMs < 0) {
      throw new Error('`fromCounterV7` `timestamp` before unix epoch');
    }

    const bytes = new Uint8Array(16);

    // unix_ts_ms (48 bits)
    // We treat tsMs as a 53-bit number, so we can shift it
    bytes[0] = Math.floor(tsMs / Math.pow(2, 40)) & 0xff;
    bytes[1] = Math.floor(tsMs / Math.pow(2, 32)) & 0xff;
    bytes[2] = (tsMs >>> 24) & 0xff;
    bytes[3] = (tsMs >>> 16) & 0xff;
    bytes[4] = (tsMs >>> 8) & 0xff;
    bytes[5] = tsMs & 0xff;

    // Counter bits (31 bits total)
    // Part of high counter (7 bits) in byte 6?? No, v7 uses specific layout
    // Actually our previous logic:
    // bytes[6] version
    // bytes[7] counter_high
    // bytes[8] variant
    // bytes[9,10,11] counter_low
    bytes[7] = (counterVal >>> 23) & 0xff;
    bytes[9] = (counterVal >>> 15) & 0xff;
    bytes[10] = (counterVal >>> 7) & 0xff;
    bytes[11] = ((counterVal & 0x7f) << 1) & 0xff;

    // Random bytes
    bytes[12] |= randomBytes[0] & 0x7f;
    bytes[13] = randomBytes[1];
    bytes[14] = randomBytes[2];
    bytes[15] = randomBytes[3];

    // Version 7
    bytes[6] = (bytes[6] & 0x0f) | 0x70;

    // Variant RFC4122
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return new Uuid(Uuid.bytesToHex(bytes));
  }

  static parse(s: string): Uuid {
    return new Uuid(s);
  }

  toString(): string {
    const hex = this.__uuid__;
    return (
      hex.slice(0, 8) +
      '-' +
      hex.slice(8, 12) +
      '-' +
      hex.slice(12, 16) +
      '-' +
      hex.slice(16, 20) +
      '-' +
      hex.slice(20)
    );
  }

  toBytes(): Uint8Array {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        bytes[i] = parseInt(this.__uuid__.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  private static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  getVersion(): UuidVersion {
    const version = (this.toBytes()[6] >> 4) & 0x0f;
    switch (version) {
      case 4: return 'V4';
      case 7: return 'V7';
      default:
        if (this.isEqual(Uuid.NIL)) return 'Nil';
        if (this.isEqual(Uuid.MAX)) return 'Max';
        throw new Error(`Unsupported UUID version: ${version}`);
    }
  }

  getCounter(): number {
    const bytes = this.toBytes();
    const high = bytes[7];
    const mid1 = bytes[9];
    const mid2 = bytes[10];
    const low = bytes[11] >>> 1;
    return (high << 23) | (mid1 << 15) | (mid2 << 7) | low;
  }

  isEqual(other: Uuid): boolean {
    return this.__uuid__ === other.__uuid__;
  }

  compareTo(other: Uuid): number {
    if (this.__uuid__ < other.__uuid__) return -1;
    if (this.__uuid__ > other.__uuid__) return 1;
    return 0;
  }

  static getAlgebraicType(): UuidAlgebraicType {
    return AlgebraicType.Product({
      elements: [{ name: '__uuid__', algebraicType: AlgebraicType.U128 }],
    });
  }
}
