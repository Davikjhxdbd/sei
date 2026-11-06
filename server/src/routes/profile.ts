import { Router } from 'express';
import { asyncHandler, forbidden, notFound } from '../http';

const router = Router();

async function stats(db: any, userId: string) {
  const { rows } = await db.query(
    `select
       (select count(*)::int from checklist_tasks where assignee_id = $1 and status = 'done') as tasks_done,
       (select count(*)::int from checklist_tasks where assignee_id = $1 and status = 'pending') as tasks_pending,
       (select count(*)::int from checklist_tasks where assignee_id = $1 and status = 'blocked') as tasks_blocked,
       (select count(*)::int from readiness_confirmations where user_id = $1) as readiness_confirmed,
       (select count(*)::int from schedules where user_id = $1 and status = 'published') as assignments,
       (select count(*)::int from problems where identified_by = $1) as problems_identified,
       (select count(*)::int from media_records where editor_id = $1 or publisher_id = $1) as media_handled,
       (select count(*)::int from event_reports where created_by = $1) as reports_authored`,
    [userId],
  );
  return rows[0];
}

async function profilePayload(db: any, req: any) {
  const { rows } = await db.query(
    `select u.id, u.full_name, u.username, u.email, u.status, u.created_at,
            u.updated_at, u.last_login_at,
            coalesce((select array_agg(ur.role::text order by ur.role::text)
                        from user_roles ur where ur.user_id = u.id), '{}') as roles,
            coalesce((select json_agg(json_build_object('id', s.id, 'name', s.name, 'is_lead', us.is_lead)
                                      order by s.name)
                        from user_sectors us join sectors s on s.id = us.sector_id
                       where us.user_id = u.id), '[]'::json) as sectors
       from users u where u.id = $1`,
    [req.user.id],
  );
  if (!rows.length) throw notFound('Perfil não encontrado.');
  return {
    user: rows[0],
    stats: await stats(db, req.user.id),
    upcoming: (
      await db.query(
        `select sc.id, sc.role_title, sc.call_time, sc.status,
                e.id as event_id, e.name as event_name, e.starts_at
           from schedules sc
           join events e on e.id = sc.event_id
          where sc.user_id = $1 and e.starts_at >= now() - interval '6 hours'
            and sc.status in ('draft', 'published')
          order by e.starts_at limit 5`,
        [req.user.id],
      )
    ).rows,
  };
}

router.get(
  '/',
  asyncHandler(async (req: any, res) => {
    res.json(await profilePayload(req.db, req));
  }),
);

/** Perfis de terceiros: apenas liderança do estúdio em diante. */
router.get(
  '/:id',
  asyncHandler(async (req: any, res) => {
    if (req.params.id !== req.user.id && req.user.level < 3) {
      throw forbidden('Você não tem autorização para consultar outro perfil.');
    }
    const { rows } = await req.db.query(
      `select u.id, u.full_name, u.username, u.email, u.status, u.created_at,
              u.updated_at, u.last_login_at,
              coalesce((select array_agg(ur.role::text order by ur.role::text)
                          from user_roles ur where ur.user_id = u.id), '{}') as roles,
              coalesce((select json_agg(json_build_object('id', s.id, 'name', s.name, 'is_lead', us.is_lead)
                                        order by s.name)
                          from user_sectors us join sectors s on s.id = us.sector_id
                         where us.user_id = u.id), '[]'::json) as sectors
         from users u where u.id = $1`,
      [req.params.id],
    );
    if (!rows.length) throw notFound('Perfil não encontrado.');
    res.json({ user: rows[0], stats: await stats(req.db, req.params.id) });
  }),
);

export default router;
