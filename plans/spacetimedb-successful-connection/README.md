# SpacetimeDB Lynx Integration Plan

## Goal

Integrate SpacetimeDB into the Lynx app in small, verifiable milestones.

The first milestone was a confirmed successful local SpacetimeDB connection. That is now complete. The app receives the SpacetimeDB initial connection response and can display:

- `Connected`
- identity hex
- connection id
- auth token length

The next milestones are generated bindings, table subscription, reducer calls, token persistence, and production-grade reconnect behavior.

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

- The first connection milestone works on the iPhone 16e simulator.
- The app connects to local SpacetimeDB at `http://127.0.0.1:3000`.
- The app connects to the local `lynx-counter` database.
- The test UI displays `Connected`, identity hex, connection id, and auth token length after `InitialConnection`.
- The app is currently wired to `spacetimedb-lynx` via `lyxn-project/package.json`.
- The test UI currently defaults to `http://127.0.0.1:3000` and database `lynx-counter`.
- `.withCompression('none')` is enabled for the Lynx connection path.
- Native iOS WebSocket callback ordering has been fixed so binary messages reach JS reliably.
- The connection wrapper tracks real connected state instead of treating `connection !== null` as connected.
- Manual disconnect now updates the UI state correctly.
- Timeout handling now disconnects stale sockets so retry builds a fresh connection.
- Host-machine file logging is available for simulator debugging.
- The current `client.ts` still uses a generic mock remote module:

```ts
{
  tables: {},
  reducers: [],
  procedures: [],
  versionInfo: { cliVersion: '1.4.0' }
}
```

This is enough for proving the initial connection because the initial connection message contains identity/token metadata. It is not enough for production subscriptions or typed reducers.

## Completed Milestone: Initial Connection

Completed acceptance criteria:

- [x] Start local SpacetimeDB on `127.0.0.1:3000`.
- [x] Publish `lynx-counter` to that server.
- [x] Point Lynx test client to `http://127.0.0.1:3000` and `lynx-counter`.
- [x] Add `.withCompression('none')` for Lynx.
- [x] Build the Lynx bundle.
- [x] Sync host bundles.
- [x] Build the iOS host app.
- [x] Run the iOS host app on iPhone 16e simulator.
- [x] Open the `SpacetimeDB` tab.
- [x] Press `Connect`.
- [x] Confirm status changes to `Connected`.
- [x] Confirm identity hex is displayed.
- [x] Confirm connection id is displayed.
- [x] Confirm token length is displayed.
- [x] Confirm disconnect clears UI state.
- [x] Confirm timeout/retry does not reuse a stale connection.

## Next Milestones

### Milestone 2: Generated Bindings

Goal:

Replace the mock remote module in `lyxn-project/src/spacetimedb/client.ts` with generated bindings for `lynx-counter`.

Acceptance criteria:

- [ ] Generate TypeScript bindings for the `lynx-counter` module.
- [ ] Commit generated bindings into a stable location under `lyxn-project/src`.
- [ ] Replace the generic `EmptyRemoteModule`/`DbConnectionImpl<EmptyRemoteModule>` path with the generated `DbConnection`.
- [ ] Keep the Lynx WebSocket and fetch adapters wired into the generated connection builder.
- [ ] Preserve successful initial connection on iOS simulator.
- [ ] Build and type-check the Lynx app.

Notes:

- Generated bindings are the unlock for type-safe table subscriptions and reducer calls.
- Keep the current connection UI until the generated path proves equivalent to the mock path.

### Milestone 3: Subscribe To `counter`

Goal:

Subscribe to the `counter` table and display live counter data in the Lynx UI.

Acceptance criteria:

- [ ] Subscribe using the generated table subscription API.
- [ ] Display the current counter value or row count.
- [ ] Update the UI when table data changes.
- [ ] Unsubscribe cleanly when the user disconnects.
- [ ] Avoid leaving subscription handles alive after timeout, disconnect, or component cleanup.
- [ ] Verify logs show subscription applied.

### Milestone 4: Call Counter Reducers

Goal:

Call `increment_counter` and `clear_counter` from the Lynx UI using generated reducer APIs.

Acceptance criteria:

- [ ] Add UI actions for `increment_counter` and `clear_counter`.
- [ ] Call reducers through generated bindings, not raw `callReducer` bytes.
- [ ] Display reducer success/failure state.
- [ ] Verify table subscription updates after reducer calls.
- [ ] Log reducer request and result to the host-machine debug log.

### Milestone 5: Token Persistence And Native HTTP

Goal:

Persist the auth token and validate reconnect behavior using the saved identity.

Acceptance criteria:

