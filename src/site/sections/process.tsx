import { Link } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/chrome";
import { T, Tx } from "@/components/site/text";

export function ProcessIntro() {
  return (
    <PageIntro
      eyebrow={<Tx k="process.intro.eyebrow" />}
      title={<Tx k="process.intro.h2" />}
      lede={<T k="process.intro.body" />}
      imagePrefix="process.hero.image"
    />
  );
}

export function ProcessSteps() {
  return (
    <ol className="mx-auto max-w-3xl px-5 py-16">
      {[1, 2, 3, 4, 5].map((n) => (
        <li key={n} className="grid grid-cols-12 gap-4 border-t border-line py-8">
          <p className="col-span-3 font-display text-3xl text-copper sm:col-span-2">
            <Tx k={`process.step${n}.number`} />
          </p>
          <div className="col-span-9 sm:col-span-10">
            <h2 className="text-3xl">
              <Tx k={`process.step${n}.title`} />
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              <T k={`process.step${n}.body`} />
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ProcessCta() {
  return (
    <section className="border-t border-line bg-pine text-cream">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-5 py-14 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-4xl">
            <Tx k="process.cta.h3" />
          </h2>
          <p className="mt-2 text-paper-deep">
            <T k="process.cta.body" />
          </p>
        </div>
        <Link
          to="/community"
          className="inline-flex min-h-11 items-center border border-cream px-5 text-sm"
        >
          <Tx k="process.cta.button" />
        </Link>
      </div>
    </section>
  );
}
