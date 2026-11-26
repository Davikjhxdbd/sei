import { Router } from 'express';
import { asyncHandler, badRequest, forbidden, notFound, optionalText, required } from '../http';
import { audit, notify } from '../audit';
import { tx } from '../db';

const router = Router();
const PROJECT_STATUSES = ['active', 'paused', 'completed', 'archived'] as const;
const TASK_STATUSES = ['todo', 'doing', 'waiting', 'done', 'archived'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
const TASK_STATUS_LABELS: Record<string, string> = { todo: 'A fazer', doing: 'Em andamento', waiting: 'Aguardando', done: 'Concluída', archived: 'Arquivada' };

function dateValue(value: unknown, label: string): string | null {
  if (value === null || value === '' || value === undefined) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badRequest(`Informe uma data válida para ${label}.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw badRequest(`Informe uma data válida para ${label}.`);
  return value;
}
function oneOf<T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) throw badRequest(`Selecione uma opção válida para ${label}.`);
  return value as T[number];
}
async function activeUser(db: any, userId: string) {
  const result = await db.query("select 1 from users where id = $1 and status = 'active'", [userId]);
  if (!result.rows.length) throw badRequest('A pessoa responsável não está ativa.');
}

router.get('/overview', asyncHandler(async (req: any, res) => {
  const [projects, tasks, totals] = await Promise.all([
    req.db.query(`
      select p.*, u.full_name as owner_name,
        count(t.id) filter (where t.status <> 'archived')::int as task_count,
        count(t.id) filter (where t.status = 'done')::int as completed_tasks
      from personal_projects p
      join users u on u.id = p.owner_id
      left join personal_tasks t on t.project_id = p.id and t.owner_id = p.owner_id
      where p.owner_id = $1 or $2::int >= 3
      group by p.id, u.full_name
      order by case p.status when 'active' then 0 when 'paused' then 1 when 'completed' then 2 else 3 end,
               p.updated_at desc
    `, [req.user.id, req.user.level]),
    req.db.query(`
      select t.id, t.owner_id, t.created_by, owner.full_name as assignee_name,
             t.project_id, t.title, t.description, t.status, t.priority,
             t.due_date, t.completed_at, t.created_at, t.updated_at,
             p.name as project_name
        from personal_tasks t
        left join personal_projects p on p.id = t.project_id and p.owner_id = t.owner_id
        join users owner on owner.id = t.owner_id
       where (t.owner_id = $1 or $2::int >= 3) and t.status <> 'archived'
       order by case t.status when 'todo' then 0 when 'doing' then 1 when 'waiting' then 2 else 3 end,
                t.due_date asc nulls last, t.created_at desc
       limit 250
    `, [req.user.id, req.user.level]),
    req.db.query(`
      select
        count(*) filter (where status in ('todo','doing','waiting'))::int as open_tasks,
        count(*) filter (where status = 'doing')::int as doing_tasks,
        count(*) filter (where status = 'done' and completed_at >= date_trunc('week', now()))::int as completed_this_week,
        count(*) filter (where status in ('todo','doing','waiting') and due_date < current_date)::int as overdue_tasks
      from personal_tasks
      where owner_id = $1 or $2::int >= 3
    `, [req.user.id, req.user.level]),
  ]);
  res.json({ projects: projects.rows, tasks: tasks.rows, totals: totals.rows[0] });
}));

router.post('/projects', asyncHandler(async (req: any, res) => {
  const name = required(req.body?.name, 'nome do projeto', 140);
  const description = optionalText(req.body?.description, 3000);
  const dueDate = dateValue(req.body?.due_date, 'prazo');
  const ownerId = req.body?.owner_id || req.user.id;
  if (ownerId !== req.user.id && req.user.level < 3) throw forbidden('Somente a liderança pode atribuir projetos a outra pessoa.');
  await activeUser(req.db, ownerId);
  const project = await tx(req.db, async () => {
    const { rows } = await req.db.query(`
      insert into personal_projects (owner_id, created_by, name, description, due_date)
      values ($1, $2, $3, $4, $5) returning *
    `, [ownerId, req.user.id, name, description, dueDate]);
    await audit(req.db, req.user, {
      action: 'personal_project.created', entity: 'personal_projects',
      entityId: rows[0].id, after: { name, owner_id: ownerId, due_date: dueDate },
      moduleKey: 'management',
    });
    if (ownerId !== req.user.id) await notify(req.db, {
      userId: ownerId, title: 'Novo projeto atribuído a você',
      body: name, link: '/gestao?tab=projetos', moduleKey: 'management',
    });
    return rows[0];
  });
  res.status(201).json({ project });
}));

router.patch('/projects/:id', asyncHandler(async (req: any, res) => {
  const project = await tx(req.db, async () => {
    const { rows: beforeRows } = await req.db.query(
      'select * from personal_projects where id = $1 and (owner_id = $2 or $3::int >= 3) for update',
      [req.params.id, req.user.id, req.user.level],
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
       where id = $5 returning *
    `, [name, description, dueDate, status, req.params.id]);
    await audit(req.db, req.user, {
      action: 'personal_project.updated', entity: 'personal_projects',
      entityId: req.params.id, before, after: rows[0], moduleKey: 'management',
    });
    return rows[0];
  });
  res.json({ project });
}));

