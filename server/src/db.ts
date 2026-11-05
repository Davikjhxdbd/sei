import { Pool, type PoolClient } from 'pg';

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://mmv:mmv@localhost:5432/mmv_connect',
  max: 10,
});

/** Client available per request (see attachDb). */
export type Db = PoolClient;

/**
 * One connection per request so that the security context
 * (mmv.actor_id / mmv.actor_level) is visible to database guards.
 */
export function attachDb(req: any, _res: any, next: any) {
  pool
    .connect()
    .then((client) => {
      req.db = client;
      next();
    })
    .catch(next);
}

/** Executa um bloco dentro de uma transação no cliente da requisição. */
export async function tx<T>(db: PoolClient, fn: () => Promise<T>): Promise<T> {
  await db.query('begin');
  try {
    const result = await fn();
    await db.query('commit');
    return result;
  } catch (err) {
    await db.query('rollback').catch(() => undefined);
    throw err;
  }
}

export function releaseDb(req: any, res: any, next: any) {
  const client: PoolClient | undefined = req.db;
  if (!client) return next();
  let released = false;
  const release = (err?: Error) => {
    if (released) return;
    released = true;
    if (err) {
      client.release(err as any);
      return;
    }
    client
      .query('DISCARD ALL')
      .then(() => client.release())
      .catch((e) => client.release(e));
  };
  res.on('finish', () => release());
  res.on('close', () => release());
  res.on('error', (e: Error) => release(e));

  next();
}
