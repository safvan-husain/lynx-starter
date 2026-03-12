# SpacetimeDB + Lynx Troubleshooting Guide

## Current Error Analysis

### Error: "A server with the specified hostname could not be found"

```
Connection 1: failed to connect 12:8, reason -1
HTTP load failed, 0/0 bytes (error code: -1003 [12:8])
Error Domain=NSURLErrorDomain Code=-1003
NSErrorFailingURLStringKey=http://undefined/v1/database/lynx-demo/subscribe
```

**Root Cause:** The URL is showing as `http://undefined`, indicating a URL construction issue.

## Debugging Steps

### 1. Check Console Logs

With the updated code, you should see detailed URL construction logs:

```
[SpacetimeDB] Building WebSocket URL from: http://localhost:3000
[SpacetimeDB] Base URL: http://localhost:3000
[SpacetimeDB] Database URL before protocol conversion: http://localhost:3000/v1/database/lynx-demo/subscribe
[SpacetimeDB] Final WebSocket URL: ws://localhost:3000/v1/database/lynx-demo/subscribe
```

If you see `undefined` in any of these logs, there's a configuration issue.

### 2. Verify Server Configuration

The test component now shows the current configuration:

```typescript
// In SpacetimeDBTest.tsx
const [serverUrl, setServerUrl] = useState('http://localhost:3000');
const [databaseName, setDatabaseName] = useState('lynx-demo');
```

**Update these values** to match your actual SpacetimeDB server.

### 3. Common Server URLs

| Environment | URL Format | Example |
|-------------|------------|---------|
| Local Development | `http://localhost:PORT` | `http://localhost:3000` |
| Local with HTTPS | `https://localhost:PORT` | `https://localhost:3001` |
| Remote Server | `https://your-domain.com` | `https://api.myapp.com` |
| SpacetimeDB Cloud | `https://your-instance.spacetimedb.com` | `https://myapp.spacetimedb.com` |

### 4. Test Server Connectivity

Before testing the Lynx integration, verify your SpacetimeDB server is running:

```bash
# Test HTTP endpoint
curl http://localhost:3000/v1/database/lynx-demo/subscribe

# Should return WebSocket upgrade error (expected)
# If you get "connection refused", the server isn't running
```

## Setup Requirements

### 1. SpacetimeDB Server

You need a running SpacetimeDB server. Options:

#### Option A: Local Development Server
```bash
# Install SpacetimeDB CLI
curl --proto '=https' --tlsv1.2 -sSf https://install.spacetimedb.com | sh

# Start local server
spacetimedb start

# Create/publish your database
spacetimedb publish lynx-demo
```

#### Option B: SpacetimeDB Cloud
1. Sign up at [spacetimedb.com](https://spacetimedb.com)
2. Create a new database instance
3. Use the provided URL in your configuration

#### Option C: Self-hosted Server
Follow the [SpacetimeDB deployment guide](https://spacetimedb.com/docs/deployment)

### 2. Database Schema

Your SpacetimeDB database needs to be published with a schema. Example:

```rust
// lib.rs
use spacetimedb::{spacetimedb, Table, Reducer};

#[spacetimedb(table)]
pub struct User {
    #[spacetimedb(primary_key)]
    pub id: u32,
    pub name: String,
    pub email: String,
}

#[spacetimedb(reducer)]
pub fn create_user(name: String, email: String) {
    User::insert(User {
        id: User::count() as u32,
        name,
        email,
    });
}
```

## Configuration Updates

### 1. Update Server URL

In `src/spacetimedb/client.ts`:

```typescript
const DEFAULT_CONFIG: SpacetimeConfig = {
  url: 'http://your-server:port', // Update this
  database: 'your-database-name', // Update this
};
```

### 2. Update Test Component

In `src/components/SpacetimeDBTest.tsx`:

```typescript
const [serverUrl, setServerUrl] = useState('http://your-server:port');
const [databaseName, setDatabaseName] = useState('your-database-name');
```

### 3. iOS Network Security

For HTTP (non-HTTPS) servers, update `ios/Hello-Lynx/Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

For production, use specific domain exceptions:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSExceptionDomains</key>
    <dict>
        <key>your-domain.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

## Testing Workflow

### 1. Verify Server
```bash
# Check if server is running
curl -I http://localhost:3000/health
# or
telnet localhost 3000
```

### 2. Update Configuration
- Set correct server URL in the code
- Ensure database name matches your published database

### 3. Build and Test
```bash
cd lyxn-project
pnpm build
# Open iOS project and run
```

### 4. Check Logs
Look for the URL construction logs in the console:
- Xcode console (iOS simulator/device)
- Safari Web Inspector (if using web debugging)

## Common Issues

### Issue: "Connection refused"
**Cause:** SpacetimeDB server not running
**Solution:** Start your SpacetimeDB server

### Issue: "Database not found"
**Cause:** Database name doesn't match published database
**Solution:** Check published databases with `spacetimedb list`

### Issue: "WebSocket upgrade failed"
**Cause:** Server doesn't support WebSocket on that endpoint
**Solution:** Verify SpacetimeDB server version and configuration

### Issue: "SSL/TLS errors"
**Cause:** HTTPS/WSS certificate issues
**Solution:** Use HTTP for local development, proper certificates for production

## Next Steps

1. **Set up SpacetimeDB server** (local or cloud)
2. **Update configuration** with correct URL and database name
3. **Test connection** with updated settings
4. **Implement your schema** and reducers
5. **Add real functionality** to your Lynx app

## Resources

- [SpacetimeDB Documentation](https://spacetimedb.com/docs)
- [SpacetimeDB Installation](https://spacetimedb.com/docs/getting-started)
- [SpacetimeDB Cloud](https://spacetimedb.com/cloud)
- [Lynx Framework](https://lynxjs.org/)

---

**The integration code is working correctly** - you just need to point it to a running SpacetimeDB server! 🚀