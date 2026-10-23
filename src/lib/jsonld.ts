/**
 * Structured data (schema.org JSON-LD), following Scout's SEO research §3
 * (/workspace/belmore/scout-seo-research.md). Facts only: names and roles
 * below are the ones the site already states (footer / About / legal page);
 * lot and plan figures come from the Lots and Plans tables. Nothing invented:
 * no builder (none is confirmed), no price unless one is set, no dates, no
 * ratings or reviews, no phone/address placeholders (left out until real).
 *
 *  - Every page: @graph of WebSite, the brokerage (RealEstateAgent, publisher),
 *    the listing agent (Person) and the developer/seller (Organization).
 *  - / and /community: the community Place with geo.
 *  - /lots/{lot}: RealEstateListing + Offer whose item is the lot (a Place).
 *  - /plans/{slug}: WebPage about a SingleFamilyResidence "to be built".
 */
import type { LotStatus, PhaseLot, Plan } from "@/data/site";
import { SITE_ORIGIN } from "./seo";

const id = (frag: string, path = "/") => `${SITE_ORIGIN}${path}#${frag}`;
const ref = (frag: string, path = "/") => ({ "@id": id(frag, path) });

/** Geo: centroid of the Schram parcel (Town of Greece GIS), per Scout §3.4. */
export const COMMUNITY_GEO = { latitude: 43.2636, longitude: -77.6851 } as const;

/** Mailing address form (Scout §3.4/§4.4): Rochester, NY 14612, in the Town of Greece. */
const mailing = (streetAddress?: string) => ({
  "@type": "PostalAddress",
  ...(streetAddress ? { streetAddress } : {}),
  addressLocality: "Rochester",
  addressRegion: "NY",
  postalCode: "14612",
  addressCountry: "US",
});

/** The sitewide entity graph (every page). */
export function siteGraphLd(opts: { siteName: string; sameAs?: string[] }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": id("website"),
        url: `${SITE_ORIGIN}/`,
        name: opts.siteName,
        inLanguage: "en-US",
        publisher: ref("broker"),
        about: ref("community"),
        ...(opts.sameAs?.length ? { sameAs: opts.sameAs } : {}),
      },
      {
        // The brokerage is the advertiser under 19 NYCRR 175.25. Its URL, phone
        // and address are left out until Joseph supplies them (no placeholders).
        "@type": "RealEstateAgent",
        "@id": id("broker"),
        name: "RE/MAX Realty Group",
      },
      {
        "@type": "Person",
        "@id": id("agent"),
        name: "Joseph Deleguardia",
        jobTitle: "Licensed Real Estate Salesperson",
        worksFor: ref("broker"),
        memberOf: { "@type": "Organization", name: "The Derek Pino Team at RE/MAX Realty Group" },
        url: `${SITE_ORIGIN}/about`,
      },
      {
        // Developer and seller of the lots. Not marked as a builder.
        "@type": "Organization",
        "@id": id("developer"),
        name: "Schram Family Realty, LLC",
        address: mailing("45 Radford Way"),
      },
    ],
  };
}

/** The community (on / and /community). */
export function communityLd(opts: { description: string; lotIds: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": id("community"),
    name: "Belmore Estates",
    ...(opts.description ? { description: opts.description } : {}),
    url: `${SITE_ORIGIN}/community`,
    address: mailing("Belmore Way"),
    geo: { "@type": "GeoCoordinates", ...COMMUNITY_GEO },
    containedInPlace: [
      { "@type": "Place", name: "Legends West" },
      { "@type": "AdministrativeArea", name: "Town of Greece", sameAs: "https://greeceny.gov/" },
      { "@type": "AdministrativeArea", name: "Monroe County, New York" },
    ],
    ...(opts.lotIds.length
      ? { containsPlace: opts.lotIds.map((l) => ref("lot", `/lots/${l}`)) }
      : {}),
  };
}

/** Scout §3.5. "Available" is shown as Coming Soon, so no availability claim is made for it. */
const AVAILABILITY: Partial<Record<LotStatus, string>> = {
  reserved: "https://schema.org/LimitedAvailability",
  sold: "https://schema.org/SoldOut",
};

/** A plain number from a price string like "$85,000" (only when the page shows one). */
function priceOf(text: string): number | null {
  const m = /^\s*\$\s*([\d,]+(?:\.\d{2})?)\s*$/.exec(text || "");
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

export function lotListingLd(
  lot: PhaseLot,
  page: { url: string; name: string; description: string },
) {
  const path = `/lots/${lot.slug}`;
  const price = priceOf(lot.priceText);
  const acres = Number.parseFloat(lot.areaAcres);
  return [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      "@id": id("listing", path),
      url: page.url,
      name: page.name,
      ...(page.description ? { description: page.description } : {}),
      isPartOf: ref("website"),
      about: ref("lot", path),
      offers: {
        "@type": "Offer",
        itemOffered: {
          "@type": "Place",
          "@id": id("lot", path),
          name: `Lot ${lot.id}`,
          address: mailing(lot.street || "Belmore Way"),
          ...(lot.areaSqft || Number.isFinite(acres)
            ? {
                additionalProperty: [
                  ...(Number.isFinite(acres)
                    ? [
                        {
                          "@type": "PropertyValue",
                          name: "Lot area",
                          value: acres,
                          unitText: "acres",
                        },
                      ]
                    : []),
                  ...(lot.areaSqft
                    ? [
                        {
                          "@type": "PropertyValue",
                          name: "Lot area (approved plat)",
                          value: lot.areaSqft,
                          unitCode: "FTK",
                          unitText: "sq ft",
                        },
                      ]
                    : []),
                ],
              }
            : {}),
          containedInPlace: ref("community"),
        },
        ...(AVAILABILITY[lot.status] ? { availability: AVAILABILITY[lot.status] } : {}),
        ...(price ? { price, priceCurrency: "USD" } : {}),
        seller: ref("developer"),
        offeredBy: ref("agent"),
      },
    },
  ];
}

export function floorPlanLd(plan: Plan, page: { url: string; name: string; description: string }) {
  const baths = Number.parseFloat(plan.baths);
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      url: page.url,
      name: page.name,
      ...(page.description ? { description: page.description } : {}),
      isPartOf: ref("website"),
      about: {
        "@type": "SingleFamilyResidence",
        name: `${plan.name}${plan.planNumber ? ` (GLA plan ${plan.planNumber})` : ""}, to be built`,
        description:
          "House plan offered for construction on Belmore Estates lots. Not an existing home.",
        ...(plan.beds ? { numberOfBedrooms: plan.beds } : {}),
        ...(Number.isFinite(baths) && baths > 0 ? { numberOfBathroomsTotal: baths } : {}),
        ...(plan.sqft
          ? { floorSize: { "@type": "QuantitativeValue", value: plan.sqft, unitCode: "FTK" } }
          : {}),
        containedInPlace: ref("community"),
      },
      // Plans credited to GLA (no GLA images: no permission).
      mentions: {
        "@type": "Organization",
        name: "Greater Living Architecture, P.C. (GLA Architecture)",
        ...(plan.glaUrl ? { url: plan.glaUrl } : {}),
      },
    },
  ];
}
