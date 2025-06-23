#!/bin/bash

# Created by Steve Merschel 2025
#
# Copyright © 2025 PREVENTICUS GmbH
#
# Redistribution and use in source and binary forms, with or without modification,
# are permitted provided that the following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# 3. Neither the name of the copyright holder nor the names of its contributors
#    may be used to endorse or promote products derived from this software without
#    specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
# ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
# ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
# ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

set -euo pipefail
pwd

REPO_URL="https://github.com/preventicus/pcore.git"
TMP_DIR="./tmp-pcore"
PROTO_DIR="$TMP_DIR/protobuf_definitions"
PROTO_FILE="pcore.proto"
OUT_DIR="./src/generated/pcore"
DEFAULT_VERSION="0.0.0"
OUT_FILE="$OUT_DIR/pcoreVersion.ts"
VERSION_FILE=".pcore-version"

if [ ! -f "$VERSION_FILE" ]; then
    echo "❌ Error: Version file $VERSION_FILE not found." >&2
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
    echo "❌ Tag '$SPECIFIED_TAG' not found." >&2
    exit 1
}

VERSION="${SPECIFIED_TAG#v}"
cd - > /dev/null

echo ">> Cleaning output directory..."
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
ls -ld "$OUT_DIR"
echo "DEBUG: Absolut Path: $(readlink -f "$OUT_DIR")"

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
