/**
 * Lynx Polyfills for SpacetimeDB
 * 
 * This module provides fetch and WebSocket polyfills for the Lynx environment.
 * Import this BEFORE importing SpacetimeDB to ensure the polyfills are available.
 */

import { createLynxWebSocketAdapter } from './lynx-websocket-adapter';

/**
 * Lynx Fetch Implementation
 * 
 * A basic fetch polyfill that uses Lynx's HTTP capabilities.
 * Note: This is a minimal implementation for SpacetimeDB's needs.
 */
class LynxFetch {
  static fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    const headers = init?.headers || {};
    const body = init?.body;

    // Convert headers to a plain object if it's a Headers instance
    const headersObj: Record<string, string> = {};
    if (headers && typeof headers === 'object') {
      if ('forEach' in headers && typeof headers.forEach === 'function') {
        // Headers instance
        (headers as any).forEach((value: string, key: string) => {
          headersObj[key] = value;
        });
      } else if (Array.isArray(headers)) {
        // Array of [key, value] pairs
        headers.forEach(([key, value]: [string, string]) => {
          headersObj[key] = value;
        });
      } else {
        // Plain object
        Object.keys(headers).forEach(key => {
          headersObj[key] = (headers as any)[key];
        });
      }
    }

    return new Promise((resolve, reject) => {
      // Check if we have Lynx HTTP module available
      if (typeof NativeModules !== 'undefined' && NativeModules.HttpModule) {
        console.log('[Lynx Polyfills] Using Lynx HttpModule for fetch');
        const requestConfig = {
          url,
          method,
          headers: headersObj,
          body: body ? String(body) : undefined,
        };

        NativeModules.HttpModule.request(requestConfig, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          // Create a Response-like object
          const responseObj = {
            ok: response.status >= 200 && response.status < 300,
            status: response.status || 200,
            statusText: response.statusText || 'OK',
            headers: new Headers(response.headers || {}),
            url,
            
            text(): Promise<string> {
              return Promise.resolve(response.data || '');
            },
            
            json(): Promise<any> {
              try {
                return Promise.resolve(JSON.parse(response.data || '{}'));
              } catch (e) {
                return Promise.reject(new Error('Invalid JSON response'));
              }
            },
            
            blob(): Promise<Blob> {
              return Promise.reject(new Error('Blob not supported in Lynx environment'));
            },
            
            arrayBuffer(): Promise<ArrayBuffer> {
              const text = response.data || '';
              const buffer = new ArrayBuffer(text.length);
              const view = new Uint8Array(buffer);
              for (let i = 0; i < text.length; i++) {
                view[i] = text.charCodeAt(i);
              }
              return Promise.resolve(buffer);
            },
            
            clone(): Response {
              return { ...responseObj } as Response;
            }
          };

          resolve(responseObj as Response);
        });
      } else {
        // Fallback: try to use XMLHttpRequest if available
        console.log('[Lynx Polyfills] HttpModule not available, using XMLHttpRequest fallback');
        try {
          const xhr = new XMLHttpRequest();
          xhr.open(method, url, true);
          
          // Set headers
          Object.keys(headersObj).forEach(key => {
            xhr.setRequestHeader(key, headersObj[key]);
          });
          
          xhr.onload = () => {
            const responseObj = {
              ok: xhr.status >= 200 && xhr.status < 300,
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers(),
              url,
              
              text(): Promise<string> {
                return Promise.resolve(xhr.responseText);
              },
              
              json(): Promise<any> {
                return Promise.resolve(JSON.parse(xhr.responseText));
              },
              
              blob(): Promise<Blob> {
                return Promise.reject(new Error('Blob not supported'));
              },
              
              arrayBuffer(): Promise<ArrayBuffer> {
                const text = xhr.responseText;
                const buffer = new ArrayBuffer(text.length);
                const view = new Uint8Array(buffer);
                for (let i = 0; i < text.length; i++) {
                  view[i] = text.charCodeAt(i);
                }
                return Promise.resolve(buffer);
              },
              
              clone(): Response {
                return { ...responseObj } as Response;
              }
            };
            
            resolve(responseObj as Response);
          };
          
          xhr.onerror = () => {
            reject(new Error(`Network error: ${xhr.status} ${xhr.statusText}`));
          };
          
          xhr.send(body as string);
        } catch (error) {
          reject(new Error(`Fetch not available: ${error}`));
        }
      }
    });
  }
}

/**
 * Lynx WebSocket Implementation
 * 
 * A WebSocket class that wraps our existing Lynx WebSocket adapter.
 */
class LynxWebSocket {
  private adapter: any;
  
  constructor(url: string | URL, protocols?: string | string[]) {
    const urlString = typeof url === 'string' ? url : url.toString();
    this.adapter = createLynxWebSocketAdapter(urlString, protocols);
    
    // Create a proxy-like behavior without using Proxy (for better compatibility)
    const self = this;
    
    // Copy properties from adapter
    Object.keys(this.adapter).forEach(key => {
      const value = this.adapter[key];
      if (typeof value === 'function') {
        (self as any)[key] = value.bind(this.adapter);
      } else {
        Object.defineProperty(self, key, {
          get() { return self.adapter[key]; },
          set(newValue) { self.adapter[key] = newValue; },
          enumerable: true,
          configurable: true
        });
      }
    });
  }
  
  // Static constants
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
}

/**
 * Install polyfills on globalThis
 * 
 * This function should be called before importing SpacetimeDB.
 */
export function installLynxPolyfills(): void {
  // Install fetch polyfill
  if (typeof (globalThis as any).fetch === 'undefined') {
    (globalThis as any).fetch = LynxFetch.fetch;
    console.log('[Lynx Polyfills] Installed fetch polyfill');
  }
  
  // Install WebSocket polyfill
  if (typeof (globalThis as any).WebSocket === 'undefined') {
    (globalThis as any).WebSocket = LynxWebSocket as any;
    console.log('[Lynx Polyfills] Installed WebSocket polyfill');
  }
  
  // Also install on window if it exists (for compatibility)
  if (typeof window !== 'undefined') {
    if (typeof (window as any).fetch === 'undefined') {
      (window as any).fetch = LynxFetch.fetch;
    }
    if (typeof (window as any).WebSocket === 'undefined') {
      (window as any).WebSocket = LynxWebSocket;
    }
  }
}

/**
 * Check if polyfills are needed
 */
export function checkPolyfillsNeeded(): { fetch: boolean; webSocket: boolean } {
  return {
    fetch: typeof (globalThis as any).fetch === 'undefined',
    webSocket: typeof (globalThis as any).WebSocket === 'undefined'
  };
}

// Auto-install polyfills when this module is imported
installLynxPolyfills();