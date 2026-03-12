/**
 * SpacetimeDB Client for Lynx
 * 
 * Uses the spacetimedb-lynx package with Lynx-specific adapters
 */

import { 
  initSpacetimeDB, 
  getSpacetimeDB,
  connect as spacetimeConnect,
  disconnect as spacetimeDisconnect,
  subscribeToTable,
  callReducer,
  type SpacetimeDBClient,
  type SpacetimeDBConfig
} from 'spacetimedb-lynx';

import { createLynxHttpClient, createLynxWebSocketFactory } from './lynx-adapters';

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
  private client: SpacetimeDBClient | null = null;
  private config: SpacetimeConfig;
  private onConnectCallback: (() => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private onConnectErrorCallback: ((error: Error) => void) | null = null;

  constructor(config: Partial<SpacetimeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async connect(): Promise<SpacetimeDBClient> {
    if (this.client) {
      return this.client;
    }

    if (!this.config.database) {
      throw new Error('Database name is required.');
    }

    try {
      // Initialize SpacetimeDB with Lynx adapters
      const spacetimeConfig: SpacetimeDBConfig = {
        url: this.config.url,
        nameOrAddress: this.config.database,
        authToken: this.config.authToken,
        websocket: createLynxWebSocketFactory(),
        http: createLynxHttpClient()
      };

      this.client = initSpacetimeDB(spacetimeConfig);
      
      // Connect to SpacetimeDB
      await spacetimeConnect();
      
      console.log('[SpacetimeDB] Connected successfully!');
      this.onConnectCallback?.();
      
      return this.client;
    } catch (error) {
      console.error('[SpacetimeDB] Connection error:', error);
      this.onConnectErrorCallback?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  disconnect(): void {
    if (this.client) {
      spacetimeDisconnect();
      this.client = null;
      console.log('[SpacetimeDB] Disconnected');
      this.onDisconnectCallback?.();
    }
  }

  isConnected(): boolean {
    return this.client?.isConnected() ?? false;
  }

  getClient(): SpacetimeDBClient | null {
    return this.client;
  }

  // Table subscription methods
  subscribeToTable(tableName: string, callback?: (rows: any[]) => void): () => void {
    if (!this.client) {
      throw new Error('Not connected. Call connect() first.');
    }
    return subscribeToTable(tableName, callback);
  }

  // Reducer call method
  async callReducer(name: string, args: any = {}, callback?: (event: any) => void): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected. Call connect() first.');
    }
    return callReducer(name, args, callback);
  }

  // Event handlers
  onConnect(callback: () => void): void {
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
  TableRow, 
  TableUpdate, 
  ReducerEvent, 
  SubscriptionCallback, 
  ReducerCallback 
} from 'spacetimedb-lynx';