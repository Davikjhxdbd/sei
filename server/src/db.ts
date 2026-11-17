import { Pool, type PoolClient } from 'pg';

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://mmv:mmv@localhost:5432/mmv_connect',
  max: 10,
  // Falha rápido quando o banco não consegue entregar uma conexão.
  connectionTimeoutMillis: 10_000,
  // Libera conexões ociosas para não manter recursos presos no Neon.
  idleTimeoutMillis: 30_000,
});

// Evita que erros em conexões ociosas do pool passem despercebidos.
pool.on('error', () => {
  console.error('[db] erro em uma conexão ociosa do pool PostgreSQL.');
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
  const destroy = (err: Error) => {
    if (released) return;
    released = true;
    client.release(err as any);
  };

  const releaseSafely = async () => {
    if (released) return;
    released = true;
    try {
      // Never return a connection with an open transaction or actor context.
      await client.query('rollback');
      await client.query(
        `select set_config('mmv.actor_id', '', false),
                set_config('mmv.actor_level', '', false)`,
      );
      client.release();
    } catch (error) {
      client.release(error as Error);
    }
  };

  res.once('finish', () => {
    void releaseSafely();
  });
  res.once('close', () => {
    // A premature close can happen while an async route still uses the client.
    // Destroy it rather than making it available to another request.
    if (!res.writableFinished) {
      destroy(new Error('HTTP response closed before completion'));
    }
  });
  res.once('error', destroy);

  next();
}
