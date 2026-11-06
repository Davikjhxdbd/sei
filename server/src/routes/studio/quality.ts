import { Router } from 'express';
import {
  asyncHandler,
  badRequest,
  forbidden,
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

const ERROR_STATUS = ['open', 'in_analysis', 'resolved', 'closed'] as const;
const SEVERITY = ['low', 'medium', 'high', 'critical'] as const;
const OCCURRENCE_STATUS = ['registered', 'under_review', 'closed'] as const;
const PROBLEM_STATUS = [
  'open',
  'in_analysis',
  'solution_proposed',
  'awaiting_authorization',
  'in_progress',
  'resolved',
  'cancelled',
] as const;

// ---------------------------------------------------------------------
// Erros operacionais
// ---------------------------------------------------------------------
router.get(
  '/errors',
  asyncHandler(async (req: any, res) => {
    const { limit, offset } = paging(req.query);
    const { rows } = await req.db.query(
      `select oe.id, oe.category, oe.severity, oe.impact, oe.occurred_at,
              oe.description, oe.immediate_action, oe.stage, oe.status,
              oe.created_at, oe.problem_id, oe.report_id,
              e.id as event_id, e.name as event_name, e.starts_at,
              s.id as sector_id, s.name as sector_name,
              f.full_name as follow_up_name,
              u.full_name as created_by_name
         from operational_errors oe
         left join events e on e.id = oe.event_id
         left join sectors s on s.id = oe.sector_id
         left join users f on f.id = oe.follow_up_user_id
         left join users u on u.id = oe.created_by
        where ($1::text is null or oe.status::text = $1)
          and ($2::text is null or oe.category = $2)
          and ($3::text is null or oe.severity::text = $3)
          and ($4::uuid is null or oe.sector_id = $4)
          and ($5::text is null or oe.description ilike $5 or oe.category ilike $5)
        order by oe.occurred_at desc
        limit $6 offset $7`,
      [
        ERROR_STATUS.includes(req.query.status) ? req.query.status : null,
        req.query.category ?? null,
        SEVERITY.includes(req.query.severity) ? req.query.severity : null,
        optionalId(req.query.sector_id),
        like(req.query.q),
        limit,
        offset,
      ],
    );

    const { rows: totals } = await req.db.query(
      `select count(*)::int as total,
              count(*) filter (where status in ('open','in_analysis'))::int as open
         from operational_errors`,
    );
    res.json({ items: rows, total: totals[0]?.total ?? 0, open: totals[0]?.open ?? 0 });
  }),
);

router.post(
  '/errors',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'errors.create')) throw forbidden();
    const category = required(req.body?.category, 'categoria', 80);
    const description = required(req.body?.description, 'descrição', 4000);
    const severity = SEVERITY.includes(req.body?.severity)
      ? req.body.severity
      : 'medium';

    const { rows } = await req.db.query(
      `insert into operational_errors
         (event_id, sector_id, category, severity, impact, occurred_at,
          description, immediate_action, stage, follow_up_user_id, report_id, created_by)
       values ($1, $2, $3, $4, $5, coalesce($6::timestamptz, now()), $7, $8, $9, $10, $11, $12)
       returning *`,
      [
        optionalId(req.body?.event_id),
        optionalId(req.body?.sector_id),
        category,
        severity,
        optionalText(req.body?.impact, 500),
        req.body?.occurred_at ? new Date(req.body.occurred_at).toISOString() : null,
        description,
        optionalText(req.body?.immediate_action, 2000),
        optionalText(req.body?.stage, 120),
        optionalId(req.body?.follow_up_user_id),
        optionalId(req.body?.report_id),
        req.user.id,
      ],
    );

    await audit(req.db, req.user, {
      action: 'error.created',
      entity: 'operational_errors',
      entityId: rows[0].id,
      after: { category, severity, description },
      moduleKey: 'studio',
    });

    res.status(201).json({ error: rows[0] });
  }),
);

