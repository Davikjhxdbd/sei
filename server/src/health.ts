export interface HealthQueryable {
  query(config: { text: string; query_timeout: number }): Promise<unknown>;
}

/** Executa uma verificação simples com limite de tempo para não prender o healthcheck. */
export async function databaseReady(
  db: HealthQueryable,
  timeoutMs = 5_000,
): Promise<boolean> {
  try {
    await db.query({ text: 'select 1', query_timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}
