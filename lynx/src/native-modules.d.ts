export {};

declare global {
  interface NativeImagePickerModule {
    pickImageFromFileManager(
      callback: (dataUrl: string | null, error: string | null) => void,
    ): void;
  }

  interface NativeModulesShape {
    NativeImagePickerModule?: NativeImagePickerModule;
  }

  const NativeModules: NativeModulesShape | undefined;
}
