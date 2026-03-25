import { AlgebraicType } from './algebraic_type';
import { hexStringToU256, u256ToHexString, u256ToUint8Array } from './util';

export type IdentityAlgebraicType = {
  tag: 'Product';
  value: {
    elements: [{ name: '__identity__'; algebraicType: { tag: 'U256' } }];
  };
};

/**
 * A unique identifier for a user connected to a database.
 */
export class Identity {
  __identity__: string;

  /**
   * Creates a new `Identity`.
   *
   * `data` can be a hexadecimal string or a `number`.
   */
  constructor(data: string | number) {
    // we get a JSON with __identity__ when getting a token with a JSON API
    // and a string when using BSATN (which we've changed to return hex strings)
    if (typeof data === 'number') {
      this.__identity__ = data.toString(16).padStart(64, '0');
    } else {
      this.__identity__ = data.startsWith('0x') ? data.slice(2) : data;
    }
  }

  /**
   * Get the algebraic type representation of the {@link Identity} type.
   * @returns The algebraic type representation of the type.
   */
  static getAlgebraicType(): IdentityAlgebraicType {
    return AlgebraicType.Product({
      elements: [{ name: '__identity__', algebraicType: AlgebraicType.U256 }],
    });
  }

  /**
   * Check if two identities are equal.
   */
  isEqual(other: Identity): boolean {
    return this.toHexString() === other.toHexString();
  }

  /**
   * Check if two identities are equal.
   */
  equals(other: Identity): boolean {
    return this.isEqual(other);
  }

  /**
   * Print the identity as a hexadecimal string.
   */
  toHexString(): string {
    return this.__identity__;
  }

  /**
   * Convert the address to a Uint8Array.
   */
  toUint8Array(): Uint8Array {
    return u256ToUint8Array(this.__identity__);
  }

  /**
   * Parse an Identity from a hexadecimal string.
   */
  static fromString(str: string): Identity {
    return new Identity(str);
  }

  /**
   * Zero identity (0x0000000000000000000000000000000000000000000000000000000000000000)
   */
  static zero(): Identity {
    return new Identity('0'.repeat(64));
  }

  toString(): string {
    return this.toHexString();
  }
}
