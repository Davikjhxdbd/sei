UPDATE modules SET active = false, updated_at = now() WHERE key = 'studio';

INSERT INTO modules (key, name, description, icon, color, route, active, sort_order, allowed_roles, settings)
VALUES
('studio_production', 'Central de produção', 'Projetos, demandas e acompanhamento da produção audiovisual.', 'Clapperboard', '#C4A66A', '/m/studio/production', true, 11, ARRAY['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[], '{}'::jsonb),
('studio_events', 'Eventos', 'Planejamento e gestão dos eventos da operação.', 'CalendarDays', '#80A7A0', '/m/studio/events', true, 12, ARRAY['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[], '{}'::jsonb),
('studio_checklists', 'Checklists', 'Execução e acompanhamento dos processos operacionais.', 'ListChecks', '#A58ACB', '/m/studio/checklists', true, 13, ARRAY['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[], '{}'::jsonb),
('studio_reports', 'Relatórios', 'Relatórios de execução, revisão e resultados.', 'FileText', '#B9955B', '/m/studio/reports', true, 14, ARRAY['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[], '{}'::jsonb),
('studio_errors', 'Erros', 'Registro e acompanhamento de falhas e ajustes.', 'Bug', '#C78B80', '/m/studio/errors', true, 15, ARRAY['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[], '{}'::jsonb),
('studio_occurrences', 'Ocorrências', 'Registro e gestão de ocorrências operacionais.', 'Gavel', '#C78B80', '/m/studio/occurrences', true, 16, ARRAY['studio_lead','senior_lead','sysadmin']::user_role[], '{}'::jsonb),
('studio_problems', 'Problemas', 'Acompanhamento de problemas e planos de resolução.', 'Layers', '#A58ACB', '/m/studio/problems', true, 17, ARRAY['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[], '{}'::jsonb),
('studio_schedules', 'Escalas', 'Organização de equipes, horários e responsabilidades.', 'Users', '#80A7A0', '/m/studio/schedules', true, 18, ARRAY['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[], '{}'::jsonb),
('studio_media', 'Acervo de mídia', 'Cadastro, organização e histórico dos arquivos de mídia.', 'Film', '#B9955B', '/m/studio/media', true, 19, ARRAY['member','sector_lead','studio_lead','senior_lead','sysadmin']::user_role[], '{}'::jsonb),
('studio_presets', 'Presets de eventos', 'Modelos e configurações reutilizáveis de eventos.', 'CalendarDays', '#A58ACB', '/m/studio/presets', true, 20, ARRAY['studio_lead','senior_lead','sysadmin']::user_role[], '{}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  route = EXCLUDED.route,
  active = true,
  sort_order = EXCLUDED.sort_order,
  allowed_roles = EXCLUDED.allowed_roles,
  updated_at = now();
