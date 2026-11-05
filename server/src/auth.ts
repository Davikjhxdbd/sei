import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import { ROLE_LEVELS } from './permissions';
import { forbidden, unauthorized } from './http';
import type { Db } from './db';

export const SESSION_COOKIE = 'mmv_session';
export const SESSION_TTL_DAYS = 7;

export interface SessionUser {
  id: string;
  full_name: string;
  username: string;
  email: string | null;
  status: string;
  roles: string[];
  level: number;
  sectors: { id: string; key: string; name: string; is_lead: boolean }[];
  created_at: string;
  last_login_at: string | null;
}

const STATUS_MESSAGE: Record<string, string> = {
  pending: 'Sua conta está pendente de aprovação.',
  suspended: 'Sua conta está suspensa. Procure a administração da plataforma.',
  inactive: 'Sua conta está inativa.',
};

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, saltHex, keyHex] = String(stored || '').split('$');
  if (algo !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  return (
    expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  );
}

export async function createSession(
  db: Db,
  userId: string,
  userAgent?: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
  await db.query(
    `insert into sessions (token, user_id, expires_at, user_agent)
     values ($1, $2, $3, $4)`,
    [token, userId, expiresAt, userAgent?.slice(0, 300) ?? null],
  );
  return { token, expiresAt };
}

export async function loadUser(
  db: Db,
  userId: string,
): Promise<SessionUser | null> {
  const { rows } = await db.query(
    `select u.id, u.full_name, u.username, u.email, u.status,
            u.created_at, u.last_login_at,
            coalesce(array_agg(distinct ur.role::text) filter (where ur.role is not null), '{}') as roles
       from users u
       left join user_roles ur on ur.user_id = u.id
      where u.id = $1
      group by u.id`,
    [userId],
  );
  if (!rows.length) return null;
  return hydrateUser(db, rows[0]);
}

async function hydrateUser(db: Db, row: any): Promise<SessionUser> {
  const { rows: sectorRows } = await db.query(
    `select s.id, s.key, s.name, us.is_lead
       from user_sectors us
       join sectors s on s.id = us.sector_id
      where us.user_id = $1
      order by s.name`,
    [row.id],
  );
  const roles: string[] = row.roles || [];
  const level = roles.reduce((max, r) => Math.max(max, ROLE_LEVELS[r] ?? 0), 0);
  return {
    id: row.id,
    full_name: row.full_name,
    username: row.username,
    email: row.email,
    status: row.status,
    roles,
    level,
    sectors: sectorRows,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
  };
}

export function setSessionCookie(res: any, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: any) {
  res.clearCookie(SESSION_COOKIE, {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

/** Publica o contexto do ator para as guardas do banco. */
export async function setActorContext(db: Db, user: SessionUser | null) {
  await db.query(
    `select set_config('mmv.actor_id', $1, false),
            set_config('mmv.actor_level', $2, false)`,
    [user?.id ?? '', String(user?.level ?? 0)],
  );
}

/** Middleware: exige sessão válida e conta ativa (verificado no servidor). */
export const requireAuth: RequestHandler = (req: any, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next(unauthorized());

  (async () => {
    const db: Db = req.db;
    const { rows } = await db.query(
      `select user_id from sessions
        where token = $1 and expires_at > now()`,
      [token],
    );
    if (!rows.length) {
      clearSessionCookie(res);
      throw unauthorized();
    }

    const user = await loadUser(db, rows[0].user_id);
    if (!user) {
      clearSessionCookie(res);
      throw unauthorized();
    }

    if (user.status !== 'active') {
      throw forbidden(
        STATUS_MESSAGE[user.status] ?? 'Conta indisponível para acesso.',
        'account_inactive',
      );
    }

    await setActorContext(db, user);
    req.user = user;
    next();
  })().catch(next);
};

export function requireLevel(level: number) {
  const middleware: RequestHandler = (req: any, _res, next) => {
    if ((req.user?.level ?? 0) < level) {
      return next(forbidden());
    }
    next();
  };
  return middleware;
}
