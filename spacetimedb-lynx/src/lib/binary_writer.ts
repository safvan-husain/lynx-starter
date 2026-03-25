import { fromByteArray } from 'base64-js';
import { getTextEncoder } from './text_encoding';

const ArrayBufferPrototypeTransfer =
  ArrayBuffer.prototype.transfer ??
  function (this: ArrayBuffer, newByteLength: number) {
    if (newByteLength === undefined) {
      return this.slice(0);
    } else if (newByteLength <= this.byteLength) {
      return this.slice(0, newByteLength);
    } else {
      const copy = new Uint8Array(newByteLength);
      copy.set(new Uint8Array(this));
      return copy.buffer;
    }
  };
export class ResizableBuffer {
  buffer: ArrayBuffer;
  view: DataView;

  constructor(init: number | ArrayBuffer) {
    this.buffer = typeof init === 'number' ? new ArrayBuffer(init) : init;
    this.view = new DataView(this.buffer);
  }

  get capacity(): number {
    return this.buffer.byteLength;
  }

  grow(newSize: number) {
    if (newSize <= this.buffer.byteLength) return;
    this.buffer = ArrayBufferPrototypeTransfer.call(this.buffer, newSize);
    this.view = new DataView(this.buffer);
  }
}

export default class BinaryWriter {
  buffer: ResizableBuffer;
  offset: number = 0;

  constructor(init: number | ResizableBuffer) {
    this.buffer = typeof init === 'number' ? new ResizableBuffer(init) : init;
  }

  clear() {
    this.offset = 0;
  }

  reset(buffer: ResizableBuffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  expandBuffer(additionalCapacity: number): void {
    const minCapacity = this.offset + additionalCapacity + 1;
    if (minCapacity <= this.buffer.capacity) return;
    let newCapacity = this.buffer.capacity * 2;
    if (newCapacity < minCapacity) newCapacity = minCapacity;
    this.buffer.grow(newCapacity);
  }

  toBase64(): string {
    return fromByteArray(this.getBuffer());
  }

  getBuffer(): Uint8Array {
    return new Uint8Array(this.buffer.buffer, 0, this.offset);
  }

  get view() {
    return this.buffer.view;
  }

  writeUInt8Array(value: Uint8Array): void {
    const length = value.length;

    this.expandBuffer(4 + length);

    this.writeU32(length);
    new Uint8Array(this.buffer.buffer, this.offset).set(value);
    this.offset += length;
  }

  writeBool(value: boolean): void {
    this.expandBuffer(1);
    this.view.setUint8(this.offset, value ? 1 : 0);
    this.offset += 1;
  }

  writeByte(value: number): void {
    this.expandBuffer(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  writeI8(value: number): void {
    this.expandBuffer(1);
    this.view.setInt8(this.offset, value);
    this.offset += 1;
  }

  writeU8(value: number): void {
    this.expandBuffer(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  writeI16(value: number): void {
    this.expandBuffer(2);
    this.view.setInt16(this.offset, value, true);
    this.offset += 2;
  }

  writeU16(value: number): void {
    this.expandBuffer(2);
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
  }

  writeI32(value: number): void {
    this.expandBuffer(4);
    this.view.setInt32(this.offset, value, true);
    this.offset += 4;
  }

  writeU32(value: number): void {
    this.expandBuffer(4);
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
  }

  // Helper: write hex string as little-endian bytes. Hex is assumed to be big-endian (most significant nibble first).
  #writeHexLE(hex: string, n: number): void {
    this.expandBuffer(n);
    const padded = hex.padStart(n * 2, '0');
    for (let i = 0; i < n; i++) {
      // hex is big-endian string, so byte 0 (least significant) starts at padded.length - 2
      const byteHex = padded.slice(padded.length - (i + 1) * 2, padded.length - i * 2);
      this.view.setUint8(this.offset + i, parseInt(byteHex, 16));
    }
    this.offset += n;
  }

  writeI64(value: string): void {
    this.#writeHexLE(value, 8);
  }

  writeU64(value: string): void {
    this.#writeHexLE(value, 8);
  }

  writeU128(value: string): void {
    this.#writeHexLE(value, 16);
  }

  writeI128(value: string): void {
    this.#writeHexLE(value, 16);
  }

  writeU256(value: string): void {
    this.#writeHexLE(value, 32);
  }

  writeI256(value: string): void {
    this.#writeHexLE(value, 32);
  }

  writeF32(value: number): void {
    this.expandBuffer(4);
    this.view.setFloat32(this.offset, value, true);
    this.offset += 4;
  }

  writeF64(value: number): void {
    this.expandBuffer(8);
    this.view.setFloat64(this.offset, value, true);
    this.offset += 8;
  }

  writeString(value: string): void {
    const encoder = getTextEncoder();
    const encodedString = encoder.encode(value);
    this.writeUInt8Array(encodedString);
  }
}

