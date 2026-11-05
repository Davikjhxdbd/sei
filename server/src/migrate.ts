import fs from 'node:fs';
import path from 'node:path';
import { pool } from './db';

async function main() {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    await client.query(`create table if not exists mmv_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`);

    for (const file of files) {
      const { rows } = await client.query(
        'select 1 from mmv_migrations where name = $1',
        [file],
      );
      if (rows.length) {
        console.log(`migração já aplicada: ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      console.log(`aplicando migração: ${file}`);
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into mmv_migrations (name) values ($1)', [
          file,
        ]);
        await client.query('commit');
      } catch (err) {
        await client.query('rollback');
        throw err;
      }
    }
    console.log('migrações concluídas.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('falha ao aplicar migrações:', err);
  process.exit(1);
});
