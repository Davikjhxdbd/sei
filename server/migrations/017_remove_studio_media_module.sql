-- MMV CREATIVE: não existe módulo independente de Acervo.
-- Arquivos e anexos permanecem vinculados aos fluxos de produção do Studio.
UPDATE modules
SET active = false, updated_at = now()
WHERE key = 'studio_media';
