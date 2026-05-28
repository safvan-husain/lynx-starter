#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/lyxn-project/src/spacetimedb/module_bindings"
MODULE_DIR="$ROOT_DIR/spacetimedb-counter"

rm -rf "$OUT_DIR"

spacetime generate \
  --lang typescript \
  --out-dir "$OUT_DIR" \
  --module-path "$MODULE_DIR" \
  --yes

find "$OUT_DIR" -name '*.ts' -print0 | xargs -0 perl -0pi -e 's/from "spacetimedb"/from "spacetimedb-lynx"/g'
perl -0pi -e "s/\\{ name: '([A-Za-z0-9_]+)', algorithm: /{ accessor: '\\1', name: '\\1', algorithm: /g" "$OUT_DIR/index.ts"
perl -0pi -e 's#// THIS FILE#// \@ts-nocheck\n// THIS FILE#' "$OUT_DIR/index.ts"
perl -0pi -e 's/const tablesSchema = __schema\(/const tablesSchema: any = __schema(/g' "$OUT_DIR/index.ts"
perl -0pi -e 's/const reducersSchema = __reducers\(/const reducersSchema: any = __reducers(/g' "$OUT_DIR/index.ts"
perl -0pi -e 's/const proceduresSchema = __procedures\(/const proceduresSchema: any = __procedures(/g' "$OUT_DIR/index.ts"
perl -0pi -e 's/const REMOTE_MODULE = \{/const REMOTE_MODULE: __RemoteModule<any, any, any> = {/g' "$OUT_DIR/index.ts"
perl -0pi -e 's/export const reducers = __convertToAccessorMap/export const reducers: any = __convertToAccessorMap/g' "$OUT_DIR/index.ts"

echo "Generated SpacetimeDB bindings into $OUT_DIR"
