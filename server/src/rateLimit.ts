import crypto from 'node:crypto';
import type { Db } from './db';

type LocalBucket = { attempts: number; expiresAt: number };
const localBuckets = new Map<string, LocalBucket>();
let warnedAboutMissingTable = false;

/** Hashes identifiers so raw usernames and IP addresses are not stored. */
export function rateLimitBucket(scope: string, identifier: string): string {
  return crypto
    .createHash('sha256')
    .update(`${scope}:${identifier}`)
    .digest('hex');
}

function consumeLocalRateLimit(bucketHash: string, windowMs: number): number {
  const now = Date.now();
  for (const [key, bucket] of localBuckets) {
    if (bucket.expiresAt <= now) localBuckets.delete(key);
  }
  const current = localBuckets.get(bucketHash);
  if (!current || current.expiresAt <= now) {
    localBuckets.set(bucketHash, { attempts: 1, expiresAt: now + windowMs });
    return 1;
  }
  current.attempts += 1;
  return current.attempts;
}

function isMissingRateLimitTable(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === '42P01',
  );
}

/** Atomically consumes one attempt in a database-shared fixed window. */
export async function consumeRateLimit(
  db: Db,
  bucketHash: string,
  windowMs: number,
): Promise<number> {
  try {
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
  } catch (error) {
    // Older production databases may not yet have migration 009. Keep login
    // available with per-instance throttling until the migration is applied.
    // This fallback is deliberately limited to the missing-table condition.
    if (!isMissingRateLimitTable(error)) throw error;
    if (!warnedAboutMissingTable) {
      warnedAboutMissingTable = true;
      console.error('[auth] auth_rate_limits ausente; usando limite temporário em memória. Aplique a migration 009.');
    }
    return consumeLocalRateLimit(bucketHash, windowMs);
  }
}

export async function clearRateLimit(db: Db, bucketHash: string): Promise<void> {
  try {
    await db.query('delete from auth_rate_limits where bucket_hash = $1', [
      bucketHash,
    ]);
  } catch (error) {
    if (!isMissingRateLimitTable(error)) throw error;
  }
  localBuckets.delete(bucketHash);
}

/** Separate account and network buckets prevent simple IP rotation bypasses. */
export function loginRateLimitBuckets(username: string, ip: string): {
  account: string;
  network: string;
} {
  return {
    account: rateLimitBucket('login-account', username.trim().toLowerCase()),
    network: rateLimitBucket('login-network', ip),
  };
}
