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

# Generates src/generated/pcore/ from the pcore.proto of the tag named in .pcore-version.
# A tag is only a name that can be moved to another commit, so the tag must point to the
# commit named in .pcore-commit. Otherwise the same tag could silently yield different code.
# The code is generated in a temporary directory and replaces the existing one only after
# everything has succeeded, so a failure (e.g. no network) leaves the project untouched.

REPO_URL="https://github.com/preventicus/pcore.git"
PROTO_FILE="pcore.proto"
OUT_DIR="./src/generated/pcore"
VERSION_FILE=".pcore-version"
COMMIT_FILE=".pcore-commit"

for FILE in "$VERSION_FILE" "$COMMIT_FILE"; do
    if [ ! -f "$FILE" ]; then
        echo "❌ Error: File $FILE not found." >&2
        exit 1
    fi
done

SPECIFIED_TAG=$(cat "$VERSION_FILE")
EXPECTED_COMMIT=$(tr -d '[:space:]' < "$COMMIT_FILE")

# removed on every exit, also after an error
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pcore-generate.XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT

CLONE_DIR="$WORK_DIR/pcore"
PROTO_DIR="$CLONE_DIR/protobuf_definitions"
NEW_OUT_DIR="$WORK_DIR/generated"

echo ">> Cloning repository from $REPO_URL..."
git clone "$REPO_URL" "$CLONE_DIR"

echo ">> Checking out tag: $SPECIFIED_TAG"
git -C "$CLONE_DIR" -c advice.detachedHead=false checkout "tags/$SPECIFIED_TAG" || {
    echo "❌ Tag '$SPECIFIED_TAG' not found." >&2
    exit 1
}

ACTUAL_COMMIT=$(git -C "$CLONE_DIR" rev-parse HEAD)
if [ "$ACTUAL_COMMIT" != "$EXPECTED_COMMIT" ]; then
    echo "❌ Tag '$SPECIFIED_TAG' points to commit $ACTUAL_COMMIT, but $COMMIT_FILE expects $EXPECTED_COMMIT." >&2
    echo "   If the tag was moved on purpose, compare both commits in the spec repository and update $COMMIT_FILE." >&2
    exit 1
fi

VERSION="${SPECIFIED_TAG#v}"

echo ">> Compiling proto file with protobuf-ts..."
mkdir -p "$NEW_OUT_DIR"
PATH="./node_modules/.bin:$PATH" protoc \
  --ts_out="$NEW_OUT_DIR" \
  --ts_opt=long_type_number \
  --ts_opt=optimize_code_size \
  --proto_path="$PROTO_DIR" \
  "$PROTO_DIR/$PROTO_FILE"

IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
MAJOR=$((10#$MAJOR))
MINOR=$((10#$MINOR))
PATCH=$((10#$PATCH))

cat <<EOF > "$NEW_OUT_DIR/pcoreVersion.ts"
// This file is auto-generated. Do not modify manually.
export const PcoreVersion = {
    major: ${MAJOR},
    minor: ${MINOR},
    patch: ${PATCH}
};
EOF

echo ">> Replacing output directory..."
rm -rf "$OUT_DIR"
mkdir -p "$(dirname "$OUT_DIR")"
mv "$NEW_OUT_DIR" "$OUT_DIR"

echo "✅ Proto generation complete: $OUT_DIR"
