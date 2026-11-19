import { Router } from 'express';
import {
  asyncHandler,
  badRequest,
  notFound,
  optionalText,
  required,
  isoDate,
} from '../http';
import { audit } from '../audit';
import { tx } from '../db';

const router = Router();
const CATEGORIES = [
  'Culto',
  'Reunião',
  'Evento especial',
  'Gravação',
  'Compromisso',
  'Outros',
] as const;

function ensureAdmin(user: any) {
  if ((user?.level ?? 0) < 4) {
    const error = new Error('Apenas a liderança sênior e administradores podem gerenciar o calendário.');
    (error as any).status = 403;
    (error as any).code = 'forbidden';
    throw error;
  }
}

function eventData(body: any) {
  const title = required(body?.title, 'título', 160);
  const category = CATEGORIES.includes(body?.category) ? body.category : 'Outros';
  const startsAt = isoDate(body?.starts_at, 'início');
  const endsAt = body?.ends_at ? isoDate(body.ends_at, 'término') : null;

  if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw badRequest('O término precisa ser posterior ao início.');
  }

  return {
    title,
    category,
    startsAt,
    endsAt,
    description: optionalText(body?.description),
    location: optionalText(body?.location),
    allDay: Boolean(body?.all_day),
  };
}

router.get(
  '/',
  asyncHandler(async (req: any, res) => {
    const from = req.query.from ? isoDate(req.query.from, 'data inicial') : null;
    const to = req.query.to ? isoDate(req.query.to, 'data final') : null;

    const { rows } = await req.db.query(
      `select e.id, e.title, e.description, e.category, e.location,
              e.starts_at, e.ends_at, e.all_day, e.created_at, e.updated_at,
              u.full_name as created_by_name
         from calendar_events e
         left join users u on u.id = e.created_by
        where ($1::timestamptz is null or e.starts_at >= $1)
          and ($2::timestamptz is null or e.starts_at < $2)
        order by e.starts_at asc`,
      [from, to],
    );

    res.json({ items: rows });
  }),
);

router.post(
  '/',
  asyncHandler(async (req: any, res) => {
    ensureAdmin(req.user);
    const data = eventData(req.body);

    const event = await tx(req.db, async () => {
      const { rows } = await req.db.query(
        `insert into calendar_events
          (title, description, category, location, starts_at, ends_at, all_day, created_by, updated_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$8)
         returning *`,
        [
          data.title, data.description, data.category, data.location,
          data.startsAt, data.endsAt, data.allDay, req.user.id,
        ],
      );

      await audit(req.db, req.user, {
        action: 'calendar.event_created',
        entity: 'calendar_events',
        entityId: rows[0].id,
        after: rows[0],
        moduleKey: 'calendar',
      });
      return rows[0];
    });

    res.status(201).json({ event });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req: any, res) => {
    ensureAdmin(req.user);

    const data = eventData(req.body);
    const event = await tx(req.db, async () => {
      const { rows: beforeRows } = await req.db.query(
        'select * from calendar_events where id = $1 for update',
        [req.params.id],
      );
      if (!beforeRows.length) throw notFound('Evento não encontrado.');

      const { rows } = await req.db.query(
        `update calendar_events set
           title = $1, description = $2, category = $3, location = $4,
           starts_at = $5, ends_at = $6, all_day = $7,
           updated_by = $8, updated_at = now()
         where id = $9
         returning *`,
        [
          data.title, data.description, data.category, data.location,
          data.startsAt, data.endsAt, data.allDay, req.user.id, req.params.id,
        ],
      );

      await audit(req.db, req.user, {
        action: 'calendar.event_updated',
        entity: 'calendar_events',
        entityId: req.params.id,
        before: beforeRows[0],
        after: rows[0],
        moduleKey: 'calendar',
      });
      return rows[0];
    });

    res.json({ event });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: any, res) => {
    ensureAdmin(req.user);

    await tx(req.db, async () => {
      const { rows } = await req.db.query(
        'delete from calendar_events where id = $1 returning *',
        [req.params.id],
      );
      if (!rows.length) throw notFound('Evento não encontrado.');

      await audit(req.db, req.user, {
        action: 'calendar.event_deleted',
        entity: 'calendar_events',
        entityId: req.params.id,
        before: rows[0],
        moduleKey: 'calendar',
      });
    });

    res.json({ ok: true });
  }),
);

export default router;
