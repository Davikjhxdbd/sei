import { Router } from 'express';
import { asyncHandler, badRequest, forbidden, like, notFound, paging, required, optionalText } from '../http';
import { requireLevel } from '../auth';
import { audit, notify } from '../audit';
import { can } from '../permissions';
import { tx } from '../db';
import { sendPushToUsers } from '../push';

const router = Router();

router.get('/announcements', asyncHandler(async (req: any, res) => {
  const { limit, offset } = paging(req.query);
  const search = like(req.query.q);
  const { rows } = await req.db.query(
    `select a.id, a.title, a.body, a.priority, a.published_at, a.created_at,
            u.full_name as author_name,
            (r.user_id is not null) as is_read
       from announcements a
       join users u on u.id = a.author_id
       left join announcement_reads r on r.announcement_id = a.id and r.user_id = $1
      where a.status = 'published'
        and ($2::text is null or a.title ilike $2 or a.body ilike $2)
      order by a.published_at desc, a.created_at desc
      limit $3 offset $4`,
    [req.user.id, search, limit, offset],
  );
  const { rows: totals } = await req.db.query(
    `select count(*)::int as total,
            count(*) filter (where r.user_id is null)::int as unread
       from announcements a
       left join announcement_reads r on r.announcement_id = a.id and r.user_id = $1
      where a.status = 'published'`,
    [req.user.id],
  );
  res.json({ items: rows, total: totals[0]?.total ?? 0, unread: totals[0]?.unread ?? 0 });
}));

router.post('/announcements', requireLevel(4), asyncHandler(async (req: any, res) => {
  const title = required(req.body?.title, 'título', 180);
  const body = required(req.body?.body, 'mensagem', 12000);
  const priority = ['normal', 'important', 'urgent'].includes(req.body?.priority)
    ? req.body.priority : 'normal';

  const published = await tx(req.db, async () => {
    const { rows } = await req.db.query(
      `insert into announcements (author_id, title, body, priority, status, published_at)
       values ($1, $2, $3, $4, 'published', now())
       returning id, title, body, priority, published_at, created_at`,
      [req.user.id, title, body, priority],
    );
    const item = rows[0];
    const { rows: notificationRows } = await req.db.query(
      `insert into notifications (user_id, title, body, link, module_key)
       select u.id, $1, $2, '/m/communication', 'communication'
         from users u where u.status = 'active' and u.id <> $3
       returning user_id`,
      [`Comunicado: ${title}`, body.slice(0, 240), req.user.id],
    );
    await audit(req.db, req.user, {
      action: 'announcement.published',
      entity: 'announcements',
      entityId: item.id,
      after: { title, priority },
      moduleKey: 'communication',
    });
    return { item, recipientIds: notificationRows.map((row: { user_id: string }) => row.user_id) };
  });
  await sendPushToUsers(req.db, published.recipientIds, {
    title: `Comunicado: ${title}`,
    body: body.slice(0, 240),
    url: '/m/communication',
  });
  res.status(201).json({ announcement: published.item });
}));

router.post('/announcements/:id/read', asyncHandler(async (req: any, res) => {
  const { rows } = await req.db.query(
    `insert into announcement_reads (announcement_id, user_id)
     select id, $2 from announcements where id = $1 and status = 'published'
     on conflict (announcement_id, user_id) do nothing
     returning announcement_id`,
    [req.params.id, req.user.id],
  );
  if (!rows.length) {
    const exists = await req.db.query(
      `select 1 from announcement_reads r
       join announcements a on a.id = r.announcement_id
       where r.announcement_id = $1 and r.user_id = $2 and a.status = 'published'`,
      [req.params.id, req.user.id],
    );
    if (!exists.rows.length) throw badRequest('Comunicado não encontrado.');
  }
  res.json({ ok: true });
}));


