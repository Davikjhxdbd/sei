-- Departamentos próprios do Estúdio, separados dos setores gerais da igreja.
create table studio_departments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into studio_departments (slug, name, description, sort_order) values
('transmissao', 'Transmissão', 'Operação e transmissão dos cultos e eventos.', 1),
('slide', 'Slide', 'Apresentações, letras e conteúdo visual dos cultos.', 2),
('audiovisual', 'Audiovisual', 'Captação, edição e produção de vídeos.', 3),
('fotos', 'Fotos', 'Fotografia, seleção e tratamento de imagens.', 4),
('design', 'Design', 'Identidade visual, artes e peças gráficas.', 5)
on conflict (slug) do nothing;

-- Equipe vinculada diretamente a cada departamento.
create table studio_department_members (
  department_id uuid not null references studio_departments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  function text,
  created_at timestamptz not null default now(),
  primary key (department_id, user_id)
);

-- A produção mantém suas áreas e tarefas atuais, agora agrupadas por departamento.
alter table production_areas
  add column studio_department_id uuid references studio_departments(id);

update production_areas
   set studio_department_id = (
     select id from studio_departments where slug = 'audiovisual'
   )
 where studio_department_id is null;

create index production_areas_department_idx
  on production_areas(studio_department_id);

-- Escalas continuam ligadas aos eventos gerais, mas podem pertencer a um departamento.
alter table schedules
  add column studio_department_id uuid references studio_departments(id);

create index schedules_department_idx
  on schedules(studio_department_id, event_id);

-- Biblioteca passa a identificar o departamento responsável pelo registro.
alter table media_records
  add column studio_department_id uuid references studio_departments(id);

create index media_records_department_idx
  on media_records(studio_department_id, service_date desc);
