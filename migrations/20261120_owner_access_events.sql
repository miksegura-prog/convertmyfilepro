-- Owner access grants and revocations, separate from single-use invitation tokens.
-- Safe to run after the existing pro_beta_invites table has been created.
CREATE TABLE IF NOT EXISTS pro_beta_access_events (
  id TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('revoke', 'reactivate', 'grant')),
  months INTEGER,
  previous_expires_at INTEGER,
  new_expires_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (invite_id) REFERENCES pro_beta_invites(id)
);

CREATE INDEX IF NOT EXISTS pro_beta_access_events_recent_idx
  ON pro_beta_access_events(created_at DESC);
CREATE INDEX IF NOT EXISTS pro_beta_access_events_invite_idx
  ON pro_beta_access_events(invite_id, created_at DESC);
