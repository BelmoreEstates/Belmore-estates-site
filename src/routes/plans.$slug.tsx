import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { InquiryForm } from "@/components/site/inquiry-form";
import { buttonStyles } from "@/components/site/chrome";
import { GlaLink, PlanImage } from "@/components/site/plan-image";
import { T, ValueText, planVars, seoHead, useSiteData, useText } from "@/components/site/text";
import { planBySlug } from "@/data/site";

export const Route = createFileRoute("/plans/$slug")({
  component: PlanPage,
  head: seoHead("plans.detail", (params, data) => {
    const plan = data.plans.find((p) => p.slug === params.slug) ?? planBySlug(params.slug);
    return plan ? planVars(plan) : { name: "Floor plan" };
  }),
});

function PlanPage() {
  const { slug } = Route.useParams();
  const t = useText();
  const { plans } = useSiteData();
  const plan = plans.find((p) => p.slug === slug);
  if (!plan) throw notFound();
  const v = planVars(plan);
  const others = plans.filter((item) => item.slug !== plan.slug).slice(0, 6);
  const specs = ["beds", "baths", "area", "garage", "stories", "width"] as const;

  return (
    <>
      <section className="grid lg:grid-cols-12">
        <div className="px-5 py-12 sm:px-8 lg:col-span-5 lg:py-16">
          <p className="text-xs uppercase tracking-widest text-copper">{t("plans.detail.eyebrow", v)}</p>
          <h1 className="mt-3 text-5xl">{t("plans.detail.h1", v)}</h1>
          <p className="mt-4 text-lg text-muted">
            <T k="plans.detail.body" vars={v} />
          </p>
          <p className="mt-6 font-display text-3xl tabular-nums">
            <ValueText k="plans.detail.price" value={plan.priceText} vars={v} />
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-6 text-sm">
            {specs.map((key) => (
              <Row
                key={key}
                k={t(`plans.detail.specs.${key}.label`)}
                v={t(`plans.detail.specs.${key}.value`, v)}
                sub={key === "area" ? t("plans.detail.specs.area.floors", v) : undefined}
              />
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <GlaLink href={plan.glaUrl} title={t("plans.detail.gla.link.title", v)} className={buttonStyles("primary")}>
              {t("plans.detail.gla.link", v)}
            </GlaLink>
            <p className="text-sm text-muted">{t("plans.detail.credit", v)}</p>
          </div>
        </div>
        <PlanImage
          plan={plan}
          alt={t("plans.detail.image.alt", v)}
          caption={t("plans.detail.image.placeholder", v)}
          className="min-h-80 lg:col-span-7"
        />
      </section>
      <section className="border-y border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl">{t("plans.detail.gallery.h3", v)}</h2>
            <p className="mt-3 text-sm text-muted">
              <T k="plans.detail.gallery.body" vars={v} />
            </p>
            <div className="mt-6 border border-line">
              <PlanImage
                plan={plan}
                slot="floorPlan"
                alt={t("plans.detail.image.alt", v)}
                caption={t("plans.detail.image.placeholder", v)}
                className="aspect-video w-full"
              />
            </div>
            <GlaLink href={plan.glaUrl} title={t("plans.detail.gla.link.title", v)} className="mt-4 min-h-11 text-sm underline">
              {t("plans.detail.gla.link", v)}
            </GlaLink>
          </div>
          <div>
            <h2 className="text-3xl">{t("plans.detail.features.h3", v)}</h2>
            <ul className="mt-6 grid gap-3">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="border-b border-line pb-3 text-sm">
                  <T k={`plans.detail.features.item${n}`} vars={v} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="border-t border-line bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-3xl">{t("plans.detail.form.h3", v)}</h2>
          <div className="mt-8">
            <InquiryForm initialType="contact" interest={plan.name} planSlug={plan.slug} />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-3xl">{t("plans.detail.other.h3", v)}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {others.map((item) => (
            <li key={item.slug}>
              <Link to="/plans/$slug" params={{ slug: item.slug }} className="block border border-line">
                <PlanImage
                  plan={item}
                  alt={t("plans.card.image.alt", planVars(item))}
                  className="aspect-video w-full"
                />
                <p className="px-3 py-3">{item.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Row({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div>
      <dt className="text-muted">{k}</dt>
      <dd className="tabular-nums">{v}</dd>
      {sub ? <dd className="text-xs text-muted tabular-nums">{sub}</dd> : null}
    </div>
  );
}
