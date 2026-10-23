import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { blockDefaults } from "@/data/content";
import { CONTACT_EMAIL_KEY } from "@/data/site-config";
import { phaseLots, plans as defaultPlans, type PhaseLot, type Plan } from "@/data/site";
import type { SiteDoc } from "@/site/doc";

/** Pages, menu and theme from the site doc (texts are merged into `blocks`). */
export type SiteLayout = Pick<SiteDoc, "pages" | "nav" | "theme">;
export const PREVIEW_COOKIE = "belmore_preview";

export type PublicData = {
  blocks: Record<string, string>;
  lots: PhaseLot[];
  plans: Plan[];
  /** True when content came from the static defaults because the DB failed. */
  fallback: boolean;
  /** Robots noindex: true everywhere except SITE_ENV=production. */
  noindex: boolean;
  site: SiteLayout;
  /** True when an admin is previewing the unpublished draft. */
  preview: boolean;
};

export const staticPublicData: PublicData = {
  blocks: blockDefaults,
  lots: phaseLots,
  plans: defaultPlans.filter((p) => !p.hidden),
  fallback: true,
  noindex: true,
  site: { pages: {}, nav: null, theme: {} },
  preview: false,
};

/** Everything the public pages render. DB first; static defaults on any failure. */
export const getPublicData = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicData> => {
    try {
      const sql = await getSql();
      const { loadLots, loadPlans } = await import("./content.server");
      const { loadDoc } = await import("./site-doc.server");
      // Draft preview: only for a signed-in admin who switched Preview on.
      let preview = false;
      const { getCookie, setResponseHeader } = await import("@tanstack/react-start/server");
      if (getCookie(PREVIEW_COOKIE) === "1") {
        const { checkAdmin } = await import("./security.server");
        preview = (await checkAdmin(sql)).ok;
        if (preview) setResponseHeader("Cache-Control", "private, no-store");
      }
      const [stored, lots, plans] = await Promise.all([
        loadDoc(sql, preview ? "draft" : "published"),
        loadLots(sql),
        loadPlans(sql),
      ]);
      const { contactEmail, isProductionSite } = await import("./env");
      const { texts, pages, nav, theme } = stored.doc;
      return {
        blocks: { ...blockDefaults, ...texts, [CONTACT_EMAIL_KEY]: contactEmail() },
        lots,
        plans,
        fallback: false,
        noindex: !isProductionSite(),
        site: { pages: pages ?? {}, nav: nav ?? null, theme: theme ?? {} },
        preview,
      };
    } catch (err) {
      const { logServerError } = await import("./log");
      logServerError("belmore", err, { fallback: "static content" });
      const { contactEmail, isProductionSite } = await import("./env");
      return {
        ...staticPublicData,
        blocks: { ...staticPublicData.blocks, [CONTACT_EMAIL_KEY]: contactEmail() },
        noindex: !isProductionSite(),
      };
    }
  },
);

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
