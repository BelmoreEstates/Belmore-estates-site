/**
 * Structured data (schema.org JSON-LD). Facts only: every value comes from
 * the site's own data (texts, Lots table, Plans table, settings). Nothing
 * here is marketing copy, and nothing is invented: no price, no
 * availability beyond what the page shows, no ratings, no street numbers.
 *
 *  - Home: Organization + WebSite (name, URL, contact email, social profiles).
 *  - Lot pages: RealEstateListing whose subject is the lot (a Place with its
 *    plat area). Lots are land, not a built Residence, so no Residence type.
 *  - Plan pages: FloorPlan (beds / baths / sq ft from GLA's published plan).
 *    A plan is a design, not a house, so no Residence/House type either.
 */
import type { PhaseLot, Plan } from "@/data/site";
import { SITE_ORIGIN } from "./seo";

/** Where the community is (used by every page). */
const LOCALITY = { addressLocality: "Greece", addressRegion: "NY", addressCountry: "US" };

const orgRef = () => ({ "@id": `${SITE_ORIGIN}/#organization` });

export function organizationLd(opts: { name: string; email: string; sameAs: string[] }) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#organization`,
      name: opts.name,
      url: `${SITE_ORIGIN}/`,
      ...(opts.email ? { email: opts.email } : {}),
      ...(opts.sameAs.length ? { sameAs: opts.sameAs } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      name: opts.name,
      url: `${SITE_ORIGIN}/`,
      publisher: orgRef(),
    },
  ];
}

export function lotListingLd(
  lot: PhaseLot,
  page: { url: string; name: string; description: string },
) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      url: page.url,
      name: page.name,
      description: page.description,
      provider: orgRef(),
      about: {
        "@type": "Place",
        name: `Lot ${lot.id}`,
        address: { "@type": "PostalAddress", streetAddress: lot.street, ...LOCALITY },
        ...(lot.areaSqft
          ? {
              additionalProperty: [
                {
                  "@type": "PropertyValue",
                  name: "Lot area (approved plat)",
                  value: lot.areaSqft,
                  unitCode: "FTK",
                  unitText: "sq ft",
                },
              ],
            }
          : {}),
      },
    },
  ];
}

export function floorPlanLd(plan: Plan, page: { url: string; name: string; description: string }) {
  const baths = Number(plan.baths);
  const full = Number.isFinite(baths) ? Math.floor(baths) : NaN;
  const partial = Number.isFinite(baths) && baths % 1 !== 0 ? 1 : 0;
  return [
    {
      "@context": "https://schema.org",
      "@type": "FloorPlan",
      url: page.url,
      name: plan.name,
      description: page.description,
      ...(plan.beds ? { numberOfBedrooms: plan.beds } : {}),
      ...(Number.isFinite(full) && full > 0
        ? { numberOfFullBathrooms: full, ...(partial ? { numberOfPartialBathrooms: partial } : {}) }
        : {}),
      ...(plan.sqft
        ? { floorSize: { "@type": "QuantitativeValue", value: plan.sqft, unitCode: "FTK" } }
        : {}),
    },
  ];
}
