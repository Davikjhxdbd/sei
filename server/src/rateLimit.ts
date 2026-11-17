import crypto from 'node:crypto';
import type { Db } from './db';

/** Hashes identifiers so raw usernames and IP addresses are not stored. */
export function rateLimitBucket(scope: string, identifier: string): string {
  return crypto
    .createHash('sha256')
    .update(`${scope}:${identifier}`)
    .digest('hex');
}

/** Atomically consumes one attempt in a database-shared fixed window. */
export async function consumeRateLimit(
  db: Db,
  bucketHash: string,
  windowMs: number,
): Promise<number> {
  // Opportunistic bounded cleanup keeps expired IP buckets from accumulating.
  await db.query(
    `delete from auth_rate_limits
      where bucket_hash in (
        select bucket_hash from auth_rate_limits
         where expires_at <= now()
         order by expires_at
         limit 100
      )`,
  );

  const { rows } = await db.query(
    `insert into auth_rate_limits
       (bucket_hash, attempts, window_started_at, expires_at)
     values ($1, 1, now(), now() + ($2::int * interval '1 millisecond'))
     on conflict (bucket_hash) do update
       set attempts = case
             when auth_rate_limits.window_started_at
                    + ($2::int * interval '1 millisecond') <= now()
               then 1
             else auth_rate_limits.attempts + 1
           end,
           window_started_at = case
             when auth_rate_limits.window_started_at
                    + ($2::int * interval '1 millisecond') <= now()
               then now()
             else auth_rate_limits.window_started_at
           end,
           expires_at = now() + ($2::int * interval '1 millisecond')
     returning attempts`,
    [bucketHash, windowMs],
  );
  return Number(rows[0]?.attempts ?? 0);
}

export async function clearRateLimit(db: Db, bucketHash: string): Promise<void> {
  await db.query('delete from auth_rate_limits where bucket_hash = $1', [
    bucketHash,
  ]);
}
