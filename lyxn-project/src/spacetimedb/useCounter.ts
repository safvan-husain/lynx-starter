import { useCallback, useState } from '@lynx-js/react';
import { useTable } from 'spacetimedb-lynx/react';
import { writeHostLog } from '../debug/hostFileLogger';
import { COUNTER_DATABASE_NAME, COUNTER_SERVER_URL } from './connectionConfig';
import { getErrorMessage } from './errors';
import type { DbConnection } from './module_bindings';
import { tables } from './module_bindings';
import { runReducerWithTimeout } from './reducerUtils';
import { useSpacetimeConnection } from './useSpacetimeConnection';

export type CounterConnectionStatus = 'idle' | 'ready' | 'failed';

export { COUNTER_DATABASE_NAME, COUNTER_SERVER_URL };

export interface UseCounterOptions {
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

export function useCounter({
  isSignedIn,
}: UseCounterOptions): UseCounterReturn {
  const { connection, status: connectionStatus } = useSpacetimeConnection();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const handleSubscriptionError = useCallback((error: Error) => {
    const message = getErrorMessage(error);
    writeHostLog('error', '[Counter] Subscription failed', {
      source: 'useCounter',
      message,
    });
    setErrorMessage(message);
  }, []);

  const [counterRows, counterReady] = useTable(tables.counter, {
    enabled: isSignedIn && connectionStatus === 'connected',
    onError: handleSubscriptionError,
  });

  const counterValue = Number(counterRows[0]?.count ?? 0);
  const status: CounterConnectionStatus =
    isSignedIn && connectionStatus === 'connected'
      ? counterReady
        ? 'ready'
        : 'idle'
      : 'idle';

  const runReducer = useCallback(
    async (
      label: string,
      reducer: (activeConnection: DbConnection) => Promise<unknown>,
    ) => {
      if (!connection || connectionStatus !== 'connected' || isMutating) {
        return;
      }

      setIsMutating(true);
      setErrorMessage(null);

      try {
        await runReducerWithTimeout(label, reducer(connection));
      } catch (error) {
        const message = getErrorMessage(error);
        writeHostLog('error', '[Counter] Reducer call failed', {
          source: 'useCounter',
          action: label,
          message,
        });
        setErrorMessage(message);
      } finally {
        setIsMutating(false);
      }
    },
    [connection, connectionStatus, isMutating],
  );

  const increment = useCallback(
    () =>
      runReducer('increment', (activeConnection) =>
        activeConnection.reducers.incrementCounter({}),
      ),
    [runReducer],
  );

  const decrement = useCallback(
    () =>
      runReducer('decrement', (activeConnection) =>
        activeConnection.reducers.decrementCounter({}),
      ),
    [runReducer],
  );

  const reset = useCallback(
    () =>
      runReducer('reset', (activeConnection) =>
        activeConnection.reducers.resetCounter({}),
      ),
    [runReducer],
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
