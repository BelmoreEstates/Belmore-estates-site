import { createFileRoute, notFound } from "@tanstack/react-router";
import { detailExists } from "@/server/public";
import { planVars, seoHead, textOf, useSiteData } from "@/components/site/text";
import { floorPlanLd } from "@/lib/jsonld";
import { planBySlug } from "@/data/site";
import { DetailContext } from "@/site/detail";
import { PageView } from "@/site/page-view";

export const Route = createFileRoute("/plans/$slug")({
  // SSR only: unknown slugs answer with HTTP 404. Client-side navigation
  // already has the data and renders the not-found view from the component.
  loader: async ({ params }) => {
    if (
      typeof window === "undefined" &&
      !(await detailExists({ data: { kind: "plan", slug: params.slug } }))
    )
      throw notFound();
  },
  component: PlanPage,
  head: seoHead(
    "plans.detail",
    (params, data) => {
      const plan = data.plans.find((p) => p.slug === params.slug) ?? planBySlug(params.slug);
      return plan ? planVars(plan) : { name: "Floor plan" };
    },
    (params, data, url) => {
      const plan = data.plans.find((p) => p.slug === params.slug);
      if (!plan) return [];
      const v = planVars(plan);
      return floorPlanLd(plan, {
        url,
        name: textOf(data.blocks, "plans.detail.seo.title", v),
        description: textOf(data.blocks, "plans.detail.seo.description", v),
      });
    },
  ),
});

/** Plan data comes from the Plans table; the sections around it from the site doc ("_plan"). */
function PlanPage() {
  const { slug } = Route.useParams();
  const { plans } = useSiteData();
  const plan = plans.find((p) => p.slug === slug);
  if (!plan) throw notFound();
  return (
    <DetailContext.Provider value={{ plan }}>
      <PageView slug="_plan" />
    </DetailContext.Provider>
  );
}
