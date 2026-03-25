import { StdbUrl } from '../lib/url';
import { ConnectionId } from '../lib/connection_id';
// @ts-ignore
import { ProductBuilder, type InferTypeOfRow } from '../lib/type_builders';
import { 
  AlgebraicType, 
  ProductType, 
  type ComparablePrimitive,
  // @ts-ignore
  type Serializer,
  // @ts-ignore
  type Deserializer 
} from '../lib/algebraic_type';
import BinaryReader from '../lib/binary_reader';
import BinaryWriter from '../lib/binary_writer';
import {
  // @ts-ignore
  BsatnRowList,
  ClientMessage,
  // @ts-ignore
  QueryRows,
  // @ts-ignore
  QuerySetUpdate,
  ServerMessage,
  // @ts-ignore
  TableUpdateRows,
  UnsubscribeFlags,
} from './client_api/types';
import { type FetchFn } from './websocket_decompress_adapter';
import { ClientCache } from './client_cache';
import { DbConnectionBuilder } from './db_connection_builder';
import { INTERNAL_REMOTE_MODULE } from './internal';
import { type DbContext } from './db_context';
import type { Event } from './event';
import {
  type ErrorContextInterface,
  type EventContextInterface,
  type ReducerEventContextInterface,
  type SubscriptionEventContextInterface,
} from './event_context';
import { EventEmitter } from './event_emitter';
import { Identity } from '../lib/identity';
import type {
  ProcedureResultMessage,
  ReducerResultMessage,
} from './message_types';
import type { ReducerEvent } from './reducer_event';
import { type UntypedRemoteModule } from './spacetime_module';
import { makeQueryBuilder } from '../lib/query';
import {
  type TableCache,
  type Operation,
  type PendingCallback,
  // @ts-ignore
  type TableUpdate as CacheTableUpdate,
} from './table_cache';
import {
  WebsocketDecompressAdapter,
  type WebsocketAdapter,
} from './websocket_decompress_adapter';
import {
  SubscriptionBuilderImpl,
  SubscriptionHandleImpl,
  SubscriptionManager,
  type SubscribeEvent,
} from './subscription_builder_impl';
// @ts-ignore
import { stdbLogger, stringify } from './logger';
// @ts-ignore
// import { fromByteArray } from 'base64-js';
import type {
  ReducerEventInfo,
  ReducersView,
  SubscriptionEventCallback,
} from './reducers';
import type { ClientDbView } from './db_view';
import type { RowType, UntypedTableDef } from '../lib/table';
import type { ProceduresView } from './procedures';
import type { Values } from '../lib/type_util';
import type { TransactionUpdate } from './client_api/types';
// @ts-ignore
import { InternalError, SenderError } from '../lib/errors';

export {
  DbConnectionBuilder,
  SubscriptionBuilderImpl,
  SubscriptionHandleImpl,
  type TableCache,
  type Event,
};

export type RemoteModuleOf<C> =
  C extends DbConnectionImpl<infer RM> ? RM : never;

export type {
  DbContext,
  EventContextInterface,
  ReducerEventContextInterface,
  SubscriptionEventContextInterface,
  ErrorContextInterface,
  ReducerEvent,
};

export type ConnectionEvent = 'connect' | 'disconnect' | 'connectError';

export type DbConnectionConfig<RemoteModule extends UntypedRemoteModule> = {
  uri: StdbUrl;
  nameOrAddress: string;
  identity?: Identity;
  token?: string;
  emitter: EventEmitter<ConnectionEvent>;
  createWSFn: typeof WebsocketDecompressAdapter.createWebSocketFn;
  WS: any;
  fetchFn: FetchFn;
  compression: 'gzip' | 'none';
  lightMode: boolean;
  confirmedReads?: boolean;
  remoteModule: RemoteModule;
};

type ProcedureCallback = (result: ProcedureResultMessage['result']) => void;

