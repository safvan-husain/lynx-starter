import { useContext, useMemo } from '@lynx-js/react';
import { useSpacetimeDB } from 'spacetimedb-lynx/react';
import type { DbConnection } from './module_bindings';
import { SpacetimeRetryContext } from './spacetimeRetryContext';

export type SpacetimeConnectionStatus = 'connecting' | 'connected' | 'failed';

export interface UseSpacetimeConnectionReturn {
  connection: DbConnection | null;
  errorMessage: string | null;
  retry: () => void;
  status: SpacetimeConnectionStatus;
}

export function useSpacetimeConnection(): UseSpacetimeConnectionReturn {
  const { connectionError, getConnection, isActive } = useSpacetimeDB();
  const retry = useContext(SpacetimeRetryContext);

  return useMemo(() => {
    const status: SpacetimeConnectionStatus = connectionError
      ? 'failed'
      : isActive
        ? 'connected'
        : 'connecting';

    return {
      connection: status === 'connected' ? getConnection() : null,
      errorMessage: connectionError?.message ?? null,
      retry,
      status,
    };
  }, [connectionError, getConnection, isActive, retry]);
}
