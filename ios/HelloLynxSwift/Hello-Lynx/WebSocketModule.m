#import "WebSocketModule.h"
#import "Hello_Lynx-Swift.h"

@implementation WebSocketModule {
    __weak LynxContext *_context;
    WebSocketClient *_client;
}

+ (NSString *)name {
    return @"WebSocketModule";
}

+ (NSDictionary<NSString *, NSString *> *)methodLookup {
    return @{
        @"connect"     : NSStringFromSelector(@selector(connectWithUrl:statusCallback:)),
        @"sendMessage" : NSStringFromSelector(@selector(sendMessage:callback:)),
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

- (void)sendMessage:(NSString *)message callback:(LynxCallbackBlock)callback {
    [_client sendMessage:message completion:^(NSString *response) {
        if (callback) {
            callback(response);
        }
    }];
}

- (void)doDisconnect {
    [_client disconnect];
}

- (void)destroy {
    [_client disconnect];
}

@end
