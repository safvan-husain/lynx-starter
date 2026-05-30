# integrating-lynx-demo-projects

This repository includes some demo projects of platform applications for getting started with integrating Lynx to existing project.

## Lynx Frontend Project

- [`lyxn-project`] : Lynx (Rspeedy) frontend project that builds `main.lynx.bundle` and can sync it into all host apps.

## Backend-only SpacetimeDB REST test

Run the real `spacetimedb-counter` module against a temporary in-memory
SpacetimeDB server without launching the Lynx frontend or native hosts:

```bash
node scripts/test-spacetimedb-rest.mjs
```

The script publishes a fresh test database, calls reducers through
`/v1/database/:db/call/:reducer`, verifies state through
`/v1/database/:db/sql`, and cleans up its temporary server/data directory.

## SpacetimeDB WebSocket `querySql` integration test

Run the real `spacetimedb-counter` module against a temporary in-memory
SpacetimeDB server and validate SDK `querySql` over WebSocket for the auth and
counter reads used by the Lynx app:

```bash
pnpm -C spacetimedb-lynx test tests/query_sql_integration.test.ts
```

The test publishes a fresh database, seeds an admin session through REST
reducers, connects with `DbConnection.querySql(...)`, and checks typed
`auth_session` / `counter` rows plus SQL error propagation. It skips automatically
when the `spacetime` CLI is unavailable.

## Android Empty Projects

- [`AndroidProject`] : Language of Main Activity and build configuration is Kotlin.

## iOS Empty Projects

- [`iOSProject`] : Swift project with SwiftUI.

## harmony Empty Projects

- [`HarmonyEmptyProject`] : ArkTs Harmony project.

[`AndroidProject`]: ./android

[`iOSProject`]: ./ios
[`HarmonyEmptyProject`]: ./harmony/HarmonyEmptyProject
[`lyxn-project`]: ./lyxn-project
