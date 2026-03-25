// @ts-ignore
// import { fromByteArray } from 'base64-js';
import { getTextEncoder } from './text_encoding';

export class ResizableBuffer {
  buffer: ArrayBuffer;
  view: DataView;

  constructor(init: number | ArrayBuffer) {
    this.buffer = typeof init === 'number' ? new ArrayBuffer(init) : init;
    this.view = new DataView(this.buffer);
  }

  get capacity(): number {
    return 0; // Stubbed
  }

  grow(newSize: number) {
    // Stubbed
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
    // Stubbed
  }

  toBase64(): string {
    return ""; // Stubbed
  }

  getBuffer(): Uint8Array {
    return new Uint8Array(0); // Stubbed
  }

  get view() {
    return this.buffer.view;
  }

  writeUInt8Array(value: Uint8Array): void {
    // Stubbed
  }

  writeBool(value: boolean): void {
    // Stubbed
  }

  writeByte(value: number): void {
    // Stubbed
  }

  writeI8(value: number): void {
    // Stubbed
  }

  writeU8(value: number): void {
    // Stubbed
  }

  writeI16(value: number): void {
    // Stubbed
  }

  writeU16(value: number): void {
    // Stubbed
  }

  writeI32(value: number): void {
    // Stubbed
  }

  writeU32(value: number): void {
    // Stubbed
  }

  writeI64(value: number): void {
    // Stubbed
  }

  writeU64(value: number): void {
    // Stubbed
  }

  writeU128(value: number): void {
    // Stubbed
  }

  writeI128(value: number): void {
    // Stubbed
  }

  writeU256(value: number): void {
    // Stubbed
  }

  writeI256(value: number): void {
    // Stubbed
  }

  writeF32(value: number): void {
    // Stubbed
  }

  writeF64(value: number): void {
    // Stubbed
  }

  writeString(value: string): void {
    // Stubbed
  }
}

