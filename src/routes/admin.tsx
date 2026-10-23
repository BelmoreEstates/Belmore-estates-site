/**
 * /admin — owner/admin console. The UI is a convenience only: every server
 * function in src/server/admin.ts re-checks the session and the allowlist.
 */
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  addAdmin,
  exportLeadsCsv,
  getAdminStatus,
  listAdminLots,
  listAdminPlans,
  listAdmins,
  listBlocks,
  listLeads,
  listMedia,
  movePlan,
  listPasswordAccounts,
  removeAdmin,
  saveBlock,
  setAdminPassword,
  saveLot,
  savePlan,
  updateLeadStatus,
  uploadMedia,
  type AdminStatus,
  type BlockRow,
  type LeadRow,
} from "@/server/admin";
import {
  LEAD_STATUSES,
  LEAD_TYPES,
  leadTypeLabel,
  type LeadStatus,
  type LeadType,
} from "@/server/lead-schema";
import { LOT_STATUSES, type LotStatus, type PhaseLot, type Plan } from "@/data/site";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import { signOut } from "@/lib/auth/client";
import { LotStatusBadge } from "@/components/site/text";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Admin · Belmore Estates" }, { name: "robots", content: "noindex" }],
  }),
});

const TABS = [
  "Leads",
  "Content",
  "Photos",
  "Lots",
  "Future section",
  "Social & legal",
  "Plans",
  "Admins",
] as const;
type Tab = (typeof TABS)[number];

const input = "min-h-11 border border-line bg-cream px-3 text-sm";
const button =
  "inline-flex min-h-11 items-center justify-center border border-ink px-4 text-sm disabled:opacity-50";
const primary =
  "inline-flex min-h-11 items-center justify-center bg-pine px-4 text-sm text-cream disabled:opacity-50";

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Leads");

  useEffect(() => {
    if (isPending) return;
    getAdminStatus()
      .then(setStatus)
      .catch((e) => setError(errText(e)));
  }, [isPending, user?.id]);

  if (isPending || (!status && !error)) return <Shell>Checking your access…</Shell>;
  if (error) return <Shell>Could not check access: {error}</Shell>;
  if (!status || status.state === "signed_out")
    return (
      <Shell>
        <div data-admin-state="signed_out">
          <p>You need to sign in to use the admin.</p>
          <GoogleSignInButton callbackURL="/admin" className="mt-6" />
          <Link to="/login" className="mt-6 block text-sm text-muted underline underline-offset-4">
            Sign in with email and password instead
          </Link>
        </div>
      </Shell>
    );
  if (status.state === "denied")
    return (
      <Shell>
        <div data-admin-state="denied">
          <p>
            {status.reason === "unverified"
              ? "Your account's email address is not verified, so it can't be used for the admin."
              : `${status.email ?? "This account"} is not on the Belmore Estates admin list.`}
          </p>
          <p className="mt-2 text-sm text-muted">Ask the owner to add you, then sign in again.</p>
          <button
            type="button"
            className={cn(button, "mt-6")}
            onClick={() => void signOut("/login")}
          >
            Sign out
          </button>
        </div>
      </Shell>
    );

  const tabs = TABS.filter((t) => t !== "Admins" || status.role === "owner");
  return (
    <section className="mx-auto max-w-6xl px-5 py-10" data-admin-state="admin">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-copper">Admin</p>
          <h1 className="mt-2 text-4xl">Belmore Estates</h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as {status.email} ({status.role})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/editor" className={primary} data-admin-edit-site>
            Edit the website
          </a>
          <button type="button" className={button} onClick={() => void signOut("/")}>
            Sign out
          </button>
        </div>
      </div>
      {!status.notifications.configured ? (
        <div
          className="mt-6 border border-dashed border-copper bg-cream px-4 py-3 text-sm"
          data-banner="notifications"
        >
          <strong>Notifications not configured.</strong> New leads are saved here, but no email is
          sent yet. Set <code>WEB3FORMS_ACCESS_KEYS</code> (comma-separated, one Web3Forms key per
          inbox) in the Netlify environment variables and redeploy.
        </div>
      ) : (
        <p className="mt-6 text-xs text-muted" data-banner="notifications-on">
          Lead emails: {status.notifications.keyCount} Web3Forms{" "}
          {status.notifications.keyCount === 1 ? "inbox" : "inboxes"}, sent{" "}
          {status.notifications.mode === "client" ? "from the visitor's browser" : "server-side"}. A
          failed send never loses the lead; it shows as <em>failed</em> or <em>partial</em> under
          Email.
        </p>
      )}
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Admin sections">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "min-h-11 border px-4 text-sm",
              tab === t ? "border-ink bg-ink text-cream" : "border-line bg-cream",
            )}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="mt-8">
        {tab === "Leads" ? <LeadsTab /> : null}
        {tab === "Content" ? (
          <ContentTab
            filter={(k) =>
              !k.startsWith("homes.future.") &&
              !k.endsWith(".image.src") &&
              !k.startsWith("global.social.") &&
              !k.startsWith("global.legal.") &&
              !k.startsWith("global.footer.fairhousing.") &&
              !k.startsWith("global.footer.sop.")
            }
          />
        ) : null}
        {tab === "Photos" ? <PhotosTab /> : null}
        {tab === "Lots" ? <LotsTab /> : null}
        {tab === "Future section" ? (
          <ContentTab
            filter={(k) =>
              k.startsWith("homes.future.") ||
              k.startsWith("forms.waitlist.") ||
              k === "global.status.future"
            }
            intro="The future-section card on /lots and the waitlist form. Set 'homes.future.open' to 'no' to hide the card. Waitlist sign-ups are in Leads (type: waitlist)."
          />
        ) : null}
        {tab === "Social & legal" ? (
          <ContentTab
            filter={(k) =>
              k.startsWith("global.social.") ||
              k.startsWith("global.legal.") ||
              k.startsWith("global.footer.fairhousing.") ||
              k.startsWith("global.footer.sop.")
            }
            intro="Social links show as icons in the top bar and footer once set (full https:// address; leave empty to hide). The footer Fair Housing / privacy row, the homepage Fair Housing line and the /legal page appear when 'global.legal.enabled' is 'on'. The Fair Housing Notice and SOP links take full https:// addresses (empty Fair Housing link = the /legal page; empty SOP link = hidden). The rest of the footer and /legal text is in Content. Changes save to the draft; they go live when you publish in the editor."
          />
        ) : null}
        {tab === "Plans" ? <PlansTab /> : null}
        {tab === "Admins" && status.role === "owner" ? <AdminsTab me={status.email} /> : null}
      </div>
    </section>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-xl px-5 py-20">
      <p className="text-xs uppercase tracking-widest text-copper">Admin</p>
      <h1 className="mt-3 text-4xl">Belmore Estates</h1>
      <div className="mt-6 text-muted">{children}</div>
    </section>
  );
}

