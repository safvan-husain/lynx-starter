# lynx-ios host app

This Xcode app now includes a UIKit-based Lynx host controller and a Swift native image picker module.

## What is wired

- `lynx-ios/ContentView.swift`: uses a UIKit controller wrapper.
- `lynx-ios/LynxHostViewController.swift`: creates and mounts a `LynxView`.
- `lynx-ios/LynxBridge.swift`: registers `NativeImagePickerModule` and provides template loading from URL.
- `lynx-ios/NativeImagePickerModule.{h,m}`: Objective-C Lynx module that opens file manager and returns selected image as base64 data URL.

## Required in Xcode

1. Install pods in this folder:
   - `pod install`
2. Open `lynx-ios.xcworkspace` (not `.xcodeproj`).
3. Build and run this app after dependencies are linked.

Without the SDK linked, the app shows a fallback message.

## Dev bundle URL

`LynxBridge.bundleURL` is currently:

- `http://127.0.0.1:3000/main.lynx.bundle`

Update this if your `pnpm run dev` serves on another host/port/path.

## Next

1. Start Lynx JS app from `/lynx`: `pnpm run dev`
2. Run this iOS app in simulator.
3. Tap `Pick image file` in Lynx UI and verify preview renders.
