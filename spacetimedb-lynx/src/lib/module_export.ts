/**
 * Symbol and type used by reducer/procedure export types.
 * (Runtime implementation lives on server; client only needs the type.)
 */
export const registerExport = Symbol('SpacetimeDB.registerExport');
export const exportContext = Symbol('SpacetimeDB.exportContext');

export interface ModuleExport {
  [registerExport](ctx: unknown, exportName: string): void;
  [exportContext]?: unknown;
}
