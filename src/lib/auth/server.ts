/**
 * Better Auth for Belmore Estates (server-only; never import from client code).
 *
 * Sign-in is Google only, via Better Auth's built-in Google OAuth provider.
 * Configure it with these env vars (see .env.example):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET — from a Google Cloud OAuth client.
 *     Authorized redirect URI: `${BETTER_AUTH_URL}/api/auth/callback/google`.
 *   BETTER_AUTH_SECRET — 32+ random bytes; signs sessions (and form tokens).
 *   BETTER_AUTH_URL    — this deploy's public origin (baked per deploy by
 *                        scripts/deploy.mjs), e.g. https://belmore-estates.netlify.app.
 *   BETTER_AUTH_TRUSTED_ORIGINS — optional comma list; defaults to the
 *                        production and preview--belmore-estates Netlify URLs.
 *
 * Email/password is NOT enabled. Admin access is decided separately
 * (src/server/security.server.ts): verified Google email + the admins allowlist.
 *
 * Database: Neon (DATABASE_URL) when set, else the local in-memory PGLite.
 */
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { randomBytes } from "node:crypto";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { databaseUrl, dbSource, ensureDbReady, getPglite } from "../db";
import { pgliteDialect } from "./pglite-dialect";

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const isProduction = process.env.NODE_ENV === "production";
const googleClientId = env("GOOGLE_CLIENT_ID");
const googleClientSecret = env("GOOGLE_CLIENT_SECRET");

/** True when Google sign-in is configured (real auth is enforced). */
export const authConfigured = Boolean(googleClientId && googleClientSecret);

if (isProduction && !env("BETTER_AUTH_SECRET")) {
  console.error("[auth] BETTER_AUTH_SECRET is not set; sign-in is disabled until it is.");
}
if (isProduction && !authConfigured) {
  console.error("[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set; admin sign-in is unavailable.");
}

// Local dev only: a process-stable random secret (survives HMR, not restarts).
const globalRef = globalThis as typeof globalThis & { __belmoreDevAuthSecret__?: string };
function devSecret(): string {
  globalRef.__belmoreDevAuthSecret__ ??= randomBytes(32).toString("hex");
  return globalRef.__belmoreDevAuthSecret__;
}

const LOCAL_ORIGINS = ["http://localhost:8080", "http://127.0.0.1:8080"];
/** Default origins allowed to start/finish sign-in (override: BETTER_AUTH_TRUSTED_ORIGINS). */
const DEFAULT_TRUSTED_ORIGINS = [
  "https://belmore-estates.netlify.app",
  "https://preview--belmore-estates.netlify.app",
];
// The production site and the `preview` alias are the same Netlify site and
// share runtime env vars, so `npm run deploy:*` bakes each build's own
// BETTER_AUTH_URL in (vite.config.ts). A runtime BETTER_AUTH_URL is the
// fallback; local dev defaults to localhost.
const baseURL = (__BUILD_AUTH_URL__ || env("BETTER_AUTH_URL") || "http://localhost:8080").replace(/\/+$/, "");
const trustedOrigins = [
  ...new Set([
    baseURL,
    ...(env("BETTER_AUTH_TRUSTED_ORIGINS")?.split(",") ?? DEFAULT_TRUSTED_ORIGINS),
    ...(isProduction ? [] : LOCAL_ORIGINS),
  ].map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean)),
];

// Local PGLite: start the schema bootstrap early (errors surface on first use).
if (dbSource === "pglite") void ensureDbReady().catch(() => undefined);

// Neon's Pool speaks Postgres over WebSocket (pg-compatible, works in Netlify
// Functions). Node 22+ has a global WebSocket; older Node uses `ws`.
if (!neonConfig.webSocketConstructor) {
  neonConfig.webSocketConstructor =
    ((globalThis as unknown as { WebSocket?: typeof ws }).WebSocket ?? ws);
}

const database =
  dbSource === "neon"
    ? new Pool({ connectionString: databaseUrl, max: 5 })
    : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

export const auth = betterAuth({
  baseURL,
  // In production a missing secret must not silently fall back: use an
  // unguessable per-process value so no session can be forged (sign-ins just
  // won't persist across instances until the secret is set).
  secret: env("BETTER_AUTH_SECRET") ?? (isProduction ? randomBytes(32).toString("hex") : devSecret()),
  database,
  trustedOrigins,
  emailAndPassword: { enabled: false },
  socialProviders: authConfigured
    ? {
        google: {
          clientId: googleClientId as string,
          clientSecret: googleClientSecret as string,
          // Always show the account chooser.
          prompt: "select_account",
        },
      }
    : {},
  account: {
    encryptOAuthTokens: true,
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    useSecureCookies: isProduction,
    defaultCookieAttributes: { sameSite: "lax", path: "/" },
  },
  // Bridges Better Auth's Set-Cookie into TanStack Start responses. Keep last.
  plugins: [tanstackStartCookies()],
});
