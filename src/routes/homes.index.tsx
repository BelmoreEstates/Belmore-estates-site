import { createFileRoute, redirect } from "@tanstack/react-router";

/** Round 7: the lots index moved from /homes to /lots (301; netlify.toml redirects at the CDN too). */
export const Route = createFileRoute("/homes/")({
  beforeLoad: () => {
    throw redirect({ to: "/lots", statusCode: 301 });
  },
});
