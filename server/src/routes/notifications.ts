import { Router } from 'express';
import { asyncHandler, badRequest, paging } from '../http';
import { getPushPublicKey } from '../push';

const router = Router();

router.get(
  '/push-key',
  asyncHandler(async (_req: any, res) => {
    const publicKey = getPushPublicKey();
    res.json({ enabled: Boolean(publicKey), publicKey });
  }),
);

router.post(
  '/push-subscriptions',
  asyncHandler(async (req: any, res) => {
    const subscription = req.body?.subscription;
    const endpoint = typeof subscription?.endpoint === 'string' ? subscription.endpoint : '';
    const p256dh = typeof subscription?.keys?.p256dh === 'string' ? subscription.keys.p256dh : '';
    const auth = typeof subscription?.keys?.auth === 'string' ? subscription.keys.auth : '';
    let parsed: URL;
    try { parsed = new URL(endpoint); } catch { throw badRequest('Assinatura de notificações inválida.'); }
    if (parsed.protocol !== 'https:' || endpoint.length > 2048 || p256dh.length > 200 || auth.length > 200) {
      throw badRequest('Assinatura de notificações inválida.');
    }
    await req.db.query(
      `insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (endpoint) do update
         set user_id = excluded.user_id, p256dh = excluded.p256dh,
             auth = excluded.auth, user_agent = excluded.user_agent, updated_at = now()`,
      [req.user.id, endpoint, p256dh, auth, String(req.headers['user-agent'] ?? '').slice(0, 500)],
    );
    res.status(201).json({ ok: true });
  }),
);

router.post(
  '/push-unsubscribe',
  asyncHandler(async (req: any, res) => {
    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
    if (!endpoint || endpoint.length > 2048) throw badRequest('Dispositivo inválido.');
    await req.db.query('delete from push_subscriptions where user_id = $1 and endpoint = $2', [req.user.id, endpoint]);
    res.json({ ok: true });
  }),
);


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
