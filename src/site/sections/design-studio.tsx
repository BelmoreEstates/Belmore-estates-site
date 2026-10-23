import { Link } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/chrome";
import { Img, T, Tx, useSiteData } from "@/components/site/text";
import { PhraseLink } from "@/components/site/linked-text";
import { hasText } from "@/lib/has-text";

const picks = ["kitchen", "baths", "floors", "exterior"] as const;

export function StudioIntro() {
  const { blocks } = useSiteData();
  return (
    <PageIntro
      eyebrow={<Tx k="design-studio.intro.eyebrow" />}
      title={<Tx k="design-studio.intro.h2" />}
      lede={<T k="design-studio.intro.body" />}
      // Round 7: "When it happens" note (empty on the published site).
      note={
        hasText(blocks, "design-studio.intro.when") ? (
          <PhraseLink k="design-studio.intro.when" phrase="process page" to="/process" />
        ) : null
      }
      imagePrefix="design-studio.hero.image"
    />
  );
}

export function StudioSteps() {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-3">
      {[1, 2, 3].map((n) => (
        <article key={n}>
          <p className="font-display text-3xl text-copper">
            <Tx k={`design-studio.step${n}.number`} />
          </p>
          <h2 className="mt-3 text-3xl">
            <Tx k={`design-studio.step${n}.title`} />
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            <T k={`design-studio.step${n}.body`} />
          </p>
        </article>
      ))}
    </section>
  );
}

export function StudioPicks() {
  return (
    <section className="border-y border-line bg-cream">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2">
        <Img
          srcKey="design-studio.image.src"
          altKey="design-studio.image.alt"
          className="aspect-video w-full object-cover"
        />
        <div>
          <h2 className="text-4xl">
            <Tx k="design-studio.picks.h3" />
          </h2>
          <ul className="mt-6 grid gap-4">
            {picks.map((p) => (
              <li key={p} className="border-b border-line pb-4">
                <h3 className="text-2xl">
                  <Tx k={`design-studio.picks.${p}.title`} />
                </h3>
                <p className="mt-1 text-sm text-muted">
                  <T k={`design-studio.picks.${p}.body`} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function StudioCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <h2 className="text-4xl">
        <Tx k="design-studio.cta.h3" />
      </h2>
      <p className="mt-3 max-w-xl text-muted">
        <T k="design-studio.cta.body" />
      </p>
      <Link
        to="/contact"
        search={{ interest: "The design studio" }}
        className="mt-6 inline-flex min-h-11 items-center bg-pine px-5 text-sm text-cream"
      >
        <Tx k="design-studio.cta.button" />
      </Link>
    </section>
  );
}
