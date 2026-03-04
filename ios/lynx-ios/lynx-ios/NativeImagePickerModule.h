#import <Foundation/Foundation.h>

#if __has_include(<Lynx/LynxModule.h>)
#import <Lynx/LynxModule.h>
#elif __has_include("../Pods/Lynx/platform/darwin/common/lynx/public/module/LynxModule.h")
#import "../Pods/Lynx/platform/darwin/common/lynx/public/module/LynxModule.h"
#else
#error "LynxModule.h not found. Run pod install and open lynx-ios.xcworkspace."
#endif

NS_ASSUME_NONNULL_BEGIN

@interface NativeImagePickerModule : NSObject <LynxModule>

@end

NS_ASSUME_NONNULL_END
