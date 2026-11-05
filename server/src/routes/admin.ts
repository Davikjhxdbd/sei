import { Router } from 'express';
import {
  asyncHandler,
  badRequest,
  conflict,
  forbidden,
  like,
  notFound,
  oneOf,
  paging,
  required,
} from '../http';
import { ROLE_LEVELS } from '../permissions';
import { hashPassword, requireLevel } from '../auth';
import { audit } from '../audit';
import { tx } from '../db';

const router = Router();

const STATUSES = ['active', 'pending', 'suspended', 'inactive'] as const;
const ROLES = Object.keys(ROLE_LEVELS);

function normalizeRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const roles = input
    .filter((r): r is string => typeof r === 'string')
    .filter((r) => ROLES.includes(r));
  return Array.from(new Set(roles));
}

function normalizeIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input.filter(
        (v): v is string =>
          typeof v === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
      ),
    ),
  );
}

const SELECT_USERS = `
  select u.id, u.full_name, u.username, u.email, u.status,
         u.created_at, u.updated_at, u.last_login_at,
         coalesce((select array_agg(ur.role::text order by ur.role::text)
                     from user_roles ur where ur.user_id = u.id), '{}') as roles,
         coalesce((select json_agg(json_build_object('id', s.id, 'name', s.name, 'is_lead', us.is_lead)
                                   order by s.name)
                     from user_sectors us join sectors s on s.id = us.sector_id
                    where us.user_id = u.id), '[]'::json) as sectors
    from users u`;

// ---------------------------------------------------------------------
// Usuários (restrito ao administrador do sistema)
// ---------------------------------------------------------------------
router.get(
  '/users',
  requireLevel(5),
  asyncHandler(async (req: any, res) => {
    const { limit, offset } = paging(req.query);
    const search = like(req.query.q);
    const status = STATUSES.includes(req.query.status) ? req.query.status : null;
    const role = ROLES.includes(req.query.role) ? req.query.role : null;

    const { rows } = await req.db.query(
      `${SELECT_USERS}
        where ($1::text is null or u.full_name ilike $1 or u.username ilike $1 or u.email ilike $1)
          and ($2::text is null or u.status::text = $2)
          and ($3::text is null or exists (select 1 from user_roles r
                where r.user_id = u.id and r.role::text = $3))
        order by u.full_name
        limit $4 offset $5`,
      [search, status, role, limit, offset],
    );

    const { rows: totals } = await req.db.query(
      `select count(*)::int as total from users`,
    );

    res.json({ items: rows, total: totals[0]?.total ?? 0 });
  }),
);

router.post(
  '/users',
  requireLevel(5),
  asyncHandler(async (req: any, res) => {
    const db = req.db;
    const fullName = required(req.body?.full_name, 'nome completo', 160);
    const username = required(req.body?.username, 'nome de usuário', 60).toLowerCase();
    const email =
      typeof req.body?.email === 'string' && req.body.email.trim()
        ? req.body.email.trim().toLowerCase()
        : null;
    const password = String(req.body?.password ?? '');
    const status = STATUSES.includes(req.body?.status) ? req.body.status : 'pending';
    const roles = normalizeRoles(req.body?.roles);
    const sectors = normalizeIds(req.body?.sectors);
    const leadSectors = normalizeIds(req.body?.lead_sectors);

    if (!/^[a-z0-9._-]{3,60}$/.test(username)) {
      throw badRequest(
        'O nome de usuário deve ter de 3 a 60 caracteres (letras, números, ponto, hífen ou sublinhado).',
        { field: 'username' },
      );
    }
    if (password.length < 8) {
      throw badRequest('A senha inicial deve ter ao menos 8 caracteres.', {
        field: 'password',
      });
    }
    if (!roles.length) roles.push('member');

    const created = await tx(db, async () => {
      const existing = await db.query(
        'select 1 from users where lower(username) = $1',
        [username],
      );
      if (existing.rows.length) {
        throw conflict('Já existe um usuário com este nome de usuário.');
      }

      const { rows } = await db.query(
        `insert into users (full_name, username, email, password_hash, status)
         values ($1, $2, $3, $4, $5)
         returning id, full_name, username, email, status, created_at`,
        [fullName, username, email, hashPassword(password), status],
      );
      const user = rows[0];

      for (const role of roles) {
        await db.query(
          'insert into user_roles (user_id, role, granted_by) values ($1, $2::user_role, $3)',
          [user.id, role, req.user.id],
        );
      }
      for (const sectorId of sectors) {
        await db.query(
          `insert into user_sectors (user_id, sector_id, is_lead)
           values ($1, $2, $3) on conflict do nothing`,
          [user.id, sectorId, leadSectors.includes(sectorId)],
        );
      }

      await audit(db, req.user, {
        action: 'user.created',
        entity: 'users',
        entityId: user.id,
        after: { ...user, roles, sectors },
        moduleKey: 'platform',
      });

      return user;
    });

    res.status(201).json({ user: created });
  }),
);

