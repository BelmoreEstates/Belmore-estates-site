/**
 * Round 6: social icons (top bar + footer), the footer Fair Housing / privacy
 * row, the homepage Fair Housing line and the /legal page.
 *
 * Visitors only see a social icon once its URL is set (https only), and the
 * legal UI only once `global.legal.enabled` is "on". With nothing set the
 * public markup is exactly what it was before. In the editor the empty slots
 * and the hidden legal UI are shown (flagged) so they can be filled in.
 */
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Placeholder, T, Tx, textOf, useEditApi, useSiteData } from "@/components/site/text";
import { cn } from "@/lib/cn";
import {
  SOCIAL_NETWORKS,
  SOCIAL_PATHS,
  isSocialUrl,
  socialKey,
  type SocialId,
} from "@/site/social-icons";

/** HUD's official Equal Housing Opportunity logo (public domain), one color. */
export const EHO_LOGO_SRC = "/images/equal-housing-opportunity.svg";
export const EHO_LOGO_DARK_SRC = "/images/equal-housing-opportunity-dark.svg";
export const EHO_ALT = "Equal Housing Opportunity";

type SocialLink = { id: SocialId; label: string; url: string };

/** All six networks with their (validated) URL, "" when unset. */
export function useSocialLinks(): SocialLink[] {
  const { blocks } = useSiteData();
  return SOCIAL_NETWORKS.map((n) => {
    const url = textOf(blocks, socialKey(n.id)).trim();
    return { id: n.id, label: n.label, url: isSocialUrl(url) ? url : "" };
  });
}

export function useLegalEnabled(): boolean {
  const { blocks } = useSiteData();
  return textOf(blocks, "global.legal.enabled").trim().toLowerCase() === "on";
}

function Glyph({ id, className }: { id: SocialId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={SOCIAL_PATHS[id]} />
    </svg>
  );
}

/**
 * The icon row. Public: only networks with a URL (nothing if none).
 * Editor: every network; unset ones are dashed, dimmed slots.
 */
