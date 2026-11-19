import { Router } from 'express';
import { asyncHandler } from '../http';

const router = Router();

/** Módulos autorizados para o usuário autenticado (a central consome isto). */
router.get(
  '/',
  asyncHandler(async (req: any, res) => {
    const { rows } = await req.db.query(
      `select id, key, name, description, icon, color, route, sort_order, settings
         from modules
        where active = true
          and ($2 or exists (
            select 1 from unnest(allowed_roles) r where r::text = any($1::text[])
          ))
        order by sort_order, name`,
      [req.user.roles, req.user.level >= 5],
    );
    res.json({ items: rows });
  }),
);

export default router;
