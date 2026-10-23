/**
 * Server-only helpers: form tokens, IP hashing, and the admin allowlist check.
 * Import dynamically from inside createServerFn handlers only.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import type { Sql } from "@/lib/db";
import { ownerEmails } from "./env";

const globalSecret: { value?: string } = {};

function serverSecret(): string {
  // BETTER_AUTH_SECRET is set in Netlify's environment variables. The fixed
  // fallback only applies in local dev; a production build without the secret
  // uses a random per-process value (tokens then just expire on cold start).
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (secret) return secret;
  if (import.meta.env.DEV) return "belmore-dev-only-form-secret";
  globalSecret.value ??= randomBytes(32).toString("hex");
  return globalSecret.value;
}

const sign = (payload: string) =>
  createHmac("sha256", serverSecret()).update(payload).digest("base64url");

/** `<issuedAtMs>.<nonce>.<sig>` */
export function issueFormToken(now = Date.now()): string {
  const payload = `${now}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export function readFormToken(token: string): { issuedAt: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(parts[2]);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  const issuedAt = Number(parts[0]);
  return Number.isFinite(issuedAt) ? { issuedAt } : null;
}

export function clientIp(): string {
  const h = getRequest()?.headers;
  // Netlify sets x-nf-client-connection-ip to the real client address.
  const fwd =
    h?.get("x-nf-client-connection-ip") ?? h?.get("x-forwarded-for") ?? h?.get("x-real-ip") ?? "";
  return fwd.split(",")[0]?.trim() || "unknown";
}

/** Salted one-way hash; the raw IP is never stored. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${serverSecret()}|ip|${ip}`).digest("hex").slice(0, 32);
}

export function userAgent(): string {
  return (getRequest()?.headers.get("user-agent") ?? "").slice(0, 300);
}

export function randomToken(): string {
  return randomBytes(18).toString("base64url");
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type AdminRole = "owner" | "admin";
export type AdminIdentity = { userId: string; email: string; role: AdminRole };

export type AdminCheck =
  | { ok: true; admin: AdminIdentity }
  | { ok: false; reason: "signed_out" | "unverified" | "not_allowlisted"; email: string | null };

const isOwnerEmail = (email: string) => ownerEmails().includes(email.trim().toLowerCase());

/**
 * Resolve the caller and check the allowlist. Only verified-email sign-ins
 * count: a linked Google account (`providerId = 'google'`) whose user row has
 * `emailVerified = true` (Better Auth copies Google's `email_verified`).
 * Emails are compared lowercase. Email/password sign-in is disabled.
 */
export async function checkAdmin(sql: Sql): Promise<AdminCheck> {
  const { getSessionUser, authConfigured } = await import("@/lib/auth/verify.server");
  // LOCAL QA ONLY: `BELMORE_QA_AS=email npm run dev` simulates a verified
  // sign-in so the allowlist can be tested without Google credentials.
  // `import.meta.env.DEV` is false in `vite build`, so this branch is removed
  // from production bundles; it is also ignored whenever Google is configured.
  if (import.meta.env.DEV && !authConfigured && process.env.BELMORE_QA_AS) {
    const qaEmail = process.env.BELMORE_QA_AS.trim().toLowerCase();
    if (isOwnerEmail(qaEmail)) return { ok: true, admin: { userId: "qa-user", email: qaEmail, role: "owner" } };
    const [qaAdmin] = await sql<{ role: AdminRole }>`select role from admins where lower(email) = ${qaEmail}`;
    if (!qaAdmin) return { ok: false, reason: "not_allowlisted", email: qaEmail };
    return { ok: true, admin: { userId: "qa-user", email: qaEmail, role: qaAdmin.role } };
  }
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "signed_out", email: null };
  const email = user.email?.trim().toLowerCase() ?? "";

  const [row] = await sql<{ verified: boolean | null }>`
    select "emailVerified" as verified from "user" where id = ${user.id}`;
  const [google] = await sql<{ id: string }>`
    select id from account where "userId" = ${user.id} and "providerId" = 'google' limit 1`;
  const verified = Boolean(email) && Boolean(google) && row?.verified === true;
  if (!verified) return { ok: false, reason: "unverified", email: email || null };

  if (isOwnerEmail(email)) return { ok: true, admin: { userId: user.id, email, role: "owner" } };
  const [admin] = await sql<{ role: AdminRole }>`
    select role from admins where lower(email) = ${email}`;
  if (!admin) return { ok: false, reason: "not_allowlisted", email };
  return { ok: true, admin: { userId: user.id, email, role: admin.role } };
}

export async function requireAdmin(sql: Sql): Promise<AdminIdentity> {
  const result = await checkAdmin(sql);
  if (!result.ok) throw new ForbiddenError("Not an admin");
  return result.admin;
}

export async function requireOwner(sql: Sql): Promise<AdminIdentity> {
  const admin = await requireAdmin(sql);
  if (admin.role !== "owner") throw new ForbiddenError("Owner only");
  return admin;
}

export { isOwnerEmail };
