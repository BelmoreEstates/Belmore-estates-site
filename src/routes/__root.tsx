import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { SiteFrame, buttonStyles } from "@/components/site/chrome";
import { textOf, useText } from "@/components/site/text";
import { getPublicData, staticPublicData } from "@/server/public";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  // Site content: DB (owner edits) merged over the keyed copy defaults.
  loader: async () => {
    try {
      return await getPublicData();
    } catch {
      return staticPublicData;
    }
  },
  staleTime: 30_000,
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: textOf((loaderData ?? staticPublicData).blocks, "global.seo.title") },
      {
        name: "description",
        content: textOf((loaderData ?? staticPublicData).blocks, "global.seo.description"),
      },
      { name: "theme-color", content: "#243F34" },
      // Everything but SITE_ENV=production stays out of search engines
      // (the X-Robots-Tag header in src/start.ts says the same).
      ...((loaderData ?? staticPublicData).noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,620&family=Outfit:wght@400;500;600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <SiteFrame>
            <Outlet />
          </SiteFrame>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  const t = useText();
  return (
    <section className="mx-auto max-w-3xl px-5 py-24">
      <p className="text-xs uppercase tracking-widest text-copper">{t("global.notfound.eyebrow")}</p>
      <h1 className="mt-3 text-5xl">{t("global.notfound.h1")}</h1>
      <p className="mt-4 text-muted">{t("global.notfound.body")}</p>
      <Link to="/" className={`mt-8 ${buttonStyles("primary")}`}>
        {t("global.notfound.button")}
      </Link>
    </section>
  );
}
