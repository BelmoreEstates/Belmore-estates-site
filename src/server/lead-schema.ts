import { z } from "zod";

/** Shared (client + server) lead validation. Server re-validates everything. */
export const LEAD_TYPES = ["contact", "tour", "waitlist", "reservation"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];
export const LEAD_STATUSES = ["new", "contacted", "closed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const TOUR_WINDOWS = ["Morning", "Afternoon", "Evening", "Flexible"] as const;
export const RESERVABLE_LOTS = ["801", "802", "803", "804", "805", "806", "807"] as const;

export const leadTypeLabel: Record<LeadType, string> = {
  contact: "Ask a question",
  tour: "Book a tour",
  waitlist: "Join the waitlist",
  reservation: "Request a lot reservation",
};

const trimmed = (max: number) => z.string().trim().max(max);
const optional = (max: number) =>
  trimmed(max)
    .optional()
    .transform((v) => (v ? v : undefined));

// Loose international phone: digits, spaces, + ( ) - . and optional extension.
const PHONE_RE = /^\+?[0-9 ().-]{7,20}(?:\s*(?:x|ext\.?)\s*[0-9]{1,6})?$/i;

export const leadInputSchema = z
  .object({
    type: z.enum(LEAD_TYPES),
    name: trimmed(80).min(2, "This one's required."),
    email: z.string().trim().toLowerCase().max(254).pipe(z.email("That email doesn't look right. Check for a typo?")),
    phone: optional(32).refine(
      (v) => v === undefined || (PHONE_RE.test(v) && v.replace(/\D/g, "").length >= 7),
      "Please enter a phone number we can call.",
    ),
    interest: optional(120),
    lotId: optional(8),
    planSlug: optional(80),
    tourDate: optional(10).refine(
      (v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "Please pick a date.",
    ),
    tourWindow: optional(40),
    tourLots: optional(40),
    lot2Id: optional(8),
    moveTimeline: optional(60),
    bedrooms: optional(20),
    phase1News: z.boolean().default(false),
    financing: optional(60),
    ackNonbinding: z.boolean().default(false),
    /** "How many lots are in Phase 1?" Accepts 7 / seven. */
    humanCheck: z.string().trim().max(20),
    realtor: z.boolean().default(false),
    agentName: optional(80),
    brokerage: optional(120),
    note: optional(2000),
    consent: z.literal(true, { error: "Please confirm before sending." }),
    sourcePage: optional(200),
    // Spam fields
    website: z.string().max(200).optional(), // honeypot: must stay empty
    formToken: z.string().max(200),
    turnstileToken: z.string().max(4096).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "tour") {
      if (!v.tourDate) ctx.addIssue({ code: "custom", path: ["tourDate"], message: "Pick a tour date." });
      if (!v.tourWindow || !(TOUR_WINDOWS as readonly string[]).includes(v.tourWindow))
        ctx.addIssue({ code: "custom", path: ["tourWindow"], message: "Pick a time window." });
    }
    const lots = RESERVABLE_LOTS as readonly string[];
    if (v.type === "reservation") {
      if (!v.lotId || !lots.includes(v.lotId))
        ctx.addIssue({ code: "custom", path: ["lotId"], message: "This one's required." });
      if (!v.ackNonbinding)
        ctx.addIssue({ code: "custom", path: ["ackNonbinding"], message: "Please confirm before sending." });
    } else if (v.lotId && !lots.includes(v.lotId)) {
      ctx.addIssue({ code: "custom", path: ["lotId"], message: "Unknown lot." });
    }
    if (v.lot2Id && !lots.includes(v.lot2Id))
      ctx.addIssue({ code: "custom", path: ["lot2Id"], message: "Unknown lot." });
    if ((v.type === "tour" || v.type === "reservation") && !v.phone)
      ctx.addIssue({ code: "custom", path: ["phone"], message: "This one's required." });
    if (!/^(7|seven)$/i.test(v.humanCheck))
      ctx.addIssue({
        code: "custom",
        path: ["humanCheck"],
        message: "Not quite. Count lots 801 through 807 and try again.",
      });
    if (/https?:\/\/|www\./i.test(v.name))
      ctx.addIssue({ code: "custom", path: ["name"], message: "Please enter your name." });
  });

export type LeadInput = z.input<typeof leadInputSchema>;

export function countLinks(...parts: (string | undefined)[]) {
  return parts.reduce((n, p) => n + (p?.match(/https?:\/\/|www\.|\[url|<a\s/gi)?.length ?? 0), 0);
}
