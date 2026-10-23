import { createFileRoute, notFound } from "@tanstack/react-router";
import { seoHead, textOf } from "@/components/site/text";
import type { PublicData } from "@/server/public";
import { PageView } from "@/site/page-view";

/**
 * Fair Housing & legal notices (round 6, Quill's legal-notices.md). Visitors
 * get "page not found" until `global.legal.enabled` is "on" in the published
 * site (the admin draft preview sees the draft's setting).
 */
export const Route = createFileRoute("/legal")({
  loader: async ({ parentMatchPromise }) => {
    const root = await parentMatchPromise;
    const data = root.loaderData as PublicData | undefined;
    const on = data
      ? textOf(data.blocks, "global.legal.enabled").trim().toLowerCase() === "on"
      : false;
    if (!on) throw notFound();
  },
  component: () => <PageView slug="legal" />,
  head: seoHead("legal"),
});
