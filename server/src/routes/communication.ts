import { Router } from 'express';
import { asyncHandler, badRequest, like, paging, required } from '../http';
import { requireLevel } from '../auth';
import { audit, notify } from '../audit';
import { tx } from '../db';

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

  const announcement = await tx(req.db, async () => {
    const { rows } = await req.db.query(
      `insert into announcements (author_id, title, body, priority, status, published_at)
       values ($1, $2, $3, $4, 'published', now())
       returning id, title, body, priority, published_at, created_at`,
      [req.user.id, title, body, priority],
    );
    const item = rows[0];
    await req.db.query(
      `insert into notifications (user_id, title, body, link, module_key)
       select u.id, $1, $2, '/m/communication', 'communication'
         from users u where u.status = 'active' and u.id <> $3`,
      [`Comunicado: ${title}`, body.slice(0, 240), req.user.id],
    );
    await audit(req.db, req.user, {
      action: 'announcement.published',
      entity: 'announcements',
      entityId: item.id,
      after: { title, priority },
      moduleKey: 'communication',
    });
    return item;
  });
  res.status(201).json({ announcement });
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

export default router;