router.get(
  '/errors/:id',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select oe.*, e.name as event_name, s.name as sector_name,
              f.full_name as follow_up_name, u.full_name as created_by_name
         from operational_errors oe
         left join events e on e.id = oe.event_id
         left join sectors s on s.id = oe.sector_id
         left join users f on f.id = oe.follow_up_user_id
         left join users u on u.id = oe.created_by
        where oe.id = $1`,
      [req.params.id],
    );
    if (!rows.length) throw notFound('Erro operacional não encontrado.');

    const notes = (
      await req.db.query(
        `select n.id, n.note, n.created_at, u.full_name as user_name
           from error_notes n left join users u on u.id = n.user_id
          where n.error_id = $1 order by n.created_at desc`,
        [req.params.id],
      )
    ).rows;

    res.json({ error: rows[0], notes });
  }),
);

router.patch(
  '/errors/:id',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'errors.edit')) throw forbidden();
    const { rows: beforeRows } = await req.db.query(
      'select * from operational_errors where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Erro operacional não encontrado.');

    const { rows } = await req.db.query(
      `update operational_errors set
         category = coalesce($1, category),
         severity = coalesce($2::severity_level, severity),
         impact = coalesce($3, impact),
         description = coalesce($4, description),
         immediate_action = coalesce($5, immediate_action),
         stage = coalesce($6, stage),
         status = coalesce($7::error_status, status),
         follow_up_user_id = coalesce($8::uuid, follow_up_user_id),
         problem_id = coalesce($9::uuid, problem_id),
         report_id = coalesce($10::uuid, report_id),
         updated_at = now()
       where id = $11 returning *`,
      [
        req.body?.category ? String(req.body.category).slice(0, 80) : null,
        SEVERITY.includes(req.body?.severity) ? req.body.severity : null,
        optionalText(req.body?.impact, 500),
        req.body?.description ? String(req.body.description).slice(0, 4000) : null,
        optionalText(req.body?.immediate_action, 2000),
        optionalText(req.body?.stage, 120),
        ERROR_STATUS.includes(req.body?.status) ? req.body.status : null,
        optionalId(req.body?.follow_up_user_id),
        optionalId(req.body?.problem_id),
        optionalId(req.body?.report_id),
        req.params.id,
      ],
    );

    await audit(req.db, req.user, {
      action: 'error.updated',
      entity: 'operational_errors',
      entityId: req.params.id,
      before: beforeRows[0],
      after: rows[0],
      moduleKey: 'studio',
    });
    res.json({ error: rows[0] });
  }),
);

router.post(
  '/errors/:id/notes',
  asyncHandler(async (req: any, res) => {
    const note = required(req.body?.note, 'nota', 4000);
    const { rows: exists } = await req.db.query(
      'select id from operational_errors where id = $1',
      [req.params.id],
    );
    if (!exists.length) throw notFound('Erro operacional não encontrado.');

    const { rows } = await req.db.query(
      `insert into error_notes (error_id, note, user_id)
       values ($1, $2, $3)
       returning id, note, created_at`,
      [req.params.id, note, req.user.id],
    );

    await audit(req.db, req.user, {
      action: 'error.note_added',
      entity: 'operational_errors',
      entityId: req.params.id,
      after: { note },
      moduleKey: 'studio',
    });
    res.status(201).json({ note: rows[0] });
  }),
);

router.delete(
  '/errors/:id',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'errors.delete')) throw forbidden();
    const { rows } = await req.db.query(
      'delete from operational_errors where id = $1 returning id, description',
      [req.params.id],
    );
    if (!rows.length) throw notFound('Erro operacional não encontrado.');
    await audit(req.db, req.user, {
      action: 'error.deleted',
      entity: 'operational_errors',
      entityId: rows[0].id,
      before: { description: rows[0].description },
      moduleKey: 'studio',
    });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------
// Ocorrências administrativas (restritas)
// ---------------------------------------------------------------------
function assertOccurrenceAccess(user: any) {
  if (!can(user.level, 'occurrences.view')) {
    throw forbidden('Ocorrências administrativas exigem autorização de liderança.');
  }
}

router.get(
  '/occurrences',
  asyncHandler(async (req: any, res) => {
    assertOccurrenceAccess(req.user);
    const { rows } = await req.db.query(
      `select o.id, o.person_name, o.type, o.description, o.action_taken,
              o.penalty, o.status, o.created_at, o.updated_at,
              e.id as event_id, e.name as event_name,
              u.full_name as created_by_name
         from occurrences o
         left join events e on e.id = o.event_id
         left join users u on u.id = o.created_by
        where ($1::text is null or o.status::text = $1)
          and ($2::text is null or o.type = $2)
          and ($3::text is null or o.person_name ilike $3 or o.description ilike $3)
        order by o.created_at desc limit 200`,
      [
        OCCURRENCE_STATUS.includes(req.query.status) ? req.query.status : null,
        req.query.type ?? null,
        like(req.query.q),
      ],
    );
    res.json({ items: rows });
  }),
);

router.post(
  '/occurrences',
  asyncHandler(async (req: any, res) => {
    assertOccurrenceAccess(req.user);
    if (!can(req.user.level, 'occurrences.manage')) throw forbidden();
    const personName = required(req.body?.person_name, 'nome da pessoa', 160);
    const type = required(req.body?.type, 'tipo de ocorrência', 80);
    const description = required(req.body?.description, 'descrição', 4000);

    const { rows } = await req.db.query(
      `insert into occurrences
         (person_name, person_id, type, description, event_id, action_taken, penalty, status, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *`,
      [
        personName,
        optionalId(req.body?.person_id),
        type,
        description,
        optionalId(req.body?.event_id),
        optionalText(req.body?.action_taken, 2000),
        optionalText(req.body?.penalty, 500),
        OCCURRENCE_STATUS.includes(req.body?.status) ? req.body.status : 'registered',
        req.user.id,
      ],
    );

    await audit(req.db, req.user, {
      action: 'occurrence.created',
      entity: 'occurrences',
      entityId: rows[0].id,
      after: { person_name: personName, type },
      moduleKey: 'studio',
    });
    res.status(201).json({ occurrence: rows[0] });
  }),
);

router.patch(
  '/occurrences/:id',
  asyncHandler(async (req: any, res) => {
    assertOccurrenceAccess(req.user);
    const { rows: beforeRows } = await req.db.query(
      'select * from occurrences where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Ocorrência não encontrada.');

    const { rows } = await req.db.query(
      `update occurrences set
         person_name = coalesce($1, person_name),
         type = coalesce($2, type),
         description = coalesce($3, description),
         action_taken = coalesce($4, action_taken),
         penalty = coalesce($5, penalty),
         status = coalesce($6::occurrence_status, status),
         updated_at = now()
       where id = $7 returning *`,
      [
        req.body?.person_name ? String(req.body.person_name).slice(0, 160) : null,
        req.body?.type ? String(req.body.type).slice(0, 80) : null,
        req.body?.description ? String(req.body.description).slice(0, 4000) : null,
        optionalText(req.body?.action_taken, 2000),
        optionalText(req.body?.penalty, 500),
        OCCURRENCE_STATUS.includes(req.body?.status) ? req.body.status : null,
        req.params.id,
      ],
    );

    await audit(req.db, req.user, {
      action: 'occurrence.updated',
      entity: 'occurrences',
      entityId: req.params.id,
      before: beforeRows[0],
      after: rows[0],
      moduleKey: 'studio',
    });
    res.json({ occurrence: rows[0] });
  }),
);

// ---------------------------------------------------------------------
// Problemas
// ---------------------------------------------------------------------
router.get(
  '/problems',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select p.id, p.code, p.title, p.status, p.urgency, p.priority, p.impact,
              p.identified_at, p.resolution_due, p.created_at,
              s.name as sector_name, o.full_name as owner_name,
              ib.full_name as identified_by_name,
              (select count(*)::int from problem_updates pu where pu.problem_id = p.id) as updates_count,
              (select count(*)::int from authorization_requests ar
                where ar.problem_id = p.id and ar.status = 'pending') as pending_authorizations
         from problems p
         left join sectors s on s.id = p.sector_id
         left join users o on o.id = p.owner_id
         left join users ib on ib.id = p.identified_by
        where ($1::text is null or p.status::text = $1)
          and ($2::uuid is null or p.sector_id = $2)
          and ($3::text is null or p.urgency::text = $3)
          and ($4::text is null or p.title ilike $4 or p.code ilike $4 or p.description ilike $4)
        order by case p.priority
                   when 'critical' then 1 when 'high' then 2
                   when 'medium' then 3 else 4 end,
                 p.created_at desc
        limit 200`,
      [
        PROBLEM_STATUS.includes(req.query.status) ? req.query.status : null,
        optionalId(req.query.sector_id),
        SEVERITY.includes(req.query.urgency) ? req.query.urgency : null,
        like(req.query.q),
      ],
    );
    res.json({ items: rows });
  }),
);

