/**
 * The site document: everything the visual editor (/editor) can change.
 * Stored in Neon `site_docs` (draft + published, migrations/0008) and shared
 * by the server (validation, loaders) and the client (renderer, editor).
 *
 *   texts — overrides of the keyed copy (src/data/content.ts). Missing key =
 *           the original copy. Used by the original, designed sections.
 *   pages — per page: its section list (Puck data shape: {type, props}).
 *           Missing system page = its original layout (SYSTEM_PAGES below).
 *   nav   — the menu. null = the original menu.
 *   theme — colors / fonts / buttons / logo. Missing value = original design.
 *
 * So an empty doc renders the site exactly as designed. Pure module: no
 * server or editor imports.
 */
import { blockDefaults } from "@/data/content";
import { nav as defaultNavLinks } from "@/data/site";

/** JSON value stored in a block prop. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type Block = { type: string; props: { id: string; [key: string]: Json } };

export type PageDoc = {
  /** Name shown in the editor's page list. */
  title: string;
  /** Section list, top to bottom. */
  content: Block[];
  /** Custom pages only: search title / description (system pages use `<prefix>.seo.*` texts). */
  seoTitle?: string;
  seoDescription?: string;
  /** Custom pages only: true = page exists but visitors get "page not found". */
  draftOnly?: boolean;
};

export type NavItem = {
  id: string;
  /** Internal path ("/community") or a full https:// URL for external links. */
  href: string;
  /** Label text. System items keep theirs in texts[labelKey] (shared with the footer). */
  label?: string;
  labelKey?: string;
  hidden?: boolean;
  external?: boolean;
};

export type ColorRole =
  "paper" | "paper-deep" | "cream" | "ink" | "muted" | "pine" | "pine-deep" | "copper" | "line";

export type Theme = {
  colors?: Partial<Record<ColorRole, string>>;
  fonts?: { display?: string; body?: string };
  buttons?: { shape?: "square" | "soft" | "pill" };
  spacing?: "compact" | "normal" | "roomy";
  logo?: { mode?: "text" | "image"; src?: string; alt?: string; height?: number };
};

export type SiteDoc = {
  v: 1;
  texts: Record<string, string>;
  pages: Record<string, PageDoc>;
  nav: NavItem[] | null;
  theme: Theme;
};

/* ------------------------------------------------------------------ pages */

export type SystemPage = {
  slug: string;
  title: string;
  /** URL path for the editor's "view page" / preview links. */
  path: string;
  /** `<prefix>.seo.title` / `.seo.description` text keys. */
  seoPrefix: string;
  /** Original section types, in order. */
  sections: string[];
  /** Data-driven template (one page per plan / lot). */
  template?: "plan" | "lot";
};

export const SYSTEM_PAGES: SystemPage[] = [
  {
    slug: "home",
    title: "Home",
    path: "/",
    seoPrefix: "home",
    sections: [
      "HomeHero",
      "HomeOffer",
      "HomePlans",
      "HomeSiteModel",
      "HomePhase1",
      "HomeStudio",
      "HomeProcess",
    ],
  },
  {
    slug: "community",
    title: "Community",
    path: "/community",
    seoPrefix: "community",
    sections: ["CommunityIntro", "CommunityPlat", "CommunityModel", "CommunityGround"],
  },
  {
    slug: "plans",
    title: "Floor Plans",
    path: "/plans",
    seoPrefix: "plans",
    sections: [
      "PlansIntro",
      "PlansModel",
      "PlansCollection",
      "PlansHow",
      "PlansCustomize",
      "PlansAgent",
    ],
  },
  {
    slug: "homes",
    title: "Phase 1 Lots",
    path: "/homes",
    seoPrefix: "homes",
    sections: ["HomesLots"],
  },
  {
    slug: "design-studio",
    title: "Design Studio",
    path: "/design-studio",
    seoPrefix: "design-studio",
    sections: ["StudioIntro", "StudioSteps", "StudioPicks", "StudioCta"],
  },
  {
    slug: "process",
    title: "Our Process",
    path: "/process",
    seoPrefix: "process",
    sections: ["ProcessIntro", "ProcessSteps", "ProcessCta"],
  },
  {
    slug: "about",
    title: "About",
    path: "/about",
    seoPrefix: "about",
    sections: ["AboutIntro", "AboutStory", "AboutTeam"],
  },
  { slug: "faq", title: "FAQ", path: "/faq", seoPrefix: "faq", sections: ["FaqList"] },
  {
    slug: "privacy",
    title: "Privacy",
    path: "/privacy",
    seoPrefix: "privacy",
    sections: ["PrivacyPolicy"],
  },
  {
    slug: "contact",
    title: "Contact",
    path: "/contact",
    seoPrefix: "contact",
    sections: ["ContactMain"],
  },
  {
    slug: "_plan",
    title: "Floor plan page (every plan)",
    path: "/plans/$slug",
    seoPrefix: "plans.detail",
    sections: ["PlanDetailHero", "PlanDetailGallery", "PlanDetailForm", "PlanDetailOthers"],
    template: "plan",
  },
  {
    slug: "_lot",
    title: "Lot page (every lot)",
    path: "/homes/$slug",
    seoPrefix: "homes.detail",
    sections: ["LotDetailHero", "LotDetailForm"],
    template: "lot",
  },
];