function useSaved() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const done = useCallback(
    async (p: Promise<unknown>, ok = "Saved.") => {
      setMsg("Saving…");
      try {
        await p;
        setMsg(ok);
        await router.invalidate();
        return true;
      } catch (e) {
        setMsg(`Error: ${errText(e)}`);
        return false;
      }
    },
    [router],
  );
  const view = msg ? (
    <p
      className={cn("text-sm", msg.startsWith("Error") ? "text-copper" : "text-muted")}
      role="status"
    >
      {msg}
    </p>
  ) : null;
  return { done, view };
}

// ------------------------------------------------------------------- Leads
function LeadsTab() {
  const [type, setType] = useState<LeadType | "">("");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<LeadRow[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const { done, view } = useSaved();
  const filter = useMemo(
    () => ({ type: type || undefined, status: status || undefined, q: q.trim() || undefined }),
    [type, status, q],
  );

  const load = useCallback(() => {
    listLeads({ data: filter })
      .then(setRows)
      .catch((e) => {
        setRows([]);
        void done(Promise.reject(e));
      });
  }, [filter, done]);
  useEffect(() => load(), [load]);

  async function downloadCsv() {
    const { csv } = await exportLeadsCsv({ data: filter });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `belmore-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LeadType | "")}
            className={input}
          >
            <option value="">All</option>
            {LEAD_TYPES.map((t) => (
              <option key={t} value={t}>
                {leadTypeLabel[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus | "")}
            className={input}
          >
            <option value="">All</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, note, lot"
            className={input}
          />
        </label>
        <button type="button" className={button} onClick={load}>
          Refresh
        </button>
        <button
          type="button"
          className={primary}
          onClick={() => void done(downloadCsv(), "CSV downloaded.")}
        >
          Export CSV
        </button>
      </div>
      {view}
      {rows === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No leads match.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm" data-admin-table="leads">
            <thead className="border-b border-line text-xs uppercase tracking-widest text-muted">
              <tr>
                <th className="py-2 pr-3">Received</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Lot / plan</th>
                <th className="py-2 pr-3">Email sent</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <LeadLine
                  key={r.id}
                  r={r}
                  open={open === r.id}
                  toggle={() => setOpen(open === r.id ? null : r.id)}
                  onStatus={(s) =>
                    void done(updateLeadStatus({ data: { id: r.id, status: s } })).then(
                      (ok) => ok && load(),
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LeadLine({
  r,
  open,
  toggle,
  onStatus,
}: {
  r: LeadRow;
  open: boolean;
  toggle: () => void;
  onStatus: (s: LeadStatus) => void;
}) {
  const details: [string, ReactNode][] = [
    ["Interest", r.interest],
    ["Tour", [r.tour_date, r.tour_window, r.tour_lots].filter(Boolean).join(" · ")],
    ["Second-choice lot", r.lot2_id],
    ["Move timeline", r.move_timeline],
    ["Bedrooms", r.bedrooms],
    ["Phase 1 news", r.type === "waitlist" ? (r.phase1_news ? "Yes" : "No") : null],
    ["Financing", r.financing],
    [
      "Non-binding acknowledged",
      r.type === "reservation" ? (r.ack_nonbinding ? "Yes" : "No") : null,
    ],
    ["Realtor introduction", r.realtor ? "Yes" : null],
    ["Agent", [r.agent_name, r.brokerage].filter(Boolean).join(", ")],
    ["Note", r.note],
    ["Page", r.source_page],
    ["Email error", r.notify_error],
  ];
  return (
    <>
      <tr className="border-b border-line align-top">
        <td className="py-2 pr-3 whitespace-nowrap">
          <button type="button" onClick={toggle} className="underline" aria-expanded={open}>
            {r.created_at.slice(0, 16)}
          </button>
        </td>
        <td className="py-2 pr-3">{leadTypeLabel[r.type as LeadType] ?? r.type}</td>
        <td className="py-2 pr-3">{r.name}</td>
        <td className="py-2 pr-3">
          <a href={`mailto:${r.email}`} className="underline">
            {r.email}
          </a>
          {r.phone ? <div>{r.phone}</div> : null}
        </td>
        <td className="py-2 pr-3">
          {[r.lot_id && `Lot ${r.lot_id}`, r.plan_slug].filter(Boolean).join(" · ") || "—"}
        </td>
        <td className="py-2 pr-3">
          <span
            className={
              r.notify_status === "failed" || r.notify_status === "partial"
                ? "font-medium text-copper"
                : undefined
            }
          >
            {r.notify_status}
          </span>
          {r.notify_error ? (
            <div className="max-w-56 text-xs text-muted" title={r.notify_error}>
              {r.notify_error.slice(0, 80)}
              {r.notify_error.length > 80 ? "…" : ""}
            </div>
          ) : null}
        </td>
        <td className="py-2 pr-3">
          <select
            aria-label={`Status for lead ${r.id}`}
            value={r.status}
            onChange={(e) => onStatus(e.target.value as LeadStatus)}
            className={input}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-line bg-cream">
          <td colSpan={7} className="px-3 py-3">
            <dl className="grid gap-2 sm:grid-cols-2">
              {details
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-widest text-muted">{k}</dt>
                    <dd className="whitespace-pre-wrap">{v}</dd>
                  </div>
                ))}
            </dl>
          </td>
        </tr>
      ) : null}
    </>
  );
}

// ----------------------------------------------------------------- Content
function useBlocks() {
  const [rows, setRows] = useState<BlockRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    listBlocks()
      .then(setRows)
      .catch((e) => setError(errText(e)));
  }, []);
  useEffect(() => load(), [load]);
  return { rows, error, load };
}

function ContentTab({ filter, intro }: { filter: (key: string) => boolean; intro?: string }) {
  const { rows, error, load } = useBlocks();
  const [q, setQ] = useState("");
  const [page, setPage] = useState("");
  if (error) return <p className="text-sm text-copper">{error}</p>;
  if (!rows) return <p className="text-sm text-muted">Loading…</p>;
  const mine = rows.filter((r) => filter(r.key));
  const pages = [...new Set(mine.map((r) => r.key.split(".")[0]))];
  const shown = mine.filter(
    (r) =>
      (!page || r.key.startsWith(`${page}.`)) &&
      (!q || r.key.includes(q.toLowerCase()) || r.value.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div className="grid gap-4">
      {intro ? <p className="text-sm text-muted">{intro}</p> : null}
      <p
        className="border border-dashed border-copper bg-cream px-4 py-3 text-sm"
        data-banner="draft-note"
      >
        Changes here go into the website <strong>draft</strong>. Visitors see them after you press{" "}
        <strong>Publish</strong> in{" "}
        <a href="/editor" className="underline underline-offset-4">
          the visual editor
        </a>
        .
      </p>
      <p className="text-sm text-muted">
        Text in [BRACKETS — TO COME] shows as a placeholder on the site. Use {"{{CONTACT_EMAIL}}"}{" "}
        for the contact email. "Reset" restores Quill's copy.
      </p>
      <div className="flex flex-wrap gap-3">
        {pages.length > 1 ? (
          <select
            value={page}
            onChange={(e) => setPage(e.target.value)}
            className={input}
            aria-label="Page"
          >
            <option value="">All pages</option>
            {pages.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        ) : null}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search keys or text"
          className={input}
        />
        <span className="self-center text-sm text-muted">{shown.length} blocks</span>
      </div>
      <div className="grid gap-3">
        {shown.slice(0, 200).map((r) => (
          <BlockEditor key={r.key} row={r} onSaved={load} />
        ))}
        {shown.length > 200 ? (
          <p className="text-sm text-muted">Showing 200; narrow the search.</p>
        ) : null}
      </div>
    </div>
  );
}

function BlockEditor({ row, onSaved }: { row: BlockRow; onSaved: () => void }) {
  const [value, setValue] = useState(row.value);
  const { done, view } = useSaved();
  useEffect(() => setValue(row.value), [row.value]);
  const changed = value !== row.value;
  const overridden = row.value !== row.defaultValue;
  return (
    <div className="grid gap-2 border-t border-line pt-3" data-block-key={row.key}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <code className="text-xs text-muted">{row.key}</code>
        {overridden ? (
          <span className="text-xs text-copper">
            Edited{row.updatedBy ? ` by ${row.updatedBy}` : ""}
          </span>
        ) : null}
      </div>
      {row.multiline ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          className="border border-line bg-cream px-3 py-2 text-sm"
        />
      ) : (
        <input value={value} onChange={(e) => setValue(e.target.value)} className={input} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!changed}
          className={primary}
          onClick={() =>
            void done(saveBlock({ data: { key: row.key, value } })).then((ok) => ok && onSaved())
          }
        >
          Save
        </button>
        {overridden ? (
          <button
            type="button"
            className={button}
            onClick={() =>
              void done(
                saveBlock({ data: { key: row.key, value: "", reset: true } }),
                "Reset.",
              ).then((ok) => ok && onSaved())
            }
          >
            Reset
          </button>
        ) : null}
        {view}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Photos
function PhotosTab() {
  const [media, setMedia] = useState<
    { id: number; name: string; mime: string; bytes: number; created_at: string }[]
  >([]);
  const { done, view } = useSaved();
  const load = useCallback(() => {
    listMedia()
      .then(setMedia)
      .catch(() => setMedia([]));
  }, []);
  useEffect(() => load(), [load]);

  async function upload(file: File) {
    if (file.size > 1024 * 1024) throw new Error("Image must be under 1 MB");
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000)
      bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    await uploadMedia({
      data: { name: file.name, mime: file.type as "image/jpeg", dataBase64: btoa(bin) },
    });
    load();
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl">Upload</h2>
        <p className="text-sm text-muted">
          JPEG, PNG, WebP or GIF under 1 MB. Uploaded files are stored in the database and get a
          /media/… URL you can paste into any image slot below or into a plan. Don't upload GLA's
          images unless you have their permission.
        </p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void done(upload(f), "Uploaded.");
            e.target.value = "";
          }}
        />
        {view}
        {media.length ? (
          <ul className="grid gap-3 sm:grid-cols-3">
            {media.map((m) => (
              <li key={m.id} className="border border-line bg-cream p-2 text-xs">
                <img
                  src={`/media/${m.id}`}
                  alt={m.name}
                  className="aspect-video w-full object-cover"
                />
                <p className="mt-2 break-all">
                  <code>/media/{m.id}</code> · {m.name} · {Math.round(m.bytes / 1024)} KB
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="grid gap-2">
        <h2 className="text-2xl">Image slots</h2>
        <p className="text-sm text-muted">
          Use a /path or an https:// URL. Alt text lives in the Content tab.
        </p>
        <ImageSlots />
      </div>
    </div>
  );
}

function ImageSlots() {
  const { rows, error, load } = useBlocks();
  if (error) return <p className="text-sm text-copper">{error}</p>;
  if (!rows) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows
        .filter((r) => r.image || r.key.endsWith(".image.src"))
        .map((r) => (
          <div key={r.key} className="grid gap-2">
            <img
              src={r.value || "/images/plan-placeholder.svg"}
              alt=""
              className="aspect-video w-full border border-line object-cover"
            />
            <BlockEditor row={r} onSaved={load} />
          </div>
        ))}
    </div>
  );
}

// -------------------------------------------------------------------- Lots
function LotsTab() {
  const [lots, setLots] = useState<PhaseLot[] | null>(null);
  const load = useCallback(() => {
    listAdminLots()
      .then(setLots)
      .catch(() => setLots([]));
  }, []);
  useEffect(() => load(), [load]);
  if (!lots) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Status shows on the lot cards, lot pages, the 3D site plan and the Phase 1 list. Price and
        premium show as written; "On request" and "TBD" are the defaults.
      </p>
      {lots.map((lot) => (
        <LotEditor key={lot.id} lot={lot} onSaved={load} />
      ))}
    </div>
  );
}

function LotEditor({ lot, onSaved }: { lot: PhaseLot; onSaved: () => void }) {
  const [status, setStatus] = useState<LotStatus>(lot.status);
  const [note, setNote] = useState(lot.note);
  const [priceText, setPrice] = useState(lot.priceText);
  const [premium, setPremium] = useState(lot.premium);
  const { done, view } = useSaved();
  return (
    <div className="grid gap-3 border-t border-line pt-4 lg:grid-cols-12" data-admin-lot={lot.id}>
      <div className="lg:col-span-3">
        <p className="font-display text-2xl">Lot {lot.id}</p>
        <p className="text-xs text-muted">{lot.street}</p>
        <p className="text-xs text-muted">{lot.acres}</p>
        <LotStatusBadge status={lot.status} className="mt-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:col-span-9">
        <label className="grid gap-1 text-sm">
          Status
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as LotStatus)}
            className={input}
          >
            {LOT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Price
          <input value={priceText} onChange={(e) => setPrice(e.target.value)} className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          Lot premium
          <input value={premium} onChange={(e) => setPremium(e.target.value)} className={input} />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-3">
          Note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="border border-line bg-cream px-3 py-2 text-sm"
          />
        </label>
        <div className="flex items-center gap-3 sm:col-span-3">
          <button
            type="button"
            className={primary}
            onClick={() =>
              void done(
                saveLot({ data: { id: lot.id as "801", status, note, priceText, premium } }),
              ).then((ok) => ok && onSaved())
            }
          >
            Save lot {lot.id}
          </button>
          {view}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- Plans
const emptyPlan = (): Plan & { isNew?: boolean } => ({
  slug: "",
  sort: 0,
  hidden: false,
  name: "",
  planNumber: "",
  beds: 3,
  baths: "2",
  sqft: 0,
  sqftFirst: "",
  sqftSecond: "",
  stories: "One story",
  garage: "2-car",
  width: "",
  depth: "",
  footprint: "",
  style: "",
  priceText: "TBD",
  architect: "GLA Architecture",
  glaUrl: "",
  renderingImage: "/images/plan-placeholder.svg",
  renderingAlt: "",
  floorPlanImage: "/images/plan-placeholder.svg",
  imagesPending: true,
  isModel: false,
  featured: false,
  isNew: true,
});

function PlansTab() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [editing, setEditing] = useState<(Plan & { isNew?: boolean }) | null>(null);
  const { done, view } = useSaved();
  const load = useCallback(() => {
    listAdminPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);
  useEffect(() => load(), [load]);
  if (!plans) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primary} onClick={() => setEditing(emptyPlan())}>
          Add plan
        </button>
        {view}
      </div>
      <p className="text-sm text-muted">
        The home page shows only the plan marked <strong>Model home</strong> plus the first three
        plans marked <strong>Featured</strong> (in this order). /plans shows the model, then those
        three, then every other visible plan under “More plans to explore”. Only one plan can be the
        model home; it is always featured.
      </p>
      {editing ? (
        <PlanEditor
          plan={editing}
          onCancel={() => setEditing(null)}
          onSave={(p) =>
            void done(savePlan({ data: p })).then((ok) => {
              if (ok) {
                setEditing(null);
                load();
              }
            })
          }
        />
      ) : null}
      <ol className="grid gap-2">
        {plans.map((p, i) => (
          <li
            key={p.slug}
            className="flex flex-wrap items-center gap-3 border-t border-line py-2 text-sm"
            data-admin-plan={p.slug}
          >
            <span className="w-8 text-muted">{i + 1}</span>
            <span className={cn("min-w-48 flex-1", p.hidden && "text-muted line-through")}>
              {p.name} <span className="text-muted">· {p.slug}</span>
              {p.isModel ? (
                <span className="ml-2 bg-copper px-2 py-0.5 text-xs uppercase tracking-widest text-cream">
                  model home
                </span>
              ) : null}
              {p.featured && !p.isModel ? (
                <span className="ml-2 border border-copper px-2 py-0.5 text-xs uppercase tracking-widest text-copper">
                  featured
                </span>
              ) : null}
              {p.hidden ? <span className="ml-2 text-xs text-copper">hidden</span> : null}
            </span>
            <button
              type="button"
              className={button}
              disabled={i === 0}
              onClick={() =>
                void done(movePlan({ data: { slug: p.slug, direction: "up" } })).then(load)
              }
            >
              ↑
            </button>
            <button
              type="button"
              className={button}
              disabled={i === plans.length - 1}
              onClick={() =>
                void done(movePlan({ data: { slug: p.slug, direction: "down" } })).then(load)
              }
            >
              ↓
            </button>
            <button
              type="button"
              className={button}
              onClick={() =>
                void done(savePlan({ data: toInput({ ...p, hidden: !p.hidden }) })).then(load)
              }
            >
              {p.hidden ? "Show" : "Hide"}
            </button>
            <button type="button" className={button} onClick={() => setEditing(p)}>
              Edit
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function toInput(p: Plan & { isNew?: boolean }) {
  return {
    slug: p.slug,
    isNew: p.isNew,
    name: p.name,
    planNumber: p.planNumber,
    beds: Number(p.beds) || 0,
    baths: String(p.baths),
    sqft: Number(p.sqft) || 0,
    sqftFirst: p.sqftFirst,
    sqftSecond: p.sqftSecond,
    stories: p.stories,
    garage: p.garage,
    width: p.width,
    depth: p.depth,
    footprint: p.footprint,
    priceText: p.priceText,
    glaUrl: p.glaUrl,
    renderingImage: p.renderingImage,
    renderingAlt: p.renderingAlt,
    floorPlanImage: p.floorPlanImage,
    imagesPending: p.imagesPending,
    hidden: p.hidden,
    isModel: p.isModel,
    featured: p.featured || p.isModel,
  };
}

function PlanEditor({
  plan,
  onCancel,
  onSave,
}: {
  plan: Plan & { isNew?: boolean };
  onCancel: () => void;
  onSave: (p: ReturnType<typeof toInput>) => void;
}) {
  const [p, setP] = useState(plan);
  useEffect(() => setP(plan), [plan]);
  const set = <K extends keyof Plan>(k: K, v: Plan[K]) => setP((cur) => ({ ...cur, [k]: v }));
  const text = (k: keyof Plan, label: string, disabled = false) => (
    <label className="grid gap-1 text-sm">
      {label}
      <input
        value={String(p[k] ?? "")}
        disabled={disabled}
        onChange={(e) =>
          set(
            k,
            (k === "beds" || k === "sqft" ? Number(e.target.value) || 0 : e.target.value) as never,
          )
        }
        className={input}
      />
    </label>
  );
  return (
    <div className="grid gap-3 border border-line bg-cream p-4" data-plan-editor>
      <h2 className="text-2xl">{p.isNew ? "New plan" : `Edit ${plan.name}`}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {text("name", "Name")}
        {text("slug", "Slug (URL)", !p.isNew)}
        {text("planNumber", "GLA plan number")}
        {text("beds", "Bedrooms")}
        {text("baths", "Baths")}
        {text("sqft", "Total sq ft")}
        {text("sqftFirst", "First floor sq ft")}
        {text("sqftSecond", "Second floor sq ft")}
        {text("stories", "Stories")}
        {text("garage", "Garage")}
        {text("width", "Width")}
        {text("depth", "Depth")}
        {text("footprint", "Footprint")}
        {text("priceText", "Price")}
        {text("glaUrl", "GLA page (https://)")}
        {text("renderingImage", "Rendering image URL")}
        {text("renderingAlt", "Rendering alt text")}
        {text("floorPlanImage", "Floor plan image URL")}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={p.imagesPending}
          onChange={(e) => set("imagesPending", e.target.checked)}
        />
        Images pending (show the neutral placeholder)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={p.hidden}
          onChange={(e) => set("hidden", e.target.checked)}
        />
        Hidden from the site
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={p.isModel}
          onChange={(e) => set("isModel", e.target.checked)}
          data-plan-flag="model"
        />
        Model home (featured on Home and at the top of /plans; replaces the current model)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={p.featured || p.isModel}
          disabled={p.isModel}
          onChange={(e) => set("featured", e.target.checked)}
          data-plan-flag="featured"
        />
        Featured (one of the three plans shown on Home and in the /plans showcase)
      </label>
      <div className="flex gap-2">
        <button type="button" className={primary} onClick={() => onSave(toInput(p))}>
          Save plan
        </button>
        <button type="button" className={button} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Admins
function AdminsTab({ me }: { me: string }) {
  const [rows, setRows] = useState<
    { email: string; role: string; added_by: string | null; created_at: string }[]
  >([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "owner">("admin");
  const { done, view } = useSaved();
  const load = useCallback(() => {
    listAdmins()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  useEffect(() => load(), [load]);
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Admins sign in with Google (verified email), or with an email + password an owner sets
        below. Only owners can add or remove people. Owners (including OWNER_EMAILS) can't be
        removed or demoted here.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className={input}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "owner")}
            className={input}
          >
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
        </label>
        <button
          type="button"
          className={primary}
          onClick={() =>
            void done(addAdmin({ data: { email, role } }), "Added.").then((ok) => {
              if (ok) {
                setEmail("");
                load();
              }
            })
          }
        >
          Add
        </button>
        {view}
      </div>
      <ul className="grid gap-2">
        {rows.map((r) => (
          <li
            key={r.email}
            data-admin-row={r.email}
            data-admin-role={r.role}
            className="flex flex-wrap items-center gap-3 border-t border-line py-2 text-sm"
          >
            <span className="flex-1">
              {r.email} <span className="text-muted">· {r.role}</span>
              {r.added_by ? (
                <span className="text-xs text-muted"> · added by {r.added_by}</span>
              ) : null}
            </span>
            {r.email !== me.toLowerCase() && r.role !== "owner" ? (
              <button
                type="button"
                className={button}
                onClick={() =>
                  void done(removeAdmin({ data: { email: r.email } }), "Removed.").then(load)
                }
              >
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <PasswordAccounts emails={rows.map((r) => r.email)} />
    </div>
  );
}

/** Owner-only: create or reset an email + password sign-in for someone on the admin list. */
function PasswordAccounts({ emails }: { emails: string[] }) {
  const [withPassword, setWithPassword] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { done, view } = useSaved();
  const load = useCallback(() => {
    listPasswordAccounts()
      .then(setWithPassword)
      .catch(() => setWithPassword([]));
  }, []);
  useEffect(() => load(), [load]);
  return (
    <div className="mt-6 grid gap-3 border-t border-line pt-6" data-admin-passwords>
      <h2 className="text-2xl">Password sign-in (backup)</h2>
      <p className="text-sm text-muted">
        For when Google sign-in isn't working. Pick someone on the admin list and set a password
        (12+ characters) — then tell them privately. There is no "forgot password" email: if they
        forget it, set a new one here (that also signs them out everywhere).
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Admin
          <select value={email} onChange={(e) => setEmail(e.target.value)} className={input}>
            <option value="">Choose…</option>
            {emails.map((e) => (
              <option key={e} value={e}>
                {e}
                {withPassword.includes(e) ? " (has a password)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          New password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            minLength={12}
            className={input}
          />
        </label>
        <button
          type="button"
          className={primary}
          disabled={!email || password.length < 12}
          onClick={() =>
            void done(setAdminPassword({ data: { email, password } }), "Password saved.").then(
              (ok) => {
                if (ok) {
                  setPassword("");
                  load();
                }
              },
            )
          }
        >
          Set password
        </button>
        {view}
      </div>
    </div>
  );
}
