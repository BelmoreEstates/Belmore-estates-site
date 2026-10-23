import { createFileRoute, Link } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/chrome";
import { SiteModel } from "@/components/site/site-model";
import { T, seoHead, useText } from "@/components/site/text";

export const Route = createFileRoute("/community")({
  component: CommunityPage,
  head: seoHead("community"),
});

const facts = ["place", "developer", "lots", "streets", "schools", "office"] as const;

function CommunityPage() {
  const t = useText();
  return (
    <>
      <PageIntro
        eyebrow={t("community.intro.eyebrow")}
        title={t("community.intro.h2")}
        lede={<T k="community.intro.body" />}
        image={t("community.hero.image.src")}
        imageAlt={t("community.hero.image.alt")}
      />
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="text-4xl">{t("community.plat.h2")}</h2>
          <p className="mt-4 leading-relaxed text-muted">
            <T k="community.plat.body" />
          </p>
        </div>
        <dl className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:col-span-7">
          {facts.map((f) => (
            <Fact key={f} k={t(`community.facts.${f}.label`)} v={<T k={`community.facts.${f}.value`} />} />
          ))}
        </dl>
      </section>
      <section id="site-model" className="border-y border-line bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-4xl">{t("community.model.h2")}</h2>
          <p className="mt-3 max-w-2xl text-muted">
            <T k="community.model.body" />
          </p>
          <div className="mt-8">
            <SiteModel hintKey="community.model.hint" captionKey="community.model.caption" />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-4xl">{t("community.ground.eyebrow")}</h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="border-t border-line pt-4">
              <h3 className="text-2xl">{t(`community.ground.item${n}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                <T k={`community.ground.item${n}.body`} />
              </p>
            </li>
          ))}
        </ul>
        <Link to="/homes" className="mt-10 inline-flex min-h-11 items-center bg-pine px-5 text-sm text-cream">
          {t("community.ground.button")}
        </Link>
      </section>
    </>
  );
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="bg-paper px-4 py-4">
      <dt className="text-xs uppercase tracking-widest text-muted">{k}</dt>
      <dd className="mt-1 text-lg">{v}</dd>
    </div>
  );
}
