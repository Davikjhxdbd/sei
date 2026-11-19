-- Shared authentication throttling across API instances.
create table if not exists auth_rate_limits (
  bucket_hash char(64) primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null,
  expires_at timestamptz not null
);

create index if not exists auth_rate_limits_expiry_idx
  on auth_rate_limits (expires_at);
