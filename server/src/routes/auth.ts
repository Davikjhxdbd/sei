import { Router } from 'express';
import crypto from 'node:crypto';
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


const recoveryAttempts = new Map<string, { count: number; resetAt: number }>();

function recoveryAllowed(ip: string) {
  const now = Date.now();
  const entry = recoveryAttempts.get(ip);

  if (!entry || entry.resetAt < now) {
    recoveryAttempts.set(ip, { count: 1, resetAt: now + 15 * 60_000 });
    return true;
  }

  if (entry.count >= 10) return false;
  entry.count += 1;
  return true;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] ?? char);
}

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const ip = req.ip ?? '';

    // Resposta genérica para não revelar se um e-mail está cadastrado.
    const response = {
      ok: true,
      message: 'Se o endereço estiver cadastrado, você receberá as instruções por e-mail.',
    };

    if (!recoveryAllowed(ip)) {
      return res.json(response);
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
      return res.json(response);
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM;
    const appUrl = (process.env.APP_URL || 'https://mmv-connect.pages.dev')
      .replace(/\/+$/, '');

    if (!apiKey || !from) {
      console.error('[auth] recuperação indisponível: configure RESEND_API_KEY e MAIL_FROM.');
      return res.json(response);
    }

    const { rows } = await req.db.query(
      `select id, full_name, email
         from users
        where lower(email) = $1
          and status = 'active'
        limit 1`,
      [email],
    );

    if (!rows.length) return res.json(response);

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60_000);

    await req.db.query(
      `delete from password_resets
        where user_id = $1 and used_at is null`,
      [user.id],
    );

    await req.db.query(
      `insert into password_resets (token_hash, user_id, expires_at)
       values ($1, $2, $3)`,
      [tokenHash, user.id, expiresAt],
    );

    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const safeName = escapeHtml(user.full_name || 'usuário');

    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [user.email],
          subject: 'Recuperação de senha — MMV CREATIVE',
          html: `
            <div style="margin:0;padding:40px 16px;background:#111111;font-family:Arial,sans-serif;color:#f4f2ed">
              <div style="max-width:520px;margin:auto;padding:36px;background:#1b1b1b;border:1px solid #39342a;border-radius:16px">
                <p style="font-size:12px;letter-spacing:4px;color:#c4a66a;font-weight:bold">MMV CREATIVE</p>
                <h1 style="font-size:28px;margin:28px 0 12px">Recuperação de acesso</h1>
                <p style="color:#c5c1b9;line-height:1.7">Olá, ${safeName}. Recebemos uma solicitação para redefinir a senha da sua conta.</p>
                <p style="color:#c5c1b9;line-height:1.7">Clique no botão abaixo para cadastrar uma nova senha. Este link expira em 30 minutos e só pode ser utilizado uma vez.</p>
                <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:15px 24px;background:#c4a66a;color:#111111;text-decoration:none;font-weight:bold;border-radius:8px">CRIAR NOVA SENHA</a>
                <p style="font-size:12px;color:#888;line-height:1.7">Se você não solicitou esta alteração, ignore este e-mail. Sua senha atual continuará válida.</p>
                <p style="font-size:11px;color:#777;margin-top:28px">MMV CREATIVE · Plataforma integrada</p>
              </div>
            </div>
          `,
          text: `Olá, ${user.full_name}. Para redefinir sua senha, acesse: ${resetUrl}. O link expira em 30 minutos. Se não solicitou, ignore este e-mail.`,
        }),
      });

      if (!emailResponse.ok) {
        const detail = await emailResponse.text();
        throw new Error(`Resend ${emailResponse.status}: ${detail}`);
      }
    } catch (error) {
      await req.db.query(
        'delete from password_resets where token_hash = $1',
        [tokenHash],
      );
      console.error('[auth] falha ao enviar recuperação:', error);
    }

    res.json(response);
  }),
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const token = String(req.body?.token ?? '');
    const nextPassword = String(req.body?.new_password ?? '');

    if (nextPassword.length < 8 || nextPassword.length > 128) {
      throw badRequest('A nova senha deve ter entre 8 e 128 caracteres.', {
        field: 'new_password',
      });
    }

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      throw badRequest('Este link é inválido ou expirou.');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const db = req.db;

    await db.query('begin');

    try {
      const { rows } = await db.query(
        `select user_id
           from password_resets
          where token_hash = $1
            and used_at is null
            and expires_at > now()
          for update`,
        [tokenHash],
      );

      if (!rows.length) {
        await db.query('rollback');
        throw badRequest('Este link é inválido ou expirou. Solicite uma nova recuperação.');
      }

      const userId = rows[0].user_id;

      await db.query(
        `update users
            set password_hash = $1, updated_at = now()
          where id = $2`,
        [hashPassword(nextPassword), userId],
      );

      // Revoga todas as sessões anteriores à troca de senha.
      await db.query('delete from sessions where user_id = $1', [userId]);

      await db.query(
        `update password_resets
            set used_at = now()
          where token_hash = $1`,
        [tokenHash],
      );

      await db.query(
        `delete from password_resets
          where user_id = $1 and token_hash <> $2`,
        [userId, tokenHash],
      );

      await db.query('commit');
      res.json({ ok: true, message: 'Senha redefinida com sucesso.' });
    } catch (error) {
      await db.query('rollback').catch(() => undefined);
      throw error;
    }
  }),
);


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

    console.log('[LOGIN 1] buscando conta');
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

    console.log('[LOGIN 2] criando sessão');
    const { token, expiresAt } = await createSession(
      db,
      row.id,
      req.headers['user-agent'],
    );
    console.log('[LOGIN 3] atualizando último acesso');
    await db.query('update users set last_login_at = now() where id = $1', [
      row.id,
    ]);

    console.log('[LOGIN 4] carregando perfil');
    const user = await loadUser(db, row.id);
    console.log('[LOGIN 5] configurando contexto');
    await setActorContext(db, user);
    console.log('[LOGIN 6] registrando auditoria');
    await audit(db, user, {
      action: 'auth.login',
      entity: 'session',
      entityId: user!.id,
      moduleKey: 'platform',
    });

    setSessionCookie(res, token, expiresAt);
    console.log('[LOGIN 7] carregando módulos e notificações');
    res.json(await buildBootstrap(db, user));
    console.log('[LOGIN OK] concluído');
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

    if (next.length < 8 || next.length > 128) {
      throw badRequest('A nova senha deve ter entre 8 e 128 caracteres.', {
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

    // Mantém a sessão atual e revoga todas as outras sessões do usuário.
    const currentSessionToken = req.cookies?.mmv_session;
    await db.query(
      'delete from sessions where user_id = $1 and token <> $2',
      [req.user.id, currentSessionToken],
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
