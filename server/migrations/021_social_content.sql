-- Social media editorial planning inside the Communication workspace.
create table if not exists social_content_items (
  id uuid primary key default gen_random_uuid(),
  title varchar(180) not null,
  platform varchar(24) not null check (platform in ('Instagram','YouTube','Facebook','TikTok','Site')),
  format varchar(24) not null check (format in ('Reel','Post','Story','Carrossel','Live','Short','Vídeo','Outro')),
  campaign varchar(180),
  caption text,
  scheduled_at timestamptz,
  status varchar(16) not null default 'idea'
    check (status in ('idea','draft','production','review','approved','scheduled','published','archived')),
  assigned_to uuid references users(id) on delete set null,
  created_by uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_content_schedule_idx
  on social_content_items (scheduled_at asc nulls last, status);
create index if not exists social_content_assignee_idx
  on social_content_items (assigned_to, status, updated_at desc);
