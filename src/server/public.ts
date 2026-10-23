import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { blockDefaults } from "@/data/content";
import { CONTACT_EMAIL_KEY } from "@/data/site-config";
import { phaseLots, plans as defaultPlans, type PhaseLot, type Plan } from "@/data/site";

export type PublicData = {
  blocks: Record<string, string>;
  lots: PhaseLot[];
  plans: Plan[];
  /** True when content came from the static defaults because the DB failed. */
  fallback: boolean;
  /** Robots noindex: true everywhere except SITE_ENV=production. */
  noindex: boolean;
};

export const staticPublicData: PublicData = {
  blocks: blockDefaults,
  lots: phaseLots,
  plans: defaultPlans.filter((p) => !p.hidden),
  fallback: true,
  noindex: true,
};

/** Everything the public pages render. DB first; static defaults on any failure. */
export const getPublicData = createServerFn({ method: "GET" }).handler(async (): Promise<PublicData> => {
  try {
    const sql = await getSql();
    const { loadBlocks, loadLots, loadPlans } = await import("./content.server");
    const [blocks, lots, plans] = await Promise.all([loadBlocks(sql), loadLots(sql), loadPlans(sql)]);
    const { contactEmail, isProductionSite } = await import("./env");
    return {
      blocks: { ...blocks, [CONTACT_EMAIL_KEY]: contactEmail() },
      lots,
      plans,
      fallback: false,
      noindex: !isProductionSite(),
    };
  } catch (err) {
    console.error("[belmore] getPublicData fell back to static content:", err);
    const { contactEmail, isProductionSite } = await import("./env");
    return {
      ...staticPublicData,
      blocks: { ...staticPublicData.blocks, [CONTACT_EMAIL_KEY]: contactEmail() },
      noindex: !isProductionSite(),
    };
  }
});

/**
 * Does a lot / plan detail page exist? Used by the detail routes' loaders
 * during SSR so a bad slug returns a real HTTP 404 (not a 200 "soft 404").
 * Any DB failure says "exists" and lets the page fall back as before.
 */
export const detailExists = createServerFn({ method: "GET" })
  .validator((d: { kind: "lot" | "plan"; slug: string }) => ({
    kind: d.kind === "plan" ? ("plan" as const) : ("lot" as const),
    slug: String(d.slug).slice(0, 100),
  }))
  .handler(async ({ data }): Promise<boolean> => {
    try {
      const sql = await getSql();
      const { loadLots, loadPlans } = await import("./content.server");
      const list = data.kind === "lot" ? await loadLots(sql) : await loadPlans(sql);
      return list.some((item) => item.slug === data.slug);
    } catch {
      return true;
    }
  });
