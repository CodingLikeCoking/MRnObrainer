#!/bin/bash
set -euo pipefail

BUILD_CHANNEL="${MRNOBRAINER_BUILD_CHANNEL:-prod}"

case "$BUILD_CHANNEL" in
  prod|stable)
    TAURI_CONFIG="src-tauri/tauri.prod.conf.json"
    APP_NAME="MRnObrainer"
    PRIMARY_IDENTITY_PREFIX="Developer ID Application:"
    FALLBACK_IDENTITY_PREFIX="Apple Development:"
    FEATURE_ARGS=(--features official-build)
    ;;
  dev)
    TAURI_CONFIG="src-tauri/tauri.conf.json"
    APP_NAME="MRnObrainer Dev"
    PRIMARY_IDENTITY_PREFIX="Apple Development:"
    FALLBACK_IDENTITY_PREFIX="Developer ID Application:"
    FEATURE_ARGS=()
    ;;
  *)
    echo "Unsupported MRNOBRAINER_BUILD_CHANNEL=$BUILD_CHANNEL (expected prod|stable|dev)" >&2
    exit 1
    ;;
esac

find_identity() {
  local prefix="$1"
  security find-identity -v -p codesigning 2>/dev/null \
    | sed -n "s/.*\"\\(${prefix}.*\\)\"/\\1/p" \
    | head -n 1
}

# Clean up any existing bundle
rm -rf src-tauri/target/release/bundle

# Build without signing; we sign manually below so stable/dev can choose different identities.
if [[ ${#FEATURE_ARGS[@]} -gt 0 ]]; then
  bun tauri build --config "$TAURI_CONFIG" "${FEATURE_ARGS[@]}" --no-sign "$@"
else
  bun tauri build --config "$TAURI_CONFIG" --no-sign "$@"
fi

APP_PATH="src-tauri/target/release/bundle/macos/${APP_NAME}.app"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Expected app bundle not found at: $APP_PATH" >&2
  exit 1
fi

# Strip extended attributes from all files in the bundle
xattr -cr "$APP_PATH" || echo "Note: xattr command not available or failed (non-fatal)"

if [[ "${SKIP_CODESIGN:-0}" == "1" ]]; then
  echo "Skipping codesign because SKIP_CODESIGN=1."
  exit 0
fi

IDENTITY="${CODESIGN_IDENTITY:-}"
if [[ -z "$IDENTITY" ]]; then
  IDENTITY="$(find_identity "$PRIMARY_IDENTITY_PREFIX")"
fi
if [[ -z "$IDENTITY" ]]; then
  IDENTITY="$(find_identity "$FALLBACK_IDENTITY_PREFIX")"
fi

if [[ -z "$IDENTITY" ]]; then
  echo "No matching Apple signing identity found for $BUILD_CHANNEL builds. Built unsigned app at: $APP_PATH"
  exit 0
fi

codesign --force --deep --sign "$IDENTITY" "$APP_PATH"

if [[ "$BUILD_CHANNEL" != "dev" && "${NOTARYTOOL_PROFILE:-}" != "" && "$IDENTITY" == Developer\ ID\ Application:* ]]; then
  xcrun notarytool submit "$APP_PATH" --keychain-profile "$NOTARYTOOL_PROFILE" --wait
  xcrun stapler staple "$APP_PATH"
fi

echo "Build completed successfully for $APP_NAME using identity: $IDENTITY"
