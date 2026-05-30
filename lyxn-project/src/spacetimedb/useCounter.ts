import { useCallback, useState } from '@lynx-js/react';
import { useReducer, useTable } from 'spacetimedb-lynx/react';
import { writeHostLog } from '../debug/hostFileLogger';
import { COUNTER_DATABASE_NAME, COUNTER_SERVER_URL } from './connectionConfig';
import { getErrorMessage } from './errors';
import { reducers, tables } from './module_bindings';
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
  const { status: connectionStatus } = useSpacetimeConnection();
  const [subscriptionErrorMessage, setSubscriptionErrorMessage] = useState<
    string | null
  >(null);

  const handleSubscriptionError = useCallback((error: Error) => {
    const message = getErrorMessage(error);
    writeHostLog('error', '[Counter] Subscription failed', {
      source: 'useCounter',
      message,
    });
    setSubscriptionErrorMessage(message);
  }, []);

  const handleReducerError = useCallback(
    (action: string) => (error: Error) => {
      const message = getErrorMessage(error);
      writeHostLog('error', '[Counter] Reducer call failed', {
        source: 'useCounter',
        action,
        message,
      });
    },
    [],
  );

  const reducerEnabled = isSignedIn && connectionStatus === 'connected';
  const incrementCounter = useReducer(reducers.incrementCounter, {
    enabled: reducerEnabled,
    onError: handleReducerError('increment'),
  });
  const decrementCounter = useReducer(reducers.decrementCounter, {
    enabled: reducerEnabled,
    onError: handleReducerError('decrement'),
  });
  const resetCounter = useReducer(reducers.resetCounter, {
    enabled: reducerEnabled,
    onError: handleReducerError('reset'),
  });

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

  const isMutating =
    incrementCounter.isPending ||
    decrementCounter.isPending ||
    resetCounter.isPending;

  const resetReducerErrors = useCallback(() => {
    incrementCounter.resetError();
    decrementCounter.resetError();
    resetCounter.resetError();
  }, [decrementCounter, incrementCounter, resetCounter]);

  const runReducer = useCallback(
    async (reducer: () => Promise<void>) => {
      if (!reducerEnabled || isMutating) {
        return;
      }

      setSubscriptionErrorMessage(null);
      resetReducerErrors();
      await reducer().catch(() => {});
    },
    [isMutating, reducerEnabled, resetReducerErrors],
  );

  const increment = useCallback(
    () => runReducer(() => incrementCounter({})),
    [incrementCounter, runReducer],
  );

  const decrement = useCallback(
    () => runReducer(() => decrementCounter({})),
    [decrementCounter, runReducer],
  );

  const reset = useCallback(
    () => runReducer(() => resetCounter({})),
    [resetCounter, runReducer],
  );

  const reducerErrorMessage = getErrorMessage(
    incrementCounter.error ?? decrementCounter.error ?? resetCounter.error,
  );
  const errorMessage =
    subscriptionErrorMessage ??
    (incrementCounter.error || decrementCounter.error || resetCounter.error
      ? reducerErrorMessage
      : null);

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
