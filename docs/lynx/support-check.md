To determine if an npm package is supportable in Lynx (ReactLynx), inspect its source code for dependencies on unsupported browser APIs, Node.js modules, or React Native-specific bridges. Lynx runs in a custom runtime embedded in native apps, supporting React 17 APIs but lacking full browser/Node environments.

Step-by-Step Check
Review package.json: Look for native dependencies (react-native-*, @react-native-async-storage, platform-specific libs) or peer deps beyond React 17/Preact—these often need custom native modules.

Scan source code (src/lib/index.js): Search for unsupported globals like window.document, process, fs, module, require('react-native'), WebSocket, or DOM APIs (e.g., addEventListener on non-Lynx elements). Lynx uses NativeModules for native access instead.
​

Check for threading/callbacks: Flag setTimeout with DOM ops, Web Workers, or non-Lynx refs—Lynx has main/background threads via runOnMainThread/runOnBackground.
​

Test pure JS libs: State/data tools (Zustand, Jotai) work if no env deps; UI libs need Lynx components (e.g., <View> not div).
​