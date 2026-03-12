declare let NativeModules: {
  WebSocketModule: {
    connect(url: string, statusCallback: (status: string) => void): void;
    connectWithMessageHandler(
      url: string,
      statusCallback: (status: string) => void,
      messageCallback: (message: string) => void
    ): void;
    sendMessage(message: string, callback: (response: string) => void): void;
    sendMessageAsync(message: string): void;
    disconnect(): void;
  };
  HttpModule?: {
    request(config: {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    }, callback: (response: {
      status?: number;
      statusText?: string;
      data?: string;
      headers?: Record<string, string>;
      error?: string;
    }) => void): void;
  };
};

declare let SystemInfo: {
  platform: 'iOS' | 'Android';
};
