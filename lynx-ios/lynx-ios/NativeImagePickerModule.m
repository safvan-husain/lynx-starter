#import "NativeImagePickerModule.h"

#import <UIKit/UIKit.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

@interface NativeImagePickerModule () <UIDocumentPickerDelegate>
@property (nonatomic, copy, nullable) void (^pendingCallback)(NSString * _Nullable, NSString * _Nullable);
@end

@implementation NativeImagePickerModule

+ (NSString *)name {
  return @"NativeImagePickerModule";
}

+ (NSDictionary<NSString *, NSString *> *)methodLookup {
  return @{
    @"pickImageFromFileManager" : NSStringFromSelector(@selector(pickImageFromFileManager:))
  };
}

- (void)pickImageFromFileManager:(void(^)(NSString * _Nullable dataUrl, NSString * _Nullable error))callback {
  if (self.pendingCallback != nil) {
    callback(nil, @"Another image picker request is already in progress.");
    return;
  }

  UIViewController *topViewController = [self topViewController];
  if (topViewController == nil) {
    callback(nil, @"Host view controller is unavailable.");
    return;
  }

  self.pendingCallback = callback;

  UIDocumentPickerViewController *picker;
  if (@available(iOS 14.0, *)) {
    picker = [[UIDocumentPickerViewController alloc] initForOpeningContentTypes:@[UTTypeImage] asCopy:YES];
  } else {
    picker = [[UIDocumentPickerViewController alloc] initWithDocumentTypes:@[@"public.image"] inMode:UIDocumentPickerModeImport];
  }

  picker.delegate = self;
  picker.modalPresentationStyle = UIModalPresentationFormSheet;
  [topViewController presentViewController:picker animated:YES completion:nil];
}

- (void)documentPicker:(UIDocumentPickerViewController *)controller didPickDocumentsAtURLs:(NSArray<NSURL *> *)urls {
  void (^callback)(NSString * _Nullable, NSString * _Nullable) = self.pendingCallback;
  self.pendingCallback = nil;

  if (callback == nil) {
    return;
  }

  NSURL *url = urls.firstObject;
  if (url == nil) {
    callback(nil, @"No image was selected.");
    return;
  }

  NSError *readError = nil;
  NSData *data = [NSData dataWithContentsOfURL:url options:0 error:&readError];
  if (data == nil || readError != nil) {
    callback(nil, @"Failed to read selected image.");
    return;
  }

  NSString *mimeType = [self mimeTypeForURL:url] ?: @"image/jpeg";
  NSString *base64 = [data base64EncodedStringWithOptions:0];
  NSString *dataUrl = [NSString stringWithFormat:@"data:%@;base64,%@", mimeType, base64];
  callback(dataUrl, nil);
}

- (void)documentPickerWasCancelled:(UIDocumentPickerViewController *)controller {
  void (^callback)(NSString * _Nullable, NSString * _Nullable) = self.pendingCallback;
  self.pendingCallback = nil;
  if (callback != nil) {
    callback(nil, @"Image selection was canceled.");
  }
}

- (NSString * _Nullable)mimeTypeForURL:(NSURL *)url {
  NSString *extension = url.pathExtension.lowercaseString;
  if (extension.length == 0) {
    return nil;
  }

  if (@available(iOS 14.0, *)) {
    UTType *type = [UTType typeWithFilenameExtension:extension];
    return type.preferredMIMEType;
  }

  return nil;
}

- (UIViewController * _Nullable)topViewController {
  UIWindow *window = nil;
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:[UIWindowScene class]]) {
      continue;
    }

    UIWindowScene *windowScene = (UIWindowScene *)scene;
    for (UIWindow *candidate in windowScene.windows) {
      if (candidate.isKeyWindow) {
        window = candidate;
        break;
      }
    }

    if (window != nil) {
      break;
    }
  }

  UIViewController *controller = window.rootViewController;
  while (controller.presentedViewController != nil) {
    controller = controller.presentedViewController;
  }
  return controller;
}

@end
