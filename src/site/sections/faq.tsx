import { numbered } from "@/data/content";
import { RichText, T, Tx, textOf, useSiteData } from "@/components/site/text";

/** Round 6 (Quill): optional FAQ groups, used only once a group label has text. */
const GROUPS: { label: string; questions: number[] }[] = [
  { label: "faq.group1.label", questions: [1, 2, 3, 4, 6] },
  { label: "faq.group2.label", questions: [5, 11, 13, 14, 15, 16, 17] },
  { label: "faq.group3.label", questions: [7, 8, 9, 10, 12] },
];

export function FaqList() {
  const { blocks } = useSiteData();
  // q1–q13: the six originals plus Quill's New York items. Blank a question in /admin to hide it.
  const items = numbered(blocks, (n) => ({ q: `faq.q${n}.question`, a: `faq.q${n}.answer` }));
  const numberOf = new Map<(typeof items)[number], number>();
  for (let n = 1, i = 0; n <= 50 && blocks[`faq.q${n}.question`] !== undefined; n++)
    if ((blocks[`faq.q${n}.question`] ?? "").trim()) numberOf.set(items[i++], n);
  const grouped = GROUPS.some((g) => textOf(blocks, g.label).trim() !== "");
  const listed = new Set(GROUPS.flatMap((g) => g.questions));
  const groups = grouped
    ? [
        ...GROUPS.map((g) => ({
          label: g.label,
          items: g.questions
            .map((n) => items.find((it) => numberOf.get(it) === n))
            .filter((it): it is (typeof items)[number] => Boolean(it)),
        })),
        // Questions added later (q14…) that no group lists.
        { label: "", items: items.filter((it) => !listed.has(numberOf.get(it) ?? 0)) },
      ].filter((g) => g.items.length > 0)
    : [{ label: "", items }];
  return (
    <section className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs uppercase tracking-widest text-copper">
        <Tx k="faq.intro.eyebrow" />
      </p>
      <h1 className="mt-3 text-5xl">
        <Tx k="faq.intro.h2" />
      </h1>
      {textOf(blocks, "faq.intro.body").trim() ? (
        <p className="mt-4 max-w-2xl text-muted">
          <T k="faq.intro.body" />
        </p>
      ) : null}
      {groups.map((group, gi) => (
        <div key={group.label || `rest-${gi}`} className="mt-10">
          {group.label && textOf(blocks, group.label).trim() ? (
            <h2 className="mb-2 text-xs uppercase tracking-widest text-copper">
              <Tx k={group.label} />
            </h2>
          ) : null}
          {group.items.map((item) => (
            <details key={item.q} className="group border-t border-line py-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg">
                <span>
                  <RichText text={item.q} />
                </span>
                <span className="text-copper group-open:hidden" aria-hidden>
                  +
                </span>
                <span className="hidden text-copper group-open:inline" aria-hidden>
                  –
                </span>
              </summary>
              <p className="pt-3 text-sm leading-relaxed text-muted">
                <RichText text={item.a} />
              </p>
            </details>
          ))}
        </div>
      ))}
    </section>
  );
}
