import { createFileRoute } from "@tanstack/react-router";
import { InquiryForm } from "@/components/site/inquiry-form";
import { LEAD_TYPES, RESERVABLE_LOTS, type LeadType } from "@/server/lead-schema";
import { RichText, T, seoHead, useText } from "@/components/site/text";

type ContactSearch = {
  form?: LeadType;
  interest?: string;
  lot?: string;
  plan?: string;
};

const str = (v: unknown, max = 120) => (typeof v === "string" && v.trim() ? v.slice(0, max) : undefined);

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>): ContactSearch => {
    const form = str(search.form, 20);
    const lot = typeof search.lot === "number" ? String(search.lot) : str(search.lot, 8);
    return {
      form: form && (LEAD_TYPES as readonly string[]).includes(form) ? (form as LeadType) : undefined,
      interest: str(search.interest),
      lot: lot && (RESERVABLE_LOTS as readonly string[]).includes(lot) ? lot : undefined,
      plan: str(search.plan, 60),
    };
  },
  component: ContactPage,
  head: seoHead("contact"),
});

const details = ["developer", "office", "community", "hours"] as const;

function ContactPage() {
  const { form, interest, lot, plan } = Route.useSearch();
  const t = useText();

  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="text-xs uppercase tracking-widest text-copper">{t("contact.intro.eyebrow")}</p>
          <h1 className="mt-3 text-5xl">{t("contact.intro.h2")}</h1>
          <dl className="mt-8 grid gap-4 text-sm">
            {details.map((d) => (
              <div key={d}>
                <dt className="text-muted">{t(`contact.details.${d}.label`)}</dt>
                <dd>
                  <RichText text={t(`contact.details.${d}.value`)} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 border-t border-line pt-6 text-sm text-muted">
            <T k="contact.note" />
          </p>
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
