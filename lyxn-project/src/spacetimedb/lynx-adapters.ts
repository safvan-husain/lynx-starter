/**
 * Lynx adapters for SpacetimeDB Lynx client
 * 
 * These adapters bridge the spacetimedb-lynx interfaces with Lynx's native modules.
 */

import { type WebsocketAdapter, type FetchFn } from 'spacetimedb-lynx/sdk';
import { toByteArray, fromByteArray } from 'base64-js';

/**
 * Lynx WebSocket Adapter
 * 
 * Implements the LynxWebSocket interface using Lynx's WebSocketModule
 */
export class LynxWebSocketAdapter implements WebsocketAdapter {
  private url: string;
  private protocol?: string;
  private _isConnected = false;

  private _onopen: () => void = () => {};
  private _onmessage: (msg: { data: Uint8Array }) => void = () => {};
  private _onclose: (ev: any) => void = () => {};
  private _onerror: (ev: any) => void = () => {};

  set onopen(handler: () => void) { this._onopen = handler; }
  set onmessage(handler: (msg: { data: Uint8Array }) => void) { this._onmessage = handler; }
  set onclose(handler: (ev: any) => void) { this._onclose = handler; }
  set onerror(handler: (ev: any) => void) { this._onerror = handler; }

  constructor(url: string, protocol?: string) {
    this.url = url;
    this.protocol = protocol;
    this.initializeConnection();
  }

  private initializeConnection(): void {
    if (typeof NativeModules === 'undefined' || !NativeModules.WebSocketModule) {
      setTimeout(() => {
        this._onerror?.(new Error('WebSocketModule not available'));
      }, 0);
      return;
    }

    const statusHandler = (status: string) => {
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
          const binary = toByteArray(base64);
          this._onmessage({ data: binary });
        } catch (e) {
          console.error('[LynxWebSocketAdapter] Failed to decode base64 message', e);
        }
      }
    };

    NativeModules.WebSocketModule.connectWithMessageHandler(
      this.url,
      this.protocol || 'v2.bsatn.spacetimedb',
      null,
      statusHandler,
      messageHandlerBase64
    );
  }

  send(data: Uint8Array): void {
    if (!this._isConnected) return;
    const base64 = fromByteArray(data);
    NativeModules.WebSocketModule.sendBinary(base64);
  }

  close(): void {
    if (typeof NativeModules !== 'undefined' && NativeModules.WebSocketModule) {
      NativeModules.WebSocketModule.disconnect();
    }
    this._isConnected = false;
  }
}

/**
 * Lynx HTTP Response Adapter
 */
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

  async json(): Promise<any> {
    return JSON.parse(this.responseData);
  }

  async text(): Promise<string> {
    return this.responseData;
  }
}

/**
 * Lynx HTTP Client Adapter
 * 
 * Implements the LynxHttpClient interface using Lynx's HttpModule or XMLHttpRequest fallback
 */
export const lynxFetch: FetchFn = async (url: string, options?: any): Promise<any> => {
  const method = options?.method || 'GET';
  const headers = options?.headers || {};
  const body = options?.body;

  return new Promise((resolve, reject) => {
    if (typeof NativeModules !== 'undefined' && NativeModules.HttpModule) {
      const requestConfig = {
        url,
        method,
        headers,
        body,
      };

      NativeModules.HttpModule.request(requestConfig, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(new LynxHttpResponseAdapter(response.status || 200, response.data || ''));
      });
    } else {
      // Fallback
      try {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string);
        });
        xhr.onload = () => {
          resolve(new LynxHttpResponseAdapter(xhr.status, xhr.responseText));
        };
        xhr.onerror = () => {
          reject(new Error(`Network error: ${xhr.status}`));
        };
        xhr.send(body);
      } catch (error) {
        reject(error);
      }
    }
  });
};

// No wrapper needed, we export the adapter class directly for use as a constructor
