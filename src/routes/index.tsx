import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/site/coming-soon";
import { seoHead, textOf } from "@/components/site/text";
import { communityLd } from "@/lib/jsonld";
import { seoTags } from "@/lib/seo";
import { COMING_SOON_DESCRIPTION, COMING_SOON_TITLE, isComingSoon } from "@/lib/site-mode";
import { PageView } from "@/site/page-view";

const homeHead = seoHead("home", undefined, (_params, data) => [
  communityLd({
    description: textOf(data.blocks, "community.seo.description"),
    lotIds: data.lots.map((l) => l.slug),
  }),
]);

function comingSoonHead() {
  const tags = seoTags({
    title: COMING_SOON_TITLE,
    description: COMING_SOON_DESCRIPTION,
    siteName: "Belmore Estates",
    path: "/",
  });
  tags.links.push({
    rel: "preload",
    as: "image",
    type: "image/webp",
    href: "/images/opt/hero-1024.webp",
    imageSrcSet:
      "/images/opt/hero-640.webp 640w, /images/opt/hero-1024.webp 1024w, /images/opt/hero-1600.webp 1600w",
    imageSizes: "(min-width: 960px) 58vw, 100vw",
  });
  return tags;
}

/** Sections come from the site doc (src/site/sections/* + editor blocks). */
export const Route = createFileRoute("/")({
  component: () => (isComingSoon() ? <ComingSoonPage /> : <PageView slug="home" />),
  // The sitewide graph comes from seoHead; the home page also carries the community Place.
  // Coming-soon builds do not publish that graph.
  head: (ctx) => (isComingSoon() ? comingSoonHead() : homeHead(ctx)),
});
