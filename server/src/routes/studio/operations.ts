import { Router } from 'express';
import {
  asyncHandler,
  badRequest,
  forbidden,
  isoDate,
  like,
  notFound,
  oneOf,
  optionalId,
  optionalText,
  paging,
  required,
} from '../../http';
import { can } from '../../permissions';
import { audit, notify } from '../../audit';
import { tx } from '../../db';

const router = Router();

const ASSIGNMENT_STATUS = ['draft', 'published', 'ended', 'cancelled'] as const;
const READINESS = ['ready', 'attention', 'unavailable'] as const;
const MEDIA_STATUS = [
  'awaiting_edit',
  'in_edit',
  'awaiting_publication',
  'published',
  'reported_lost',
  'not_found',
] as const;

function ensure(user: any, action: keyof typeof import('../../permissions').ACTIONS) {
  if (!can(user.level, action as any)) {
    throw forbidden('Seu cargo não permite executar esta ação.');
  }
}

// ---------------------------------------------------------------------
// Escalas
// ---------------------------------------------------------------------
router.get(
  '/schedules',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select sc.id, sc.role_title, sc.instructions, sc.call_time, sc.status,
              sc.created_at, sc.user_id,
              e.id as event_id, e.name as event_name, e.starts_at,
              s.id as sector_id, s.name as sector_name,
              u.full_name as user_name,
              cu.full_name as created_by_name,
              (select rc.state from readiness_confirmations rc
                where rc.schedule_id = sc.id order by rc.created_at desc limit 1) as readiness,
              (select count(*)::int from schedule_history h where h.schedule_id = sc.id) as history_count
         from schedules sc
         join events e on e.id = sc.event_id
         left join sectors s on s.id = sc.sector_id
         left join users u on u.id = sc.user_id
         left join users cu on cu.id = sc.created_by
        where ($1::uuid is null or sc.event_id = $1)
          and ($2::text is null or sc.status::text = $2)
          and ($3::bool is not true or sc.user_id = $4)
        order by e.starts_at, sc.role_title
        limit 400`,
      [
        optionalId(req.query.event_id),
        ASSIGNMENT_STATUS.includes(req.query.status) ? req.query.status : null,
        req.query.mine === '1',
        req.user.id,
      ],
    );
    res.json({ items: rows });
  }),
);

router.post(
  '/schedules',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'schedules.manage');
    const eventId = optionalId(req.body?.event_id);
    if (!eventId) throw badRequest('Selecione o evento.');
    const roleTitle = required(req.body?.role_title, 'função / posto', 120);

    const created = await tx(req.db, async () => {
      const { rows: eventRows } = await req.db.query(
        'select id, name from events where id = $1',
        [eventId],
      );
      if (!eventRows.length) throw notFound('Evento não encontrado.');

      const { rows } = await req.db.query(
        `insert into schedules
           (event_id, sector_id, role_title, user_id, instructions, call_time, status, created_by)
         values ($1, $2, $3, $4, $5, $6::timestamptz, 'draft', $7)
         returning *`,
        [
          eventId,
          optionalId(req.body?.sector_id),
          roleTitle,
          optionalId(req.body?.user_id),
          optionalText(req.body?.instructions, 2000),
          req.body?.call_time ? isoDate(req.body.call_time, 'apresentação') : null,
          req.user.id,
        ],
      );

      await req.db.query(
        `insert into schedule_history (schedule_id, changed_by, to_user_id, action, reason)
         values ($1, $2, $3, 'created', 'Designação criada')`,
        [rows[0].id, req.user.id, rows[0].user_id],
      );

      await audit(req.db, req.user, {
        action: 'schedule.created',
        entity: 'schedules',
        entityId: rows[0].id,
        after: { role_title: roleTitle, event: eventRows[0].name },
        moduleKey: 'studio',
      });

      return rows[0];
    });

    res.status(201).json({ schedule: created });
  }),
);

router.patch(
  '/schedules/:id',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'schedules.manage');
    const { rows: beforeRows } = await req.db.query(
      'select * from schedules where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Designação não encontrada.');
    const before = beforeRows[0];
    if (before.status === 'ended') {
      throw badRequest('Designações encerradas não podem ser alteradas.');
    }

    const userProvided = req.body?.user_id !== undefined;
    const newUser = userProvided ? optionalId(req.body.user_id) : null;

    const updated = await tx(req.db, async () => {
      const { rows } = await req.db.query(
        `update schedules set
           sector_id = coalesce($1::uuid, sector_id),
           role_title = coalesce($2, role_title),
           user_id = $3,
           instructions = coalesce($4, instructions),
           call_time = coalesce($5::timestamptz, call_time),
           status = coalesce($6::assignment_status, status),
           updated_at = now()
         where id = $7 returning *`,
        [
          optionalId(req.body?.sector_id),
          req.body?.role_title ? String(req.body.role_title).slice(0, 120) : null,
          userProvided ? newUser : before.user_id,
          optionalText(req.body?.instructions, 2000),
          req.body?.call_time ? isoDate(req.body.call_time, 'apresentação') : null,
          ASSIGNMENT_STATUS.includes(req.body?.status) ? req.body.status : null,
          req.params.id,
        ],
      );

      if (userProvided && newUser !== before.user_id) {
        await req.db.query(
          `insert into schedule_history
             (schedule_id, changed_by, from_user_id, to_user_id, action, reason)
           values ($1, $2, $3, $4, 'reassigned', $5)`,
          [
            req.params.id,
            req.user.id,
            before.user_id,
            newUser,
            optionalText(req.body?.reason, 1000) ?? 'Designação alterada',
          ],
        );
        await notify(req.db, {
          userId: newUser,
          title: 'Nova designação em escala',
          body: rows[0].role_title,
          link: '/m/studio/schedules',
          moduleKey: 'studio',
        });
      }

      await audit(req.db, req.user, {
        action: 'schedule.updated',
        entity: 'schedules',
        entityId: req.params.id,
        before,
        after: rows[0],
        moduleKey: 'studio',
      });

      return rows[0];
    });

    res.json({ schedule: updated });
  }),
);

router.post(
  '/schedules/:id/publish',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'schedules.manage');
    const { rows: beforeRows } = await req.db.query(
      'select * from schedules where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Designação não encontrada.');
    if (!beforeRows[0].user_id) {
      throw badRequest('Defina a pessoa designada antes de publicar.');
    }

    const updated = await tx(req.db, async () => {
      const { rows } = await req.db.query(
        `update schedules set status = 'published', updated_at = now()
          where id = $1 returning *`,
        [req.params.id],
      );
      await req.db.query(
        `insert into schedule_history (schedule_id, changed_by, to_user_id, action, reason)
         values ($1, $2, $3, 'published', $4)`,
        [req.params.id, req.user.id, rows[0].user_id, optionalText(req.body?.reason, 500) ?? 'Escala publicada'],
      );
      await notify(req.db, {
        userId: rows[0].user_id,
        title: 'Escala publicada',
        body: rows[0].role_title,
        link: '/m/studio/schedules',
        moduleKey: 'studio',
      });
      await audit(req.db, req.user, {
        action: 'schedule.published',
        entity: 'schedules',
        entityId: req.params.id,
        before: { status: beforeRows[0].status },
        after: { status: 'published' },
        moduleKey: 'studio',
      });
      return rows[0];
    });

    res.json({ schedule: updated });
  }),
);

router.post(
  '/schedules/:id/end',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'schedules.manage');
    const { rows: beforeRows } = await req.db.query(
      'select id, status from schedules where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Designação não encontrada.');

    const updated = await tx(req.db, async () => {
      const { rows } = await req.db.query(
        `update schedules set status = 'ended', updated_at = now()
          where id = $1 returning *`,
        [req.params.id],
      );
      await req.db.query(
        `insert into schedule_history (schedule_id, changed_by, action, reason)
         values ($1, $2, 'ended', $3)`,
        [req.params.id, req.user.id, optionalText(req.body?.reason, 500) ?? 'Designação encerrada'],
      );
      await audit(req.db, req.user, {
        action: 'schedule.ended',
        entity: 'schedules',
        entityId: req.params.id,
        before: { status: beforeRows[0].status },
        after: { status: 'ended' },
        moduleKey: 'studio',
      });
      return rows[0];
    });

    res.json({ schedule: updated });
  }),
);

router.get(
  '/schedules/:id/history',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select h.id, h.action, h.reason, h.created_at,
              cb.full_name as changed_by_name,
              fu.full_name as from_user_name,
              tu.full_name as to_user_name
         from schedule_history h
         left join users cb on cb.id = h.changed_by
         left join users fu on fu.id = h.from_user_id
         left join users tu on tu.id = h.to_user_id
        where h.schedule_id = $1
        order by h.created_at desc`,
      [req.params.id],
    );
    res.json({ items: rows });
  }),
);

