import { useState, useEffect, useRef, useCallback } from '@lynx-js/react';
import type { SpacetimeDBClient } from 'spacetimedb-lynx';
import { getSpacetimeClient } from './client';
import type { SpacetimeConfig } from './client';

export interface UseSpacetimeDBOptions {
  config?: Partial<SpacetimeConfig>;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface UseSpacetimeDBReturn {
  client: SpacetimeDBClient | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToTable: (tableName: string, callback?: (rows: Uint8Array[]) => void) => () => void;
  callReducer: (name: string, argsBytes?: Uint8Array, callback?: (event: any) => void) => Promise<void>;
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
  const clientRef = useRef<SpacetimeDBClient | null>(null);

  // Setup event handlers
  useEffect(() => {
    const wrapper = wrapperRef.current;

    wrapper.onConnect(() => {
      const client = wrapper.getClient();
      clientRef.current = client;
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      onConnect?.();
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

  const subscribeToTable = useCallback((tableName: string, callback?: (rows: Uint8Array[]) => void): (() => void) => {
    if (!clientRef.current) {
      console.warn('SpacetimeDB not connected. Call connect() first.');
      return () => {}; // Return empty function instead of null
    }
    return wrapperRef.current.subscribeToTable(tableName, callback);
  }, []);

  const callReducer = useCallback(async (name: string, argsBytes: Uint8Array = new Uint8Array(), callback?: (event: any) => void): Promise<void> => {
    if (!clientRef.current) {
      console.warn('SpacetimeDB not connected. Call connect() first.');
      return;
    }
    return wrapperRef.current.callReducer(name, argsBytes, callback);
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
