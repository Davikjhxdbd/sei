-- Replace the generic departments entry with the audiovisual production workspace.
UPDATE modules SET active = false, updated_at = now() WHERE key = 'departments';

INSERT INTO modules
  (key, name, description, icon, color, route, active, sort_order, allowed_roles, settings)
VALUES
  ('production', 'Produção Audiovisual',
   'Central de equipes, demandas e entregas da produção audiovisual.',
   'Clapperboard', '#C4A66A', '/m/production', true, 10,
   ARRAY['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[],
   '{"accent":"champagne","area":"creative"}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description,
    icon = EXCLUDED.icon, color = EXCLUDED.color, route = EXCLUDED.route,
    active = true, sort_order = EXCLUDED.sort_order,
    allowed_roles = EXCLUDED.allowed_roles,
    settings = modules.settings || EXCLUDED.settings, updated_at = now();
