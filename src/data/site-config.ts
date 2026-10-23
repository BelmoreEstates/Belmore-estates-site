/**
 * Site configuration constants, imported by both client and server code, so
 * this file must never hold a secret.
 *
 * Deployment-specific values come from environment variables (read on the
 * server in src/server/env.ts; see .env.example). The constants below are only
 * the local-dev fallbacks used when a variable is unset.
 */

/** Fallback for CONTACT_EMAIL: the public contact address ({{CONTACT_EMAIL}} in the copy). */
export const DEFAULT_CONTACT_EMAIL = "belmoreestates@gmail.com";
/** Internal key the server uses to pass CONTACT_EMAIL to pages inside the content map. */
export const CONTACT_EMAIL_KEY = "$contact_email";

/**
 * Lead notifications: WEB3FORMS_ACCESS_KEYS is a comma-separated list of
 * Web3Forms access keys (one per inbox, e.g. belmoreestates@gmail.com and
 * realtor.deleguardia@gmail.com). One submission is sent per key, in parallel,
 * after the lead is saved; a failed send never loses the lead. With no keys,
 * leads are still saved and /admin shows "notifications not configured".
 * (Access keys are not secrets: Web3Forms documents them as safe to expose.)
 */
export const DEFAULT_WEB3FORMS_ACCESS_KEYS: readonly string[] = [];

/**
 * Fallback for WEB3FORMS_MODE.
 * - "server" (default): the server function sends right after the insert.
 *   NOTE: Web3Forms answers server-side calls with 403 unless the account is
 *   on a paid plan with the server IP safelisted.
 * - "client": the visitor's browser sends the submissions (works on the free
 *   plan) and reports each result back; the lead is saved first either way.
 */
export const DEFAULT_WEB3FORMS_MODE: "server" | "client" = "server";

/**
 * Fallback for OWNER_EMAILS (comma-separated env). These emails always have
 * owner access, even if the `admins` table is emptied, so the owner can never
 * be locked out. Compared lowercased.
 */
export const DEFAULT_OWNER_EMAILS: readonly string[] = [
  "belmoreestates@gmail.com",
  "realtor.deleguardia@gmail.com",
];

/** Cloudflare Turnstile hook. Off by default; see README to turn it on. */
export const TURNSTILE_ENABLED = false;
/** Public site key (safe in client code). The secret is read server-side from TURNSTILE_SECRET_KEY. */
export const TURNSTILE_SITE_KEY = "";

/** Spam thresholds for the public forms. */
export const SPAM = {
  /** Reject submissions filled faster than this (ms since the form token was issued). */
  minFillMs: 3000,
  /** Form tokens expire after this long (ms). */
  maxFormAgeMs: 2 * 60 * 60 * 1000,
  /** Per hashed IP: max submissions in the window. */
  rateLimitMax: 5,
  rateLimitWindowMinutes: 10,
  /** Max links allowed across name + note + brokerage before rejecting. */
  maxLinks: 2,
} as const;

/** Max upload size for /admin photo uploads (bytes, before base64). */
export const MAX_UPLOAD_BYTES = 1_000_000;

/** Shared neutral placeholder for plan rendering and floor-plan slots. */
export const PLAN_PLACEHOLDER = "/images/plan-placeholder.svg";

/** GLA Architecture (Greater Living Architecture) site, used for credit links. */
export const GLA_SITE_URL = "https://greaterliving.com/";
/** GLA Architecture's public plan collection ("View all plans"). Verified 200, Oct 23 2026. */
export const GLA_PLANS_URL = "https://greaterliving.com/shop-plans/";
