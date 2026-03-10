## lyxn-project (Lynx + host app bundle sync)

This folder is a Lynx project bootstrapped with the official docs flow:

```bash
npm create rspeedy@latest
```

## Install

```bash
npm install
```

## Build for all host apps

```bash
npm run build:hosts
```

This runs:

1. `npm run build` to generate `dist/main.lynx.bundle`
2. `npm run sync:hosts` to copy that bundle into:
   - `android/app/src/main/assets/main.lynx.bundle`
   - `ios/HelloLynxSwift/main.lynx.bundle`
   - `harmony/HarmonyEmptyProject/entry/src/main/resources/rawfile/main.lynx.bundle`

After that, run any native host app from Android Studio / Xcode / DevEco Studio and it will render this Lynx bundle.

## Development

```bash
npm run dev
```

Edit `src/App.tsx` and then rerun `npm run build:hosts` when you want those changes in the native host apps.
