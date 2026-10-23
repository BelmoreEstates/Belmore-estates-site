import { createFileRoute } from "@tanstack/react-router";
import { isProductionSite } from "@/server/env";

/**
 * /robots.txt. Only the production site (SITE_ENV=production) invites
 * crawlers; previews and local dev disallow everything (they also send
 * X-Robots-Tag: noindex, nofollow).
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = isProductionSite()
          ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`
          : "User-agent: *\nDisallow: /\n";
        return new Response(body, {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
