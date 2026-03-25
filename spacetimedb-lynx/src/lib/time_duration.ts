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
  __time_duration_micros__: number;

  private static MICROS_PER_MILLIS: number = 1000 as unknown as number;

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
    return this.__time_duration_micros__;
  }

  get millis(): number {
    return Number(this.micros / TimeDuration.MICROS_PER_MILLIS);
  }

  constructor(micros: number) {
    this.__time_duration_micros__ = micros;
  }

  static fromMillis(millis: number): TimeDuration {
    return new TimeDuration(Number(millis) * TimeDuration.MICROS_PER_MILLIS);
  }

  /** This outputs the same string format that we use in the host and in Rust modules */
  toString(): string {
    const micros = this.micros;
    const sign = micros < 0 ? '-' : '+';
    const pos = micros < 0 ? -micros : micros;
    const secs = pos / Number(1000000);
    const micros_remaining = pos % Number(1000000);
    return `${sign}${secs}.${String(micros_remaining).padStart(6, '0')}`;
  }
}
