import { createFileRoute, notFound } from "@tanstack/react-router";
import { headPath, socialDefaults, textOf, useSiteData } from "@/components/site/text";
import { canonicalPath, seoTags } from "@/lib/seo";
import type { PublicData } from "@/server/public";
import { isValidCustomSlug } from "@/site/doc";
import { PageView } from "@/site/page-view";

/**
 * Pages the owner creates in the visual editor ("/open-house", …). Anything
 * that isn't one of them is a real 404 (the root not-found page).
 */
const pageOf = (data: PublicData | undefined, slug: string) =>
  isValidCustomSlug(slug) ? data?.site.pages[slug] : undefined;

export const Route = createFileRoute("/$")({
  loader: async ({ params, parentMatchPromise }) => {
    const root = await parentMatchPromise;
    const slug = params._splat ?? "";
    if (!pageOf(root.loaderData as PublicData | undefined, slug)) throw notFound();
    return { slug };
  },
  head: ({ matches, params }) => {
    const data = matches.find((m) => (m.routeId as string) === "__root__")?.loaderData as
      PublicData | undefined;
    const page = pageOf(data, params._splat ?? "");
    if (!page || !data) return {};
    return seoTags({
      title: page.seoTitle?.trim() || page.title,
      description: page.seoDescription?.trim() || textOf(data.blocks, "global.seo.description"),
      ...socialDefaults(data.blocks),
      path: canonicalPath(headPath({ matches, params })),
    });
  },
  component: CustomPage,
});

function CustomPage() {
  const { slug } = Route.useLoaderData();
  const { site } = useSiteData();
  const title = site.pages[slug]?.title?.trim();
  // Library blocks render h2 headings, so the page's one H1 is its title
  // (visually hidden: the owner's Hero block shows the visible heading).
  return (
    <>
      {title ? <h1 className="sr-only">{title}</h1> : null}
      <PageView slug={slug} />
    </>
  );
}
