/**
 * The one lead form for the whole site: Contact, Book a tour, Join the
 * waitlist, and Request a lot (non-binding). Same layout as the original
 * InquiryForm; the type selector uses the plans-page chip style. Leads are
 * saved server-side (Postgres `leads`); Web3Forms emails go out afterwards, one
 * per key in WEB3FORMS_ACCESS_KEYS (server-side by default; see README).
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { getFormToken, markLeadNotified, submitLead } from "@/server/leads";
import { LEAD_TYPES, RESERVABLE_LOTS, TOUR_WINDOWS, type LeadType } from "@/server/lead-schema";
import { RichText, T, useSiteData, useText } from "@/components/site/text";
import { cn } from "@/lib/cn";

const prefix: Record<LeadType, string> = {
  contact: "forms.contact",
  tour: "forms.tour",
  waitlist: "forms.waitlist",
  reservation: "forms.reserve",
};

type Fields = {
  name: string;
  email: string;
  phone: string;
  interest: string;
  tourDate: string;
  tourWindow: string;
  tourLots: string;
  lotId: string;
  lot2Id: string;
  planText: string;
  financing: string;
  moveTimeline: string;
  bedrooms: string;
  phase1News: boolean;
  realtor: boolean;
  agentName: string;
  brokerage: string;
  note: string;
  humanCheck: string;
  consent: boolean;
  ackNonbinding: boolean;
  website: string;
};

const blank: Fields = {
  name: "",
  email: "",
  phone: "",
  interest: "",
  tourDate: "",
  tourWindow: "",
  tourLots: "",
  lotId: "",
  lot2Id: "",
  planText: "",
  financing: "",
  moveTimeline: "",
  bedrooms: "",
  phase1News: false,
  realtor: false,
  agentName: "",
  brokerage: "",
  note: "",
  humanCheck: "",
  consent: false,
  ackNonbinding: false,
  website: "",
};

const input = "min-h-11 border border-line bg-cream px-3";

/** Numbered options from the copy (`…option1`, `…option2`, …). */
function options(blocks: Record<string, string>, base: string) {
  const out: string[] = [];
  for (let n = 1; n <= 30; n++) {
    const v = blocks[`${base}.option${n}`];
    if (v === undefined) break;
    if (v.trim()) out.push(v);
  }
  return out;
}

