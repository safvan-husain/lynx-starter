# Lynx Monorepo

This repository is now structured as a monorepo:

- `lynx/`: shared Lynx UI and logic project (moved from previous root)
- `ios/`: iOS host app workspace (to register Lynx native modules)
- `android/`: Android host app workspace (to register Lynx native modules)
- `web/`: web app workspace (to consume shared Lynx/UI logic as needed)

## Current status

- The existing Lynx app lives in `lynx/`.
- Native image-picker module samples are in `lynx/native-modules/`.
- `ios/`, `android/`, and `web/` are initialized as empty workspace placeholders.

## Lynx commands

Run these from `lynx/`:

- `pnpm run dev`
- `pnpm run build`
- `pnpm run test`
