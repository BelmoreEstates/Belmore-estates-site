import { createFileRoute, notFound } from "@tanstack/react-router";
import { detailExists } from "@/server/public";
import { lotVars, seoHead, textOf, useSiteData } from "@/components/site/text";
import { lotListingLd } from "@/lib/jsonld";
import { homeBySlug } from "@/data/site";
import { DetailContext } from "@/site/detail";
import { PageView } from "@/site/page-view";

export const Route = createFileRoute("/homes/$slug")({
  // SSR only: unknown slugs answer with HTTP 404. Client-side navigation
  // already has the data and renders the not-found view from the component.
  loader: async ({ params }) => {
    if (
      typeof window === "undefined" &&
      !(await detailExists({ data: { kind: "lot", slug: params.slug } }))
    )
      throw notFound();
  },
  component: HomeDetail,
  head: seoHead(
    "homes.detail",
    (params, data) => {
      const lot = data.lots.find((l) => l.slug === params.slug) ?? homeBySlug(params.slug);
      return lot ? lotVars(lot) : { lot: params.slug };
    },
    (params, data, url) => {
      const lot = data.lots.find((l) => l.slug === params.slug);
      if (!lot) return [];
      const v = lotVars(lot);
      return lotListingLd(lot, {
        url,
        name: textOf(data.blocks, "homes.detail.seo.title", v),
        description: textOf(data.blocks, "homes.detail.seo.description", v),
      });
    },
  ),
});

/** Lot data comes from the Lots table; the sections around it from the site doc ("_lot"). */
function HomeDetail() {
  const { slug } = Route.useParams();
  const { lots } = useSiteData();
  const lot = lots.find((l) => l.slug === slug);
  if (!lot) throw notFound();
  return (
    <DetailContext.Provider value={{ lot }}>
      <PageView slug="_lot" />
    </DetailContext.Provider>
  );
}
