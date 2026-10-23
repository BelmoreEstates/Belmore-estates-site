import { createFileRoute } from "@tanstack/react-router";
import { LEAD_TYPES, RESERVABLE_LOTS, type LeadType } from "@/server/lead-schema";
import { seoHead } from "@/components/site/text";
import { PageView } from "@/site/page-view";

type ContactSearch = {
  form?: LeadType;
  interest?: string;
  lot?: string;
  plan?: string;
};

const str = (v: unknown, max = 120) =>
  typeof v === "string" && v.trim() ? v.slice(0, max) : undefined;

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>): ContactSearch => {
    const form = str(search.form, 20);
    const lot = typeof search.lot === "number" ? String(search.lot) : str(search.lot, 8);
    return {
      form:
        form && (LEAD_TYPES as readonly string[]).includes(form) ? (form as LeadType) : undefined,
      interest: str(search.interest),
      lot: lot && (RESERVABLE_LOTS as readonly string[]).includes(lot) ? lot : undefined,
      plan: str(search.plan, 60),
    };
  },
  component: () => <PageView slug="contact" />,
  head: seoHead("contact"),
});
