import { Router } from 'express';
import { asyncHandler, badRequest, forbidden, notFound, required, optionalText, oneOf } from '../../http';
import { assertAction, type Action } from '../../permissions';
import { audit, notify } from '../../audit';
import { tx } from '../../db';

const router = Router();
const STATUSES = ['planning', 'recording', 'editing', 'review', 'published'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

function ensure(user: any, action: Action) {
  assertAction(user.level, action);
}

router.get('/departments/:slug', asyncHandler(async (req: any, res) => {
  ensure(req.user, 'production.view');

  const { rows: departments } = await req.db.query(
    'select * from studio_departments where slug = $1 and active = true',
    [req.params.slug]
  );
  if (!departments.length) throw notFound('Departamento não encontrado.');

  const department = departments[0];
  if (req.user.level < 3) {
    const { rows: access } = await req.db.query(`
      select 1
        from studio_department_members
       where department_id = $1 and user_id = $2
      union
      select 1
        from production_members pm
        join production_areas a on a.id = pm.area_id
       where a.studio_department_id = $1 and pm.user_id = $2
      limit 1
    `, [department.id, req.user.id]);
    if (!access.length) throw notFound('Departamento não encontrado.');
  }
  const [areas, members, tasks, totals] = await Promise.all([
    req.db.query(`
      select a.id, a.name, a.slug, a.description,
        count(t.id)::int as tasks_count,
        count(t.id) filter (where t.status <> 'published')::int as open_tasks
      from production_areas a
      left join production_tasks t on t.area_id = a.id
      where a.studio_department_id = $1 and a.active = true
      group by a.id
      order by a.created_at
    `, [department.id]),
    req.db.query(`
      select distinct u.id, u.full_name, m.function
      from studio_department_members m
      join users u on u.id = m.user_id
      where m.department_id = $1
      union
      select distinct u.id, u.full_name, pm.function
      from production_members pm
      join production_areas a on a.id = pm.area_id
      join users u on u.id = pm.user_id
      where a.studio_department_id = $1
      order by full_name
    `, [department.id]),
    req.db.query(`
      select t.*, a.name as area_name, a.slug as area_slug,
        u.full_name as assignee_name
      from production_tasks t
      join production_areas a on a.id = t.area_id
      left join users u on u.id = t.assigned_to
      where a.studio_department_id = $1
      order by
        case when t.status = 'published' then 1 else 0 end,
        case t.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
        t.due_date nulls last,
        t.created_at desc
      limit 100
    `, [department.id]),
    req.db.query(`
      select
        count(t.id)::int as tasks,
        count(t.id) filter (where t.status <> 'published')::int as open,
        count(t.id) filter (where t.status = 'published')::int as published
      from production_tasks t
      join production_areas a on a.id = t.area_id
      where a.studio_department_id = $1
    `, [department.id])
  ]);

  res.json({
    department,
    areas: areas.rows,
    members: members.rows,
    tasks: tasks.rows,
    totals: totals.rows[0]
  });
}));

router.get('/production/summary', asyncHandler(async (req: any, res) => {
  ensure(req.user, 'production.view');
  if (req.user.level < 3) throw forbidden('O resumo geral é restrito à liderança.');

  const [totals, statuses, areas] = await Promise.all([
    req.db.query(`
      select
        (select count(*)::int from production_areas where active = true) as areas,
        (select count(*)::int from production_members m join production_areas a on a.id = m.area_id where a.active = true) as members,
        (select count(*)::int from production_tasks t join production_areas a on a.id = t.area_id where a.active = true) as tasks,
        (select count(*)::int from production_tasks t join production_areas a on a.id = t.area_id where a.active = true and t.status <> 'published') as open,
        (select count(*)::int from production_tasks t join production_areas a on a.id = t.area_id where a.active = true and t.status = 'published') as published
    `),
    req.db.query(`
      select status, count(*)::int as total
      from production_tasks t
      join production_areas a on a.id = t.area_id
      where a.active = true
      group by status
      order by array_position(ARRAY['planning','recording','editing','review','published'], status)
    `),
    req.db.query(`
      select a.id, a.name, a.slug,
        count(t.id)::int as tasks,
        count(t.id) filter (where t.status <> 'published')::int as open_tasks,
        count(t.id) filter (where t.status = 'published')::int as published
      from production_areas a
      left join production_tasks t on t.area_id = a.id
      where a.active = true
      group by a.id
      order by a.created_at
    `)
  ]);

  res.json({
    totals: totals.rows[0],
    byStatus: statuses.rows,
    byArea: areas.rows
  });
}));

router.get('/production/areas', asyncHandler(async (req: any, res) => {
  ensure(req.user, 'production.view');
  const { rows } = await req.db.query(`
    select a.*,
      (select count(*)::int from production_members m where m.area_id = a.id) as members_count,
      (select count(*)::int from production_tasks t where t.area_id = a.id) as tasks_count,
      (select count(*)::int from production_tasks t where t.area_id = a.id and t.status <> 'published') as open_tasks
    from production_areas a
    where a.active = true
      and (
        $1 >= 3
        or exists (
          select 1 from production_members pm
           where pm.area_id = a.id and pm.user_id = $1
        )
      )
    order by a.created_at
  `, [req.user.level, req.user.id]);
  res.json({ items: rows });
}));

router.get('/production/mine', asyncHandler(async (req: any, res) => {
  ensure(req.user, 'production.view');
  const { rows } = await req.db.query(`
    select t.*, a.name as area_name, a.slug as area_slug,
           u.full_name as assignee_name
      from production_tasks t
      join production_areas a on a.id = t.area_id
      left join users u on u.id = t.assigned_to
     where t.assigned_to = $1
        or (
          t.assigned_to is null
          and exists (
            select 1 from production_members pm
             where pm.area_id = t.area_id and pm.user_id = $1
          )
        )
     order by
       case t.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
       t.due_date nulls last, t.created_at desc
  `, [req.user.id]);

  const { rows: memberships } = await req.db.query(`
    select a.id as area_id, a.name, a.slug, m.function
      from production_members m
      join production_areas a on a.id = m.area_id
     where m.user_id = $1 and a.active = true
     order by a.name
  `, [req.user.id]);

  res.json({ tasks: rows, areas: memberships });
}));

router.get('/production/areas/:slug', asyncHandler(async (req: any, res) => {
  ensure(req.user, 'production.view');
  const { rows } = await req.db.query(
    'select * from production_areas where slug = $1 and active = true',
    [req.params.slug]
  );
  if (!rows.length) throw notFound('Área de produção não encontrada.');

  const area = rows[0];
  if (req.user.level < 3) {
    const { rows: access } = await req.db.query(
      'select 1 from production_members where area_id = $1 and user_id = $2 limit 1',
      [area.id, req.user.id]
    );
    if (!access.length) throw notFound('Área de produção não encontrada.');
  }
  const [members, tasks] = await Promise.all([
    req.db.query(`
      select u.id, u.full_name, m.function
        from production_members m join users u on u.id = m.user_id
       where m.area_id = $1 order by u.full_name
    `, [area.id]),
    req.db.query(`
      select t.*, u.full_name as assignee_name
        from production_tasks t left join users u on u.id = t.assigned_to
       where t.area_id = $1
       order by case t.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
               t.due_date nulls last, t.created_at desc
    `, [area.id])
  ]);

  res.json({ area, members: members.rows, tasks: tasks.rows });
}));

router.post('/production/tasks', asyncHandler(async (req: any, res) => {
  ensure(req.user, 'production.create');
  const title = required(req.body?.title, 'título', 180);
  const areaId = required(req.body?.area_id, 'área', 64);
  const description = optionalText(req.body?.description);
  const assignedTo = req.body?.assigned_to || null;
  const dueDate = req.body?.due_date || null;
  const recordingDate = req.body?.recording_date || null;
  const priority = oneOf(req.body?.priority ?? 'normal', PRIORITIES, 'prioridade');

  const task = await tx(req.db, async () => {
    const area = await req.db.query(
      'select 1 from production_areas where id = $1 and active = true for share',
      [areaId]
    );
    if (!area.rows.length) throw badRequest('A área selecionada não existe ou está inativa.');

    if (req.user.level < 3) {
      const { rows: membership } = await req.db.query(
        'select 1 from production_members where area_id = $1 and user_id = $2 limit 1',
        [areaId, req.user.id]
      );
      if (!membership.length) throw forbidden('Você só pode criar solicitações nas equipes das quais participa.');
    }

    if (assignedTo) {
      const member = await req.db.query(
        `select 1
           from production_members pm
           join users u on u.id = pm.user_id
          where pm.area_id = $1 and pm.user_id = $2 and u.status = 'active'
          for share of pm, u`,
        [areaId, assignedTo]
      );
      if (!member.rows.length) {
        throw badRequest('O responsável precisa ser membro ativo desta equipe.');
      }
    }

    const { rows } = await req.db.query(`
      insert into production_tasks
        (area_id, title, description, assigned_to, due_date, recording_date, created_by, priority)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning *
    `, [areaId, title, description, assignedTo, dueDate, recordingDate, req.user.id, priority]);

    await req.db.query(`
      insert into production_task_history (task_id, user_id, action, details)
      values ($1, $2, 'created', $3)
    `, [rows[0].id, req.user.id, JSON.stringify({ title, priority, assigned_to: assignedTo })]);

    await audit(req.db, req.user, {
      action: 'production.task_created',
      entity: 'production_tasks',
      entityId: rows[0].id,
      after: rows[0],
      moduleKey: 'studio'
    });

    if (assignedTo) {
      await notify(req.db, {
        userId: assignedTo,
        title: 'Nova solicitação de produção',
        body: title,
        link: '/m/studio/my-space',
        moduleKey: 'studio'
      });
    } else {
      const { rows: members } = await req.db.query(
        `select distinct pm.user_id
           from production_members pm
           join users u on u.id = pm.user_id
          where pm.area_id = $1 and pm.user_id <> $2 and u.status = 'active'`,
        [areaId, req.user.id]
      );
      await Promise.all(members.map((member: any) => notify(req.db, {
        userId: member.user_id,
        title: 'Nova solicitação para sua equipe',
        body: title,
        link: '/m/studio/my-space',
        moduleKey: 'studio'
      })));
    }
    return rows[0];
  });

  res.status(201).json({ task });
}));

router.patch('/production/tasks/:id', asyncHandler(async (req: any, res) => {
  const task = await tx(req.db, async () => {
  const { rows: beforeRows } = await req.db.query(
    'select * from production_tasks where id = $1 for update',
    [req.params.id]
  );
  if (!beforeRows.length) throw notFound('Tarefa não encontrada.');

  const before = beforeRows[0];
  const isAssignee = before.assigned_to === req.user.id;
  const isCreator = before.created_by === req.user.id;
  const canManage = req.user.level >= 3;
  if (!isAssignee && !isCreator && !canManage) {
    throw notFound('Tarefa não encontrada.');
  }
  if (isAssignee && !isCreator && !canManage) {
    const allowedFields = new Set(['status']);
    if (Object.keys(req.body ?? {}).some((key) => !allowedFields.has(key))) {
      throw forbidden('Responsáveis podem atualizar apenas a etapa da própria tarefa.');
    }
    if (req.body?.status === undefined) {
      throw badRequest('Informe a nova etapa da tarefa.');
    }
  }

  const status = req.body?.status;
  if (status && !STATUSES.includes(status)) throw badRequest('Etapa inválida.');

  const title = req.body?.title !== undefined ? required(req.body.title, 'título', 180) : before.title;
  const description = req.body?.description !== undefined ? optionalText(req.body.description) : before.description;
  const dueDate = req.body?.due_date !== undefined ? req.body.due_date : before.due_date;
  const recordingDate = req.body?.recording_date !== undefined ? req.body.recording_date : before.recording_date;

  const { rows } = await req.db.query(`
    update production_tasks
       set title = $1, description = $2, due_date = $3, recording_date = $4,
           status = coalesce($5, status), updated_at = now()
     where id = $6 returning *
  `, [title, description, dueDate, recordingDate, status || null, req.params.id]);

  await req.db.query(`
    insert into production_task_history (task_id, user_id, action, details)
    values ($1, $2, 'updated', $3)
  `, [req.params.id, req.user.id, JSON.stringify({ before, after: rows[0] })]);

  await audit(req.db, req.user, {
    action: 'production.task_updated',
    entity: 'production_tasks',
    entityId: req.params.id,
    before,
    after: rows[0],
    moduleKey: 'studio'
  });
  if (before.status !== rows[0].status && before.assigned_to !== req.user.id) {
    await notify(req.db, {
      userId: before.assigned_to,
      title: 'Etapa da produção atualizada',
      body: rows[0].title,
      link: '/m/studio/my-space',
      moduleKey: 'studio'
    });
  }
  if (before.status !== rows[0].status && before.created_by !== req.user.id) {
    await notify(req.db, {
      userId: before.created_by,
      title: 'Produção atualizada',
      body: req.user.full_name + ' atualizou: ' + rows[0].title,
      link: '/m/studio/production',
      moduleKey: 'studio'
    });
  }
  return rows[0];
  });

  res.json({ task });
}));


/** Atividade e conversa da tarefa: reutiliza o histórico append-only já existente. */
async function accessibleTask(req: any) {
  const { rows } = await req.db.query(
    'select * from production_tasks where id = $1',
    [req.params.id]
  );
  if (!rows.length) throw notFound('Tarefa não encontrada.');
  const task = rows[0];
  if (task.assigned_to === req.user.id || task.created_by === req.user.id || req.user.level >= 3) {
    return task;
  }
  const { rows: membership } = await req.db.query(
    'select 1 from production_members where area_id = $1 and user_id = $2 limit 1',
    [task.area_id, req.user.id]
  );
  if (!membership.length) throw notFound('Tarefa não encontrada.');
  return task;
}

router.get('/production/tasks/:id/activity', asyncHandler(async (req: any, res) => {
  await accessibleTask(req);
  const { rows } = await req.db.query(`
    select h.id, h.action, h.details, h.created_at,
           coalesce(u.full_name, 'Usuário removido') as user_name,
           h.user_id
      from production_task_history h
      left join users u on u.id = h.user_id
     where h.task_id = $1
     order by h.created_at asc, h.id asc
  `, [req.params.id]);
  res.json({ items: rows });
}));

router.post('/production/tasks/:id/comments', asyncHandler(async (req: any, res) => {
  const task = await accessibleTask(req);
  const message = required(req.body?.message, 'mensagem', 4000);
  const item = await tx(req.db, async () => {
    const { rows } = await req.db.query(`
      insert into production_task_history (task_id, user_id, action, details)
      values ($1, $2, 'comment', $3)
      returning id, action, details, created_at
    `, [task.id, req.user.id, JSON.stringify({ message })]);

    let recipients = [task.assigned_to, task.created_by];
    if (!task.assigned_to) {
      const { rows: team } = await req.db.query(
        'select distinct user_id from production_members where area_id = $1',
        [task.area_id]
      );
      recipients = [...recipients, ...team.map((member: any) => member.user_id)];
    }
    recipients = [...new Set(recipients)].filter((userId) => userId && userId !== req.user.id);
    await Promise.all(recipients.map((userId) => notify(req.db, {
      userId,
      title: 'Nova mensagem em uma produção',
      body: message.slice(0, 180),
      link: '/m/studio/production',
      moduleKey: 'studio'
    })));
    await audit(req.db, req.user, {
      action: 'production.task_comment',
      entity: 'production_tasks',
      entityId: task.id,
      after: { message },
      moduleKey: 'studio'
    });
    return { ...rows[0], user_id: req.user.id, user_name: req.user.full_name };
  });
  res.status(201).json({ item });
}));

router.post('/production/tasks/:id/claim', asyncHandler(async (req: any, res) => {
  const task = await tx(req.db, async () => {
    const { rows } = await req.db.query(
      'select * from production_tasks where id = $1 for update',
      [req.params.id]
    );
    if (!rows.length) throw notFound('Solicitação não encontrada.');
    const current = rows[0];
    if (current.assigned_to) throw badRequest('Esta solicitação já foi assumida por outra pessoa.');

    const { rows: membership } = await req.db.query(
      `select 1 from production_members pm
        join users u on u.id = pm.user_id
       where pm.area_id = $1 and pm.user_id = $2 and u.status = 'active'
       for share of pm, u`,
      [current.area_id, req.user.id]
    );
    if (!membership.length) throw notFound('Solicitação não encontrada.');

    const { rows: updated } = await req.db.query(
      'update production_tasks set assigned_to = $1, updated_at = now() where id = $2 and assigned_to is null returning *',
      [req.user.id, current.id]
    );
    if (!updated.length) throw badRequest('Outra pessoa acabou de assumir esta solicitação.');

    await req.db.query(`
      insert into production_task_history (task_id, user_id, action, details)
      values ($1, $2, 'claimed', $3)
    `, [current.id, req.user.id, JSON.stringify({ assigned_to: req.user.id })]);
    await notify(req.db, {
      userId: current.created_by,
      title: 'Solicitação assumida',
      body: req.user.full_name + ' assumiu: ' + current.title,
      link: '/m/studio/production',
      moduleKey: 'studio'
    });
    await audit(req.db, req.user, {
      action: 'production.task_claimed',
      entity: 'production_tasks',
      entityId: current.id,
      before: current,
      after: updated[0],
      moduleKey: 'studio'
    });
    return updated[0];
  });
  res.json({ task });
}));

router.post('/production/tasks/:id/accept', asyncHandler(async (req: any, res) => {
  const task = await tx(req.db, async () => {
    const { rows } = await req.db.query(
      'select * from production_tasks where id = $1 for update',
      [req.params.id]
    );
    if (!rows.length) throw notFound('Tarefa não encontrada.');
    const current = rows[0];
    if (current.assigned_to !== req.user.id) throw notFound('Tarefa não encontrada.');

    const { rows: accepted } = await req.db.query(`
      select 1 from production_task_history
       where task_id = $1 and user_id = $2 and action = 'accepted'
       limit 1
    `, [current.id, req.user.id]);
    if (!accepted.length) {
      await req.db.query(`
        insert into production_task_history (task_id, user_id, action, details)
        values ($1, $2, 'accepted', $3)
      `, [current.id, req.user.id, JSON.stringify({ confirmed: true })]);
      await notify(req.db, {
        userId: current.created_by,
        title: 'Tarefa recebida',
        body: req.user.full_name + ' confirmou o recebimento: ' + current.title,
        link: '/m/studio/production',
        moduleKey: 'studio'
      });
    }
    return current;
  });
  res.json({ ok: true, task_id: task.id });
}));

export default router;
