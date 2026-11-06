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
  '/sectors',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select id, key, name, description, active
         from sectors where active = true order by name`,
    );
    res.json({ items: rows });
  }),
);

router.get(
  '/people',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select id, full_name, username
         from users where status = 'active'
         order by full_name limit 500`,
    );
    res.json({ items: rows });
  }),
);

export default router;
