import { Link } from "@tanstack/react-router";
import { buttonStyles } from "@/components/site/chrome";
import { SiteModel } from "@/components/site/site-model";
import { GlaLink, PlanImage } from "@/components/site/plan-image";
import {
  Img,
  LotStatusBadge,
  T,
  Tx,
  lotVars,
  planVars,
  useSiteData,
  useText,
} from "@/components/site/text";
import { lotAreaLabel, modelPlan, showcasePlans } from "@/data/site";
import { GLA_PLANS_URL } from "@/data/site-config";

export function HomeHero() {
  // Home shows ONLY the flagged model home + up to 3 featured plans, never the
  // rest of the collection (even when the admin makes more plans visible).

  return (
    <section className="grid border-b border-line lg:min-h-screen lg:grid-cols-12">
      <div className="order-2 flex flex-col justify-between px-5 py-10 sm:px-8 lg:order-1 lg:col-span-5 lg:py-14">
        <div>
          <p className="text-xs uppercase tracking-widest text-copper">
            <Tx k="home.hero.eyebrow" />
          </p>
          <p className="mt-2 text-sm text-muted">
            <Tx k="home.hero.subeyebrow" />
          </p>
          <h1 className="mt-6 text-5xl leading-tight sm:text-6xl">
            <Tx k="home.hero.h1" />
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            <T k="home.hero.body" />
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/contact" search={{ form: "tour" }} className={buttonStyles("primary")}>
              <Tx k="home.hero.button1" />
            </Link>
            <Link to="/homes" className={buttonStyles("quiet")}>
              <Tx k="home.hero.button2" />
            </Link>
          </div>
        </div>
        <dl className="mt-12 grid grid-cols-3 gap-4 border-t border-line pt-6">
          {[1, 2, 3].map((n) => (
            <Stat
              key={n}
              k={<Tx k={`home.hero.stat${n}.label`} />}
              v={<Tx k={`home.hero.stat${n}.value`} />}
            />
          ))}
        </dl>
      </div>
      <div className="relative order-1 min-h-80 sm:min-h-96 lg:order-2 lg:col-span-7">
        <Img
          srcKey="home.hero.image.src"
          altKey="home.hero.image.alt"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </section>
  );
}

export function HomeOffer() {
  // Home shows ONLY the flagged model home + up to 3 featured plans, never the
  // rest of the collection (even when the admin makes more plans visible).

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <p className="text-xs uppercase tracking-widest text-copper">
          <Tx k="home.offer.eyebrow" />
        </p>
        <h2 className="mt-3 text-4xl">
          <Tx k="home.offer.h2" />
        </h2>
      </div>
      <div className="grid gap-8 sm:grid-cols-3 lg:col-span-8">
        {[1, 2, 3].map((n) => (
          <Point
            key={n}
            n={<Tx k={`home.offer.card${n}.number`} />}
            title={<Tx k={`home.offer.card${n}.title`} />}
            bodyKey={`home.offer.card${n}.body`}
          />
        ))}
      </div>
    </section>
  );
}