router.post(
  '/problems',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'problems.create')) throw forbidden();
    const title = required(req.body?.title, 'título', 200);
    const description = required(req.body?.description, 'descrição', 6000);

    const created = await tx(req.db, async () => {
      const { rows: seq } = await req.db.query(
        `select coalesce(max(substring(code from 5)::int), 0) + 1 as next
           from problems where code ~ '^PRB-[0-9]+$'`,
      );
      const code = `PRB-${String(seq[0].next).padStart(4, '0')}`;

      const { rows } = await req.db.query(
        `insert into problems
           (code, title, description, identified_by, sector_id, event_id, category,
            impact, urgency, priority, owner_id, resolution_due, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::severity_level, $10::severity_level,
                 $11, $12::date, $13)
         returning *`,
        [
          code,
          title,
          description,
          req.user.id,
          optionalId(req.body?.sector_id),
          optionalId(req.body?.event_id),
          optionalText(req.body?.category, 80),
          optionalText(req.body?.impact, 1000),
          SEVERITY.includes(req.body?.urgency) ? req.body.urgency : 'medium',
          SEVERITY.includes(req.body?.priority) ? req.body.priority : 'medium',
          optionalId(req.body?.owner_id) ?? req.user.id,
          req.body?.resolution_due ?? null,
          req.user.id,
        ],
      );

      await req.db.query(
        `insert into problem_updates (problem_id, user_id, kind, body)
         values ($1, $2, 'comment', $3)`,
        [rows[0].id, req.user.id, 'Problema registrado.'],
      );

      await audit(req.db, req.user, {
        action: 'problem.created',
        entity: 'problems',
        entityId: rows[0].id,
        after: { code, title },
        moduleKey: 'studio',
      });

      return rows[0];
    });

    res.status(201).json({ problem: created });
  }),
);

