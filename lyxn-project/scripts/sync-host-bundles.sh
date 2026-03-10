#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PROJECT_DIR="$ROOT_DIR/lyxn-project"
BUNDLE_PATH="$PROJECT_DIR/dist/main.lynx.bundle"

if [[ ! -f "$BUNDLE_PATH" ]]; then
  echo "Bundle not found at $BUNDLE_PATH"
  echo "Run: npm run build"
  exit 1
fi

targets=(
  "$ROOT_DIR/android/app/src/main/assets/main.lynx.bundle"
  "$ROOT_DIR/ios/main.lynx.bundle"
  "$ROOT_DIR/harmony/HarmonyEmptyProject/entry/src/main/resources/rawfile/main.lynx.bundle"
)

for target in "${targets[@]}"; do
  mkdir -p "$(dirname "$target")"
  cp "$BUNDLE_PATH" "$target"
  echo "Synced: $target"
done

echo "Done. Updated bundle in all host apps."
