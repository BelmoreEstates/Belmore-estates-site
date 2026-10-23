import { GLA_SITE_URL, PLAN_PLACEHOLDER } from "./site-config";
import { glaPlanSpecs } from "./plans.generated";
import { copyDefaults } from "./copy.generated";

export const site = {
  community: "Belmore Estates",
  section: "Section 8",
  builder: "Schram Family Realty, LLC",
  city: "Greece",
  state: "NY",
  address: "45 Radford Way",
  officeCity: "Rochester, NY 14612",
  district: "Greece Central School District",
  streets: "Belmore Way, Shelby Circle, Emery Run, and Barclay Court",
};

export type Plan = {
  slug: string;
  sort: number;
  hidden: boolean;
  /** The approved model home (one plan at a time). */
  isModel: boolean;
  /** In the home-page showcase (model home + up to 3 similar plans). */
  featured: boolean;
  name: string;
  /** GLA's plan number, e.g. "2551". */
  planNumber: string;
  beds: number;
  baths: string;
  sqft: number;
  sqftFirst: string;
  sqftSecond: string;
  /** "One story" / "Two story". */
  stories: string;
  /** "2-car" (the copy adds "garage"). */
  garage: string;
  /** GLA's published overall width / depth, e.g. 67' 8". */
  width: string;
  depth: string;
  /** Optional footprint note (admin). */
  footprint: string;
  /** GLA publishes no style; kept empty and not rendered. */
  style: string;
  /** "TBD" renders the [PRICING — TBD] placeholder. */
  priceText: string;
  architect: string;
  /** The plan's page on GLA's site. */
  glaUrl: string;
  /** Front rendering slot. Defaults to the shared neutral placeholder. */
  renderingImage: string;
  renderingAlt: string;
  /** Floor-plan slot. Defaults to the shared neutral placeholder. */
  floorPlanImage: string;
  /** True until GLA grants permission to show its renderings / floor plans. */
  imagesPending: boolean;
};

/** The approved model home. */
export const MODEL_PLAN = "stonebridge";
/** Showcase order: the model home, then three similar plans. The rest follow in GLA import order. */
export const SHOWCASE_PLANS = ["stonebridge", "applewood", "saranac", "cravenwood"] as const;

const showcaseRank = (slug: string) => {
  const i = (SHOWCASE_PLANS as readonly string[]).indexOf(slug);
  return i < 0 ? Number.POSITIVE_INFINITY : i;
};

export const plans: Plan[] = [...glaPlanSpecs]
  .sort((a, b) => showcaseRank(a.slug) - showcaseRank(b.slug) || a.sort - b.sort)
  .map((spec, i) => ({
    slug: spec.slug,
    sort: i + 1,
    hidden: false,
    isModel: spec.slug === MODEL_PLAN,
    featured: (SHOWCASE_PLANS as readonly string[]).includes(spec.slug),
    name: spec.name,
    planNumber: spec.planNumber,
    beds: spec.beds,
    baths: spec.baths,
    sqft: spec.sqft,
    sqftFirst: spec.sqftFirst,
    sqftSecond: spec.sqftSecond,
    stories: spec.stories,
    garage: spec.garage,
    width: spec.width,
    depth: spec.depth,
    footprint: "",
    style: spec.style,
    priceText: "TBD",
    architect: "GLA Architecture",
    glaUrl: spec.glaUrl || GLA_SITE_URL,
    renderingImage: PLAN_PLACEHOLDER,
    renderingAlt: "",
    floorPlanImage: PLAN_PLACEHOLDER,
    imagesPending: true,
  }));

/** The model home (flag), else the first featured plan. */
export function modelPlan(list: Plan[]): Plan | undefined {
  return list.find((p) => p.isModel) ?? list.find((p) => p.featured);
}

/** Featured plans other than the model home, in sort order (max 3 on Home and /plans). */
export function showcasePlans(list: Plan[]): Plan[] {
  const model = modelPlan(list);
  return list.filter((p) => p.featured && p.slug !== model?.slug).slice(0, 3);
}

export type LotStatus = "available" | "reserved" | "sold";

export const LOT_STATUSES: readonly LotStatus[] = ["available", "reserved", "sold"];

