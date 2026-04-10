# SpacetimeDB Lynx Production Checklist

## Position

Native Lynx modules for HTTP and WebSocket are the preferred transport path. The production target is not a browser polyfill of `spacetimedb`; it is the official TypeScript/React SDK shape adapted to Lynx through explicit native transport injection.

The current repo is past the white-screen debugging phase. The remaining work is mostly productizing the integration: generated bindings, typed app APIs, native transport parity across platforms, connection hardening, and end-to-end validation against a real SpacetimeDB module.

## References Checked

- Current Lynx app integration: `lyxn-project/src/spacetimedb/*`
- Lynx SDK port status: `plans/lynx-spacetimedb-port.md`
- Local React reference app: `spacetimedb-lynx/test-react-router-app`
- Official React flow in docs: `docs/spacetimeDB-doc/rust-react-chat-app.md`
- Local Dart/Flutter-style reference: `spacetimedb-dart/lib/src/*`
- Native modules: `ios/Hello-Lynx/*`, `android/app/src/main/java/com/lynx/kotlinemptyproject/*`

## Already In Place

- [x] Local `spacetimedb-lynx` package is wired into `lyxn-project` via `file:../spacetimedb-lynx`.
- [x] SDK port removed the biggest Lynx runtime hazards: dynamic code generation, global `URL` dependency, most global text encoding assumptions, and Node `Buffer` usage.
- [x] The SDK has transport injection points through `DbConnectionBuilder.withWS(...)` and `withFetchFn(...)`.
- [x] The Lynx app has a JS `LynxWebSocketAdapter` that converts binary frames through base64 over `NativeModules.WebSocketModule`.
- [x] iOS has `WebSocketModule` and `WebSocketClient` sources in the Xcode project.
- [x] Android has `WebSocketModule` registered through `LynxEnv.inst().registerModule("WebSocketModule", WebSocketModule::class.java)`.
- [x] iOS has an `HttpModule` implementation source.
- [x] App-level smoke test UI exists in `SpacetimeDBTest`.

## Core Gaps

- [ ] Replace the current generic mock remote module in `lyxn-project/src/spacetimedb/client.ts` with generated SpacetimeDB bindings.
- [ ] Use the official React SDK shape: `DbConnection.builder()`, `SpacetimeDBProvider`, `useSpacetimeDB`, `useTable`, and reducer helpers from generated bindings.
- [ ] Register and validate native HTTP module support where token exchange or HTTP API calls are required.
- [ ] Decide the compression policy for Lynx. Use `withCompression("none")` unless native gzip/brotli decompression is implemented and tested.
- [ ] Add token persistence through a Lynx-native storage module instead of in-memory state or browser `localStorage`.
- [ ] Add reconnect, stale connection detection, and error-state handling suitable for mobile networks.
- [ ] Validate table subscriptions, reducer calls, reducer callbacks, connection identity, token reuse, and disconnect behavior against a real published module.

## Production Checklist

### 1. Real SpacetimeDB Module And Generated Bindings

- [ ] Choose the real server module for the Lynx app, including tables, reducers, procedures, and auth rules.
- [ ] Publish the module to local SpacetimeDB, testnet, maincloud, or the target self-hosted server.
- [ ] Generate TypeScript bindings with the current SpacetimeDB CLI into `lyxn-project/src/module_bindings`.
- [ ] Commit generated binding files or document exactly how they are regenerated in CI.
- [ ] Replace the mock `remoteModule` object in `client.ts` with `DbConnection` from generated bindings.
- [ ] Update app code to import generated `tables`, `reducers`, row types, and `ErrorContext`.
- [ ] Add a typed config object for `uri`, `databaseName`, `authToken`, `compression`, `lightMode`, and `confirmedReads`.

### 2. React/Lynx App API Parity

