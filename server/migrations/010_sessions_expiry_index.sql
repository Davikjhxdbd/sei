-- Supports efficient cleanup of expired opaque sessions.
create index if not exists sessions_expiry_idx
  on sessions (expires_at);
