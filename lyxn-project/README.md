# lyxn-project

This folder contains the Lynx frontend for the persisted SpacetimeDB counter
app. It talks to the local `spacetimedb-lynx` package and syncs the generated
bundle into the Android, iOS, and Harmony host apps.

## What this project expects

The current counter app is wired to these defaults:

- server URL:
  - iOS simulator: `http://127.0.0.1:3000`
  - Android emulator: `http://10.0.2.2:3000`
- database name: `lynx-counter`
- table name: `counter`
- reducer name: `increment_counter`
- reducer name: `decrement_counter`

Those defaults come from:

- `src/spacetimedb/useCounter.ts`
- `src/spacetimedb/module_bindings`

If you publish a different module or database name, update those files to match.

## Prerequisites

- Node.js `>= 18`
- `pnpm`
- Rust toolchain
- SpacetimeDB CLI (`spacetime`)

Example SpacetimeDB install:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://install.spacetimedb.com | sh
```

## Install dependencies

Install the Lynx app dependencies:

```bash
cd /Users/safvanhusain/code/mine/lynx-demo/lyxn-project
pnpm install
```

If you change the local `spacetimedb-lynx` package, rebuild it before running
this app:

```bash
cd /Users/safvanhusain/code/mine/lynx-demo/spacetimedb-lynx
pnpm install
pnpm build
```

## Start SpacetimeDB on localhost

You have two local startup options depending on whether you want a disposable
database or one that survives restarts.

### Option 1: Ephemeral local server

Use this for quick testing when you do not care about keeping data after the
server stops:

```bash
spacetime start \
  --listen-addr 127.0.0.1:3000 \
  --data-dir /tmp/lynx-spacetimedb-data \
  --in-memory \
  --non-interactive
```

With this mode, the database is lost when the server stops, so publish the
module again after every restart.

### Option 2: Persistent local server

Use this when you want the local database and published module state to remain
on disk between restarts:

```bash
mkdir -p /tmp/lynx-spacetimedb-data

spacetime start \
  --listen-addr 127.0.0.1:3000 \
  --data-dir /tmp/lynx-spacetimedb-data \
  --non-interactive
```

With this mode, the database files are stored under
`/tmp/lynx-spacetimedb-data`. You usually do not need to republish after every
restart unless you intentionally clear that directory or change the module you
want to deploy.

General notes:

- On iOS simulator, `127.0.0.1:3000` should point back to the host Mac.
- On Android emulator, use `http://10.0.2.2:3000` in the app instead of
  `http://127.0.0.1:3000`.
- On a physical device, use your Mac's LAN IP and bind the server to
  `0.0.0.0:3000`.

## Publish the module used by this Lynx app

The app now uses the root-level module in this monorepo:

`/Users/safvanhusain/code/mine/lynx-demo/spacetimedb-counter`

That module defines:

- table `counter`
- reducer `increment_counter`
- reducer `decrement_counter`

Publish it to the local server like this:

```bash
spacetime publish lynx-counter \
  --server http://127.0.0.1:3000 \
  --module-path /Users/safvanhusain/code/mine/lynx-demo/spacetimedb-counter \
  --yes
```

If you use the ephemeral `--in-memory` mode, run the publish command again
after every restart. If you use the persistent mode, you usually only need to
publish again when you want to update or replace the deployed module.

## Regenerate typed bindings

If you change the Rust schema or reducers in `spacetimedb-counter`, regenerate
the Lynx bindings:

```bash
cd /Users/safvanhusain/code/mine/lynx-demo/lyxn-project
pnpm spacetime:generate
```

## Run the Lynx app

Start the Lynx dev server:

```bash
cd /Users/safvanhusain/code/mine/lynx-demo/lyxn-project
pnpm dev
```

Build the Lynx bundle:

```bash
pnpm build
```

Build and sync the bundle into all host apps:

```bash
pnpm build:hosts
```

That produces `dist/main.lynx.bundle` and copies it into:

- `android/app/src/main/assets/main.lynx.bundle`
- `ios/main.lynx.bundle`
- `harmony/HarmonyEmptyProject/entry/src/main/resources/rawfile/main.lynx.bundle`

After syncing, launch the native host app from Android Studio, Xcode, or DevEco
Studio.

## Quick local workflow

Open three terminals:

1. Start the database in whichever mode you need.

Ephemeral:

```bash
spacetime start \
  --listen-addr 127.0.0.1:3000 \
  --data-dir /tmp/lynx-spacetimedb-data \
  --in-memory \
  --non-interactive
```

Persistent:

```bash
mkdir -p /tmp/lynx-spacetimedb-data

spacetime start \
  --listen-addr 127.0.0.1:3000 \
  --data-dir /tmp/lynx-spacetimedb-data \
  --non-interactive
```

2. Publish the counter module:

```bash
spacetime publish lynx-counter \
  --server http://127.0.0.1:3000 \
  --module-path /Users/safvanhusain/code/mine/lynx-demo/spacetimedb-counter \
  --yes
```

3. Start the Lynx frontend:

```bash
cd /Users/safvanhusain/code/mine/lynx-demo/lyxn-project
pnpm dev
```

## Publishing the JavaScript package

There are two different "publish" flows in this repo:

1. `spacetime publish ...`
   This publishes a Rust SpacetimeDB module to a running SpacetimeDB server.
2. `npm publish`
   This publishes the `spacetimedb-lynx` JavaScript package to an npm registry.

If you need to publish the local `spacetimedb-lynx` package:

```bash
cd /Users/safvanhusain/code/mine/lynx-demo/spacetimedb-lynx
pnpm install
pnpm build
npm publish
```

Before publishing, bump the package version in:

- `../spacetimedb-lynx/package.json`

`lyxn-project` itself is marked `"private": true`, so it is not intended to be
published as an npm package.

## Troubleshooting

If the counter app does not connect:

- Verify the server is running on `127.0.0.1:3000`.
- Verify `lynx-counter` was published to that same server.
- If you are using `--in-memory`, republish after every local server restart.
- If you are using persistent storage, republish only when you changed the
  module or cleared the data directory.
- Keep `.withCompression('none')` in `src/spacetimedb/useCounter.ts`.
- For Android emulator, the app already defaults to `http://10.0.2.2:3000`.
