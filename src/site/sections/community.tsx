import { Link } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/chrome";
import { SiteModel } from "@/components/site/site-model";
import { T, Tx, textOf, useSiteData } from "@/components/site/text";

const facts = ["place", "developer", "lots", "streets", "schools", "office"] as const;
/** Round 6 rows: shown only once their label has text (empty by default). */
const optionalFacts = ["utilities", "builder", "hoa"] as const;

export function CommunityIntro() {
  return (
    <PageIntro
      eyebrow={<Tx k="community.intro.eyebrow" />}
      title={<Tx k="community.intro.h2" />}
      lede={<T k="community.intro.body" />}
      imagePrefix="community.hero.image"
    />
  );
}

export function CommunityPlat() {
  const { blocks } = useSiteData();
  const rows = [
    ...facts,
    ...optionalFacts.filter((f) => textOf(blocks, `community.facts.${f}.label`).trim() !== ""),
  ];
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <h2 className="text-4xl">
          <Tx k="community.plat.h2" />
        </h2>
        <p className="mt-4 leading-relaxed text-muted">
          <T k="community.plat.body" />
        </p>
      </div>
      <dl className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:col-span-7">
        {rows.map((f) => (
          <Fact
            key={f}
            k={<Tx k={`community.facts.${f}.label`} />}
            v={<T k={`community.facts.${f}.value`} />}
          />
        ))}
      </dl>
    </section>
  );
}

export function CommunityModel() {
  return (
    <section id="site-model" className="border-y border-line bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-4xl">
          <Tx k="community.model.h2" />
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          <T k="community.model.body" />
        </p>
        <div className="mt-8">
          <SiteModel hintKey="community.model.hint" captionKey="community.model.caption" />
        </div>
      </div>
    </section>
  );
}

export function CommunityGround() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <h2 className="text-4xl">
        <Tx k="community.ground.eyebrow" />
      </h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <li key={n} className="border-t border-line pt-4">
            <h3 className="text-2xl">
              <Tx k={`community.ground.item${n}.title`} />
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              <T k={`community.ground.item${n}.body`} />
            </p>
          </li>
        ))}
      </ul>
      <Link
        to="/homes"
        className="mt-10 inline-flex min-h-11 items-center bg-pine px-5 text-sm text-cream"
      >
        <Tx k="community.ground.button" />
      </Link>
    </section>
  );
}

function Fact({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="bg-paper px-4 py-4">
      <dt className="text-xs uppercase tracking-widest text-muted">{k}</dt>
      <dd className="mt-1 text-lg">{v}</dd>
    </div>
  );
}
