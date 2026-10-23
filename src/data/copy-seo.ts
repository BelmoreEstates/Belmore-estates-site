/**
 * Round 7 SEO / social slots (Quill's /workspace/belmore/seo/seo-pass-1.md).
 * All default to "" so the published site keeps its current wording; Quill's
 * values live in the DRAFT. Empty = fall back (src/lib/seo.ts):
 *   <page>.og.title / .og.description  -> <page>.seo.title / .seo.description
 *   global.og.site_name                -> global.seo.title
 *   global.og.image                    -> /og.jpg (1200x630, public/og.jpg)
 *   global.og.image.alt                -> no og:image:alt
 * `home.sitemodel.canvas.label`: accessible name for the lot map canvas
 * (wired by the map owner; see /workspace/belmore/map-handoff.md).
 */
import type { BlockDef } from "./content";

export const seoBlocks: BlockDef[] = [
  { key: "global.og.site_name", value: "" },
  { key: "global.og.image", value: "", image: true },
  { key: "global.og.image.alt", value: "" },
  { key: "home.og.title", value: "" },
  { key: "home.og.description", value: "", multiline: true },
  { key: "community.og.title", value: "" },
  { key: "community.og.description", value: "", multiline: true },
  { key: "plans.og.title", value: "" },
  { key: "plans.og.description", value: "", multiline: true },
  {
    key: "home.sitemodel.canvas.label",
    value: "Interactive lot map of Phase 1, lots 801–807, traced from the Section 8 plat.",
  },
];
