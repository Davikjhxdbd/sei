import { Router } from 'express';
import { asyncHandler, badRequest, forbidden, notFound, required, optionalText } from '../../http';
import { assertAction, type Action } from '../../permissions';
import { audit, notify } from '../../audit';

const router = Router();
const STATUSES = ['planning', 'recording', 'editing', 'review', 'published'] as const;

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
    from production_areas a where a.active = true order by a.created_at
  `);
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
     order by t.due_date nulls last, t.created_at desc
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
       order by t.due_date nulls last, t.created_at desc
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

  const area = await req.db.query(
    'select 1 from production_areas where id = $1 and active = true',
    [areaId]
  );
  if (!area.rows.length) throw badRequest('A área selecionada não existe ou está inativa.');

  if (assignedTo) {
    const member = await req.db.query(
      `select 1
         from production_members pm
         join users u on u.id = pm.user_id
        where pm.area_id = $1 and pm.user_id = $2 and u.status = 'active'`,
      [areaId, assignedTo]
    );
    if (!member.rows.length) {
      throw badRequest('O responsável precisa ser membro ativo desta equipe.');
    }
  }

  const { rows } = await req.db.query(`
    insert into production_tasks
      (area_id, title, description, assigned_to, due_date, recording_date, created_by)
    values ($1, $2, $3, $4, $5, $6, $7)
    returning *
  `, [areaId, title, description, assignedTo, dueDate, recordingDate, req.user.id]);

  await req.db.query(`
    insert into production_task_history (task_id, user_id, action, details)
    values ($1, $2, 'created', $3)
  `, [rows[0].id, req.user.id, JSON.stringify({ title })]);

  await audit(req.db, req.user, {
    action: 'production.task_created',
    entity: 'production_tasks',
    entityId: rows[0].id,
    after: rows[0],
    moduleKey: 'studio'
  });

  await notify(req.db, {
    userId: assignedTo,
    title: 'Nova tarefa de produção',
    body: title,
    link: '/m/studio/my-space',
    moduleKey: 'studio'
  });

  res.status(201).json({ task: rows[0] });
}));

router.patch('/production/tasks/:id', asyncHandler(async (req: any, res) => {
  const { rows: beforeRows } = await req.db.query(
    'select * from production_tasks where id = $1',
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

  res.json({ task: rows[0] });
}));

export default router;
