/**
 * Lynx adapters for SpacetimeDB Lynx client.
 *
 * Bridges spacetimedb-lynx transport interfaces with Lynx native modules.
 */

import { fromByteArray, toByteArray } from 'base64-js';
import type { FetchFn, WebsocketAdapter } from '../sdk/websocket_decompress_adapter';
import { stdbLogger } from '../sdk/logger';

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

function normalizeNativeBody(body: FetchOptions['body']): string | undefined {
  if (typeof body === 'string') {
    return body;
  }
  if (body instanceof Uint8Array) {
    return String.fromCharCode(...body);
  }
  if (body instanceof ArrayBuffer) {
    return String.fromCharCode(...new Uint8Array(body));
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

/**
 * Lynx WebSocket adapter using Lynx's WebSocketModule.
 */
export class LynxWebSocketAdapter implements WebsocketAdapter {
  private url: string;
  private protocol?: string;
  private _isConnected = false;

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
      url,
      protocol: protocol ?? null,
    });
    this.initializeConnection();
  }

  private initializeConnection(): void {
    if (
      typeof NativeModules === 'undefined' ||
      !NativeModules.WebSocketModule
    ) {
      setTimeout(() => {
        this._onerror?.(new Error('WebSocketModule not available'));
      }, 0);
      return;
    }

    const statusHandler = (status: string) => {
      stdbLogger('info', '[LynxWebSocketAdapter] Native status', {
        status,
        url: this.url,
      });
      if (status === 'connected') {
        this._isConnected = true;
        this._onopen?.();
      } else if (status === 'disconnected') {
        this._isConnected = false;
        this._onclose?.({ code: 1000, reason: 'Disconnected' });
      } else if (status.indexOf('error:') === 0) {
        this._isConnected = false;
        const errorMessage = status.substring(6);
        this._onerror?.(new Error(errorMessage));
      }
    };

    const messageHandlerBase64 = (base64: string) => {
      if (this._isConnected) {
        try {
          stdbLogger('debug', '[LynxWebSocketAdapter] Native message', {
            base64Length: base64.length,
          });
          const binary = toByteArray(base64);
          this._onmessage({ data: binary });
        } catch (e) {
          stdbLogger(
            'error',
            '[LynxWebSocketAdapter] Failed to decode base64 message',
            e,
          );
        }
      }
    };

    NativeModules.WebSocketModule.connectWithMessageHandler(
      this.url,
      this.protocol || 'v2.bsatn.spacetimedb',
      '',
      statusHandler,
      messageHandlerBase64,
    );
  }

  send(data: Uint8Array): void {
    if (!this._isConnected) {
      stdbLogger('warn', '[LynxWebSocketAdapter] Dropping send before open', {
        byteLength: data.byteLength,
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
    stdbLogger('info', '[LynxWebSocketAdapter] Closing', { url: this.url });
    if (typeof NativeModules !== 'undefined' && NativeModules.WebSocketModule) {
      NativeModules.WebSocketModule.disconnect();
    }
    this._isConnected = false;
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
