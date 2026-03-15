import { useState, useEffect, useRef, useCallback } from '@lynx-js/react';
import type { DbConnectionImpl, Identity } from './index';
import { getSpacetimeClient } from './client';
import type { SpacetimeConfig, SpacetimeClient } from './client';

export interface UseSpacetimeDBOptions {
  config?: Partial<SpacetimeConfig>;
  autoConnect?: boolean;
  onConnect?: (identity: Identity, token: string) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface UseSpacetimeDBReturn {
  client: DbConnectionImpl<any> | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToTable: (tableName: string) => any;
  callReducer: (name: string, argsBytes?: Uint8Array) => Promise<void>;
}

/**
 * React hook for managing SpacetimeDB connection in Lynx apps
 */
export function useSpacetimeDB(options: UseSpacetimeDBOptions = {}): UseSpacetimeDBReturn {
  const { config, autoConnect = false, onConnect, onDisconnect, onError } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const wrapperRef = useRef(getSpacetimeClient(config));
  const clientRef = useRef<DbConnectionImpl<any> | null>(null);

  // Setup event handlers
  useEffect(() => {
    const wrapper = wrapperRef.current;

    wrapper.onConnect((identity, token) => {
      const client = wrapper.getClient();
      clientRef.current = client;
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      onConnect?.(identity, token);
    });

    wrapper.onDisconnect(() => {
      clientRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
      onDisconnect?.();
    });

    wrapper.onConnectError((err) => {
      setError(err);
      setIsConnecting(false);
      onError?.(err);
    });

  }, [onConnect, onDisconnect, onError]);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      const client = await wrapperRef.current.connect();
      clientRef.current = client;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected]);

  const disconnect = useCallback(() => {
    wrapperRef.current.disconnect();
    clientRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const subscribeToTable = useCallback((tableName: string): any => {
    if (!clientRef.current) {
      console.warn('SpacetimeDB not connected. Call connect() first.');
      return () => {}; 
    }
    return wrapperRef.current.subscribeToTable(tableName);
  }, []);

  const callReducer = useCallback(async (name: string, argsBytes: Uint8Array = new Uint8Array()): Promise<void> => {
    if (!clientRef.current) {
      console.warn('SpacetimeDB not connected. Call connect() first.');
      return;
    }
    return wrapperRef.current.callReducer(name, argsBytes);
  }, []);

  // Auto-connect if requested
  useEffect(() => {
    if (autoConnect && !isConnected && !isConnecting) {
      connect();
    }
  }, [autoConnect, connect, isConnected, isConnecting]);

  return {
    client: clientRef.current,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    subscribeToTable,
    callReducer,
  };
}

export default useSpacetimeDB;
