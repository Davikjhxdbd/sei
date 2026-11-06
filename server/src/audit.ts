import type { Db } from './db';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  moduleKey?: string | null;
}

/** Registra uma operação relevante na trilha de auditoria (somente inserção). */
export async function audit(
  db: Db,
  actor: { id: string; full_name: string } | null,
  entry: AuditEntry,
): Promise<void> {
  await db.query(
    `insert into audit_log
       (actor_id, actor_name, action, entity, entity_id, before, after, reason, module_key)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      actor?.id ?? null,
      actor?.full_name ?? 'Sistema',
      entry.action,
      entry.entity,
      entry.entityId ?? null,
      entry.before ? JSON.stringify(entry.before) : null,
      entry.after ? JSON.stringify(entry.after) : null,
      entry.reason ?? null,
      entry.moduleKey ?? null,
    ],
  );
}

/** Notificação global, reutilizável por qualquer módulo. */
export async function notify(
  db: Db,
  input: {
    userId: string | null | undefined;
    title: string;
    body?: string | null;
    link?: string | null;
    moduleKey?: string | null;
  },
): Promise<void> {
  if (!input.userId) return;
  await db.query(
    `insert into notifications (user_id, title, body, link, module_key)
     values ($1, $2, $3, $4, $5)`,
    [
      input.userId,
      input.title,
      input.body ?? null,
      input.link ?? null,
      input.moduleKey ?? null,
    ],
  );
}
