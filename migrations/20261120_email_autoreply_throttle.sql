-- Rate-limited Email Worker auto-acknowledgements.
-- Only SHA-256 of sender addresses and daily throttle keys are persisted;
-- the original email body, subject and attachment are never stored.
CREATE TABLE IF NOT EXISTS email_autoreply_throttle (
  throttle_key TEXT PRIMARY KEY,
  last_attempt_at INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS email_autoreply_throttle_last_attempt
  ON email_autoreply_throttle(last_attempt_at);