export function SocialIcons({ where }: { where: "top" | "footer" }) {
  const links = useSocialLinks();
  const edit = useEditApi();
  const set = links.filter((l) => l.url);
  if (!edit && set.length === 0) return null;
  const shown = edit ? links : set;
  return (
    <ul
      className={cn("flex items-center", where === "top" ? "gap-1" : "mt-4 gap-2")}
      aria-label="Belmore Estates on social media"
      data-social={where}
    >
      {shown.map((l) => (
        <li key={l.id}>
          {l.url && !edit ? (
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Belmore Estates on ${l.label} (opens in a new tab)`}
              title={l.label}
              className={cn(
                "inline-flex items-center justify-center text-cream transition-colors hover:text-copper",
                where === "top" ? "h-8 w-8" : "h-10 w-10 border border-pine hover:border-copper",
              )}
            >
              <Glyph id={l.id} />
            </a>
          ) : (
            <span
              title={
                l.url
                  ? `${l.label}: ${l.url}`
                  : `${l.label} link not set: add it in “Social & footer” (left side of the editor)`
              }
              data-social-slot={l.url ? "set" : "empty"}
              className={cn(
                "inline-flex items-center justify-center text-cream",
                where === "top" ? "h-8 w-8" : "h-10 w-10",
                !l.url && "border border-dashed border-cream/50 opacity-50",
              )}
            >
              <Glyph id={l.id} />
              <span className="sr-only">
                {l.url ? `${l.label} link set` : `${l.label} link not set`}
              </span>
            </span>
          )}
        </li>
      ))}
      {edit && set.length === 0 && where === "top" ? (
        <li className="ml-2 text-xs text-paper-deep">
          Social links are hidden until set in “Social &amp; footer”
        </li>
      ) : null}
    </ul>
  );
}

/* ------------------------------------------------------- fair housing / legal */

const EXTERNAL_NOTE = " (opens in a new tab)";

function EhoLogo({ className, dark }: { className?: string; dark?: boolean }) {
  const { blocks } = useSiteData();
  const alt = textOf(blocks, "global.footer.eho.logo.alt").trim() || EHO_ALT;
  return (
    <img
      src={dark ? EHO_LOGO_DARK_SRC : EHO_LOGO_SRC}
      alt={alt}
      width={56}
      height={60}
      className={className}
      data-eho-logo
    />
  );
}

/** Editor-only flag on legal UI that visitors can't see yet. */
function HiddenFlag() {
  return (
    <span className="inline-flex border border-dashed border-copper px-2 py-1 text-xs text-copper">
      Hidden from visitors until “Show” in “Social &amp; footer”
    </span>
  );
}

/**
 * The NY Fair Housing Notice link (19 NYCRR §175.29). Goes to the DOS notice
 * once its https address is set, otherwise to the notice section of /legal.
 */
export function FairHousingLink({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const { blocks } = useSiteData();
  const url = textOf(blocks, "global.footer.fairhousing.url").trim();
  const label = children ?? <Tx k="global.footer.fairhousing.link" />;
  if (isSocialUrl(url))
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        data-fairhousing-link="external"
      >
        {label}
        <span className="sr-only">{EXTERNAL_NOTE}</span>
      </a>
    );
  return (
    <Link to="/legal" hash="dos" className={className} data-fairhousing-link="legal">
      {label}
    </Link>
  );
}

function SopLink({ className }: { className?: string }) {
  const { blocks } = useSiteData();
  const edit = useEditApi();
  const url = textOf(blocks, "global.footer.sop.url").trim();
  if (!isSocialUrl(url)) {
    if (!edit) return null;
    return (
      <span className={cn(className, "opacity-60")} title="Add the SOP link in “Social & footer”">
        <Tx k="global.footer.sop.link" /> (link not set: hidden)
      </span>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      <Tx k="global.footer.sop.link" />
      <span className="sr-only">{EXTERNAL_NOTE}</span>
    </a>
  );
}

const linkCls = "underline underline-offset-2 hover:text-copper";

/** Footer row: EHO logo + notice, the notice links, privacy summary, brokerage line. */
export function FooterLegal() {
  const enabled = useLegalEnabled();
  const edit = useEditApi();
  if (!enabled && !edit) return null;
  return (
    <div className="border-t border-pine" data-legal="footer">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 text-sm lg:grid-cols-12">
        {edit && !enabled ? (
          <div className="lg:col-span-12">
            <HiddenFlag />
          </div>
        ) : null}
        <div className="flex gap-4 lg:col-span-7">
          <EhoLogo className="h-16 w-auto shrink-0" />
          <div>
            <p className="leading-relaxed text-paper-deep">
              <T k="global.footer.eho" />
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              <li>
                <FairHousingLink className={cn(linkCls, "font-medium text-cream")} />
              </li>
              <li>
                <SopLink className={linkCls} />
              </li>
              <li>
                <Link to="/legal" className={linkCls}>
                  <Tx k="global.footer.legal.link" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="grid gap-3 lg:col-span-5">
          <p className="leading-relaxed text-paper-deep" data-privacy-notice>
            <T k="global.footer.privacy_summary" />{" "}
            <Link to="/privacy" className={linkCls}>
              <Tx k="global.footer.privacy_link" />
            </Link>
          </p>
          <p className="text-xs leading-relaxed text-paper-deep">
            <T k="global.footer.broker" />
            <br />
            <T k="global.footer.broker.independent" />
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Homepage Fair Housing line (19 NYCRR §175.29(c): the notice link must be
 * prominent on the homepage). An optional original section of the home page.
 */
export function HomeFairHousing() {
  const enabled = useLegalEnabled();
  const edit = useEditApi();
  if (!enabled && !edit) return null;
  return (
    <section className="border-t border-line bg-cream" data-home-fairhousing>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-6 text-sm">
        <EhoLogo dark className="h-12 w-auto" />
        <FairHousingLink className="min-h-11 content-center font-medium underline underline-offset-2 hover:text-copper" />
        <Link
          to="/legal"
          className="min-h-11 content-center underline underline-offset-2 hover:text-copper"
        >
          <Tx k="global.footer.legal.link" />
        </Link>
        {edit && !enabled ? <HiddenFlag /> : null}
      </div>
    </section>
  );
}

/** Buyer story (home). Never shown to visitors while it is empty or a placeholder. */
export function HomeTestimonial() {
  const { blocks } = useSiteData();
  const edit = useEditApi();
  const quote = textOf(blocks, "home.testimonial.quote").trim();
  const name = textOf(blocks, "home.testimonial.name").trim();
  const real = isRealText(quote) && isRealText(name);
  if (!real && !edit) return null;
  return (
    <section className="mx-auto max-w-4xl px-5 py-16 text-center" data-home-testimonial>
      {!real ? (
        <p className="mb-4 inline-flex border border-dashed border-copper px-2 py-1 text-xs text-copper">
          Hidden from visitors until a real buyer quote and name (with written permission) replace
          the placeholders
        </p>
      ) : null}
      <blockquote className="font-display text-3xl leading-snug">
        <T k="home.testimonial.quote" />
      </blockquote>
      <p className="mt-4 text-sm uppercase tracking-widest text-muted">
        <T k="home.testimonial.name" />
      </p>
    </section>
  );
}

/** Not empty and no `[…]` placeholder left in it. */
export function isRealText(text: string) {
  return text.trim() !== "" && !/\[[^\]]*\]/.test(text);
}

/** "Why Belmore Estates" trust band (home, optional). */
export function HomeTrust() {
  return (
    <section className="border-y border-line bg-cream" data-home-trust>
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-xs uppercase tracking-widest text-copper">
          <Tx k="home.trust.eyebrow" />
        </p>
        <h2 className="mt-3 max-w-2xl text-4xl">
          <Tx k="home.trust.h2" />
        </h2>
        <ul className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="bg-cream p-6">
              <p className="font-display text-xl text-copper">0{n}</p>
              <h3 className="mt-2 text-2xl">
                <Tx k={`home.trust.item${n}.title`} />
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                <T k={`home.trust.item${n}.body`} />
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ /legal */

/** The /legal page body: same simple text layout as /privacy. */
export function LegalPage() {
  const { blocks } = useSiteData();
  const edit = useEditApi();
  const enabled = useLegalEnabled();
  const has = (k: string) => edit || textOf(blocks, k).trim() !== "";
  const sopUrl = textOf(blocks, "global.footer.sop.url").trim();
  const sections: { id: string; h3: string; bodies: string[]; extra?: ReactNode }[] = [
    {
      id: "eho",
      h3: "legal.eho.h3",
      bodies: ["legal.eho.body"],
      extra: <EhoLogo dark className="h-16 w-auto" />,
    },
    {
      id: "nys",
      h3: "legal.nys.h3",
      bodies: ["legal.nys.body"],
      extra: (
        <a
          href="https://dhr.ny.gov/report"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline underline-offset-2 hover:text-copper"
        >
          <Tx k="legal.nys.report" />
          <span className="sr-only">{EXTERNAL_NOTE}</span>
        </a>
      ),
    },
    {
      id: "dos",
      h3: "legal.dos.h3",
      bodies: ["legal.dos.body"],
      extra: isSocialUrl(textOf(blocks, "global.footer.fairhousing.url").trim()) ? (
        <FairHousingLink className="text-ink underline underline-offset-2 hover:text-copper">
          <Tx k="legal.dos.link.label" />
        </FairHousingLink>
      ) : (
        <span className="text-ink">
          <Tx k="legal.dos.link.label" />:{" "}
          <Placeholder>[NY DOS FAIR HOUSING NOTICE LINK — TO CONFIRM]</Placeholder>
        </span>
      ),
    },
    {
      id: "sop",
      h3: "legal.sop.h3",
      bodies: ["legal.sop.body"],
      extra: isSocialUrl(sopUrl) ? (
        <a
          href={sopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline underline-offset-2 hover:text-copper"
        >
          <Tx k="legal.sop.link.label" />
          <span className="sr-only">{EXTERNAL_NOTE}</span>
        </a>
      ) : (
        <span className="text-ink">
          <Tx k="legal.sop.link.label" />: <Placeholder>[SOP LINK — TO CONFIRM]</Placeholder>
        </span>
      ),
    },
    {
      id: "broker",
      h3: "legal.broker.h3",
      bodies: [
        "legal.broker.agent",
        "legal.broker.address",
        "legal.broker.phone",
        "legal.broker.license",
        "legal.broker.independent",
        "legal.broker.developer",
      ],
    },
    { id: "agency", h3: "legal.agency.h3", bodies: ["legal.agency.body"] },
  ];
  return (
    <section className="mx-auto max-w-3xl px-5 py-14" data-legal-page>
      {edit && !enabled ? (
        <p className="mb-6">
          <HiddenFlag />
        </p>
      ) : null}
      <p className="text-xs uppercase tracking-widest text-copper">
        <Tx k="legal.intro.eyebrow" />
      </p>
      <h1 className="mt-3 text-5xl">
        <Tx k="legal.intro.h2" />
      </h1>
      {has("legal.draft.flag") ? (
        <p className="mt-4 inline-flex border border-dashed border-copper px-2 py-1 text-xs uppercase tracking-widest text-copper">
          <Tx k="legal.draft.flag" />
        </p>
      ) : null}
      <div className="mt-8 grid gap-4 text-sm leading-relaxed text-muted">
        <p>
          <T k="legal.intro.body" />
        </p>
        {sections.map((s) => (
          <div key={s.id} id={s.id} className="grid scroll-mt-24 gap-3 border-t border-line pt-5">
            <h2 className="text-2xl text-ink">
              <Tx k={s.h3} />
            </h2>
            {s.bodies.filter(has).map((k) => (
              <p key={k}>
                <T k={k} />
              </p>
            ))}
            {s.extra ? <div>{s.extra}</div> : null}
          </div>
        ))}
        {has("legal.disclaimer.body") ? (
          <p className="border-t border-line pt-5 text-xs">
            <T k="legal.disclaimer.body" />
          </p>
        ) : null}
      </div>
    </section>
  );
}
