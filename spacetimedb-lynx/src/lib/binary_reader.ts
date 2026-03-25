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
    return 0; // Stubbed
  }

  readUInt8Array(): Uint8Array {
    return new Uint8Array(0); // Stubbed
  }

  readBool(): boolean {
    return false; // Stubbed
  }

  readByte(): number {
    return 0; // Stubbed
  }

  readBytes(length: number): Uint8Array {
    return new Uint8Array(0); // Stubbed
  }

  readI8(): number {
    return 0; // Stubbed
  }

  readU8(): number {
    return 0; // Stubbed
  }

  readI16(): number {
    return 0; // Stubbed
  }

  readU16(): number {
    return 0; // Stubbed
  }

  readI32(): number {
    return 0; // Stubbed
  }

  readU32(): number {
    return 0; // Stubbed
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
    return 0; // Stubbed
  }

  readF64(): number {
    return 0; // Stubbed
  }

  readString(): string {
    return ""; // Stubbed
  }
}

