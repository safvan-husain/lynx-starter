# SpacetimeDB + Lynx iOS Setup Guide

This guide explains how to configure SpacetimeDB with your Lynx iOS app, including the necessary WebSocket module registration for production/TestFlight builds.

## Overview

SpacetimeDB uses WebSocket connections to communicate between the client and server. While Lynx includes `LynxWebSocketModule` in development mode (via `LynxDevtool`), you need to manually register it for production and TestFlight builds.

## Quick Start

### 1. Install SpacetimeDB SDK

```bash
pnpm add @clockworklabs/spacetimedb-typescript-sdk
```

### 2. iOS Production Setup

For production/TestFlight builds, you need to register the WebSocket module in your iOS project.

#### Option A: Copy from LynxDevtool (Recommended)

The `LynxWebSocketModule` is available in the LynxDevtool. Copy it to your project:

1. Locate the module in the Lynx source:
   ```
   lynx/ios/lynx/devtool/LynxWebSocket/LynxWebSocketModule.swift
   ```

2. Copy it to your iOS project (e.g., `ios/YourApp/Modules/`)

3. Register the module in your `AppDelegate.swift`:

```swift
import UIKit
import Lynx

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Register WebSocket module for production
        LynxEnv.shared().register(LynxWebSocketModule.self)

        return true
    }
}
```

#### Option B: Create Custom WebSocket Module

If you prefer, you can create your own WebSocket module:

```swift
import Lynx
import Foundation

@objc(LynxWebSocketModule)
class LynxWebSocketModule: NSObject, LynxModule {
    static let name = "WebSocketModule"

    private var webSocket: URLSessionWebSocketTask?
    private var urlSession: URLSession?

    required init(param: Any?) {
        super.init()
    }

    @objc func connect(_ url: String, callback: LynxCallback) {
        guard let url = URL(string: url) else {
            callback?(["error": "Invalid URL"])
            return
        }

        urlSession = URLSession(configuration: .default)
        webSocket = urlSession?.webSocketTask(with: url)

        webSocket?.resume()
        callback?(["status": "connected"])

        // Start receiving messages
        receiveMessage()
    }

    @objc func disconnect() {
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        urlSession = nil
    }

    @objc func sendMessage(_ message: String, callback: LynxCallback) {
        webSocket?.send(.string(message)) { error in
            if let error = error {
                callback?(["error": error.localizedDescription])
            } else {
                callback?(["status": "sent"])
            }
        }
    }

    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                // Handle incoming message
                self?.receiveMessage() // Continue listening
            case .failure(let error):
                print("WebSocket error: \(error)")
            }
        }
    }
}
```

### 3. Update Info.plist

Add WebSocket permission to your `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

**Note:** For production, you should use `NSExceptionDomains` instead of `NSAllowsArbitraryLoads`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSExceptionDomains</key>
    <dict>
        <key>testnet.spacetimedb.com</key>
        <dict>
            <key>NSExceptionMinimumTLSVersion</key>
            <string>TLSv1.2</string>
            <key>NSExceptionRequiresForwardSecrecy</key>
            <true/>
            <key>NSIncludesSubdomains</key>
            <true/>
        </dict>
    </dict>
</dict>
```

## Testing

### Development Mode

In development mode (`rspeedy dev`), the WebSocket module is automatically available via `LynxDevtool`.

```typescript
import { useSpacetimeDB } from './spacetimedb/useSpacetimeDB';

const { connection, isConnected, connect } = useSpacetimeDB({
  config: {
    host: 'wss://testnet.spacetimedb.com',
    database: 'your-database-name',
  },
  autoConnect: true,
});
```

### Production/TestFlight

Before building for production:

1. Ensure `LynxWebSocketModule` is registered in `AppDelegate.swift`
2. Test on a physical device
3. Verify WSS connections work (not just WS)

## Troubleshooting

### Connection Fails in Production

**Symptom:** WebSocket works in dev but not in production/TestFlight

**Solution:**
- Verify `LynxWebSocketModule` is registered in `AppDelegate.swift`
- Check that `Info.plist` has proper ATS settings
- Ensure you're using WSS (not WS) for production

### "Module not found" Error

**Symptom:** `NativeModules.WebSocketModule` is undefined

**Solution:**
- Confirm module is registered before any Lynx views are created
- Check that the module class name matches in registration

### SSL/TLS Errors

**Symptom:** SSL handshake fails

**Solution:**
- SpacetimeDB uses WSS - ensure your `Info.plist` allows the domain
- For testnet: `testnet.spacetimedb.com`
- For mainnet: `mainnet.spacetimedb.com`

## Example Usage

See `src/components/SpacetimeDBTest.tsx` for a complete working example.

```typescript
import { useSpacetimeDB } from './spacetimedb/useSpacetimeDB';

function MyComponent() {
  const { connection, isConnected, connect, disconnect } = useSpacetimeDB({
    config: {
      host: 'wss://testnet.spacetimedb.com',
      database: 'my-app',
    },
    onConnect: () => console.log('Connected to SpacetimeDB!'),
    onError: (err) => console.error('Connection error:', err),
  });

  return (
    <view>
      <text>{isConnected ? 'Connected' : 'Disconnected'}</text>
      <view bindtap={connect}>
        <text>Connect</text>
      </view>
    </view>
  );
}
```

## Resources

- [SpacetimeDB Documentation](https://spacetimedb.com/docs)
- [Lynx WebSocket Module Issue](https://github.com/lynx-family/lynx/issues/951)
- [Lynx iOS Module Registration](https://lynxjs.org/guide/specifications/lynx-native-modules.html#ios-implementation)
