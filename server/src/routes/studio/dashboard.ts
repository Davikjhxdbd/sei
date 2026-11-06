import { Router } from 'express';
import { asyncHandler } from '../../http';

const router = Router();

router.get(
  '/dashboard',
  asyncHandler(async (req: any, res) => {
    const db = req.db;
    const canSeeOccurrences = req.user.level >= 3;

    const { rows: totalsRows } = await db.query(
      `select
         (select count(*)::int from events
           where status = 'scheduled' and starts_at >= now()) as upcoming_events,
         (select count(*)::int from operational_errors
           where status in ('open', 'in_analysis')) as open_errors,
         (select count(*)::int from event_reports
           where status <> 'finalized') as pending_reports,
         (select count(*)::int from media_records
           where status in ('awaiting_edit', 'in_edit', 'awaiting_publication',
                            'reported_lost', 'not_found')) as media_pending,
         (select count(*)::int from media_records where status = 'published') as media_published,
         (select count(*)::int from checklist_tasks
           where assignee_id = $1 and status = 'pending') as my_tasks,
         (select count(*)::int from checklist_tasks where status = 'blocked') as blocked_tasks,
         (select count(*)::int from problems
           where status not in ('resolved', 'cancelled')) as open_problems,
         (select count(*)::int from schedules
           where status = 'published'
             and event_id in (select id from events where starts_at >= now() - interval '2 hours')) as active_assignments,
         (select count(*)::int from occurrences where status <> 'closed') as open_occurrences,
         (select count(*)::int from events where status = 'cancelled'
           and starts_at >= date_trunc('month', now())) as cancelled_this_month`,
      [req.user.id],
    );
    const totals = totalsRows[0];
    if (!canSeeOccurrences) totals.open_occurrences = null;

    const upcoming = (
      await db.query(
        `select e.id, e.name, e.type, e.starts_at, e.ends_at,
                (select count(*)::int from schedules s
                  where s.event_id = e.id and s.status = 'published') as assignments,
                (select count(*)::int from checklist_runs r
                  where r.event_id = e.id) as checklist_runs
           from events e
          where e.status = 'scheduled' and e.starts_at >= now() - interval '2 hours'
          order by e.starts_at limit 6`,
      )
    ).rows;

    const myTasks = (
      await db.query(
        `select t.id, t.title, t.status, t.run_id,
                e.id as event_id, e.name as event_name, e.starts_at
           from checklist_tasks t
           join checklist_runs r on r.id = t.run_id
           join events e on e.id = r.event_id
          where t.assignee_id = $1 and t.status <> 'done'
          order by e.starts_at limit 6`,
        [req.user.id],
      )
    ).rows;

    const blocked = (
      await db.query(
        `select t.id, t.title, t.block_reason,
                e.name as event_name, e.starts_at,
                u.full_name as assignee_name
           from checklist_tasks t
           join checklist_runs r on r.id = t.run_id
           join events e on e.id = r.event_id
           left join users u on u.id = t.assignee_id
          where t.status = 'blocked'
          order by e.starts_at limit 5`,
      )
    ).rows;

    const mediaByStatus = (
      await db.query(
        `select status, count(*)::int as count
           from media_records group by status`,
      )
    ).rows;

    const reportsPending = (
      await db.query(
        `select r.id, r.title, r.status, r.updated_at,
                e.name as event_name, e.starts_at
           from event_reports r join events e on e.id = r.event_id
          where r.status <> 'finalized'
          order by e.starts_at desc limit 5`,
      )
    ).rows;

    const problemsOpen = (
      await db.query(
        `select p.id, p.code, p.title, p.status, p.priority,
                s.name as sector_name
           from problems p left join sectors s on s.id = p.sector_id
          where p.status not in ('resolved', 'cancelled')
          order by case p.priority
                     when 'critical' then 1 when 'high' then 2
                     when 'medium' then 3 else 4 end,
                   p.created_at desc
          limit 5`,
      )
    ).rows;

    const recentActivity = (
      await db.query(
        `select a.id, a.actor_name, a.action, a.entity, a.entity_id,
                a.created_at
           from audit_log a
          order by a.created_at desc limit 8`,
      )
    ).rows;

    res.json({
      totals,
      upcoming,
      myTasks,
      blocked,
      mediaByStatus,
      reportsPending,
      problemsOpen,
      recentActivity,
    });
  }),
);

export default router;
