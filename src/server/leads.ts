import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { SPAM, TURNSTILE_ENABLED } from "@/data/site-config";
import { maskKey, web3formsAccessKeys, web3formsMode } from "./env";
import { countLinks, leadInputSchema, leadTypeLabel } from "./lead-schema";

/** Issued when a form mounts; the signed timestamp enforces a minimum fill time. */
export const getFormToken = createServerFn({ method: "GET" }).handler(async () => {
  const { issueFormToken } = await import("./security.server");
  return { token: issueFormToken() };
});

export type SubmitResult =
  | {
      ok: true;
      id: number | null;
      /** Client notification mode only: the browser posts one submission per key. */
      notify?: ClientNotify;
    }
  | { ok: false; error: string; field?: string };

export type NotificationPayload = Record<string, string>;

/** One Web3Forms send attempt, stored in leads.notify_results (key masked). */
export type NotifyResult = { key: string; ok: boolean; error: string | null; at: string };

export type ClientNotify = { leadId: number; token: string; payload: NotificationPayload; keys: string[] };

/** "sent" when every key succeeded, "failed" when none did, else "partial". */
export function overallStatus(results: { ok: boolean }[]): "sent" | "partial" | "failed" {
  const ok = results.filter((r) => r.ok).length;
  return ok === results.length ? "sent" : ok === 0 ? "failed" : "partial";
}

/** Web3Forms submit URL. Local dev only: WEB3FORMS_API_URL points tests at a mock. */
const web3formsEndpoint = () =>
  (import.meta.env.DEV && process.env.WEB3FORMS_API_URL) || "https://api.web3forms.com/submit";

/** POST one submission per access key, in parallel. Never throws. */
async function sendToAllKeys(keys: string[], payload: NotificationPayload): Promise<NotifyResult[]> {
  const settled = await Promise.allSettled(
    keys.map(async (key) => {
      const res = await fetch(web3formsEndpoint(), {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ ...payload, access_key: key }),
        signal: AbortSignal.timeout(8000),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (!json.success) throw new Error(`HTTP ${res.status}: ${String(json.message ?? res.statusText)}`);
    }),
  );
  const at = new Date().toISOString();
  return settled.map((r, i) => ({
    key: maskKey(keys[i]),
    ok: r.status === "fulfilled",
    error: r.status === "rejected" ? String((r.reason as Error)?.message ?? r.reason).slice(0, 300) : null,
    at,
  }));
}

function errorSummary(results: NotifyResult[]): string | null {
  const failed = results.filter((r) => !r.ok);
  return failed.length ? failed.map((r) => `${r.key}: ${r.error}`).join(" | ").slice(0, 600) : null;
}

export function buildNotification(lead: {
  id: number;
  type: keyof typeof leadTypeLabel;
  name: string;
  email: string;
  phone?: string;
  interest?: string;
  lotId?: string;
  planSlug?: string;
  tourDate?: string;
  tourWindow?: string;
  tourLots?: string;
  lot2Id?: string;
  moveTimeline?: string;
  bedrooms?: string;
  phase1News?: boolean;
  financing?: string;
  realtor: boolean;
  agentName?: string;
  brokerage?: string;
  note?: string;
  sourcePage?: string;
}): NotificationPayload {
  const lines = [
    `Type: ${leadTypeLabel[lead.type]}`,
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    lead.phone && `Phone: ${lead.phone}`,
    lead.lotId && `Lot: ${lead.lotId}`,
    lead.lot2Id && `Second choice: ${lead.lot2Id}`,
    lead.tourLots && `Lots to see: ${lead.tourLots}`,
    lead.moveTimeline && `Move timeline: ${lead.moveTimeline}`,
    lead.bedrooms && `Bedrooms: ${lead.bedrooms}`,
    lead.phase1News && `Also wants Phase 1 news`,
    lead.financing && `Financing: ${lead.financing}`,
    lead.planSlug && `Plan: ${lead.planSlug}`,
    lead.interest && `Interest: ${lead.interest}`,
    lead.tourDate && `Tour: ${lead.tourDate} (${lead.tourWindow ?? ""})`,
    lead.realtor && `Realtor introduction: ${lead.agentName ?? ""}${lead.brokerage ? `, ${lead.brokerage}` : ""}`,
    !lead.realtor && lead.agentName && `Buyer's agent: ${lead.agentName}`,
    lead.note && `Note: ${lead.note}`,
    lead.sourcePage && `Sent from: ${lead.sourcePage}`,
    `Lead #${lead.id} is saved in /admin.`,
  ].filter(Boolean);
  return {
    subject: `Belmore Estates: ${leadTypeLabel[lead.type]}${lead.lotId ? ` (lot ${lead.lotId})` : ""}`,
    from_name: "Belmore Estates website",
    name: lead.name,
    email: lead.email,
    replyto: lead.email,
    message: lines.join("\n"),
  };
}

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return false; // enabled but unconfigured: fail closed
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token, remoteip: ip });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
    signal: AbortSignal.timeout(5000),
  });
  const json = (await res.json()) as { success?: boolean };
  return json.success === true;
}

