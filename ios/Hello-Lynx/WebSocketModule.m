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
        @"connectWithMessageHandler" : NSStringFromSelector(@selector(connectWithUrl:statusCallback:messageCallback:)),
        @"sendMessage" : NSStringFromSelector(@selector(sendMessage:callback:)),
        @"sendMessageAsync" : NSStringFromSelector(@selector(sendMessageAsync:)),
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

/// Connect with message callback for bidirectional communication (SpacetimeDB)
- (void)connectWithUrl:(NSString *)url statusCallback:(LynxCallbackBlock)statusCallback messageCallback:(LynxCallbackBlock)messageCallback {
    _messageCallback = messageCallback;
    [_client connectWithUrl:url statusCallback:^(NSString *status) {
        if (statusCallback) {
            statusCallback(status);
        }
    } messageCallback:^(NSString *message) {
        if (messageCallback) {
            messageCallback(message);
        }
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

- (void)doDisconnect {
    [_client disconnect];
    _messageCallback = nil;
}

- (void)destroy {
    [_client disconnect];
    _messageCallback = nil;
}

@end