const CONTENT_PLATFORMS = ['Instagram', 'YouTube', 'Facebook', 'TikTok', 'Site'] as const;
const CONTENT_FORMATS = ['Reel', 'Post', 'Story', 'Carrossel', 'Live', 'Short', 'Vídeo', 'Outro'] as const;
const CONTENT_STATUSES = ['idea', 'draft', 'production', 'review', 'approved', 'scheduled', 'published', 'archived'] as const;
const CONTENT_STATUS_LABELS: Record<string, string> = { idea: 'Ideia', draft: 'Rascunho', production: 'Em produção', review: 'Em revisão', approved: 'Aprovado', scheduled: 'Agendado', published: 'Publicado', archived: 'Arquivado' };

function contentChoice(value: unknown, allowed: readonly string[], label: string) {
  if (typeof value !== 'string' || !allowed.includes(value)) throw badRequest(`Selecione uma opção válida para ${label}.`);
  return value;
}
function contentDate(value: unknown) {
  if (value === null || value === '' || value === undefined) return null;
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) throw badRequest('Informe uma data e horário válidos.');
  return new Date(value).toISOString();
}

router.get('/content', asyncHandler(async (req: any, res) => {
  const { limit, offset } = paging(req.query);
  const search = like(req.query.q);
  const status = CONTENT_STATUSES.includes(req.query.status) ? req.query.status : null;
  const { rows } = await req.db.query(`
    select c.id, c.title, c.platform, c.format, c.campaign, c.caption,
           c.scheduled_at, c.status, c.created_at, c.updated_at,
           c.assigned_to, assignee.full_name as assignee_name,
           c.created_by, author.full_name as author_name
      from social_content_items c
      left join users assignee on assignee.id = c.assigned_to
      join users author on author.id = c.created_by
     where ($1::text is null or c.status = $1)
       and ($2::text is null or c.title ilike $2 or c.campaign ilike $2 or c.caption ilike $2)
       and c.status <> 'archived'
     order by c.scheduled_at asc nulls last, c.updated_at desc
     limit $3 offset $4
  `, [status, search, limit, offset]);
  const { rows: totals } = await req.db.query(`
    select count(*)::int as total,
           count(*) filter (where status in ('idea','draft','production','review'))::int as in_progress,
           count(*) filter (where status = 'scheduled')::int as scheduled,
           count(*) filter (where status = 'published')::int as published
      from social_content_items where status <> 'archived'
  `);
  res.json({ items: rows, totals: totals[0] });
}));

router.post('/content', asyncHandler(async (req: any, res) => {
  if (req.user.level < 2) throw forbidden('Seu perfil não pode criar pautas de conteúdo.');
  const title = required(req.body?.title, 'título', 180);
  const platform = contentChoice(req.body?.platform, CONTENT_PLATFORMS, 'plataforma');
  const format = contentChoice(req.body?.format, CONTENT_FORMATS, 'formato');
  const campaign = optionalText(req.body?.campaign, 180);
  const caption = optionalText(req.body?.caption, 6000);
  const scheduledAt = contentDate(req.body?.scheduled_at);
  const assignedTo = req.body?.assigned_to || req.user.id;
  if (assignedTo !== req.user.id && req.user.level < 3) throw forbidden('Somente a liderança pode atribuir pautas a outra pessoa.');
  if (assignedTo) {
    const member = await req.db.query("select 1 from users where id = $1 and status = 'active'", [assignedTo]);
    if (!member.rows.length) throw badRequest('A pessoa responsável não está ativa.');
  }
  const created = await tx(req.db, async () => {
    const { rows } = await req.db.query(`
      insert into social_content_items
        (title, platform, format, campaign, caption, scheduled_at, assigned_to, created_by)
      values ($1,$2,$3,$4,$5,$6,$7,$8) returning *
    `, [title, platform, format, campaign, caption, scheduledAt, assignedTo, req.user.id]);
    await audit(req.db, req.user, {
      action: 'social_content.created', entity: 'social_content_items',
      entityId: rows[0].id, after: { title, platform, format, campaign, scheduled_at: scheduledAt },
      moduleKey: 'communication',
    });
    if (assignedTo && assignedTo !== req.user.id) {
      await notify(req.db, {
        userId: assignedTo, title: 'Nova pauta de conteúdo',
        body: title, link: '/m/communication/social', moduleKey: 'communication',
      });
    }
    return rows[0];
  });
  res.status(201).json({ item: created });
}));

