import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Img, RichText, T, Tx, useEditApi, useSiteData, useText } from "@/components/site/text";
import { isExternalHref, navOf, safeImageSrc, type NavItem } from "@/site/doc";
import { cn } from "@/lib/cn";
import {
  FooterLegal,
  SocialIcons,
  useLegalEnabled,
  useSocialLinks,
} from "@/components/site/social-legal";

const primary =
  "inline-flex min-h-11 items-center justify-center bg-pine px-5 text-sm text-cream transition-colors hover:bg-pine-deep";
const quiet =
  "inline-flex min-h-11 items-center justify-center border border-ink px-5 text-sm text-ink transition-colors hover:bg-ink hover:text-cream";

export function buttonStyles(kind: "primary" | "quiet" = "primary") {
  return kind === "primary" ? primary : quiet;
}

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-cream focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <DraftBar />
      <Header />
      <div id="content">{children}</div>
      <Footer />
    </div>
  );
}

function DraftBar() {
  const edit = useEditApi();
  const anySocial = useSocialLinks().some((l) => l.url);
  // Nothing set (and not editing): exactly the original one-line bar.
  if (!anySocial && !edit)
    return (
      <p className="bg-pine-deep px-5 py-2 text-center text-sm text-cream">
        <T k="global.banner.text" />
      </p>
    );
  return (
    <div className="bg-pine-deep px-5 py-1 text-sm text-cream" data-topbar>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 sm:flex-row sm:justify-between sm:gap-6">
        <p className="py-1 text-center sm:text-left">
          <T k="global.banner.text" />
        </p>
        <SocialIcons where="top" />
      </div>
    </div>
  );
}

/** Menu label key for a nav path, e.g. "/design-studio" → global.menu.design-studio. */
function menuKey(to: string) {
  return `global.menu.${to.replace(/^\//, "")}`;
}

/** The menu from the site doc (the original six links until the owner edits it). */
function useNav(): NavItem[] {
  const { site } = useSiteData();
  return navOf(site).filter((item) => !item.hidden);
}

function NavLabel({ item }: { item: NavItem }) {
  return item.label ? <>{item.label}</> : item.labelKey ? <Tx k={item.labelKey} /> : null;
}

/** Internal links use the router; external ones open in a new tab. */
function NavLink({
  item,
  className,
  children,
}: {
  item: NavItem;
  className?: string;
  children: ReactNode;
}) {
  if (isExternalHref(item.href) || item.external)
    return (
      <a href={item.href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  return (
    <Link to={item.href as "/"} className={className}>
      {children}
    </Link>
  );
}

/** Wordmark (text) or the uploaded logo picked in the Theme panel. */
function Logo() {
  const { site } = useSiteData();
  const logo = site.theme.logo;
  const src = logo?.mode === "image" ? safeImageSrc(logo.src) : "";
  if (src)
    return (
      <img
        src={src}
        alt={logo?.alt || "Belmore Estates"}
        style={{ height: logo?.height ?? 44, width: "auto" }}
        className="block"
      />
    );
  return (
    <>
      <span className="block font-display text-2xl text-ink">
        <Tx k="global.wordmark.line1" />
      </span>
      <span className="block text-xs uppercase tracking-widest text-muted">
        <Tx k="global.wordmark.line2" />
      </span>
    </>
  );
}

function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const t = useText();
  const nav = useNav();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link to="/" className="leading-tight" aria-label={t("global.wordmark.aria")}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-5 xl:flex" aria-label="Primary">
          {nav.map((item) => (
            <NavLink
              key={item.id}
              item={item}
              className={cn("text-sm text-ink", pathname === item.href && "text-copper")}
            >
              <NavLabel item={item} />
            </NavLink>
          ))}
          <Link to="/contact" className={primary}>
            <Tx k="global.menu.contact" />
          </Link>
        </nav>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center xl:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
          <span className="sr-only">{open ? "Close menu" : t("global.menu.toggle.aria")}</span>
        </button>
      </div>
      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-line bg-paper px-5 py-4 xl:hidden"
          aria-label="Mobile"
        >
          <ul className="grid gap-1">
            {nav.map((item) => (
              <li key={item.id}>
                <NavLink item={item} className="flex min-h-11 items-center text-lg">
                  <NavLabel item={item} />
                </NavLink>
              </li>
            ))}
            <li className="pt-2">
              <Link to="/contact" className={primary}>
                <Tx k="global.menu.contact" />
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

/** " / " in a copy line is a line break (e.g. the office address). */
function Lines({ text }: { text: string }) {
  const parts = text.split(" / ");
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 ? <br /> : null}
          <RichText text={part} emailClassName="underline underline-offset-2 break-all" />
        </span>
      ))}
    </>
  );
}

function Footer() {
  const { blocks } = useSiteData();
  const nav = useNav();
  const legalOn = useLegalEnabled();
  const extra: NavItem[] = ["/faq", "/privacy", ...(legalOn ? ["/legal"] : [])].map((to) => ({
    id: `footer-${to}`,
    href: to,
    labelKey: menuKey(to),
  }));
  return (
    <footer className="border-t border-line bg-pine-deep text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-3xl">
            <Tx k="global.footer.block1.heading" />
          </p>
          <p className="mt-3 text-sm text-paper-deep">
            <T k="global.footer.block1.body" />
          </p>
          <SocialIcons where="footer" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-copper">
            <Tx k="global.footer.block2.eyebrow" />
          </p>
          <p className="mt-3 text-sm">
            <Lines text={rawBlock("global.footer.block2.line1")} />
          </p>
          <p className="mt-3 text-sm">
            <Lines text={rawBlock("global.footer.block2.line2")} />
          </p>
          <p className="mt-3 text-sm">
            <Lines text={rawBlock("global.footer.block2.line3")} />
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-copper">
            <Tx k="global.footer.block3.eyebrow" />
          </p>
          <ul className="mt-3 grid gap-2 text-sm">
            {[...nav, ...extra].map((item) => (
              <li key={item.id}>
                <NavLink item={item} className="underline-offset-2 hover:underline">
                  <NavLabel item={item} />
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-copper">
            <Tx k="global.footer.block4.eyebrow" />
          </p>
          <p className="mt-3 text-sm text-paper-deep">
            <T k="global.footer.block4.body" />
          </p>
        </div>
      </div>
      <FooterLegal />
      <div className="border-t border-pine px-5 py-4 text-center text-xs text-paper-deep">
        <T k="global.footer.copyright" />
      </div>
    </footer>
  );

  function rawBlock(key: string) {
    // Keep {{CONTACT_EMAIL}} and placeholders for RichText to style.
    return blocks[key] ?? "";
  }
}

export function PageIntro({
  eyebrow,
  title,
  lede,
  imagePrefix,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  lede: ReactNode;
  /** Keyed photo: `<prefix>.src` / `<prefix>.alt`. */
  imagePrefix: string;
}) {
  return (
    <section className="grid border-b border-line lg:grid-cols-12">
      <div className="flex flex-col justify-end px-5 py-12 sm:px-8 lg:col-span-5 lg:py-20">
        <p className="text-xs uppercase tracking-widest text-copper">{eyebrow}</p>
        <h1 className="mt-4 text-5xl leading-tight text-ink">{title}</h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">{lede}</p>
      </div>
      <div className="relative min-h-72 lg:col-span-7">
        <Img
          srcKey={`${imagePrefix}.src`}
          altKey={`${imagePrefix}.alt`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </section>
  );
}