// ---------------------------------------------------------------------
// Confirmação de prontidão
// ---------------------------------------------------------------------
router.get(
  '/readiness',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select rc.id, rc.state, rc.note, rc.created_at,
              sc.id as schedule_id, sc.role_title, sc.call_time,
              e.id as event_id, e.name as event_name, e.starts_at,
              u.full_name as user_name
         from readiness_confirmations rc
         join schedules sc on sc.id = rc.schedule_id
         join events e on e.id = sc.event_id
         join users u on u.id = rc.user_id
        where ($1::bool is not true or rc.user_id = $2)
          and ($3::uuid is null or e.id = $3)
        order by rc.created_at desc
        limit 200`,
      [req.user.level < 3, req.user.id, optionalId(req.query.event_id)],
    );
    res.json({ items: rows });
  }),
);

router.post(
  '/readiness',
  asyncHandler(async (req: any, res) => {
    const scheduleId = optionalId(req.body?.schedule_id);
    if (!scheduleId) throw badRequest('Selecione a designação.');
    const state = oneOf(req.body?.state, READINESS, 'estado de prontidão');

    const { rows: scheduleRows } = await req.db.query(
      `select sc.id, sc.user_id, sc.role_title, e.name as event_name
         from schedules sc join events e on e.id = sc.event_id
        where sc.id = $1`,
      [scheduleId],
    );
    if (!scheduleRows.length) throw notFound('Designação não encontrada.');
    const schedule = scheduleRows[0];

    if (schedule.user_id !== req.user.id && !can(req.user.level, 'schedules.manage')) {
      throw forbidden('Somente a pessoa designada pode confirmar a prontidão.');
    }

    const { rows } = await req.db.query(
      `insert into readiness_confirmations (schedule_id, user_id, state, note)
       values ($1, $2, $3::readiness_state, $4) returning *`,
      [scheduleId, req.user.id, state, optionalText(req.body?.note, 1000)],
    );

    await audit(req.db, req.user, {
      action: 'readiness.confirmed',
      entity: 'schedules',
      entityId: scheduleId,
      after: { state, role_title: schedule.role_title },
      moduleKey: 'studio',
    });

    res.status(201).json({ readiness: rows[0] });
  }),
);

// ---------------------------------------------------------------------
// Acervo de mídia
// ---------------------------------------------------------------------
router.get(
  '/media/stats',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select status, count(*)::int as count from media_records group by status`,
    );
    const totals: Record<string, number> = {
      awaiting_edit: 0,
      in_edit: 0,
      awaiting_publication: 0,
      published: 0,
      reported_lost: 0,
      not_found: 0,
    };
    for (const row of rows) totals[row.status] = row.count;
    res.json({ totals });
  }),
);

