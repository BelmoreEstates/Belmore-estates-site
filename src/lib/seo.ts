/**
 * Search / social <head> tags shared by every public page: title, meta
 * description, canonical URL, Open Graph, Twitter card and JSON-LD.
 *
 * Canonical and og:url always point at the PRODUCTION origin (SITE_ORIGIN,
 * baked in at build time by `npm run deploy:*`, see scripts/deploy.mjs and
 * vite.config.ts), so the preview alias never competes with the real site.
 * The preview still sends noindex (src/start.ts, src/routes/__root.tsx).
 *
 * All wording comes from keyed texts (Quill owns them):
 *   <page>.seo.title / .seo.description   title + meta description
 *   <page>.og.title / .og.description     social title/description (empty = the seo value)
 *   global.og.site_name                   og:site_name (empty = global.seo.title)
 *   global.og.image / global.og.image.alt share image (empty = /og.jpg, no alt)
 */
import { DEFAULT_SITE_ORIGIN } from "@/data/site-config";

type Meta = Record<string, string>;
type Link = Record<string, string>;
type Script = { type: string; children: string };

/** Production origin without a trailing slash, e.g. https://belmore-estates.netlify.app. */
export const SITE_ORIGIN = (
  (typeof __SITE_ORIGIN__ === "string" && __SITE_ORIGIN__) ||
  DEFAULT_SITE_ORIGIN
).replace(/\/+$/, "");

export const DEFAULT_OG_IMAGE = "/og.jpg";

/** Canonical form of a path: no query/hash, no trailing slash (except "/"). */
export function canonicalPath(path: string): string {
  const p = (path || "/").split(/[?#]/)[0] || "/";
  return p.length > 1 ? p.replace(/\/+$/, "") || "/" : "/";
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return SITE_ORIGIN + (pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`);
}

/** JSON for a <script type="application/ld+json"> (no "</script>" breakouts). */
export function jsonLdScript(data: unknown): Script {
  return {
    type: "application/ld+json",
    children: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

export type SeoInput = {
  title: string;
  description: string;
  /** Social overrides; empty falls back to title/description. */
  ogTitle?: string;
  ogDescription?: string;
  siteName: string;
  /** Root-relative or absolute; empty = /og.jpg. */
  image?: string;
  imageAlt?: string;
  path: string;
  jsonLd?: unknown[];
};

export function seoTags(input: SeoInput): { meta: Meta[]; links: Link[]; scripts: Script[] } {
  const url = absoluteUrl(canonicalPath(input.path));
  const ogTitle = input.ogTitle?.trim() || input.title;
  const ogDescription = input.ogDescription?.trim() || input.description;
  const image = absoluteUrl(input.image?.trim() || DEFAULT_OG_IMAGE);
  const alt = input.imageAlt?.trim() ?? "";
  const meta: Meta[] = [
    { title: input.title },
    { name: "description", content: input.description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: input.siteName },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    ...(image.endsWith(DEFAULT_OG_IMAGE)
      ? [
          { property: "og:image:width", content: "1200" },
          { property: "og:image:height", content: "630" },
        ]
      : []),
    ...(alt ? [{ property: "og:image:alt", content: alt }] : []),
    { property: "og:locale", content: "en_US" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: ogDescription },
    { name: "twitter:image", content: image },
    ...(alt ? [{ name: "twitter:image:alt", content: alt }] : []),
  ];
  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts: (input.jsonLd ?? []).map(jsonLdScript),
  };
}
