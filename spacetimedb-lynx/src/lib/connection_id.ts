import { AlgebraicType } from './algebraic_type';
import { hexStringToU128, u128ToHexString, u128ToUint8Array } from './util';

export type ConnectionIdAlgebraicType = {
  tag: 'Product';
  value: {
    elements: [{ name: '__connection_id__'; algebraicType: { tag: 'U128' } }];
  };
};

/**
 * A unique identifier for a client connected to a database.
 */
export class ConnectionId {
  __connection_id__: string;

  /**
   * Creates a new `ConnectionId`.
   */
  constructor(data: string | number) {
    if (typeof data === 'number') {
      this.__connection_id__ = data.toString(16).padStart(32, '0');
    } else {
      this.__connection_id__ = data.startsWith('0x') ? data.slice(2) : data;
    }
  }

  /**
   * Get the algebraic type representation of the {@link ConnectionId} type.
   * @returns The algebraic type representation of the type.
   */
  static getAlgebraicType(): ConnectionIdAlgebraicType {
    return AlgebraicType.Product({
      elements: [
        { name: '__connection_id__', algebraicType: AlgebraicType.U128 },
      ],
    });
  }

  isZero(): boolean {
    return /^0+$/.test(this.__connection_id__);
  }

  static nullIfZero(addr: ConnectionId): ConnectionId | null {
    if (addr.isZero()) {
      return null;
    } else {
      return addr;
    }
  }

  static random(): ConnectionId {
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return new ConnectionId(result);
  }

  /**
   * Compare two connection IDs for equality.
   */
  isEqual(other: ConnectionId): boolean {
    return this.__connection_id__ === other.__connection_id__;
  }

  /**
   * Check if two connection IDs are equal.
   */
  equals(other: ConnectionId): boolean {
    return this.isEqual(other);
  }

  /**
   * Print the connection ID as a hexadecimal string.
   */
  toHexString(): string {
    return this.__connection_id__;
  }

  /**
   * Convert the connection ID to a Uint8Array.
   */
  toUint8Array(): Uint8Array {
    return u128ToUint8Array(this.__connection_id__);
  }

  /**
   * Parse a connection ID from a hexadecimal string.
   */
  static fromString(str: string): ConnectionId {
    return new ConnectionId(str);
  }

  static fromStringOrNull(str: string): ConnectionId | null {
    const addr = ConnectionId.fromString(str);
    if (addr.isZero()) {
      return null;
    } else {
      return addr;
    }
  }
}
