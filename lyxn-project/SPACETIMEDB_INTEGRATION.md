# SpacetimeDB + Lynx Integration Guide

This document explains how SpacetimeDB is integrated with Lynx using polyfills for `fetch` and `WebSocket`.

## Overview

SpacetimeDB requires `fetch` and `WebSocket` APIs that are not natively available in the Lynx environment. This integration provides polyfills that bridge SpacetimeDB to Lynx's native modules.

## Architecture

```
SpacetimeDB SDK
       ↓
Global Polyfills (globalThis.fetch, globalThis.WebSocket)
       ↓
Lynx Native Modules (HttpModule, WebSocketModule)
       ↓
iOS/Android Native Implementation
```

## Key Files

### Frontend (TypeScript/React)

- **`src/spacetimedb/lynx-polyfills.ts`** - Main polyfill implementation
- **`src/spacetimedb/client.ts`** - SpacetimeDB client wrapper
- **`src/spacetimedb/lynx-websocket-adapter.ts`** - WebSocket adapter for Lynx
- **`src/components/SpacetimeDBTest.tsx`** - Test component

### iOS Native Modules

- **`ios/Hello-Lynx/WebSocketModule.h/m`** - WebSocket native module (Objective-C)
- **`ios/Hello-Lynx/HttpModule.swift`** - HTTP native module (Swift, for fetch polyfill)
- **`ios/Hello-Lynx/WebSocketClient.swift`** - WebSocket implementation
- **`ios/Hello-Lynx/ViewController.swift`** - Module registration

## How It Works

### 1. Polyfill Installation

The polyfills are automatically installed when importing the module:

```typescript
// This happens automatically in src/index.tsx
import './spacetimedb/lynx-polyfills';
```

The polyfills assign Lynx implementations to global objects:

```typescript
// Before importing SpacetimeDB
globalThis.fetch = yourLynxFetchImplementation;
globalThis.WebSocket = YourLynxWebSocketClass;

// Now SpacetimeDB can use these APIs
import { DbConnection } from 'spacetimedb';
```

### 2. Fetch Polyfill

The fetch polyfill (`LynxFetch`) provides a minimal `fetch` API implementation:

- Uses `NativeModules.HttpModule` when available
- Falls back to `XMLHttpRequest` if available
- Returns Promise-based Response objects compatible with SpacetimeDB

### 3. WebSocket Polyfill

The WebSocket polyfill (`LynxWebSocket`) wraps the existing Lynx WebSocket adapter:

- Proxies all WebSocket API calls to `LynxWebSocketAdapter`
- Maintains compatibility with standard WebSocket interface
- Handles connection states and event callbacks

## Usage

### Basic Connection

```typescript
import { getSpacetimeClient } from './spacetimedb';

const client = getSpacetimeClient({
  host: 'wss://testnet.spacetimedb.com',
  database: 'your-database-name'
});

// Set up event handlers
client.onConnect(() => {
  console.log('Connected to SpacetimeDB!');
});

client.onConnectError((error) => {
  console.error('Connection failed:', error);
});

// Connect
const connection = client.connect();
```

### React Hook Usage

```typescript
import { useSpacetimeDB } from './spacetimedb';

function MyComponent() {
  const { connection, isConnected, connect, disconnect } = useSpacetimeDB({
    config: {
      host: 'wss://testnet.spacetimedb.com',
      database: 'my-app',
    },
    autoConnect: true,
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

## iOS Setup

### 1. Register Native Modules

In `ViewController.swift` (where Lynx configuration is set up):

```swift
import UIKit

class ViewController: UIViewController {
  override func viewDidLoad() {
    super.viewDidLoad()

    let config = LynxConfig(provider: DemoLynxProvider())
    // Register WebSocket module for SpacetimeDB support
    config.register(WebSocketModule.self)
    // Note: HttpModule files exist but need to be added to Xcode project

    // ... rest of the setup
  }
}
```

**Note:** The `HttpModule.h/m` files are created but need to be manually added to the Xcode project. The fetch polyfill will use XMLHttpRequest as a fallback, which should work fine for most SpacetimeDB operations.

### 2. Update Info.plist

Add network permissions for SpacetimeDB:

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

Run the Lynx development server:

```bash
cd lyxn-project
pnpm dev
```

### Production Build

Build and sync to host apps:

```bash
cd lyxn-project
pnpm build:hosts
```

### Test Component

The app includes a SpacetimeDB test tab that shows:

- Polyfill installation status
- Connection status
- Error messages
- Connection controls

## Troubleshooting

### Common Issues

1. **"NativeModules.WebSocketModule not found"**
   - Ensure `WebSocketModule` is registered in `AppDelegate.swift`
   - Check that the module is properly imported

2. **"NativeModules.HttpModule not found"**
   - Ensure `HttpModule` is registered in `AppDelegate.swift`
   - The fetch polyfill will fall back to XMLHttpRequest if available

3. **SSL/TLS Connection Errors**
   - Update `Info.plist` with proper ATS settings
   - Use WSS (not WS) for production connections

4. **Connection Timeout**
   - Check network connectivity
   - Verify SpacetimeDB server is running and accessible

### Debug Logs

Enable detailed logging by checking the browser console or Xcode console for:

- `[Lynx Polyfills]` - Polyfill installation messages
- `[LynxWebSocketAdapter]` - WebSocket connection details
- `[SpacetimeDB]` - Connection and error messages

## Performance Considerations

- The polyfills add minimal overhead
- WebSocket connections are handled natively by iOS
- HTTP requests use URLSession for optimal performance
- Consider connection pooling for multiple database connections

## Security Notes

- Always use WSS (WebSocket Secure) in production
- Configure proper ATS settings in Info.plist
- Validate server certificates in production builds
- Consider implementing authentication tokens for database access

## Next Steps

1. Implement your SpacetimeDB schema and reducers
2. Add proper error handling and retry logic
3. Implement offline support if needed
4. Add authentication and authorization
5. Optimize for production deployment

## Resources

- [SpacetimeDB Documentation](https://spacetimedb.com/docs)
- [Lynx Documentation](https://lynxjs.org/)
- [WebSocket API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Fetch API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)