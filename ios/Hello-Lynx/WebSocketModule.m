#import "WebSocketModule.h"
#import "Hello_Lynx-Swift.h"

@implementation WebSocketModule {
    __weak LynxContext *_context;
    WebSocketClient *_client;
    LynxCallbackBlock _messageCallback;
}

+ (NSString *)name {
    return @"WebSocketModule";
}

+ (NSDictionary<NSString *, NSString *> *)methodLookup {
    return @{
        @"connect"     : NSStringFromSelector(@selector(connectWithUrl:statusCallback:)),
        // Binary-safe API used by SpacetimeDB client. Incoming messages are base64 strings.
        @"connectWithMessageHandler" : NSStringFromSelector(@selector(connectWithUrl:protocol:headersJson:statusCallback:messageCallback:)),
        @"connectWithEvents" : NSStringFromSelector(@selector(connectWithEventsWithUrl:protocol:headersJson:socketId:)),
        @"sendMessage" : NSStringFromSelector(@selector(sendMessage:callback:)),
        @"sendMessageAsync" : NSStringFromSelector(@selector(sendMessageAsync:)),
        @"sendBinary" : NSStringFromSelector(@selector(sendBinary:)),
        @"disconnect"  : NSStringFromSelector(@selector(doDisconnect)),
    };
}

- (instancetype)initWithLynxContext:(LynxContext *)context {
    self = [super init];
    if (self) {
        _context = context;
        _client = [WebSocketClient shared];
    }
    return self;
}

- (void)connectWithUrl:(NSString *)url statusCallback:(LynxCallbackBlock)statusCallback {
    [_client connectWithUrl:url statusCallback:^(NSString *status) {
        if (statusCallback) {
            statusCallback(status);
        }
    }];
}

/// Connect with message callback for bidirectional communication (SpacetimeDB).
/// This binary-safe variant forwards incoming messages as base64 strings.
- (void)connectWithUrl:(NSString *)url
              protocol:(NSString *)protocol
           headersJson:(id)headersJson
        statusCallback:(LynxCallbackBlock)statusCallback
       messageCallback:(LynxCallbackBlock)messageCallback {
    _messageCallback = messageCallback;
    NSString *headersString = nil;
    if ([headersJson isKindOfClass:[NSString class]]) {
        headersString = (NSString *)headersJson;
    }

    [_client connectBinaryWithUrl:url protocol:protocol headersJson:headersString statusCallback:^(NSString *status) {
        if (statusCallback) {
            statusCallback(status);
        }
    } messageCallback:^(NSString *base64) {
        if (messageCallback) {
            messageCallback(base64);
        }
    }];
}

- (void)sendGlobalWebSocketEvent:(NSString *)name
                         socketId:(NSNumber *)socketId
                          payload:(NSDictionary *)payload {
    if (!_context) {
        return;
    }

    NSMutableDictionary *event = [payload mutableCopy];
    event[@"id"] = socketId ?: @0;
    [_context sendGlobalEvent:name withParams:@[event]];
}

/// Event-based binary WebSocket path.
///
/// Lynx native callback blocks are one-shot, so long-lived socket streams must
/// use GlobalEventEmitter events instead of repeatedly invoking one callback.
- (void)connectWithEventsWithUrl:(NSString *)url
                         protocol:(NSString *)protocol
                      headersJson:(id)headersJson
                        socketId:(NSNumber *)socketId {
    NSString *headersString = nil;
    if ([headersJson isKindOfClass:[NSString class]]) {
        headersString = (NSString *)headersJson;
    }

    __weak typeof(self) weakSelf = self;
    [_client connectBinaryWithUrl:url protocol:protocol headersJson:headersString statusCallback:^(NSString *status) {
        [weakSelf sendGlobalWebSocketEvent:@"spacetimedbWebSocketStatus"
                                  socketId:socketId
                                   payload:@{@"status": status ?: @""}];
    } messageCallback:^(NSString *base64) {
        [weakSelf sendGlobalWebSocketEvent:@"spacetimedbWebSocketMessage"
                                  socketId:socketId
                                   payload:@{@"data": base64 ?: @""}];
    }];
}

- (void)sendMessage:(NSString *)message callback:(LynxCallbackBlock)callback {
    [_client sendMessage:message completion:^(NSString *response) {
        if (callback) {
            callback(response);
        }
    }];
}

/// Send message without waiting for response (fire and forget)
- (void)sendMessageAsync:(NSString *)message {
    [_client sendMessage:message];
}

- (void)sendBinary:(NSString *)base64 {
    [_client sendBinary:base64];
}

- (void)doDisconnect {
    [_client disconnect];
    _messageCallback = nil;
}

- (void)destroy {
    [_client disconnect];
    _messageCallback = nil;
}

@end
