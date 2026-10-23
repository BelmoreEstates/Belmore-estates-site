/**
 * Round 6 keys from Quill's v2 copy (/workspace/belmore/copy, Oct 23 2026).
 *
 * copy.generated.ts is NOT regenerated from v2: that would change the
 * published site's defaults. Instead the new keys are added here:
 *  - keys that render inside an existing public section default to "" and
 *    only render when filled (Quill's text is set in the DRAFT);
 *  - keys of new, gated UI (footer legal row, /legal, trust band, buyer
 *    story) carry Quill's text as their default; that UI stays invisible to
 *    visitors until `global.legal.enabled` is "on" / the section is placed.
 * `global.footer.eho.logo.alt` uses "Equal Housing Opportunity" (owner's spec).
 * `global.footer.fairhousing.url` / `sop.url`: https links (empty = the
 * Fair Housing link goes to /legal#dos, the SOP link stays hidden).
 */
import type { BlockDef } from "./content";

export const round6Blocks: BlockDef[] = [
  { key: "community.facts.utilities.label", value: "" },
  { key: "community.facts.utilities.value", value: "" },
  { key: "community.facts.builder.label", value: "" },
  { key: "community.facts.builder.value", value: "" },
  { key: "community.facts.hoa.label", value: "" },
  { key: "community.facts.hoa.value", value: "" },
  { key: "faq.intro.body", value: "", multiline: true },
  { key: "faq.group1.label", value: "" },
  { key: "faq.group2.label", value: "" },
  { key: "faq.group3.label", value: "" },
  { key: "global.menu.legal", value: "Fair Housing" },
  {
    key: "global.footer.privacy_summary",
    value:
      "We use what you send through our forms only to reply to you about Belmore Estates, and we never sell it.",
    multiline: true,
  },
  { key: "global.footer.privacy_link", value: "Read our Privacy Policy" },
  {
    key: "global.footer.eho",
    value:
      "Equal Housing Opportunity. We are pledged to the letter and spirit of U.S. policy for equal housing opportunity and comply with federal and New York State fair housing law.",
    multiline: true,
  },
  { key: "global.footer.eho.logo.alt", value: "Equal Housing Opportunity" },
  { key: "global.footer.fairhousing.link", value: "New York State Fair Housing Notice" },
  { key: "global.footer.sop.link", value: "Standardized Operating Procedures" },
  { key: "global.footer.legal.link", value: "Fair Housing and Legal Notices" },
  {
    key: "global.footer.broker",
    value:
      "Listing agent: Joseph Deleguardia, Licensed Real Estate Salesperson, The Derek Pino Team, RE/MAX Realty Group · [BROKERAGE ADDRESS — TO CONFIRM] · [BROKERAGE PHONE — TO CONFIRM] · License [LICENSE NO. — TO CONFIRM]",
    multiline: true,
  },
  {
    key: "global.footer.broker.independent",
    value: "Each office independently owned and operated.",
  },
  { key: "home.trust.eyebrow", value: "Why Belmore Estates" },
  { key: "home.trust.h2", value: "A New Street in a Finished Neighborhood" },
  { key: "home.trust.item1.title", value: "An Established Neighborhood" },
  {
    key: "home.trust.item1.body",
    value:
      "Belmore Estates is the final section of Legends West, so the roads, the neighbors, and the feel of the place are already here.",
    multiline: true,
  },
  { key: "home.trust.item2.title", value: "An Approved Plat" },
  {
    key: "home.trust.item2.body",
    value:
      "Section 8 carries Town of Greece approval. Lots are served by Monroe County Water Authority water and Town sewer, treated by Monroe County Pure Waters.",
    multiline: true,
  },
  { key: "home.trust.item3.title", value: "New York Buyer Protections" },
  {
    key: "home.trust.item3.body",
    value:
      "Every new home comes with New York's 1-2-6 implied warranty, and you can require that your deposit be held in escrow or covered by a bond.",
    multiline: true,
  },
  { key: "home.trust.item4.title", value: "A Local Family Developer" },
  {
    key: "home.trust.item4.body",
    value:
      "Schram Family Realty, LLC, based on Radford Way in Rochester, with representation by RE/MAX Realty Group.",
    multiline: true,
  },
  { key: "home.testimonial.quote", value: "[TESTIMONIAL — TO COME, real buyer quote only]" },
  { key: "home.testimonial.name", value: "[BUYER NAME — TO COME, with written permission]" },
  { key: "home.sitemodel.intro", value: "" },
  { key: "legal.seo.title", value: "Fair Housing and Legal Notices | Belmore Estates" },
  {
    key: "legal.seo.description",
    value:
      "Equal Housing Opportunity, New York fair housing protections, the NY DOS Fair Housing Notice, and brokerage disclosures for Belmore Estates in Greece.",
    multiline: true,
  },
  { key: "legal.draft.flag", value: "Draft — brokerage review recommended" },
  { key: "legal.intro.eyebrow", value: "Fair Housing" },
  { key: "legal.intro.h2", value: "Fair Housing and Legal Notices" },
  {
    key: "legal.intro.body",
    value:
      "Belmore Estates is open to every buyer. This page sets out our fair housing commitment, the protections that New York and federal law give you, and the brokerage disclosures that apply to this listing.",
    multiline: true,
  },
  { key: "legal.eho.h3", value: "Equal Housing Opportunity" },
  {
    key: "legal.eho.body",
    value:
      "We are pledged to the letter and spirit of U.S. policy for the achievement of equal housing opportunity throughout the Nation. We encourage and support an affirmative advertising and marketing program in which there are no barriers to obtaining housing because of race, color, religion, sex, handicap, familial status, or national origin.",
    multiline: true,
  },
  { key: "legal.eho.logo.alt", value: "Equal Housing Opportunity" },
  { key: "legal.nys.h3", value: "Your Rights Under New York Law" },
  {
    key: "legal.nys.body",
    value:
      "The New York State Human Rights Law protects you from discrimination in the sale, rental, and financing of housing, and in real estate services, because of age, creed (religion), race, color, sex, disability, military status, sexual orientation, national origin, gender identity or expression, citizenship or immigration status, status as a victim of domestic violence, marital status, a sealed conviction or youthful offense, lawful source of income, an arrest record that was favorably resolved, or familial status. It is also illegal to retaliate against anyone who files a complaint or helps someone else exercise these rights.",
    multiline: true,
  },
  {
    key: "legal.nys.report",
    value:
      "If you believe you've experienced housing discrimination, contact the New York State Division of Human Rights at 844-NYS-DHR1 (844-697-3471) or dhr.ny.gov/report. You can also contact HUD.",
    multiline: true,
  },
  { key: "legal.dos.h3", value: "New York State Fair Housing Notice" },
  {
    key: "legal.dos.body",
    value:
      "New York's Department of State requires real estate brokers and salespersons to give consumers its Fair Housing Notice, which explains your rights under state and federal fair housing law and how to file a complaint. The current notice is linked below.",
    multiline: true,
  },
  { key: "legal.dos.link.label", value: "Read the New York State Fair Housing Notice" },
  { key: "legal.sop.h3", value: "Standardized Operating Procedures" },
  {
    key: "legal.sop.body",
    value:
      "New York requires real estate brokerages to adopt standardized operating procedures for working with prospective buyers. These cover things like what identification, pre-approval, or exclusive broker agreement a buyer may be asked for. The brokerage's current procedures are linked below.",
    multiline: true,
  },
  { key: "legal.sop.link.label", value: "View the Brokerage's Standardized Operating Procedures" },
  { key: "legal.broker.h3", value: "Brokerage Disclosure" },
  {
    key: "legal.broker.agent",
    value:
      "Listing agent: Joseph Deleguardia, Licensed Real Estate Salesperson, The Derek Pino Team, RE/MAX Realty Group",
    multiline: true,
  },
  { key: "legal.broker.address", value: "Brokerage office: [BROKERAGE ADDRESS — TO CONFIRM]" },
  { key: "legal.broker.phone", value: "Brokerage phone: [BROKERAGE PHONE — TO CONFIRM]" },
  { key: "legal.broker.license", value: "NY license no.: [LICENSE NO. — TO CONFIRM]" },
  { key: "legal.broker.independent", value: "Each office independently owned and operated." },
  {
    key: "legal.broker.developer",
    value:
      "Belmore Estates is developed by Schram Family Realty, LLC, 45 Radford Way, Rochester, NY 14612. Homes are built by [BUILDER — TO CONFIRM].",
    multiline: true,
  },
  { key: "legal.agency.h3", value: "Who the Listing Agent Represents" },
  {
    key: "legal.agency.body",
    value:
      "New York law requires a written agency disclosure at your first substantive meeting with a real estate agent. It explains whom the agent represents and the choices you have, including hiring your own buyer's agent. [AGENCY DISCLOSURE — TO CONFIRM]",
    multiline: true,
  },
  {
    key: "legal.disclaimer.body",
    value:
      "Plans, pricing, and availability may change at any time. Lot areas come from the approved Section 8 plat, the lot map is a preliminary layout with approximate lot lines and is not a survey, and plan images are placeholders for plans by GLA Architecture. Nothing on this site is an offer to sell or a contract.",
    multiline: true,
  },
  { key: "process.warranty.h3", value: "" },
  { key: "process.warranty.body", value: "", multiline: true },
  { key: "global.footer.fairhousing.url", value: "" },
  { key: "global.footer.sop.url", value: "" },
  // Round 6b: model-plan note on /plans/<model>; empty = hidden.
  { key: "plans.detail.model.note", value: "", multiline: true },
];
