declare let NativeModules: {
  WebSocketModule: {
    connect(url: string, statusCallback: (status: string) => void): void;
    sendMessage(message: string, callback: (response: string) => void): void;
    disconnect(): void;
  };
};
