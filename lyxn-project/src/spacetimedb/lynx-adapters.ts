/**
 * Lynx adapters for SpacetimeDB Lynx client
 * 
 * These adapters bridge the spacetimedb-lynx interfaces with Lynx's native modules.
 */

import type { LynxWebSocket, LynxHttpClient, LynxHttpResponse } from 'spacetimedb-lynx';

/**
 * Lynx WebSocket Adapter
 * 
 * Implements the LynxWebSocket interface using Lynx's WebSocketModule
 */
class LynxWebSocketAdapter implements LynxWebSocket {
  private url: string;
  private protocol?: string;
  private _isConnected = false;

  onopen?: () => void;
  onmessage?: (event: { data: Uint8Array }) => void;
  onclose?: (event: { code: number; reason: string }) => void;
  onerror?: (error: any) => void;

  constructor(url: string, protocol?: string) {
    console.log('[LynxWebSocketAdapter] Constructor called with URL:', url);
    console.log('[LynxWebSocketAdapter] Protocol:', protocol);
    
    this.url = url;
    this.protocol = protocol;
    this.initializeConnection();
  }

  private initializeConnection(): void {
    if (typeof NativeModules === 'undefined' || !NativeModules.WebSocketModule) {
      console.error('[LynxWebSocketAdapter] NativeModules.WebSocketModule not found!');
      setTimeout(() => {
        this.onerror?.('WebSocketModule not available');
        this.onclose?.({ code: 1006, reason: 'Module not available' });
      }, 0);
      return;
    }

    const statusHandler = (status: string) => {
      console.log('[LynxWebSocketAdapter] Status:', status);

      if (status === 'connected') {
        this._isConnected = true;
        this.onopen?.();
      } else if (status === 'disconnected') {
        this._isConnected = false;
        this.onclose?.({ code: 1000, reason: 'Disconnected' });
      } else if (status.indexOf('error:') === 0) {
        this._isConnected = false;
        const errorMessage = status.substring(6);
        this.onerror?.(errorMessage);
        this.onclose?.({ code: 1006, reason: errorMessage });
      }
    };

    const messageHandler = (message: string) => {
      if (this._isConnected && this.onmessage) {
        // Convert string message to Uint8Array
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        this.onmessage({ data });
      }
    };

    // Ensure we have a WebSocket URL for the native module
    let wsUrl = this.url;
    if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
      console.log('[LynxWebSocketAdapter] Converted HTTPS to WSS:', wsUrl);
    } else if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://');
      console.log('[LynxWebSocketAdapter] Converted HTTP to WS:', wsUrl);
    }
    
    console.log('[LynxWebSocketAdapter] Final URL for native module:', wsUrl);

    // Use the message handler version if available
    if (NativeModules.WebSocketModule.connectWithMessageHandler) {
      NativeModules.WebSocketModule.connectWithMessageHandler(
        wsUrl,  // Use converted URL
        statusHandler,
        messageHandler
      );
    } else {
      NativeModules.WebSocketModule.connect(wsUrl, statusHandler);  // Use converted URL
    }
  }

  send(data: Uint8Array): void {
    if (!this._isConnected) {
      console.error('[LynxWebSocketAdapter] Cannot send - WebSocket not connected');
      return;
    }

    // Convert Uint8Array to string
    const decoder = new TextDecoder();
    const message = decoder.decode(data);

    if (NativeModules.WebSocketModule.sendMessageAsync) {
      NativeModules.WebSocketModule.sendMessageAsync(message);
    } else {
      NativeModules.WebSocketModule.sendMessage(message, (_response: string) => {});
    }
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
class LynxHttpResponseAdapter implements LynxHttpResponse {
  public readonly ok: boolean;
  public readonly status: number;
  private readonly responseData: string;

  constructor(status: number, data: string) {
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.responseData = data;
  }

  async json(): Promise<any> {
    try {
      return JSON.parse(this.responseData);
    } catch (error) {
      throw new Error('Invalid JSON response');
    }
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
export const createLynxHttpClient = (): LynxHttpClient => {
  return async (url: string, options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<LynxHttpResponse> => {
    const method = options?.method || 'GET';
    const headers = options?.headers || {};
    const body = options?.body;

    return new Promise((resolve, reject) => {
      // Try Lynx HttpModule first
      if (typeof NativeModules !== 'undefined' && NativeModules.HttpModule) {
        console.log('[LynxHttpClient] Using Lynx HttpModule');
        
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

          const lynxResponse = new LynxHttpResponseAdapter(
            response.status || 200,
            response.data || ''
          );
          resolve(lynxResponse);
        });
      } else {
        // Fallback to XMLHttpRequest
        console.log('[LynxHttpClient] Using XMLHttpRequest fallback');
        
        try {
          const xhr = new XMLHttpRequest();
          xhr.open(method, url, true);
          
          // Set headers
          Object.entries(headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });
          
          xhr.onload = () => {
            const lynxResponse = new LynxHttpResponseAdapter(
              xhr.status,
              xhr.responseText
            );
            resolve(lynxResponse);
          };
          
          xhr.onerror = () => {
            reject(new Error(`Network error: ${xhr.status} ${xhr.statusText}`));
          };
          
          xhr.send(body);
        } catch (error) {
          reject(new Error(`HTTP request failed: ${error}`));
        }
      }
    });
  };
};

/**
 * Create Lynx WebSocket factory function
 */
export const createLynxWebSocketFactory = () => {
  return async (url: string, protocol?: string): Promise<LynxWebSocket> => {
    console.log('[LynxWebSocketFactory] Creating WebSocket with URL:', url);
    console.log('[LynxWebSocketFactory] Protocol:', protocol);
    return new LynxWebSocketAdapter(url, protocol);
  };
};