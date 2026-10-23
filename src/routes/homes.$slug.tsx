import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { InquiryForm } from "@/components/site/inquiry-form";
import { LotStatusBadge, T, ValueText, lotVars, seoHead, useSiteData, useText } from "@/components/site/text";
import { homeBySlug } from "@/data/site";

export const Route = createFileRoute("/homes/$slug")({
  component: HomeDetail,
  head: seoHead("homes.detail", (params, data) => {
    const lot = data.lots.find((l) => l.slug === params.slug) ?? homeBySlug(params.slug);
    return lot ? lotVars(lot) : { lot: params.slug };
  }),
});

function HomeDetail() {
  const { slug } = Route.useParams();
  const t = useText();
  const { lots } = useSiteData();
  const lot = lots.find((l) => l.slug === slug);
  if (!lot) throw notFound();
  const v = lotVars(lot);

  return (
    <>
      <section className="grid lg:grid-cols-2">
        <img
          src={t("homes.detail.image.src")}
          alt={t("homes.detail.image.alt", v)}
          className="h-80 w-full object-cover lg:h-full"
        />
        <div className="px-5 py-12 sm:px-10">
          <p className="text-xs uppercase tracking-widest text-copper">{t("homes.detail.eyebrow", v)}</p>
          <h1 className="mt-3 text-5xl">{t("homes.detail.h1", v)}</h1>
          <p className="mt-4 text-lg text-muted">
            <T k="homes.detail.note" vars={v} />
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <Spec label={t("homes.detail.specs.area.label")}>
              <T k="homes.detail.specs.area.value" vars={v} />
            </Spec>
            <Spec label={t("homes.detail.specs.street.label")}>
              <T k="homes.detail.specs.street.value" vars={v} />
            </Spec>
            {lot.frontage ? (
              <Spec label="Frontage · depth">
                {lot.frontage} · {lot.depth}
              </Spec>
            ) : null}
            <Spec label={t("homes.detail.specs.release.label")}>
              <T k="homes.detail.specs.release.value" vars={v} />
            </Spec>
            <Spec label={t("homes.detail.specs.status.label")}>
              <LotStatusBadge status={lot.status} />
            </Spec>
            <Spec label={t("homes.detail.specs.premium.label")}>
              <ValueText k="homes.detail.specs.premium.value" value={lot.premium} vars={v} />
            </Spec>
            <Spec label={t("homes.detail.specs.price.label")}>
              <ValueText k="homes.detail.specs.price.value" value={lot.priceText} vars={v} />
            </Spec>
          </dl>
          <p className="mt-4 text-xs text-muted">
            <T k="homes.detail.specs.footnote" vars={v} />
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6">
            <Link to="/community" className="inline-flex min-h-11 items-center text-sm underline">
              {t("homes.detail.button1", v)}
            </Link>
            <a href="#request" className="inline-flex min-h-11 items-center text-sm underline">
              {lot.status === "available" ? t("homes.detail.button2", v) : t("homes.card.button.alt", v)}
            </a>
          </div>
        </div>
      </section>
      <section id="request" className="scroll-mt-20 border-t border-line bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-3xl">
            {lot.status === "available" ? t("homes.detail.form.h3", v) : t("homes.card.button.alt", v)}
          </h2>
          <div className="mt-8">
            <InquiryForm initialType={lot.status === "available" ? "reservation" : "contact"} lotId={lot.id} />
          </div>
        </div>
      </section>
    </>
  );
}

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
