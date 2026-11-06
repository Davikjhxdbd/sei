import { Router } from 'express';
import {
  asyncHandler,
  badRequest,
  forbidden,
  notFound,
  optionalId,
  optionalText,
  required,
} from '../../http';
import { can } from '../../permissions';
import { audit, notify } from '../../audit';
import { tx } from '../../db';

const router = Router();

const TASK_STATUS = ['pending', 'done', 'blocked'] as const;

// ---------------------------------------------------------------------
// Modelos de checklist
// ---------------------------------------------------------------------
router.get(
  '/checklist-templates',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select t.id, t.name, t.description, t.active, t.sector_id, t.created_at,
              s.name as sector_name,
              (select count(*)::int from checklist_template_items i
                where i.template_id = t.id) as item_count
         from checklist_templates t
         left join sectors s on s.id = t.sector_id
        order by t.active desc, t.name`,
    );
    res.json({ items: rows });
  }),
);

router.get(
  '/checklist-templates/:id',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select t.*, s.name as sector_name from checklist_templates t
        left join sectors s on s.id = t.sector_id where t.id = $1`,
      [req.params.id],
    );
    if (!rows.length) throw notFound('Modelo não encontrado.');
    const items = (
      await req.db.query(
        `select id, title, description, sort_order
           from checklist_template_items where template_id = $1
          order by sort_order`,
        [req.params.id],
      )
    ).rows;
    res.json({ template: rows[0], items });
  }),
);

function parseItems(input: unknown) {
  if (!Array.isArray(input)) return null;
  return input
    .filter((i) => i && typeof i.title === 'string' && i.title.trim())
    .map((i) => ({
      title: String(i.title).trim().slice(0, 200),
      description: optionalText(i.description, 1000),
    }));
}

router.post(
  '/checklist-templates',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'checklists.manage')) throw forbidden();
    const name = required(req.body?.name, 'nome', 120);
    const items = parseItems(req.body?.items) ?? [];
    if (!items.length) throw badRequest('Adicione ao menos um item ao modelo.');

    const created = await tx(req.db, async () => {
      const { rows } = await req.db.query(
        `insert into checklist_templates (name, description, sector_id, active)
         values ($1, $2, $3, coalesce($4, true)) returning *`,
        [
          name,
          optionalText(req.body?.description, 1000),
          optionalId(req.body?.sector_id),
          typeof req.body?.active === 'boolean' ? req.body.active : null,
        ],
      );
      const template = rows[0];
      for (let index = 0; index < items.length; index += 1) {
        await req.db.query(
          `insert into checklist_template_items (template_id, title, description, sort_order)
           values ($1, $2, $3, $4)`,
          [template.id, items[index].title, items[index].description, index],
        );
      }
      await audit(req.db, req.user, {
        action: 'checklist_template.created',
        entity: 'checklist_templates',
        entityId: template.id,
        after: { ...template, items: items.length },
        moduleKey: 'studio',
      });
      return template;
    });

    res.status(201).json({ template: created });
  }),
);

router.patch(
  '/checklist-templates/:id',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'checklists.manage')) throw forbidden();
    const { rows: beforeRows } = await req.db.query(
      'select * from checklist_templates where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Modelo não encontrado.');
    const items = parseItems(req.body?.items);

    const updated = await tx(req.db, async () => {
      const { rows } = await req.db.query(
        `update checklist_templates set
           name = coalesce($1, name),
           description = coalesce($2, description),
           sector_id = coalesce($3, sector_id),
           active = coalesce($4, active)
         where id = $5 returning *`,
        [
          req.body?.name ? String(req.body.name).trim().slice(0, 120) : null,
          req.body?.description !== undefined
            ? optionalText(req.body.description, 1000)
            : null,
          optionalId(req.body?.sector_id),
          typeof req.body?.active === 'boolean' ? req.body.active : null,
          req.params.id,
        ],
      );

      if (items && items.length) {
        await req.db.query(
          'delete from checklist_template_items where template_id = $1',
          [req.params.id],
        );
        for (let index = 0; index < items.length; index += 1) {
          await req.db.query(
            `insert into checklist_template_items (template_id, title, description, sort_order)
             values ($1, $2, $3, $4)`,
            [req.params.id, items[index].title, items[index].description, index],
          );
        }
      }

      await audit(req.db, req.user, {
        action: 'checklist_template.updated',
        entity: 'checklist_templates',
        entityId: req.params.id,
        before: beforeRows[0],
        after: rows[0],
        moduleKey: 'studio',
      });

      return rows[0];
    });

    res.json({ template: updated });
  }),
);