router.patch(
  '/users/:id',
  requireLevel(5),
  asyncHandler(async (req: any, res) => {
    const db = req.db;
    const targetId = req.params.id;

    const { rows: currentRows } = await db.query(
      `${SELECT_USERS} where u.id = $1`,
      [targetId],
    );
    const current = currentRows[0];
    if (!current) throw notFound('Usuário não encontrado.');

    const patch: Record<string, unknown> = {};
    if (typeof req.body?.full_name === 'string' && req.body.full_name.trim()) {
      patch.full_name = req.body.full_name.trim().slice(0, 160);
    }
    if (typeof req.body?.email === 'string' || req.body?.email === null) {
      patch.email =
        req.body.email === null || req.body.email === ''
          ? null
          : String(req.body.email).trim().toLowerCase();
    }
    if (req.body?.status !== undefined) {
      patch.status = oneOf(req.body.status, STATUSES, 'status');
    }

    const rolesProvided = Array.isArray(req.body?.roles);
    const roles = rolesProvided ? normalizeRoles(req.body.roles) : null;
    if (rolesProvided && roles!.length === 0) {
      throw badRequest('O usuário deve possuir ao menos um cargo.');
    }
    if (rolesProvided && targetId === req.user.id) {
      throw forbidden('Não é permitido alterar os próprios cargos.');
    }

    const sectorsProvided = Array.isArray(req.body?.sectors);
    const sectors = sectorsProvided ? normalizeIds(req.body.sectors) : [];
    const leadSectors = normalizeIds(req.body?.lead_sectors);

    const updated = await tx(db, async () => {
      if (Object.keys(patch).length) {
        const keys = Object.keys(patch);
        const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        await db.query(
          `update users set ${sets}, updated_at = now() where id = $${keys.length + 1}`,
          [...keys.map((k) => patch[k]), targetId],
        );
      }

      if (rolesProvided) {
        await db.query('delete from user_roles where user_id = $1', [targetId]);
        for (const role of roles!) {
          await db.query(
            'insert into user_roles (user_id, role, granted_by) values ($1, $2::user_role, $3)',
            [targetId, role, req.user.id],
          );
        }
      }

      if (sectorsProvided) {
        await db.query('delete from user_sectors where user_id = $1', [targetId]);
        for (const sectorId of sectors) {
          await db.query(
            `insert into user_sectors (user_id, sector_id, is_lead)
             values ($1, $2, $3)`,
            [targetId, sectorId, leadSectors.includes(sectorId)],
          );
        }
      }

      const { rows } = await db.query(`${SELECT_USERS} where u.id = $1`, [
        targetId,
      ]);

      await audit(db, req.user, {
        action: 'user.updated',
        entity: 'users',
        entityId: targetId,
        before: current,
        after: rows[0],
        moduleKey: 'platform',
      });

      return rows[0];
    });

    res.json({ user: updated });
  }),
);

