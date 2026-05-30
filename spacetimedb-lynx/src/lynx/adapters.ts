/**
 * Lynx adapters for SpacetimeDB Lynx client.
 *
 * Bridges spacetimedb-lynx transport interfaces with Lynx native modules.
 */

import { fromByteArray, toByteArray } from 'base64-js';
import type { FetchFn, WebsocketAdapter } from '../sdk/websocket_decompress_adapter';
import { stdbLogger } from '../sdk/logger';

declare const lynx:
  | {
      getJSModule?: (name: string) => LynxGlobalEventEmitter | undefined;
      GlobalEventEmitter?: LynxGlobalEventEmitter;
    }
  | undefined;

type NativeHttpResponse = {
  status?: number;
  data?: string;
  error?: string;
};

type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer | Uint8Array;
};

type LynxGlobalEventEmitter = {
  addListener?: (
    eventName: string,
    listener: (event: unknown) => void,
    context?: object,
  ) => void;
  removeListener?: (
    eventName: string,
    listener: (event: unknown) => void,
  ) => void;
};

type NativeWebSocketStatusEvent = {
  id?: number;
  status?: string;
};

type NativeWebSocketMessageEvent = {
  data?: string;
  id?: number;
};

const MESSAGE_EVENT_NAME = 'spacetimedbWebSocketMessage';
const STATUS_EVENT_NAME = 'spacetimedbWebSocketStatus';

let nextSocketId = 1;

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.searchParams.has('token')) {
      url.searchParams.set('token', '[redacted]');
    }
    return url.toString();
  } catch {
    return value.replace(/([?&]token=)[^&]+/i, '$1[redacted]');
  }
}

function bytesToBinaryString(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let output = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    output += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }

  return output;
}

function normalizeNativeBody(body: FetchOptions['body']): string | undefined {
  if (typeof body === 'string') {
    return body;
  }
  if (body instanceof Uint8Array) {
    return bytesToBinaryString(body);
  }
  if (body instanceof ArrayBuffer) {
    return bytesToBinaryString(new Uint8Array(body));
  }
  return undefined;
}

function normalizeXhrBody(
  body: FetchOptions['body'],
): XMLHttpRequestBodyInit | undefined {
  if (body instanceof Uint8Array) {
    return body.buffer.slice(
      body.byteOffset,
      body.byteOffset + body.byteLength,
    ) as ArrayBuffer;
  }
  return body;
}

function getGlobalEventEmitter(): LynxGlobalEventEmitter | null {
  const globalLynx =
    typeof lynx !== 'undefined'
      ? lynx
      : (globalThis as unknown as {
          lynx?:
            | {
                getJSModule?: (
                  name: string,
                ) => LynxGlobalEventEmitter | undefined;
                GlobalEventEmitter?: LynxGlobalEventEmitter;
              }
            | undefined;
        }).lynx;

  return (
    globalLynx?.getJSModule?.('GlobalEventEmitter') ??
    globalLynx?.GlobalEventEmitter ??
    null
  );
}

/**
 * Lynx WebSocket adapter using Lynx's WebSocketModule.
 */
export class LynxWebSocketAdapter implements WebsocketAdapter {
  private url: string;
  private protocol?: string;
  private socketId = nextSocketId++;
  private eventEmitter: LynxGlobalEventEmitter | null = null;
  private _isConnected = false;
  private _isClosed = false;
  private _pendingSends: Uint8Array[] = [];

  private _onopen: () => void = () => {};
  private _onmessage: (msg: { data: Uint8Array }) => void = () => {};
  private _onclose: (
    ev: CloseEvent | { code: number; reason: string },
  ) => void = () => {};
  private _onerror: (ev: Error | ErrorEvent) => void = () => {};

  set onopen(handler: () => void) {
    this._onopen = handler;
    if (this._isConnected) {
      setTimeout(() => handler(), 0);
    }
  }
  set onmessage(handler: (msg: { data: Uint8Array }) => void) {
    this._onmessage = handler;
  }
  set onclose(handler: (
    ev: CloseEvent | { code: number; reason: string },
  ) => void) {
    this._onclose = handler;
  }
  set onerror(handler: (ev: Error | ErrorEvent) => void) {
    this._onerror = handler;
  }

