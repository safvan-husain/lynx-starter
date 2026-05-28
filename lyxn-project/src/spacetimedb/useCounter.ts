import { useCallback, useEffect, useRef, useState } from '@lynx-js/react';
import { writeHostLog } from '../debug/hostFileLogger';
import { DbConnection } from './module_bindings';
import { LynxWebSocketAdapter, lynxFetch } from './lynx-adapters';

export type CounterConnectionStatus = 'connecting' | 'connected' | 'failed';

export const COUNTER_DATABASE_NAME = 'lynx-counter';
export const COUNTER_SERVER_URL =
  SystemInfo.platform === 'Android'
    ? 'http://10.0.2.2:3000'
    : 'http://127.0.0.1:3000';

const CONNECT_TIMEOUT_MS = 8000;
const COUNTER_POLL_INTERVAL_MS = 1500;
// Lynx WebSocket adapter may not resolve reducer promises; do not block UI on ack.
const REDUCER_ACK_TIMEOUT_MS = 750;
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

export interface UseCounterReturn {
  counterValue: number;
  errorMessage: string | null;
  isMutating: boolean;
  retry: () => void;
  decrement: () => Promise<void>;
  increment: () => Promise<void>;
  status: CounterConnectionStatus;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
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

export function useCounter(): UseCounterReturn {
  const [counterValue, setCounterValue] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [status, setStatus] = useState<CounterConnectionStatus>('connecting');

  const connectionRef = useRef<DbConnection | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestSerialRef = useRef(0);

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

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

  const disconnectCurrentConnection = useCallback(() => {
    clearConnectTimeout();
    stopPolling();
    requestSerialRef.current += 1;

    const connection = connectionRef.current;
    connectionRef.current = null;
    if (connection) {
      try {
        connection.disconnect();
      } catch {
        // Best-effort cleanup only.
      }
    }
  }, [clearConnectTimeout, stopPolling]);

  const failConnection = useCallback(
    (message: string) => {
      writeHostLog('error', '[Counter] Connection failed', {
        source: 'useCounter',
        message,
      });
      setErrorMessage(message);
      setStatus('failed');
      disconnectCurrentConnection();
    },
    [disconnectCurrentConnection],
  );

  const connect = useCallback(() => {
    disconnectCurrentConnection();
    setErrorMessage(null);
    setStatus('connecting');

    writeHostLog('info', '[Counter] Connecting', {
      source: 'useCounter',
      url: COUNTER_SERVER_URL,
      database: COUNTER_DATABASE_NAME,
    });

    let nextConnection: DbConnection | null = null;

    const builder = DbConnection.builder()
      .withUri(COUNTER_SERVER_URL)
      .withDatabaseName(COUNTER_DATABASE_NAME)
      .withWS(LynxWebSocketAdapter)
      .withFetchFn(lynxFetch)
      .withCompression('none');

    builder.onConnect(async (_conn, identity, token) => {
      if (!nextConnection || connectionRef.current !== nextConnection) {
        return;
      }

      clearConnectTimeout();
      writeHostLog('info', '[Counter] Connected', {
        source: 'useCounter',
        identity: identity.toHexString(),
        tokenLength: token.length,
      });
      setStatus('connected');
      setErrorMessage(null);

      await fetchCounterSnapshot();

      stopPolling();
      pollIntervalRef.current = setInterval(() => {
        void fetchCounterSnapshot();
      }, COUNTER_POLL_INTERVAL_MS);
    });

    builder.onConnectError((_ctx, error) => {
      if (!nextConnection || connectionRef.current !== nextConnection) {
        return;
      }
      failConnection(getErrorMessage(error));
    });

    builder.onDisconnect((_ctx, error) => {
      if (!nextConnection || connectionRef.current !== nextConnection) {
        return;
      }
      failConnection(
        error instanceof Error
          ? error.message
          : 'Disconnected from SpacetimeDB.',
      );
    });

    nextConnection = builder.build();
    connectionRef.current = nextConnection;

    connectTimeoutRef.current = setTimeout(() => {
      if (!nextConnection || connectionRef.current !== nextConnection) {
        return;
      }
      failConnection('Timed out waiting for the initial SpacetimeDB connection.');
    }, CONNECT_TIMEOUT_MS);
  }, [
    clearConnectTimeout,
    disconnectCurrentConnection,
    failConnection,
    fetchCounterSnapshot,
    stopPolling,
  ]);

  const runReducer = useCallback(
    async (action: 'decrement' | 'increment') => {
      const connection = connectionRef.current;
      if (!connection || status !== 'connected' || isMutating) {
        return;
      }

      setIsMutating(true);
      setErrorMessage(null);

      const reducerPromise =
        action === 'increment'
          ? connection.reducers.incrementCounter({})
          : connection.reducers.decrementCounter({});

      let reducerAcknowledged = false;
      try {
        await Promise.race([
          reducerPromise.then(() => {
            reducerAcknowledged = true;
          }),
          new Promise<void>((resolve) => {
            setTimeout(resolve, REDUCER_ACK_TIMEOUT_MS);
          }),
        ]);

        if (!reducerAcknowledged) {
          writeHostLog('warn', '[Counter] Reducer ack timed out; using SQL poll', {
            source: 'useCounter',
            action,
            timeoutMs: REDUCER_ACK_TIMEOUT_MS,
          });
        }
      } catch (error) {
        const message = getErrorMessage(error);
        writeHostLog('error', '[Counter] Reducer call failed', {
          source: 'useCounter',
          action,
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
    [fetchCounterSnapshot, isMutating, status],
  );

  const decrement = useCallback(() => runReducer('decrement'), [runReducer]);
  const increment = useCallback(() => runReducer('increment'), [runReducer]);
  const retry = useCallback(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      disconnectCurrentConnection();
    };
  }, [connect, disconnectCurrentConnection]);

  return {
    counterValue,
    decrement,
    errorMessage,
    increment,
    isMutating,
    retry,
    status,
  };
}
