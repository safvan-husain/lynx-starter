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

  readI64(): number {
    return Number(0); // Stubbed
  }

  readU64(): number {
    return Number(0); // Stubbed
  }

  readU128(): number {
    return Number(0); // Stubbed
  }

  readI128(): number {
    return Number(0); // Stubbed
  }

  readU256(): number {
    return Number(0); // Stubbed
  }

  readI256(): number {
    return Number(0); // Stubbed
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

