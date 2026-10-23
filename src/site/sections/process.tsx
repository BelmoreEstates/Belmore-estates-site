import { Link } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/chrome";
import { T, Tx, textOf, useSiteData } from "@/components/site/text";
import { hasText } from "@/lib/has-text";

export function ProcessIntro() {
  const { blocks } = useSiteData();
  return (
    <PageIntro
      eyebrow={<Tx k="process.intro.eyebrow" />}
      title={<Tx k="process.intro.h2" />}
      lede={<T k="process.intro.body" />}
      // Round 7: short timeline note, shown once it has text (empty on the published site).
      note={hasText(blocks, "process.intro.timeline") ? <T k="process.intro.timeline" /> : null}
      imagePrefix="process.hero.image"
    />
  );
}

export function ProcessSteps() {
  const { blocks } = useSiteData();
  // Round 6 warranty note: shown only once it has text (empty by default).
  const warranty = textOf(blocks, "process.warranty.h3").trim() !== "";
  return (
    <>
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
      {warranty ? (
        <div className="mx-auto max-w-3xl px-5 pb-16" data-process-warranty>
          <div className="border border-line bg-cream p-6 sm:p-8">
            <h2 className="text-3xl">
              <Tx k="process.warranty.h3" />
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              <T k="process.warranty.body" />
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Round 7 (Quill, process v3): four phases → seventeen stages. */
const PROCESS_PHASES: { n: number; stages: number[] }[] = [
  { n: 1, stages: [1, 2, 3, 4] },
  { n: 2, stages: [5, 6] },
  { n: 3, stages: [7, 8, 9, 10, 11, 12, 13] },
  { n: 4, stages: [14, 15, 16, 17] },
];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Phase headers with stage cards. Each card: number + title, then "What happens"
 * (body), "What you do" (you), "Who's involved" (who), and "Typical timing" (time)
 * when that stage has one. A stage with no title is hidden.
 */
export function ProcessPhases() {
  const { blocks } = useSiteData();
  const phases = PROCESS_PHASES.map((p) => ({
    ...p,
    stages: p.stages.filter((s) => hasText(blocks, `process.stage${pad(s)}.title`)),
  })).filter((p) => p.stages.length > 0 || hasText(blocks, `process.phase${p.n}.title`));
  const rows = [
    ["body", "process.label.happens"],
    ["you", "process.label.you"],
    ["who", "process.label.who"],
    ["time", "process.label.time"],
  ] as const;
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16" data-process-phases>
      <nav aria-label="Phases" className="-mx-5 overflow-x-auto px-5">
        <ol className="flex min-w-max gap-2 sm:grid sm:min-w-0 sm:grid-cols-4">
          {phases.map((p) => (
            <li key={p.n}>
              <a
                href={`#phase-${p.n}`}
                className="flex min-h-11 flex-col justify-center border border-line bg-cream px-4 py-2 text-sm hover:border-copper"
              >
                <span className="text-xs uppercase tracking-widest text-copper">
                  <Tx k={`process.phase${p.n}.label`} />
                </span>
                <span>
                  <Tx k={`process.phase${p.n}.title`} />
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {phases.map((p) => (
        <div key={p.n} id={`phase-${p.n}`} className="mt-12 scroll-mt-24">
          <header className="border-t-2 border-copper pt-6">
            <p className="text-xs uppercase tracking-widest text-copper">
              <Tx k={`process.phase${p.n}.label`} />
            </p>
            <h2 className="mt-2 text-4xl">
              <Tx k={`process.phase${p.n}.title`} />
            </h2>
            {hasText(blocks, `process.phase${p.n}.summary`) ? (
              <p className="mt-3 max-w-2xl leading-relaxed text-muted">
                <T k={`process.phase${p.n}.summary`} />
              </p>
            ) : null}
            {hasText(blocks, `process.phase${p.n}.time`) ? (
              <p className="mt-2 text-sm">
                <span className="text-muted">
                  <Tx k="process.label.time" />:{" "}
                </span>
                <T k={`process.phase${p.n}.time`} />
              </p>
            ) : null}
          </header>
          <ol className="mt-6 grid gap-4 lg:grid-cols-2">
            {p.stages.map((s) => {
              const k = `process.stage${pad(s)}`;
              return (
                <li key={s} className="border border-line bg-cream p-5 sm:p-6" data-stage={pad(s)}>
                  <div className="flex items-baseline gap-3">
                    <p className="font-display text-2xl text-copper" aria-hidden>
                      <Tx k={`${k}.number`} />
                    </p>
                    <h3 className="text-2xl">
                      <span className="sr-only">
                        <Tx k={`${k}.number`} />.{" "}
                      </span>
                      <Tx k={`${k}.title`} />
                    </h3>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm leading-relaxed">
                    {rows
                      .filter(([field]) => hasText(blocks, `${k}.${field}`))
                      .map(([field, label]) => (
                        <div key={field} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-3">
                          <dt className="text-xs uppercase tracking-widest text-muted">
                            <Tx k={label} />
                          </dt>
                          <dd className={field === "body" ? "text-ink" : "text-muted"}>
                            <T k={`${k}.${field}`} />
                          </dd>
                        </div>
                      ))}
                  </dl>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}

/** Round 7: the warranty note as its own section (ProcessSteps still carries it on the published layout). */
export function ProcessWarranty() {
  const { blocks } = useSiteData();
  if (!hasText(blocks, "process.warranty.h3")) return null;
  return (
    <div className="mx-auto max-w-3xl px-5 pb-16" data-process-warranty>
      <div className="border border-line bg-cream p-6 sm:p-8">
        <h2 className="text-3xl">
          <Tx k="process.warranty.h3" />
        </h2>
        <p className="mt-3 leading-relaxed text-muted">
          <T k="process.warranty.body" />
        </p>
      </div>
    </div>
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