export function HomePlans() {
  const t = useText();
  const { plans } = useSiteData();
  // Home shows ONLY the flagged model home + up to 3 featured plans, never the
  // rest of the collection (even when the admin makes more plans visible).
  const model = modelPlan(plans);
  const showcase = showcasePlans(plans);

  return (
    <section className="border-y border-line bg-cream" data-home-plans>
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-copper">
              <Tx k="home.plans.eyebrow" />
            </p>
            <h2 className="mt-3 text-4xl">
              <Tx k="home.plans.h2" />
            </h2>
            <p className="mt-2 text-sm text-muted">
              <Tx k="home.plans.gla.line" />
            </p>
          </div>
          <Link
            to="/plans"
            className="hidden min-h-11 items-center text-sm underline sm:inline-flex"
          >
            <Tx k="home.plans.link" />
          </Link>
        </div>
        {model ? (
          <div
            className="mt-8 grid border border-line bg-paper lg:grid-cols-12"
            data-model-home={model.slug}
          >
            <PlanImage
              plan={model}
              alt={t("home.model.image.alt", planVars(model))}
              caption={t("home.model.image.placeholder", planVars(model))}
              className="min-h-72 lg:col-span-7"
            />
            <div className="flex flex-col justify-between p-5 lg:col-span-5 lg:p-8">
              <div>
                <p className="text-xs uppercase tracking-widest text-copper">
                  <Tx k="home.model.eyebrow" />
                </p>
                <h3 className="mt-2 text-4xl">
                  <Tx k="home.model.h2" vars={planVars(model)} />
                </h3>
                <p className="mt-3 text-muted">
                  <T k="home.model.body" vars={planVars(model)} />
                </p>
                <p className="mt-4 text-sm tabular-nums">
                  <Tx k="home.model.specs" vars={planVars(model)} />
                </p>
                <p className="mt-2 text-xs text-muted">
                  <Tx k="home.model.credit" /> ·{" "}
                  <GlaLink
                    href={model.glaUrl}
                    title={t("home.plans.card.link.title")}
                    className="underline underline-offset-2"
                  >
                    <Tx k="home.model.link" />
                  </GlaLink>
                </p>
                <ul className="mt-5 grid gap-2 border-t border-line pt-4 text-sm">
                  {(["address", "hours", "price"] as const).map((k) => (
                    <li key={k}>
                      <T k={`home.model.visit.${k}`} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/contact"
                  search={{ form: "tour", plan: model.slug, interest: model.name }}
                  className={buttonStyles("primary")}
                >
                  <Tx k="home.model.button1" />
                </Link>
                <Link to="/plans" hash="model-home" className={buttonStyles("quiet")}>
                  <Tx k="home.model.button2" />
                </Link>
              </div>
            </div>
          </div>
        ) : null}
        <ul className="mt-6 grid gap-6 md:grid-cols-3" data-home-showcase>
          {showcase.map((plan) => {
            const v = planVars(plan);
            return (
              <li key={plan.slug} className="flex flex-col" data-plan={plan.slug}>
                <Link to="/plans/$slug" params={{ slug: plan.slug }} className="group block">
                  <PlanImage
                    plan={plan}
                    alt={t("home.plans.card.image.alt", v)}
                    caption={t("home.plans.card.image.placeholder", v)}
                    className="aspect-video w-full"
                  />
                </Link>
                <div className="flex flex-1 flex-col justify-between gap-4 border border-t-0 border-line bg-paper px-4 py-4">
                  <div>
                    <h3 className="text-2xl">
                      <Link
                        to="/plans/$slug"
                        params={{ slug: plan.slug }}
                        className="hover:text-copper"
                      >
                        <Tx k="home.plans.card.title" vars={v} />
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      <Tx k="home.plans.card.specs" vars={v} />
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      <Tx k="home.plans.card.summary" vars={v} />
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      <Tx k="home.plans.card.credit" vars={v} />
                    </p>
                  </div>
                  <GlaLink
                    href={plan.glaUrl}
                    title={t("home.plans.card.link.title", v)}
                    className="min-h-11 self-start text-sm underline"
                  >
                    <Tx k="home.plans.card.link" vars={v} />
                  </GlaLink>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <GlaLink href={GLA_PLANS_URL} className={buttonStyles("quiet")}>
            <Tx k="home.plans.collection.button" />
          </GlaLink>
          <Link
            to="/plans"
            className="inline-flex min-h-11 items-center text-sm underline sm:hidden"
          >
            <Tx k="home.plans.link" />
          </Link>
          <p className="text-sm text-muted">
            <T k="home.plans.fit.line" />
          </p>
        </div>
        <div
          className="mt-10 flex flex-col items-start gap-4 bg-pine px-5 py-8 text-cream sm:flex-row sm:items-center sm:justify-between sm:px-8"
          data-agent-cta
        >
          <div>
            <h3 className="text-3xl">
              <Tx k="home.plans.agent_cta.h3" />
            </h3>
            <p className="mt-2 max-w-xl text-paper-deep">
              <T k="home.plans.agent_cta.body" />
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex min-h-11 items-center border border-cream bg-cream px-5 text-sm text-ink"
            >
              <Tx k="home.plans.agent_cta.button1" />
            </Link>
            <Link
              to="/contact"
              search={{ form: "tour" }}
              className="inline-flex min-h-11 items-center border border-cream px-5 text-sm"
            >
              <Tx k="home.plans.agent_cta.button2" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeSiteModel() {
  // Home shows ONLY the flagged model home + up to 3 featured plans, never the
  // rest of the collection (even when the admin makes more plans visible).

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-copper">
            <Tx k="home.sitemodel.eyebrow" />
          </p>
          <h2 className="mt-3 text-4xl">
            <Tx k="home.sitemodel.h2" />
          </h2>
        </div>
        <Link
          to="/community"
          className="hidden min-h-11 items-center text-sm underline sm:inline-flex"
        >
          <Tx k="home.sitemodel.link" />
        </Link>
      </div>
      <SiteModel />
    </section>
  );
}

export function HomePhase1() {
  const t = useText();
  const { lots } = useSiteData();
  // Home shows ONLY the flagged model home + up to 3 featured plans, never the
  // rest of the collection (even when the admin makes more plans visible).

  return (
    <section className="border-y border-line">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-xs uppercase tracking-widest text-copper">
          <Tx k="home.phase1.eyebrow" />
        </p>
        <h2 className="mt-3 text-4xl">
          <Tx k="home.phase1.h2" />
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lots.map((lot) => (
            <li key={lot.id} className="border border-line bg-cream p-4" data-lot={lot.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs uppercase tracking-widest text-copper">{lot.street}</p>
                <LotStatusBadge status={lot.status} />
              </div>
              <h3 className="mt-2 text-3xl">
                {t(`home.phase1.card${lot.id}.title`) ? (
                  <Tx k={`home.phase1.card${lot.id}.title`} />
                ) : (
                  `Lot ${lot.id}`
                )}
              </h3>
              <p className="mt-2 text-sm text-muted">{lotAreaLabel(lot)}</p>
              <Link
                to="/homes/$slug"
                params={{ slug: lot.slug }}
                className="mt-4 inline-flex min-h-11 items-center text-sm underline"
              >
                <Tx k="home.phase1.card.link" vars={lotVars(lot)} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function HomeStudio() {
  // Home shows ONLY the flagged model home + up to 3 featured plans, never the
  // rest of the collection (even when the admin makes more plans visible).

  return (
    <section className="grid lg:grid-cols-2">
      <div className="relative min-h-80">
        <Img
          srcKey="home.studio.image.src"
          altKey="home.studio.image.alt"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col justify-center bg-pine px-5 py-14 text-cream sm:px-10">
        <p className="text-xs uppercase tracking-widest text-copper">
          <Tx k="home.studio.eyebrow" />
        </p>
        <h2 className="mt-3 text-4xl">
          <Tx k="home.studio.h2" />
        </h2>
        <p className="mt-4 max-w-md text-paper-deep">
          <T k="home.studio.body" />
        </p>
        <Link
          to="/design-studio"
          className="mt-8 inline-flex min-h-11 items-center justify-center self-start border border-cream px-5 text-sm"
        >
          <Tx k="home.studio.button" />
        </Link>
      </div>
    </section>
  );
}

export function HomeProcess() {
  // Home shows ONLY the flagged model home + up to 3 featured plans, never the
  // rest of the collection (even when the admin makes more plans visible).

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <p className="text-xs uppercase tracking-widest text-copper">
        <Tx k="home.process.eyebrow" />
      </p>
      <h2 className="mt-3 text-4xl">
        <Tx k="home.process.h2" />
      </h2>
      <ol className="mt-8 grid gap-6 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map((n) => (
          <li key={n} className="border-t border-line pt-4">
            <p className="font-display text-2xl text-copper">
              <Tx k={`home.process.step${n}.number`} />
            </p>
            <h3 className="mt-2 text-xl">
              <Tx k={`home.process.step${n}.title`} />
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              <T k={`home.process.step${n}.body`} />
            </p>
          </li>
        ))}
      </ol>
      <Link to="/process" className="mt-8 inline-flex min-h-11 items-center text-sm underline">
        <Tx k="home.process.link" />
      </Link>
    </section>
  );
}

function Stat({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted">{k}</dt>
      <dd className="mt-1 font-display text-3xl tabular-nums">{v}</dd>
    </div>
  );
}

function Point({
  n,
  title,
  bodyKey,
}: {
  n: React.ReactNode;
  title: React.ReactNode;
  bodyKey: string;
}) {
  return (
    <div>
      <p className="font-display text-xl text-copper">{n}</p>
      <h3 className="mt-2 text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        <T k={bodyKey} />
      </p>
    </div>
  );
}