  constructor(url: string, protocol?: string) {
    this.url = url;
    this.protocol = protocol;
    stdbLogger('info', '[LynxWebSocketAdapter] Constructed', {
      url: redactUrl(url),
      protocol: protocol ?? null,
      socketId: this.socketId,
    });
    this.initializeConnection();
  }

  private handleNativeStatus(status: string): void {
    stdbLogger('info', '[LynxWebSocketAdapter] Native status', {
      status,
      socketId: this.socketId,
      url: redactUrl(this.url),
    });

    if (status === 'connected') {
      if (this._isConnected) {
        return;
      }

      this._isClosed = false;
      this._isConnected = true;
      this._onopen?.();
      this.flushPendingSends();
    } else if (status === 'disconnected') {
      this.emitClose(1000, 'Disconnected');
    } else if (status.indexOf('error:') === 0) {
      const errorMessage = status.substring(6);
      this._onerror?.(new Error(errorMessage));
      this.emitClose(1006, errorMessage);
    } else if (status.indexOf('warn:') === 0) {
      stdbLogger('warn', '[LynxWebSocketAdapter] Native warning', {
        status,
        socketId: this.socketId,
      });
    }
  }

  private handleNativeMessageBase64(base64: string): void {
    if (!this._isConnected) {
      return;
    }

    try {
      stdbLogger('debug', '[LynxWebSocketAdapter] Native message', {
        base64Length: base64.length,
        socketId: this.socketId,
      });
      const binary = toByteArray(base64);
      this._onmessage({ data: binary });
    } catch (e) {
      stdbLogger(
        'error',
        '[LynxWebSocketAdapter] Failed to decode base64 message',
        e,
      );
      this._onerror?.(
        e instanceof Error ? e : new Error('Failed to decode message'),
      );
    }
  }

  private handleGlobalStatusEvent = (event: unknown): void => {
    const nativeEvent = event as NativeWebSocketStatusEvent;
    if (nativeEvent?.id !== this.socketId || typeof nativeEvent.status !== 'string') {
      return;
    }

    this.handleNativeStatus(nativeEvent.status);
  };

  private handleGlobalMessageEvent = (event: unknown): void => {
    const nativeEvent = event as NativeWebSocketMessageEvent;
    if (nativeEvent?.id !== this.socketId || typeof nativeEvent.data !== 'string') {
      return;
    }

    this.handleNativeMessageBase64(nativeEvent.data);
  };

  private registerEventListeners(): boolean {
    const eventEmitter = getGlobalEventEmitter();
    if (
      !eventEmitter?.addListener ||
      !eventEmitter?.removeListener ||
      typeof NativeModules.WebSocketModule?.connectWithEvents !== 'function'
    ) {
      return false;
    }

    this.eventEmitter = eventEmitter;
    eventEmitter.addListener(STATUS_EVENT_NAME, this.handleGlobalStatusEvent);
    eventEmitter.addListener(MESSAGE_EVENT_NAME, this.handleGlobalMessageEvent);
    return true;
  }

  private unregisterEventListeners(): void {
    if (!this.eventEmitter?.removeListener) {
      return;
    }

    this.eventEmitter.removeListener(
      STATUS_EVENT_NAME,
      this.handleGlobalStatusEvent,
    );
    this.eventEmitter.removeListener(
      MESSAGE_EVENT_NAME,
      this.handleGlobalMessageEvent,
    );
    this.eventEmitter = null;
  }

  private flushPendingSends(): void {
    if (
      !this._isConnected ||
      typeof NativeModules === 'undefined' ||
      !NativeModules.WebSocketModule
    ) {
      return;
    }

    const pending = this._pendingSends.splice(0);
    for (const data of pending) {
      this.send(data);
    }
  }

  private emitClose(code: number, reason: string): void {
    if (this._isClosed) {
      return;
    }

    this._isClosed = true;
    this._isConnected = false;
    this._pendingSends = [];
    this.unregisterEventListeners();
    this._onclose?.({ code, reason });
  }

