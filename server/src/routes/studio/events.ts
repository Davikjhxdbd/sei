import { Router } from 'express';
import {
  asyncHandler,
  badRequest,
  forbidden,
  isoDate,
  like,
  notFound,
  oneOf,
  optionalText,
  paging,
  required,
} from '../../http';
import { assertAction, type Action } from '../../permissions';
import { audit } from '../../audit';

const router = Router();

const EVENT_STATUS = ['scheduled', 'completed', 'cancelled'] as const;

function ensure(user: any, action: Action) {
  assertAction(user.level, action);
}

router.get(
  '/events',
  asyncHandler(async (req: any, res) => {
    const { limit, offset } = paging(req.query);
    const status = EVENT_STATUS.includes(req.query.status) ? req.query.status : null;
    const search = like(req.query.q);
    const from = req.query.from ? isoDate(req.query.from, 'from') : null;
    const to = req.query.to ? isoDate(req.query.to, 'to') : null;

    const { rows } = await req.db.query(
      `select e.id, e.name, e.type, e.starts_at, e.ends_at, e.notes, e.status,
              e.created_at, u.full_name as created_by_name,
              (select count(*)::int from checklist_runs r where r.event_id = e.id) as checklist_runs,
              (select count(*)::int from event_reports rp where rp.event_id = e.id) as reports,
              (select count(*)::int from schedules s where s.event_id = e.id) as assignments
         from events e
         left join users u on u.id = e.created_by
        where ($1::text is null or e.status::text = $1)
          and ($2::timestamptz is null or e.starts_at >= $2)
          and ($3::timestamptz is null or e.starts_at <= $3)
          and ($4::text is null or e.name ilike $4)
        order by e.starts_at desc
        limit $5 offset $6`,
      [status, from, to, search, limit, offset],
    );

    const { rows: totals } = await req.db.query(
      `select count(*)::int as total from events
        where ($1::text is null or status::text = $1)`,
      [status],
    );

    res.json({ items: rows, total: totals[0]?.total ?? 0 });
  }),
);

router.post(
  '/events',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'events.create');
    const name = required(req.body?.name, 'nome do evento', 160);
    const type = optionalText(req.body?.type, 60) ?? 'Culto';
    const startsAt = isoDate(req.body?.starts_at, 'início');
    const endsAt = req.body?.ends_at ? isoDate(req.body.ends_at, 'término') : null;
    const notes = optionalText(req.body?.notes);

    const { rows } = await req.db.query(
      `insert into events (name, type, starts_at, ends_at, notes, created_by)
       values ($1, $2, $3, $4, $5, $6)
       returning id, name, type, starts_at, ends_at, notes, status`,
      [name, type, startsAt, endsAt, notes, req.user.id],
    );

    await audit(req.db, req.user, {
      action: 'event.created',
      entity: 'events',
      entityId: rows[0].id,
      after: rows[0],
      moduleKey: 'studio',
    });

    res.status(201).json({ event: rows[0] });
  }),
);

