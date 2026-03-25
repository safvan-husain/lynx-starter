import type { TableNamesOf, UntypedSchemaDef } from '../lib/schema';
import type { UntypedTableDef } from '../lib/table';
import type { Values } from '../lib/type_util';
import type { UntypedRemoteModule } from './spacetime_module';
import { type TableCache } from './table_cache';

type TableName<SchemaDef> = [SchemaDef] extends [UntypedSchemaDef]
  ? TableNamesOf<SchemaDef>
  : string;

export type TableDefForTableName<
  SchemaDef extends UntypedSchemaDef,
  N extends TableName<SchemaDef>,
> = [SchemaDef] extends [UntypedSchemaDef]
  ? Values<SchemaDef['tables']> & { accessorName: N }
  : UntypedTableDef & { accessorName: N };

type TableCacheForTableName<
  RemoteModule extends UntypedRemoteModule,
  TableName extends TableNamesOf<RemoteModule>,
> = TableCache<RemoteModule, TableName>;

class TableMap<RemoteModule extends UntypedRemoteModule> {
  private readonly map: Map<
    string,
    TableCacheForTableName<RemoteModule, TableName<RemoteModule>>
  > = new Map();

  get<K extends TableName<RemoteModule>>(
    key: K
  ): TableCacheForTableName<RemoteModule, K> | undefined {
    return undefined; // Stubbed
  }

  set<K extends TableName<RemoteModule>>(
    key: K,
    value: TableCacheForTableName<RemoteModule, K>
  ): this {
    return this; // Stubbed
  }

  has(key: TableName<RemoteModule>): boolean {
    return false; // Stubbed
  }

  delete(key: TableName<RemoteModule>): boolean {
    return false; // Stubbed
  }

  keys(): IterableIterator<string> {
    return (new Map<string, any>()).keys(); // Stubbed
  }
  values(): IterableIterator<
    TableCacheForTableName<RemoteModule, TableName<RemoteModule>>
  > {
    return (new Map<string, any>()).values(); // Stubbed
  }
  entries(): IterableIterator<
    [string, TableCacheForTableName<RemoteModule, TableName<RemoteModule>>]
  > {
    return (new Map<string, any>()).entries(); // Stubbed
  }
  [Symbol.iterator]() {
    return this.entries();
  }
}

export class ClientCache<RemoteModule extends UntypedRemoteModule> {
  readonly tables = new TableMap<RemoteModule>();

  getTable<N extends TableName<RemoteModule>>(
    name: N
  ): TableCacheForTableName<RemoteModule, N> {
    throw new Error(`Stubbed cache for ${String(name)}`);
  }

  getOrCreateTable<N extends TableName<RemoteModule>>(
    tableDef: TableDefForTableName<RemoteModule, N>
  ): TableCacheForTableName<RemoteModule, N> {
    return {} as any; // Stubbed
  }
}

