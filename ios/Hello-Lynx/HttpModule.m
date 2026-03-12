#import "HttpModule.h"

@implementation HttpModule {
    __weak LynxContext *_context;
}

+ (NSString *)name {
    return @"HttpModule";
}

+ (NSDictionary<NSString *, NSString *> *)methodLookup {
    return @{
        @"request": NSStringFromSelector(@selector(request:callback:))
    };
}

- (instancetype)initWithLynxContext:(LynxContext *)context {
    self = [super init];
    if (self) {
        _context = context;
    }
    return self;
}

- (void)request:(NSDictionary *)config callback:(LynxCallbackBlock)callback {
    NSString *url = config[@"url"];
    NSString *method = config[@"method"] ?: @"GET";
    NSDictionary *headers = config[@"headers"] ?: @{};
    NSString *body = config[@"body"];
    
    if (!url) {
        if (callback) {
            callback(@{@"error": @"URL is required"});
        }
        return;
    }
    
    NSURL *requestURL = [NSURL URLWithString:url];
    if (!requestURL) {
        if (callback) {
            callback(@{@"error": @"Invalid URL"});
        }
        return;
    }
    
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:requestURL];
    request.HTTPMethod = method;
    
    // Set headers
    for (NSString *key in headers) {
        [request setValue:headers[key] forHTTPHeaderField:key];
    }
    
    // Set body for POST/PUT requests
    if (body && ([method isEqualToString:@"POST"] || [method isEqualToString:@"PUT"] || [method isEqualToString:@"PATCH"])) {
        request.HTTPBody = [body dataUsingEncoding:NSUTF8StringEncoding];
    }
    
    // Set default content type if not provided
    if (!headers[@"Content-Type"] && body) {
        [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    }
    
    NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            if (error) {
                if (callback) {
                    callback(@{@"error": error.localizedDescription});
                }
                return;
            }
            
            NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
            NSString *responseData = data ? [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] : @"";
            
            // Build response headers dictionary
            NSMutableDictionary *responseHeaders = [NSMutableDictionary dictionary];
            if (httpResponse.allHeaderFields) {
                [responseHeaders addEntriesFromDictionary:httpResponse.allHeaderFields];
            }
            
            NSDictionary *result = @{
                @"status": @(httpResponse.statusCode),
                @"statusText": [NSHTTPURLResponse localizedStringForStatusCode:httpResponse.statusCode],
                @"data": responseData,
                @"headers": responseHeaders
            };
            
            if (callback) {
                callback(result);
            }
        });
    }];
    
    [task resume];
}

- (void)destroy {
    // Cleanup if needed
}

@end