import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { buttonStyles } from "@/components/site/chrome";
import { GlaLink, PlanImage } from "@/components/site/plan-image";
import { T, ValueText, planVars, seoHead, useSiteData, useText } from "@/components/site/text";
import { modelPlan, showcasePlans, type Plan } from "@/data/site";
import { GLA_PLANS_URL } from "@/data/site-config";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/plans/")({
  component: PlansPage,
  head: seoHead("plans"),
});

const MODEL_SPECS = ["plan", "stories", "beds", "baths", "area", "garage", "size"] as const;

/**
 * /plans: model home → showcase (3 featured plans) → more plans (every other
 * visible plan) → how it works → customizing → agent CTA. Which plan is the
 * model and which are featured comes from the admin's plan flags.
 */
function PlansPage() {
  const t = useText();
  const { plans } = useSiteData();
  const [filter, setFilter] = useState("all");
  const model = modelPlan(plans);
  const showcase = showcasePlans(plans);
  const pinned = new Set([model?.slug, ...showcase.map((p) => p.slug)]);
  const more = plans.filter((p) => !pinned.has(p.slug));

  // Chips filter the showcase and "More plans" cards: All, then one per bedroom count.
  const bedCounts = [...new Set([...showcase, ...more].map((p) => p.beds))].sort((a, b) => a - b);
  const filters = [
    { id: "all", label: t("plans.index.chip.all") },
    ...bedCounts.map((n) => ({ id: String(n), label: t(`plans.index.chip.${n}bed`) || `${n} bed` })),
  ];
  const match = (plan: Plan) => filter === "all" || String(plan.beds) === filter;
  const showcaseVisible = showcase.filter(match);
  const moreVisible = more.filter(match);
  const chips = (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter plans by bedrooms">
      {filters.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={filter === item.id}
          onClick={() => setFilter(item.id)}
          className={cn(
            "min-h-11 border px-4 text-sm",
            filter === item.id ? "border-ink bg-ink text-cream" : "border-line bg-cream text-ink",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-14">
        <p className="text-xs uppercase tracking-widest text-copper">{t("plans.index.eyebrow")}</p>
        <h1 className="mt-3 text-5xl">{t("plans.index.h2")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          <T k="plans.index.body" />
        </p>
        <p className="mt-3 text-sm text-muted">{t("plans.index.gla.line")}</p>
        <p className="mt-1 text-sm text-muted">
          <T k="plans.index.fit.line" />
        </p>
        <p className="mt-1 text-sm text-muted">
          <T k="plans.index.price.note" />
        </p>
      </section>

      {model ? (
        <section id="model-home" className="scroll-mt-20 border-y border-line bg-cream" data-model-home={model.slug}>
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <PlanImage
                plan={model}
                alt={t("plans.model.image.alt", planVars(model))}
                caption={t("plans.model.image.placeholder", planVars(model))}
                className="aspect-[4/3] w-full border border-line"
              />
              <p className="mt-3 text-xs text-muted">
                {t("plans.model.credit")} ·{" "}
                <GlaLink href={model.glaUrl} title={t("plans.card.link.title")} className="underline underline-offset-2">
                  {t("plans.model.link")}
                </GlaLink>
              </p>
            </div>
            <div className="lg:col-span-5">
              <p className="text-xs uppercase tracking-widest text-copper">{t("plans.model.eyebrow")}</p>
              <h2 className="mt-3 text-5xl">{t("plans.model.h2", planVars(model))}</h2>
              <p className="mt-4 text-muted">
                <T k="plans.model.body" vars={planVars(model)} />
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-sm">
                {MODEL_SPECS.map((k) => (
                  <div key={k} className={k === "area" ? "col-span-2" : undefined}>
                    <dt className="text-muted">{t(`plans.model.specs.${k}.label`)}</dt>
                    <dd className="tabular-nums">{t(`plans.model.specs.${k}.value`, planVars(model))}</dd>
                  </div>
                ))}
              </dl>
              <h3 className="mt-6 text-2xl">{t("plans.model.visit.h3")}</h3>
              <dl className="mt-3 grid gap-2 text-sm">
                {(["address", "hours", "price"] as const).map((k) => (
                  <div key={k} className="flex gap-3">
                    <dt className="w-20 shrink-0 text-muted">{t(`plans.model.visit.${k}.label`)}</dt>
                    <dd>
                      <T k={`plans.model.visit.${k}.value`} />
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/contact" search={{ form: "tour", plan: model.slug, interest: model.name }} className={buttonStyles("primary")}>
                  {t("plans.model.button1")}
                </Link>
                <Link to="/contact" search={{ form: "contact", plan: model.slug, interest: model.name }} className={buttonStyles("quiet")}>
                  {t("plans.model.button2", planVars(model))}
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-5 py-14" data-plans-showcase>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-copper">{t("plans.showcase.eyebrow")}</p>
            <h2 className="mt-3 text-4xl">{t("plans.showcase.h2")}</h2>
            <p className="mt-3 max-w-2xl text-muted">
              <T k="plans.showcase.body" />
            </p>
          </div>
          {chips}
        </div>
        <ul className="mt-8 grid gap-8">
          {showcaseVisible.map((plan) => (
            <ShowcaseCard key={plan.slug} plan={plan} />
          ))}
        </ul>
        {showcaseVisible.length === 0 ? <p className="mt-8 text-muted">No plan at that size here.</p> : null}
      </section>

      {more.length > 0 ? (
        <section className="border-t border-line" data-plans-more>
          <div className="mx-auto max-w-6xl px-5 py-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-copper">{t("plans.more.eyebrow")}</p>
                <h2 className="mt-3 text-4xl">{t("plans.more.h2")}</h2>
                <p className="mt-3 max-w-2xl text-muted">
                  <T k="plans.more.intro" />
                </p>
              </div>
              <GlaLink href={GLA_PLANS_URL} className={buttonStyles("quiet")}>
                {t("plans.more.button")}
              </GlaLink>
            </div>
            <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {moreVisible.map((plan) => (
                <CompactCard key={plan.slug} plan={plan} />
              ))}
            </ul>
            {moreVisible.length === 0 ? <p className="mt-8 text-muted">No plan at that size here.</p> : null}
          </div>
        </section>
      ) : null}

      <section className="border-y border-line bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <p className="text-xs uppercase tracking-widest text-copper">{t("plans.how.eyebrow")}</p>
          <h2 className="mt-3 text-4xl">{t("plans.how.h2")}</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="border-t border-line pt-4">
                <p className="font-display text-2xl text-copper">{t(`plans.how.step${n}.number`)}</p>
                <h3 className="mt-2 text-xl">{t(`plans.how.step${n}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  <T k={`plans.how.step${n}.body`} />
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-xs uppercase tracking-widest text-copper">{t("plans.customize.eyebrow")}</p>
          <h2 className="mt-3 text-4xl">{t("plans.customize.h2")}</h2>
        </div>
        <p className="text-lg leading-relaxed text-muted lg:col-span-7 lg:pt-8">
          <T k="plans.customize.body" />
        </p>
      </section>

      <section className="border-t border-line bg-pine text-cream" data-agent-cta>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-copper">{t("plans.agent.eyebrow")}</p>
            <h2 className="mt-3 text-4xl">{t("plans.agent.h2")}</h2>
            <p className="mt-4 max-w-2xl text-paper-deep">
              <T k="plans.agent.body" />
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/contact" className="inline-flex min-h-11 items-center border border-cream bg-cream px-5 text-sm text-ink">
              {t("plans.agent.button1")}
            </Link>
            <Link to="/contact" search={{ form: "tour" }} className="inline-flex min-h-11 items-center border border-cream px-5 text-sm">
              {t("plans.agent.button2")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/** Large row card (showcase). Primary button → the plan's page on GLA (new tab). */
function ShowcaseCard({ plan }: { plan: Plan }) {
  const t = useText();
  const v = planVars(plan);
  return (
    <li className="grid border border-line lg:grid-cols-12" data-plan={plan.slug}>
      <PlanImage
        plan={plan}
        alt={t("plans.card.image.alt", v)}
        caption={t("plans.card.image.placeholder", v)}
        className="min-h-64 lg:col-span-6"
      />
      <div className="flex flex-col justify-between p-5 lg:col-span-6 lg:p-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-copper">{t("plans.card.planno", v)}</p>
          <h3 className="mt-2 text-4xl">{t("plans.card.title", v)}</h3>
          <p className="mt-3 text-muted">{t("plans.card.summary", v)}</p>
          <p className="mt-1 text-sm text-muted">{t("plans.card.specs", v)}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Spec k={t("plans.detail.specs.beds.label")} v={t("plans.detail.specs.beds.value", v)} />
            <Spec k={t("plans.detail.specs.baths.label")} v={t("plans.detail.specs.baths.value", v)} />
            <Spec k={t("plans.detail.specs.area.label")} v={t("plans.detail.specs.area.value", v)} />
            <Spec k={t("plans.detail.specs.garage.label")} v={t("plans.detail.specs.garage.value", v)} />
          </dl>
          <p className="mt-4 text-xs text-muted">{t("plans.card.credit", v)}</p>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="tabular-nums">
            <ValueText k="plans.card.price" value={plan.priceText} vars={v} />
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/plans/$slug" params={{ slug: plan.slug }} className="inline-flex min-h-11 items-center text-sm underline">
              {t("plans.card.details", v)}
            </Link>
            <GlaLink href={plan.glaUrl} title={t("plans.card.link.title", v)} className="min-h-11 bg-pine px-5 text-sm text-cream">
              {t("plans.card.link", v)}
            </GlaLink>
          </div>
        </div>
      </div>
    </li>
  );
}

/** Compact grid card ("More plans to explore"). Same template, smaller footprint. */
function CompactCard({ plan }: { plan: Plan }) {
  const t = useText();
  const v = planVars(plan);
  return (
    <li className="flex flex-col" data-plan={plan.slug}>
      <PlanImage
        plan={plan}
        alt={t("plans.card.image.alt", v)}
        caption={t("plans.card.image.placeholder", v)}
        className="aspect-video w-full border border-line"
      />
      <div className="flex flex-1 flex-col justify-between gap-4 border border-t-0 border-line bg-cream px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-copper">{t("plans.card.planno", v)}</p>
          <h3 className="mt-1 text-2xl">{t("plans.card.title", v)}</h3>
          <p className="mt-1 text-sm text-muted">{t("plans.card.specs", v)}</p>
          <p className="mt-1 text-sm text-muted">{t("plans.card.summary", v)}</p>
          <p className="mt-2 text-sm tabular-nums">
            <ValueText k="plans.card.price" value={plan.priceText} vars={v} />
          </p>
          <p className="mt-1 text-xs text-muted">{t("plans.card.credit", v)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <GlaLink href={plan.glaUrl} title={t("plans.card.link.title", v)} className="min-h-11 bg-pine px-4 text-sm text-cream">
            {t("plans.card.link", v)}
          </GlaLink>
          <Link to="/plans/$slug" params={{ slug: plan.slug }} className="inline-flex min-h-11 items-center text-sm underline">
            {t("plans.card.details", v)}
          </Link>
        </div>
      </div>
    </li>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-muted">{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
