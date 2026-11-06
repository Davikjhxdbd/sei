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
  required,
} from '../../http';
import { can } from '../../permissions';
import { audit, notify } from '../../audit';
import { tx } from '../../db';
import { OPTION_DEFAULTS } from '../catalog';

const router = Router();

const REPORT_STATUS = ['draft', 'in_review', 'finalized'] as const;

router.get(
  '/reports',
  asyncHandler(async (req: any, res) => {
    const status = REPORT_STATUS.includes(req.query.status) ? req.query.status : null;
    const search = like(req.query.q);
    const { rows } = await req.db.query(
      `select r.id, r.title, r.status, r.created_at, r.updated_at,
              r.finalized_at, r.reviewed_at,
              e.id as event_id, e.name as event_name, e.starts_at,
              u.full_name as created_by_name,
              (select count(*)::int from report_sections s where s.report_id = r.id) as sections,
              (select count(*)::int from report_sections s
                where s.report_id = r.id and coalesce(trim(s.content), '') <> ''
                  and not s.not_applicable) as sections_filled
         from event_reports r
         join events e on e.id = r.event_id
         left join users u on u.id = r.created_by
        where ($1::text is null or r.status::text = $1)
          and ($2::uuid is null or r.event_id = $2)
          and ($3::text is null or r.title ilike $3 or e.name ilike $3)
        order by e.starts_at desc, r.created_at desc
        limit 200`,
      [status, optionalId(req.query.event_id), search],
    );
    res.json({ items: rows });
  }),
);

router.post(
  '/reports',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'reports.create')) throw forbidden();
    const eventId = optionalId(req.body?.event_id);
    if (!eventId) throw badRequest('Selecione o evento do relatório.');

    const created = await tx(req.db, async () => {
      const { rows: eventRows } = await req.db.query(
        'select id, name from events where id = $1',
        [eventId],
      );
      if (!eventRows.length) throw notFound('Evento não encontrado.');

      const { rows: sectionSetting } = await req.db.query(
        `select value from settings where key = 'report_sections'`,
      );
      const titles: string[] =
        Array.isArray(sectionSetting[0]?.value) && sectionSetting[0].value.length
          ? sectionSetting[0].value
          : OPTION_DEFAULTS.report_sections;

      const title =
        optionalText(req.body?.title, 180) ?? `Relatório — ${eventRows[0].name}`;

      const { rows } = await req.db.query(
        `insert into event_reports (event_id, title, created_by)
         values ($1, $2, $3) returning *`,
        [eventId, title, req.user.id],
      );
      const report = rows[0];

      for (let index = 0; index < titles.length; index += 1) {
        await req.db.query(
          `insert into report_sections (report_id, title, sort_order)
           values ($1, $2, $3)`,
          [report.id, String(titles[index]), index],
        );
      }

      await req.db.query(
        `insert into report_history (report_id, user_id, action, to_status, notes)
         values ($1, $2, 'report.created', 'draft', $3)`,
        [report.id, req.user.id, 'Relatório criado'],
      );

      await audit(req.db, req.user, {
        action: 'report.created',
        entity: 'event_reports',
        entityId: report.id,
        after: { title, event: eventRows[0].name },
        moduleKey: 'studio',
      });

      return report;
    });

    res.status(201).json({ report: created });
  }),
);

