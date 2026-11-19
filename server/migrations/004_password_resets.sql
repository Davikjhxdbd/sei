create table password_resets (
  token_hash char(64) primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index password_resets_user_idx
  on password_resets(user_id);

create index password_resets_expiry_idx
  on password_resets(expires_at);
