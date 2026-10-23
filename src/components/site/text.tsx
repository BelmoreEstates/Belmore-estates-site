/**
 * Keyed-copy runtime. Pages read text by key (`home.hero.h1`) from the root
 * loader (DB overrides merged over src/data/content.ts defaults).
 *
 * - `{{CONTACT_EMAIL}}` renders as a mailto link to the CONTACT_EMAIL env value
 *   (the server injects it into the blocks map under CONTACT_EMAIL_KEY).
 * - `[THING — TO COME | TBD | TO CONFIRM]`, `[PLACEHOLDER]` and
 *   `[PLACEHOLDER — note]` render as a styled placeholder so
 *   unknowns are obvious on the page; the admin lists every one still showing.
 */
import { Fragment, createContext, useContext, type ComponentType, type ReactNode } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { blockDefaults, fill } from "@/data/content";
import { CONTACT_EMAIL_KEY, DEFAULT_CONTACT_EMAIL } from "@/data/site-config";
import { lotAreaLabel, type LotStatus, type PhaseLot, type Plan } from "@/data/site";
import { staticPublicData, type PublicData } from "@/server/public";
import { absoluteUrl, canonicalPath, seoTags } from "@/lib/seo";
import { siteGraphLd } from "@/lib/jsonld";
import { socialProfiles } from "@/site/social-icons";
import { isAboveFoldImageKey, PHOTO_SIZES, responsiveImage } from "@/lib/images";

const rootApi = getRouteApi("__root__");

export const PLACEHOLDER_RE =
  /\[(?:PLACEHOLDER(?: — [^[\]]*?)?|[^[\]]*? — (?:TO COME|TBD|TO CONFIRM))\]/g;
const TOKEN_RE =
  /(\{\{CONTACT_EMAIL\}\}|\[(?:PLACEHOLDER(?: — [^[\]]*?)?|[^[\]]*? — [^[\]]*?(?:TO COME|TBD|TO CONFIRM|TO FILL)[^[\]]*?)\])/g;

/**
 * The visual editor renders pages from the unsaved draft: it provides the
 * draft's data here (public pages never set it).
 */
export const SiteDataOverride = createContext<PublicData | null>(null);

export function useSiteData(): PublicData {
  const override = useContext(SiteDataOverride);
  const data = rootApi.useLoaderData() as PublicData | undefined;
  return override ?? data ?? staticPublicData;
}

export type Vars = Record<string, string | number>;

/**
 * Edit mode hooks, provided only inside the visual editor (/editor, lazy
 * loaded). With no provider — every visitor — `Tx`, `T` and `Img` render the
 * same plain markup as before the editor existed.
 */
export type EditApi = {
  Text: ComponentType<{ k: string; vars?: Vars; rich?: boolean; emailClassName?: string }>;
  Image: ComponentType<{ srcKey: string; altKey: string; altVars?: Vars; className?: string }>;
  /** A photo stored in a library block's props (`field`, or `field[index]` for lists). */
  BlockImage: ComponentType<{
    blockId: string;
    field: string;
    index?: number;
    src: string;
    alt: string;
    className?: string;
  }>;
};
export const EditContext = createContext<EditApi | null>(null);
export const useEditApi = () => useContext(EditContext);

/** The contact address for this deployment (server env, default in site-config). */
export const contactEmailOf = (blocks: Record<string, string>) =>
  blocks[CONTACT_EMAIL_KEY] || DEFAULT_CONTACT_EMAIL;

/** Plain string (for attributes, <title>, option labels). */
export function textOf(blocks: Record<string, string>, key: string, vars?: Vars): string {
  const raw = blocks[key] ?? blockDefaults[key] ?? "";
  return fill(raw, vars ?? {}).replaceAll("{{CONTACT_EMAIL}}", contactEmailOf(blocks));
}

export function useText() {
  const { blocks } = useSiteData();
  return (key: string, vars?: Vars) => textOf(blocks, key, vars);
}

export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span
      data-placeholder=""
      className="border border-dashed border-copper px-1 text-copper [box-decoration-break:clone] [overflow-wrap:anywhere]"
      title="To come: this detail is not confirmed yet"
    >
      {children}
    </span>
  );
}