export const systemPageBySlug: Record<string, SystemPage> = Object.fromEntries(
  SYSTEM_PAGES.map((p) => [p.slug, p]),
);

/** Slugs a custom page may not use (existing routes, files and system paths). */
export const RESERVED_SLUGS = new Set([
  ...SYSTEM_PAGES.map((p) => p.slug),
  "admin",
  "login",
  "editor",
  "api",
  "media",
  "images",
  "assets",
  "plans",
  "homes",
  "robots.txt",
  "sitemap.xml",
  "favicon.svg",
  "og.jpg",
  "index",
  "p",
]);

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidCustomSlug(slug: string) {
  return SLUG_RE.test(slug) && slug.length <= 60 && !RESERVED_SLUGS.has(slug);
}

/** Stable id for an original section in its default layout. */
export const originalId = (type: string) => `orig-${type}`;

export function defaultPage(slug: string): PageDoc | null {
  const sys = systemPageBySlug[slug];
  if (!sys) return null;
  return {
    title: sys.title,
    content: sys.sections.map((type) => ({ type, props: { id: originalId(type) } })),
  };
}

/** Editor page slug for a URL path ("/plans/stanton" → "_plan", "/open-house" → "open-house"). */
export function pageSlugForPath(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "home";
  const parts = path.slice(1).split("/");
  if (parts.length === 2 && parts[0] === "plans") return "_plan";
  if (parts.length === 2 && parts[0] === "homes") return "_lot";
  if (parts.length !== 1) return null;
  const [first] = parts;
  if (systemPageBySlug[first] && !first.startsWith("_")) return first;
  if (SLUG_RE.test(first) && !RESERVED_SLUGS.has(first)) return first;
  return null;
}

export function pagePath(slug: string) {
  const sys = systemPageBySlug[slug];
  return sys ? sys.path : `/${slug}`;
}

/* -------------------------------------------------------------------- nav */

const menuKey = (to: string) => `global.menu.${to.replace(/^\//, "")}`;

export function defaultNav(): NavItem[] {
  return defaultNavLinks.map((item) => ({
    id: `nav-${item.to.slice(1)}`,
    href: item.to,
    labelKey: menuKey(item.to),
  }));
}

/* ----------------------------------------------------------------- theme */

export const COLOR_ROLES: { role: ColorRole; label: string; help: string }[] = [
  { role: "paper", label: "Page background", help: "Behind most sections" },
  { role: "cream", label: "Card background", help: "Cards and light bands" },
  { role: "paper-deep", label: "Soft background", help: "Light text on dark bands" },
  { role: "ink", label: "Text", help: "Headings and body text" },
  { role: "muted", label: "Soft text", help: "Small print and descriptions" },
  { role: "pine", label: "Main color", help: "Buttons and dark bands" },
  { role: "pine-deep", label: "Main color (dark)", help: "Footer, top banner, button hover" },
  { role: "copper", label: "Accent", help: "Small labels and numbers" },
  { role: "line", label: "Lines", help: "Borders and dividers" },
];

