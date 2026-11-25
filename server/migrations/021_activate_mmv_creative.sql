-- Re-enable only the consolidated MMV Creative entry point.
-- Legacy studio* modules remain retired; operational records are preserved.
UPDATE modules
   SET name = 'MMV Creative',
       description = 'Central integrada dos departamentos criativos e da produção audiovisual.',
       route = '/m/studio',
       active = true,
       updated_at = now()
 WHERE key = 'studio';
