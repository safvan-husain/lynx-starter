# Plan: SpacetimeDB Lynx Compatibility Port

This document outlines the strategy for modifying the SpacetimeDB TypeScript SDK to run within the Lynx (ReactLynx) runtime environment.

## Goal
Transform the SDK from a JIT-based browser/Node library into an interpreted, injection-friendly library compatible with React 17 and restricted native runtimes.

---

## Phase 1: Eliminate Dynamic Code Generation (DCG)
The most critical blocker is the use of `new Function()` for JIT compilation of serializers.

- **Target File:** `src/lib/algebraic_type.ts`
- **Strategy:** Replace the string-based codegen with a **Recursive Interpreter**.
- **Implementation:**
    - Rewrite `ProductType.makeSerializer` to return a function that iterates over elements and calls their respective serializers.
    - Rewrite `SumType.makeDeserializer` to return a function that reads the tag and uses a lookup map to call the variant deserializer.
    - Maintain the cache (`SERIALIZERS`, `DESERIALIZERS`) but store interpreted functions instead of JIT-compiled ones.

## Phase 2: Interface-Based Dependency Injection (WebSocket/URL)
Lynx does not provide standard browser globals, and polyfills using `eval` or Node-specific logic will fail.

- **Target Files:** `src/sdk/ws.ts`, `src/sdk/db_connection_builder.ts`, `src/sdk/db_connection_impl.ts`
- **Strategy:** **"Inversion of Control"**. The SDK should not try to find a WebSocket; the user must provide it.
- **Implementation:**
    - Modify `DbConnectionBuilder` to require a `webSocketFactory`.
    - Example usage in Lynx:
      ```typescript
      const conn = new DbConnectionBuilder()
        .withWebSocketFactory((url) => new LynxNativeWebSocket(url))
        .build();
      ```
    - Allow injecting a `URL` implementation if `globalThis.URL` is absent.

## Phase 3: React 17 Compatibility
Lynx currently uses React 17, but the SDK uses React 18 hooks.

- **Target File:** `src/react/useTable.ts`
- **Strategy:** Backwards compatible hooks.
- **Implementation:**
    - Replace `import { useSyncExternalStore } from 'react'` with `import { useSyncExternalStore } from 'use-sync-external-store/shim'`.
    - This ensures `useTable` works on React 17 without breaking the API.

## Phase 4: Environment Hardening
- **Text Encoding:** In `src/lib/binary_reader.ts`, provide a fallback for `TextDecoder` or allow it to be injected.
- **Buffers:** Ensure `Uint8Array` usage is consistent and doesn't rely on Node `Buffer` internals.

## Phase 5: Package Cleanup
- **Target File:** `package.json`
- **Implementation:**
    - Remove `angular`, `vue`, `svelte`, and `tanstack` from peer dependencies and exports.
    - Remove `undici` and other Node-only dependencies.
    - Simplified the build process to output a single, clean Lynx-compatible bundle.

---

## Success Criteria
1. `spacetimedb-lynx` builds without errors using `tsup`.
2. The code contains zero instances of `new Function()` or `eval`.
3. A Lynx application can connect to a SpacetimeDB instance using its own native WebSocket implementation passed into the SDK.
