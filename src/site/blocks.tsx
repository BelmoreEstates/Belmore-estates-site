/**
 * Library blocks: sections the owner can add from the editor's block library,
 * any number of times, on any page. These components are PUBLIC code (they
 * render visitor pages from the published JSON); the editor-only bits (Puck
 * field definitions) live in src/editor/. Text props arrive as plain strings
 * on public pages and as inline-editable React nodes inside the editor.
 */
import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { buttonStyles } from "@/components/site/chrome";
import { InquiryForm } from "@/components/site/inquiry-form";
import { GlaLink, PlanImage } from "@/components/site/plan-image";
import { SiteModel } from "@/components/site/site-model";
import {
  LotStatusBadge,
  Placeholder,
  RichText,
  Tx,
  planVars,
  useEditApi,
  useSiteData,
  useText,
} from "@/components/site/text";
import { lotAreaLabel, modelPlan, showcasePlans } from "@/data/site";
import { GLA_PLANS_URL } from "@/data/site-config";
import { cn } from "@/lib/cn";
import { safeHref, safeImageSrc, type LibraryType } from "./doc";

export type Txt = ReactNode | string | undefined;
export type Pic = { src?: string; alt?: string };
export type Btn = { label?: Txt; href?: string };

/** Section look shared by every block (library and original). */
export type SectionStyle = {
  hidden?: boolean;
  bg?: "default" | "paper" | "cream" | "deep" | "pine" | "image";
  bgImage?: Pic;
  padTop?: "none" | "s" | "m" | "l";
  padBottom?: "none" | "s" | "m" | "l";
  anchor?: string;
};

const filled = (v: Txt) => v !== undefined && v !== null && v !== "";

/** Text prop: placeholders ("[… — TO COME]") stay marked on public pages. */
function Show({ v }: { v: Txt }) {
  return typeof v === "string" ? <RichText text={v} /> : <>{v}</>;
}

/** Plain-text label (buttons, captions) — same as Show. */
const Label = Show;

const BG: Record<string, string> = {
  default: "",
  paper: "bg-paper text-ink",
  cream: "bg-cream text-ink",
  deep: "bg-paper-deep text-ink",
  pine: "bg-pine-deep text-cream",
  image: "bg-ink text-cream",
};
const PAD = { none: "0", s: "0.5", m: "1", l: "1.5" } as const;

export const anchorId = (a: unknown) =>
  typeof a === "string" && /^[a-z0-9-]{1,40}$/.test(a) ? a : undefined;

