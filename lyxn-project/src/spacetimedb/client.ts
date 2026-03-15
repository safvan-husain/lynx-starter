/**
 * SpacetimeDB Client for Lynx
 * 
 * Uses the spacetimedb-lynx package with Lynx-specific adapters
 */

import { 
  DbConnectionImpl,
  DbConnectionBuilder,
  StdbUrl,
  Identity
} from 'spacetimedb-lynx/sdk';

import { LynxWebSocketAdapter, lynxFetch } from './lynx-adapters';

// SpacetimeDB connection configuration
export interface SpacetimeConfig {
  url: string;
  database: string;
  authToken?: string;
}

// Default configuration
const DEFAULT_CONFIG: SpacetimeConfig = {
  url: 'https://maincloud.spacetimedb.com',
  database: 'lynx-starter-jzx7d',
};

class SpacetimeClientWrapper {
  private connection: DbConnectionImpl<any> | null = null;
  private config: SpacetimeConfig;
  private onConnectCallback: ((identity: Identity, token: string) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private onConnectErrorCallback: ((error: Error) => void) | null = null;

  constructor(config: Partial<SpacetimeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async connect(): Promise<DbConnectionImpl<any>> {
    if (this.connection) {
      return this.connection;
    }

    if (!this.config.database) {
      throw new Error('Database name is required.');
    }

    try {
      // Use the internal classes to build the connection
      // For a real app, you'd use the generated code which would have a better type
      // than DbConnectionImpl<any>, but this works for a generic client.
      const builder = new DbConnectionBuilder(
        { 
          tables: {}, 
          reducers: [], 
          procedures: [],
          versionInfo: { cliVersion: '1.0.0' } 
        } as any, // Generic mock module for untyped client
        (config) => new DbConnectionImpl(config)
      )
        .withUri(this.config.url)
        .withDatabaseName(this.config.database)
        .withToken(this.config.authToken)
        .withWS(LynxWebSocketAdapter)
        .withFetchFn(lynxFetch);

      builder.onConnect((conn, identity, token) => {
        console.log('[SpacetimeDB] Connected successfully!');
        this.onConnectCallback?.(identity, token);
      });

      builder.onConnectError((ctx, error) => {
        console.error('[SpacetimeDB] Connection error:', error);
        this.onConnectErrorCallback?.(error);
      });

      builder.onDisconnect((ctx, error) => {
        console.log('[SpacetimeDB] Disconnected', error);
        this.connection = null;
        this.onDisconnectCallback?.();
      });

      this.connection = builder.build();
      return this.connection;
    } catch (error) {
      console.error('[SpacetimeDB] Setup error:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
    }
  }

  isConnected(): boolean {
    return this.connection !== null;
  }

  getClient(): DbConnectionImpl<any> | null {
    return this.connection;
  }

  // Table subscription methods - simplified for this wrapper
  subscribeToTable(tableName: string): any {
    if (!this.connection) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this.connection.subscriptionBuilder().onApplied(() => {
      console.log(`Subscribed to ${tableName}`);
    }).subscribe(`SELECT * FROM ${tableName}`);
  }

  // Reducer call method
  async callReducer(name: string, argsBytes: Uint8Array = new Uint8Array()): Promise<void> {
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

export function getSpacetimeClient(config?: Partial<SpacetimeConfig>): SpacetimeClientWrapper {
  if (!clientInstance) {
    clientInstance = new SpacetimeClientWrapper(config);
  }
  return clientInstance;
}

export function createSpacetimeClient(config?: Partial<SpacetimeConfig>): SpacetimeClientWrapper {
  return new SpacetimeClientWrapper(config);
}

export type { SpacetimeClientWrapper as SpacetimeClient };

// Re-export spacetimedb-lynx types and functions for convenience
export type { 
  ReducerEvent, 
} from 'spacetimedb-lynx/sdk';
