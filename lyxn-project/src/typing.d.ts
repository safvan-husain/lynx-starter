declare let NativeModules: {
  WebSocketModule: {
    connect(url: string, statusCallback: (status: string) => void): void;
    connectWithMessageHandler(
      url: string,
      statusCallback: (status: string) => void,
      messageCallback: (message: string) => void,
    ): void;
    // Binary-safe SpacetimeDB path: messageCallback receives base64 payload.
    connectWithMessageHandler(
      url: string,
      protocol: string,
      headersJson: string,
      statusCallback: (status: string) => void,
      messageCallbackBase64: (base64: string) => void,
    ): void;
    sendMessage(message: string, callback: (response: string) => void): void;
    sendMessageAsync(message: string): void;
    sendBinary(base64: string): void;
    disconnect(): void;
  };
  HttpModule?: {
    request(
      config: {
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
      },
      callback: (response: {
        status?: number;
        statusText?: string;
        data?: string;
        headers?: Record<string, string>;
        error?: string;
      }) => void,
    ): void;
  };
  DebugLogModule?: {
    write(level: string, message: string, metadataJson?: string): void;
    getLogFilePath(callback: (path: string) => void): void;
    clear(callback?: (path: string) => void): void;
  };
};

declare let SystemInfo: {
  platform: 'iOS' | 'Android';
};