router.get(
  '/events/:id',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select e.*, u.full_name as created_by_name
         from events e left join users u on u.id = e.created_by
        where e.id = $1`,
      [req.params.id],
    );
    if (!rows.length) throw notFound('Evento não encontrado.');
    const event = rows[0];

    const runs = (
      await req.db.query(
        `select r.id, r.name, r.status, r.created_at,
                count(t.id)::int as tasks_total,
                count(t.id) filter (where t.status = 'done')::int as tasks_done,
                count(t.id) filter (where t.status = 'blocked')::int as tasks_blocked
           from checklist_runs r
           left join checklist_tasks t on t.run_id = r.id
          where r.event_id = $1
          group by r.id order by r.created_at`,
        [event.id],
      )
    ).rows;

    const reports = (
      await req.db.query(
        `select rp.id, rp.title, rp.status, rp.updated_at,
                u.full_name as created_by_name
           from event_reports rp left join users u on u.id = rp.created_by
          where rp.event_id = $1 order by rp.created_at desc`,
        [event.id],
      )
    ).rows;

    const errors = (
      await req.db.query(
        `select oe.id, oe.description, oe.category, oe.severity, oe.status, oe.occurred_at
           from operational_errors oe
          where oe.event_id = $1 order by oe.occurred_at desc`,
        [event.id],
      )
    ).rows;

    const assignments = (
      await req.db.query(
        `select s.id, s.role_title, s.status, s.call_time, s.instructions,
                u.id as user_id, u.full_name as user_name, sec.name as sector_name,
                (select rc.state from readiness_confirmations rc
                  where rc.schedule_id = s.id order by rc.created_at desc limit 1) as readiness
           from schedules s
           left join users u on u.id = s.user_id
           left join sectors sec on sec.id = s.sector_id
          where s.event_id = $1 order by s.call_time nulls last, s.role_title`,
        [event.id],
      )
    ).rows;

    res.json({ event, runs, reports, errors, assignments });
  }),
);

router.patch(
  '/events/:id',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'events.edit');
    const { rows: beforeRows } = await req.db.query(
      'select * from events where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Evento não encontrado.');
    const before = beforeRows[0];

    if (before.status === 'cancelled') {
      throw badRequest('Eventos cancelados não podem ser editados.');
    }

    const { rows } = await req.db.query(
      `update events set
         name = coalesce($1, name),
         type = coalesce($2, type),
         starts_at = coalesce($3::timestamptz, starts_at),
         ends_at = $4::timestamptz,
         notes = coalesce($5, notes),
         updated_at = now()
       where id = $6
       returning *`,
      [
        req.body?.name ? String(req.body.name).trim().slice(0, 160) : null,
        req.body?.type ? String(req.body.type).trim().slice(0, 60) : null,
        req.body?.starts_at ? isoDate(req.body.starts_at, 'início') : null,
        req.body?.ends_at ? isoDate(req.body.ends_at, 'término') : before.ends_at,
        req.body?.notes !== undefined ? optionalText(req.body.notes) : null,
        req.params.id,
      ],
    );

    await audit(req.db, req.user, {
      action: 'event.updated',
      entity: 'events',
      entityId: req.params.id,
      before,
      after: rows[0],
      moduleKey: 'studio',
    });

    res.json({ event: rows[0] });
  }),
);

router.post(
  '/events/:id/status',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'events.manage');
    const status = oneOf(req.body?.status, EVENT_STATUS, 'situação');
    const { rows: beforeRows } = await req.db.query(
      'select id, status from events where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Evento não encontrado.');

    const { rows } = await req.db.query(
      `update events set status = $1, updated_at = now() where id = $2 returning *`,
      [status, req.params.id],
    );

    await audit(req.db, req.user, {
      action: 'event.status_changed',
      entity: 'events',
      entityId: req.params.id,
      before: { status: beforeRows[0].status },
      after: { status },
      reason: optionalText(req.body?.reason, 500),
      moduleKey: 'studio',
    });

    res.json({ event: rows[0] });
  }),
);

router.delete(
  '/events/:id',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'events.delete');
    const { rows } = await req.db.query(
      'delete from events where id = $1 returning id, name',
      [req.params.id],
    );
    if (!rows.length) throw notFound('Evento não encontrado.');
    await audit(req.db, req.user, {
      action: 'event.deleted',
      entity: 'events',
      entityId: rows[0].id,
      before: { name: rows[0].name },
      moduleKey: 'studio',
    });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------
// Presets de eventos recorrentes
// ---------------------------------------------------------------------
router.get(
  '/presets',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select id, name, type, weekday, start_time, end_time, notes, active
         from event_presets order by weekday, start_time`,
    );
    res.json({ items: rows });
  }),
);

router.post(
  '/presets',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'presets.manage');
    const name = required(req.body?.name, 'nome', 120);
    const type = optionalText(req.body?.type, 60) ?? 'Culto';
    const weekday = Number(req.body?.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw badRequest('Informe o dia da semana (0 = domingo).');
    }
    const startTime = required(req.body?.start_time, 'horário inicial', 8);
    const endTime = optionalText(req.body?.end_time, 8);

    const { rows } = await req.db.query(
      `insert into event_presets (name, type, weekday, start_time, end_time, notes)
       values ($1, $2, $3, $4, $5, $6)
       returning id, name, type, weekday, start_time, end_time, notes, active`,
      [name, type, weekday, startTime, endTime, optionalText(req.body?.notes)],
    );

    await audit(req.db, req.user, {
      action: 'preset.created',
      entity: 'event_presets',
      entityId: rows[0].id,
      after: rows[0],
      moduleKey: 'studio',
    });
    res.status(201).json({ preset: rows[0] });
  }),
);

router.patch(
  '/presets/:id',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'presets.manage');
    const { rows: beforeRows } = await req.db.query(
      'select * from event_presets where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Preset não encontrado.');

    const { rows } = await req.db.query(
      `update event_presets set
         name = coalesce($1, name),
         type = coalesce($2, type),
         weekday = coalesce($3, weekday),
         start_time = coalesce($4::time, start_time),
         end_time = coalesce($5::time, end_time),
         notes = coalesce($6, notes),
         active = coalesce($7, active)
       where id = $8
       returning id, name, type, weekday, start_time, end_time, notes, active`,
      [
        req.body?.name ? String(req.body.name).trim().slice(0, 120) : null,
        req.body?.type ? String(req.body.type).trim().slice(0, 60) : null,
        Number.isInteger(Number(req.body?.weekday)) ? Number(req.body.weekday) : null,
        req.body?.start_time ? String(req.body.start_time) : null,
        req.body?.end_time ? String(req.body.end_time) : null,
        req.body?.notes !== undefined ? optionalText(req.body.notes) : null,
        typeof req.body?.active === 'boolean' ? req.body.active : null,
        req.params.id,
      ],
    );

    await audit(req.db, req.user, {
      action: 'preset.updated',
      entity: 'event_presets',
      entityId: req.params.id,
      before: beforeRows[0],
      after: rows[0],
      moduleKey: 'studio',
    });
    res.json({ preset: rows[0] });
  }),
);

export default router;
