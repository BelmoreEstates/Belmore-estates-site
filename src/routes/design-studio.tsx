import { createFileRoute, Link } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/chrome";
import { T, seoHead, useText } from "@/components/site/text";

export const Route = createFileRoute("/design-studio")({
  component: StudioPage,
  head: seoHead("design-studio"),
});

const picks = ["kitchen", "baths", "floors", "exterior"] as const;

function StudioPage() {
  const t = useText();
  return (
    <>
      <PageIntro
        eyebrow={t("design-studio.intro.eyebrow")}
        title={t("design-studio.intro.h2")}
        lede={<T k="design-studio.intro.body" />}
        image={t("design-studio.hero.image.src")}
        imageAlt={t("design-studio.hero.image.alt")}
      />
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <article key={n}>
            <p className="font-display text-3xl text-copper">{t(`design-studio.step${n}.number`)}</p>
            <h2 className="mt-3 text-3xl">{t(`design-studio.step${n}.title`)}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              <T k={`design-studio.step${n}.body`} />
            </p>
          </article>
        ))}
      </section>
      <section className="border-y border-line bg-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2">
          <img
            src={t("design-studio.image.src")}
            alt={t("design-studio.image.alt")}
            className="aspect-video w-full object-cover"
          />
          <div>
            <h2 className="text-4xl">{t("design-studio.picks.h3")}</h2>
            <ul className="mt-6 grid gap-4">
              {picks.map((p) => (
                <li key={p} className="border-b border-line pb-4">
                  <h3 className="text-2xl">{t(`design-studio.picks.${p}.title`)}</h3>
                  <p className="mt-1 text-sm text-muted">
                    <T k={`design-studio.picks.${p}.body`} />
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-4xl">{t("design-studio.cta.h3")}</h2>
        <p className="mt-3 max-w-xl text-muted">
          <T k="design-studio.cta.body" />
        </p>
        <Link
          to="/contact"
          search={{ interest: "The design studio" }}
          className="mt-6 inline-flex min-h-11 items-center bg-pine px-5 text-sm text-cream"
        >
          {t("design-studio.cta.button")}
        </Link>
      </section>
    </>
  );
}
