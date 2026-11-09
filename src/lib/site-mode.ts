/**
 * SITE_MODE is a build-time switch (vite.config.ts bakes `__SITE_MODE__`).
 * Unset, or any value other than "coming-soon", builds the full site.
 * "coming-soon" builds the temporary landing: every public route redirects
 * to it. Operational routes stay up so leads, sign-in, and robots keep working.
 *
 * Like SITE_ENV, this has to be baked per deploy. Preview and production are
 * the same Netlify site and share runtime env vars.
 */

export const COMING_SOON_TITLE = "Coming Soon | Belmore Estates";

/** Meta description. The on-page headline is the h1; this repeats it for search/social. */
export const COMING_SOON_DESCRIPTION =
  "Coming soon. A 24-lot semi-custom home community in North Greece, NY, within Legends West. Phase 1 is lots 801–807, on Belmore Way and Shelby Circle.";

export const COMING_SOON_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600&display=swap";

const PASSTHROUGH_SEGMENTS = new Set(["admin", "login", "editor", "api", "media"]);

export function normalizePath(pathname: string): string {
  const raw = (pathname || "/").split(/[?#]/)[0] || "/";
  if (!raw.startsWith("/")) return normalizePath(`/${raw}`);
  if (raw.length > 1) return raw.replace(/\/+$/, "") || "/";
  return raw;
}

function isPassthrough(path: string): boolean {
  if (path === "/robots.txt" || path === "/sitemap.xml") return true;
  // TanStack server functions live under /_serverFn (and /_build).
  if (path.startsWith("/_")) return true;
  const segment = path.split("/")[1] ?? "";
  return PASSTHROUGH_SEGMENTS.has(segment);
}

export type ComingSoonTarget = { to: "/"; hash?: "legal" | "privacy" };

/**
 * Where a URL should go when SITE_MODE=coming-soon.
 * null means "leave this request alone" (already the landing, or an operational route).
 */
export function comingSoonDestination(pathname: string): ComingSoonTarget | null {
  const path = normalizePath(pathname);
  if (path === "/" || isPassthrough(path)) return null;
  const segment = path.split("/")[1] ?? "";
  if (segment === "privacy") return { to: "/", hash: "privacy" };
  if (segment === "legal") return { to: "/", hash: "legal" };
  return { to: "/" };
}

export function isComingSoon(): boolean {
  return (typeof __SITE_MODE__ === "string" ? __SITE_MODE__ : "") === "coming-soon";
}
