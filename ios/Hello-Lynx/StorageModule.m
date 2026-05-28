#import "StorageModule.h"
#import "Hello_Lynx-Swift.h"

static NSString *const kStoragePrefix = @"lynx.storage.";

@implementation StorageModule {
    __weak LynxContext *_context;
}

+ (NSString *)name {
    return @"StorageModule";
}

+ (NSDictionary<NSString *, NSString *> *)methodLookup {
    return @{
        @"getItem": NSStringFromSelector(@selector(getItem:callback:)),
        @"setItem": NSStringFromSelector(@selector(setItem:value:callback:)),
        @"removeItem": NSStringFromSelector(@selector(removeItem:callback:)),
    };
}

- (instancetype)initWithLynxContext:(LynxContext *)context {
    self = [super init];
    if (self) {
        _context = context;
    }
    return self;
}

- (NSString *)storageKeyForKey:(NSString *)key {
    return [kStoragePrefix stringByAppendingString:key ?: @""];
}

- (void)getItem:(NSString *)key callback:(LynxCallbackBlock)callback {
    NSString *value = [[NSUserDefaults standardUserDefaults] stringForKey:[self storageKeyForKey:key]];
    if (callback) {
        callback(value ?: @"");
    }
}

- (void)setItem:(NSString *)key value:(NSString *)value callback:(LynxCallbackBlock)callback {
    [[NSUserDefaults standardUserDefaults] setObject:value ?: @"" forKey:[self storageKeyForKey:key]];
    [[NSUserDefaults standardUserDefaults] synchronize];
    if (callback) {
        callback(@"ok");
    }
}

- (void)removeItem:(NSString *)key callback:(LynxCallbackBlock)callback {
    [[NSUserDefaults standardUserDefaults] removeObjectForKey:[self storageKeyForKey:key]];
    [[NSUserDefaults standardUserDefaults] synchronize];
    if (callback) {
        callback(@"ok");
    }
}

- (void)destroy {
}

@end
