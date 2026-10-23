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
