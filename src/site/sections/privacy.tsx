import { T, Tx, useSiteData } from "@/components/site/text";

export function PrivacyPolicy() {
  const { blocks } = useSiteData();
  const sections: { n: number; bodies: string[] }[] = [];
  for (let n = 1; n <= 30; n++) {
    if (blocks[`privacy.s${n}.h3`] === undefined) break;
    const bodies = [
      `privacy.s${n}.body`,
      `privacy.s${n}.body1`,
      `privacy.s${n}.body2`,
      `privacy.s${n}.body3`,
    ].filter((k) => (blocks[k] ?? "").trim() !== "");
    sections.push({ n, bodies });
  }
  return (
    <section className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs uppercase tracking-widest text-copper">
        <Tx k="privacy.intro.eyebrow" />
      </p>
      <h1 className="mt-3 text-5xl">
        <Tx k="privacy.intro.h2" />
      </h1>
      {blocks["privacy.draft.flag"]?.trim() ? (
        <p className="mt-4 inline-flex border border-dashed border-copper px-2 py-1 text-xs uppercase tracking-widest text-copper">
          <Tx k="privacy.draft.flag" />
        </p>
      ) : null}
      <p className="mt-4 text-sm text-muted">
        <T k="privacy.effective" />
      </p>
      <div className="mt-8 grid gap-4 text-sm leading-relaxed text-muted">
        <p>
          <T k="privacy.intro.body" />
        </p>
        {sections.map((s) => (
          <div key={s.n} className="grid gap-3 border-t border-line pt-5">
            <h2 className="text-2xl text-ink">
              <Tx k={`privacy.s${s.n}.h3`} />
            </h2>
            {s.bodies.map((k) => (
              <p key={k}>
                <T k={k} />
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
