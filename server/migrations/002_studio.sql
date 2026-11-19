-- =====================================================================
-- MMV CONNECT :: 002 :: MÓDULO GESTÃO DO ESTÚDIO
-- Dados operacionais do módulo. Nenhuma duplicação de usuário/auth.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Eventos e presets
-- ---------------------------------------------------------------------
create type event_status as enum ('scheduled', 'completed', 'cancelled');

create table events (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null default 'Culto',
  starts_at  timestamptz not null,
  ends_at    timestamptz,
  notes      text,
  status     event_status not null default 'scheduled',
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_starts_idx on events (starts_at desc);
create index events_status_idx on events (status);

create table event_presets (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null default 'Culto',
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time   time,
  notes      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Checklists: modelos + execuções + tarefas + histórico
-- ---------------------------------------------------------------------
create table checklist_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  sector_id   uuid references sectors(id),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table checklist_template_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references checklist_templates(id) on delete cascade,
  title       text not null,
  description text,
  sort_order  integer not null default 0
);
create index checklist_template_items_idx on checklist_template_items (template_id, sort_order);

create type checklist_run_status as enum ('open', 'completed', 'cancelled');

create table checklist_runs (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  template_id uuid references checklist_templates(id),
  name        text not null,
  status      checklist_run_status not null default 'open',
  created_by  uuid references users(id),
  created_at  timestamptz not null default now()
);
create index checklist_runs_event_idx on checklist_runs (event_id);

create type task_status as enum ('pending', 'done', 'blocked');

create table checklist_tasks (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references checklist_runs(id) on delete cascade,
  sector_id   uuid references sectors(id),
  assignee_id uuid references users(id),
  title       text not null,
  description text,
  status      task_status not null default 'pending',
  notes       text,
  block_reason text,
  sort_order  integer not null default 0,
  completed_at timestamptz,
  completed_by uuid references users(id),
  updated_at  timestamptz not null default now()
);
create index checklist_tasks_run_idx on checklist_tasks (run_id, sort_order);
create index checklist_tasks_assignee_idx on checklist_tasks (assignee_id, status);

create table checklist_task_history (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references checklist_tasks(id) on delete cascade,
  action      text not null,
  from_status task_status,
  to_status   task_status,
  user_id     uuid references users(id),
  notes       text,
  created_at  timestamptz not null default now()
);
create index checklist_task_history_idx on checklist_task_history (task_id, created_at desc);

-- ---------------------------------------------------------------------
-- Relatórios de evento com seções e histórico de revisão
-- ---------------------------------------------------------------------
create type report_status as enum ('draft', 'in_review', 'finalized');

create table event_reports (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  title        text not null,
  status       report_status not null default 'draft',
  created_by   uuid references users(id),
  reviewer_id  uuid references users(id),
  reviewed_at  timestamptz,
  finalized_by uuid references users(id),
  finalized_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index event_reports_event_idx on event_reports (event_id);

create table report_sections (
  id             uuid primary key default gen_random_uuid(),
  report_id      uuid not null references event_reports(id) on delete cascade,
  title          text not null,
  content        text,
  author_id      uuid references users(id),
  not_applicable boolean not null default false,
  sort_order     integer not null default 0,
  updated_at     timestamptz not null default now()
);
create index report_sections_idx on report_sections (report_id, sort_order);

create table report_history (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references event_reports(id) on delete cascade,
  user_id    uuid references users(id),
  action     text not null,
  from_status report_status,
  to_status  report_status,
  notes      text,
  created_at timestamptz not null default now()
);
create index report_history_idx on report_history (report_id, created_at desc);

-- ---------------------------------------------------------------------
-- Erros operacionais
-- ---------------------------------------------------------------------
create type error_status as enum ('open', 'in_analysis', 'resolved', 'closed');
create type severity_level as enum ('low', 'medium', 'high', 'critical');

create table operational_errors (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid references events(id) on delete set null,
  sector_id         uuid references sectors(id) on delete set null,
  category          text not null,
  severity          severity_level not null default 'medium',
  impact            text,
  occurred_at       timestamptz not null default now(),
  description       text not null,
  immediate_action  text,
  stage             text,
  status            error_status not null default 'open',
  follow_up_user_id uuid references users(id),
  report_id         uuid references event_reports(id) on delete set null,
  problem_id        uuid,
  created_by        uuid references users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index operational_errors_status_idx on operational_errors (status, occurred_at desc);
create index operational_errors_event_idx on operational_errors (event_id);

create table error_notes (
  id         uuid primary key default gen_random_uuid(),
  error_id   uuid not null references operational_errors(id) on delete cascade,
  note       text not null,
  user_id    uuid references users(id),
  created_at timestamptz not null default now()
);
create index error_notes_idx on error_notes (error_id, created_at desc);

-- ---------------------------------------------------------------------
-- Ocorrências administrativas
-- ---------------------------------------------------------------------
create type occurrence_status as enum ('registered', 'under_review', 'closed');

create table occurrences (
  id           uuid primary key default gen_random_uuid(),
  person_name  text not null,
  person_id    uuid references users(id) on delete set null,
  type         text not null,
  description  text not null,
  event_id     uuid references events(id) on delete set null,
  action_taken text,
  penalty      text,
  status       occurrence_status not null default 'registered',
  created_by   uuid references users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index occurrences_created_idx on occurrences (created_at desc);

-- ---------------------------------------------------------------------
-- Problemas, atualizações, soluções e autorizações
-- ---------------------------------------------------------------------
create type problem_status as enum (
  'open', 'in_analysis', 'solution_proposed', 'awaiting_authorization',
  'in_progress', 'resolved', 'cancelled'
);

create table problems (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  title              text not null,
  description        text not null,
  identified_at      date not null default current_date,
  identified_by      uuid references users(id),
  sector_id          uuid references sectors(id) on delete set null,
  event_id           uuid references events(id) on delete set null,
  category           text,
  impact             text,
  urgency            severity_level not null default 'medium',
  priority           severity_level not null default 'medium',
  status             problem_status not null default 'open',
  owner_id           uuid references users(id) on delete set null,
  root_cause         text,
  cause_confirmed_by uuid references users(id) on delete set null,
  cause_confirmed_at timestamptz,
  resolution_due     date,
  final_result       text,
  created_by         uuid references users(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index problems_status_idx on problems (status, created_at desc);

alter table operational_errors
  add constraint operational_errors_problem_fk
  foreign key (problem_id) references problems(id) on delete set null;

create table problem_updates (
  id          uuid primary key default gen_random_uuid(),
  problem_id  uuid not null references problems(id) on delete cascade,
  user_id     uuid references users(id),
  kind        text not null default 'comment',
  body        text not null,
  from_status problem_status,
  to_status   problem_status,
  created_at  timestamptz not null default now()
);
create index problem_updates_idx on problem_updates (problem_id, created_at desc);

create table problem_solutions (
  id                     uuid primary key default gen_random_uuid(),
  problem_id             uuid not null references problems(id) on delete cascade,
  description            text not null,
  rationale              text,
  resources              text,
  risks                  text,
  expected_effects       text,
  executors              text,
  test_method            text,
  success_criteria       text,
  rollback_plan          text,
  requires_authorization boolean not null default false,
  status                 text not null default 'proposed',
  created_by             uuid references users(id),
  created_at             timestamptz not null default now()
);
create index problem_solutions_idx on problem_solutions (problem_id);

create type authorization_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table authorization_requests (
  id           uuid primary key default gen_random_uuid(),
  problem_id   uuid not null references problems(id) on delete cascade,
  solution_id  uuid references problem_solutions(id) on delete set null,
  requested_by uuid references users(id),
  scope        text not null,
  deciders     uuid[] not null default '{}'::uuid[],
  due_at       date,
  status       authorization_status not null default 'pending',
  decided_by   uuid references users(id),
  decision_note text,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index auth_requests_problem_idx on authorization_requests (problem_id, status);

-- ---------------------------------------------------------------------
-- Escalas: designações, histórico e confirmação de prontidão
-- ---------------------------------------------------------------------
create type assignment_status as enum ('draft', 'published', 'ended', 'cancelled');

create table schedules (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  sector_id    uuid references sectors(id) on delete set null,
  role_title   text not null,
  user_id      uuid references users(id) on delete set null,
  instructions text,
  call_time    timestamptz,
  status       assignment_status not null default 'draft',
  created_by   uuid references users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index schedules_event_idx on schedules (event_id, status);
create index schedules_user_idx on schedules (user_id, status);

create table schedule_history (
  id           uuid primary key default gen_random_uuid(),
  schedule_id  uuid not null references schedules(id) on delete cascade,
  changed_by   uuid references users(id),
  from_user_id uuid references users(id) on delete set null,
  to_user_id   uuid references users(id) on delete set null,
  action       text not null default 'reassigned',
  reason       text,
  created_at   timestamptz not null default now()
);
create index schedule_history_idx on schedule_history (schedule_id, created_at desc);

create type readiness_state as enum ('ready', 'attention', 'unavailable');

create table readiness_confirmations (
  id          uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  state       readiness_state not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index readiness_schedule_idx on readiness_confirmations (schedule_id, created_at desc);

-- ---------------------------------------------------------------------
-- Acervo de mídia (cultos gravados e transmitidos)
-- ---------------------------------------------------------------------
create type media_status as enum (
  'awaiting_edit', 'in_edit', 'awaiting_publication',
  'published', 'reported_lost', 'not_found'
);

create table media_records (
  id                uuid primary key default gen_random_uuid(),
  service_date      date not null,
  service_time      time,
  preacher          text,
  event_name        text,
  record_type       text not null default 'Gravação',
  status            media_status not null default 'awaiting_edit',
  editor_id         uuid references users(id) on delete set null,
  publisher_id      uuid references users(id) on delete set null,
  status_reported_by uuid references users(id) on delete set null,
  platform          text,
  published_url     text,
  notes             text,
  created_by        uuid references users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index media_status_idx on media_records (status, service_date desc);
create index media_date_idx on media_records (service_date desc);
create index media_preacher_idx on media_records (lower(preacher));

create table media_history (
  id          uuid primary key default gen_random_uuid(),
  media_id    uuid not null references media_records(id) on delete cascade,
  user_id     uuid references users(id),
  from_status media_status,
  to_status   media_status,
  comment     text,
  created_at  timestamptz not null default now()
);
create index media_history_idx on media_history (media_id, created_at desc);
