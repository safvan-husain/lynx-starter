import { getTextDecoder } from './text_encoding';

export default class BinaryReader {
  view: DataView;
  offset: number = 0;

  constructor(input: Uint8Array | DataView) {
    this.view =
      input instanceof DataView
        ? input
        : new DataView(input.buffer, input.byteOffset, input.byteLength);
    this.offset = 0;
  }

  reset(view: DataView) {
    this.view = view;
    this.offset = 0;
  }

  get remaining(): number {
    return this.view.byteLength - this.offset;
  }

  #ensure(n: number): void {
    if (this.offset + n > this.view.byteLength) {
      throw new RangeError(
        `Tried to read ${n} byte(s) at relative offset ${this.offset}, but only ${this.remaining} byte(s) remain`
      );
    }
  }

  readUInt8Array(): Uint8Array {
    const length = this.readU32();
    this.#ensure(length);
    return this.readBytes(length);
  }

  readBool(): boolean {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value !== 0;
  }

  readByte(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  readBytes(length: number): Uint8Array {
    const array = new Uint8Array(
      this.view.buffer,
      this.view.byteOffset + this.offset,
      length
    );
    this.offset += length;
    return array;
  }

  readI8(): number {
    const value = this.view.getInt8(this.offset);
    this.offset += 1;
    return value;
  }

  readU8(): number {
    return this.readByte();
  }

  readI16(): number {
    const value = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }

  readU16(): number {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  readI32(): number {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readU32(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  // Read `n` bytes at current offset, return as big-endian hex string (no BigInt used)
  #readHexLE(n: number): string {
    this.#ensure(n);
    let hex = '';
    // Bytes are in little-endian order in the buffer, so we read from high to low to get BE hex
    for (let i = n - 1; i >= 0; i--) {
      hex += this.view.getUint8(this.offset + i).toString(16).padStart(2, '0');
    }
    this.offset += n;
    return hex;
  }

  readI64(): string {
    return this.#readHexLE(8);
  }

  readU64(): string {
    return this.#readHexLE(8);
  }

  readU128(): string {
    return this.#readHexLE(16);
  }

  readI128(): string {
    return this.#readHexLE(16);
  }

  readU256(): string {
    return this.#readHexLE(32);
  }

  readI256(): string {
    return this.#readHexLE(32);
  }

  readF32(): number {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readF64(): number {
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  readString(): string {
    const uint8Array = this.readUInt8Array();
    return getTextDecoder().decode(uint8Array);
  }
}

