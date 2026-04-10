# SpacetimeDB Lynx Successful Connection Plan

## Goal

Get the Lynx app to reach a confirmed successful SpacetimeDB connection. For this milestone, success means the app receives the SpacetimeDB initial connection response and can display:

- `Connected`
- identity hex
- connection id
- auth token length

Subscriptions, reducers, generated bindings, token persistence, and production reconnection can come after the connection is proven.

## Current Repo Context

Workspace root:

`/Users/safvanhusain/code/mine/lynx-demo`

Current app:

`lyxn-project`

Current SpacetimeDB fork:

`spacetimedb-lynx`

Current SpacetimeDB source checkout:

`spacetimeDB-source`

Local Dart/Flutter-style reference package:

`spacetimedb-dart`

Connection test UI:

`lyxn-project/src/components/SpacetimeDBTest.tsx`

Current Lynx SpacetimeDB wrapper:

`lyxn-project/src/spacetimedb/client.ts`

Current Lynx native transport adapter:

`lyxn-project/src/spacetimedb/lynx-adapters.ts`

Native modules:

`ios/Hello-Lynx/WebSocketModule.m`

`ios/Hello-Lynx/WebSocketClient.swift`

`ios/Hello-Lynx/HttpModule.m`

`android/app/src/main/java/com/lynx/kotlinemptyproject/WebSocketModule.kt`

## Current State

- The old white-screen issue appears to be past the import-time crash stage.
- The app is currently wired to `spacetimedb-lynx` via `lyxn-project/package.json`.
- The test UI currently defaults to `https://maincloud.spacetimedb.com` and database `lynx-starter-jzx7d`.
- For first local connection, those defaults should be changed to a local SpacetimeDB server URL and a known local database name.
- The current `client.ts` uses a generic mock remote module:

```ts
{
  tables: {},
  reducers: [],
  procedures: [],
  versionInfo: { cliVersion: '1.4.0' }
}
```

This may be enough for proving the initial connection only, because the initial connection message contains identity/token metadata. It is not enough for production subscriptions or typed reducers.

## What Connection Means

The flow is:

1. The app calls `createSpacetimeClient({ url, database })`.
2. `client.connect()` creates a `DbConnectionBuilder`.
3. The builder is configured with:

```ts
.withUri(url)
.withDatabaseName(database)
.withToken(authToken)
.withWS(LynxWebSocketAdapter)
.withFetchFn(lynxFetch)
```

4. `DbConnectionImpl` builds a SpacetimeDB subscribe URL:

`<server>/v1/database/<database>/subscribe`

5. The SDK opens a native WebSocket with protocol:

`v2.bsatn.spacetimedb`

6. Native WebSocket receives binary messages and passes them to JS as base64.
7. `LynxWebSocketAdapter` decodes base64 back to `Uint8Array`.
8. The SDK decodes the initial connection message.
9. `builder.onConnect(...)` fires with identity and token.
10. The UI marks the connection as successful.

## Preferred Local Server Setup

Run SpacetimeDB on `3000`:

```sh
spacetime start --listen-addr 127.0.0.1:3000 --data-dir /tmp/lynx-spacetimedb-data --in-memory --non-interactive
```

If the sandbox blocks binding, ask the user to approve running it outside the sandbox or ask them to run it manually in a separate terminal.

If testing on iOS simulator, `127.0.0.1:3000` should generally refer to the host Mac from the simulator.

If testing on Android emulator, use:

`http://10.0.2.2:3000`

If testing on a physical device, use the Mac LAN IP address:

`http://<mac-lan-ip>:3000`

The SpacetimeDB URL should use `http://` in JS. The SDK changes it to `ws://` internally for the WebSocket subscribe endpoint.

## Suggested Test Database

Use the existing simple counter module:

`spacetimedb-lynx/test-react-router-app/server`

It defines:

- table `counter`
- table `user`
- table `offline_user`
- reducer `increment_counter`
- reducer `clear_counter`

Publish it to the non-3000 local server:

```sh
spacetime publish lynx-counter \
  --server http://127.0.0.1:3000 \
  --module-path spacetimedb-lynx/test-react-router-app/server \
  --yes
```

For first connection only, generated bindings are not required yet.

For subscription/reducer validation, generated bindings become strongly recommended.

## First Code Change To Try

