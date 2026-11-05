-- =====================================================================
-- MMV CONNECT :: 001 :: CAMADA GLOBAL DA PLATAFORMA
-- Identidade, hierarquia, setores, módulos, notificações, auditoria.
-- Nenhum dado de módulo específico nesta migração.
-- =====================================================================

create extension if not exists pgcrypto;

create type user_status as enum ('active', 'pending', 'suspended', 'inactive');
create type user_role   as enum ('member', 'sector_lead', 'studio_lead', 'senior_lead', 'sysadmin');

-- ---------------------------------------------------------------------
-- Identidade única de pessoa
-- ---------------------------------------------------------------------
create table users (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  username      text not null unique,
  email         text,
  password_hash text not null,
  status        user_status not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create unique index users_email_lower_uq on users (lower(email)) where email is not null;
create index users_status_idx on users (status);

-- ---------------------------------------------------------------------
-- Setores (estrutura global, compartilhada por todos os módulos)
-- ---------------------------------------------------------------------
create table sectors (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table user_roles (
  user_id    uuid not null references users(id) on delete cascade,
  role       user_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references users(id),
  primary key (user_id, role)
);

create table user_sectors (
  user_id   uuid not null references users(id) on delete cascade,
  sector_id uuid not null references sectors(id) on delete cascade,
  is_lead   boolean not null default false,
  primary key (user_id, sector_id)
);
create index user_sectors_sector_idx on user_sectors (sector_id);

-- ---------------------------------------------------------------------
-- Registro central de módulos
-- Um novo aplicativo aparece na central apenas por estar aqui + ativo.
-- ---------------------------------------------------------------------
create table modules (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  name          text not null,
  description   text,
  icon          text not null default 'Boxes',
  color         text not null default '#3B4FA0',
  route         text not null,
  active        boolean not null default false,
  sort_order    integer not null default 100,
  allowed_roles user_role[] not null default array['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[],
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Sessões (token opaco, httpOnly) — um único login para a plataforma
-- ---------------------------------------------------------------------
create table sessions (
  token      text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text
);
create index sessions_user_idx on sessions (user_id);

-- ---------------------------------------------------------------------
-- Notificações globais (reutilizáveis por qualquer módulo)
-- ---------------------------------------------------------------------
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  title      text not null,
  body       text,
  link       text,
  module_key text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Auditoria — trilha somente-inserção
-- ---------------------------------------------------------------------
create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references users(id),
  actor_name text,
  action     text not null,
  entity     text not null,
  entity_id  text,
  before     jsonb,
  after      jsonb,
  reason     text,
  module_key text,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);
create index audit_log_entity_idx on audit_log (entity, entity_id);

-- ---------------------------------------------------------------------
-- Configurações administráveis (listas de opções operacionais, etc.)
-- ---------------------------------------------------------------------
create table settings (
  key         text primary key,
  value       jsonb not null,
  label       text not null,
  description text,
  category    text not null default 'general',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references users(id)
);

-- ---------------------------------------------------------------------
-- Auxiliares de hierarquia / contexto do ator
-- ---------------------------------------------------------------------
create or replace function mmv_role_level(r text) returns integer
language sql immutable as $$
  select case r
    when 'member' then 1
    when 'sector_lead' then 2
    when 'studio_lead' then 3
    when 'senior_lead' then 4
    when 'sysadmin' then 5
    else 0 end;
$$;

create or replace function mmv_actor_level() returns integer
language sql stable as $$
  select coalesce(nullif(current_setting('mmv.actor_level', true), '')::int, 0);
$$;

create or replace function mmv_actor_id() returns uuid
language sql stable as $$
  select nullif(current_setting('mmv.actor_id', true), '')::uuid;
$$;

-- ---------------------------------------------------------------------
-- Guardas de banco (defesa em profundidade, além da API)
-- ---------------------------------------------------------------------

-- situação da conta: só liderança sênior / administrador
create or replace function mmv_guard_user_mutation() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if mmv_actor_level() < 5 then
      raise exception 'Apenas o administrador do sistema pode excluir contas.';
    end if;
    return old;
  end if;

  if new.status is distinct from old.status and mmv_actor_level() < 4 then
    raise exception 'Somente liderança sênior ou administrador pode alterar a situação da conta.';
  end if;

  return new;
end;
$$;

create trigger users_guard
before update or delete on users
for each row execute function mmv_guard_user_mutation();

-- cargos: só sysadmin, e nunca os próprios
create or replace function mmv_guard_user_roles() returns trigger
language plpgsql as $$
declare
  target uuid;
  actor  uuid := mmv_actor_id();
begin
  if mmv_actor_level() < 5 then
    raise exception 'Somente o administrador do sistema pode conceder ou remover cargos.';
  end if;

  target := case when tg_op = 'DELETE' then old.user_id else new.user_id end;

  if target = actor then
    raise exception 'Não é permitido alterar os próprios cargos.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger user_roles_guard
before insert or update or delete on user_roles
for each row execute function mmv_guard_user_roles();

-- auditoria imutável
create or replace function mmv_audit_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'Registros de auditoria são imutáveis.';
end;
$$;

create trigger audit_log_immutable
before update or delete on audit_log
for each row execute function mmv_audit_immutable();
