import { StdbUrl } from '../lib/url';
import { decompress } from './decompress';

export type FetchFn = (input: string, init?: any) => Promise<any>;

export interface WebsocketAdapter {
  send(msg: Uint8Array): void;
  close(): void;

  set onclose(handler: (ev: CloseEvent) => void);
  set onopen(handler: () => void);
  set onmessage(handler: (msg: { data: Uint8Array }) => void);
  set onerror(handler: (msg: ErrorEvent) => void);
}

export class WebsocketDecompressAdapter implements WebsocketAdapter {
  set onclose(handler: (ev: CloseEvent) => void) {
    this.#ws.onclose = handler;
  }
  set onopen(handler: () => void) {
    this.#ws.onopen = handler;
  }
  set onmessage(handler: (msg: { data: Uint8Array }) => void) {
    this.#ws.onmessage = async (msg: MessageEvent<ArrayBuffer>) => {
      const data = await this.#decompress(new Uint8Array(msg.data));
      handler({ data });
    };
  }
  set onerror(handler: (msg: ErrorEvent) => void) {
    this.#ws.onerror = handler as (msg: Event) => void;
  }

  #ws: WebSocket;

  async #decompress(buffer: Uint8Array): Promise<Uint8Array> {
    const tag = buffer[0];
    const data = buffer.subarray(1);
    switch (tag) {
      case 0:
        return data;
      case 1:
        throw new Error(
          'Brotli Compression not supported. Please use gzip or none compression in withCompression method on DbConnection.'
        );
      case 2:
        return await decompress(data, 'gzip');
      default:
        throw new Error(
          'Unexpected Compression Algorithm. Please use `gzip` or `none`'
        );
    }
  }

  send(msg: Uint8Array): void {
    this.#ws.send(msg);
  }

  close(): void {
    this.#ws.close();
  }

  constructor(ws: WebSocket) {
    ws.binaryType = 'arraybuffer';

    this.#ws = ws;
  }

  static async createWebSocketFn({
    url,
    nameOrAddress,
    wsProtocol,
    authToken,
    compression,
    lightMode,
    confirmedReads,
    WS,
    fetchFn,
  }: {
    url: StdbUrl;
    wsProtocol: string;
    nameOrAddress: string;
    authToken?: string;
    compression: 'gzip' | 'none';
    lightMode: boolean;
    confirmedReads?: boolean;
    WS: any;
    fetchFn: FetchFn;
  }): Promise<WebsocketDecompressAdapter> {
    const headers = new Map<string, string>();

    // WS and fetchFn are passed in the args

    // We swap our original token to a shorter-lived token
    // to avoid sending the original via query params.
    let temporaryAuthToken: string | undefined = undefined;
    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`);
      const tokenUrl = new StdbUrl('v1/identity/websocket-token', url);
      tokenUrl.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';

      const response = await fetchFn(tokenUrl.toString(), {
        method: 'POST',
        headers: Object.fromEntries(headers.entries()),
      });
      if (response.ok) {
        const { token } = await response.json();
        temporaryAuthToken = token;
      } else {
        return Promise.reject(
          new Error(`Failed to verify token: ${response.statusText}`)
        );
      }
    }

    const databaseUrl = new StdbUrl(`v1/database/${nameOrAddress}/subscribe`, url);
    if (temporaryAuthToken) {
      databaseUrl.searchParams.set('token', temporaryAuthToken);
    }
    databaseUrl.searchParams.set(
      'compression',
      compression === 'gzip' ? 'Gzip' : 'None'
    );
    if (lightMode) {
      databaseUrl.searchParams.set('light', 'true');
    }
    if (confirmedReads !== undefined) {
      databaseUrl.searchParams.set('confirmed', confirmedReads.toString());
    }

    const ws = new WS(databaseUrl.toString(), wsProtocol);

    return new WebsocketDecompressAdapter(ws);
  }
}