Change the defaults in `lyxn-project/src/spacetimedb/client.ts`:

```ts
const DEFAULT_CONFIG: SpacetimeConfig = {
  url: 'http://127.0.0.1:3000',
  database: 'lynx-counter',
};
```

For Android emulator, use:

```ts
url: 'http://10.0.2.2:3000'
```

Also change the UI defaults in `lyxn-project/src/components/SpacetimeDBTest.tsx`:

```ts
const [serverUrl, setServerUrl] = useState('http://127.0.0.1:3000');
const [databaseName, setDatabaseName] = useState('lynx-counter');
const [tableName, setTableName] = useState('counter');
const [reducerName, setReducerName] = useState('increment_counter');
```

For the first milestone, only press `Connect`. Do not press `Subscribe` or `Call Reducer` until connection is proven.

## Possible Extra Required Change

Set compression to none for Lynx while proving the connection:

```ts
.withCompression('none')
```

Reason: `spacetimedb-lynx/src/sdk/decompress.ts` uses browser `ReadableStream` and `DecompressionStream` for gzip. Lynx may not provide those. If the server sends compressed messages and Lynx cannot decompress them, connection may fail after the socket opens.

Add this in `lyxn-project/src/spacetimedb/client.ts` after `.withFetchFn(lynxFetch)`:

```ts
.withCompression('none')
```

## Native Module Requirements

WebSocket is required for connection.

iOS:

- `ios/Hello-Lynx/ViewController.swift` currently registers `WebSocketModule`.
- `ios/Hello-Lynx/WebSocketClient.swift` supports binary-safe `connectBinary`.
- `ios/Hello-Lynx/WebSocketModule.m` exposes `connectWithMessageHandler` and `sendBinary`.

Android:

- `android/app/src/main/java/com/lynx/kotlinemptyproject/YourApplication.kt` registers `WebSocketModule`.
- `android/app/src/main/java/com/lynx/kotlinemptyproject/WebSocketModule.kt` supports `connectWithMessageHandler` and `sendBinary`.

HTTP is not strictly required for anonymous first connection with no existing token. HTTP becomes required when the SDK needs to exchange an existing auth token for a short-lived WebSocket token.

iOS has `HttpModule.m`, but `ViewController.swift` currently says it is not registered. That is not a blocker for anonymous first connection.

## Success Checklist

- [ ] Start local SpacetimeDB on a non-3000 port.
- [ ] Publish `lynx-counter` to that server.
- [ ] Point Lynx test client to the local server and `lynx-counter`.
- [ ] Add `.withCompression('none')` during the first connection test.
- [ ] Build the Lynx bundle.
- [ ] Sync host bundles if needed.
- [ ] Run iOS or Android host app.
- [ ] Open the `SpacetimeDB` tab.
- [ ] Press `Connect`.
- [ ] Confirm status changes to `Connected`.
- [ ] Confirm identity hex is displayed.
- [ ] Confirm connection id is displayed.
- [ ] Confirm token length is displayed.
- [ ] Check native logs if connection fails.

## Debugging Order

1. If status shows `WebSocketModule not available`, native module registration is wrong.
2. If status shows invalid URL or immediate disconnect, verify `url` and device host mapping.
3. If native WebSocket opens but SDK does not connect, add or verify `.withCompression('none')`.
4. If auth token exchange fails, remove `authToken` for the first test or register native `HttpModule`.
5. If server reports database not found, republish `lynx-counter` to the same server URL the app uses.
6. If iOS simulator cannot reach the server, try `http://localhost:3000` or `http://127.0.0.1:3000`.
7. If Android emulator cannot reach the server, use `http://10.0.2.2:3000`.
8. If physical device cannot reach the server, bind SpacetimeDB to `0.0.0.0:3000` and use the Mac LAN IP.

## What Not To Do Yet

- Do not fight port `3000`.
- Do not implement the full generated bindings flow before the first connection works.
- Do not implement token persistence yet.
- Do not implement reconnect/backoff yet.
- Do not validate subscriptions or reducers until initial connection succeeds.

## After Connection Works

Next thread can move to:

1. Generate bindings for the counter module.
2. Replace the mock remote module with generated `DbConnection`.
3. Subscribe to `tables.counter`.
4. Call `reducers.incrementCounter`.
5. Add token persistence and native HTTP registration.
