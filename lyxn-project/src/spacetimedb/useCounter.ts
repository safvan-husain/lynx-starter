import { useCallback, useEffect, useRef, useState } from '@lynx-js/react';
import { writeHostLog } from '../debug/hostFileLogger';
import {
  COUNTER_DATABASE_NAME,
  COUNTER_POLL_INTERVAL_MS,
  COUNTER_SERVER_URL,
} from './connectionConfig';
import { getErrorMessage } from './errors';
import type { DbConnection } from './module_bindings';
import { runReducerWithTimeout } from './reducerUtils';
import { lynxFetch } from './lynx-adapters';
import type { SpacetimeConnectionStatus } from './useSpacetimeConnection';

export type CounterConnectionStatus = 'idle' | 'ready' | 'failed';

export { COUNTER_DATABASE_NAME, COUNTER_SERVER_URL };

const COUNTER_SQL = 'select * from counter';

type CounterSqlResult = Array<{
  rows?: Array<[number, number]>;
}>;

type FetchLikeResponse = {
  json: () => Promise<unknown>;
  ok?: boolean;
  status?: number;
  text?: () => Promise<string>;
};

export interface UseCounterOptions {
  connection: DbConnection | null;
  connectionStatus: SpacetimeConnectionStatus;
  isSignedIn: boolean;
}

export interface UseCounterReturn {
  counterValue: number;
  decrement: () => Promise<void>;
  errorMessage: string | null;
  increment: () => Promise<void>;
  isMutating: boolean;
  reset: () => Promise<void>;
  status: CounterConnectionStatus;
}

function getSqlEndpoint(): string {
  return `${COUNTER_SERVER_URL}/v1/database/${COUNTER_DATABASE_NAME}/sql`;
}

async function queryCounterValue(): Promise<number> {
  const response = (await lynxFetch(getSqlEndpoint(), {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
    },
    body: COUNTER_SQL,
  })) as FetchLikeResponse;

  if (response.ok === false) {
    const body = response.text ? await response.text() : '';
    throw new Error(
      `Counter SQL request failed (${response.status ?? 'unknown'}): ${body}`,
    );
  }

  const payload = (await response.json()) as CounterSqlResult;
  const row = payload?.[0]?.rows?.[0];
  return Number(row?.[1] ?? 0);
}

export function useCounter({
  connection,
  connectionStatus,
  isSignedIn,
}: UseCounterOptions): UseCounterReturn {
  const [counterValue, setCounterValue] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [status, setStatus] = useState<CounterConnectionStatus>('idle');

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestSerialRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const fetchCounterSnapshot = useCallback(async () => {
    const requestId = ++requestSerialRef.current;
    try {
      const nextValue = await queryCounterValue();
      if (requestSerialRef.current !== requestId) {
        return;
      }
      setCounterValue(nextValue);
      setErrorMessage(null);
      setStatus('ready');
    } catch (error) {
      const message = getErrorMessage(error);
      writeHostLog('error', '[Counter] Snapshot query failed', {
        source: 'useCounter',
        message,
      });
      if (requestSerialRef.current !== requestId) {
        return;
      }
      setErrorMessage(message);
      setStatus('failed');
      stopPolling();
    }
  }, [stopPolling]);

  useEffect(() => {
    stopPolling();
    requestSerialRef.current += 1;

    if (!isSignedIn || connectionStatus !== 'connected') {
      setStatus('idle');
      return;
    }

    void fetchCounterSnapshot();
    pollIntervalRef.current = setInterval(() => {
      void fetchCounterSnapshot();
    }, COUNTER_POLL_INTERVAL_MS);

    return () => {
      stopPolling();
    };
  }, [
    connectionStatus,
    fetchCounterSnapshot,
    isSignedIn,
    stopPolling,
  ]);

  const runReducer = useCallback(
    async (
      label: string,
      reducerPromise: Promise<unknown>,
    ) => {
      if (!connection || connectionStatus !== 'connected' || isMutating) {
        return;
      }

      setIsMutating(true);
      setErrorMessage(null);

      try {
        await runReducerWithTimeout(label, reducerPromise);
      } catch (error) {
        const message = getErrorMessage(error);
        writeHostLog('error', '[Counter] Reducer call failed', {
          source: 'useCounter',
          action: label,
          message,
        });
        setErrorMessage(message);
      }

      try {
        await fetchCounterSnapshot();
      } catch {
        // Snapshot errors are surfaced by fetchCounterSnapshot.
      } finally {
        setIsMutating(false);
      }
    },
    [connection, connectionStatus, fetchCounterSnapshot, isMutating],
  );

  const increment = useCallback(
    () => runReducer('increment', connection!.reducers.incrementCounter({})),
    [connection, runReducer],
  );

  const decrement = useCallback(
    () => runReducer('decrement', connection!.reducers.decrementCounter({})),
    [connection, runReducer],
  );

  const reset = useCallback(
    () => runReducer('reset', connection!.reducers.resetCounter({})),
    [connection, runReducer],
  );

  return {
    counterValue,
    decrement,
    errorMessage,
    increment,
    isMutating,
    reset,
    status,
  };
}
