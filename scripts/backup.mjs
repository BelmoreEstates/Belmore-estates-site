#!/usr/bin/env node
/**
 * Back up the database: `npm run db:backup [-- --out backups]`.
 *
 * Always writes a JSON export of the business tables (leads, lots, plans,
 * content_blocks, admins, media metadata + data) to
 * backups/belmore-<timestamp>.json. When `pg_dump` is on PATH it ALSO writes a
 * full plain-SQL dump (backups/belmore-<timestamp>.sql) that can be restored
 * with `psql "$DATABASE_URL" -f file.sql`. Use `--json-only` to skip pg_dump.
 *
 * Requires DATABASE_URL. Backups contain personal data from leads: keep them
 * private (backups/ is git-ignored).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pgFor } from "./pg.mjs";
import { databaseUrl as readDatabaseUrl } from "./env.mjs";

const TABLES = ["leads", "lots", "plans", "content_blocks", "admins", "media"];

const databaseUrl = readDatabaseUrl();
if (!databaseUrl) {
  console.error("[backup] DATABASE_URL is not set.");
  process.exit(1);
}
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir = resolve(outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : "backups");
const jsonOnly = args.includes("--json-only");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
await mkdir(outDir, { recursive: true });

const client = new (pgFor(databaseUrl).Client)({ connectionString: databaseUrl });
try {
  await client.connect();
  const exportData = { exportedAt: new Date().toISOString(), tables: {} };
  for (const table of TABLES) {
    const exists = (await client.query("select to_regclass($1) as t", [table])).rows[0].t;
    if (!exists) {
      console.warn(`[backup] table ${table} not found, skipped`);
      continue;
    }
    const { rows } = await client.query(`select * from ${table}`);
    exportData.tables[table] = rows;
    console.log(`[backup] ${table}: ${rows.length} row(s)`);
  }
  const jsonPath = join(outDir, `belmore-${stamp}.json`);
  await writeFile(jsonPath, JSON.stringify(exportData, null, 2));
  console.log(`[backup] wrote ${jsonPath}`);
} catch (err) {
  console.error("[backup] JSON export failed:", err?.message || err);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

if (!jsonOnly && process.exitCode !== 1) {
  const probe = spawnSync("pg_dump", ["--version"], { encoding: "utf8" });
  if (probe.status === 0) {
    const sqlPath = join(outDir, `belmore-${stamp}.sql`);
    const dump = spawnSync("pg_dump", ["--no-owner", "--no-privileges", "--file", sqlPath, databaseUrl], {
      encoding: "utf8",
    });
    if (dump.status === 0) console.log(`[backup] wrote ${sqlPath} (${probe.stdout.trim()})`);
    else {
      console.error("[backup] pg_dump failed:", dump.stderr.trim());
      process.exitCode = 1;
    }
  } else {
    console.log("[backup] pg_dump not found; JSON export only.");
  }
}
