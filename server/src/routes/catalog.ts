import { Router } from 'express';
import { asyncHandler } from '../http';

const router = Router();

/** Catálogo compartilhado por toda a plataforma (setores, pessoas, opções). */
export const OPTION_DEFAULTS: Record<string, string[]> = {
  event_types: ['Culto', 'Ensaio', 'Gravação', 'Transmissão', 'Reunião', 'Treinamento'],
  error_categories: [
    'Técnica',
    'Operacional',
    'Comunicação',
    'Conteúdo',
    'Infraestrutura',
    'Pessoas',
  ],
  occurrence_types: [
    'Atraso',
    'Ausência',
    'Conduta',
    'Não cumprimento de escala',
    'Dano material',
    'Reconhecimento',
  ],
  media_platforms: ['YouTube', 'Instagram', 'Facebook', 'Site', 'Spotify'],
  record_types: ['Gravação', 'Transmissão', 'Gravação e transmissão'],
  report_sections: [
    'Abertura',
    'Execução do evento',
    'Ocorrências',
    'Avaliação da equipe',
    'Conclusão',
  ],
};

router.get(
  '/options',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select key, value from settings where category = 'options'`,
    );
    const result: Record<string, string[]> = { ...OPTION_DEFAULTS };
    for (const row of rows) {
      if (Array.isArray(row.value)) result[row.key] = row.value;
    }
    res.json(result);
  }),
);

router.get(
  '/departments',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(`select d.id, d.slug, d.name, d.description, (select count(*)::int from studio_department_members m join users u on u.id = m.user_id where m.department_id = d.id and u.status = 'active') as member_count from studio_departments d where d.active = true order by d.sort_order, d.name`);
    res.json({ items: rows });
  }),
);

router.get(
  '/sectors',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select s.id, s.key, s.name, s.description, s.active,
              (select count(*)::int from user_sectors us join users u on u.id = us.user_id
                where us.sector_id = s.id and u.status = 'active') as member_count
         from sectors s where s.active = true order by s.name`,
    );
    res.json({ items: rows });
  }),
);

router.get(
  '/people',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select u.id, u.full_name,
              case when $1::int >= 5 then u.username else null end as username,
              coalesce((
                select json_agg(json_build_object('id', s.id, 'name', s.name) order by s.name)
                  from user_sectors us join sectors s on s.id = us.sector_id
                 where us.user_id = u.id and s.active = true
              ), '[]'::json) as sectors
         from users u where u.status = 'active'
         order by u.full_name limit 500`,
      [req.user.level],
    );
    res.json({ items: rows });
  }),
);

export default router;
