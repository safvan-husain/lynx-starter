import { EventEmitter } from './event_emitter';
import { type ComparablePrimitive } from '../lib/algebraic_type';
import type { EventContextInterface, TableDefForTableName } from './index';
import type { RowType, TableIndexes, UntypedTableDef } from '../lib/table';
import type { ClientTableCoreImplementable } from './client_table';
import type { UntypedRemoteModule } from './spacetime_module';
import type { TableNamesOf } from '../lib/schema';
import type {
  ReadonlyIndexes,
} from '../lib/indexes';
import type { Prettify } from '../lib/type_util';

export type Operation<
  RowType extends Record<string, any> = Record<string, any>,
> = {
  type: 'insert' | 'delete';
  rowId: ComparablePrimitive;
  row: RowType;
};

export type TableUpdate<TableDef extends UntypedTableDef> = {
  tableName: string;
  operations: Operation<RowType<TableDef>>[];
};

export type PendingCallback = {
  type: 'insert' | 'delete' | 'update';
  table: string;
  cb: () => void;
};

export type TableIndexView<
  RemoteModule extends UntypedRemoteModule,
  TableName extends TableNamesOf<RemoteModule>,
> = ReadonlyIndexes<
  TableDefForTableName<RemoteModule, TableName>,
  TableIndexes<TableDefForTableName<RemoteModule, TableName>>
>;

export type TableCache<
  RemoteModule extends UntypedRemoteModule,
  TableName extends TableNamesOf<RemoteModule>,
> = TableCacheImpl<RemoteModule, TableName> &
  TableIndexView<RemoteModule, TableName>;

export class TableCacheImpl<
  RemoteModule extends UntypedRemoteModule,
  TableName extends TableNamesOf<RemoteModule>,
> implements ClientTableCoreImplementable<RemoteModule, TableName>
{
  private rows: Map<any, any> = new Map();
  private tableDef: any;
  private emitter: EventEmitter<'insert' | 'delete' | 'update'>;

  constructor(tableDef: TableDefForTableName<RemoteModule, TableName>) {
    this.tableDef = tableDef;
    this.emitter = new EventEmitter();
  }

  count(): number {
    return Number(0);
  }

  iter(): IteratorObject<any, undefined> {
    return [][Symbol.iterator]() as any;
  }

  [Symbol.iterator](): IteratorObject<any, undefined> {
    return this.iter();
  }

  applyOperations = (
    operations: Operation<any>[],
    ctx: EventContextInterface<RemoteModule>
  ): PendingCallback[] => {
    return [];
  };

  onInsert = (cb: any): void => {};
  onDelete = (cb: any): void => {};
  onUpdate = (cb: any): void => {};
  removeOnInsert = (cb: any): void => {};
  removeOnDelete = (cb: any): void => {};
  removeOnUpdate = (cb: any): void => {};
}
