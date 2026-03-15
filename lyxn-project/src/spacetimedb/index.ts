// SpacetimeDB integration for Lynx using spacetimedb-lynx package
export { getSpacetimeClient, createSpacetimeClient } from './client';
export type { SpacetimeClient, SpacetimeConfig } from './client';
export { useSpacetimeDB } from './useSpacetimeDB';
export type { UseSpacetimeDBOptions, UseSpacetimeDBReturn } from './useSpacetimeDB';

// Re-export spacetimedb-lynx types for convenience
export type { 
  TableUpdate, 
  ReducerEvent, 
  SubscriptionCallback, 
  ReducerCallback,
  SpacetimeDBClient,
  LynxWebSocket,
  LynxHttpClient,
  LynxHttpResponse
} from 'spacetimedb-lynx';
