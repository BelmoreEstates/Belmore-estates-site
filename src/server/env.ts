/**
 * Server-side configuration from environment variables (Netlify → Site
 * configuration → Environment variables; locally a .env file you create from
 * .env.example). Call these only from server code (createServerFn handlers or
 * server routes). Values are read per call so nothing is frozen at build time.
 */
import {
  DEFAULT_CONTACT_EMAIL,
  DEFAULT_OWNER_EMAILS,
  DEFAULT_WEB3FORMS_ACCESS_KEYS,
  DEFAULT_WEB3FORMS_MODE,
} from "@/data/site-config";

function env(key: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

/** CONTACT_EMAIL: the address shown on the site and used for leads. */
export const contactEmail = (): string => env("CONTACT_EMAIL") ?? DEFAULT_CONTACT_EMAIL;

/**
 * WEB3FORMS_ACCESS_KEYS: comma-separated Web3Forms keys, one submission per
 * key (a single WEB3FORMS_ACCESS_KEY is also accepted). Empty = not configured.
 */
export const web3formsAccessKeys = (): string[] => {
  const raw = [env("WEB3FORMS_ACCESS_KEYS"), env("WEB3FORMS_ACCESS_KEY")].filter(Boolean).join(",");
  const keys = raw ? raw.split(",") : [...DEFAULT_WEB3FORMS_ACCESS_KEYS];
  return [...new Set(keys.map((k) => k.trim()).filter(Boolean))];
};

/** WEB3FORMS_MODE: "server" (default) or "client". See site-config.ts. */
export const web3formsMode = (): "server" | "client" => {
  const v = env("WEB3FORMS_MODE");
  return v === "client" || v === "server" ? v : DEFAULT_WEB3FORMS_MODE;
};

/** Identify a key in logs and /admin without printing it whole. */
export const maskKey = (key: string): string => `…${key.slice(-4)}`;

/** OWNER_EMAILS: comma-separated, lowercased; always-owner fallback. */
export const ownerEmails = (): string[] =>
  (env("OWNER_EMAILS")?.split(",") ?? [...DEFAULT_OWNER_EMAILS]).map((e) => e.trim().toLowerCase()).filter(Boolean);

/**
 * SITE_ENV: "production" only for the real public site. Everything else (the
 * preview alias, local dev, unset) gets noindex. `npm run deploy:*` bakes it
 * in at build time (vite.config.ts); a runtime SITE_ENV is only a fallback.
 */
export const siteEnv = (): string =>
  (typeof __SITE_ENV__ === "string" && __SITE_ENV__) || env("SITE_ENV") || "development";
export const isProductionSite = (): boolean => siteEnv() === "production";
