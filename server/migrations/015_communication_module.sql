-- Institutional announcements and per-user read tracking.
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users(id) on delete restrict,
  title varchar(180) not null,
  body text not null,
  priority varchar(16) not null default 'normal'
    check (priority in ('normal', 'important', 'urgent')),
  status varchar(16) not null default 'published'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists announcements_feed_idx
  on announcements (published_at desc, created_at desc)
  where status = 'published';

create table if not exists announcement_reads (
  announcement_id uuid not null references announcements(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);
create index if not exists announcement_reads_user_idx
  on announcement_reads (user_id, read_at desc);

insert into modules (key, name, description, icon, color, route, active, sort_order, allowed_roles, settings)
values (
  'communication',
  'Comunicação',
  'Comunicados institucionais e avisos oficiais em um único lugar.',
  'MessageSquare',
  '#82745A',
  '/m/communication',
  true,
  50,
  array['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[],
  '{"accent":"champagne"}'::jsonb
)
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    color = excluded.color,
    route = excluded.route,
    active = true,
    sort_order = excluded.sort_order,
    allowed_roles = excluded.allowed_roles,
    updated_at = now();