/** Background / spacing / anchor wrapper (only adds markup when needed). */
export function Frame({
  style,
  library,
  children,
  className,
}: {
  style: SectionStyle;
  library?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const bg = style.bg ?? "default";
  const id = anchorId(style.anchor);
  const img = bg === "image" ? safeImageSrc(style.bgImage?.src) : "";
  if (!library && bg === "default" && !id) return <>{children}</>;
  const pad = (v: SectionStyle["padTop"]) => `calc(var(--section-pad, 4rem) * ${PAD[v ?? "m"]})`;
  const css: CSSProperties = library
    ? { paddingTop: pad(style.padTop), paddingBottom: pad(style.padBottom) }
    : {};
  if (img) {
    css.backgroundImage = `linear-gradient(rgba(20,28,24,.55),rgba(20,28,24,.55)),url("${img.replace(/["\\]/g, "")}")`;
    css.backgroundSize = "cover";
    css.backgroundPosition = "center";
  }
  return (
    <section
      id={id}
      className={cn(library && "border-b border-line", BG[bg], className)}
      style={css}
      data-block
    >
      {children}
    </section>
  );
}

function Button({
  b,
  kind = "primary",
  onDark,
}: {
  b?: Btn;
  kind?: "primary" | "quiet";
  onDark?: boolean;
}) {
  if (!b || !filled(b.label)) return null;
  const href = safeHref(b.href);
  const external = /^https?:\/\//i.test(href);
  const cls =
    onDark && kind === "quiet"
      ? "inline-flex min-h-11 items-center justify-center border border-cream px-5 text-sm text-cream"
      : onDark
        ? "inline-flex min-h-11 items-center justify-center border border-cream bg-cream px-5 text-sm text-ink"
        : buttonStyles(kind);
  return (
    <a
      href={href}
      className={cls}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      <Label v={b.label} />
    </a>
  );
}

function Photo({
  id,
  field,
  index,
  pic,
  className,
}: {
  id: string;
  field: string;
  index?: number;
  pic?: Pic;
  className?: string;
}) {
  const edit = useEditApi();
  const src = safeImageSrc(pic?.src);
  if (edit)
    return (
      <edit.BlockImage
        blockId={id}
        field={field}
        index={index}
        src={src}
        alt={pic?.alt ?? ""}
        className={className}
      />
    );
  if (!src) return null;
  return <img src={src} alt={pic?.alt ?? ""} className={className} loading="lazy" />;
}

function EditorHint({ children }: { children: ReactNode }) {
  const edit = useEditApi();
  if (!edit) return null;
  return (
    <p className="border border-dashed border-copper px-4 py-6 text-center text-sm text-copper">
      {children}
    </p>
  );
}

function Head({
  eyebrow,
  heading,
  intro,
  dark,
}: {
  eyebrow?: Txt;
  heading?: Txt;
  intro?: Txt;
  dark?: boolean;
}) {
  return (
    <>
      {filled(eyebrow) ? (
        <p className="text-xs uppercase tracking-widest text-copper">
          <Show v={eyebrow} />
        </p>
      ) : null}
      {filled(heading) ? (
        <h2 className="mt-3 text-4xl">
          <Show v={heading} />
        </h2>
      ) : null}
      {filled(intro) ? (
        <p className={cn("mt-3 max-w-2xl", dark ? "text-paper-deep" : "text-muted")}>
          <Show v={intro} />
        </p>
      ) : null}
    </>
  );
}

const dark = (s: SectionStyle) => s.bg === "pine" || s.bg === "image";

/* ------------------------------------------------------------------ Hero */
export type HeroProps = SectionStyle & {
  id: string;
  eyebrow?: Txt;
  heading?: Txt;
  body?: Txt;
  image?: Pic;
  button1?: Btn;
  button2?: Btn;
  layout?: "split" | "stacked";
};
export function Hero(p: HeroProps) {
  const onDark = dark(p);
  return (
    <Frame style={{ ...p, padTop: p.padTop ?? "none", padBottom: p.padBottom ?? "none" }} library>
      <div className={cn("grid", p.layout !== "stacked" && "lg:grid-cols-12")}>
        <div
          className={cn(
            "flex flex-col justify-end px-5 py-12 sm:px-8 lg:py-20",
            p.layout !== "stacked" && "lg:col-span-5",
          )}
        >
          <Head eyebrow={p.eyebrow} />
          {filled(p.heading) ? (
            <h1 className="mt-4 text-5xl leading-tight">
              <Show v={p.heading} />
            </h1>
          ) : null}
          {filled(p.body) ? (
            <p
              className={cn(
                "mt-5 max-w-md text-lg leading-relaxed",
                onDark ? "text-paper-deep" : "text-muted",
              )}
            >
              <Show v={p.body} />
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button b={p.button1} onDark={onDark} />
            <Button b={p.button2} kind="quiet" onDark={onDark} />
          </div>
        </div>
        <div className={cn("relative min-h-72", p.layout !== "stacked" && "lg:col-span-7")}>
          <Photo
            id={p.id}
            field="image"
            pic={p.image}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
    </Frame>
  );
}

/* -------------------------------------------------------- Text + image */
export type TextImageProps = SectionStyle & {
  id: string;
  eyebrow?: Txt;
  heading?: Txt;
  bodyHtml?: Txt;
  image?: Pic;
  side?: "left" | "right";
  button?: Btn;
};
export function TextImage(p: TextImageProps) {
  return (
    <Frame style={p} library>
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-2">
        <div className={cn(p.side === "left" && "lg:order-2")}>
          <Head eyebrow={p.eyebrow} heading={p.heading} />
          <Rich v={p.bodyHtml} className={cn("mt-4", dark(p) ? "text-paper-deep" : "text-muted")} />
          <div className="mt-6">
            <Button b={p.button} onDark={dark(p)} />
          </div>
        </div>
        <Photo id={p.id} field="image" pic={p.image} className="aspect-[4/3] w-full object-cover" />
      </div>
    </Frame>
  );
}

/** Rich text: sanitized HTML from the server (allowlist in site-doc.server.ts). */
function Rich({ v, className }: { v: Txt; className?: string }) {
  if (!filled(v)) return null;
  const cls = cn("rich-text grid gap-3 leading-relaxed", className);
  if (typeof v === "string") return <div className={cls} dangerouslySetInnerHTML={{ __html: v }} />;
  return <div className={cls}>{v}</div>;
}

/* --------------------------------------------------------------- Gallery */
export type GalleryProps = SectionStyle & {
  id: string;
  heading?: Txt;
  images?: (Pic & { caption?: string })[];
  columns?: "2" | "3" | "4";
};
export function Gallery(p: GalleryProps) {
  const images = p.images ?? [];
  const cols = {
    "2": "sm:grid-cols-2",
    "3": "sm:grid-cols-2 lg:grid-cols-3",
    "4": "sm:grid-cols-2 lg:grid-cols-4",
  }[p.columns ?? "3"];
  return (
    <Frame style={p} library>
      <div className="mx-auto max-w-6xl px-5">
        <Head heading={p.heading} />
        {images.length === 0 ? (
          <EditorHint>Add photos in the panel on the right.</EditorHint>
        ) : null}
        <ul className={cn("mt-8 grid gap-4", cols)}>
          {images.map((img, i) => (
            <li key={i}>
              <Photo
                id={p.id}
                field="images"
                index={i}
                pic={img}
                className="aspect-[4/3] w-full object-cover"
              />
              {img.caption ? <p className="mt-2 text-sm text-muted">{img.caption}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------ Plan cards */
export type PlanCardsProps = SectionStyle & {
  id: string;
  heading?: Txt;
  intro?: Txt;
  which?: "featured" | "all" | "model";
};
export function PlanCards(p: PlanCardsProps) {
  const t = useText();
  const { plans } = useSiteData();
  const model = modelPlan(plans);
  const list =
    p.which === "all" ? plans : p.which === "model" ? (model ? [model] : []) : showcasePlans(plans);
  return (
    <Frame style={p} library>
      <div className="mx-auto max-w-6xl px-5">
        <Head heading={p.heading} intro={p.intro} dark={dark(p)} />
        <p className="mt-2 text-sm opacity-80">
          <Tx k="home.plans.gla.line" />
        </p>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {list.map((plan) => {
            const v = planVars(plan);
            return (
              <li key={plan.slug} className="flex flex-col text-ink" data-plan={plan.slug}>
                <Link to="/plans/$slug" params={{ slug: plan.slug }} className="group block">
                  <PlanImage
                    plan={plan}
                    alt={t("home.plans.card.image.alt", v)}
                    caption={t("home.plans.card.image.placeholder", v)}
                    className="aspect-video w-full"
                  />
                </Link>
                <div className="flex flex-1 flex-col justify-between gap-4 border border-t-0 border-line bg-paper px-4 py-4">
                  <div>
                    <h3 className="text-2xl">
                      <Link
                        to="/plans/$slug"
                        params={{ slug: plan.slug }}
                        className="hover:text-copper"
                      >
                        <Tx k="home.plans.card.title" vars={v} />
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      <Tx k="home.plans.card.specs" vars={v} />
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      <Tx k="home.plans.card.credit" vars={v} />
                    </p>
                  </div>
                  <GlaLink
                    href={plan.glaUrl}
                    title={t("home.plans.card.link.title", v)}
                    className="min-h-11 self-start text-sm underline"
                  >
                    <Tx k="home.plans.card.link" vars={v} />
                  </GlaLink>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-6">
          <GlaLink href={GLA_PLANS_URL} className={buttonStyles("quiet")}>
            <Tx k="home.plans.collection.button" />
          </GlaLink>
        </div>
      </div>
    </Frame>
  );
}

/* ----------------------------------------------------------- Lots list */
export type LotListProps = SectionStyle & {
  id: string;
  heading?: Txt;
  intro?: Txt;
  view?: "list" | "map";
};
export function LotList(p: LotListProps) {
  const { lots } = useSiteData();
  return (
    <Frame style={p} library>
      <div className="mx-auto max-w-6xl px-5">
        <Head heading={p.heading} intro={p.intro} dark={dark(p)} />
        {p.view === "map" ? (
          <div className="mt-8 text-ink">
            <SiteModel />
          </div>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lots.map((lot) => (
              <li key={lot.slug}>
                <Link
                  to="/homes/$slug"
                  params={{ slug: lot.slug }}
                  className="flex min-h-11 flex-col gap-1 border border-line bg-paper p-4 text-ink hover:border-copper"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-display text-2xl">Lot {lot.id}</span>
                    <LotStatusBadge status={lot.status} />
                  </span>
                  <span className="text-sm text-muted">{lot.street}</span>
                  <span className="text-xs tabular-nums text-muted">{lotAreaLabel(lot)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Frame>
  );
}

/* ----------------------------------------------------------- CTA banner */
export type CtaBannerProps = SectionStyle & {
  id: string;
  heading?: Txt;
  body?: Txt;
  button1?: Btn;
  button2?: Btn;
};
export function CtaBanner(p: CtaBannerProps) {
  const style: SectionStyle = { ...p, bg: p.bg ?? "pine" };
  const onDark = dark(style);
  return (
    <Frame style={style} library>
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {filled(p.heading) ? (
            <h2 className="text-3xl">
              <Show v={p.heading} />
            </h2>
          ) : null}
          {filled(p.body) ? (
            <p className={cn("mt-2 max-w-xl", onDark ? "text-paper-deep" : "text-muted")}>
              <Show v={p.body} />
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button b={p.button1} onDark={onDark} />
          <Button b={p.button2} kind="quiet" onDark={onDark} />
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ FAQ */
export type FaqProps = SectionStyle & {
  id: string;
  heading?: Txt;
  items?: { q?: string; a?: string }[];
};
export function Faq(p: FaqProps) {
  const items = p.items ?? [];
  return (
    <Frame style={p} library>
      <div className="mx-auto max-w-3xl px-5">
        <Head heading={p.heading} />
        <dl className="mt-6 divide-y divide-line border-y border-line">
          {items.map((it, i) => (
            <div key={i} className="py-5">
              <dt className="font-display text-xl">
                <RichText text={it.q ?? ""} />
              </dt>
              <dd className={cn("mt-2", dark(p) ? "text-paper-deep" : "text-muted")}>
                <RichText text={it.a ?? ""} />
              </dd>
            </div>
          ))}
        </dl>
        {items.length === 0 ? (
          <EditorHint>Add questions in the panel on the right.</EditorHint>
        ) : null}
      </div>
    </Frame>
  );
}

/* --------------------------------------------------------- Testimonials */
export type TestimonialsProps = SectionStyle & {
  id: string;
  heading?: Txt;
  items?: { quote?: string; name?: string; detail?: string }[];
};
/** Empty by default — only real, permitted quotes go here. Renders nothing until one is added. */
export function Testimonials(p: TestimonialsProps) {
  const items = (p.items ?? []).filter((it) => it.quote?.trim());
  const edit = useEditApi();
  if (!items.length && !edit) return null;
  return (
    <Frame style={p} library>
      <div className="mx-auto max-w-6xl px-5">
        <Head heading={p.heading} />
        {items.length === 0 ? (
          <EditorHint>
            No testimonials yet. Add real quotes (with permission) in the panel on the right — this
            section stays invisible to visitors until you do.
          </EditorHint>
        ) : (
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {items.map((it, i) => (
              <li key={i}>
                <figure className="border border-line bg-paper p-6 text-ink">
                  <blockquote className="font-display text-2xl leading-snug">
                    “{it.quote}”
                  </blockquote>
                  {it.name ? (
                    <figcaption className="mt-4 text-sm text-muted">
                      — {it.name}
                      {it.detail ? `, ${it.detail}` : ""}
                    </figcaption>
                  ) : null}
                </figure>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Frame>
  );
}

/* ---------------------------------------------------------------- Form */
export type LeadFormProps = SectionStyle & {
  id: string;
  heading?: Txt;
  intro?: Txt;
  formType?: "contact" | "tour" | "waitlist" | "reservation";
  showTypes?: boolean;
};
export function LeadForm(p: LeadFormProps) {
  return (
    <Frame style={p} library>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Head heading={p.heading} intro={p.intro} dark={dark(p)} />
        </div>
        <div className="text-ink lg:col-span-7">
          <InquiryForm initialType={p.formType ?? "contact"} showTypes={p.showTypes ?? false} />
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------- Map embed */
export type MapEmbedProps = SectionStyle & {
  id: string;
  heading?: Txt;
  address?: string;
  height?: "s" | "m" | "l";
};
export function MapEmbed(p: MapEmbedProps) {
  const q = (p.address ?? "").trim().slice(0, 200);
  const h = { s: 280, m: 400, l: 560 }[p.height ?? "m"];
  return (
    <Frame style={p} library>
      <div className="mx-auto max-w-6xl px-5">
        <Head heading={p.heading} />
        <div className="mt-6">
          {q ? (
            <iframe
              title={`Map: ${q}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`}
              className="w-full border border-line"
              style={{ height: h }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <p className="py-6">
              <Placeholder>[Map address — TO COME]</Placeholder>
            </p>
          )}
        </div>
      </div>
    </Frame>
  );
}

/* ----------------------------------------------------------------- Video */
/** YouTube / Vimeo link → privacy-friendly embed URL (anything else: none). */
export function videoEmbed(url: string | undefined): string | null {
  const u = (url ?? "").trim();
  const yt = u.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i,
  );
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/i);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
export type VideoProps = SectionStyle & { id: string; heading?: Txt; url?: string; caption?: Txt };
export function Video(p: VideoProps) {
  const src = videoEmbed(p.url);
  return (
    <Frame style={p} library>
      <div className="mx-auto max-w-4xl px-5">
        <Head heading={p.heading} />
        <div className="mt-6">
          {src ? (
            <iframe
              title="Video"
              src={src}
              className="aspect-video w-full border border-line"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <p className="py-6">
              <Placeholder>[Video link — TO COME]</Placeholder>
            </p>
          )}
          {filled(p.caption) ? (
            <p className="mt-2 text-sm text-muted">
              <Show v={p.caption} />
            </p>
          ) : null}
        </div>
      </div>
    </Frame>
  );
}

/* ---------------------------------------------------------------- Spacer */
export type SpacerProps = SectionStyle & { id: string; size?: "s" | "m" | "l"; line?: boolean };
export function Spacer(p: SpacerProps) {
  const h = { s: "1.5rem", m: "3rem", l: "6rem" }[p.size ?? "m"];
  return (
    <div
      className={BG[p.bg ?? "default"]}
      style={{ paddingTop: h, paddingBottom: h }}
      aria-hidden
      data-block
    >
      {p.line ? <hr className="mx-auto max-w-6xl border-line" /> : null}
    </div>
  );
}

/* ------------------------------------------------------------- Rich text */
export type RichTextBlockProps = SectionStyle & {
  id: string;
  html?: Txt;
  width?: "narrow" | "wide";
};
export function RichTextBlock(p: RichTextBlockProps) {
  return (
    <Frame style={p} library>
      <div className={cn("mx-auto px-5", p.width === "wide" ? "max-w-6xl" : "max-w-3xl")}>
        <Rich v={p.html} />
      </div>
    </Frame>
  );
}

export const LIBRARY: Record<LibraryType, (p: any) => ReactNode> = {
  Hero,
  TextImage,
  Gallery,
  PlanCards,
  LotList,
  CtaBanner,
  Faq,
  Testimonials,
  LeadForm,
  MapEmbed,
  Video,
  Spacer,
  RichTextBlock,
};