/** Render a string with placeholders and the contact email styled. */
export function RichText({ text, emailClassName }: { text: string; emailClassName?: string }) {
  const email = contactEmailOf(useSiteData().blocks);
  const parts = text.split(TOKEN_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "{{CONTACT_EMAIL}}")
          return (
            <a
              key={i}
              href={`mailto:${email}`}
              className={emailClassName ?? "underline underline-offset-2"}
            >
              {email}
            </a>
          );
        if (
          // Also "[DEVELOPER NAME — SHOW OR HIDE? JOSEPH TO CONFIRM]", "[… — JOSEPH TO FILL]".
          /^\[(?:PLACEHOLDER(?: — [^[\]]*?)?|[^[\]]*? — [^[\]]*?(?:TO COME|TBD|TO CONFIRM|TO FILL)[^[\]]*?)\]$/.test(
            part,
          )
        )
          return <Placeholder key={i}>{part}</Placeholder>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** `<T k="home.hero.body" />`: keyed text with placeholders styled. Editable in the editor. */
export function T({
  k,
  vars,
  emailClassName,
}: {
  k: string;
  vars?: Vars;
  emailClassName?: string;
}) {
  const edit = useEditApi();
  const { blocks } = useSiteData();
  if (edit) return <edit.Text k={k} vars={vars} rich emailClassName={emailClassName} />;
  const raw = fill(blocks[k] ?? blockDefaults[k] ?? "", vars ?? {});
  return <RichText text={raw} emailClassName={emailClassName} />;
}

/** `<Tx k="home.hero.h1" />`: keyed text as a plain string (same output as `{t(k)}`). Editable in the editor. */
export function Tx({ k, vars }: { k: string; vars?: Vars }) {
  const edit = useEditApi();
  const { blocks } = useSiteData();
  if (edit) return <edit.Text k={k} vars={vars} />;
  return <>{textOf(blocks, k, vars)}</>;
}

/** A keyed photo (`*.image.src` + alt text key). Click to replace it in the editor. */
export function Img({
  srcKey,
  altKey,
  altVars,
  className,
}: {
  srcKey: string;
  altKey: string;
  altVars?: Vars;
  className?: string;
}) {
  const edit = useEditApi();
  const { blocks } = useSiteData();
  if (edit)
    return <edit.Image srcKey={srcKey} altKey={altKey} altVars={altVars} className={className} />;
  const src = textOf(blocks, srcKey);
  const alt = textOf(blocks, altKey, altVars);
  const eager = isAboveFoldImageKey(srcKey);
  const loading = eager ? "eager" : "lazy";
  const fetchPriority = eager ? "high" : "auto";
  const r = responsiveImage(src);
  if (!r)
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
      />
    );
  // Bundled photo: WebP srcset with the JPG as fallback; width/height reserve
  // the aspect ratio (object-cover classes still size the box).
  return (
    <picture>
      <source type="image/webp" srcSet={r.srcSet} sizes={PHOTO_SIZES} />
      <img
        src={src}
        alt={alt}
        className={className}
        width={r.width}
        height={r.height}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
      />
    </picture>
  );
}

/** Lot status label from global.status.* (never hard-coded). */
export function useLotStatusLabel() {
  const t = useText();
  return (status: LotStatus) => t(`global.status.${status}`);
}

export function LotStatusBadge({ status, className }: { status: LotStatus; className?: string }) {
  const label = useLotStatusLabel()(status);
  const tone =
    status === "available"
      ? "bg-pine text-cream"
      : status === "reserved"
        ? "bg-copper text-cream"
        : "bg-ink text-cream";
  return (
    <span
      data-lot-status={status}
      className={`inline-flex items-center px-2 py-0.5 text-xs uppercase tracking-widest ${tone} ${className ?? ""}`}
    >
      {label}
    </span>
  );
}

/** Token values for lot templates (homes.card.*, homes.detail.*, home.sitemodel.panel.*). */
export function lotVars(lot: PhaseLot): Vars {
  return {
    lot: lot.id,
    street: lot.street,
    area: lotAreaLabel(lot),
    note: lot.note,
  };
}

