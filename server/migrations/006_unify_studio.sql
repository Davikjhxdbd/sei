
UPDATE modules SET active = false, updated_at = now()
WHERE key LIKE 'studio\\_%';

UPDATE modules SET active = true, name = 'Estúdio',
description = 'Central de operação dos setores criativos.',
route = '/m/studio', updated_at = now()
WHERE key = 'studio';