  private initializeConnection(): void {
    if (
      typeof NativeModules === 'undefined' ||
      !NativeModules.WebSocketModule
    ) {
      setTimeout(() => {
        this._onerror?.(new Error('WebSocketModule not available'));
        this.emitClose(1006, 'WebSocketModule not available');
      }, 0);
      return;
    }

    const statusHandler = (status: string) => {
      this.handleNativeStatus(status);
    };

    const messageHandlerBase64 = (base64: string) => {
      this.handleNativeMessageBase64(base64);
    };

    try {
      const supportsPersistentEvents = this.registerEventListeners();
      if (supportsPersistentEvents) {
        NativeModules.WebSocketModule.connectWithEvents!(
          this.url,
          this.protocol || 'v2.bsatn.spacetimedb',
          '',
          this.socketId,
        );
      } else {
        NativeModules.WebSocketModule.connectWithMessageHandler(
          this.url,
          this.protocol || 'v2.bsatn.spacetimedb',
          '',
          statusHandler,
          messageHandlerBase64,
        );
      }
    } catch (error) {
      const transportError =
        error instanceof Error
          ? error
          : new Error('Failed to start native WebSocket connection');
      this._onerror?.(transportError);
      this.emitClose(1006, transportError.message);
    }
  }

  send(data: Uint8Array): void {
    if (!this._isConnected) {
      this._pendingSends.push(data.slice());
      stdbLogger('warn', '[LynxWebSocketAdapter] Queuing send before open', {
        byteLength: data.byteLength,
        queued: this._pendingSends.length,
      });
      return;
    }
    stdbLogger('debug', '[LynxWebSocketAdapter] Sending binary message', {
      byteLength: data.byteLength,
    });
    const base64 = fromByteArray(data);
    NativeModules.WebSocketModule!.sendBinary(base64);
  }

  close(): void {
    stdbLogger('info', '[LynxWebSocketAdapter] Closing', {
      url: redactUrl(this.url),
    });
    if (typeof NativeModules !== 'undefined' && NativeModules.WebSocketModule) {
      NativeModules.WebSocketModule.disconnect();
    }
    this.emitClose(1000, 'Closed by client');
  }
}

class LynxHttpResponseAdapter {
  public readonly ok: boolean;
  public readonly status: number;
  public readonly statusText: string;
  private readonly responseData: string;

  constructor(status: number, data: string) {
    this.status = status;
    this.statusText = status === 200 ? 'OK' : 'Error';
    this.ok = status >= 200 && status < 300;
    this.responseData = data;
  }

  async json(): Promise<unknown> {
    return JSON.parse(this.responseData);
  }

  async text(): Promise<string> {
    return this.responseData;
  }
}

/**
 * Lynx HTTP client adapter using HttpModule or XMLHttpRequest fallback.
 */
export const lynxFetch: FetchFn = async (
  url: string,
  options?: FetchOptions,
): Promise<unknown> => {
  const method = options?.method || 'GET';
  const headers = options?.headers || {};
  const body = options?.body;
  const nativeBody = normalizeNativeBody(body);

  return new Promise((resolve, reject) => {
    stdbLogger('info', '[lynxFetch] Request', { method, url });
    if (typeof NativeModules !== 'undefined' && NativeModules.HttpModule) {
      const requestConfig = {
        url,
        method,
        headers,
        body: nativeBody,
      };

      NativeModules.HttpModule.request(
        requestConfig,
        (response: NativeHttpResponse) => {
          stdbLogger(
            response.error ? 'error' : 'info',
            '[lynxFetch] Response',
            {
              status: response.status,
              error: response.error ?? null,
              url,
            },
          );
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          resolve(
            new LynxHttpResponseAdapter(
              response.status || 200,
              response.data || '',
            ),
          );
        },
      );
    } else {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string);
        });
        xhr.onload = () => {
          stdbLogger('info', '[lynxFetch] XMLHttpRequest response', {
            status: xhr.status,
            url,
          });
          resolve(new LynxHttpResponseAdapter(xhr.status, xhr.responseText));
        };
        xhr.onerror = () => {
          stdbLogger('error', '[lynxFetch] XMLHttpRequest network error', {
            status: xhr.status,
            url,
          });
          reject(new Error(`Network error: ${xhr.status}`));
        };
        xhr.send(normalizeXhrBody(body));
      } catch (error) {
        reject(error);
      }
    }
  });
};
