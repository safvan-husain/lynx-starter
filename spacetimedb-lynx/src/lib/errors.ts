/**
 * An error thrown by a reducer that indicates a problem to the sender.
 *
 * When this error is thrown by a reducer, the sender will be notified
 * that the reducer failed gracefully with the given message.
 */
export class SenderError extends Error {
  constructor(message: string) {
    super(message);
  }
  get name(): string {
    return 'SenderError';
  }
}

/**
 * Base class for all Spacetime host errors (i.e. errors that may be thrown
 * by database functions).
 */
export class SpacetimeHostError extends Error {
  constructor(message: string) {
    super(message);
  }
  get name(): string {
    return 'SpacetimeHostError';
  }
}

/**
 * An internal reducer error returned by the server runtime.
 */
export class InternalError extends Error {
  constructor(message: string) {
    super(message);
  }
  get name(): string {
    return 'InternalError';
  }
}

const errorData = {
  HostCallFailure: 1,
  NotInTransaction: 2,
  BsatnDecodeError: 3,
  NoSuchTable: 4,
  NoSuchIndex: 5,
  NoSuchIter: 6,
  NoSuchConsoleTimer: 7,
  NoSuchBytes: 8,
  NoSpace: 9,
  BufferTooSmall: 11,
  UniqueAlreadyExists: 12,
  ScheduleAtDelayTooLong: 13,
  IndexNotUnique: 14,
  NoSuchRow: 15,
  AutoIncOverflow: 16,
  WouldBlockTransaction: 17,
  TransactionNotAnonymous: 18,
  TransactionIsReadOnly: 19,
  TransactionIsMut: 20,
  HttpError: 21,
};

function mapEntries<T extends Record<string, number>, U>(
  x: T,
  f: (key: keyof T, value: number) => U
): { [k in keyof T]: U } {
  return Object.fromEntries(
    Object.entries(x).map(([k, v]) => [k, f(k as keyof T, v as number)])
  ) as { [k in keyof T]: U };
}

const errnoToClass = new Map<number, new (msg: string) => Error>();

/**
 * Map from error names to their corresponding SpacetimeError subclass.
 * Used for JSDoc references and error handling.
 */
export const errors = Object.freeze(
  mapEntries(errorData, (name, code) => {
    const cls = Object.defineProperty(
      class extends SpacetimeHostError {
        get name() {
          return name;
        }
      },
      'name',
      { value: name, writable: false }
    );
    errnoToClass.set(code, cls);
    return cls;
  })
);

export function getErrorConstructor(code: number): new (msg: string) => Error {
  return errnoToClass.get(code) ?? SpacetimeHostError;
}
