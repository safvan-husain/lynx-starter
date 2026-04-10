/**
 * SpacetimeDB Client for Lynx
 *
 * Uses the spacetimedb-lynx package with Lynx-specific adapters
 */

import {
  DbConnectionBuilder,
  DbConnectionImpl,
  type Identity,
  type RemoteModule,
  type SubscriptionHandleImpl,
} from 'spacetimedb-lynx/sdk';
import { writeHostLog } from '../debug/hostFileLogger';
import { LynxWebSocketAdapter, lynxFetch } from './lynx-adapters';

// SpacetimeDB connection configuration
export interface SpacetimeConfig {
  url: string;
  database: string;
  authToken?: string;
}

// Default configuration
const DEFAULT_CONFIG: SpacetimeConfig = {
  url: 'http://127.0.0.1:3000',
  database: 'lynx-counter',
};

type EmptyRemoteModule = RemoteModule<
  { tables: Record<string, never> },
  { reducers: readonly [] },
  { procedures: readonly [] },
  '1.4.0'
>;

class SpacetimeClientWrapper {
  private connection: DbConnectionImpl<EmptyRemoteModule> | null = null;
  private connected = false;
  private config: SpacetimeConfig;
  private onConnectCallback:
    | ((identity: Identity, token: string) => void)
    | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private onConnectErrorCallback: ((error: Error) => void) | null = null;

  constructor(config: Partial<SpacetimeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async connect(): Promise<DbConnectionImpl<EmptyRemoteModule>> {
    if (this.connection) {
      if (this.connected) {
        writeHostLog('info', '[SpacetimeDB] Reusing existing connection', {
          source: 'SpacetimeClientWrapper',
        });
        return this.connection;
      }

      writeHostLog('warn', '[SpacetimeDB] Discarding stale connection', {
        source: 'SpacetimeClientWrapper',
      });
      this.connection.disconnect();
      this.connection = null;
    }

    if (!this.config.database) {
      throw new Error('Database name is required.');
    }

    try {
      writeHostLog('info', '[SpacetimeDB] Building connection', {
        source: 'SpacetimeClientWrapper',
        url: this.config.url,
        database: this.config.database,
      });
      // Use the internal classes to build the connection
      // For a real app, you'd use the generated code which would have a better type
      // than DbConnectionImpl<EmptyRemoteModule>, but this works for a generic client.
      const mockRemoteModule: EmptyRemoteModule = {
        tables: {},
        reducers: [],
        procedures: [],
        versionInfo: { cliVersion: '1.4.0' },
      };
      const builder = new DbConnectionBuilder<
        DbConnectionImpl<EmptyRemoteModule>
      >(mockRemoteModule, (config) => new DbConnectionImpl(config))
        .withUri(this.config.url)
        .withDatabaseName(this.config.database)
        .withToken(this.config.authToken)
        .withWS(LynxWebSocketAdapter)
        .withFetchFn(lynxFetch)
        .withCompression('none');

      builder.onConnect((_conn, identity, token) => {
        console.log('[SpacetimeDB] Connected successfully!');
        this.connected = true;
        writeHostLog('info', '[SpacetimeDB] Connected successfully', {
          source: 'SpacetimeClientWrapper',
          identity: identity.toHexString(),
          tokenLength: token?.length ?? 0,
        });
        this.onConnectCallback?.(identity, token);
      });

      builder.onConnectError((_ctx, error) => {
        console.error('[SpacetimeDB] Connection error:', error);
        this.connected = false;
        this.connection = null;
        writeHostLog('error', '[SpacetimeDB] Connection error', {
          source: 'SpacetimeClientWrapper',
          error: error instanceof Error ? error.message : String(error),
        });
        this.onConnectErrorCallback?.(error);
      });

      builder.onDisconnect((_ctx, error) => {
        console.log('[SpacetimeDB] Disconnected', error);
        this.connected = false;
        writeHostLog('warn', '[SpacetimeDB] Disconnected', {
          source: 'SpacetimeClientWrapper',
          error: error instanceof Error ? error.message : String(error),
        });
        this.connection = null;
        this.onDisconnectCallback?.();
      });

      this.connection = builder.build();
      writeHostLog('info', '[SpacetimeDB] Connection object created', {
        source: 'SpacetimeClientWrapper',
      });
      return this.connection;
    } catch (error) {
      console.error('[SpacetimeDB] Setup error:', error);
      writeHostLog('error', '[SpacetimeDB] Setup error', {
        source: 'SpacetimeClientWrapper',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  disconnect(): void {
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
    }
    if (this.connected) {
      this.connected = false;
      this.onDisconnectCallback?.();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): DbConnectionImpl<EmptyRemoteModule> | null {
    return this.connection;
  }

  // Table subscription methods - simplified for this wrapper
  subscribeToTable(
    tableName: string,
  ): SubscriptionHandleImpl<EmptyRemoteModule> {
    if (!this.connection) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this.connection
      .subscriptionBuilder()
      .onApplied(() => {
        console.log(`Subscribed to ${tableName}`);
      })
      .subscribe(`SELECT * FROM ${tableName}`);
  }

  // Reducer call method
  async callReducer(
    name: string,
    argsBytes: Uint8Array = new Uint8Array(),
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this.connection.callReducer(name, argsBytes);
  }

  // Event handlers
  onConnect(callback: (identity: Identity, token: string) => void): void {
    this.onConnectCallback = callback;
  }

  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }

  onConnectError(callback: (error: Error) => void): void {
    this.onConnectErrorCallback = callback;
  }
}

// Export singleton instance
let clientInstance: SpacetimeClientWrapper | null = null;

export function getSpacetimeClient(
  config?: Partial<SpacetimeConfig>,
): SpacetimeClientWrapper {
  if (!clientInstance) {
    clientInstance = new SpacetimeClientWrapper(config);
  }
  return clientInstance;
}

export function createSpacetimeClient(
  config?: Partial<SpacetimeConfig>,
): SpacetimeClientWrapper {
  return new SpacetimeClientWrapper(config);
}

export type { SpacetimeClientWrapper as SpacetimeClient };

// Re-export spacetimedb-lynx types and functions for convenience
export type { ReducerEvent } from 'spacetimedb-lynx/sdk';
