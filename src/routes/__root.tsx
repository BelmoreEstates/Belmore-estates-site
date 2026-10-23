import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { AdminTools } from "@/components/site/admin-tools";
import { AuthProvider } from "@/lib/auth/provider";
import { SiteFrame, buttonStyles } from "@/components/site/chrome";
import { textOf, useText } from "@/components/site/text";
import { getPublicData, staticPublicData } from "@/server/public";
import { themeCss, themeFontHref } from "@/site/doc";
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
      ...((loaderData ?? staticPublicData).noindex
        ? [{ name: "robots", content: "noindex, nofollow" }]
        : []),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        // The original fonts unless the owner picked others in the editor's Theme panel.
        href: themeFontHref((loaderData ?? staticPublicData).site.theme),
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  const data = Route.useLoaderData() ?? staticPublicData;
  // Site-wide theme overrides (colors, fonts, buttons, spacing): nothing is
  // emitted while the theme is the original, so the page is byte-identical.
  // The visual editor (/editor) is a bare full-screen app: no site chrome, and
  // no published theme (its canvas applies the draft theme itself).
  const bare = useRouterState({ select: (s) => s.location.pathname === "/editor" });
  const css = bare ? "" : themeCss(data.site.theme);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {css ? <style data-site-theme>{css}</style> : null}
      </head>
      <body>
        <AuthProvider>
          {bare ? (
            <Outlet />
          ) : (
            <>
              <SiteFrame>
                <Outlet />
              </SiteFrame>
              <AdminTools />
            </>
          )}
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
      <p className="text-xs uppercase tracking-widest text-copper">
        {t("global.notfound.eyebrow")}
      </p>
      <h1 className="mt-3 text-5xl">{t("global.notfound.h1")}</h1>
      <p className="mt-4 text-muted">{t("global.notfound.body")}</p>
      <Link to="/" className={`mt-8 ${buttonStyles("primary")}`}>
        {t("global.notfound.button")}
      </Link>
    </section>
  );
}
