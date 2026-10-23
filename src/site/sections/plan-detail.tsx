import { Link } from "@tanstack/react-router";
import { useDetailPlan } from "@/site/detail";
import { InquiryForm } from "@/components/site/inquiry-form";
import { buttonStyles } from "@/components/site/chrome";
import { GlaLink, PlanImage } from "@/components/site/plan-image";
import { T, Tx, ValueText, planVars, textOf, useSiteData, useText } from "@/components/site/text";

export function PlanDetailHero() {
  const t = useText();
  const plan = useDetailPlan();
  const { blocks } = useSiteData();
  if (!plan) return null;
  const v = planVars(plan);
  const specs = ["beds", "baths", "area", "garage", "stories", "width"] as const;
  // Round 6b: note for the model plan (our modified version of GLA's plan).
  // Empty by default, so it only shows once the text is set and published.
  const modelNote = plan.isModel && textOf(blocks, "plans.detail.model.note").trim() !== "";

  return (
    <section className="grid lg:grid-cols-12">
      <div className="px-5 py-12 sm:px-8 lg:col-span-5 lg:py-16">
        <p className="text-xs uppercase tracking-widest text-copper">
          <Tx k="plans.detail.eyebrow" vars={v} />
        </p>
        <h1 className="mt-3 text-5xl">
          <Tx k="plans.detail.h1" vars={v} />
        </h1>
        <p className="mt-4 text-lg text-muted">
          <T k="plans.detail.body" vars={v} />
        </p>
        {modelNote ? (
          <p className="mt-3 text-sm text-muted" data-model-note>
            <T k="plans.detail.model.note" vars={v} />
          </p>
        ) : null}
        <p className="mt-6 font-display text-3xl tabular-nums">
          <ValueText k="plans.detail.price" value={plan.priceText} vars={v} />
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-6 text-sm">
          {specs.map((key) => (
            <Row
              key={key}
              k={<Tx k={`plans.detail.specs.${key}.label`} />}
              v={<Tx k={`plans.detail.specs.${key}.value`} vars={v} />}
              sub={key === "area" ? <Tx k="plans.detail.specs.area.floors" vars={v} /> : undefined}
            />
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <GlaLink
            href={plan.glaUrl}
            title={t("plans.detail.gla.link.title", v)}
            className={buttonStyles("primary")}
          >
            <Tx k="plans.detail.gla.link" vars={v} />
          </GlaLink>
          <p className="text-sm text-muted">
            <Tx k="plans.detail.credit" vars={v} />
          </p>
        </div>
      </div>
      <PlanImage
        plan={plan}
        alt={t("plans.detail.image.alt", v)}
        caption={t("plans.detail.image.placeholder", v)}
        className="min-h-80 lg:col-span-7"
      />
    </section>
  );
}

export function PlanDetailGallery() {
  const t = useText();
  const plan = useDetailPlan();
  if (!plan) return null;
  const v = planVars(plan);

  return (
    <section className="border-y border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl">
            <Tx k="plans.detail.gallery.h3" vars={v} />
          </h2>
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
          <GlaLink
            href={plan.glaUrl}
            title={t("plans.detail.gla.link.title", v)}
            className="mt-4 min-h-11 text-sm underline"
          >
            <Tx k="plans.detail.gla.link" vars={v} />
          </GlaLink>
        </div>
        <div>
          <h2 className="text-3xl">
            <Tx k="plans.detail.features.h3" vars={v} />
          </h2>
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
  );
}

export function PlanDetailForm() {
  const plan = useDetailPlan();
  if (!plan) return null;
  const v = planVars(plan);

  return (
    <section className="border-t border-line bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-3xl">
          <Tx k="plans.detail.form.h3" vars={v} />
        </h2>
        <div className="mt-8">
          <InquiryForm initialType="contact" interest={plan.name} planSlug={plan.slug} />
        </div>
      </div>
    </section>
  );
}

export function PlanDetailOthers() {
  const t = useText();
  const { plans } = useSiteData();
  const plan = useDetailPlan();
  if (!plan) return null;
  const v = planVars(plan);
  const others = plans.filter((item) => item.slug !== plan.slug).slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <h2 className="text-3xl">
        <Tx k="plans.detail.other.h3" vars={v} />
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {others.map((item) => (
          <li key={item.slug}>
            <Link
              to="/plans/$slug"
              params={{ slug: item.slug }}
              className="block border border-line"
            >
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
  );
}

function Row({ k, v, sub }: { k: React.ReactNode; v: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted">{k}</dt>
      <dd className="tabular-nums">{v}</dd>
      {sub ? <dd className="text-xs text-muted tabular-nums">{sub}</dd> : null}
    </div>
  );
}