router.patch('/content/:id', asyncHandler(async (req: any, res) => {
  const updated = await tx(req.db, async () => {
    const { rows: beforeRows } = await req.db.query(
      'select * from social_content_items where id = $1 for update', [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Pauta não encontrada.');
    const before = beforeRows[0];
    const isCreator = before.created_by === req.user.id;
    const isAssignee = before.assigned_to === req.user.id;
    if (!isCreator && !isAssignee && req.user.level < 3) throw notFound('Pauta não encontrada.');
    if (isAssignee && !isCreator && req.user.level < 3 &&
        Object.keys(req.body ?? {}).some((key) => key !== 'status')) {
      throw forbidden('Responsáveis podem atualizar apenas a etapa da própria pauta.');
    }
    const title = req.body?.title !== undefined ? required(req.body.title, 'título', 180) : before.title;
    const platform = req.body?.platform !== undefined ? contentChoice(req.body.platform, CONTENT_PLATFORMS, 'plataforma') : before.platform;
    const format = req.body?.format !== undefined ? contentChoice(req.body.format, CONTENT_FORMATS, 'formato') : before.format;
    const campaign = req.body?.campaign !== undefined ? optionalText(req.body.campaign, 180) : before.campaign;
    const caption = req.body?.caption !== undefined ? optionalText(req.body.caption, 6000) : before.caption;
    const scheduledAt = req.body?.scheduled_at !== undefined ? contentDate(req.body.scheduled_at) : before.scheduled_at;
    const status = req.body?.status !== undefined ? contentChoice(req.body.status, CONTENT_STATUSES, 'etapa') : before.status;
    const assignedTo = req.body?.assigned_to !== undefined ? (req.body.assigned_to || null) : before.assigned_to;
    if (assignedTo !== before.assigned_to && req.user.level < 3) throw forbidden('Somente a liderança pode reatribuir pautas.');
    if (assignedTo) {
      const member = await req.db.query("select 1 from users where id = $1 and status = 'active'", [assignedTo]);
      if (!member.rows.length) throw badRequest('A pessoa responsável não está ativa.');
    }
    const { rows } = await req.db.query(`
      update social_content_items
         set title=$1, platform=$2, format=$3, campaign=$4, caption=$5,
             scheduled_at=$6, status=$7, assigned_to=$8, updated_at=now()
       where id=$9 returning *
    `, [title, platform, format, campaign, caption, scheduledAt, status, assignedTo, req.params.id]);
    await audit(req.db, req.user, {
      action: 'social_content.updated', entity: 'social_content_items',
      entityId: req.params.id, before, after: rows[0], moduleKey: 'communication',
    });
    if (assignedTo && assignedTo !== before.assigned_to) {
      await notify(req.db, {
        userId: assignedTo, title: 'Pauta atribuída a você',
        body: title, link: '/m/communication/social', moduleKey: 'communication',
      });
    }
    if (status !== before.status) {
      const notifyUser = req.user.id === before.assigned_to ? before.created_by : assignedTo;
      if (notifyUser && notifyUser !== req.user.id) {
        await notify(req.db, {
          userId: notifyUser,
          title: status === 'published' ? 'Conteúdo publicado' : 'Pauta atualizada',
          body: `${title} · ${CONTENT_STATUS_LABELS[status] ?? status}`,
          link: '/m/communication/social',
          moduleKey: 'communication',
        });
      }
    }
    return rows[0];
  });
  res.json({ item: updated });
}));

export default router;
