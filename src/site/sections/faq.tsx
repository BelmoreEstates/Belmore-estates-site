import { numbered } from "@/data/content";
import { RichText, Tx, useSiteData } from "@/components/site/text";

export function FaqList() {
  const { blocks } = useSiteData();
  // q1–q13: the six originals plus Quill's New York items. Blank a question in /admin to hide it.
  const items = numbered(blocks, (n) => ({ q: `faq.q${n}.question`, a: `faq.q${n}.answer` }));
  return (
    <section className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs uppercase tracking-widest text-copper">
        <Tx k="faq.intro.eyebrow" />
      </p>
      <h1 className="mt-3 text-5xl">
        <Tx k="faq.intro.h2" />
      </h1>
      <div className="mt-10">
        {items.map((item) => (
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
    </section>
  );
}
