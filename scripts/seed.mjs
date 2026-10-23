#!/usr/bin/env node
/**
 * Seed the database: `npm run db:seed` (run `npm run db:migrate` first).
 *
 *  - Owner admins: every address in OWNER_EMAILS (comma-separated; default
 *    belmoreestates@gmail.com + realtor.deleguardia@gmail.com) is upserted into `admins` as an owner.
 *  - Content: re-applies migrations/0005_seed_content.sql — the default lots
 *    and plans — with `on conflict do nothing`, so rows that already exist
 *    (including the owner's edits in /admin) are never overwritten. Site
 *    content (site_docs, from migrations/0008) needs no seed: a doc without a
 *    text, page, menu or theme falls back to the code defaults
 *    (src/data/copy.generated.ts and src/site/doc.ts).
 *
 * Safe to re-run. Requires DATABASE_URL.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pgFor } from "./pg.mjs";
import { databaseUrl as readDatabaseUrl } from "./env.mjs";

const DEFAULT_OWNER = "belmoreestates@gmail.com,realtor.deleguardia@gmail.com";
const databaseUrl = readDatabaseUrl();
if (!databaseUrl) {
  console.error("[seed] DATABASE_URL is not set.");
  process.exit(1);
}

const owners = (process.env.OWNER_EMAILS?.trim() || DEFAULT_OWNER)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));

const client = new (pgFor(databaseUrl).Client)({ connectionString: databaseUrl });
try {
  await client.connect();
  const [{ n }] = (await client.query("select count(*)::int as n from _migrations")).rows;
  if (!n) throw new Error("no migrations applied yet; run `npm run db:migrate` first");

  await client.query("begin");
  for (const email of owners) {
    await client.query(
      `insert into admins (email, role, added_by) values ($1, 'owner', 'seed')
       on conflict (email) do update set role = 'owner'`,
      [email],
    );
    console.log(`[seed] owner admin: ${email}`);
  }
  const contentSql = await readFile(
    join(dirname(fileURLToPath(import.meta.url)), "..", "migrations", "0005_seed_content.sql"),
    "utf8",
  );
  await client.query(contentSql);
  await client.query("commit");
  const lots = (await client.query("select count(*)::int as n from lots")).rows[0].n;
  const plans = (await client.query("select count(*)::int as n from plans")).rows[0].n;
  console.log(`[seed] done: ${lots} lots, ${plans} plans in the database.`);
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error("[seed] failed:", err?.message || err);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