// ---------------------------------------------------------------------
// Execuções de checklist
// ---------------------------------------------------------------------
router.get(
  '/checklist-runs',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select r.id, r.name, r.status, r.created_at,
              e.id as event_id, e.name as event_name, e.starts_at,
              count(t.id)::int as tasks_total,
              count(t.id) filter (where t.status = 'done')::int as tasks_done,
              count(t.id) filter (where t.status = 'blocked')::int as tasks_blocked
         from checklist_runs r
         join events e on e.id = r.event_id
         left join checklist_tasks t on t.run_id = r.id
        where ($1::uuid is null or r.event_id = $1)
        group by r.id, e.id
        order by e.starts_at desc, r.created_at desc
        limit 100`,
      [optionalId(req.query.event_id)],
    );
    res.json({ items: rows });
  }),
);

router.post(
  '/checklist-runs',
  asyncHandler(async (req: any, res) => {
    if (!can(req.user.level, 'checklists.run')) throw forbidden();
    const eventId = optionalId(req.body?.event_id);
    const templateId = optionalId(req.body?.template_id);
    if (!eventId) throw badRequest('Selecione o evento.');
    if (!templateId) throw badRequest('Selecione o modelo de checklist.');

    const created = await tx(req.db, async () => {
      const { rows: eventRows } = await req.db.query(
        'select id, name from events where id = $1',
        [eventId],
      );
      if (!eventRows.length) throw notFound('Evento não encontrado.');

      const { rows: templateRows } = await req.db.query(
        'select * from checklist_templates where id = $1',
        [templateId],
      );
      if (!templateRows.length) throw notFound('Modelo não encontrado.');
      if (!templateRows[0].active) {
        throw badRequest('Este modelo está desativado.');
      }

      const { rows: itemRows } = await req.db.query(
        `select id, title, description, sort_order from checklist_template_items
          where template_id = $1 order by sort_order`,
        [templateId],
      );

      const { rows: runRows } = await req.db.query(
        `insert into checklist_runs (event_id, template_id, name, created_by)
         values ($1, $2, $3, $4) returning *`,
        [
          eventId,
          templateId,
          optionalText(req.body?.name, 160) ?? templateRows[0].name,
          req.user.id,
        ],
      );
      const run = runRows[0];

      for (let index = 0; index < itemRows.length; index += 1) {
        const item = itemRows[index];
        await req.db.query(
          `insert into checklist_tasks
             (run_id, sector_id, title, description, sort_order)
           values ($1, $2, $3, $4, $5)`,
          [
            run.id,
            templateRows[0].sector_id,
            item.title,
            item.description,
            item.sort_order ?? index,
          ],
        );
      }

      await audit(req.db, req.user, {
        action: 'checklist_run.created',
        entity: 'checklist_runs',
        entityId: run.id,
        after: { run, tasks: itemRows.length, event: eventRows[0].name },
        moduleKey: 'studio',
      });

      return run;
    });

    res.status(201).json({ run: created });
  }),
);

router.get(
  '/checklist-runs/:id',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select r.*, e.name as event_name, e.starts_at, e.id as event_id
         from checklist_runs r join events e on e.id = r.event_id
        where r.id = $1`,
      [req.params.id],
    );
    if (!rows.length) throw notFound('Execução não encontrada.');

    const tasks = (
      await req.db.query(
        `select t.id, t.title, t.description, t.status, t.notes, t.block_reason,
                t.sort_order, t.completed_at, t.updated_at,
                t.sector_id, sec.name as sector_name,
                t.assignee_id, u.full_name as assignee_name,
                cu.full_name as completed_by_name
           from checklist_tasks t
           left join sectors sec on sec.id = t.sector_id
           left join users u on u.id = t.assignee_id
           left join users cu on cu.id = t.completed_by
          where t.run_id = $1
          order by t.sort_order, t.title`,
        [req.params.id],
      )
    ).rows;

    res.json({ run: rows[0], tasks });
  }),
);

// ---------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------
router.get(
  '/checklist-tasks/mine',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select t.id, t.title, t.status, t.run_id,
              e.id as event_id, e.name as event_name, e.starts_at
         from checklist_tasks t
         join checklist_runs r on r.id = t.run_id
         join events e on e.id = r.event_id
        where t.assignee_id = $1
        order by e.starts_at desc limit 100`,
      [req.user.id],
    );
    res.json({ items: rows });
  }),
);

router.get(
  '/checklist-tasks/:id/history',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select h.id, h.action, h.from_status, h.to_status, h.notes, h.created_at,
              u.full_name as user_name
         from checklist_task_history h
         left join users u on u.id = h.user_id
        where h.task_id = $1
        order by h.created_at desc`,
      [req.params.id],
    );
    res.json({ items: rows });
  }),
);

