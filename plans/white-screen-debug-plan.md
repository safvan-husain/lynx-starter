# Plan: Debugging Lynx "White Screen" Incompatibility

This plan outlines a "stub-and-search" approach to identify the specific runtime incompatibility in the `spacetimedb-lynx` package that causes the Lynx mobile app to display a white screen.

## 🎯 Goal
Identify the exact piece of code (Web API, Node.js global, or JS feature) that the Lynx runtime fails to execute, causing a silent crash.

## 🛠 Phase 1: Create a Dummy SDK (Stubbing)
We will maintain the public interface so `lyxn-project` compiles, but we will "gut" the implementation.

1.  **Skeleton Mode**: Comment out logic inside `spacetimedb-lynx`.
    - Functions should return default values (empty arrays, `undefined`, etc.).
    - Class constructors should be empty.
    - **Crucial**: Remove all `import` statements at the top of files that pull in external libraries or complex sub-modules.
2.  **Targets**:
    - `src/sdk/db_connection_impl.ts` (Major complexity).
    - `src/lib/binary_reader.ts` & `src/lib/binary_writer.ts` (Heavy math/BigInt).
    - `src/sdk/client_cache.ts` (Large data structures).

## 🧪 Phase 2: Baseline Verification
1.  Build the stubbed `spacetimedb-lynx`.
2.  Sync it into `lyxn-project`.
3.  Launch the app on the device/emulator.
4.  **Expectation**: The white screen should disappear. If it doesn't, the issue is likely in the *import/package* overhead or global setup code (like `util-stub.ts`).

## 🔍 Phase 3: Binary Search (Incremental Restoration)
Once the baseline is clean, we will uncomment code systematically.

1.  **Group A (Utils & Types)**: 
    - `lib/identity.ts`, `lib/result.ts`, `lib/result.ts`.
    - Check for crash.
2.  **Group B (Serialization)**:
    - `lib/binary_reader.ts`, `lib/binary_writer.ts`.
    - *Common Suspect*: BigInt literals/constructors or typed arrays.
3.  **Group C (Core Logic)**:
    - Slowly restore `sdk/db_connection_impl.ts` section by section.
    - Start with simple state management, then WebSocket connectivity.

## 🩹 Phase 4: Identification & Remediation
When the white screen returns:
1.  Narrow down to the exact line being restored.
2.  Inspect for:
    - Global variables (`Buffer`, `process`, `global`).
    - Web APIs not present in Lynx (e.g., specific `XMLHttpRequest` behaviors).
    - Modern JS syntax that Lynx's JS engine (QuickJS/PrimJS) might not support without polyfills.
3.  Replace the problematic code with a Lynx-compatible alternative.

---
**Status**: Initializing Phase 1.
