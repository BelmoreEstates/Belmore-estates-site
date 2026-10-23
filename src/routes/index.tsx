import { createFileRoute } from "@tanstack/react-router";
import { seoHead, textOf } from "@/components/site/text";
import { communityLd } from "@/lib/jsonld";
import { PageView } from "@/site/page-view";

/** Sections come from the site doc (src/site/sections/* + editor blocks). */
export const Route = createFileRoute("/")({
  component: () => <PageView slug="home" />,
  // The sitewide graph comes from seoHead; the home page also carries the community Place.
  head: seoHead("home", undefined, (_params, data) => [
    communityLd({
      description: textOf(data.blocks, "community.seo.description"),
      lotIds: data.lots.map((l) => l.slug),
    }),
  ]),
});
