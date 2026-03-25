import { AlgebraicType } from './algebraic_type';

export type TimeDurationAlgebraicType = {
  tag: 'Product';
  value: {
    elements: [
      { name: '__time_duration_micros__'; algebraicType: { tag: 'I64' } },
    ];
  };
};

/**
 * A difference between two points in time, represented as a number of microseconds.
 */
export class TimeDuration {
  __time_duration_micros__: string;

  private static MICROS_PER_MILLIS: number = 1000;

  /**
   * Get the algebraic type representation of the {@link TimeDuration} type.
   * @returns The algebraic type representation of the type.
   */
  static getAlgebraicType(): TimeDurationAlgebraicType {
    return AlgebraicType.Product({
      elements: [
        {
          name: '__time_duration_micros__',
          algebraicType: AlgebraicType.I64,
        },
      ],
    });
  }

  static isTimeDuration(
    algebraicType: AlgebraicType
  ): algebraicType is TimeDurationAlgebraicType {
    if (algebraicType.tag !== 'Product') {
      return false;
    }
    const elements = algebraicType.value.elements;
    if (elements.length !== 1) {
      return false;
    }
    const microsElement = elements[0];
    return (
      microsElement.name === '__time_duration_micros__' &&
      microsElement.algebraicType.tag === 'I64'
    );
  }

  get micros(): number {
    const val = parseInt(this.__time_duration_micros__, 16);
    // Simple 2's complement for 64-bit to signed 53-bit number
    // (If the highest hex digit is >= 8, it's negative)
    const isNegative = parseInt(this.__time_duration_micros__[0], 16) >= 8;
    if (isNegative) {
      // For precision within 53 bits, this works:
      return val - Math.pow(2, 64);
    }
    return val;
  }

  get millis(): number {
    return this.micros / TimeDuration.MICROS_PER_MILLIS;
  }

  constructor(micros: string | number) {
    if (typeof micros === 'number') {
      if (micros < 0) {
        // Handle negative number to 2's complement hex
        const uint64 = Math.pow(2, 64) + micros;
        this.__time_duration_micros__ = uint64.toString(16).padStart(16, '0');
      } else {
        this.__time_duration_micros__ = micros.toString(16).padStart(16, '0');
      }
    } else {
      this.__time_duration_micros__ = micros.startsWith('0x') ? micros.slice(2) : micros;
    }
  }

  static fromMillis(millis: number): TimeDuration {
    return new TimeDuration(millis * 1000);
  }

  /** This outputs the same string format that we use in the host and in Rust modules */
  toString(): string {
    const micros = this.micros;
    const sign = micros < 0 ? '-' : '+';
    const pos = Math.abs(micros);
    const secs = Math.floor(pos / 1000000);
    const micros_remaining = Math.floor(pos % 1000000);
    return `${sign}${secs}.${String(micros_remaining).padStart(6, '0')}`;
  }
}