router.get(
  '/problems/:id',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select p.*, s.name as sector_name, e.name as event_name,
              o.full_name as owner_name, ib.full_name as identified_by_name,
              cb.full_name as cause_confirmed_by_name
         from problems p
         left join sectors s on s.id = p.sector_id
         left join events e on e.id = p.event_id
         left join users o on o.id = p.owner_id
         left join users ib on ib.id = p.identified_by
         left join users cb on cb.id = p.cause_confirmed_by
        where p.id = $1`,
      [req.params.id],
    );
    if (!rows.length) throw notFound('Problema não encontrado.');

    const updates = (
      await req.db.query(
        `select pu.id, pu.kind, pu.body, pu.from_status, pu.to_status, pu.created_at,
                u.full_name as user_name
           from problem_updates pu left join users u on u.id = pu.user_id
          where pu.problem_id = $1 order by pu.created_at desc`,
        [req.params.id],
      )
    ).rows;

    const solutions = (
      await req.db.query(
        `select ps.*, u.full_name as created_by_name
           from problem_solutions ps left join users u on u.id = ps.created_by
          where ps.problem_id = $1 order by ps.created_at desc`,
        [req.params.id],
      )
    ).rows;

    const authorizations = (
      await req.db.query(
        `select ar.*, rq.full_name as requested_by_name,
                dc.full_name as decided_by_name,
                ps.description as solution_description
           from authorization_requests ar
           left join users rq on rq.id = ar.requested_by
           left join users dc on dc.id = ar.decided_by
           left join problem_solutions ps on ps.id = ar.solution_id
          where ar.problem_id = $1 order by ar.created_at desc`,
        [req.params.id],
      )
    ).rows;

    res.json({
      problem: rows[0],
      updates,
      solutions,
      authorizations,
      relatedErrors: (
        await req.db.query(
          `select id, description, severity, status, occurred_at
             from operational_errors where problem_id = $1
            order by occurred_at desc`,
          [req.params.id],
        )
      ).rows,
    });
  }),
);

router.patch(
  '/problems/:id',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'problems.edit')) throw forbidden();
    const { rows: beforeRows } = await req.db.query(
      'select * from problems where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Problema não encontrado.');
    const before = beforeRows[0];

    const status = PROBLEM_STATUS.includes(req.body?.status)
      ? req.body.status
      : null;
    const rootCause =
      req.body?.root_cause !== undefined
        ? optionalText(req.body.root_cause, 4000)
        : null;

    const { rows } = await req.db.query(
      `update problems set
         title = coalesce($1, title),
         description = coalesce($2, description),
         category = coalesce($3, category),
         impact = coalesce($4, impact),
         urgency = coalesce($5::severity_level, urgency),
         priority = coalesce($6::severity_level, priority),
         status = coalesce($7::problem_status, status),
         owner_id = coalesce($8::uuid, owner_id),
         root_cause = coalesce($9, root_cause),
         cause_confirmed_by = case when $9::text is not null then $10::uuid
                                   else cause_confirmed_by end,
         cause_confirmed_at = case when $9::text is not null then now()
                                   else cause_confirmed_at end,
         resolution_due = coalesce($11::date, resolution_due),
         final_result = coalesce($12, final_result),
         updated_at = now()
       where id = $13 returning *`,
      [
        req.body?.title ? String(req.body.title).slice(0, 200) : null,
        req.body?.description ? String(req.body.description).slice(0, 6000) : null,
        optionalText(req.body?.category, 80),
        optionalText(req.body?.impact, 1000),
        SEVERITY.includes(req.body?.urgency) ? req.body.urgency : null,
        SEVERITY.includes(req.body?.priority) ? req.body.priority : null,
        status,
        optionalId(req.body?.owner_id),
        rootCause,
        req.user.id,
        req.body?.resolution_due ?? null,
        optionalText(req.body?.final_result, 4000),
        req.params.id,
      ],
    );

    if (status && status !== before.status) {
      await req.db.query(
        `insert into problem_updates
           (problem_id, user_id, kind, body, from_status, to_status)
         values ($1, $2, 'status', $3, $4::problem_status, $5::problem_status)`,
        [
          req.params.id,
          req.user.id,
          optionalText(req.body?.status_note, 1000) ?? 'Situação atualizada.',
          before.status,
          status,
        ],
      );
    }

    await audit(req.db, req.user, {
      action: 'problem.updated',
      entity: 'problems',
      entityId: req.params.id,
      before,
      after: rows[0],
      moduleKey: 'studio',
    });
    res.json({ problem: rows[0] });
  }),
);

router.post(
  '/problems/:id/updates',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'problems.edit')) throw forbidden();
    const body = required(req.body?.body, 'comentário', 4000);
    const { rows: exists } = await req.db.query(
      'select id, status from problems where id = $1',
      [req.params.id],
    );
    if (!exists.length) throw notFound('Problema não encontrado.');

    const toStatus = PROBLEM_STATUS.includes(req.body?.to_status)
      ? req.body.to_status
      : null;

    const { rows } = await req.db.query(
      `insert into problem_updates
         (problem_id, user_id, kind, body, from_status, to_status)
       values ($1, $2, $3, $4, $5::problem_status, $6::problem_status)
       returning *`,
      [
        req.params.id,
        req.user.id,
        toStatus ? 'status' : 'comment',
        body,
        toStatus ? exists[0].status : null,
        toStatus,
      ],
    );

    if (toStatus) {
      await req.db.query(
        'update problems set status = $1::problem_status, updated_at = now() where id = $2',
        [toStatus, req.params.id],
      );
    }

    await audit(req.db, req.user, {
      action: 'problem.update_added',
      entity: 'problems',
      entityId: req.params.id,
      after: { body, to_status: toStatus },
      moduleKey: 'studio',
    });
    res.status(201).json({ update: rows[0] });
  }),
);

router.post(
  '/problems/:id/solutions',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'problems.edit')) throw forbidden();
    const description = required(req.body?.description, 'descrição da solução', 6000);
    const { rows: exists } = await req.db.query(
      'select id from problems where id = $1',
      [req.params.id],
    );
    if (!exists.length) throw notFound('Problema não encontrado.');

    const { rows } = await req.db.query(
      `insert into problem_solutions
         (problem_id, description, rationale, resources, risks, expected_effects,
          executors, test_method, success_criteria, rollback_plan,
          requires_authorization, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       returning *`,
      [
        req.params.id,
        description,
        optionalText(req.body?.rationale, 3000),
        optionalText(req.body?.resources, 3000),
        optionalText(req.body?.risks, 3000),
        optionalText(req.body?.expected_effects, 3000),
        optionalText(req.body?.executors, 1000),
        optionalText(req.body?.test_method, 2000),
        optionalText(req.body?.success_criteria, 2000),
        optionalText(req.body?.rollback_plan, 3000),
        Boolean(req.body?.requires_authorization),
        req.user.id,
      ],
    );

    await req.db.query(
      `insert into problem_updates (problem_id, user_id, kind, body)
       values ($1, $2, 'solution', $3)`,
      [req.params.id, req.user.id, 'Solução proposta registrada.'],
    );
    await req.db.query(
      `update problems set status = 'solution_proposed', updated_at = now()
        where id = $1 and status in ('open', 'in_analysis')`,
      [req.params.id],
    );

    await audit(req.db, req.user, {
      action: 'problem.solution_created',
      entity: 'problem_solutions',
      entityId: rows[0].id,
      after: { description, requires_authorization: rows[0].requires_authorization },
      moduleKey: 'studio',
    });
    res.status(201).json({ solution: rows[0] });
  }),
);

router.post(
  '/problems/:id/authorizations',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'problems.edit')) throw forbidden();
    const scope = required(req.body?.scope, 'escopo', 3000);
    const deciders = Array.isArray(req.body?.deciders)
      ? req.body.deciders.filter((d: unknown) => typeof d === 'string')
      : [];
    if (!deciders.length) {
      throw badRequest('Selecione ao menos um responsável pela decisão.');
    }

    const { rows: problemRows } = await req.db.query(
      'select id, title, status from problems where id = $1',
      [req.params.id],
    );
    if (!problemRows.length) throw notFound('Problema não encontrado.');

    const created = await tx(req.db, async () => {
      const { rows } = await req.db.query(
        `insert into authorization_requests
           (problem_id, solution_id, requested_by, scope, deciders, due_at)
         values ($1, $2, $3, $4, $5::uuid[], $6::date) returning *`,
        [
          req.params.id,
          optionalId(req.body?.solution_id),
          req.user.id,
          scope,
          deciders,
          req.body?.due_at ?? null,
        ],
      );

      await req.db.query(
        `update problems set status = 'awaiting_authorization', updated_at = now()
          where id = $1`,
        [req.params.id],
      );
      await req.db.query(
        `insert into problem_updates (problem_id, user_id, kind, body)
         values ($1, $2, 'authorization', $3)`,
        [req.params.id, req.user.id, 'Solicitação de autorização registrada.'],
      );

      for (const decider of deciders) {
        await notify(req.db, {
          userId: decider,
          title: 'Solicitação de autorização',
          body: problemRows[0].title,
          link: `/m/studio/problems/${req.params.id}`,
          moduleKey: 'studio',
        });
      }

      await audit(req.db, req.user, {
        action: 'authorization.requested',
        entity: 'authorization_requests',
        entityId: rows[0].id,
        after: { scope, deciders },
        moduleKey: 'studio',
      });

      return rows[0];
    });

    res.status(201).json({ authorization: created });
  }),
);

router.post(
  '/authorizations/:id/decision',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'problems.decide')) throw forbidden();
    const decision = oneOf(
      req.body?.decision,
      ['approved', 'rejected'] as const,
      'decisão',
    );
    const note = required(req.body?.note, 'justificativa', 2000);

    const { rows: requestRows } = await req.db.query(
      `select ar.*, p.title, p.id as problem_id
         from authorization_requests ar join problems p on p.id = ar.problem_id
        where ar.id = $1`,
      [req.params.id],
    );
    if (!requestRows.length) throw notFound('Solicitação não encontrada.');
    const request = requestRows[0];
    if (request.status !== 'pending') {
      throw badRequest('Esta solicitação já foi decidida.');
    }
    if (request.requested_by === req.user.id && req.user.level < 5) {
      throw forbidden('Não é permitido decidir a própria solicitação.');
    }
    if (
      !request.deciders.includes(req.user.id) &&
      req.user.level < 5
    ) {
      throw forbidden('Você não está entre os responsáveis pela decisão.');
    }

    const updated = await tx(req.db, async () => {
      const { rows } = await req.db.query(
        `update authorization_requests set
           status = $1::authorization_status,
           decided_by = $2, decision_note = $3, decided_at = now()
         where id = $4 returning *`,
        [decision, req.user.id, note, req.params.id],
      );

      if (decision === 'approved') {
        await req.db.query(
          `update problems set status = 'in_progress', updated_at = now()
            where id = $1`,
          [request.problem_id],
        );
      }
      await req.db.query(
        `insert into problem_updates (problem_id, user_id, kind, body)
         values ($1, $2, 'authorization', $3)`,
        [
          request.problem_id,
          req.user.id,
          decision === 'approved'
            ? `Autorização aprovada: ${note}`
            : `Autorização reprovada: ${note}`,
        ],
      );

      await notify(req.db, {
        userId: request.requested_by,
        title:
          decision === 'approved'
            ? 'Autorização aprovada'
            : 'Autorização reprovada',
        body: request.title,
        link: `/m/studio/problems/${request.problem_id}`,
        moduleKey: 'studio',
      });

      await audit(req.db, req.user, {
        action: `authorization.${decision}`,
        entity: 'authorization_requests',
        entityId: req.params.id,
        before: { status: 'pending' },
        after: { status: decision },
        reason: note,
        moduleKey: 'studio',
      });

      return rows[0];
    });

    res.json({ authorization: updated });
  }),
);

export default router;
