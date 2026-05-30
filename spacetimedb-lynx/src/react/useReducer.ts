import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ReducerCallOptions,
  UntypedReducerDef,
} from '../sdk/reducers';
import { useSpacetimeDB } from './useSpacetimeDB';
import type { ParamsType } from '../sdk';

export type UseReducerStatus = 'idle' | 'pending' | 'success' | 'error';

export interface UseReducerOptions {
  /**
   * Whether reducer calls are allowed.
   *
   * Defaults to `true`.
   */
  enabled?: boolean;
  /**
   * Queue calls made before a connection is active, then flush them when a
   * connection becomes available.
   *
   * Defaults to `false` so accidental taps while disconnected do not mutate
   * later without explicit opt-in.
   */
  queueUntilConnected?: boolean;
  /**
   * Default reducer call flags to send with each call.
   */
  flags?: ReducerCallOptions['flags'];
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export interface UseReducerState {
  error: Error | null;
  isPending: boolean;
  pendingCount: number;
  resetError: () => void;
  status: UseReducerStatus;
}

export type UseReducerCall<ReducerDef extends UntypedReducerDef> = ((
  ...params: ParamsType<ReducerDef>
) => Promise<void>) &
  UseReducerState;

const DISABLED_ERROR = 'Reducer call is disabled.';
const DISCONNECTED_ERROR = 'SpacetimeDB connection is not active.';

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function useReducer<ReducerDef extends UntypedReducerDef>(
  reducerDef: ReducerDef,
  options: UseReducerOptions = {}
): UseReducerCall<ReducerDef> {
  const { getConnection, isActive } = useSpacetimeDB();
  const reducerName = reducerDef.accessorName;
  const enabled = options.enabled ?? true;
  const queueUntilConnected = options.queueUntilConnected ?? false;
  const defaultFlags = options.flags;

  const [error, setError] = useState<Error | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [status, setStatus] = useState<UseReducerStatus>('idle');

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Holds calls made before the connection exists
  const queueRef = useRef<
    {
      params: ParamsType<ReducerDef>;
      resolve: () => void;
      reject: (err: unknown) => void;
    }[]
  >([]);

  const resetError = useCallback(() => {
    setError(null);
    setStatus(current => (current === 'error' ? 'idle' : current));
  }, []);

  const execute = useCallback(
    async (params: ParamsType<ReducerDef>): Promise<void> => {
      const conn = getConnection();
      if (!enabled) {
        const disabledError = new Error(DISABLED_ERROR);
        setError(disabledError);
        setStatus('error');
        optionsRef.current.onError?.(disabledError);
        throw disabledError;
      }
      if (!conn || !isActive) {
        const disconnectedError = new Error(DISCONNECTED_ERROR);
        setError(disconnectedError);
        setStatus('error');
        optionsRef.current.onError?.(disconnectedError);
        throw disconnectedError;
      }

      const fn = (conn.reducers as any)[reducerName] as (
        ...p: [...ParamsType<ReducerDef>, ReducerCallOptions?]
      ) => Promise<void>;

      setPendingCount(count => count + 1);
      setStatus('pending');
      setError(null);

      try {
        const args = defaultFlags
          ? ([...params, { flags: defaultFlags }] as [
              ...ParamsType<ReducerDef>,
              ReducerCallOptions,
            ])
          : params;
        await fn(...args);
        setStatus('success');
        optionsRef.current.onSuccess?.();
      } catch (err) {
        const reducerError = toError(err);
        setError(reducerError);
        setStatus('error');
        optionsRef.current.onError?.(reducerError);
        throw reducerError;
      } finally {
        setPendingCount(count => {
          const next = Math.max(0, count - 1);
          return next;
        });
      }
    },
    [defaultFlags, enabled, getConnection, isActive, reducerName]
  );

  // Flush when we finally have a connection
  useEffect(() => {
    const conn = getConnection();
    if (!conn || !isActive || !queueUntilConnected) {
      return;
    }
    if (queueRef.current.length) {
      const pending = queueRef.current.splice(0);
      for (const item of pending) {
        execute(item.params).then(item.resolve, item.reject);
      }
    }
  }, [execute, getConnection, isActive, queueUntilConnected]);

  const callReducer = useCallback(
    (...params: ParamsType<ReducerDef>) => {
      const conn = getConnection();
      if ((!conn || !isActive) && queueUntilConnected) {
        return new Promise<void>((resolve, reject) => {
          queueRef.current.push({ params, resolve, reject });
        });
      }
      return execute(params);
    },
    [execute, getConnection, isActive, queueUntilConnected]
  );

  return useMemo(
    () =>
      Object.assign(callReducer, {
        error,
        isPending: pendingCount > 0,
        pendingCount,
        resetError,
        status,
      }),
    [callReducer, error, pendingCount, resetError, status]
  );
}
