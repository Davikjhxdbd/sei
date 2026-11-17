import fs from 'node:fs';
import path from 'node:path';
import type { PoolClient } from 'pg';
import { pool } from './db';

/**
 * Read-only production database diagnostic.
 * Requires DATABASE_URL explicitly and never applies or modifies migrations.
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL é obrigatório; diagnóstico não usa banco local padrão.');
  }

  const migrationDir = path.join(__dirname, '..', 'migrations');
  const expectedMigrations = fs
    .readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  let client: PoolClient | undefined;
  let transactionOpen = false;
  let releaseError: Error | undefined;

  try {
    client = await pool.connect();
    await client.query('begin read only');
    transactionOpen = true;

    const { rows: ledgerRows } = await client.query(
      `select to_regclass('public.mmv_migrations') as ledger_table`,
    );
    const ledgerExists = Boolean(ledgerRows[0]?.ledger_table);

    let appliedMigrations: string[] = [];
    if (ledgerExists) {
      const result = await client.query(
        'select name from public.mmv_migrations order by name',
      );
      appliedMigrations = result.rows.map((row: { name: string }) => row.name);
    }

    const { rows: relationRows } = await client.query(
      `select name, to_regclass('public.' || name) is not null as exists
         from unnest($1::text[]) as rel(name)
         order by name`,
      [[
        'users',
        'sectors',
        'user_roles',
        'user_sectors',
        'modules',
        'sessions',
        'notifications',
        'audit_log',
        'settings',
        'password_resets',
        'auth_rate_limits',
      ]],
    );

    const { rows: extensionRows } = await client.query(
      `select exists (
         select 1 from pg_extension where extname = 'pgcrypto'
       ) as pgcrypto_enabled`,
    );

    const missingMigrations = expectedMigrations.filter(
      (name) => !appliedMigrations.includes(name),
    );
    const unexpectedMigrations = appliedMigrations.filter(
      (name) => !expectedMigrations.includes(name),
    );
    const missingRelations = relationRows
      .filter((row: { exists: boolean }) => !row.exists)
      .map((row: { name: string }) => row.name);

    const report = {
      mode: 'read-only',
      database: 'connected',
      migrationLedger: ledgerExists ? 'present' : 'missing',
      expectedMigrationCount: expectedMigrations.length,
      appliedMigrationCount: appliedMigrations.length,
      missingMigrations,
      unexpectedMigrations,
      missingRelations,
      pgcryptoEnabled: Boolean(extensionRows[0]?.pgcrypto_enabled),
    };

    console.log(JSON.stringify(report, null, 2));

    const healthy =
      ledgerExists &&
      missingMigrations.length === 0 &&
      unexpectedMigrations.length === 0 &&
      missingRelations.length === 0 &&
      report.pgcryptoEnabled;

    await client.query('rollback');
    transactionOpen = false;
    if (!healthy) process.exitCode = 1;
  } finally {
    if (client) {
      if (transactionOpen) {
        try {
          await client.query('rollback');
        } catch (error) {
          releaseError =
            error instanceof Error ? error : new Error('Falha ao encerrar diagnóstico');
        }
      }
      client.release(releaseError);
    }
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    'Falha no diagnóstico do banco:',
    error instanceof Error ? error.name : 'erro desconhecido',
  );
  process.exitCode = 1;
});
