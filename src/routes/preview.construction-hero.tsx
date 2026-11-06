import { Fragment } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ConstructionScrollHero } from "@/components/site/construction-scroll-hero";
import { useSiteData } from "@/components/site/text";
import { Frame, type SectionStyle } from "@/site/blocks";
import { constructionHeroPreviewEnabled } from "@/site/construction-hero";
import { defaultPage, type Block } from "@/site/doc";
import { renderBlock } from "@/site/registry";

/**
 * Isolated review route. The public homepage (`/`) is not modified.
 * Production (SITE_ENV=production) redirects here back to `/`, so a
 * production deploy of this branch would still show the existing hero.
 * The route is unlisted: it is not in the menu or the sitemap.
 */
export const Route = createFileRoute("/preview/construction-hero")({
  beforeLoad: () => {
    const baked = typeof __SITE_ENV__ === "string" ? __SITE_ENV__ : "";
    if (!constructionHeroPreviewEnabled(baked)) {
      throw redirect({ to: "/", statusCode: 302 });
    }
  },
  head: () => ({
    meta: [
      { title: "Preview · conceptual visualization · Belmore Estates" },
      {
        name: "description",
        content:
          "Review-only conceptual visualization for Belmore Estates. Not a construction schedule, and not the public homepage.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConstructionHeroPreviewPage,
});

function isHomeHero(block: Block): boolean {
  return block.type === "HomeHero";
}

/** The real home page, with the still hero replaced by the scroll-scrub clip. */
function ConstructionHeroPreviewPage() {
  const { site } = useSiteData();
  const page = site.pages.home ?? defaultPage("home");
  const content = page?.content ?? [];
  const visibleHero = content.some((block) => isHomeHero(block) && !block.props.hidden);

  return (
    <>
      {visibleHero ? null : <ConstructionScrollHero />}
      {content.map((block) => {
        if (isHomeHero(block)) {
          const style = block.props as SectionStyle & { id: string };
          if (style.hidden) return null;
          return (
            <Frame key={style.id} style={style}>
              <ConstructionScrollHero />
            </Frame>
          );
        }
        return <Fragment key={block.props.id}>{renderBlock(block)}</Fragment>;
      })}
    </>
  );
}
