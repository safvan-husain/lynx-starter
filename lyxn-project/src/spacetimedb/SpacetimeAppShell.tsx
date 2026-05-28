import {
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from '@lynx-js/react';
import { SpacetimeDBProvider } from 'spacetimedb-lynx/react';
import { createConnectionBuilder } from './connectionBuilder';
import type { DbConnection } from './module_bindings';
import { SpacetimeRetryContext } from './spacetimeRetryContext';

type ConnectionBuilder = ReturnType<typeof DbConnection.builder>;

export function SpacetimeAppShell({ children }: { children: ReactNode }) {
  const [sessionKey, setSessionKey] = useState(0);
  const [connectionBuilder, setConnectionBuilder] =
    useState<ConnectionBuilder | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setConnectionBuilder(null);
      const builder = await createConnectionBuilder();
      if (!cancelled) {
        setConnectionBuilder(builder);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  const retry = useCallback(() => {
    setSessionKey((current) => current + 1);
  }, []);

  if (!connectionBuilder) {
    return null;
  }

  return (
    <SpacetimeRetryContext.Provider value={retry}>
      <SpacetimeDBProvider
        key={sessionKey}
        connectionBuilder={connectionBuilder}
      >
        {children}
      </SpacetimeDBProvider>
    </SpacetimeRetryContext.Provider>
  );
}
