import { Link } from "@tanstack/react-router";
import { useDetailLot } from "@/site/detail";
import { InquiryForm } from "@/components/site/inquiry-form";
import {
  Img,
  LotStatusBadge,
  T,
  Tx,
  ValueText,
  lotVars,
  useSiteData,
} from "@/components/site/text";
import { hasText } from "@/lib/has-text";

export function LotDetailHero() {
  const lot = useDetailLot();
  if (!lot) return null;
  const v = lotVars(lot);

  return (
    <section className="grid lg:grid-cols-2">
      <Img
        srcKey="homes.detail.image.src"
        altKey="homes.detail.image.alt"
        altVars={v}
        className="h-80 w-full object-cover lg:h-full"
      />
      <div className="px-5 py-12 sm:px-10">
        <p className="text-xs uppercase tracking-widest text-copper">
          <Tx k="homes.detail.eyebrow" vars={v} />
        </p>
        <h1 className="mt-3 text-5xl">
          <Tx k="homes.detail.h1" vars={v} />
        </h1>
        <p className="mt-4 text-lg text-muted">
          <T k="homes.detail.note" vars={v} />
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <Spec label={<Tx k="homes.detail.specs.area.label" />}>
            <T k="homes.detail.specs.area.value" vars={v} />
          </Spec>
          <Spec label={<Tx k="homes.detail.specs.street.label" />}>
            <T k="homes.detail.specs.street.value" vars={v} />
          </Spec>
          {lot.frontage ? (
            <Spec label="Frontage · depth">
              {lot.frontage} · {lot.depth}
            </Spec>
          ) : null}
          <Spec label={<Tx k="homes.detail.specs.release.label" />}>
            <T k="homes.detail.specs.release.value" vars={v} />
          </Spec>
          <Spec label={<Tx k="homes.detail.specs.status.label" />}>
            <LotStatusBadge status={lot.status} />
          </Spec>
          <Spec label={<Tx k="homes.detail.specs.premium.label" />}>
            <ValueText k="homes.detail.specs.premium.value" value={lot.premium} vars={v} />
          </Spec>
          <Spec label={<Tx k="homes.detail.specs.price.label" />}>
            <ValueText k="homes.detail.specs.price.value" value={lot.priceText} vars={v} />
          </Spec>
        </dl>
        <p className="mt-4 text-xs text-muted">
          <T k="homes.detail.specs.footnote" vars={v} />
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6">
          <Link to="/community" className="inline-flex min-h-11 items-center text-sm underline">
            <Tx k="homes.detail.button1" vars={v} />
          </Link>
          <a href="#request" className="inline-flex min-h-11 items-center text-sm underline">
            {lot.status === "available" ? (
              <Tx k="homes.detail.button2" vars={v} />
            ) : (
              <Tx k="homes.card.button.alt" vars={v} />
            )}
          </a>
        </div>
      </div>
    </section>
  );
}

export function LotDetailForm() {
  const lot = useDetailLot();
  if (!lot) return null;
  const v = lotVars(lot);

  return (
    <section id="request" className="scroll-mt-20 border-t border-line bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-3xl">
          {lot.status === "available" ? (
            <Tx k="homes.detail.form.h3" vars={v} />
          ) : (
            <Tx k="homes.card.button.alt" vars={v} />
          )}
        </h2>
        <div className="mt-8">
          <InquiryForm
            initialType={lot.status === "available" ? "reservation" : "contact"}
            lotId={lot.id}
          />
        </div>
        <LotNextSteps vars={v} />
      </div>
    </section>
  );
}

function Spec({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Round 7: "After you request lot {lot}", three short steps + a link to /process. Hidden until it has text. */
function LotNextSteps({ vars }: { vars: ReturnType<typeof lotVars> }) {
  const { blocks } = useSiteData();
  if (!hasText(blocks, "homes.detail.next.h3")) return null;
  const steps = [1, 2, 3].filter((n) => hasText(blocks, `homes.detail.next.step${n}`));
  return (
    <div className="mt-10 max-w-3xl border-t border-line pt-6" data-lot-next>
      <h3 className="text-2xl">
        <Tx k="homes.detail.next.h3" vars={vars} />
      </h3>
      <ol className="mt-4 grid gap-3 text-sm leading-relaxed text-muted">
        {steps.map((n) => (
          <li key={n} className="flex gap-3">
            <span className="font-display text-lg text-copper" aria-hidden>
              {n}
            </span>
            <span>
              <T k={`homes.detail.next.step${n}`} vars={vars} />
            </span>
          </li>
        ))}
      </ol>
      {hasText(blocks, "homes.detail.next.link") ? (
        <Link to="/process" className="mt-4 inline-flex min-h-11 items-center text-sm underline">
          <Tx k="homes.detail.next.link" vars={vars} />
        </Link>
      ) : null}
    </div>
  );
}
