import { Link } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/chrome";
import { T, Tx, useSiteData } from "@/components/site/text";
import { hasText } from "@/lib/has-text";

export function AboutIntro() {
  return (
    <PageIntro
      eyebrow={<Tx k="about.intro.eyebrow" />}
      title={<Tx k="about.intro.h2" />}
      lede={<T k="about.intro.body" />}
      imagePrefix="about.hero.image"
    />
  );
}

export function AboutStory() {
  const { blocks } = useSiteData();
  // Round 7: item 5 shows once it has text (empty on the published site).
  const items = [1, 2, 3, 4, 5].filter((n) => n <= 4 || hasText(blocks, `about.list.item${n}`));
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2">
      <div>
        <h2 className="text-4xl">
          <Tx k="about.list.h3" />
        </h2>
        <ul className="mt-6 grid gap-4 text-sm leading-relaxed">
          {items.map((n) => (
            <li key={n} className="border-b border-line pb-4">
              <T k={`about.list.item${n}`} />
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-pine px-6 py-8 text-cream">
        <p className="text-xs uppercase tracking-widest text-copper">
          <Tx k="about.short.h3" />
        </p>
        <p className="mt-4 font-display text-3xl leading-tight">
          <T k="about.short.body1" />
        </p>
        <p className="mt-4 text-sm text-paper-deep">
          <T k="about.short.body2" />
        </p>
      </div>
    </section>
  );
}

export function AboutTeam() {
  const { blocks } = useSiteData();
  // Round 7: intro, card 4 and the supporting-roles line show once they have text.
  const cards = [1, 2, 3, 4].filter((n) => n <= 3 || hasText(blocks, `about.team.card${n}.name`));
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-4xl">
          <Tx k="about.team.h3" />
        </h2>
        {hasText(blocks, "about.team.intro") ? (
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            <T k="about.team.intro" />
          </p>
        ) : null}
        <ul
          className={
            cards.length > 3
              ? "mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
              : "mt-8 grid gap-6 md:grid-cols-3"
          }
        >
          {cards.map((n) => (
            <li key={n} className="border border-line p-5">
              <p className="text-xs uppercase tracking-widest text-copper">
                <Tx k={`about.team.card${n}.eyebrow`} />
              </p>
              <h3 className="mt-2 text-3xl">
                <T k={`about.team.card${n}.name`} />
              </h3>
              <p className="mt-3 text-sm text-muted">
                <T k={`about.team.card${n}.body`} />
              </p>
            </li>
          ))}
        </ul>
        {hasText(blocks, "about.team.support.body") ? (
          <div className="mt-8 border-t border-line pt-6">
            <h3 className="text-xs uppercase tracking-widest text-copper">
              <Tx k="about.team.support.h4" />
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              <T k="about.team.support.body" />
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Round 7: "How Legends West filled in", a dated timeline. Rows with no year are hidden. */
export function AboutHistory() {
  const { blocks } = useSiteData();
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((n) =>
    hasText(blocks, `about.history.item${n}.year`),
  );
  if (!hasText(blocks, "about.history.h3") && rows.length === 0) return null;
  return (
    <section className="border-t border-line bg-cream" data-about-history>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="text-4xl">
            <Tx k="about.history.h3" />
          </h2>
          {hasText(blocks, "about.history.intro") ? (
            <p className="mt-4 leading-relaxed text-muted">
              <T k="about.history.intro" />
            </p>
          ) : null}
        </div>
        <div className="lg:col-span-8">
          <ol className="border-l-2 border-copper">
            {rows.map((n) => (
              <li key={n} className="relative pb-8 pl-6 last:pb-0">
                <span
                  className="absolute -left-[7px] top-2 h-3 w-3 rounded-full bg-copper"
                  aria-hidden
                />
                <p className="font-display text-2xl text-copper">
                  <Tx k={`about.history.item${n}.year`} />
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  <T k={`about.history.item${n}.body`} />
                </p>
              </li>
            ))}
          </ol>
          {hasText(blocks, "about.history.note") ? (
            <p className="mt-8 text-xs leading-relaxed text-muted">
              <T k="about.history.note" />
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TextColumns({ prefix, extra }: { prefix: string; extra?: string }) {
  const { blocks } = useSiteData();
  if (!hasText(blocks, `${prefix}.h3`)) return null;
  const bodies = [1, 2, 3].filter((n) => hasText(blocks, `${prefix}.body${n}`));
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-8 lg:grid-cols-12">
        <h2 className="text-4xl lg:col-span-4">
          <Tx k={`${prefix}.h3`} />
        </h2>
        <div className="grid gap-4 leading-relaxed text-muted lg:col-span-8">
          {bodies.map((n) => (
            <p key={n}>
              <T k={`${prefix}.body${n}`} />
            </p>
          ))}
          {extra && hasText(blocks, extra) ? (
            <p className="border-l-2 border-copper pl-3 text-sm">
              <T k={extra} />
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Round 7: "The land and the area". */
export function AboutLand() {
  return <TextColumns prefix="about.land" />;
}

/** Round 7: "What Belmore Estates will be", with the school-district note. */
export function AboutVision() {
  return <TextColumns prefix="about.vision" extra="about.vision.schools" />;
}

/** Round 7: closing call to action (book a tour). */
export function AboutCta() {
  const { blocks } = useSiteData();
  if (!hasText(blocks, "about.cta.h3")) return null;
  return (
    <section className="border-t border-line bg-pine text-cream">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-5 py-14 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-4xl">
            <Tx k="about.cta.h3" />
          </h2>
          <p className="mt-2 max-w-2xl text-paper-deep">
            <T k="about.cta.body" />
          </p>
          {hasText(blocks, "about.cta.tours") ? (
            <p className="mt-2 text-sm text-paper-deep">
              <T k="about.cta.tours" />
            </p>
          ) : null}
        </div>
        <Link
          to="/contact"
          search={{ form: "tour" }}
          className="inline-flex min-h-11 items-center border border-cream px-5 text-sm"
        >
          <Tx k="about.cta.button" />
        </Link>
      </div>
    </section>
  );
}
