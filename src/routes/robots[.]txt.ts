import { createFileRoute } from "@tanstack/react-router";
import { SITE_ORIGIN } from "@/lib/seo";
import { allowIndexing } from "@/server/env";

/**
 * /robots.txt. Only production with SITE_INDEXING=on invites crawlers;
 * everything else disallows everything (and also sends
 * X-Robots-Tag: noindex, nofollow).
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const body = allowIndexing()
          ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\nDisallow: /api/\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`
          : "User-agent: *\nDisallow: /\n";
        return new Response(body, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