router.get(
  '/media',
  asyncHandler(async (req: any, res) => {
    const { limit, offset } = paging(req.query);
    const { rows } = await req.db.query(
      `select m.id, m.service_date, m.service_time, m.preacher, m.event_name,
              m.record_type, m.status, m.platform, m.published_url, m.notes,
              m.created_at, m.updated_at,
              ed.full_name as editor_name, ed.id as editor_id,
              pb.full_name as publisher_name,
              rp.full_name as reported_by_name
         from media_records m
         left join users ed on ed.id = m.editor_id
         left join users pb on pb.id = m.publisher_id
         left join users rp on rp.id = m.status_reported_by
        where ($1::text is null or m.status::text = $1)
          and ($2::text is null or m.preacher ilike $2)
          and ($3::date is null or m.service_date >= $3::date)
          and ($4::date is null or m.service_date <= $4::date)
          and ($5::uuid is null or m.editor_id = $5)
          and ($6::uuid is null or m.publisher_id = $6)
          and ($7::text is null or m.event_name ilike $7 or m.preacher ilike $7)
        order by m.service_date desc, m.service_time desc
        limit $8 offset $9`,
      [
        MEDIA_STATUS.includes(req.query.status) ? req.query.status : null,
        like(req.query.preacher),
        req.query.from || null,
        req.query.to || null,
        optionalId(req.query.editor_id),
        optionalId(req.query.publisher_id),
        like(req.query.q),
        limit,
        offset,
      ],
    );

    const { rows: totals } = await req.db.query(
      `select count(*)::int as total from media_records`,
    );
    res.json({ items: rows, total: totals[0]?.total ?? 0 });
  }),
);

