insert into production_areas (slug, name, description, studio_department_id)
select
  'departamento-' || d.slug,
  d.name || ' — Demandas gerais',
  'Demandas e atividades gerais do departamento ' || d.name || '.',
  d.id
from studio_departments d
where d.active = true
  and not exists (
    select 1 from production_areas a
    where a.slug = 'departamento-' || d.slug
  )
on conflict (slug) do nothing;
