import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { hash } from "./lib.js";

export const defaultDatabaseUrl = "postgresql://aad:aad-local-only@localhost:5432/aad_habitat";
export const databaseUrl = (): string => process.env.DATABASE_URL ?? defaultDatabaseUrl;

export async function withDatabase<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const pool = new pg.Pool({ connectionString: databaseUrl() });
  const client = await pool.connect();
  try { return await fn(client); }
  finally { client.release(); await pool.end(); }
}

export async function migrate(client: pg.PoolClient): Promise<void> {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
  for (const filename of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) {
    const sql = await readFile(path.join(directory, filename), "utf8");
    const checksum = hash(sql);
    const existing = await client.query<{ checksum: string }>("SELECT checksum FROM schema_migrations WHERE version = $1", [filename]);
    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) throw new Error(`Applied migration was modified: ${filename}`);
      continue;
    }
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(version, checksum) VALUES ($1, $2)", [filename, checksum]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}