router.post('/tasks', asyncHandler(async (req: any, res) => {
  const title = required(req.body?.title, 'título da tarefa', 180);
  const description = optionalText(req.body?.description, 3000);
  const projectId = req.body?.project_id || null;
  const dueDate = dateValue(req.body?.due_date, 'prazo');
  const ownerId = req.body?.assigned_to || req.user.id;
  if (ownerId !== req.user.id && req.user.level < 3) throw forbidden('Somente a liderança pode atribuir tarefas a outra pessoa.');
  await activeUser(req.db, ownerId);
  const priority = oneOf(req.body?.priority ?? 'normal', PRIORITIES, 'prioridade');
  if (projectId) {
    const exists = await req.db.query(
      'select 1 from personal_projects where id = $1 and owner_id = $2 and status <> $3',
      [projectId, ownerId, 'archived'],
    );
    if (!exists.rows.length) throw badRequest('O projeto selecionado não pertence à pessoa responsável ou está arquivado.');
  }
  const task = await tx(req.db, async () => {
    const { rows } = await req.db.query(`
      insert into personal_tasks (owner_id, created_by, project_id, title, description, priority, due_date)
      values ($1, $2, $3, $4, $5, $6, $7) returning *
    `, [ownerId, req.user.id, projectId, title, description, priority, dueDate]);
    await audit(req.db, req.user, {
      action: 'personal_task.created', entity: 'personal_tasks',
      entityId: rows[0].id,
      after: { title, owner_id: ownerId, project_id: projectId, priority, due_date: dueDate },
      moduleKey: 'management',
    });
    if (ownerId !== req.user.id) await notify(req.db, {
      userId: ownerId, title: 'Nova tarefa atribuída a você',
      body: title, link: '/gestao?tab=tarefas', moduleKey: 'management',
    });
    return rows[0];
  });
  res.status(201).json({ task });
}));

router.patch('/tasks/:id', asyncHandler(async (req: any, res) => {
  const task = await tx(req.db, async () => {
    const { rows: beforeRows } = await req.db.query(
      'select * from personal_tasks where id = $1 and (owner_id = $2 or $3::int >= 3) for update',
      [req.params.id, req.user.id, req.user.level],
    );
    if (!beforeRows.length) throw notFound('Tarefa não encontrada.');
    const before = beforeRows[0];
    const isOwner = before.owner_id === req.user.id;
    const isCreator = before.created_by === req.user.id;
    const canManage = req.user.level >= 3;
    if (!isOwner && !canManage) throw notFound('Tarefa não encontrada.');
    if (isOwner && !isCreator && !canManage &&
        Object.keys(req.body ?? {}).some((key) => key !== 'status')) {
      throw forbidden('Você pode atualizar apenas a etapa da tarefa atribuída a você.');
    }
    const title = req.body?.title !== undefined ? required(req.body.title, 'título da tarefa', 180) : before.title;
    const description = req.body?.description !== undefined ? optionalText(req.body.description, 3000) : before.description;
    const projectId = req.body?.project_id !== undefined ? (req.body.project_id || null) : before.project_id;
    const dueDate = req.body?.due_date !== undefined ? dateValue(req.body.due_date, 'prazo') : before.due_date;
    const priority = req.body?.priority !== undefined ? oneOf(req.body.priority, PRIORITIES, 'prioridade') : before.priority;
    const status = req.body?.status !== undefined ? oneOf(req.body.status, TASK_STATUSES, 'situação') : before.status;
    const ownerId = req.body?.assigned_to !== undefined ? req.body.assigned_to : before.owner_id;
    if (ownerId !== before.owner_id && !canManage) throw forbidden('Somente a liderança pode reatribuir tarefas.');
    if (ownerId !== before.owner_id) await activeUser(req.db, ownerId);
    if (projectId) {
      const exists = await req.db.query(
        'select 1 from personal_projects where id = $1 and owner_id = $2 and status <> $3',
        [projectId, ownerId, 'archived'],
      );
      if (!exists.rows.length) throw badRequest('O projeto selecionado não pertence à pessoa responsável ou está arquivado.');
    }
    const { rows } = await req.db.query(`
      update personal_tasks
         set owner_id = $1, title = $2, description = $3, project_id = $4,
             due_date = $5, priority = $6, status = $7,
             completed_at = case when $7 = 'done' then coalesce(completed_at, now()) else null end,
             updated_at = now()
       where id = $8 returning *
    `, [ownerId, title, description, projectId, dueDate, priority, status, req.params.id]);
    await audit(req.db, req.user, {
      action: 'personal_task.updated', entity: 'personal_tasks',
      entityId: req.params.id, before, after: rows[0], moduleKey: 'management',
    });
    if (ownerId !== before.owner_id) await notify(req.db, {
      userId: ownerId, title: 'Tarefa atribuída a você',
      body: title, link: '/gestao?tab=tarefas', moduleKey: 'management',
    });
    if (status !== before.status) {
      const notifyUser = req.user.id === before.owner_id ? before.created_by : ownerId;
      if (notifyUser && notifyUser !== req.user.id) {
        await notify(req.db, {
          userId: notifyUser,
          title: status === 'done' ? 'Tarefa concluída' : 'Tarefa atualizada',
          body: `${title} · ${TASK_STATUS_LABELS[status] ?? status}`,
          link: '/gestao?tab=tarefas',
          moduleKey: 'management',
        });
      }
    }
    return rows[0];
  });
  res.json({ task });
}));

export default router;