export function InquiryForm({
  initialType = "contact",
  interest,
  lotId,
  planSlug,
  showTypes = true,
}: {
  initialType?: LeadType;
  interest?: string;
  lotId?: string;
  planSlug?: string;
  showTypes?: boolean;
}) {
  const t = useText();
  const { blocks } = useSiteData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [type, setType] = useState<LeadType>(initialType);
  const [fields, setFields] = useState<Fields>(() => initialFields());
  const [errors, setErrors] = useState<Partial<Record<keyof Fields | "form", string>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sentType, setSentType] = useState<LeadType>(initialType);
  const token = useRef<string>("");
  const statusRef = useRef<HTMLDivElement>(null);

  function initialFields(): Fields {
    return {
      ...blank,
      interest: interest ?? "",
      lotId: lotId ?? "",
      planText: planSlug ? interest ?? planSlug : "",
      tourLots: lotId ? `Lot ${lotId}` : "",
    };
  }

  async function refreshToken() {
    try {
      token.current = (await getFormToken()).token;
    } catch {
      token.current = "";
    }
  }

  useEffect(() => {
    void refreshToken();
  }, []);

  useEffect(() => setType(initialType), [initialType]);
  useEffect(() => {
    setFields((f) => ({ ...f, interest: interest ?? f.interest, lotId: lotId ?? f.lotId }));
  }, [interest, lotId]);

  function update<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  const p = prefix[type];
  const phoneRequired = type === "tour" || type === "reservation";

  function messageFor(field: string, serverMessage: string) {
    if (field === "email") return fields.email.trim() ? t("forms.shared.error.email") : t("forms.shared.error.required");
    if (field === "phone") return fields.phone.trim() ? t("forms.shared.error.phone") : t("forms.shared.error.required");
    if (field === "humanCheck") return t("forms.shared.error.antispam");
    if (field === "consent" || field === "ackNonbinding") return t("forms.shared.error.consent");
    if (field === "name" && fields.name.trim().length < 2) return t("forms.shared.error.required");
    return serverMessage;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrors({});
    const lotOptions = RESERVABLE_LOTS as readonly string[];
    const payload = {
      type,
      name: fields.name,
      email: fields.email,
      phone: fields.phone,
      interest: type === "contact" ? fields.interest : undefined,
      lotId: type === "reservation" ? fields.lotId : lotOptions.includes(fields.lotId) ? fields.lotId : undefined,
      lot2Id: type === "reservation" ? fields.lot2Id : undefined,
      planSlug: type === "reservation" ? fields.planText : planSlug,
      tourDate: type === "tour" ? fields.tourDate : undefined,
      tourWindow: type === "tour" ? fields.tourWindow : undefined,
      tourLots: type === "tour" ? fields.tourLots : undefined,
      moveTimeline: type === "waitlist" ? fields.moveTimeline : undefined,
      bedrooms: type === "waitlist" ? fields.bedrooms : undefined,
      phase1News: type === "waitlist" ? fields.phase1News : false,
      financing: type === "reservation" ? fields.financing : undefined,
      ackNonbinding: type === "reservation" ? fields.ackNonbinding : false,
      realtor: type === "reservation" ? false : fields.realtor,
      agentName: type === "reservation" ? fields.agentName : fields.realtor ? fields.agentName : undefined,
      brokerage: fields.realtor && type !== "reservation" ? fields.brokerage : undefined,
      note: fields.note,
      humanCheck: fields.humanCheck,
      consent: fields.consent,
      sourcePage: pathname,
      website: fields.website,
      formToken: token.current,
    };
    try {
      const result = await submitLead({ data: payload as never });
      if (!result.ok) {
        const field = (result.field ?? "form") as keyof Fields | "form";
        setErrors({ [field]: messageFor(field, result.error), form: result.error });
        setStatus("error");
        if (/expired|quick/i.test(result.error)) void refreshToken();
        statusRef.current?.focus();
        return;
      }
      if (result.notify) void sendNotification(result.notify);
      setSentType(type);
      setStatus("sent");
      setFields(initialFields());
      void refreshToken();
      statusRef.current?.focus();
    } catch {
      setErrors({ form: t(`${p}.error.title`) });
      setStatus("error");
      statusRef.current?.focus();
    }
  }

  const sp = prefix[sentType];

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <form onSubmit={onSubmit} className="grid gap-4 lg:col-span-7" noValidate data-lead-type={type}>
        {showTypes ? (
          <fieldset className="grid gap-2">
            <legend className="text-sm">{t("forms.shared.type.label")}</legend>
            <div className="flex flex-wrap gap-2">
              {LEAD_TYPES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={type === item}
                  onClick={() => {
                    setType(item);
                    setErrors({});
                    if (status !== "sending") setStatus("idle");
                  }}
                  className={cn(
                    "min-h-11 border px-4 text-sm",
                    type === item ? "border-ink bg-ink text-cream" : "border-line bg-cream text-ink",
                  )}
                >
                  {t(`${prefix[item]}.title`)}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}
        <p className="text-sm text-muted">
          <T k={`${p}.intro`} />
        </p>
        <p className="text-xs text-muted">{t("forms.shared.required.legend")}</p>

        <Field label={t("forms.shared.name.label")} required error={errors.name}>
          <input
            name="name"
            value={fields.name}
            onChange={(e) => update("name", e.target.value)}
            autoComplete="name"
            placeholder={t("forms.shared.name.placeholder")}
            maxLength={80}
            className={input}
          />
        </Field>
        <Field label={t("forms.shared.email.label")} required error={errors.email}>
          <input
            name="email"
            type="email"
            value={fields.email}
            onChange={(e) => update("email", e.target.value)}
            autoComplete="email"
            placeholder={t("forms.shared.email.placeholder")}
            maxLength={254}
            className={input}
          />
        </Field>
        <Field
          label={phoneRequired ? t(`${p}.phone.label`) || t("forms.shared.phone.label") : t("forms.shared.phone.optional.label")}
          required={phoneRequired}
          helper={phoneRequired ? t(`${p}.phone.helper`) : t("forms.shared.phone.helper")}
          error={errors.phone}
        >
          <input
            name="phone"
            type="tel"
            value={fields.phone}
            onChange={(e) => update("phone", e.target.value)}
            autoComplete="tel"
            maxLength={32}
            className={input}
          />
        </Field>

        {type === "contact" ? (
          <Field label={t("forms.contact.interest.label")} helper={t("forms.contact.interest.helper")} error={errors.interest}>
            <select name="interest" value={fields.interest} onChange={(e) => update("interest", e.target.value)} className={input}>
              <option value="">—</option>
              {fields.interest && !options(blocks, "forms.contact.interest").includes(fields.interest) ? (
                <option value={fields.interest}>{fields.interest}</option>
              ) : null}
              {options(blocks, "forms.contact.interest").map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
        ) : null}

        {type === "tour" ? (
          <>
            <Field label={t("forms.tour.date.label")} required helper={<T k="forms.tour.date.helper" />} error={errors.tourDate}>
              <input
                name="tourDate"
                type="date"
                value={fields.tourDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => update("tourDate", e.target.value)}
                className={input}
              />
            </Field>
            <Field label={t("forms.tour.time.label")} required error={errors.tourWindow}>
              <select name="tourWindow" value={fields.tourWindow} onChange={(e) => update("tourWindow", e.target.value)} className={input}>
                <option value="">—</option>
                {TOUR_WINDOWS.map((w, i) => (
                  <option key={w} value={w}>
                    {t(`forms.tour.time.option${i + 1}`) || w}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("forms.tour.lots.label")} error={errors.tourLots}>
              <select name="tourLots" value={fields.tourLots} onChange={(e) => update("tourLots", e.target.value)} className={input}>
                <option value="">—</option>
                {options(blocks, "forms.tour.lots").map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
          </>
        ) : null}

        {type === "waitlist" ? (
          <>
            <Field label={t("forms.waitlist.timeline.label")} error={errors.moveTimeline}>
              <select name="moveTimeline" value={fields.moveTimeline} onChange={(e) => update("moveTimeline", e.target.value)} className={input}>
                <option value="">—</option>
                {options(blocks, "forms.waitlist.timeline").map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label={t("forms.waitlist.beds.label")} error={errors.bedrooms}>
              <select name="bedrooms" value={fields.bedrooms} onChange={(e) => update("bedrooms", e.target.value)} className={input}>
                <option value="">—</option>
                {options(blocks, "forms.waitlist.beds").map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Check checked={fields.phase1News} onChange={(v) => update("phase1News", v)} label={t("forms.waitlist.phase1.label")} />
          </>
        ) : null}

        {type === "reservation" ? (
          <>
            <Field label={t("forms.reserve.lot.label")} required error={errors.lotId}>
              <select name="lotId" value={fields.lotId} onChange={(e) => update("lotId", e.target.value)} className={input}>
                <option value="">—</option>
                {RESERVABLE_LOTS.map((id, i) => (
                  <option key={id} value={id}>
                    {t(`forms.reserve.lot.option${i + 1}`) || `Lot ${id}`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("forms.reserve.lot2.label")} helper={t("forms.reserve.lot2.helper")} error={errors.lot2Id}>
              <select name="lot2Id" value={fields.lot2Id} onChange={(e) => update("lot2Id", e.target.value)} className={input}>
                <option value="">—</option>
                {RESERVABLE_LOTS.filter((id) => id !== fields.lotId).map((id) => (
                  <option key={id} value={id}>
                    {t(`forms.reserve.lot.option${RESERVABLE_LOTS.indexOf(id) + 1}`) || `Lot ${id}`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("forms.reserve.plan.label")} error={(errors as Record<string, string | undefined>).planSlug}>
              <input
                name="plan"
                value={fields.planText}
                onChange={(e) => update("planText", e.target.value)}
                placeholder={t("forms.reserve.plan.placeholder")}
                maxLength={80}
                className={input}
              />
            </Field>
            <Field label={t("forms.reserve.financing.label")} error={errors.financing}>
              <select name="financing" value={fields.financing} onChange={(e) => update("financing", e.target.value)} className={input}>
                <option value="">—</option>
                {options(blocks, "forms.reserve.financing").map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label={t("forms.reserve.agent.name.label")} error={errors.agentName}>
              <input
                name="agentName"
                value={fields.agentName}
                onChange={(e) => update("agentName", e.target.value)}
                maxLength={80}
                className={input}
              />
            </Field>
          </>
        ) : (
          <>
            <Check
              checked={fields.realtor}
              onChange={(v) => update("realtor", v)}
              label={t("forms.shared.agent.label")}
              helper={t("forms.shared.agent.helper")}
            />
            {fields.realtor ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("forms.shared.agent.name.label")} error={errors.agentName}>
                  <input value={fields.agentName} onChange={(e) => update("agentName", e.target.value)} maxLength={80} className={input} />
                </Field>
                <Field label={t("forms.shared.agent.brokerage.label")} error={errors.brokerage}>
                  <input value={fields.brokerage} onChange={(e) => update("brokerage", e.target.value)} maxLength={120} className={input} />
                </Field>
              </div>
            ) : null}
          </>
        )}

        <Field label={t("forms.shared.note.label")} error={errors.note}>
          <textarea
            name="note"
            value={fields.note}
            onChange={(e) => update("note", e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={t(`${p}.note.placeholder`)}
            className="border border-line bg-cream px-3 py-2"
          />
        </Field>
        {type === "waitlist" ? (
          <p className="text-xs text-muted">
            <T k="forms.waitlist.helper" />
          </p>
        ) : null}

        {/* Honeypot (Web3Forms-style "botcheck"): hidden from people, filled by bots. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            {t("forms.shared.antispam.honeypot.label")}
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={fields.website}
              onChange={(e) => update("website", e.target.value)}
            />
          </label>
        </div>

        <Field label={t("forms.shared.antispam.label")} required helper={t("forms.shared.antispam.helper")} error={errors.humanCheck}>
          <input
            name="humanCheck"
            inputMode="text"
            value={fields.humanCheck}
            onChange={(e) => update("humanCheck", e.target.value)}
            maxLength={20}
            className={`${input} max-w-40`}
          />
        </Field>

        {type === "reservation" ? (
          <Check
            checked={fields.ackNonbinding}
            onChange={(v) => update("ackNonbinding", v)}
            label={t("forms.reserve.ack.label")}
            helper={t("forms.reserve.ack.helper")}
            error={errors.ackNonbinding}
            required
          />
        ) : null}
        <Check
          checked={fields.consent}
          onChange={(v) => update("consent", v)}
          label={<T k="forms.shared.consent" />}
          error={errors.consent}
          required
        />

        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex min-h-11 items-center justify-center bg-pine px-5 text-sm text-cream disabled:opacity-60"
        >
          {status === "sending" ? t("forms.shared.sending") : t(`${p}.submit`)}
        </button>
        <p className="text-xs text-muted">
          <T k="contact.form.notice" />
        </p>
      </form>
      <aside className="lg:col-span-5">
        <div ref={statusRef} tabIndex={-1} aria-live="polite" className="outline-none">
          {status === "sent" ? (
            <div className="border border-line bg-cream px-4 py-4" role="status" data-form-result="sent">
              <p className="text-xs uppercase tracking-widest text-copper">{t(`${sp}.title`)}</p>
              <p className="mt-2 font-display text-2xl">{t(`${sp}.success.title`)}</p>
              <p className="mt-2 text-sm text-muted">
                <T k={`${sp}.success.body`} />
              </p>
            </div>
          ) : status === "error" ? (
            <div className="border border-copper bg-cream px-4 py-4" role="alert" data-form-result="error">
              <p className="font-display text-2xl">{t(`${p}.error.title`)}</p>
              {errors.form ? <p className="mt-2 text-sm text-copper">{errors.form}</p> : null}
              <p className="mt-2 text-sm text-muted">
                <T k={`${p}.error.body`} />
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs uppercase tracking-widest text-copper">{t(`${p}.title`)}</p>
              {type === "reservation" ? (
                <p className="mt-3 text-xs text-muted">
                  <T k="forms.reserve.ack.helper" />
                </p>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

async function sendNotification(notify: { leadId: number; token: string; payload: Record<string, string>; keys: string[] }) {
  // Client mode (WEB3FORMS_MODE=client): one browser submission per inbox key,
  // in parallel; results are reported back so /admin shows any failure.
  const results = await Promise.all(
    notify.keys.map(async (key) => {
      const masked = `…${key.slice(-4)}`;
      try {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ ...notify.payload, access_key: key, botcheck: "" }),
        });
        const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
        return { key: masked, ok: json.success === true, error: json.success ? null : String(json.message ?? res.status).slice(0, 300) };
      } catch (err) {
        return { key: masked, ok: false, error: String(err).slice(0, 300) };
      }
    }),
  );
  await markLeadNotified({ data: { leadId: notify.leadId, token: notify.token, results } }).catch(() => undefined);
}

function Field({
  label,
  required,
  helper,
  error,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  helper?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span>
        {label}
        {required ? <span className="text-copper"> *</span> : null}
      </span>
      {children}
      {helper ? <span className="text-xs text-muted">{helper}</span> : null}
      {error ? (
        <span className="text-xs text-copper" role="alert">
          <RichText text={error} />
        </span>
      ) : null}
    </label>
  );
}

function Check({
  checked,
  onChange,
  label,
  helper,
  error,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  helper?: ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1 text-sm">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 size-4 accent-pine"
        />
        <span>
          {label}
          {required ? <span className="text-copper"> *</span> : null}
        </span>
      </label>
      {helper ? <span className="pl-7 text-xs text-muted">{helper}</span> : null}
      {error ? (
        <span className="pl-7 text-xs text-copper" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
