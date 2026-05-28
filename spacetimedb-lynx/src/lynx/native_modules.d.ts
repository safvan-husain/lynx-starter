declare let NativeModules: {
  WebSocketModule?: {
    connectWithMessageHandler(
      url: string,
      protocol: string,
      headersJson: string,
      statusCallback: (status: string) => void,
      messageCallbackBase64: (base64: string) => void,
    ): void;
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
        data?: string;
        error?: string;
      }) => void,
    ): void;
  };
};