- [ ] Prefer `DbConnection.builder()` from generated bindings over `new DbConnectionBuilder(...)`.
- [ ] Use `SpacetimeDBProvider` for lifecycle-managed connection ownership where the app tree needs table hooks.
- [ ] Keep a small Lynx-specific builder helper only for injecting `withWS(LynxWebSocketAdapter)`, `withFetchFn(lynxFetch)`, and mobile defaults.
- [ ] Expose typed hooks for app screens, for example `useLynxSpacetimeDB`, `useTable(tables.todo)`, and reducer wrappers such as `reducers.createTodo`.
- [ ] Remove or quarantine raw string APIs like `subscribeToTable("todo")` from production paths.
- [ ] Handle disconnected/loading/error states in every screen that reads SpacetimeDB state.
- [ ] Ensure React 17 compatibility stays intact through `use-sync-external-store` shim usage where needed.

### 3. Native WebSocket Transport

- [ ] Keep the WebSocket path native through Lynx `NativeModules.WebSocketModule`.
- [ ] Verify iOS and Android both send binary frames, receive binary frames, and pass payloads to JS as base64 strings.
- [ ] Verify `Sec-WebSocket-Protocol` is set to `v2.bsatn.spacetimedb`.
- [ ] Verify URL construction matches SpacetimeDB subscribe endpoint: `/v1/database/<nameOrAddress>/subscribe`.
- [ ] Verify query params for `token`, `compression`, `light`, and `confirmed` match SDK expectations.
- [ ] Add native support for headers JSON on every platform that supports the module.
- [ ] Map native close, failure, auth, TLS, timeout, and parse errors into consistent JS errors.
- [ ] Ensure only one active socket is owned per connection and cleanup is deterministic on component unmount and app backgrounding.
- [ ] Add native timeout handling for first connection and stale sockets.

### 4. Native HTTP Transport

- [ ] Treat native HTTP as preferred, not a fallback detail.
- [ ] Register `HttpModule` on iOS in `ViewController.swift`.
- [ ] Ensure `HttpModule.m` is included in the iOS target sources.
- [ ] Add or register an Android `HttpModule` equivalent if HTTP token exchange must work on Android.
- [ ] Decide whether Harmony is in scope; if yes, implement matching HTTP and WebSocket modules there too.
- [ ] Support method, headers, UTF-8 body, response status, response text, response headers, timeout, and cancellation where possible.
- [ ] Verify `POST /v1/identity/websocket-token` works with `Authorization: Bearer <token>`.
- [ ] Avoid relying on `XMLHttpRequest` for production token exchange unless Lynx platform support is explicitly verified.

### 5. Compression And Binary Protocol

- [ ] Default Lynx connections to `withCompression("none")` unless gzip decompression is implemented outside browser `DecompressionStream`.
- [ ] Add tests for uncompressed server messages.
- [ ] Add tests that reject or clearly fail for unsupported brotli.
- [ ] If gzip is needed, implement gzip in a Lynx-safe way, likely native or a small JS inflater validated in Lynx.
- [ ] Verify `BinaryReader` and `BinaryWriter` encode/decode all types used by the real schema.
- [ ] Validate `Identity`, `ConnectionId`, `Timestamp`, `TimeDuration`, `U64`, `I64`, `U128`, `I128`, `U256`, and `I256` behavior with generated bindings.

### 6. Auth And Token Persistence

- [ ] Add a small `AuthTokenStore` abstraction for Lynx, inspired by the Dart package's token storage interface.
- [ ] Implement token storage through native secure storage or the chosen Lynx storage module.
- [ ] Save the token from `onConnect`.
- [ ] Load the token before building the connection.
- [ ] Clear token on explicit sign-out or auth failure.
- [ ] Verify reconnect uses the same identity after app restart.
- [ ] Avoid `localStorage` assumptions in Lynx code.

### 7. Connection Resilience

