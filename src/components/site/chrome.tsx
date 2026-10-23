import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { nav } from "@/data/site";
import { RichText, T, useSiteData, useText } from "@/components/site/text";
import { cn } from "@/lib/cn";

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
  return (
    <p className="bg-pine-deep px-5 py-2 text-center text-sm text-cream">
      <T k="global.banner.text" />
    </p>
  );
}

/** Menu label key for a nav path, e.g. "/design-studio" → global.menu.design-studio. */
function menuKey(to: string) {
  return `global.menu.${to.replace(/^\//, "")}`;
}

function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const t = useText();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link to="/" className="leading-tight" aria-label={t("global.wordmark.aria")}>
          <span className="block font-display text-2xl text-ink">{t("global.wordmark.line1")}</span>
          <span className="block text-xs uppercase tracking-widest text-muted">{t("global.wordmark.line2")}</span>
        </Link>
        <nav className="hidden items-center gap-5 xl:flex" aria-label="Primary">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "text-sm text-ink",
                pathname === item.to && "text-copper",
              )}
            >
              {t(menuKey(item.to)) || item.label}
            </Link>
          ))}
          <Link to="/contact" className={primary}>
            {t("global.menu.contact")}
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
        <nav id="mobile-nav" className="border-t border-line bg-paper px-5 py-4 xl:hidden" aria-label="Mobile">
          <ul className="grid gap-1">
            {nav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="flex min-h-11 items-center text-lg">
                  {t(menuKey(item.to)) || item.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link to="/contact" className={primary}>
                {t("global.menu.contact")}
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
  const t = useText();
  const { blocks } = useSiteData();
  return (
    <footer className="border-t border-line bg-pine-deep text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-3xl">{t("global.footer.block1.heading")}</p>
          <p className="mt-3 text-sm text-paper-deep">
            <T k="global.footer.block1.body" />
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-copper">{t("global.footer.block2.eyebrow")}</p>
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
          <p className="text-xs uppercase tracking-widest text-copper">{t("global.footer.block3.eyebrow")}</p>
          <ul className="mt-3 grid gap-2 text-sm">
            {[...nav.map((item) => item.to), "/faq", "/privacy"].map((to) => (
              <li key={to}>
                <Link to={to} className="underline-offset-2 hover:underline">
                  {t(menuKey(to))}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-copper">{t("global.footer.block4.eyebrow")}</p>
          <p className="mt-3 text-sm text-paper-deep">
            <T k="global.footer.block4.body" />
          </p>
        </div>
      </div>
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
  image,
  imageAlt,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  lede: ReactNode;
  image: string;
  imageAlt: string;
}) {
  return (
    <section className="grid border-b border-line lg:grid-cols-12">
      <div className="flex flex-col justify-end px-5 py-12 sm:px-8 lg:col-span-5 lg:py-20">
        <p className="text-xs uppercase tracking-widest text-copper">{eyebrow}</p>
        <h1 className="mt-4 text-5xl leading-tight text-ink">{title}</h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">{lede}</p>
      </div>
      <div className="relative min-h-72 lg:col-span-7">
        <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
      </div>
    </section>
  );
}