router.post(
  '/users/:id/password',
  requireLevel(5),
  asyncHandler(async (req: any, res) => {
    const password = String(req.body?.password ?? '');
    if (password.length < 8) {
      throw badRequest('A senha deve ter ao menos 8 caracteres.', {
        field: 'password',
      });
    }
    const { rows } = await req.db.query(
      'update users set password_hash = $1, updated_at = now() where id = $2 returning id',
      [hashPassword(password), req.params.id],
    );
    if (!rows.length) throw notFound('Usuário não encontrado.');

    await req.db.query('delete from sessions where user_id = $1', [
      req.params.id,
    ]);
    await audit(req.db, req.user, {
      action: 'user.password_reset',
      entity: 'users',
      entityId: req.params.id,
      moduleKey: 'platform',
    });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------
// Setores
// ---------------------------------------------------------------------
router.get(
  '/sectors',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select s.id, s.key, s.name, s.description, s.active, s.created_at,
              (select count(*)::int from user_sectors us where us.sector_id = s.id) as member_count
         from sectors s order by s.name`,
    );
    res.json({ items: rows });
  }),
);

router.post(
  '/sectors',
  requireLevel(4),
  asyncHandler(async (req: any, res) => {
    const name = required(req.body?.name, 'nome', 80);
    const key =
      typeof req.body?.key === 'string' && req.body.key.trim()
        ? req.body.key.trim().toLowerCase().replace(/\s+/g, '_')
        : name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_');

    const { rows } = await req.db.query(
      `insert into sectors (key, name, description)
       values ($1, $2, $3) returning id, key, name, description, active`,
      [key, name, req.body?.description?.toString().trim() || null],
    );
    await audit(req.db, req.user, {
      action: 'sector.created',
      entity: 'sectors',
      entityId: rows[0].id,
      after: rows[0],
      moduleKey: 'platform',
    });
    res.status(201).json({ sector: rows[0] });
  }),
);

router.patch(
  '/sectors/:id',
  requireLevel(4),
  asyncHandler(async (req: any, res) => {
    const { rows: beforeRows } = await req.db.query(
      'select * from sectors where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Setor não encontrado.');

    const { rows } = await req.db.query(
      `update sectors set
         name = coalesce($1, name),
         description = coalesce($2, description),
         active = coalesce($3, active)
       where id = $4
       returning id, key, name, description, active`,
      [
        req.body?.name ? String(req.body.name).trim().slice(0, 80) : null,
        req.body?.description !== undefined
          ? String(req.body.description ?? '').trim() || null
          : null,
        typeof req.body?.active === 'boolean' ? req.body.active : null,
        req.params.id,
      ],
    );

    await audit(req.db, req.user, {
      action: 'sector.updated',
      entity: 'sectors',
      entityId: req.params.id,
      before: beforeRows[0],
      after: rows[0],
      moduleKey: 'platform',
    });
    res.json({ sector: rows[0] });
  }),
);

// ---------------------------------------------------------------------
// Configurações (listas de opções e parâmetros administráveis)
// ---------------------------------------------------------------------
router.get(
  '/settings',
  requireLevel(4),
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select s.key, s.value, s.label, s.description, s.category, s.updated_at,
              u.full_name as updated_by_name
         from settings s
         left join users u on u.id = s.updated_by
        order by s.category, s.label`,
    );
    res.json({ items: rows });
  }),
);

