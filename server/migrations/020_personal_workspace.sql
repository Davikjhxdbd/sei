-- Personal workspaces: private projects and tasks for each authenticated user.
create table if not exists personal_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  name varchar(140) not null,
  description text,
  status varchar(16) not null default 'active'
    check (status in ('active','paused','completed','archived')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists personal_projects_owner_idx
  on personal_projects (owner_id, status, updated_at desc);


create unique index if not exists personal_projects_id_owner_uq
  on personal_projects (id, owner_id);

create table if not exists personal_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  project_id uuid,
  title varchar(180) not null,
  description text,
  status varchar(16) not null default 'todo'
    check (status in ('todo','doing','waiting','done','archived')),
  priority varchar(12) not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_task_project_owner_fk
    foreign key (project_id, owner_id)
    references personal_projects(id, owner_id)
    on delete set null (project_id)
);
create index if not exists personal_tasks_owner_status_idx
  on personal_tasks (owner_id, status, due_date, created_at desc);
create index if not exists personal_tasks_project_idx
  on personal_tasks (project_id, status);
