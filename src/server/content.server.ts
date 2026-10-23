/** Server-only: read site content from the DB, falling back to static defaults. */
import type { Sql } from "@/lib/db";
import { blockDefaults } from "@/data/content";
import { lotAreaLabel, phaseLots, plans as defaultPlans, type LotStatus, type PhaseLot, type Plan } from "@/data/site";

type LotRow = {
  id: string;
  street: string;
  note: string;
  area_sqft: number | null;
  area_acres: string | null;
  frontage: string | null;
  depth: string | null;
  status: LotStatus;
  price_text: string;
  premium: string;
};

export function lotFromRow(r: LotRow): PhaseLot {
  return {
    id: r.id,
    slug: r.id,
    street: r.street,
    note: r.note,
    areaSqft: r.area_sqft ?? 0,
    areaAcres: r.area_acres ?? "",
    acres: lotAreaLabel({ areaSqft: r.area_sqft, areaAcres: r.area_acres }),
    frontage: r.frontage ?? "",
    depth: r.depth ?? "",
    status: r.status,
    priceText: r.price_text,
    premium: r.premium,
  };
}

export type PlanRow = {
  slug: string;
  sort: number;
  hidden: boolean;
  is_model: boolean;
  featured: boolean;
  name: string;
  plan_number: string;
  beds: number;
  baths: string;
  sqft: number;
  sqft_first: string;
  sqft_second: string;
  stories: string;
  garage: string;
  width: string;
  depth: string;
  footprint: string;
  style: string;
  price_text: string;
  architect: string;
  gla_url: string;
  rendering_image: string;
  rendering_alt: string;
  floor_plan_image: string;
  images_pending: boolean;
};

export function planFromRow(r: PlanRow): Plan {
  return {
    slug: r.slug,
    sort: r.sort,
    hidden: r.hidden,
    isModel: Boolean(r.is_model),
    featured: Boolean(r.featured),
    name: r.name,
    planNumber: r.plan_number,
    beds: r.beds,
    baths: r.baths,
    sqft: r.sqft,
    sqftFirst: r.sqft_first,
    sqftSecond: r.sqft_second,
    stories: r.stories,
    garage: r.garage,
    width: r.width,
    depth: r.depth,
    footprint: r.footprint,
    style: r.style,
    priceText: r.price_text,
    architect: r.architect,
    glaUrl: r.gla_url,
    renderingImage: r.rendering_image,
    renderingAlt: r.rendering_alt,
    floorPlanImage: r.floor_plan_image,
    imagesPending: r.images_pending,
  };
}

export async function loadBlocks(sql: Sql): Promise<Record<string, string>> {
  const out = { ...blockDefaults };
  const rows = await sql<{ key: string; value: string }>`select key, value from content_blocks`;
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function loadLots(sql: Sql): Promise<PhaseLot[]> {
  const rows = await sql<LotRow>`select * from lots order by sort, id`;
  return rows.length ? rows.map(lotFromRow) : phaseLots;
}

export async function loadPlans(sql: Sql, includeHidden = false): Promise<Plan[]> {
  const rows = await sql<PlanRow>`select * from plans order by sort, slug`;
  const all = rows.length ? rows.map(planFromRow) : defaultPlans;
  return includeHidden ? all : all.filter((p) => !p.hidden);
}