export const submitLead = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const parsed = leadInputSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const invalid: { error: string; field: string } = {
        error: issue?.message ?? "Check the form.",
        field: String(issue?.path[0] ?? ""),
      };
      return { invalid, lead: null };
    }
    return { invalid: null, lead: parsed.data };
  })
  .handler(async ({ data }): Promise<SubmitResult> => {
    if (data.invalid) return { ok: false, error: data.invalid.error, field: data.invalid.field };
    const lead = data.lead;
    if (!lead) return { ok: false, error: "Check the form." };
    // Honeypot: pretend success, store nothing.
    if (lead.website && lead.website.trim() !== "") return { ok: true, id: null };

    const sec = await import("./security.server");
    const token = sec.readFormToken(lead.formToken);
    const age = token ? Date.now() - token.issuedAt : -1;
    if (!token || age > SPAM.maxFormAgeMs)
      return { ok: false, error: "This form expired. Reload the page and try again." };
    if (age < SPAM.minFillMs) return { ok: false, error: "That was quick. Please wait a moment and send again." };

    if (countLinks(lead.name, lead.note, lead.brokerage, lead.agentName) > SPAM.maxLinks)
      return { ok: false, error: "Please remove the links from your note.", field: "note" };

    const ip = sec.clientIp();
    if (TURNSTILE_ENABLED && !(await verifyTurnstile(lead.turnstileToken, ip)))
      return { ok: false, error: "The spam check failed. Please try again." };

    const sql = await getSql();
    const ipHash = sec.hashIp(ip);
    await sql`delete from form_rate_limits where created_at < now() - interval '1 day'`;
    const [{ n }] = await sql<{ n: number }>`
      select count(*)::int as n from form_rate_limits
      where ip_hash = ${ipHash}
        and created_at > now() - make_interval(mins => ${SPAM.rateLimitWindowMinutes})`;
    if (n >= SPAM.rateLimitMax)
      return { ok: false, error: "Too many requests from this connection. Please try again in a few minutes." };
    await sql`insert into form_rate_limits (ip_hash) values (${ipHash})`;

    const keys = web3formsAccessKeys();
    const mode = web3formsMode();
    const configured = keys.length > 0;
    const notifyToken = configured && mode === "client" ? sec.randomToken() : null;
    const initialStatus = !configured ? "not_configured" : mode === "client" ? "client" : "pending";

    const [row] = await sql<{ id: number }>`
      insert into leads (
        type, name, email, phone, interest, lot_id, lot2_id, plan_slug, tour_date, tour_window, tour_lots,
        move_timeline, bedrooms, phase1_news, financing, ack_nonbinding,
        realtor, agent_name, brokerage, note, consent, source_page, ip_hash, user_agent,
        notify_status, notify_token
      ) values (
        ${lead.type}, ${lead.name}, ${lead.email}, ${lead.phone ?? null}, ${lead.interest ?? null},
        ${lead.lotId ?? null}, ${lead.type === "reservation" ? (lead.lot2Id ?? null) : null}, ${lead.planSlug ?? null},
        ${lead.type === "tour" ? (lead.tourDate ?? null) : null},
        ${lead.type === "tour" ? (lead.tourWindow ?? null) : null},
        ${lead.type === "tour" ? (lead.tourLots ?? null) : null},
        ${lead.type === "waitlist" ? (lead.moveTimeline ?? null) : null},
        ${lead.type === "waitlist" ? (lead.bedrooms ?? null) : null},
        ${lead.type === "waitlist" && lead.phase1News},
        ${lead.type === "reservation" ? (lead.financing ?? null) : null},
        ${lead.type === "reservation" && lead.ackNonbinding},
        ${lead.realtor}, ${lead.agentName ?? null}, ${lead.realtor ? (lead.brokerage ?? null) : null},
        ${lead.note ?? null}, ${lead.consent}, ${lead.sourcePage ?? null}, ${ipHash}, ${sec.userAgent()},
        ${initialStatus}, ${notifyToken}
      ) returning id`;

    if (!configured) return { ok: true, id: row.id };
    const payload = buildNotification({ id: row.id, ...lead });

    if (mode === "client" && notifyToken)
      return { ok: true, id: row.id, notify: { leadId: row.id, token: notifyToken, payload, keys } };

    // Server mode: one submission per key, in parallel. The lead is already
    // saved, so a failed send is recorded (and shown in /admin), never fatal.
    const results = await sendToAllKeys(keys, payload);
    const status = overallStatus(results);
    const error = errorSummary(results);
    if (error) console.error(`[leads] Web3Forms notification ${status} for lead #${row.id}: ${error}`);
    await sql`
      update leads set
        notify_status = ${status},
        notify_error = ${error},
        notify_results = ${JSON.stringify(results)}::jsonb,
        notified_at = ${results.some((r) => r.ok) ? new Date().toISOString() : null}
      where id = ${row.id}`;
    return { ok: true, id: row.id };
  });

/** Browser reports the per-key Web3Forms results (client mode). Token is single-use. */
export const markLeadNotified = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.number().int().positive(),
      token: z.string().min(10).max(64),
      results: z
        .array(z.object({ key: z.string().max(12), ok: z.boolean(), error: z.string().max(300).nullable() }))
        .min(1)
        .max(10),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const at = new Date().toISOString();
    const results: NotifyResult[] = data.results.map((r) => ({ ...r, at }));
    const status = overallStatus(results);
    const error = errorSummary(results);
    if (error) console.error(`[leads] Web3Forms notification ${status} for lead #${data.leadId}: ${error}`);
    await sql`
      update leads set
        notify_status = ${status},
        notify_error = ${error},
        notify_results = ${JSON.stringify(results)}::jsonb,
        notified_at = ${results.some((r) => r.ok) ? at : null},
        notify_token = null
      where id = ${data.leadId} and notify_token = ${data.token} and notify_status = 'client'`;
    return { ok: true };
  });

export const notificationsConfigured = () => web3formsAccessKeys().length > 0;
