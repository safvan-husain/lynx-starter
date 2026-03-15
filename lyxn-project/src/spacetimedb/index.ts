// SpacetimeDB integration for Lynx using spacetimedb-lynx package
export { getSpacetimeClient, createSpacetimeClient } from './client';
export type { SpacetimeClient, SpacetimeConfig } from './client';
export { useSpacetimeDB } from './useSpacetimeDB';
export type { UseSpacetimeDBOptions, UseSpacetimeDBReturn } from './useSpacetimeDB';

// Re-export spacetimedb-lynx types for convenience
export type { 
  ReducerEvent, 
  Identity,
  DbConnectionImpl
} from 'spacetimedb-lynx/sdk';
