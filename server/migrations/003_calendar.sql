create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'Compromisso',
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  created_by uuid references users(id),
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_event_dates_check
    check (ends_at is null or ends_at >= starts_at)
);

create index if not exists calendar_events_starts_at_idx
  on calendar_events (starts_at);

create index if not exists calendar_events_category_idx
  on calendar_events (category);
