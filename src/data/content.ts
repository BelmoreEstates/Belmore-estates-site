/**
 * Keyed site text. Page copy comes from Quill's markdown
 * (/workspace/belmore/copy/*.md → `node scripts/import-copy.mjs` →
 * copy.generated.ts) under stable dotted keys like `home.hero.h1`, with
 * `<page>.seo.title` / `<page>.seo.description` per page.
 *
 * `extraBlocks` adds the few slots the copy does not cover (image URLs, the
 * featured-plan list, admin/login/404 text). The DB table `content_blocks`
 * stores overrides under the same keys; a DB row wins, a missing key falls back
 * to the default here. Never rename a key once published.
 *
 * Placeholders look like `[THING — TO COME | TBD | TO CONFIRM]` and are
 * rendered with a styled marker (src/components/site/text.tsx).
 * `{{CONTACT_EMAIL}}` is swapped for CONTACT_EMAIL (env; default in site-config.ts) at render.
 */
import { copyDefaults } from "./copy.generated";
import { round6Blocks } from "./copy-round6";
import { seoBlocks } from "./copy-seo";
import { round7Blocks } from "./copy-round7";

export type BlockDef = {
  key: string;
  value: string;
  /** Rendered as a textarea in /admin. */
  multiline?: boolean;
  /** An image URL slot (Photos tab in /admin). */
  image?: boolean;
  /** Not from the copy files (added by the build). */
  extra?: boolean;
};

const extraBlocks: BlockDef[] = [
  { key: "global.seo.title", value: "Belmore Estates" },
  {
    key: "global.seo.description",
    value: copyDefaults["home.seo.description"] ?? "Belmore Estates, North Greece, NY.",
  },
  { key: "global.notfound.eyebrow", value: "Missing page" },
  { key: "global.notfound.h1", value: "That page isn’t here." },
  {
    key: "global.notfound.body",
    value: "The address doesn’t match a page on the Belmore Estates site.",
  },
  { key: "global.notfound.button", value: "Back to Belmore Estates" },
  { key: "home.hero.image.src", value: "/images/hero.jpg", image: true },
  { key: "home.studio.image.src", value: "/images/studio.jpg", image: true },
  { key: "community.hero.image.src", value: "/images/street.jpg", image: true },
  { key: "homes.detail.image.src", value: "/images/street.jpg", image: true },
  { key: "design-studio.hero.image.src", value: "/images/kitchen.jpg", image: true },
  { key: "design-studio.image.src", value: "/images/studio.jpg", image: true },
  { key: "process.hero.image.src", value: "/images/porch.jpg", image: true },
  { key: "about.hero.image.src", value: "/images/living.jpg", image: true },
  // Future section card on /lots (admin "Future section" tab).
  { key: "homes.future.eyebrow", value: "Future section" },
  { key: "homes.future.title", value: "17 lots east of Shelby Circle" },
  {
    key: "homes.future.status",
    value: copyDefaults["global.status.future"] ?? "Future — Join waitlist",
  },
  { key: "homes.future.body", value: copyDefaults["forms.waitlist.intro"] ?? "" },
  { key: "homes.future.open", value: "yes" },
  // Form fields the copy does not label.
  { key: "forms.shared.agent.name.label", value: "Agent name" },
  { key: "forms.shared.agent.brokerage.label", value: "Brokerage · optional" },
  { key: "forms.shared.type.label", value: "What would you like to do?" },
  // Accuracy addendum for the privacy page (the copy does not mention the IP hash).
  {
    key: "privacy.s8.body2",
    value:
      "To stop spam, the site keeps a one-way, salted hash of your IP address (not the address itself) for up to one day, and a form that is filled in too fast or contains a hidden spam field is discarded.",
    multiline: true,
  },
  // Social links in the top bar and footer (round 6). Empty = icon hidden.
  // Must be an https:// URL (checked by validateDoc). Edited in the editor's
  // "Social & footer" panel or the /admin "Social & legal" tab.
  { key: "global.social.facebook", value: "" },
  { key: "global.social.instagram", value: "" },
  { key: "global.social.youtube", value: "" },
  { key: "global.social.linkedin", value: "" },
  { key: "global.social.tiktok", value: "" },
  { key: "global.social.x", value: "" },
  // Round 6 footer legal row, /legal page, homepage Fair Housing line. Hidden
  // from visitors until `global.legal.enabled` is "on" (set in the draft;
  // goes live on Publish). Quill's v2 keys are in copy-round6.ts.
  { key: "global.legal.enabled", value: "" },
  ...round6Blocks,
  ...seoBlocks,
  ...round7Blocks,
  // Lot map (src/components/map). Approved by Forge; defaults match the shipped strings.
  { key: "map.future.label", value: "Future phase (planned, details TBD)" },
  { key: "map.future.note", value: "planned along Shelby Circle and beyond, details TBD" },
  {
    key: "map.disclaimer",
    value:
      "Preliminary layout, subject to change; lot lines approximate. Aerial imagery is from 2023, before construction.",
    multiline: true,
  },
  { key: "map.control.fit", value: "Fit to Belmore Estates" },
  { key: "map.control.area", value: "Show North Greece" },
  { key: "map.control.aerial", value: "Aerial" },
  { key: "map.control.street", value: "Map" },
  { key: "map.control.future", value: "Future phase" },
  { key: "map.loading", value: "Loading map" },
  { key: "map.list.heading", value: "All lots" },
  { key: "login.h1", value: "Owner sign-in" },
  {
    key: "login.body",
    value: "Sign-in is only for Belmore Estates administrators. Visitors never need an account.",
  },
];

export const blockDefs: BlockDef[] = [
  ...Object.entries(copyDefaults).map(([key, value]) => ({
    key,
    value,
    multiline: value.length > 90,
  })),
  ...extraBlocks.filter((d) => !(d.key in copyDefaults)).map((d) => ({ ...d, extra: true })),
];

export const blockDefaults: Record<string, string> = Object.fromEntries(
  blockDefs.map((def) => [def.key, def.value]),
);

export const blockDefByKey: Record<string, BlockDef> = Object.fromEntries(
  blockDefs.map((def) => [def.key, def]),
);

/** Replace `{name}` tokens (single braces). `{{CONTACT_EMAIL}}` is left for the renderer. */
export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/(?<!\{)\{(\w+)\}(?!\})/g, (all, k: string) =>
    k in vars ? String(vars[k]) : all,
  );
}

/** Numbered items like `faq.q1.question`, `faq.q2.question`, … */
export function numbered<F extends string>(
  blocks: Record<string, string>,
  make: (n: number) => Record<F, string>,
  max = 50,
): Record<F, string>[] {
  const out: Record<F, string>[] = [];
  for (let n = 1; n <= max; n++) {
    const keys = make(n);
    const first = Object.values(keys)[0] as string;
    if (blocks[first] === undefined) break;
    const item = {} as Record<F, string>;
    for (const [f, k] of Object.entries(keys) as [F, string][]) item[f] = blocks[k] ?? "";
    // Blanking the first field in /admin hides the item.
    if ((Object.values(item)[0] as string).trim()) out.push(item);
  }
  return out;
}
