#!/bin/bash
set -e

# Clean up any existing bundle
rm -rf src-tauri/target/release/bundle

# Build without signing
bun tauri build --config src-tauri/tauri.prod.conf.json --no-sign "$@"

# Strip extended attributes from all files in the bundle
APP_PATH="src-tauri/target/release/bundle/macos/MRnObrainer.app"
xattr -cr "$APP_PATH"

if [[ "${SKIP_CODESIGN:-0}" == "1" ]]; then
  echo "Skipping codesign because SKIP_CODESIGN=1."
  exit 0
fi

# Sign the app manually when a local Apple identity is available.
IDENTITY="${CODESIGN_IDENTITY:-}"
if [[ -z "$IDENTITY" ]]; then
  IDENTITY="$(
    security find-identity -v -p codesigning 2>/dev/null \
      | sed -n 's/.*"\(Apple Development:.*\)"/\1/p' \
      | head -n 1
  )"
fi

if [[ -z "$IDENTITY" ]]; then
  echo "No Apple Development signing identity found. Built unsigned app at: $APP_PATH"
  exit 0
fi

codesign --force --deep --sign "$IDENTITY" "$APP_PATH"

echo "Build completed successfully!"
