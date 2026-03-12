-- Cross-device pairing tokens for Android/iOS satellite clients.
-- Store only hashed bearer tokens; the raw token is returned once at creation time.
CREATE TABLE IF NOT EXISTS cross_device_pairing_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    token_preview TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    revoked_at TEXT,
    last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cross_device_pairing_tokens_created_at
    ON cross_device_pairing_tokens(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cross_device_pairing_tokens_active
    ON cross_device_pairing_tokens(token_hash, revoked_at);
