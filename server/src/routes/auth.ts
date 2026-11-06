import { Router } from 'express';
import { asyncHandler, badRequest, forbidden, unauthorized } from '../http';
import {
  clearSessionCookie,
  createSession,
  hashPassword,
  loadUser,
  requireAuth,
  setActorContext,
  setSessionCookie,
  verifyPassword,
} from '../auth';
import { actionLevels, allowedActions } from '../permissions';
import { audit } from '../audit';

const router = Router();

const ATTEMPT_WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function throttleKey(username: string, ip: string) {
  return `${username.toLowerCase()}|${ip}`;
}

function checkThrottle(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) return;
  if (entry.count >= MAX_ATTEMPTS) {
    throw forbidden(
      'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.',
      'too_many_attempts',
    );
  }
}

function registerFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

export async function buildBootstrap(db: any, user: any) {
  const { rows: modules } = await db.query(
    `select id, key, name, description, icon, color, route, sort_order, settings
       from modules
      where active = true
        and ($2 or exists (
          select 1 from unnest(allowed_roles) r where r::text = any($1::text[])
        ))
      order by sort_order, name`,
    [user.roles, user.level >= 5],
  );

  const { rows: counts } = await db.query(
    `select count(*)::int as unread
       from notifications where user_id = $1 and read_at is null`,
    [user.id],
  );

  return {
    user,
    modules,
    permissions: allowedActions(user.level),
    actionLevels: actionLevels(),
    notifications: { unread: counts[0]?.unread ?? 0 },
  };
}

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!username || !password) {
      throw badRequest('Informe usuário e senha.');
    }

    const db = req.db;
    const key = throttleKey(username, req.ip ?? '');
    checkThrottle(key);

    const { rows } = await db.query(
      `select id, password_hash, status from users where lower(username) = lower($1)`,
      [username],
    );
    const row = rows[0];

    if (!row || !verifyPassword(password, row.password_hash)) {
      registerFailure(key);
      throw unauthorized('Usuário ou senha inválidos.');
    }

    if (row.status !== 'active') {
      const message =
        row.status === 'pending'
          ? 'Sua conta está pendente de aprovação.'
          : row.status === 'suspended'
            ? 'Sua conta está suspensa. Procure a administração da plataforma.'
            : 'Sua conta está inativa.';
      throw forbidden(message, 'account_inactive');
    }

    attempts.delete(key);

    const { token, expiresAt } = await createSession(
      db,
      row.id,
      req.headers['user-agent'],
    );
    await db.query('update users set last_login_at = now() where id = $1', [
      row.id,
    ]);

    const user = await loadUser(db, row.id);
    await setActorContext(db, user);
    await audit(db, user, {
      action: 'auth.login',
      entity: 'session',
      entityId: user!.id,
      moduleKey: 'platform',
    });

    setSessionCookie(res, token, expiresAt);
    res.json(await buildBootstrap(db, user));
  }),
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const token = req.cookies?.mmv_session;
    if (token) {
      await req.db.query('delete from sessions where token = $1', [token]);
    }
    await audit(req.db, req.user, {
      action: 'auth.logout',
      entity: 'session',
      entityId: req.user.id,
      moduleKey: 'platform',
    });
    clearSessionCookie(res);
    res.json({ ok: true });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const user = await loadUser(req.db, req.user.id);
    res.json(await buildBootstrap(req.db, user));
  }),
);

router.patch(
  '/profile',
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const db = req.db;
    const before = await loadUser(db, req.user.id);

    const fullName =
      typeof req.body?.full_name === 'string' && req.body.full_name.trim()
        ? req.body.full_name.trim()
        : before!.full_name;
    const email =
      req.body?.email === null || req.body?.email === ''
        ? null
        : typeof req.body?.email === 'string'
          ? req.body.email.trim()
          : before!.email;

    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw badRequest('Informe um e-mail válido.', { field: 'email' });
    }

    const { rows } = await db.query(
      `update users set full_name = $1, email = $2, updated_at = now()
        where id = $3 returning id, full_name, email`,
      [fullName.slice(0, 160), email, req.user.id],
    );

    await audit(db, req.user, {
      action: 'user.profile_updated',
      entity: 'users',
      entityId: req.user.id,
      before: { full_name: before!.full_name, email: before!.email },
      after: rows[0],
      moduleKey: 'platform',
    });

    res.json({ user: rows[0] });
  }),
);

router.post(
  '/password',
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const db = req.db;
    const current = String(req.body?.current_password ?? '');
    const next = String(req.body?.new_password ?? '');

    if (next.length < 8) {
      throw badRequest('A nova senha deve ter ao menos 8 caracteres.', {
        field: 'new_password',
      });
    }

    const { rows } = await db.query(
      'select password_hash from users where id = $1',
      [req.user.id],
    );
    if (!rows.length || !verifyPassword(current, rows[0].password_hash)) {
      throw badRequest('Senha atual incorreta.', { field: 'current_password' });
    }

    await db.query(
      'update users set password_hash = $1, updated_at = now() where id = $2',
      [hashPassword(next), req.user.id],
    );

    await audit(db, req.user, {
      action: 'user.password_changed',
      entity: 'users',
      entityId: req.user.id,
      moduleKey: 'platform',
    });

    res.json({ ok: true });
  }),
);

export default router;