router.get(
  '/reports/:id',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select r.*, e.name as event_name, e.starts_at, e.type as event_type,
              u.full_name as created_by_name,
              fu.full_name as finalized_by_name
         from event_reports r
         join events e on e.id = r.event_id
         left join users u on u.id = r.created_by
         left join users fu on fu.id = r.finalized_by
        where r.id = $1`,
      [req.params.id],
    );
    if (!rows.length) throw notFound('Relatório não encontrado.');

    const sections = (
      await req.db.query(
        `select s.id, s.title, s.content, s.not_applicable, s.sort_order,
                s.updated_at, s.author_id, u.full_name as author_name
           from report_sections s
           left join users u on u.id = s.author_id
          where s.report_id = $1 order by s.sort_order`,
        [req.params.id],
      )
    ).rows;

    const history = (
      await req.db.query(
        `select h.id, h.action, h.from_status, h.to_status, h.notes, h.created_at,
                u.full_name as user_name
           from report_history h left join users u on u.id = h.user_id
          where h.report_id = $1 order by h.created_at desc`,
        [req.params.id],
      )
    ).rows;

    res.json({ report: rows[0], sections, history });
  }),
);

router.patch(
  '/reports/:id',
  asyncHandler(async (req: any, res) => {
    const { rows: beforeRows } = await req.db.query(
      'select * from event_reports where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Relatório não encontrado.');
    if (beforeRows[0].status === 'finalized' && !can(req.user.level, 'reports.reopen')) {
      throw forbidden('Relatório finalizado: apenas liderança sênior pode alterar.');
    }

    const { rows } = await req.db.query(
      `update event_reports set title = coalesce($1, title), updated_at = now()
        where id = $2 returning *`,
      [req.body?.title ? String(req.body.title).trim().slice(0, 180) : null, req.params.id],
    );

    await audit(req.db, req.user, {
      action: 'report.updated',
      entity: 'event_reports',
      entityId: req.params.id,
      before: { title: beforeRows[0].title },
      after: { title: rows[0].title },
      moduleKey: 'studio',
    });
    res.json({ report: rows[0] });
  }),
);

router.patch(
  '/reports/:id/sections/:sectionId',
  asyncHandler(async (req: any, res) => {
    const db = req.db;
    const { rows: reportRows } = await db.query(
      `select r.*, e.name as event_name from event_reports r
         join events e on e.id = r.event_id where r.id = $1`,
      [req.params.id],
    );
    if (!reportRows.length) throw notFound('Relatório não encontrado.');
    const report = reportRows[0];

    if (report.status === 'finalized' && !can(req.user.level, 'reports.reopen')) {
      throw forbidden(
        'Este relatório está finalizado. Reabra o relatório antes de editá-lo.',
      );
    }

    const { rows: sectionRows } = await db.query(
      'select * from report_sections where id = $1 and report_id = $2',
      [req.params.sectionId, req.params.id],
    );
    if (!sectionRows.length) throw notFound('Seção não encontrada.');

    const content =
      req.body?.content !== undefined
        ? optionalText(req.body.content, 20000)
        : sectionRows[0].content;
    const notApplicable =
      typeof req.body?.not_applicable === 'boolean'
        ? req.body.not_applicable
        : sectionRows[0].not_applicable;

    const { rows } = await db.query(
      `update report_sections set
         content = $1, not_applicable = $2, author_id = $3, updated_at = now()
       where id = $4 returning *`,
      [content, notApplicable, req.user.id, req.params.sectionId],
    );
    await db.query(
      'update event_reports set updated_at = now() where id = $1',
      [report.id],
    );

    await audit(db, req.user, {
      action: 'report.section_updated',
      entity: 'report_sections',
      entityId: req.params.sectionId,
      before: {
        content: sectionRows[0].content,
        not_applicable: sectionRows[0].not_applicable,
      },
      after: { content, not_applicable: notApplicable },
      moduleKey: 'studio',
    });

    res.json({ section: rows[0] });
  }),
);

router.post(
  '/reports/:id/status',
  asyncHandler(async (req: any, res) => {
    const db = req.db;
    const target = oneOf(req.body?.status, REPORT_STATUS, 'situação');
    const notes = optionalText(req.body?.notes, 1000);

    const { rows: reportRows } = await db.query(
      `select r.*, e.name as event_name from event_reports r
         join events e on e.id = r.event_id where r.id = $1`,
      [req.params.id],
    );
    if (!reportRows.length) throw notFound('Relatório não encontrado.');
    const report = reportRows[0];

    if (target === report.status) {
      throw badRequest('O relatório já está nesta situação.');
    }

    if (target === 'in_review') {
      if (report.status !== 'draft') {
        throw badRequest('Somente relatórios em rascunho podem ir para revisão.');
      }
      if (report.created_by !== req.user.id && !can(req.user.level, 'reports.finalize')) {
        throw forbidden('Apenas o autor ou a liderança pode enviar para revisão.');
      }
    }

    if (target === 'finalized') {
      if (report.status !== 'in_review') {
        throw badRequest('Envie o relatório para revisão antes de finalizar.');
      }
      if (!can(req.user.level, 'reports.finalize')) {
        throw forbidden('Seu cargo não permite finalizar relatórios.');
      }
      if (report.created_by === req.user.id && req.user.level < 3) {
        throw forbidden('A finalização exige revisão de outra pessoa.');
      }
    }

    if (target === 'draft') {
      if (!can(req.user.level, 'reports.reopen')) {
        throw forbidden('Reabrir relatórios exige liderança sênior.');
      }
      if (!notes) {
        throw badRequest('Informe a justificativa da reabertura.');
      }
    }

    const updated = await tx(db, async () => {
      const { rows } = await db.query(
        `update event_reports set
           status = $1,
           reviewer_id = case when $1 = 'finalized' then $2::uuid
                              when $1 = 'in_review' then null
                              else reviewer_id end,
           reviewed_at = case when $1 = 'in_review' then now() else reviewed_at end,
           finalized_by = case when $1 = 'finalized' then $2::uuid else null end,
           finalized_at = case when $1 = 'finalized' then now() else null end,
           updated_at = now()
         where id = $3 returning *`,
        [target, req.user.id, report.id],
      );

      await db.query(
        `insert into report_history
           (report_id, user_id, action, from_status, to_status, notes)
         values ($1, $2, $3, $4::report_status, $5::report_status, $6)`,
        [
          report.id,
          req.user.id,
          target === 'finalized' ? 'report.finalized'
            : target === 'in_review' ? 'report.submitted'
            : 'report.reopened',
          report.status,
          target,
          notes,
        ],
      );

      await audit(db, req.user, {
        action: `report.${target}`,
        entity: 'event_reports',
        entityId: report.id,
        before: { status: report.status },
        after: { status: target },
        reason: notes,
        moduleKey: 'studio',
      });

      await notify(db, {
        userId:
          target === 'finalized' && report.created_by !== req.user.id
            ? report.created_by
            : null,
        title:
          target === 'finalized'
            ? 'Relatório finalizado'
            : target === 'draft'
              ? 'Relatório reaberto'
              : 'Relatório enviado para revisão',
        body: `${report.title} — ${report.event_name}`,
        link: `/m/studio/reports/${report.id}`,
        moduleKey: 'studio',
      });

      return rows[0];
    });

    res.json({ report: updated });
  }),
);

export default router;
