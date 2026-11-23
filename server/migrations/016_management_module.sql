-- MMV CREATIVE: official Management module.
insert into modules (key, name, description, icon, color, route, active, sort_order, allowed_roles, settings)
values (
  'management',
  'Gestão',
  'Administração institucional, estrutura, acessos, configurações e auditoria.',
  'ShieldCheck',
  '#C4A66A',
  '/admin',
  true,
  80,
  array['senior_lead','sysadmin']::user_role[],
  '{"accent":"champagne","area":"institutional"}'::jsonb
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
    settings = excluded.settings,
    updated_at = now();
