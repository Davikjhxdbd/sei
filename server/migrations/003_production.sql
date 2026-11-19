create table production_areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table production_members (
  area_id uuid not null references production_areas(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  function text not null,
  created_at timestamptz not null default now(),
  primary key (area_id, user_id, function)
);

create table production_tasks (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references production_areas(id),
  title text not null,
  description text,
  status text not null default 'planning'
    check (status in ('planning','recording','editing','review','published')),
  assigned_to uuid references users(id) on delete set null,
  recording_date date,
  due_date date,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index production_tasks_area_idx on production_tasks(area_id);
create index production_tasks_assignee_idx on production_tasks(assigned_to);
create index production_tasks_due_idx on production_tasks(due_date);

create table production_task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references production_tasks(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

insert into production_areas (slug, name, description) values
('reels-domingo', 'Reels de Domingo', 'Captação e edição dos conteúdos dos cultos de domingo.'),
('forte-corajosa', 'Forte e Corajosa', 'Cobertura audiovisual dos cultos e trabalhos.'),
('reels-segunda-quarta', 'Reels de Segunda e Quarta', 'Produção de conteúdo dos cultos de segunda e quarta.'),
('praca-se', 'Praça da Sé', 'Cobertura e produção audiovisual dos trabalhos na Praça da Sé.'),
('resgate-almas', 'Resgate de Almas', 'Registro e produção dos conteúdos do Resgate de Almas.')
on conflict (slug) do nothing;

-- Responsáveis iniciais. Os vínculos são feitos pelas contas existentes.
insert into production_members (area_id, user_id, function)
select a.id, u.id, v.function
from (values
  ('reels-domingo', 'Maria Fernanda', 'Captação'),
  ('reels-domingo', 'Evelyn', 'Captação'),
  ('reels-domingo', 'Davi', 'Edição'),
  ('forte-corajosa', 'Evelyn', 'Produção audiovisual'),
  ('reels-segunda-quarta', 'Leonardo', 'Produção e edição'),
  ('praca-se', 'Davi', 'Produção audiovisual'),
  ('resgate-almas', 'Leonardo', 'Produção audiovisual')
) as v(slug, person, function)
join production_areas a on a.slug = v.slug
join users u on lower(u.full_name) like lower(v.person) || '%'
on conflict do nothing;
