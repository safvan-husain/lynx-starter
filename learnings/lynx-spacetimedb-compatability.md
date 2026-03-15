Listed directory spacetimedb-lynx
Listed directory src
Viewed algebraic_type.ts:21-820
Viewed ws.ts:1-28
Viewed useTable.ts:1-232
Viewed package.json:1-243

Based on your **Step-by-Step Check** in [support-check.md](cci:7://file:///Users/safvanhusain/code/mine/lynx-demo/docs/lynx/support-check.md:0:0-0:0) and my analysis of the `spacetimedb` SDK source code, here are the critical areas that are currently **not supportable** or will cause issues in Lynx:

### 1. Dynamic Code Generation (`new Function`) — **Critical**
*   **Where:** [src/lib/algebraic_type.ts](cci:7://file:///Users/safvanhusain/code/mine/lynx-demo/spacetimedb-lynx/src/lib/algebraic_type.ts:0:0-0:0) (lines 466, 486, 549, 562, 631, 700, 786).
*   **The Issue:** The SDK uses `new Function()` to JIT-compile BSATN serializers and deserializers.
*   **Lynx Impact:** Most native hybrid runtimes (like Lynx's custom engine) disable `eval` and `new Function` for security and to allow AOT (Ahead-of-Time) compilation. 
*   **Needed Change:** We must rewrite [AlgebraicType](cci:2://file:///Users/safvanhusain/code/mine/lynx-demo/spacetimeDB-source/crates/bindings-typescript/src/lib/algebraic_type.ts:68:0-68:46) to use a **structural interpreter** (a recursive function that walks the type tree) instead of generating code strings. This will be slightly slower but is the only way to run in restricted environments.

### 2. Web API Globals (`WebSocket` & `URL`)
*   **Where:** [src/sdk/ws.ts](cci:7://file:///Users/safvanhusain/code/mine/lynx-demo/spacetimedb-lynx/src/sdk/ws.ts:0:0-0:0) and [src/sdk/db_connection_impl.ts](cci:7://file:///Users/safvanhusain/code/mine/lynx-demo/spacetimeDB-source/crates/bindings-typescript/src/sdk/db_connection_impl.ts:0:0-0:0).
*   **The Issue:** The SDK assumes `globalThis.WebSocket` and `globalThis.URL` are available.
*   **Lynx Impact:** Lynx is a custom runtime. It might not provide a standard browser `WebSocket` global. 
    *   In [src/sdk/ws.ts](cci:7://file:///Users/safvanhusain/code/mine/lynx-demo/spacetimedb-lynx/src/sdk/ws.ts:0:0-0:0), if `WebSocket` is missing, it tries a dynamic import of `undici` (a Node.js lib) using `new Function`, which will fail twice (no `undici` in Lynx, no `new Function`).
*   **Needed Change:** We need to implement a Lynx-specific `WebsocketAdapter` that likely uses Lynx `NativeModules` or verify if the Lynx shell provides a `WebSocket` polyfill. We also need to add a lightweight `URL` polyfill.

### 3. React 18 Hooks in a React 17 Environment
*   **Where:** [src/react/useTable.ts](cci:7://file:///Users/safvanhusain/code/mine/lynx-demo/spacetimedb-lynx/src/react/useTable.ts:0:0-0:0) (line 6).
*   **The Issue:** It directly imports and uses `useSyncExternalStore`.
*   **Lynx Impact:** Lynx supports **React 17**. `useSyncExternalStore` was introduced in React 18.
*   **Needed Change:** Switch to `use-sync-external-store/shim` to provide compatibility for React 17.

### 4. Heavy Node.js/Framework Bloat
*   **Where:** [package.json](cci:7://file:///Users/safvanhusain/code/mine/lynx-demo/spacetimedb-lynx/package.json:0:0-0:0) and `src/server/`.
*   **The Issue:** Despite removing logic, the [package.json](cci:7://file:///Users/safvanhusain/code/mine/lynx-demo/spacetimedb-lynx/package.json:0:0-0:0) still lists `angular`, `svelte`, `vue` in exports and peer dependencies. It also references `src/server/polyfills.ts` which often contains Node-specific code.
*   **Lynx Impact:** This adds unnecessary weight to the bundle and might cause bundler errors if Lynx's toolchain tries to resolve these non-existent paths.
*   **Needed Change:** Scrub the [package.json](cci:7://file:///Users/safvanhusain/code/mine/lynx-demo/spacetimedb-lynx/package.json:0:0-0:0) completely to only include `react` and the core `sdk`.

### 5. Threading & Blocking
*   **Where:** The main deserialization loop in [src/sdk/db_connection_impl.ts](cci:7://file:///Users/safvanhusain/code/mine/lynx-demo/spacetimeDB-source/crates/bindings-typescript/src/sdk/db_connection_impl.ts:0:0-0:0).
*   **The Issue:** Large binary updates are processed synchronously.
*   **Lynx Impact:** Lynx splits UI and Background threads. Heavy BSATN decoding on the main thread will "jank" the UI more severely than in a standard browser.
*   **Needed Change:** We should investigate if the BSATN decoding can be wrapped in `runOnBackground` (if Lynx provides that access to this SDK).

### 6. Text Encoding
*   **Where:** [src/lib/binary_reader.ts](cci:7://file:///Users/safvanhusain/code/mine/lynx-demo/spacetimeDB-source/crates/bindings-typescript/src/lib/binary_reader.ts:0:0-0:0) (line 183) uses `new TextDecoder('utf-8')`.
*   **The Issue:** `TextDecoder` is a relatively modern Web API.
*   **Lynx Impact:** Might be missing in some older Lynx core versions.
*   **Needed Change:** Ensure a `fast-text-encoding` polyfill is included.

---

**Next Steps Recommendation:**
Before we start coding, we should focus on **Point #1 (Removing `new Function`)**. This is the biggest architectural hurdle. If we can't deserialize data without `eval`, the SDK simply won't run. 

Would you like to start by refactoring the [AlgebraicType](cci:2://file:///Users/safvanhusain/code/mine/lynx-demo/spacetimeDB-source/crates/bindings-typescript/src/lib/algebraic_type.ts:68:0-68:46) serializer/deserializer into an interpreted version?