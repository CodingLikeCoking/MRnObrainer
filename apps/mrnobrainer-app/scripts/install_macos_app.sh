#!/bin/bash
set -euo pipefail

BUILD_CHANNEL="${MRNOBRAINER_BUILD_CHANNEL:-prod}"

case "$BUILD_CHANNEL" in
  prod|stable)
    APP_NAME="MRnObrainer"
    ;;
  dev)
    APP_NAME="MRnObrainer Dev"
    ;;
  *)
    echo "Unsupported MRNOBRAINER_BUILD_CHANNEL=$BUILD_CHANNEL (expected prod|stable|dev)" >&2
    exit 1
    ;;
esac

APP_SRC="src-tauri/target/release/bundle/macos/${APP_NAME}.app"
APP_DST="/Applications/${APP_NAME}.app"
ARCHIVE_ROOT="${HOME}/.codex/archived-apps"
STAMP="$(date +%Y-%m-%dT%H-%M-%S)"
ARCHIVE_DIR="${ARCHIVE_ROOT}/$(echo "${APP_NAME}" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')-${STAMP}"

if [[ ! -d "$APP_SRC" ]]; then
  echo "Expected built app bundle not found at: $APP_SRC" >&2
  exit 1
fi

mkdir -p "$ARCHIVE_DIR"

osascript -e "tell application \"${APP_NAME}\" to quit" >/dev/null 2>&1 || true
sleep 2

if [[ -d "$APP_DST" ]]; then
  mv "$APP_DST" "$ARCHIVE_DIR/${APP_NAME}.app"
fi

cp -R "$APP_SRC" "$APP_DST"

/usr/libexec/PlistBuddy -c 'Print :CFBundleName' "$APP_DST/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_DST/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP_DST/Contents/Info.plist"