router.put(
  '/settings/:key',
  requireLevel(4),
  asyncHandler(async (req: any, res) => {
    const { rows: beforeRows } = await req.db.query(
      'select key, value from settings where key = $1',
      [req.params.key],
    );
    if (!beforeRows.length) throw notFound('Configuração não encontrada.');

    const value = req.body?.value;
    if (!Array.isArray(value) && (typeof value !== 'object' || value === null)) {
      throw badRequest('O valor da configuração deve ser uma lista ou objeto.');
    }

    const { rows } = await req.db.query(
      `update settings set value = $1, updated_at = now(), updated_by = $2
        where key = $3 returning key, value, label, category, updated_at`,
      [JSON.stringify(value), req.user.id, req.params.key],
    );

    await audit(req.db, req.user, {
      action: 'settings.updated',
      entity: 'settings',
      entityId: req.params.key,
      before: beforeRows[0].value,
      after: value,
      moduleKey: 'platform',
    });
    res.json({ setting: rows[0] });
  }),
);

// ---------------------------------------------------------------------
// Registro central de módulos
// ---------------------------------------------------------------------
router.get(
  '/modules',
  requireLevel(5),
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select m.*,
              (select count(*)::int from audit_log a where a.module_key = m.key) as usage_events
         from modules m order by sort_order, name`,
    );
    res.json({ items: rows });
  }),
);

router.patch(
  '/modules/:id',
  requireLevel(5),
  asyncHandler(async (req: any, res) => {
    const { rows: beforeRows } = await req.db.query(
      'select * from modules where id = $1',
      [req.params.id],
    );
    if (!beforeRows.length) throw notFound('Módulo não encontrado.');
    const before = beforeRows[0];

    const allowedRoles = Array.isArray(req.body?.allowed_roles)
      ? normalizeRoles(req.body.allowed_roles)
      : null;
    if (allowedRoles && allowedRoles.length === 0) {
      throw badRequest('Selecione ao menos um cargo com acesso ao módulo.');
    }

    const { rows } = await req.db.query(
      `update modules set
         name = coalesce($1, name),
         description = coalesce($2, description),
         icon = coalesce($3, icon),
         color = coalesce($4, color),
         active = coalesce($5, active),
         sort_order = coalesce($6, sort_order),
         allowed_roles = coalesce($7::user_role[], allowed_roles),
         updated_at = now()
       where id = $8
       returning *`,
      [
        req.body?.name ? String(req.body.name).trim().slice(0, 80) : null,
        req.body?.description !== undefined
          ? String(req.body.description ?? '').trim() || null
          : null,
        req.body?.icon ? String(req.body.icon) : null,
        req.body?.color ? String(req.body.color) : null,
        typeof req.body?.active === 'boolean' ? req.body.active : null,
        Number.isFinite(Number(req.body?.sort_order))
          ? Number(req.body.sort_order)
          : null,
        allowedRoles,
        req.params.id,
      ],
    );

    await audit(req.db, req.user, {
      action: 'module.updated',
      entity: 'modules',
      entityId: req.params.id,
      before: { active: before.active, allowed_roles: before.allowed_roles },
      after: { active: rows[0].active, allowed_roles: rows[0].allowed_roles },
      moduleKey: 'platform',
    });
    res.json({ module: rows[0] });
  }),
);

// ---------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------
router.get(
  '/audit',
  requireLevel(4),
  asyncHandler(async (req: any, res) => {
    const { limit, offset } = paging(req.query);
    const search = like(req.query.q);

    const { rows } = await req.db.query(
      `select a.id, a.actor_id, a.actor_name, a.action, a.entity, a.entity_id,
              a.before, a.after, a.reason, a.module_key, a.created_at
         from audit_log a
        where ($1::text is null or a.entity = $1)
          and ($2::text is null or a.action ilike $2)
          and ($3::text is null or a.actor_name ilike $3 or a.entity_id ilike $3)
        order by a.created_at desc
        limit $4 offset $5`,
      [req.query.entity ?? null, req.query.action ?? null, search, limit, offset],
    );

    const { rows: totals } = await req.db.query(
      `select count(*)::int as total from audit_log`,
    );
    res.json({ items: rows, total: totals[0]?.total ?? 0 });
  }),
);

export default router;
