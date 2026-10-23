/**
 * Keyed-copy runtime. Pages read text by key (`home.hero.h1`) from the root
 * loader (DB overrides merged over src/data/content.ts defaults).
 *
 * - `{{CONTACT_EMAIL}}` renders as a mailto link to the CONTACT_EMAIL env value
 *   (the server injects it into the blocks map under CONTACT_EMAIL_KEY).
 * - `[THING — TO COME | TBD | TO CONFIRM]` renders as a styled placeholder so
 *   unknowns are obvious on the page; the admin lists every one still showing.
 */
import { Fragment, type ReactNode } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { blockDefaults, fill } from "@/data/content";
import { CONTACT_EMAIL_KEY, DEFAULT_CONTACT_EMAIL } from "@/data/site-config";
import { lotAreaLabel, type LotStatus, type PhaseLot, type Plan } from "@/data/site";
import { staticPublicData, type PublicData } from "@/server/public";

const rootApi = getRouteApi("__root__");

export const PLACEHOLDER_RE = /\[[^[\]]*? — (?:TO COME|TBD|TO CONFIRM)\]/g;
const TOKEN_RE = /(\{\{CONTACT_EMAIL\}\}|\[[^[\]]*? — (?:TO COME|TBD|TO CONFIRM)\])/g;

export function useSiteData(): PublicData {
  const data = rootApi.useLoaderData() as PublicData | undefined;
  return data ?? staticPublicData;
}

export type Vars = Record<string, string | number>;

/** The contact address for this deployment (server env, default in site-config). */
export const contactEmailOf = (blocks: Record<string, string>) => blocks[CONTACT_EMAIL_KEY] || DEFAULT_CONTACT_EMAIL;

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
      className="whitespace-nowrap border border-dashed border-copper px-1 text-copper"
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
            <a key={i} href={`mailto:${email}`} className={emailClassName ?? "underline underline-offset-2"}>
              {email}
            </a>
          );
        if (/^\[[^[\]]*? — (?:TO COME|TBD|TO CONFIRM)\]$/.test(part)) return <Placeholder key={i}>{part}</Placeholder>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** `<T k="home.hero.h1" />`: keyed text with placeholders styled. */
export function T({ k, vars, emailClassName }: { k: string; vars?: Vars; emailClassName?: string }) {
  const { blocks } = useSiteData();
  const raw = fill(blocks[k] ?? blockDefaults[k] ?? "", vars ?? {});
  return <RichText text={raw} emailClassName={emailClassName} />;
}

/** Lot status label from global.status.* (never hard-coded). */
export function useLotStatusLabel() {
  const t = useText();
  return (status: LotStatus) => t(`global.status.${status}`);
}

export function LotStatusBadge({ status, className }: { status: LotStatus; className?: string }) {
  const label = useLotStatusLabel()(status);
  const tone =
    status === "available" ? "bg-pine text-cream" : status === "reserved" ? "bg-copper text-cream" : "bg-ink text-cream";
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
    floors: plan.sqftFirst && plan.sqftSecond ? `${plan.sqftFirst} first floor / ${plan.sqftSecond} second` : "",
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

/** <head> meta for a page from `<prefix>.seo.title` / `.seo.description`. */
export function seoHead(prefix: string, vars?: (params: Record<string, string>, data: PublicData) => Vars) {
  return (ctx: { matches: Array<{ routeId: string; loaderData?: unknown }>; params: Record<string, string> }) => {
    const root = ctx.matches.find((m) => m.routeId === "__root__")?.loaderData as PublicData | undefined;
    const data = root ?? staticPublicData;
    const blocks = data.blocks;
    const v = vars ? vars(ctx.params, data) : undefined;
    const title = textOf(blocks, `${prefix}.seo.title`, v);
    const description = textOf(blocks, `${prefix}.seo.description`, v);
    return { meta: [{ title }, { name: "description", content: description }] };
  };
}

/** Keyed template whose placeholder is replaced by `value` once one is set (price, premium). */
export function ValueText({ k, value, vars }: { k: string; value: string | null | undefined; vars?: Vars }) {
  const { blocks } = useSiteData();
  return <RichText text={withValue(fill(blocks[k] ?? blockDefaults[k] ?? "", vars ?? {}), value)} />;
}
