#import "DebugLogModule.h"

@implementation DebugLogModule {
    __weak LynxContext *_context;
}

+ (NSString *)name {
    return @"DebugLogModule";
}

+ (NSDictionary<NSString *, NSString *> *)methodLookup {
    return @{
        @"write": NSStringFromSelector(@selector(writeWithLevel:message:metadataJson:)),
        @"getLogFilePath": NSStringFromSelector(@selector(getLogFilePath:)),
        @"clear": NSStringFromSelector(@selector(clear:)),
    };
}

+ (dispatch_queue_t)logQueue {
    static dispatch_queue_t queue;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        queue = dispatch_queue_create("test.Hello-Lynx.DebugLogModule", DISPATCH_QUEUE_SERIAL);
    });
    return queue;
}

- (instancetype)initWithLynxContext:(LynxContext *)context {
    self = [super init];
    if (self) {
        _context = context;
        NSLog(@"[DebugLogModule] Lynx debug log file: %@", [self logFilePath]);
    }
    return self;
}

- (NSString *)logFilePath {
    NSArray<NSURL *> *urls = [[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask];
    NSURL *documentsURL = urls.firstObject;
    return [[documentsURL URLByAppendingPathComponent:@"lynx-debug.log"] path];
}

- (void)ensureLogDirectoryExists {
    NSString *directory = [[self logFilePath] stringByDeletingLastPathComponent];
    [[NSFileManager defaultManager] createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:nil];
}

- (NSString *)jsonLineWithLevel:(NSString *)level message:(NSString *)message metadataJson:(id)metadataJson {
    NSMutableDictionary *payload = [NSMutableDictionary dictionary];
    payload[@"timestamp"] = [[[NSISO8601DateFormatter alloc] init] stringFromDate:[NSDate date]];
    payload[@"level"] = level ?: @"log";
    payload[@"message"] = message ?: @"";

    if ([metadataJson isKindOfClass:[NSString class]] && [(NSString *)metadataJson length] > 0) {
        NSData *metadataData = [(NSString *)metadataJson dataUsingEncoding:NSUTF8StringEncoding];
        id parsedMetadata = [NSJSONSerialization JSONObjectWithData:metadataData options:0 error:nil];
        payload[@"metadata"] = parsedMetadata ?: metadataJson;
    } else if (metadataJson) {
        payload[@"metadata"] = metadataJson;
    }

    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:payload options:0 error:nil];
    if (!jsonData) {
        return [NSString stringWithFormat:@"%@ %@\n", payload[@"level"], payload[@"message"]];
    }

    NSString *json = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    return [json stringByAppendingString:@"\n"];
}

- (void)writeWithLevel:(NSString *)level message:(NSString *)message metadataJson:(id)metadataJson {
    NSString *line = [self jsonLineWithLevel:level message:message metadataJson:metadataJson];
    NSString *path = [self logFilePath];

    dispatch_async([DebugLogModule logQueue], ^{
        [self ensureLogDirectoryExists];
        NSData *data = [line dataUsingEncoding:NSUTF8StringEncoding];
        if (![[NSFileManager defaultManager] fileExistsAtPath:path]) {
            [[NSFileManager defaultManager] createFileAtPath:path contents:nil attributes:nil];
        }

        NSFileHandle *fileHandle = [NSFileHandle fileHandleForWritingAtPath:path];
        [fileHandle seekToEndOfFile];
        [fileHandle writeData:data];
        [fileHandle closeFile];
    });
}

- (void)getLogFilePath:(LynxCallbackBlock)callback {
    if (callback) {
        callback([self logFilePath]);
    }
}

- (void)clear:(LynxCallbackBlock)callback {
    NSString *path = [self logFilePath];

    dispatch_async([DebugLogModule logQueue], ^{
        [self ensureLogDirectoryExists];
        [@"" writeToFile:path atomically:YES encoding:NSUTF8StringEncoding error:nil];

        dispatch_async(dispatch_get_main_queue(), ^{
            if (callback) {
                callback(path);
            }
        });
    });
}

- (void)destroy {
}

@end
