import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/chrome";
import { T, seoHead, useText } from "@/components/site/text";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: seoHead("about"),
});

function AboutPage() {
  const t = useText();
  return (
    <>
      <PageIntro
        eyebrow={t("about.intro.eyebrow")}
        title={t("about.intro.h2")}
        lede={<T k="about.intro.body" />}
        image={t("about.hero.image.src")}
        imageAlt={t("about.hero.image.alt")}
      />
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-4xl">{t("about.list.h3")}</h2>
          <ul className="mt-6 grid gap-4 text-sm leading-relaxed">
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className="border-b border-line pb-4">
                <T k={`about.list.item${n}`} />
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-pine px-6 py-8 text-cream">
          <p className="text-xs uppercase tracking-widest text-copper">{t("about.short.h3")}</p>
          <p className="mt-4 font-display text-3xl leading-tight">
            <T k="about.short.body1" />
          </p>
          <p className="mt-4 text-sm text-paper-deep">
            <T k="about.short.body2" />
          </p>
        </div>
      </section>
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-4xl">{t("about.team.h3")}</h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="border border-line p-5">
                <p className="text-xs uppercase tracking-widest text-copper">{t(`about.team.card${n}.eyebrow`)}</p>
                <h3 className="mt-2 text-3xl">
                  <T k={`about.team.card${n}.name`} />
                </h3>
                <p className="mt-3 text-sm text-muted">
                  <T k={`about.team.card${n}.body`} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
