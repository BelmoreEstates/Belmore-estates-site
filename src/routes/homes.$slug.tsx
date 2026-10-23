import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Round 7: lot pages moved from /homes/{lot} to /lots/{lot} (301; netlify.toml
 * redirects at the CDN too). Kept as a route so older links (and the site
 * model's lot links) keep working on client-side navigation.
 */
export const Route = createFileRoute("/homes/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/lots/$slug", params: { slug: params.slug }, statusCode: 301 });
  },
});
