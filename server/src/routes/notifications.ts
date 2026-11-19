import { Router } from 'express';
import { asyncHandler, paging } from '../http';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req: any, res) => {
    const { limit, offset } = paging(req.query);
    const { rows } = await req.db.query(
      `select id, title, body, link, module_key, read_at, created_at
         from notifications
        where user_id = $1
          and ($2::bool is not true or read_at is null)
        order by created_at desc
        limit $3 offset $4`,
      [req.user.id, req.query.unread === '1', limit, offset],
    );
    const { rows: counts } = await req.db.query(
      `select count(*)::int as unread from notifications
        where user_id = $1 and read_at is null`,
      [req.user.id],
    );
    res.json({ items: rows, unread: counts[0]?.unread ?? 0 });
  }),
);

router.post(
  '/:id/read',
  asyncHandler(async (req: any, res) => {
    await req.db.query(
      `update notifications set read_at = now()
        where id = $1 and user_id = $2 and read_at is null`,
      [req.params.id, req.user.id],
    );
    res.json({ ok: true });
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req: any, res) => {
    await req.db.query(
      `update notifications set read_at = now()
        where user_id = $1 and read_at is null`,
      [req.user.id],
    );
    res.json({ ok: true });
  }),
);

export default router;