/** The original Belmore palette (src/styles.css @theme). */
export const BELMORE_COLORS: Record<ColorRole, string> = {
  paper: "#f3efe6",
  "paper-deep": "#e6dfd1",
  cream: "#faf7f2",
  ink: "#1a2420",
  muted: "#5c655e",
  pine: "#243f34",
  "pine-deep": "#162820",
  copper: "#a5683c",
  line: "#d8d0c2",
};

export const COLOR_PRESETS: { id: string; label: string; colors: Record<ColorRole, string> }[] = [
  { id: "belmore", label: "Belmore original", colors: BELMORE_COLORS },
  {
    id: "lakeside",
    label: "Lakeside blue",
    colors: {
      paper: "#f2f1ec",
      "paper-deep": "#dfe3e4",
      cream: "#fafaf7",
      ink: "#1b2330",
      muted: "#5a6472",
      pine: "#26405a",
      "pine-deep": "#172a3d",
      copper: "#a5683c",
      line: "#d5d6d2",
    },
  },
  {
    id: "brick",
    label: "Brick & stone",
    colors: {
      paper: "#f4efe8",
      "paper-deep": "#e8ddd2",
      cream: "#fbf8f4",
      ink: "#2a201c",
      muted: "#6a5f58",
      pine: "#7a3b2e",
      "pine-deep": "#4e241b",
      copper: "#9a7a3c",
      line: "#dccfc2",
    },
  },
  {
    id: "meadow",
    label: "Meadow green",
    colors: {
      paper: "#f3f2ea",
      "paper-deep": "#e2e4d4",
      cream: "#fafaf4",
      ink: "#1f2a1f",
      muted: "#5f6a5c",
      pine: "#3d5a3a",
      "pine-deep": "#263b25",
      copper: "#b07a3a",
      line: "#d7d6c6",
    },
  },
];

/** Curated swatches offered for every color (plus each preset's own colors). */
export const SWATCHES = [
  "#ffffff",
  "#faf7f2",
  "#f3efe6",
  "#e6dfd1",
  "#d8d0c2",
  "#5c655e",
  "#1a2420",
  "#000000",
  "#243f34",
  "#162820",
  "#3d5a3a",
  "#26405a",
  "#172a3d",
  "#7a3b2e",
  "#4e241b",
  "#a5683c",
  "#b07a3a",
  "#9a7a3c",
  "#c8a96a",
  "#8c8f86",
];

export type FontChoice = {
  id: string;
  label: string;
  family: string;
  query: string;
  kind: "display" | "body" | "both";
};

