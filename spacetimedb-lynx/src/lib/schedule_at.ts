import { AlgebraicType } from './algebraic_type';
import { TimeDuration, type TimeDurationAlgebraicType } from './time_duration';
import { Timestamp, type TimestampAlgebraicType } from './timestamp';

export type ScheduleAtAlgebraicType = {
  tag: 'Sum';
  value: {
    variants: [
      { name: 'Interval'; algebraicType: TimeDurationAlgebraicType },
      { name: 'Time'; algebraicType: TimestampAlgebraicType },
    ];
  };
};

type ScheduleAtType = Interval | Time;

export const ScheduleAt: {
  interval: (micros: number) => ScheduleAtType;
  time: (microsSinceUnixEpoch: number) => ScheduleAtType;
  /**
   * Get the algebraic type representation of the {@link ScheduleAt} type.
   * @returns The algebraic type representation of the type.
   */
  getAlgebraicType(): ScheduleAtAlgebraicType;
  isScheduleAt(
    algebraicType: AlgebraicType
  ): algebraicType is ScheduleAtAlgebraicType;
} = {
  interval(value: number): ScheduleAtType {
    return Interval(value);
  },
  time(value: number): ScheduleAtType {
    return Time(value);
  },
  getAlgebraicType(): ScheduleAtAlgebraicType {
    return AlgebraicType.Sum({
      variants: [
        {
          name: 'Interval',
          algebraicType: TimeDuration.getAlgebraicType(),
        },
        { name: 'Time', algebraicType: Timestamp.getAlgebraicType() },
      ],
    });
  },
  isScheduleAt(
    algebraicType: AlgebraicType
  ): algebraicType is ScheduleAtAlgebraicType {
    if (algebraicType.tag !== 'Sum') {
      return false;
    }
    const variants = algebraicType.value.variants;
    if (variants.length !== 2) {
      return false;
    }
    const intervalVariant = variants.find(v => v.name === 'Interval');
    const timeVariant = variants.find(v => v.name === 'Time');
    if (!intervalVariant || !timeVariant) {
      return false;
    }
    return (
      TimeDuration.isTimeDuration(intervalVariant.algebraicType) &&
      Timestamp.isTimestamp(timeVariant.algebraicType)
    );
  },
};

export type Interval = {
  tag: 'Interval';
  value: TimeDuration;
};
export const Interval = (micros: number): Interval => ({
  tag: 'Interval',
  value: new TimeDuration(micros),
});
export type Time = {
  tag: 'Time';
  value: Timestamp;
};
export const Time = (microsSinceUnixEpoch: number): Time => ({
  tag: 'Time',
  value: new Timestamp(microsSinceUnixEpoch),
});

export default ScheduleAt;
export type ScheduleAt = ScheduleAtType;
