import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { SITE_ORIGIN } from "@/lib/seo";
import { isValidCustomSlug } from "@/site/doc";

const STATIC_PATHS = [
  "/",
  "/plans",
  "/lots",
  "/community",
  "/design-studio",
  "/process",
  "/about",
  "/faq",
  "/contact",
  "/privacy",
];

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * /sitemap.xml: the public pages, every visible plan and lot detail page, the
 * owner's published custom pages (not "draft only"), and /legal once it is
 * switched on. URLs use the production origin (SITE_ORIGIN), like the
 * canonical tags, so a preview's sitemap never lists preview URLs.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const origin = SITE_ORIGIN;
        const sql = await getSql();
        const { loadLots, loadPlans } = await import("@/server/content.server");
        const { loadDoc } = await import("@/server/site-doc.server");
        const { blockDefaults } = await import("@/data/content");
        const [plans, lots, published] = await Promise.all([
          loadPlans(sql), // hidden plans excluded
          loadLots(sql),
          loadDoc(sql, "published"),
        ]);
        const { pages, texts } = published.doc;
        const legalOn =
          (texts?.["global.legal.enabled"] ?? blockDefaults["global.legal.enabled"] ?? "")
            .trim()
            .toLowerCase() === "on";
        const custom = Object.entries(pages ?? {})
          .filter(([slug, page]) => isValidCustomSlug(slug) && page && !page.draftOnly)
          .map(([slug]) => `/${slug}`);
        const paths = [
          ...STATIC_PATHS,
          ...(legalOn ? ["/legal"] : []),
          ...custom,
          ...plans.map((p) => `/plans/${encodeURIComponent(p.slug)}`),
          ...lots.map((l) => `/lots/${encodeURIComponent(l.slug)}`),
        ];
        const body =
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          paths.map((p) => `  <url><loc>${xmlEscape(origin + p)}</loc></url>`).join("\n") +
          `\n</urlset>\n`;
        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
