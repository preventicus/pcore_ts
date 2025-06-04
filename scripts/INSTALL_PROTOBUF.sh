#!/bin/bash
set -euo pipefail

REPO_URL="https://github.com/preventicus/pcore.git"
TMP_DIR="./tmp-pcore"
PROTO_DIR="$TMP_DIR/protobuf_definitions"
PROTO_FILE="pcore.proto"
OUT_DIR="../generated/pcore"

echo ">> Cloning latest main branch from $REPO_URL..."
rm -rf "$TMP_DIR"
git clone --depth 1 --branch main "$REPO_URL" "$TMP_DIR"

echo ">> Cleaning output directory..."
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo ">> Compiling proto file with protobuf-ts..."
PATH="./node_modules/.bin:$PATH" protoc \
  --ts_out="$OUT_DIR" \
  --ts_opt=long_type_number \
  --ts_opt=optimize_code_size \
  --proto_path="$PROTO_DIR" \
  "$PROTO_DIR/$PROTO_FILE"

echo ">> Cleaning up..."
rm -rf "$TMP_DIR"

echo "✅ Proto generation complete: $OUT_DIR"
