/**
 * Lynx WebSocket Adapter for SpacetimeDB
 */

import { base64ToBytes } from 'spacetimedb-lynx';

export interface LynxWebSocketAdapter {
  send(data: string | ArrayBuffer | Blob): void;
  close(code?: number, reason?: string): void;
  onopen: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  readyState: number;
  CONNECTING: number;
  OPEN: number;
  CLOSING: number;
  CLOSED: number;
}

// WebSocket ready states
const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

/**
 * Creates a WebSocket adapter that wraps Lynx's NativeModules.WebSocketModule
 */
class LynxWebSocketAdapterImpl implements LynxWebSocketAdapter {
  private url: string;
  private _readyState: number = CONNECTING;
  private messageHandler: ((message: string) => void) | null = null;
  private statusHandler: ((status: string) => void) | null = null;
  private decoder = new TextDecoder('utf-8');

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  readonly CONNECTING = CONNECTING;
  readonly OPEN = OPEN;
  readonly CLOSING = CLOSING;
  readonly CLOSED = CLOSED;

  constructor(url: string, _protocols?: string | string[]) {
    this.url = url;
    this._readyState = CONNECTING;
    this.initializeConnection();
  }

  get readyState(): number {
    return this._readyState;
  }

  private initializeConnection(): void {
    if (typeof NativeModules === 'undefined' || !NativeModules.WebSocketModule) {
      console.error('[LynxWebSocketAdapter] NativeModules.WebSocketModule not found!');
      this._readyState = CLOSED;
      setTimeout(() => {
        this.onerror?.(new ErrorEvent('error', { message: 'WebSocketModule not available' }));
        this.onclose?.(new CloseEvent('close', { code: 1006, reason: 'Module not available' }));
      }, 0);
      return;
    }

    this.messageHandler = (base64: string) => {
      if (this._readyState === OPEN) {
        // Native bridge forwards base64 strings; decode to UTF-8 text for this polyfill.
        const bytes = base64ToBytes(base64);
        const text = this.decoder.decode(bytes);
        const event = new MessageEvent('message', { data: text });
        this.onmessage?.(event);
      }
    };

    this.statusHandler = (status: string) => {
      console.log('[LynxWebSocketAdapter] Status:', status);

      if (status === 'connected') {
        this._readyState = OPEN;
        const event = new Event('open');
        this.onopen?.(event);
      } else if (status === 'disconnected') {
        this._readyState = CLOSED;
        const event = new CloseEvent('close', { code: 1000, reason: 'Disconnected' });
        this.onclose?.(event);
      } else if (status.indexOf('error:') === 0) {
        this._readyState = CLOSED;
        const errorMessage = status.substring(6);
        const event = new ErrorEvent('error', { message: errorMessage });
        this.onerror?.(event);
        const closeEvent = new CloseEvent('close', { code: 1006, reason: errorMessage });
        this.onclose?.(closeEvent);
      }
    };

    if (NativeModules.WebSocketModule.connectWithMessageHandler) {
      NativeModules.WebSocketModule.connectWithMessageHandler(
        this.url,
        '',
        null,
        this.statusHandler,
        this.messageHandler
      );
    } else {
      NativeModules.WebSocketModule.connect(this.url, this.statusHandler);
    }
  }

  send(data: string | ArrayBuffer | Blob): void {
    if (this._readyState !== OPEN) {
      console.error('[LynxWebSocketAdapter] Cannot send - WebSocket not open');
      return;
    }

    let message: string;
    if (typeof data === 'string') {
      message = data;
    } else if (data instanceof ArrayBuffer) {
      const uint8Array = new Uint8Array(data);
      // More compatible way to convert Uint8Array to string
      let s = '';
      for (let i = 0; i < uint8Array.length; i++) {
        s += String.fromCharCode(uint8Array[i]);
      }
      message = s;
    } else {
      console.error('[LynxWebSocketAdapter] Unsupported data type:', typeof data);
      return;
    }

    if (NativeModules.WebSocketModule.sendMessageAsync) {
      NativeModules.WebSocketModule.sendMessageAsync(message);
    } else {
      NativeModules.WebSocketModule.sendMessage(message, (_response: string) => {});
    }
  }

  close(code?: number, reason?: string): void {
    if (this._readyState === CLOSING || this._readyState === CLOSED) {
      return;
    }

    this._readyState = CLOSING;

    if (typeof NativeModules !== 'undefined' && NativeModules.WebSocketModule) {
      NativeModules.WebSocketModule.disconnect();
    }

    this._readyState = CLOSED;
    const event = new CloseEvent('close', {
      code: code ?? 1000,
      reason: reason ?? 'User initiated',
    });
    this.onclose?.(event);
  }
}

export function createLynxWebSocketAdapter(
  url: string,
  protocols?: string | string[]
): LynxWebSocketAdapter {
  return new LynxWebSocketAdapterImpl(url, protocols);
}

export default {
  createLynxWebSocketAdapter,
};
