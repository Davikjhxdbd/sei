-- Keep legacy studio modules retired, but expose the consolidated MMV Creative entry point.
INSERT INTO modules
  (key, name, description, icon, color, route, active, sort_order, allowed_roles, settings)
VALUES
  ('studio', 'MMV Creative',
   'Central integrada dos departamentos criativos e da produção audiovisual.',
   'Clapperboard', '#C4A66A', '/m/studio', true, 10,
   ARRAY['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[],
   '{}'::jsonb)
ON CONFLICT (key) DO UPDATE
   SET name = EXCLUDED.name,
       description = EXCLUDED.description,
       icon = EXCLUDED.icon,
       color = EXCLUDED.color,
       route = EXCLUDED.route,
       active = true,
       sort_order = EXCLUDED.sort_order,
       allowed_roles = EXCLUDED.allowed_roles,
       settings = EXCLUDED.settings,
       updated_at = now();