export class DbConnectionImpl<RemoteModule extends UntypedRemoteModule>
  implements DbContext<RemoteModule>
{
  isActive = false;
  identity?: Identity = undefined;
  token?: string = undefined;

  /** @internal */
  [INTERNAL_REMOTE_MODULE](): RemoteModule {
    return this.#remoteModule;
  }

  db: ClientDbView<RemoteModule>;
  reducers: ReducersView<RemoteModule>;
  procedures: ProceduresView<RemoteModule>;
  connectionId: ConnectionId = ConnectionId.random();

  #queryId = 0;
  #requestId = 0;
  #eventId = 0;
  #emitter: EventEmitter<ConnectionEvent>;
  #messageQueue = Promise.resolve();
  #outboundQueue: Uint8Array[] = [];
  #subscriptionManager = new SubscriptionManager<RemoteModule>();
  #remoteModule: RemoteModule;
  #reducerCallbacks = new Map<
    number,
    (result: ReducerResultMessage['result']) => void
  >();
  #reducerCallInfo = new Map<number, { name: string; args: object }>();
  #procedureCallbacks = new Map<number, ProcedureCallback>();
  #rowDeserializers: Record<string, any> = {};
  #reducerArgsSerializers: Record<string, any> = {};
  #procedureSerializers: Record<string, any> = {};
  #sourceNameToTableDef: Record<string, any> = {};

  private clientCache: ClientCache<RemoteModule>;
  private ws?: WebsocketAdapter;
  private wsPromise: Promise<WebsocketAdapter | undefined>;

  constructor({
    uri,
    nameOrAddress,
    identity,
    token,
    emitter,
    remoteModule,
    createWSFn,
    compression,
    lightMode,
    confirmedReads,
    WS,
    fetchFn,
  }: DbConnectionConfig<RemoteModule>) {
    this.identity = identity;
    this.token = token;
    this.#remoteModule = remoteModule;
    this.#emitter = emitter;
    this.clientCache = new ClientCache<RemoteModule>();
    this.db = this.#makeDbView();
    this.reducers = this.#makeReducers(remoteModule);
    this.procedures = this.#makeProcedures(remoteModule);
    this.wsPromise = Promise.resolve(undefined); // Stubbed
  }

  #getNextQueryId = () => 0;
  #getNextRequestId = () => 0;

  #makeDbView(): ClientDbView<RemoteModule> {
    return {} as any; // Stubbed
  }

  #makeReducers(def: RemoteModule): ReducersView<RemoteModule> {
    return {} as any; // Stubbed
  }

  #makeProcedures(def: RemoteModule): ProceduresView<RemoteModule> {
    return {} as any; // Stubbed
  }

  #makeEventContext(event: Event<any>): EventContextInterface<RemoteModule> {
    return {
      db: this.db,
      reducers: this.reducers,
      isActive: this.isActive,
      subscriptionBuilder: this.subscriptionBuilder.bind(this),
      disconnect: this.disconnect.bind(this),
      event,
    };
  }

  subscriptionBuilder = (): SubscriptionBuilderImpl<RemoteModule> => {
    return new SubscriptionBuilderImpl(this);
  };

  getTablesMap(): any {
    return makeQueryBuilder({ tables: this.#remoteModule.tables } as any);
  }

  registerSubscription(
    handle: SubscriptionHandleImpl<RemoteModule>,
    handleEmitter: EventEmitter<
      SubscribeEvent,
      SubscriptionEventCallback<RemoteModule>
    >,
    querySql: string[]
  ): number {
    return 0; // Stubbed
  }

  unregisterSubscription(querySetId: number): void {
    // Stubbed
  }

  #parseRowList(
    type: 'insert' | 'delete',
    tableName: string,
    rowList: any
  ): Operation[] {
    return []; // Stubbed
  }

  #mergeTableUpdates(updates: any[]): any[] {
    return []; // Stubbed
  }

  #queryRowsToTableUpdates(rows: any, opType: any): any[] {
    return []; // Stubbed
  }

  #tableUpdateRowsToOperations(tableName: string, rows: any): Operation[] {
    return []; // Stubbed
  }

  #querySetUpdateToTableUpdates(querySetUpdate: any): any[] {
    return []; // Stubbed
  }

  #flushOutboundQueue(wsResolved: WebsocketAdapter): void {
    // Stubbed
  }

  #clientMessageEncoder = new BinaryWriter(1024);
  #sendMessage(message: ClientMessage): void {
    // Stubbed
  }

  #nextEventId(): string {
    return ""; // Stubbed
  }

  #handleOnOpen(): void {
    // Stubbed
  }

  #applyTableUpdates(tableUpdates: any[], eventContext: any): any[] {
    return []; // Stubbed
  }

  #applyTransactionUpdates(eventContext: any, tu: any): any[] {
    return []; // Stubbed
  }

  async #processMessage(data: Uint8Array): Promise<void> {
    // Stubbed
  }

  #handleOnMessage(wsMessage: { data: Uint8Array }): void {
    // Stubbed
  }

  callReducer(
    reducerName: string,
    argsBuffer: Uint8Array,
    reducerArgs?: object
  ): Promise<void> {
    return Promise.resolve(); // Stubbed
  }

  callReducerWithParams(
    reducerName: string,
    _paramsType: ProductType,
    params: object
  ): Promise<void> {
    return Promise.resolve(); // Stubbed
  }

  callProcedure(
    procedureName: string,
    argsBuffer: Uint8Array
  ): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array(0)); // Stubbed
  }

  callProcedureWithParams(
    procedureName: string,
    _paramsType: ProductType,
    params: object,
    _returnType: AlgebraicType
  ): Promise<any> {
    return Promise.resolve({}); // Stubbed
  }

  disconnect(): void {
    // Stubbed
  }

  private on(
    eventName: ConnectionEvent,
    callback: (ctx: DbConnectionImpl<RemoteModule>, ...args: any[]) => void
  ): void {
    this.#emitter.on(eventName, callback);
  }

  private off(
    eventName: ConnectionEvent,
    callback: (ctx: DbConnectionImpl<RemoteModule>, ...args: any[]) => void
  ): void {
    this.#emitter.off(eventName, callback);
  }

  private onConnect(
    callback: (ctx: DbConnectionImpl<RemoteModule>, ...args: any[]) => void
  ): void {
    this.#emitter.on('connect', callback);
  }

  private onDisconnect(
    callback: (ctx: DbConnectionImpl<RemoteModule>, ...args: any[]) => void
  ): void {
    this.#emitter.on('disconnect', callback);
  }

  private onConnectError(
    callback: (ctx: DbConnectionImpl<RemoteModule>, ...args: any[]) => void
  ): void {
    this.#emitter.on('connectError', callback);
  }

  removeOnConnect(
    callback: (ctx: DbConnectionImpl<RemoteModule>, ...args: any[]) => void
  ): void {
    this.#emitter.off('connect', callback);
  }

  removeOnDisconnect(
    callback: (ctx: DbConnectionImpl<RemoteModule>, ...args: any[]) => void
  ): void {
    this.#emitter.off('disconnect', callback);
  }

  removeOnConnectError(
    callback: (ctx: DbConnectionImpl<RemoteModule>, ...args: any[]) => void
  ): void {
    this.#emitter.off('connectError', callback);
  }
}