/** Curated Google Fonts. The first two are the original design. */
export const FONTS: FontChoice[] = [
  {
    id: "Fraunces",
    label: "Fraunces (original headings)",
    family: '"Fraunces", Georgia, serif',
    query: "Fraunces:opsz,wght@9..144,500;9..144,620",
    kind: "display",
  },
  {
    id: "Outfit",
    label: "Outfit (original text)",
    family: '"Outfit", system-ui, sans-serif',
    query: "Outfit:wght@400;500;600",
    kind: "both",
  },
  {
    id: "Playfair Display",
    label: "Playfair Display",
    family: '"Playfair Display", Georgia, serif',
    query: "Playfair+Display:wght@500;600",
    kind: "display",
  },
  {
    id: "Cormorant Garamond",
    label: "Cormorant Garamond",
    family: '"Cormorant Garamond", Georgia, serif',
    query: "Cormorant+Garamond:wght@500;600",
    kind: "display",
  },
  {
    id: "Libre Baskerville",
    label: "Libre Baskerville",
    family: '"Libre Baskerville", Georgia, serif',
    query: "Libre+Baskerville:wght@400;700",
    kind: "display",
  },
  {
    id: "DM Serif Display",
    label: "DM Serif Display",
    family: '"DM Serif Display", Georgia, serif',
    query: "DM+Serif+Display",
    kind: "display",
  },
  {
    id: "Lora",
    label: "Lora",
    family: '"Lora", Georgia, serif',
    query: "Lora:wght@400;500;600",
    kind: "both",
  },
  {
    id: "Inter",
    label: "Inter",
    family: '"Inter", system-ui, sans-serif',
    query: "Inter:wght@400;500;600",
    kind: "both",
  },
  {
    id: "Work Sans",
    label: "Work Sans",
    family: '"Work Sans", system-ui, sans-serif',
    query: "Work+Sans:wght@400;500;600",
    kind: "both",
  },
  {
    id: "Source Sans 3",
    label: "Source Sans 3",
    family: '"Source Sans 3", system-ui, sans-serif',
    query: "Source+Sans+3:wght@400;500;600",
    kind: "body",
  },
  {
    id: "Nunito Sans",
    label: "Nunito Sans",
    family: '"Nunito Sans", system-ui, sans-serif',
    query: "Nunito+Sans:wght@400;600",
    kind: "body",
  },
  {
    id: "Lato",
    label: "Lato",
    family: '"Lato", system-ui, sans-serif',
    query: "Lato:wght@400;700",
    kind: "body",
  },
];
export const fontById: Record<string, FontChoice> = Object.fromEntries(FONTS.map((f) => [f.id, f]));
export const DEFAULT_FONTS = { display: "Fraunces", body: "Outfit" } as const;
/** The original <link> (src/routes/__root.tsx). */
export const ORIGINAL_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,620&family=Outfit:wght@400;500;600&display=swap";

