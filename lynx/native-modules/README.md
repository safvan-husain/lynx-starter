# Native Image Picker Module

This folder contains sample native module implementations used by `src/App.tsx`:

- Android: `native-modules/android/NativeImagePickerModule.java`
- iOS: `native-modules/ios/NativeImagePickerModule.{h,m}`

The JS side expects this module name:

- `NativeImagePickerModule`
- method: `pickImageFromFileManager(callback)`
- callback signature: `(dataUrl: string | null, error: string | null) => void`

## Android wiring

1. Add `NativeImagePickerModule.java` to your host app package.
2. Register module in your Lynx module adapter:

```java
@Override
public @Nullable LynxModule createModule(String moduleName, LynxContext context) {
  switch (moduleName) {
    case "NativeImagePickerModule":
      return new NativeImagePickerModule(context);
    default:
      return null;
  }
}
```

3. Forward `onActivityResult` from your host Activity:

```java
@Override
protected void onActivityResult(int requestCode, int resultCode, Intent data) {
  if (NativeImagePickerModule.onActivityResult(requestCode, resultCode, data, this)) {
    return;
  }
  super.onActivityResult(requestCode, resultCode, data);
}
```

## iOS wiring

1. Add `NativeImagePickerModule.h/.m` to your host app target.
2. Register the module during Lynx setup:

```objective-c
[LynxModule registerModule:[NativeImagePickerModule class]];
```

## Notes

- This implementation reads the selected image and returns a base64 data URL, which can be directly assigned to `<image src="...">`.
- Large images can be memory-heavy. For production, resize/compress on native side before converting to base64.
