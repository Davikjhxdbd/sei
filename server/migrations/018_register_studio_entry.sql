-- Register the consolidated Studio entry point without creating demo users.
insert into modules
  (key, name, description, icon, color, route, active, sort_order, allowed_roles, settings)
values
  ('studio', 'MMV Studio',
   'Central de operação dos departamentos criativos e produção audiovisual.',
   'Clapperboard', '#C4A66A', '/m/studio', true, 10,
   array['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[],
   '{"accent":"champagne","area":"creative"}'::jsonb)
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    route = excluded.route,
    active = true,
    sort_order = excluded.sort_order,
    allowed_roles = excluded.allowed_roles,
    settings = modules.settings || excluded.settings,
    updated_at = now();
