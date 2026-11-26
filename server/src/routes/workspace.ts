import { Router } from 'express';
import { asyncHandler, badRequest, notFound, optionalText, required } from '../http';
import { audit } from '../audit';
import { tx } from '../db';

const router = Router();
const PROJECT_STATUSES = ['active', 'paused', 'completed', 'archived'] as const;
const TASK_STATUSES = ['todo', 'doing', 'waiting', 'done', 'archived'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

function dateValue(value: unknown, label: string): string | null {
  if (value === null || value === '' || value === undefined) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest(`Informe uma data válida para ${label}.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw badRequest(`Informe uma data válida para ${label}.`);
  }
  return value;
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw badRequest(`Selecione uma opção válida para ${label}.`);
  }
  return value as T[number];
}

router.get('/overview', asyncHandler(async (req: any, res) => {
  const [projects, tasks, totals] = await Promise.all([
    req.db.query(`
      select p.*,
        count(t.id)::int as task_count,
        count(t.id) filter (where t.status = 'done')::int as completed_tasks
      from personal_projects p
      left join personal_tasks t on t.project_id = p.id and t.owner_id = p.owner_id
      where p.owner_id = $1
      group by p.id
      order by case p.status when 'active' then 0 when 'paused' then 1 when 'completed' then 2 else 3 end,
               p.updated_at desc
    `, [req.user.id]),
    req.db.query(`
      select t.id, t.project_id, t.title, t.description, t.status, t.priority,
             t.due_date, t.completed_at, t.created_at, t.updated_at,
             p.name as project_name
        from personal_tasks t
        left join personal_projects p on p.id = t.project_id and p.owner_id = t.owner_id
       where t.owner_id = $1 and t.status <> 'archived'
       order by case t.status when 'todo' then 0 when 'doing' then 1 when 'waiting' then 2 else 3 end,
                t.due_date asc nulls last, t.created_at desc
       limit 250
    `, [req.user.id]),
    req.db.query(`
      select
        count(*) filter (where status in ('todo','doing','waiting'))::int as open_tasks,
        count(*) filter (where status = 'doing')::int as doing_tasks,
        count(*) filter (where status = 'done' and completed_at >= date_trunc('week', now()))::int as completed_this_week,
        count(*) filter (where status in ('todo','doing','waiting') and due_date < current_date)::int as overdue_tasks
      from personal_tasks where owner_id = $1
    `, [req.user.id]),
  ]);
  res.json({ projects: projects.rows, tasks: tasks.rows, totals: totals.rows[0] });
}));

router.post('/projects', asyncHandler(async (req: any, res) => {
  const name = required(req.body?.name, 'nome do projeto', 140);
  const description = optionalText(req.body?.description, 3000);
  const dueDate = dateValue(req.body?.due_date, 'prazo');
  const project = await tx(req.db, async () => {
    const { rows } = await req.db.query(`
      insert into personal_projects (owner_id, name, description, due_date)
      values ($1, $2, $3, $4) returning *
    `, [req.user.id, name, description, dueDate]);
    await audit(req.db, req.user, {
      action: 'personal_project.created', entity: 'personal_projects',
      entityId: rows[0].id, after: { name, due_date: dueDate }, moduleKey: 'management',
    });
    return rows[0];
  });
  res.status(201).json({ project });
}));

router.patch('/projects/:id', asyncHandler(async (req: any, res) => {
  const { rows: beforeRows } = await req.db.query(
    'select * from personal_projects where id = $1 and owner_id = $2 for update',
    [req.params.id, req.user.id],
  );
  if (!beforeRows.length) throw notFound('Projeto não encontrado.');
  const before = beforeRows[0];
  const name = req.body?.name !== undefined ? required(req.body.name, 'nome do projeto', 140) : before.name;
  const description = req.body?.description !== undefined ? optionalText(req.body.description, 3000) : before.description;
  const dueDate = req.body?.due_date !== undefined ? dateValue(req.body.due_date, 'prazo') : before.due_date;
  const status = req.body?.status !== undefined ? oneOf(req.body.status, PROJECT_STATUSES, 'situação') : before.status;
  const { rows } = await req.db.query(`
    update personal_projects
       set name = $1, description = $2, due_date = $3, status = $4, updated_at = now()
     where id = $5 and owner_id = $6 returning *
  `, [name, description, dueDate, status, req.params.id, req.user.id]);
  await audit(req.db, req.user, {
    action: 'personal_project.updated', entity: 'personal_projects',
    entityId: req.params.id, before, after: rows[0], moduleKey: 'management',
  });
  res.json({ project: rows[0] });
}));

router.post('/tasks', asyncHandler(async (req: any, res) => {
  const title = required(req.body?.title, 'título da tarefa', 180);
  const description = optionalText(req.body?.description, 3000);
  const projectId = req.body?.project_id || null;
  const dueDate = dateValue(req.body?.due_date, 'prazo');
  const priority = oneOf(req.body?.priority ?? 'normal', PRIORITIES, 'prioridade');
  if (projectId) {
    const exists = await req.db.query(
      'select 1 from personal_projects where id = $1 and owner_id = $2 and status <> $3',
      [projectId, req.user.id, 'archived'],
    );
    if (!exists.rows.length) throw badRequest('O projeto selecionado não está disponível.');
  }
  const { rows } = await req.db.query(`
    insert into personal_tasks (owner_id, project_id, title, description, priority, due_date)
    values ($1, $2, $3, $4, $5, $6) returning *
  `, [req.user.id, projectId, title, description, priority, dueDate]);
  await audit(req.db, req.user, {
    action: 'personal_task.created', entity: 'personal_tasks',
    entityId: rows[0].id, after: { title, project_id: projectId, priority, due_date: dueDate },
    moduleKey: 'management',
  });
  res.status(201).json({ task: rows[0] });
}));

router.patch('/tasks/:id', asyncHandler(async (req: any, res) => {
  const { rows: beforeRows } = await req.db.query(
    'select * from personal_tasks where id = $1 and owner_id = $2 for update',
    [req.params.id, req.user.id],
  );
  if (!beforeRows.length) throw notFound('Tarefa não encontrada.');
  const before = beforeRows[0];
  const title = req.body?.title !== undefined ? required(req.body.title, 'título da tarefa', 180) : before.title;
  const description = req.body?.description !== undefined ? optionalText(req.body.description, 3000) : before.description;
  const projectId = req.body?.project_id !== undefined ? (req.body.project_id || null) : before.project_id;
  const dueDate = req.body?.due_date !== undefined ? dateValue(req.body.due_date, 'prazo') : before.due_date;
  const priority = req.body?.priority !== undefined ? oneOf(req.body.priority, PRIORITIES, 'prioridade') : before.priority;
  const status = req.body?.status !== undefined ? oneOf(req.body.status, TASK_STATUSES, 'situação') : before.status;
  if (projectId) {
    const exists = await req.db.query(
      'select 1 from personal_projects where id = $1 and owner_id = $2 and status <> $3',
      [projectId, req.user.id, 'archived'],
    );
    if (!exists.rows.length) throw badRequest('O projeto selecionado não está disponível.');
  }
  const { rows } = await req.db.query(`
    update personal_tasks
       set title = $1, description = $2, project_id = $3, due_date = $4,
           priority = $5, status = $6,
           completed_at = case when $6 = 'done' then coalesce(completed_at, now()) else null end,
           updated_at = now()
     where id = $7 and owner_id = $8 returning *
  `, [title, description, projectId, dueDate, priority, status, req.params.id, req.user.id]);
  await audit(req.db, req.user, {
    action: 'personal_task.updated', entity: 'personal_tasks',
    entityId: req.params.id, before, after: rows[0], moduleKey: 'management',
  });
  res.json({ task: rows[0] });
}));

export default router;