const BUTTON_RADIUS = { square: "0", soft: "6px", pill: "999px" } as const;
const SPACING = { compact: "2.5rem", normal: "4rem", roomy: "6rem" } as const;
export const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Google Fonts stylesheet for the theme's fonts (the original link when unchanged). */
export function themeFontHref(theme: Theme): string {
  const display = fontById[theme.fonts?.display ?? ""] ?? fontById[DEFAULT_FONTS.display];
  const body = fontById[theme.fonts?.body ?? ""] ?? fontById[DEFAULT_FONTS.body];
  if (display.id === DEFAULT_FONTS.display && body.id === DEFAULT_FONTS.body)
    return ORIGINAL_FONT_HREF;
  const families = [...new Set([display.query, body.query])].map((q) => `family=${q}`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * CSS overriding the design tokens for a theme, or "" when it matches the
 * original (so the original site's HTML is unchanged). Every value is from a
 * fixed list or a validated #rrggbb, so nothing user-typed reaches the CSS.
 */
export function themeCss(theme: Theme): string {
  const vars: string[] = [];
  for (const { role } of COLOR_ROLES) {
    const value = theme.colors?.[role];
    if (value && HEX_RE.test(value) && value.toLowerCase() !== BELMORE_COLORS[role])
      vars.push(`--color-${role}:${value.toLowerCase()}`);
  }
  const display = fontById[theme.fonts?.display ?? ""];
  if (display && display.id !== DEFAULT_FONTS.display)
    vars.push(`--font-display:${display.family}`);
  const body = fontById[theme.fonts?.body ?? ""];
  if (body && body.id !== DEFAULT_FONTS.body) vars.push(`--font-sans:${body.family}`);
  const spacing = theme.spacing && theme.spacing !== "normal" ? SPACING[theme.spacing] : null;
  if (spacing) vars.push(`--section-pad:${spacing}`);
  const shape = theme.buttons?.shape;
  const radius = shape && shape !== "square" ? BUTTON_RADIUS[shape] : null;
  let css = vars.length ? `:root{${vars.join(";")}}` : "";
  // Buttons are the 44px-tall links/buttons (min-h-11) that have a fill or a border.
  if (radius)
    css += `:is(a,button).min-h-11:is([class*="bg-"],[class*="border"]){border-radius:${radius}}`;
  return css;
}

/* ------------------------------------------------------------- normalize */

export function emptyDoc(): SiteDoc {
  return { v: 1, texts: {}, pages: {}, nav: null, theme: {} };
}

/** Fill in defaults so every system page, the menu and theme are present. */
export function normalizeDoc(raw: unknown): SiteDoc {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<SiteDoc>;
  const pages: Record<string, PageDoc> = {};
  for (const sys of SYSTEM_PAGES)
    pages[sys.slug] = d.pages?.[sys.slug] ?? (defaultPage(sys.slug) as PageDoc);
  for (const [slug, page] of Object.entries(d.pages ?? {})) if (!pages[slug]) pages[slug] = page;
  return {
    v: 1,
    texts: d.texts && typeof d.texts === "object" ? d.texts : {},
    pages,
    nav: Array.isArray(d.nav) ? d.nav : null,
    theme: d.theme && typeof d.theme === "object" ? d.theme : {},
  };
}

/** Sorted-key JSON, for "is this the same?" checks. */
export function stableJson(value: unknown): string {
  const norm = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(norm)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v as object)
              .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
              .sort()
              .map((k) => [k, norm((v as Record<string, unknown>)[k])]),
          )
        : v;
  return JSON.stringify(norm(value));
}

/**
 * Smallest equivalent doc: drops anything equal to the original design
 * (system pages with their original layout, the original menu, texts equal to
 * the original copy, empty theme parts). Saved docs are compacted, so "no
 * changes" really means equal to the original and content keeps following
 * src/data/content.ts wherever it was never edited.
 */
export function compactDoc(doc: SiteDoc): SiteDoc {
  const texts: Record<string, string> = {};
  for (const [k, v] of Object.entries(doc.texts ?? {})) if (blockDefaults[k] !== v) texts[k] = v;
  const pages: Record<string, PageDoc> = {};
  for (const [slug, page] of Object.entries(doc.pages ?? {})) {
    const def = defaultPage(slug);
    if (def && stableJson(def) === stableJson({ title: page.title, content: page.content }))
      continue;
    pages[slug] = page;
  }
  const nav = doc.nav && stableJson(doc.nav) !== stableJson(defaultNav()) ? doc.nav : null;
  const theme: Theme = {};
  for (const [k, v] of Object.entries(doc.theme ?? {}) as [keyof Theme, unknown][]) {
    if (v === undefined || v === null) continue;
    if (typeof v === "object" && !Object.values(v as object).some((x) => x !== undefined)) continue;
    (theme as Record<string, unknown>)[k] = v;
  }
  return { v: 1, texts, pages, nav, theme };
}

/** The menu for a doc (the original menu when not customized). */
export const navOf = (doc: Pick<SiteDoc, "nav">): NavItem[] => doc.nav ?? defaultNav();

export const isExternalHref = (href: string) => /^https?:\/\//i.test(href);

/* ------------------------------------------------------------ block types */

/** Library blocks (src/site/blocks.tsx): addable to any page, any number of times. */
export const LIBRARY_TYPES = [
  "Hero",
  "TextImage",
  "Gallery",
  "PlanCards",
  "LotList",
  "CtaBanner",
  "Faq",
  "Testimonials",
  "LeadForm",
  "MapEmbed",
  "Video",
  "Spacer",
  "RichTextBlock",
] as const;
export type LibraryType = (typeof LIBRARY_TYPES)[number];

/** Original section type → the page it belongs to. */
export const ORIGINAL_PAGE: Record<string, string> = Object.fromEntries(
  SYSTEM_PAGES.flatMap((p) => p.sections.map((type) => [type, p.slug])),
);

export const isLibraryType = (type: string): type is LibraryType =>
  (LIBRARY_TYPES as readonly string[]).includes(type);

/** Links in blocks: site paths, anchors, https/http, mailto, tel. Anything else → "#". */
export function safeHref(href: unknown): string {
  const h = typeof href === "string" ? href.trim() : "";
  if (/^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(h)) return h;
  return "#";
}

/** Images in blocks: site paths (/images, /media) or https URLs. */
export function safeImageSrc(src: unknown): string {
  const s = typeof src === "string" ? src.trim() : "";
  if (/^(\/(?!\/)|https:\/\/)/i.test(s)) return s;
  return "";
}
