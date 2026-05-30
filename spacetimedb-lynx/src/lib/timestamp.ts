import { AlgebraicType } from './algebraic_type';
import { TimeDuration } from './time_duration';

export type TimestampAlgebraicType = {
  tag: 'Product';
  value: {
    elements: [
      {
        name: '__timestamp_micros_since_unix_epoch__';
        algebraicType: { tag: 'I64' };
      },
    ];
  };
};

/**
 * A point in time, represented as a number of microseconds since the Unix epoch.
 */
export class Timestamp {
  __timestamp_micros_since_unix_epoch__: string;

  private static MICROS_PER_MILLIS: number = 1000;

  get microsSinceUnixEpoch(): string {
    return this.__timestamp_micros_since_unix_epoch__;
  }

  constructor(micros: string | number) {
    if (typeof micros === 'number') {
      this.__timestamp_micros_since_unix_epoch__ =
        micros < 0
          ? micros.toString(16)
          : micros.toString(16).padStart(16, '0');
    } else {
      this.__timestamp_micros_since_unix_epoch__ = micros.startsWith('0x') ? micros.slice(2) : micros;
    }
  }

  /**
   * Get the algebraic type representation of the {@link Timestamp} type.
   * @returns The algebraic type representation of the type.
   */
  static getAlgebraicType(): TimestampAlgebraicType {
    return AlgebraicType.Product({
      elements: [
        {
          name: '__timestamp_micros_since_unix_epoch__',
          algebraicType: AlgebraicType.I64,
        },
      ],
    });
  }

  static isTimestamp(
    algebraicType: AlgebraicType
  ): algebraicType is TimestampAlgebraicType {
    if (algebraicType.tag !== 'Product') {
      return false;
    }
    const elements = algebraicType.value.elements;
    if (elements.length !== 1) {
      return false;
    }
    const microsElement = elements[0];
    return (
      microsElement.name === '__timestamp_micros_since_unix_epoch__' &&
      microsElement.algebraicType.tag === 'I64'
    );
  }

  /**
   * The Unix epoch, the midnight at the beginning of January 1, 1970, UTC.
   */
  static UNIX_EPOCH: Timestamp = new Timestamp('0'.repeat(16));

  /**
   * Get a `Timestamp` representing the execution environment's belief of the current moment in time.
   */
  static now(): Timestamp {
    return Timestamp.fromDate(new Date());
  }

  /** Convert to milliseconds since Unix epoch. */
  toMillis(): number {
    const micros = parseInt(this.__timestamp_micros_since_unix_epoch__, 16);
    return micros / 1000;
  }

  /**
   * Get a `Timestamp` representing the same point in time as `date`.
   */
  static fromDate(date: Date): Timestamp {
    const millis = date.getTime();
    const micros = millis * 1000;
    return new Timestamp(micros);
  }

  /**
   * Get a `Date` representing approximately the same point in time as `this`.
   */
  toDate(): Date {
    const millis = this.toMillis();
    return new Date(millis);
  }

  /**
   * Get an ISO 8601 / RFC 3339 formatted string representation of this timestamp with microsecond precision.
   */
  toISOString(): string {
    const microsVal = parseInt(this.__timestamp_micros_since_unix_epoch__, 16);
    const date = new Date(microsVal / 1000);
    const isoBase = date.toISOString(); 

    const microsRemainder = Math.floor(Math.abs(microsVal % 1000000));
    const fractionalPart = String(microsRemainder).padStart(6, '0');

    return isoBase.replace(/\.\d{3}Z$/, `.${fractionalPart}Z`);
  }

  since(other: Timestamp): TimeDuration {
    const thisMicros = parseInt(this.__timestamp_micros_since_unix_epoch__, 16);
    const otherMicros = parseInt(other.__timestamp_micros_since_unix_epoch__, 16);
    return new TimeDuration(thisMicros - otherMicros);
  }
}