router.post(
  '/media',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'media.create');
    const serviceDate = required(req.body?.service_date, 'data do culto', 20);
    const { rows } = await req.db.query(
      `insert into media_records
         (service_date, service_time, preacher, event_name, record_type, status,
          editor_id, publisher_id, platform, published_url, notes, created_by)
       values ($1::date, $2::time, $3, $4, $5, $6::media_status, $7, $8, $9, $10, $11, $12)
       returning *`,
      [
        serviceDate,
        req.body?.service_time || null,
        optionalText(req.body?.preacher, 160),
        optionalText(req.body?.event_name, 160),
        optionalText(req.body?.record_type, 60) ?? 'Gravação',
        MEDIA_STATUS.includes(req.body?.status) ? req.body.status : 'awaiting_edit',
        optionalId(req.body?.editor_id),
        optionalId(req.body?.publisher_id),
        optionalText(req.body?.platform, 60),
        optionalText(req.body?.published_url, 500),
        optionalText(req.body?.notes, 2000),
        req.user.id,
      ],
    );

    await req.db.query(
      `insert into media_history (media_id, user_id, to_status, comment)
       values ($1, $2, $3::media_status, 'Registro criado')`,
      [rows[0].id, req.user.id, rows[0].status],
    );

    await audit(req.db, req.user, {
      action: 'media.created',
      entity: 'media_records',
      entityId: rows[0].id,
      after: { service_date: serviceDate, status: rows[0].status },
      moduleKey: 'studio',
    });
    res.status(201).json({ media: rows[0] });
  }),
);

router.patch(
  '/media/:id',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'media.edit');
    const { rows: beforeRows } = await req.db.query(
      'select * from media_records where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Registro de mídia não encontrado.');

    const { rows } = await req.db.query(
      `update media_records set
         preacher = coalesce($1, preacher),
         event_name = coalesce($2, event_name),
         record_type = coalesce($3, record_type),
         editor_id = coalesce($4::uuid, editor_id),
         publisher_id = coalesce($5::uuid, publisher_id),
         platform = coalesce($6, platform),
         published_url = coalesce($7, published_url),
         notes = coalesce($8, notes),
         updated_at = now()
       where id = $9 returning *`,
      [
        optionalText(req.body?.preacher, 160),
        optionalText(req.body?.event_name, 160),
        optionalText(req.body?.record_type, 60),
        optionalId(req.body?.editor_id),
        optionalId(req.body?.publisher_id),
        optionalText(req.body?.platform, 60),
        optionalText(req.body?.published_url, 500),
        optionalText(req.body?.notes, 2000),
        req.params.id,
      ],
    );

    await audit(req.db, req.user, {
      action: 'media.updated',
      entity: 'media_records',
      entityId: req.params.id,
      before: beforeRows[0],
      after: rows[0],
      moduleKey: 'studio',
    });
    res.json({ media: rows[0] });
  }),
);

router.post(
  '/media/:id/status',
  asyncHandler(async (req: any, res) => {
    ensure(req.user, 'media.edit');
    const status = oneOf(req.body?.status, MEDIA_STATUS, 'situação');
    const comment = optionalText(req.body?.comment, 1000);

    const { rows: beforeRows } = await req.db.query(
      'select id, status from media_records where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Registro de mídia não encontrado.');
    if (beforeRows[0].status === status) {
      throw badRequest('O registro já está nesta situação.');
    }

    const updated = await tx(req.db, async () => {
      const { rows } = await req.db.query(
        `update media_records set
           status = $1::media_status,
           status_reported_by = $2,
           published_url = case when $1::media_status = 'published'
                                then coalesce($3, published_url) else published_url end,
           updated_at = now()
         where id = $4 returning *`,
        [
          status,
          req.user.id,
          optionalText(req.body?.published_url, 500),
          req.params.id,
        ],
      );

      await req.db.query(
        `insert into media_history (media_id, user_id, from_status, to_status, comment)
         values ($1, $2, $3::media_status, $4::media_status, $5)`,
        [req.params.id, req.user.id, beforeRows[0].status, status, comment],
      );

      await audit(req.db, req.user, {
        action: 'media.status_changed',
        entity: 'media_records',
        entityId: req.params.id,
        before: { status: beforeRows[0].status },
        after: { status },
        reason: comment,
        moduleKey: 'studio',
      });

      return rows[0];
    });

    res.json({ media: updated });
  }),
);

router.get(
  '/media/:id/history',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select h.id, h.from_status, h.to_status, h.comment, h.created_at,
              u.full_name as user_name
         from media_history h left join users u on u.id = h.user_id
        where h.media_id = $1 order by h.created_at desc`,
      [req.params.id],
    );
    res.json({ items: rows });
  }),
);

export default router;
