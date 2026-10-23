import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

const STATIC_PATHS = [
  "/",
  "/plans",
  "/homes",
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

/** /sitemap.xml: the public pages plus every visible plan and every lot detail page. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const sql = await getSql();
        const { loadLots, loadPlans } = await import("@/server/content.server");
        const [plans, lots] = await Promise.all([loadPlans(sql), loadLots(sql)]); // hidden plans excluded
        const paths = [
          ...STATIC_PATHS,
          ...plans.map((p) => `/plans/${encodeURIComponent(p.slug)}`),
          ...lots.map((l) => `/homes/${encodeURIComponent(l.slug)}`),
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
