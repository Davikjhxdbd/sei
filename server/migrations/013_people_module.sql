-- Publish the institutional People directory as the first general-purpose module.
insert into modules (key, name, description, icon, color, route, active, sort_order, allowed_roles, settings)
values (
  'people',
  'Pessoas',
  'Diretório institucional de integrantes e seus departamentos.',
  'Users',
  '#8B7854',
  '/m/people',
  true,
  20,
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
