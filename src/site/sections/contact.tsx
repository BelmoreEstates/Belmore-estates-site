import { useSearch } from "@tanstack/react-router";
import { InquiryForm } from "@/components/site/inquiry-form";
import { LEAD_TYPES, RESERVABLE_LOTS, type LeadType } from "@/server/lead-schema";
import { T, Tx, useSiteData } from "@/components/site/text";
import { PhraseLink } from "@/components/site/linked-text";
import { hasText } from "@/lib/has-text";

const details = ["developer", "office", "community", "hours"] as const;

export function ContactMain() {
  const { blocks } = useSiteData();
  // Validated by the /contact route (src/routes/contact.tsx); empty in the editor.
  const search = useSearch({ strict: false }) as {
    form?: string;
    interest?: string;
    lot?: string;
    plan?: string;
  };
  const form =
    search.form && (LEAD_TYPES as readonly string[]).includes(search.form)
      ? (search.form as LeadType)
      : undefined;
  const { interest, plan } = search;
  const lot =
    search.lot && (RESERVABLE_LOTS as readonly string[]).includes(String(search.lot))
      ? String(search.lot)
      : undefined;

  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="text-xs uppercase tracking-widest text-copper">
            <Tx k="contact.intro.eyebrow" />
          </p>
          <h1 className="mt-3 text-5xl">
            <Tx k="contact.intro.h2" />
          </h1>
          <dl className="mt-8 grid gap-4 text-sm">
            {details.map((d) => (
              <div key={d}>
                <dt className="text-muted">
                  <Tx k={`contact.details.${d}.label`} />
                </dt>
                <dd>
                  <T k={`contact.details.${d}.value`} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 border-t border-line pt-6 text-sm text-muted">
            <T k="contact.note" />
          </p>
          {hasText(blocks, "contact.next") ? (
            <p className="mt-4 text-sm leading-relaxed text-muted" data-contact-next>
              <PhraseLink k="contact.next" phrase="process page" to="/process" />
            </p>
          ) : null}
        </div>
        <div className="lg:col-span-8">
          <InquiryForm
            initialType={form ?? (lot ? "reservation" : "contact")}
            interest={interest}
            lotId={lot}
            planSlug={plan}
          />
        </div>
      </div>
    </section>
  );
}
