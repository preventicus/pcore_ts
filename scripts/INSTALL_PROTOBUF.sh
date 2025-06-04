#!/bin/bash
set -euo pipefail

REPO_URL="https://github.com/preventicus/pcore.git"
TMP_DIR="./tmp-pcore"
PROTO_DIR="$TMP_DIR/protobuf_definitions"
PROTO_FILE="pcore.proto"
OUT_DIR="../generated/pcore"
DEFAULT_VERSION="0.0.0"
OUT_FILE="$OUT_DIR/pcoreVersion.ts"
VERSION_FILE="../.pcore-version"

if [ ! -f "$VERSION_FILE" ]; then
    echo "❌ Fehler: Versionsdatei $VERSION_FILE nicht gefunden." >&2
    exit 1
fi

SPECIFIED_TAG=$(cat "$VERSION_FILE")

echo ">> Cloning repository from $REPO_URL..."
rm -rf "$TMP_DIR"
git clone "$REPO_URL" "$TMP_DIR"

cd "$TMP_DIR"
git config advice.detachedHead false

echo ">> Checking out tag: $SPECIFIED_TAG"
git checkout "tags/$SPECIFIED_TAG" || {
    echo "❌ Tag '$SPECIFIED_TAG' nicht gefunden." >&2
    exit 1
}

VERSION="${SPECIFIED_TAG#v}"
cd - > /dev/null

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

IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
MAJOR=$((10#$MAJOR))
MINOR=$((10#$MINOR))
PATCH=$((10#$PATCH))

cat <<EOF > "$OUT_FILE"
// This file is auto-generated. Do not modify manually.
export const PcoreVersion = {
    major: ${MAJOR},
    minor: ${MINOR},
    patch: ${PATCH}
};
EOF

echo ">> Cleaning up..."
rm -rf "$TMP_DIR"

echo "✅ Proto generation complete: $OUT_DIR"
