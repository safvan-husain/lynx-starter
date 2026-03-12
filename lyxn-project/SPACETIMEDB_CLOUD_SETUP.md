# SpacetimeDB Cloud Configuration ☁️

## Your Configuration

Based on your SpacetimeDB Cloud setup, here's the correct configuration:

### Connection Details
- **Server URL:** `https://maincloud.spacetimedb.com`
- **Database Name:** `lynx-starter-jzx7d`
- **Protocol:** HTTPS → WSS (automatic conversion)

### Expected WebSocket URL
The spacetimedb-lynx package will construct:
```
wss://maincloud.spacetimedb.com/v1/database/lynx-starter-jzx7d/subscribe
```

## Usage Examples

### Direct Client
```typescript
import { getSpacetimeClient } from './spacetimedb';

const client = getSpacetimeClient({
  url: 'https://maincloud.spacetimedb.com',
  database: 'lynx-starter-jzx7d'
});

await client.connect();
```

### React Hook
```typescript
const { client, isConnected, connect } = useSpacetimeDB({
  config: {
    url: 'https://maincloud.spacetimedb.com',
    database: 'lynx-starter-jzx7d',
  },
  autoConnect: true,
});
```

## Testing

Now when you test the connection, you should see logs like:
```
[SpacetimeDB] Building WebSocket URL from: https://maincloud.spacetimedb.com
[SpacetimeDB] Base URL: https://maincloud.spacetimedb.com
[SpacetimeDB] Database URL before protocol conversion: https://maincloud.spacetimedb.com/v1/database/lynx-starter-jzx7d/subscribe
[SpacetimeDB] Final WebSocket URL: wss://maincloud.spacetimedb.com/v1/database/lynx-starter-jzx7d/subscribe
```

## iOS Network Configuration

For SpacetimeDB Cloud (HTTPS), update `ios/Hello-Lynx/Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSExceptionDomains</key>
    <dict>
        <key>maincloud.spacetimedb.com</key>
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

## Ready to Test! 🚀

The configuration is now set up for your SpacetimeDB Cloud instance. Build and test the connection!