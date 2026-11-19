-- ConvertMyFilePro: 90-day Pro Beta invitations.
-- Only SHA-256 token/session hashes are persisted; original links are not stored.
CREATE TABLE IF NOT EXISTS pro_beta_invites (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  note TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  redeemed_at INTEGER,
  expires_at INTEGER,
  revoked_at INTEGER,
  session_hash TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS pro_beta_invites_session_idx ON pro_beta_invites(session_hash);
CREATE INDEX IF NOT EXISTS pro_beta_invites_created_idx ON pro_beta_invites(created_at DESC);
