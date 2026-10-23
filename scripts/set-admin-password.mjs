#!/usr/bin/env node
// @ts-check
/**
 * Give an allowlisted admin an email + password sign-in (the fallback when
 * Google sign-in isn't available):
 *
 *   npm run admin:password -- someone@example.com
 *
 * The password is typed at a hidden prompt (or read from ADMIN_PASSWORD for
 * non-interactive use); it is never printed. Only emails already in the
 * `admins` table can get a password, so this can't create new admins.
 * Re-running for the same email replaces the password and signs out that
 * person's existing sessions. Same effect as /admin → Admins → "Set password".
 */
import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { pgFor } from "./pg.mjs";
import { databaseUrl as readDatabaseUrl } from "./env.mjs";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run admin:password -- someone@example.com");
  process.exit(1);
}
const url = readDatabaseUrl();
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

/** Hidden prompt on a TTY. @param {string} q @returns {Promise<string>} */
function askHidden(q) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(q);
    stdin.setRawMode?.(true);
    stdin.resume();
    let v = "";
    const onData = (/** @type {Buffer} */ b) => {
      for (const ch of b.toString("utf8")) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          return resolve(v);
        }
        if (ch === "\u0003") process.exit(130);
        if (ch === "\u007f") v = v.slice(0, -1);
        else v += ch;
      }
    };
    stdin.on("data", onData);
  });
}

let password = process.env.ADMIN_PASSWORD ?? "";
if (!password) {
  if (!process.stdin.isTTY) {
    console.error("Run this in a terminal, or set ADMIN_PASSWORD.");
    process.exit(1);
  }
  password = await askHidden("New password (12+ characters): ");
  const again = await askHidden("Type it again: ");
  if (again !== password) {
    console.error("The two passwords don't match.");
    process.exit(1);
  }
}
if (password.length < 12 || password.length > 128) {
  console.error("Use 12 to 128 characters.");
  process.exit(1);
}

const { Client } = pgFor(url);
const db = new Client({ connectionString: url });
await db.connect();
try {
  const listed = await db.query("select role from admins where lower(email) = $1", [email]);
  if (!listed.rows.length)
    throw new Error(`${email} is not in the admins list. Add it in /admin first.`);
  const id = () => randomBytes(16).toString("hex");
  const hash = await hashPassword(password);
  await db.query("begin");
  let user = (await db.query(`select id from "user" where lower(email) = $1`, [email])).rows[0];
  if (!user) {
    user = { id: id() };
    await db.query(
      `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $2, $3, true, now(), now())`,
      [user.id, email.split("@")[0], email],
    );
  } else {
    await db.query(`update "user" set "emailVerified" = true, "updatedAt" = now() where id = $1`, [
      user.id,
    ]);
  }
  const cred = await db.query(
    `select id from account where "userId" = $1 and "providerId" = 'credential'`,
    [user.id],
  );
  if (cred.rows.length) {
    await db.query(`update account set password = $1, "updatedAt" = now() where id = $2`, [
      hash,
      cred.rows[0].id,
    ]);
    await db.query(`delete from session where "userId" = $1`, [user.id]);
  } else {
    await db.query(
      `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") values ($1, $2, 'credential', $2, $3, now(), now())`,
      [id(), user.id, hash],
    );
  }
  await db.query("commit");
  console.log(
    `Password ${cred.rows.length ? "updated" : "set"} for ${email}. They can sign in at /login → "Sign in with email and password".`,
  );
} catch (e) {
  await db.query("rollback").catch(() => {});
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await db.end();
}