- [ ] Add connection status states: `disconnected`, `connecting`, `connected`, `reconnecting`, `authError`, `fatalError`.
- [ ] Add exponential backoff reconnection with a mobile preset.
- [ ] Add a stale connection monitor, either via server message activity or a safe one-off query strategy.
- [ ] Re-subscribe active queries after reconnect.
- [ ] Reconcile pending reducer calls on reconnect or fail them with clear timeout errors.
- [ ] Surface connection quality and last error for debug UI.
- [ ] Handle app foreground/background lifecycle with pause, resume, and forced reconnect behavior.

### 8. Subscriptions, Cache, Events, Reducers

- [ ] Confirm `InitialSubscription`, `SubscribeApplied`, `SubscribeMultiApplied`, `UnsubscribeApplied`, `SubscriptionError`, `TransactionUpdate`, and `TransactionUpdateLight` handling against the real server.
- [ ] Confirm empty subscribed tables are represented as active empty tables.
- [ ] Confirm additive subscriptions do not clear unrelated cached tables.
- [ ] Confirm table insert/update/delete callbacks fire with useful event context.
- [ ] Confirm reducer result callbacks complete the correct pending request.
- [ ] Add timeouts for reducer calls.
- [ ] Add typed reducer wrappers from generated bindings instead of raw `callReducer(name, argsBytes)`.
- [ ] Decide whether offline queue and optimistic writes are in scope for this milestone. If yes, mirror the Dart package's pending mutation and optimistic-change model as a separate feature.

### 9. Platform Configuration

- [ ] iOS: register `WebSocketModule` and `HttpModule`.
- [ ] iOS: configure ATS for the production SpacetimeDB host instead of broad arbitrary loads.
- [ ] iOS: test WSS on simulator and a physical device.
- [ ] Android: keep `INTERNET` and `ACCESS_NETWORK_STATE` permissions.
- [ ] Android: verify OkHttp dependency and ProGuard/R8 rules if minification is enabled.
- [ ] Android: implement HTTP module if not covered by Lynx service HTTP APIs.
- [ ] Harmony: either mark out of scope or implement parity modules.
- [ ] Production builds: verify modules are registered without relying on Lynx devtool behavior.

### 10. Tests And Validation

- [ ] Run `pnpm -C spacetimedb-lynx build`.
- [ ] Run `pnpm -C spacetimedb-lynx test`.
- [ ] Add JS unit tests for `LynxWebSocketAdapter` and `lynxFetch` with mocked `NativeModules`.
- [ ] Add generated-bindings integration test against the local test module.
- [ ] Add iOS build verification with `xcodebuild`.
- [ ] Add Android build verification with Gradle.
- [ ] Add device smoke test: open app, switch to SpacetimeDB tab, connect, subscribe, call reducer, disconnect, reconnect.
- [ ] Add restart test: connect, persist token, kill app, relaunch, reconnect with same identity.
- [ ] Add negative tests: missing native module, bad URL, bad token, no network, TLS failure, unsupported compression.
- [ ] Record the expected logs and error states for debugging.

## Suggested Milestone Order

1. **Typed MVP:** generated bindings, typed builder, native WebSocket, `compression: "none"`, connect, subscribe, reducer call.
2. **Native transport parity:** register iOS HTTP, add Android HTTP if needed, verify auth token exchange on both platforms.
3. **Mobile resilience:** token store, reconnect/backoff, stale detection, resubscribe, reducer timeouts.
4. **Production validation:** device matrix, release builds, CI checks, and documentation cleanup.

## Exit Criteria

- [ ] The app connects to a real SpacetimeDB module using generated bindings.
- [ ] A subscribed table updates live on iOS and Android.
- [ ] A typed reducer call changes server state and updates the local cache.
- [ ] The same identity is reused after app restart.
- [ ] No white screen occurs when the package is imported, the provider mounts, connection starts, messages arrive, or reducer callbacks resolve.
- [ ] Production builds use native HTTP/WebSocket modules and do not rely on devtool-only APIs.
- [ ] Compression behavior is explicit and tested.
- [ ] Failure modes show app-level errors instead of silent crashes.
