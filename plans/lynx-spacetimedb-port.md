# Plan: SpacetimeDB Lynx Compatibility Port

This document outlines the strategy for modifying the SpacetimeDB TypeScript SDK (spacetimedb-lynx) to run within the Lynx (ReactLynx) runtime environment.

## Goal
Transform the SDK from a JIT-based browser/Node library into an interpreted, injection-friendly library compatible with React 17 and restricted native runtimes.

---

## Phase 1: Eliminate Dynamic Code Generation (DCG) - COMPLETED
The most critical blocker was the use of `new Function()` for JIT compilation of serializers.
- **Status:** Replaced with a **Recursive Interpreter** in `src/lib/algebraic_type.ts`. Verified zero `new Function()` calls remain.

## Phase 2: Interface-Based Dependency Injection (WebSocket/URL) - COMPLETED
- **Status:** 
    - **WebSocket:** Injected via `DbConnectionBuilder.withWSFn`.
    - **URL:** Replaced global `URL` with a lightweight, internal `StdbUrl` implementation in `src/lib/url.ts` to ensure compatibility without needing polyfills.

## Phase 3: React 17 Compatibility - COMPLETED
- **Status:** Updated `src/react/useTable.ts` to use `use-sync-external-store/shim`. `package.json` now reflects React 17+ compatibility.

## Phase 4: Environment Hardening - COMPLETED
- **Text Encoding:** Implemented lightweight `StdbTextEncoder` and `StdbTextDecoder` fallbacks in `src/lib/text_encoding.ts`.
- **Buffers:** Audited the codebase; ensured all binary operations use `Uint8Array` and `DataView` instead of Node.js `Buffer`.

## Phase 5: Package Cleanup - COMPLETED
- **Status:** `package.json` cleaned up. Removed heavyweight peer dependencies and Node-only imports.

---

## Success Criteria Status
1. **Build:** `spacetimedb-lynx` builds successfully with `tsup`. [PASSED]
2. **DCG:** Zero instances of `new Function()` or `eval`. [PASSED]
3. **Environment:** Runs in Lynx without global `URL`, `TextEncoder`, or `TextDecoder`. [PASSED]
4. **WebSocket:** Native WebSocket can be passed via `withWSFn`. [PASSED]
