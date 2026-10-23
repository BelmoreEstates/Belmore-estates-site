#!/usr/bin/env node
/**
 * Database migrator: `npm run db:migrate`.
 *
 * Applies pending files in ../migrations (0001_*.sql, 0002_*.sql, … in name
 * order) to DATABASE_URL. Each file runs in one transaction and is recorded in
 * a `_migrations` table, so it runs once and the command is safe to re-run.
 *
 * DATABASE_URL is required (Neon: either the pooled or direct connection
 * string works). `--if-configured` skips
 * quietly when it is unset instead of failing.
 *
 * Locally without DATABASE_URL the in-memory PGLite database applies the same
 * files at dev-server startup (see src/lib/db.ts).
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pgFor } from "./pg.mjs";
import { databaseUrl as readDatabaseUrl } from "./env.mjs";
import { pendingMigrations } from "./migration-plan.mjs";

const databaseUrl = readDatabaseUrl();
if (!databaseUrl) {
  if (process.argv.includes("--if-configured")) {
    console.log("[migrate] DATABASE_URL not set — skipping.");
    process.exit(0);
  }
  console.error(
    "[migrate] DATABASE_URL is not set. Put your Neon connection string in .env or the environment.",
  );
  process.exit(1);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  let entries;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    console.log("[migrate] no migrations/ directory — nothing to do.");
    return;
  }
  if (pendingMigrations(entries, []).length === 0) {
    console.log("[migrate] no migrations — nothing to do.");
    return;
  }

  const pool = new (pgFor(databaseUrl).Pool)({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = (await client.query("SELECT name FROM _migrations")).rows.map((r) => r.name);

    let count = 0;
    for (const { name } of pendingMigrations(entries, applied)) {
      const text = await readFile(join(migrationsDir, name), "utf8");
      try {
        await client.query("BEGIN");
        // pg's simple-query protocol runs a whole multi-statement file at once.
        await client.query(text);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          // ROLLBACK fails when the connection died — keep the original error.
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(
      count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.",
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  // pg errors carry the context needed to debug a bad SQL file.
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  process.exit(1);
});
