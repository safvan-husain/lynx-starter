import { useCallback, useEffect, useRef, useState } from '@lynx-js/react';
import { loadStdbToken, saveStdbToken } from '../auth/sessionStore';
import { writeHostLog } from '../debug/hostFileLogger';
import {
  CONNECT_TIMEOUT_MS,
  COUNTER_DATABASE_NAME,
  COUNTER_SERVER_URL,
} from './connectionConfig';
import { getErrorMessage } from './errors';
import { DbConnection } from './module_bindings';
import { LynxWebSocketAdapter, lynxFetch } from './lynx-adapters';

export type SpacetimeConnectionStatus = 'connecting' | 'connected' | 'failed';

export interface UseSpacetimeConnectionReturn {
  connection: DbConnection | null;
  errorMessage: string | null;
  retry: () => void;
  status: SpacetimeConnectionStatus;
}

export function useSpacetimeConnection(): UseSpacetimeConnectionReturn {
  const [status, setStatus] = useState<SpacetimeConnectionStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [connection, setConnection] = useState<DbConnection | null>(null);
  const connectionRef = useRef<DbConnection | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef('');

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearConnectTimeout();
    const activeConnection = connectionRef.current;
    connectionRef.current = null;
    setConnection(null);
    if (activeConnection) {
      try {
        activeConnection.disconnect();
      } catch {
        // Best-effort cleanup only.
      }
    }
  }, [clearConnectTimeout]);

  const failConnection = useCallback(
    (message: string) => {
      writeHostLog('error', '[Spacetime] Connection failed', {
        source: 'useSpacetimeConnection',
        message,
      });
      setErrorMessage(message);
      setStatus('failed');
      disconnect();
    },
    [disconnect],
  );

  const connect = useCallback(() => {
    disconnect();
    setErrorMessage(null);
    setStatus('connecting');

    writeHostLog('info', '[Spacetime] Connecting', {
      source: 'useSpacetimeConnection',
      url: COUNTER_SERVER_URL,
      database: COUNTER_DATABASE_NAME,
    });

    let nextConnection: DbConnection | null = null;

    const builder = DbConnection.builder()
      .withUri(COUNTER_SERVER_URL)
      .withDatabaseName(COUNTER_DATABASE_NAME)
      .withToken(tokenRef.current || undefined)
      .withWS(LynxWebSocketAdapter)
      .withFetchFn(lynxFetch)
      .withCompression('none');

    builder.onConnect((_conn, identity, token) => {
      if (!nextConnection || connectionRef.current !== nextConnection) {
        return;
      }

      clearConnectTimeout();
      tokenRef.current = token;
      void saveStdbToken(token);

      writeHostLog('info', '[Spacetime] Connected', {
        source: 'useSpacetimeConnection',
        identity: identity.toHexString(),
        tokenLength: token.length,
      });
      setConnection(nextConnection);
      setStatus('connected');
      setErrorMessage(null);
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
  }, [clearConnectTimeout, disconnect, failConnection]);

  const bootstrap = useCallback(async () => {
    tokenRef.current = await loadStdbToken();
    connect();
  }, [connect]);

  useEffect(() => {
    void bootstrap();
    return () => {
      disconnect();
    };
  }, [bootstrap, disconnect]);

  return {
    connection,
    errorMessage,
    retry: () => {
      void bootstrap();
    },
    status,
  };
}
