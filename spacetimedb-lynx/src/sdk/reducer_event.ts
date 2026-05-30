import { Timestamp } from '../lib/timestamp';
import type { ReducerOutcome, TransactionUpdate } from './client_api/types';
import type { ReducerEventInfo } from './reducers';

export type UpdateStatus =
  | { tag: 'Committed'; value?: TransactionUpdate }
  | { tag: 'Failed'; value: string }
  | { tag: 'OutOfEnergy' };

export type ReducerEvent<Reducer extends ReducerEventInfo> = {
  /**
   * The time when the reducer started running.
   *
   * @internal This is a number and not Date, as JSON.stringify with date in it gives number, but JSON.parse of the same string does not give date. TO avoid
   * confusion in typing we'll keep it a number
   */
  timestamp: Timestamp;

  /**
   * The reducer outcome, including optional return value and updates.
   *
   * @deprecated Prefer `status` for parity with the official reducer event API.
   */
  outcome: ReducerOutcome;

  /**
   * Whether the reducer committed, failed, or ran out of energy.
   */
  status: UpdateStatus;

  reducer: Reducer;
};
