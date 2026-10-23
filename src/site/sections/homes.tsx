import { Link } from "@tanstack/react-router";
import {
  LotStatusBadge,
  RichText,
  T,
  Tx,
  ValueText,
  lotVars,
  useSiteData,
  useText,
} from "@/components/site/text";

export function HomesLots() {
  const t = useText();
  const { blocks, lots } = useSiteData();
  const body = blocks["homes.index.body"] ?? "";
  const cta = t("global.cta.waitlist");
  const at = body.lastIndexOf(cta);
  const futureOpen = !/^(no|off|false|closed)$/i.test(
    (blocks["homes.future.open"] ?? "yes").trim(),
  );

  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <p className="text-xs uppercase tracking-widest text-copper">
        <Tx k="homes.index.eyebrow" />
      </p>
      <h1 className="mt-3 text-5xl">
        <Tx k="homes.index.h2" />
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        {at >= 0 ? (
          <>
            <RichText text={body.slice(0, at)} />
            <Link
              to="/contact"
              search={{ form: "waitlist" }}
              className="underline underline-offset-2"
            >
              {cta}
            </Link>
            <RichText text={body.slice(at + cta.length)} />
          </>
        ) : (
          <RichText text={body} />
        )}
      </p>
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {lots.map((lot) => {
          const v = lotVars(lot);
          const open = lot.status === "available";
          return (
            <li key={lot.id} className="border border-line bg-cream p-5" data-lot={lot.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs uppercase tracking-widest text-copper">
                  <Tx k="homes.card.street" vars={v} />
                </p>
                <LotStatusBadge status={lot.status} />
              </div>
              <h2 className="mt-2 text-4xl">
                <Link to="/homes/$slug" params={{ slug: lot.slug }} className="hover:text-copper">
                  <Tx k="homes.card.title" vars={v} />
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted">
                <Tx k="homes.card.area" vars={v} />
              </p>
              {lot.frontage ? (
                <p className="mt-1 text-xs text-muted">
                  Frontage {lot.frontage} · depth {lot.depth}
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-relaxed">
                <T k="homes.card.note" vars={v} />
              </p>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>
                  <ValueText k="homes.card.price" value={lot.priceText} vars={v} />
                </span>
                <span className="text-muted">
                  <ValueText k="homes.card.premium" value={lot.premium} vars={v} />
                </span>
              </p>
              <Link
                to="/homes/$slug"
                params={{ slug: lot.slug }}
                hash="request"
                className="mt-4 inline-flex min-h-11 items-center text-sm underline"
              >
                {open ? (
                  <Tx k="homes.card.button" vars={v} />
                ) : (
                  <Tx k="homes.card.button.alt" vars={v} />
                )}
              </Link>
            </li>
          );
        })}
        {futureOpen ? (
          <li className="border border-dashed border-line bg-paper p-5" data-future-section="">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs uppercase tracking-widest text-copper">
                <Tx k="homes.future.eyebrow" />
              </p>
              <span className="inline-flex items-center border border-ink px-2 py-0.5 text-xs uppercase tracking-widest">
                <Tx k="homes.future.status" />
              </span>
            </div>
            <h2 className="mt-2 text-4xl">
              <Tx k="homes.future.title" />
            </h2>
            <p className="mt-3 text-sm leading-relaxed">
              <T k="homes.future.body" />
            </p>
            <Link
              to="/contact"
              search={{ form: "waitlist" }}
              className="mt-4 inline-flex min-h-11 items-center text-sm underline"
            >
              {cta}
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