- [ ] Store the auth token in a native-safe persistent location.
- [ ] Load the token before connecting.
- [ ] Reconnect with the saved token.
- [ ] Verify whether the SDK needs HTTP token exchange for this flow.
- [ ] Register and validate native `HttpModule` if token exchange is required.
- [ ] Confirm identity stays stable across app restart when using the persisted token.

### Milestone 6: Reconnect And Failure Handling

Goal:

Make local development reconnect behavior predictable and production reconnect behavior explicit.

Acceptance criteria:

- [ ] Show clear UI states for connecting, connected, disconnected, timeout, and connection error.
- [ ] Do not reuse stale connections after timeout or server restart.
- [ ] Add bounded reconnect/backoff behavior.
- [ ] Stop reconnect attempts after manual disconnect.
- [ ] Log every reconnect attempt and final outcome to the host-machine debug log.
- [ ] Document how in-memory SpacetimeDB restart affects published databases.

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

If testing on iOS simulator, `127.0.0.1:3000` should generally refer to the host Mac from the simulator.

If testing on Android emulator, use:

`http://10.0.2.2:3000`

If testing on a physical device, use the Mac LAN IP address:

`http://<mac-lan-ip>:3000`

The SpacetimeDB URL should use `http://` in JS. The SDK changes it to `ws://` internally for the WebSocket subscribe endpoint.

## Suggested Test Database

Use the existing simple counter module:

`spacetimeDB-source/crates/bindings-typescript/test-react-router-app/server`

It defines:

- table `counter`
- table `user`
- table `offline_user`
- reducer `increment_counter`
- reducer `clear_counter`

Publish it from the SpacetimeDB source workspace:

```sh
cd /Users/safvanhusain/code/mine/lynx-demo/spacetimeDB-source

spacetime publish lynx-counter \
  --server http://127.0.0.1:3000 \
  --module-path crates/bindings-typescript/test-react-router-app/server \
  --yes
```

Do not publish from `/Users/safvanhusain/code/mine/lynx-demo` using `spacetimedb-lynx/test-react-router-app/server`. That server crate inherits `spacetimedb` from a Cargo workspace root, and publishing it outside the workspace fails with `failed to find a workspace root`.

Because the local server currently uses `--in-memory`, publish `lynx-counter` again after restarting the SpacetimeDB server.

## Current Local Defaults

`lyxn-project/src/spacetimedb/client.ts`:

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

`lyxn-project/src/components/SpacetimeDBTest.tsx`:

```ts
const [serverUrl] = useState('http://127.0.0.1:3000');
const [databaseName] = useState('lynx-counter');
const [tableName, setTableName] = useState('counter');
const [reducerName, setReducerName] = useState('increment_counter');
```

## Lynx Compression Requirement

Keep compression disabled for Lynx unless the Lynx runtime has compatible decompression APIs:

```ts
.withCompression('none')
```

Reason: `spacetimedb-lynx/src/sdk/decompress.ts` uses browser `ReadableStream` and `DecompressionStream` for gzip. Lynx may not provide those. If the server sends compressed messages and Lynx cannot decompress them, connection may fail after the socket opens.

The current implementation adds this in `lyxn-project/src/spacetimedb/client.ts` after `.withFetchFn(lynxFetch)`.

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

## Debug Logging

The app writes host-readable logs through the native debug log module.

For the current iPhone 16e simulator:

```sh
tail -f /Users/safvanhusain/Library/Developer/CoreSimulator/Devices/25F70FD9-7D93-4D72-806C-796EB1038413/data/Containers/Data/Application/D8D0D3D3-5E25-4332-98B6-3789C24B6D4A/Documents/lynx-debug.log
```

The `Application/<UUID>` directory changes after reinstall. Recompute it with:

```sh
xcrun simctl get_app_container 25F70FD9-7D93-4D72-806C-796EB1038413 test.Hello-Lynx data
```

## Debugging Order

1. If status shows `WebSocketModule not available`, native module registration is wrong.
2. If status shows invalid URL or immediate disconnect, verify `url` and device host mapping.
3. If native WebSocket opens but SDK does not connect, add or verify `.withCompression('none')`.
4. If auth token exchange fails, remove `authToken` for the first test or register native `HttpModule`.
5. If server reports database not found, republish `lynx-counter` to the same server URL the app uses.
6. If iOS simulator cannot reach the server, try `http://localhost:3000` or `http://127.0.0.1:3000`.
7. If Android emulator cannot reach the server, use `http://10.0.2.2:3000`.
8. If physical device cannot reach the server, bind SpacetimeDB to `0.0.0.0:3000` and use the Mac LAN IP.