export type PhaseLot = {
  slug: string;
  id: string;
  /** Display string, e.g. "0.432 acres · 18,802 sq ft" (plat figures). */
  acres: string;
  areaSqft: number;
  areaAcres: string;
  /** Plat frontage, e.g. "80.00 ft" or "86.49 ft + 45.83 ft arc". */
  frontage: string;
  /** Plat depth, e.g. "150.00 ft" or "Irregular". */
  depth: string;
  street: string;
  note: string;
  status: LotStatus;
  priceText: string;
  premium: string;
};

type PlatLot = Omit<PhaseLot, "slug" | "acres" | "status" | "priceText" | "premium">;

/** Figures read from PDF p.1 of the signed plan set (see /workspace/belmore/plat-lots.csv). */
const platLots: PlatLot[] = [
  {
    id: "801",
    areaSqft: 18802,
    areaAcres: "0.432",
    frontage: "86.49 ft + 45.83 ft arc",
    depth: "Irregular",
    street: "Belmore Way",
    note: "Inside the Belmore Way bend, south of lot 802. Largest lot on the west side of the street.",
  },
  {
    id: "802",
    areaSqft: 12000,
    areaAcres: "0.275",
    frontage: "80.00 ft",
    depth: "150.00 ft",
    street: "Belmore Way",
    note: "80 feet on Belmore Way by 150 feet deep, between lots 801 and 803.",
  },
  {
    id: "803",
    areaSqft: 12000,
    areaAcres: "0.275",
    frontage: "80.00 ft",
    depth: "150.00 ft",
    street: "Belmore Way",
    note: "80 feet on Belmore Way by 150 feet deep, between lots 802 and 804.",
  },
  {
    id: "804",
    areaSqft: 12000,
    areaAcres: "0.275",
    frontage: "80.00 ft",
    depth: "150.00 ft",
    street: "Belmore Way",
    note: "North end of the west row, 80 by 150 feet, next to the earlier Legends West lots.",
  },
  {
    id: "805",
    areaSqft: 12400,
    areaAcres: "0.285",
    frontage: "80.00 ft",
    depth: "155.00 ft",
    street: "Belmore Way",
    note: "80 by 155 feet on the east side of Belmore Way, in line with lot 804.",
  },
  {
    id: "806",
    areaSqft: 17632,
    areaAcres: "0.405",
    frontage: "85.00 ft + 47.12 ft arc + 125.00 ft",
    depth: "Irregular corner",
    street: "Belmore Way at Shelby Circle",
    note: "Corner lot south of 805. It fronts Belmore Way and the north side of Shelby Circle.",
  },
  {
    id: "807",
    areaSqft: 18009,
    areaAcres: "0.413",
    frontage: "125.00 ft + 47.12 ft arc + 41.49 ft + 36.18 ft arc",
    depth: "Irregular corner",
    street: "Belmore Way at Shelby Circle",
    note: "South of Shelby Circle, on the outside of the Belmore Way bend.",
  },
];

export function lotAreaLabel(lot: { areaSqft: number | null; areaAcres: string | null }) {
  const parts: string[] = [];
  if (lot.areaAcres) parts.push(`${lot.areaAcres} acres`);
  if (lot.areaSqft) parts.push(`${lot.areaSqft.toLocaleString("en-US")} sq ft`);
  return parts.join(" · ");
}

export const phaseLots: PhaseLot[] = platLots.map((lot) => ({
  ...lot,
  // Quill's copy (homes.md) wins over the draft notes when present.
  street: copyDefaults[`homes.lot${lot.id}.street`] ?? lot.street,
  note: copyDefaults[`homes.lot${lot.id}.note`] ?? lot.note,
  slug: lot.id,
  acres: lotAreaLabel(lot),
  status: "available",
  priceText: "On request",
  premium: "TBD",
}));

export const homes = phaseLots;

export function planBySlug(slug: string) {
  return plans.find((plan) => plan.slug === slug);
}

export function homeBySlug(slug: string) {
  return phaseLots.find((lot) => lot.slug === slug);
}

export function homesOnLot(lotId: string) {
  return phaseLots.find((lot) => lot.id === lotId);
}

export const nav = [
  { to: "/community", label: "Community" },
  { to: "/plans", label: "Floor Plans" },
  { to: "/lots", label: "Phase 1 Lots" },
  { to: "/design-studio", label: "Design Studio" },
  { to: "/process", label: "Our Process" },
  { to: "/about", label: "About" },
] as const;