router.patch(
  '/checklist-tasks/:id',
  asyncHandler(async (req: any, res) => {
    const db = req.db;
    const { rows: taskRows } = await db.query(
      `select t.*, e.name as event_name, r.event_id
         from checklist_tasks t
         join checklist_runs r on r.id = t.run_id
         join events e on e.id = r.event_id
        where t.id = $1`,
      [req.params.id],
    );
    if (!taskRows.length) throw notFound('Tarefa não encontrada.');
    const task = taskRows[0];

    const isMine = task.assignee_id === req.user.id || task.assignee_id === null;
    if (!isMine && !can(req.user.level, 'checklists.assign')) {
      throw forbidden('Esta tarefa está atribuída a outra pessoa.');
    }

    const newStatus =
      req.body?.status === undefined
        ? null
        : (['pending', 'done', 'blocked'] as const).find(
            (s) => s === req.body.status,
          ) ?? null;
    if (req.body?.status !== undefined && !newStatus) {
      throw badRequest('Situação de tarefa inválida.');
    }

    const assigneeProvided = req.body?.assignee_id !== undefined;
    if (assigneeProvided && !can(req.user.level, 'checklists.assign')) {
      throw forbidden('Seu cargo não permite alterar o responsável.');
    }
    const newAssignee = assigneeProvided
      ? optionalId(req.body.assignee_id)
      : null;

    const statusChanged = newStatus && newStatus !== task.status;
    if (statusChanged && task.status === 'done' && newStatus !== 'done') {
      if (!can(req.user.level, 'checklists.assign')) {
        throw forbidden('Reabrir uma tarefa concluída exige liderança.');
      }
    }

    const blockReason =
      req.body?.block_reason !== undefined
        ? optionalText(req.body.block_reason, 1000)
        : task.block_reason;
    if (newStatus === 'blocked' && !blockReason) {
      throw badRequest('Informe o motivo do bloqueio.');
    }

    const notes =
      req.body?.notes !== undefined ? optionalText(req.body.notes, 2000) : task.notes;

    const updated = await tx(db, async () => {
      const { rows } = await db.query(
        `update checklist_tasks set
           status = coalesce($1::task_status, status),
           notes = $2,
           block_reason = $3,
           assignee_id = $4,
           completed_at = case when $1::task_status = 'done' then now()
                               when $1::task_status is null then completed_at
                               else null end,
           completed_by = case when $1::task_status = 'done' then $5::uuid
                               when $1::task_status is null then completed_by
                               else null end,
           updated_at = now()
         where id = $6
         returning *`,
        [
          newStatus,
          notes,
          newStatus === 'blocked' ? blockReason : null,
          assigneeProvided ? newAssignee : task.assignee_id,
          req.user.id,
          req.params.id,
        ],
      );

      if (statusChanged) {
        await db.query(
          `insert into checklist_task_history
             (task_id, action, from_status, to_status, user_id, notes)
           values ($1, $2, $3::task_status, $4::task_status, $5, $6)`,
          [
            task.id,
            newStatus === 'done' ? 'task.completed'
              : newStatus === 'blocked' ? 'task.blocked' : 'task.reopened',
            task.status,
            newStatus,
            req.user.id,
            optionalText(req.body?.history_notes, 1000) ?? notes,
          ],
        );

        await audit(db, req.user, {
          action: `checklist_task.${newStatus}`,
          entity: 'checklist_tasks',
          entityId: task.id,
          before: { status: task.status },
          after: { status: newStatus, block_reason: blockReason },
          moduleKey: 'studio',
        });
      }

      if (assigneeProvided && newAssignee !== task.assignee_id) {
        await db.query(
          `insert into checklist_task_history
             (task_id, action, from_status, to_status, user_id, notes)
           values ($1, 'task.reassigned', $2::task_status, $2::task_status, $3, $4)`,
          [task.id, task.status, req.user.id, 'Responsável alterado'],
        );
        if (newAssignee) {
          await notify(db, {
            userId: newAssignee,
            title: 'Nova tarefa atribuída',
            body: `${task.title} — ${task.event_name}`,
            link: `/m/studio/checklists/runs/${task.run_id}`,
            moduleKey: 'studio',
          });
        }
      }

      return rows[0];
    });

    res.json({ task: updated });
  }),
);

export default router;