/** Token values for plan templates (plans.card.*, plans.detail.*). */
export function planVars(plan: Plan): Vars {
  return {
    name: plan.name,
    slug: plan.slug,
    beds: plan.beds,
    baths: plan.baths,
    sqft: plan.sqft.toLocaleString("en-US"),
    stories: plan.stories,
    garage: plan.garage,
    width: plan.width,
    depth: plan.depth,
    plan_no: plan.planNumber,
    // "1,044 first floor / 1,287 second" for two-story plans; empty otherwise
    // (one-story plans, and the Edgewater, whose second figure is an in-law suite).
    floors:
      plan.sqftFirst && plan.sqftSecond
        ? `${plan.sqftFirst} first floor / ${plan.sqftSecond} second`
        : "",
    gla_url: plan.glaUrl,
  };
}

/** A value that is "TBD" (or empty) shows the copy's placeholder template instead. */
export function isTbd(value: string | undefined | null) {
  const v = (value ?? "").trim();
  return v === "" || /^tbd$/i.test(v);
}

/** Replace the first placeholder in a template with a real value when one is set. */
export function withValue(template: string, value: string | undefined | null) {
  if (isTbd(value)) return template;
  const re = /\[[^[\]]*? — (?:TO COME|TBD|TO CONFIRM)\]/;
  return re.test(template) ? template.replace(re, String(value)) : template;
}

/** Site-wide social defaults (og:site_name, share image) from the keyed texts. */
export function socialDefaults(blocks: Record<string, string>) {
  return {
    siteName: textOf(blocks, "global.og.site_name").trim() || textOf(blocks, "global.seo.title"),
    image: textOf(blocks, "global.og.image").trim(),
    imageAlt: textOf(blocks, "global.og.image.alt").trim(),
  };
}

type HeadCtx = {
  matches: Array<{ routeId: string; pathname?: string; loaderData?: unknown }>;
  params: Record<string, string>;
};

/** The URL path of the deepest matched route (for canonical / og:url). */
export const headPath = (ctx: HeadCtx) => ctx.matches[ctx.matches.length - 1]?.pathname ?? "/";

/**
 * <head> tags for a page from `<prefix>.seo.title` / `.seo.description`
 * (+ `<prefix>.og.*` when set): canonical, Open Graph, Twitter card and
 * optional JSON-LD. See src/lib/seo.ts.
 */
export function seoHead(
  prefix: string,
  vars?: (params: Record<string, string>, data: PublicData) => Vars,
  jsonLd?: (params: Record<string, string>, data: PublicData, url: string) => unknown[],
) {
  return (ctx: HeadCtx) => {
    const root = ctx.matches.find((m) => m.routeId === "__root__")?.loaderData as
      PublicData | undefined;
    const data = root ?? staticPublicData;
    const blocks = data.blocks;
    const v = vars ? vars(ctx.params, data) : undefined;
    const path = canonicalPath(headPath(ctx));
    const tags = seoTags({
      title: textOf(blocks, `${prefix}.seo.title`, v),
      description: textOf(blocks, `${prefix}.seo.description`, v),
      ogTitle: textOf(blocks, `${prefix}.og.title`, v),
      ogDescription: textOf(blocks, `${prefix}.og.description`, v),
      ...socialDefaults(blocks),
      path,
      // Sitewide entity graph on every page, then the page's own markup.
      jsonLd: [
        siteGraphLd({ siteName: socialDefaults(blocks).siteName, sameAs: socialProfiles(blocks) }),
        ...(jsonLd ? jsonLd(ctx.params, data, absoluteUrl(path)) : []),
      ],
    });
    // Preload the page's hero photo (the LCP element) when it has one.
    const heroKey = `${prefix}.hero.image.src`;
    const hero = heroKey in blockDefaults ? responsiveImage(textOf(blocks, heroKey)) : null;
    if (hero)
      tags.links.push({
        rel: "preload",
        as: "image",
        type: "image/webp",
        imageSrcSet: hero.srcSet,
        imageSizes: PHOTO_SIZES,
        fetchPriority: "high",
      } as (typeof tags.links)[number]);
    return tags;
  };
}

/** Keyed template whose placeholder is replaced by `value` once one is set (price, premium). */
export function ValueText({
  k,
  value,
  vars,
}: {
  k: string;
  value: string | null | undefined;
  vars?: Vars;
}) {
  const { blocks } = useSiteData();
  return (
    <RichText text={withValue(fill(blocks[k] ?? blockDefaults[k] ?? "", vars ?? {}), value)} />
  );
}
