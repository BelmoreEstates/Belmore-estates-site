/**
 * /admin server functions. EVERY function here runs `authMiddleware` (blocks
 * cross-site requests) and then `requireAdmin` / `requireOwner` (403 unless the
 * signed-in, verified Google email is in OWNER_EMAILS or the `admins` table). Never trust the client UI.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { blockDefByKey, blockDefs } from "@/data/content";
import { MAX_UPLOAD_BYTES } from "@/data/site-config";
import { contactEmail, ownerEmails, web3formsAccessKeys, web3formsMode } from "./env";
import { LEAD_STATUSES, LEAD_TYPES } from "./lead-schema";

async function admin() {
  const sql = await getSql();
  const { requireAdmin } = await import("./security.server");
  return { sql, me: await requireAdmin(sql) };
}
async function owner() {
  const sql = await getSql();
  const { requireOwner } = await import("./security.server");
  return { sql, me: await requireOwner(sql) };
}

// ------------------------------------------------------------------ status
export type AdminStatus =
  | { state: "signed_out" }
  | { state: "denied"; reason: "unverified" | "not_allowlisted"; email: string | null }
  | {
      state: "admin";
      email: string;
      role: "owner" | "admin";
      notifications: { configured: boolean; mode: string; contactEmail: string; keyCount: number };
    };

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<AdminStatus> => {
    const sql = await getSql();
    const { checkAdmin } = await import("./security.server");
    const result = await checkAdmin(sql);
    if (!result.ok)
      return result.reason === "signed_out"
        ? { state: "signed_out" }
        : { state: "denied", reason: result.reason, email: result.email };
    return {
      state: "admin",
      email: result.admin.email,
      role: result.admin.role,
      notifications: {
        configured: web3formsAccessKeys().length > 0,
        mode: web3formsMode(),
        contactEmail: contactEmail(),
        keyCount: web3formsAccessKeys().length,
      },
    };
  });

// ------------------------------------------------------------------- leads
const leadFilter = z.object({
  type: z.enum(LEAD_TYPES).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
});

export type LeadRow = {
  id: number;
  created_at: string;
  type: string;
  status: string;
  name: string;
  email: string;
  phone: string | null;
  interest: string | null;
  lot_id: string | null;
  lot2_id: string | null;
  tour_lots: string | null;
  move_timeline: string | null;
  bedrooms: string | null;
  phase1_news: boolean;
  financing: string | null;
  ack_nonbinding: boolean;
  plan_slug: string | null;
  tour_date: string | null;
  tour_window: string | null;
  realtor: boolean;
  agent_name: string | null;
  brokerage: string | null;
  note: string | null;
  consent: boolean;
  source_page: string | null;
  notify_status: string;
  notify_error: string | null;
};

async function queryLeads(
  sql: Awaited<ReturnType<typeof getSql>>,
  f: z.infer<typeof leadFilter>,
): Promise<LeadRow[]> {
  const like = f.q ? `%${f.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%` : null;
  return sql.query<LeadRow>(
    `select id, created_at::text as created_at, type, status, name, email, phone, interest, lot_id,
            lot2_id, tour_lots, move_timeline, bedrooms, phase1_news, financing, ack_nonbinding, plan_slug, tour_date, tour_window, realtor, agent_name, brokerage, note, consent,
            source_page, notify_status, notify_error
       from leads
      where ($1::text is null or type = $1)
        and ($2::text is null or status = $2)
        and ($3::text is null or name ilike $3 or email ilike $3 or coalesce(note,'') ilike $3
             or coalesce(lot_id,'') ilike $3 or coalesce(brokerage,'') ilike $3)
      order by created_at desc, id desc
      limit 1000`,
    [f.type ?? null, f.status ?? null, like],
  );
}

export const listLeads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(leadFilter)
  .handler(async ({ data }) => {
    const { sql } = await admin();
    return queryLeads(sql, data);
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive(), status: z.enum(LEAD_STATUSES) }))
  .handler(async ({ data }) => {
    const { sql, me } = await admin();
    await sql`update leads set status = ${data.status}, status_changed_by = ${me.email}, updated_at = now() where id = ${data.id}`;
    return { ok: true };
  });

function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const exportLeadsCsv = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(leadFilter)
  .handler(async ({ data }) => {
    const { sql } = await admin();
    const rows = await queryLeads(sql, data);
    const cols: (keyof LeadRow)[] = [
      "id", "created_at", "type", "status", "name", "email", "phone", "lot_id", "lot2_id", "plan_slug", "interest",
      "tour_date", "tour_window", "tour_lots", "move_timeline", "bedrooms", "phase1_news", "financing", "ack_nonbinding", "realtor", "agent_name", "brokerage", "note", "consent", "source_page",
      "notify_status",
    ];
    const lines = [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))];
    return { csv: lines.join("\r\n") };
  });

// ------------------------------------------------------------------ blocks
export type BlockRow = { key: string; value: string; defaultValue: string; multiline: boolean; image: boolean; updatedBy: string | null; updatedAt: string | null };

export const listBlocks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<BlockRow[]> => {
    const { sql } = await admin();
    const rows = await sql<{ key: string; value: string; updated_by: string | null; updated_at: string }>`
      select key, value, updated_by, updated_at::text as updated_at from content_blocks`;
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return blockDefs.map((d) => {
      const r = byKey.get(d.key);
      return {
        key: d.key,
        value: r?.value ?? d.value,
        defaultValue: d.value,
        multiline: Boolean(d.multiline),
        image: Boolean(d.image),
        updatedBy: r?.updated_by ?? null,
        updatedAt: r?.updated_at ?? null,
      };
    });
  });

export const saveBlock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ key: z.string().max(120), value: z.string().max(5000), reset: z.boolean().optional() }))
  .handler(async ({ data }) => {
    const { sql, me } = await admin();
    const def = blockDefByKey[data.key];
    if (!def) throw new Error("Unknown content key");
    const value = data.reset ? def.value : data.value;
    if (def.image && value && !/^(\/|https:\/\/)/.test(value)) throw new Error("Image must be a /path or https:// URL");
    await sql`
      insert into content_blocks (key, value, updated_at, updated_by) values (${data.key}, ${value}, now(), ${data.reset ? null : me.email})
      on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`;
    return { ok: true, value };
  });

// -------------------------------------------------------------------- lots
export const listAdminLots = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { sql } = await admin();
    const { loadLots } = await import("./content.server");
    return loadLots(sql);
  });

export const saveLot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.enum(["801", "802", "803", "804", "805", "806", "807"]),
      status: z.enum(["available", "reserved", "sold"]),
      note: z.string().trim().max(600),
      priceText: z.string().trim().min(1).max(80),
      premium: z.string().trim().min(1).max(80),
    }),
  )
  .handler(async ({ data }) => {
    const { sql, me } = await admin();
    const rows = await sql`
      update lots set status = ${data.status}, note = ${data.note}, price_text = ${data.priceText},
        premium = ${data.premium}, updated_at = now(), updated_by = ${me.email}
      where id = ${data.id} returning id`;
    if (!rows.length) throw new Error("Lot not found");
    return { ok: true };
  });

// ------------------------------------------------------------------- plans
export const listAdminPlans = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { sql } = await admin();
    const { loadPlans } = await import("./content.server");
    return loadPlans(sql, true);
  });

const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^(\/|https:\/\/)/.test(v), "Use a /path or https:// URL");

const planInput = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{2,40}$/, "Slug: lowercase letters, numbers, dashes"),
  isNew: z.boolean().optional(),
  name: z.string().trim().min(1).max(80),
  planNumber: z.string().trim().max(30),
  beds: z.number().int().min(0).max(20),
  baths: z.string().trim().max(10),
  sqft: z.number().int().min(0).max(20000),
  sqftFirst: z.string().trim().max(20),
  sqftSecond: z.string().trim().max(20),
  stories: z.string().trim().max(40),
  garage: z.string().trim().max(40),
  width: z.string().trim().max(40),
  depth: z.string().trim().max(40),
  footprint: z.string().trim().max(60),
  priceText: z.string().trim().min(1).max(80),
  glaUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https:\/\//.test(v), "GLA link must start with https://"),
  renderingImage: imageUrl,
  renderingAlt: z.string().trim().max(200),
  floorPlanImage: imageUrl,
  imagesPending: z.boolean(),
  hidden: z.boolean(),
  isModel: z.boolean().default(false),
  featured: z.boolean().default(false),
});

export const savePlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(planInput)
  .handler(async ({ data }) => {
    const { sql, me } = await admin();
    if (data.isNew) {
      const [{ next }] = await sql<{ next: number }>`select coalesce(max(sort), 0)::int + 1 as next from plans`;
      const created = await sql`
        insert into plans (slug, sort, hidden, name, plan_number, beds, baths, sqft, sqft_first, sqft_second,
          stories, garage, width, depth, footprint, price_text, gla_url, rendering_image, rendering_alt,
          floor_plan_image, images_pending, updated_by)
        values (${data.slug}, ${next}, ${data.hidden}, ${data.name}, ${data.planNumber}, ${data.beds}, ${data.baths},
          ${data.sqft}, ${data.sqftFirst}, ${data.sqftSecond}, ${data.stories}, ${data.garage}, ${data.width},
          ${data.depth}, ${data.footprint}, ${data.priceText}, ${data.glaUrl}, ${data.renderingImage},
          ${data.renderingAlt}, ${data.floorPlanImage}, ${data.imagesPending}, ${me.email})
        on conflict (slug) do nothing returning slug`;
      if (!created.length) throw new Error("A plan with that slug already exists");
      await setShowcaseFlags(sql, data.slug, data.isModel, data.featured);
      return { ok: true };
    }
    const rows = await sql`
      update plans set hidden = ${data.hidden}, name = ${data.name}, plan_number = ${data.planNumber},
        beds = ${data.beds}, baths = ${data.baths}, sqft = ${data.sqft}, sqft_first = ${data.sqftFirst},
        sqft_second = ${data.sqftSecond}, stories = ${data.stories}, garage = ${data.garage}, width = ${data.width},
        depth = ${data.depth}, footprint = ${data.footprint}, price_text = ${data.priceText}, gla_url = ${data.glaUrl},
        rendering_image = ${data.renderingImage}, rendering_alt = ${data.renderingAlt},
        floor_plan_image = ${data.floorPlanImage}, images_pending = ${data.imagesPending},
        updated_at = now(), updated_by = ${me.email}
      where slug = ${data.slug} returning slug`;
    if (!rows.length) throw new Error("Plan not found");
    await setShowcaseFlags(sql, data.slug, data.isModel, data.featured);
    return { ok: true };
  });

/** One model home at a time; the model home is always featured. */
async function setShowcaseFlags(sql: Awaited<ReturnType<typeof admin>>["sql"], slug: string, isModel: boolean, featured: boolean) {
  if (isModel) await sql`update plans set is_model = false where slug <> ${slug} and is_model`;
  await sql`update plans set is_model = ${isModel}, featured = ${featured || isModel} where slug = ${slug}`;
}

export const movePlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ slug: z.string().max(40), direction: z.enum(["up", "down"]) }))
  .handler(async ({ data }) => {
    const { sql, me } = await admin();
    const rows = await sql<{ slug: string }>`select slug from plans order by sort, slug`;
    const order = rows.map((r) => r.slug);
    const i = order.indexOf(data.slug);
    const j = data.direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= order.length) return { ok: true };
    [order[i], order[j]] = [order[j], order[i]];
    for (let k = 0; k < order.length; k++)
      await sql`update plans set sort = ${k + 1}, updated_by = coalesce(updated_by, ${me.email}) where slug = ${order[k]}`;
    return { ok: true };
  });

// ------------------------------------------------------------------- media
export const uploadMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().trim().max(120),
      mime: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
      dataBase64: z.string().max(Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 8),
    }),
  )
  .handler(async ({ data }) => {
    const { sql, me } = await admin();
    const bytes = Buffer.from(data.dataBase64, "base64");
    if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) throw new Error("Image must be under 1 MB");
    const magic = bytes.subarray(0, 12);
    const ok =
      (data.mime === "image/jpeg" && magic[0] === 0xff && magic[1] === 0xd8) ||
      (data.mime === "image/png" && magic.subarray(0, 4).toString("hex") === "89504e47") ||
      (data.mime === "image/gif" && magic.subarray(0, 3).toString() === "GIF") ||
      (data.mime === "image/webp" && magic.subarray(8, 12).toString() === "WEBP");
    if (!ok) throw new Error("File content does not match its image type");
    const [row] = await sql<{ id: number }>`
      insert into media (name, mime, bytes, data, created_by)
      values (${data.name}, ${data.mime}, ${bytes.length}, ${bytes.toString("base64")}, ${me.email}) returning id`;
    return { url: `/media/${row.id}` };
  });

export const listMedia = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { sql } = await admin();
    return sql<{ id: number; name: string; mime: string; bytes: number; created_at: string }>`
      select id, name, mime, bytes, created_at::text as created_at from media order by id desc limit 200`;
  });

// ------------------------------------------------------------------ admins
export const listAdmins = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { sql } = await admin();
    const rows = await sql<{ email: string; role: string; added_by: string | null; created_at: string }>`
      select email, role, added_by, created_at::text as created_at from admins order by role desc, email`;
    const fallback = ownerEmails().filter((e) => !rows.some((r) => r.email === e));
    return [
      ...fallback.map((email) => ({ email, role: "owner", added_by: "OWNER_EMAILS (env)", created_at: "" })),
      ...rows,
    ];
  });

export const addAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ email: z.string().trim().toLowerCase().max(254).pipe(z.email()), role: z.enum(["owner", "admin"]) }))
  .handler(async ({ data }) => {
    const { sql, me } = await owner();
    const { isOwnerEmail } = await import("./security.server");
    const [existing] = await sql<{ role: string }>`select role from admins where email = ${data.email}`;
    // Owners can't be demoted (or removed) from the admin UI.
    if (data.role !== "owner" && (existing?.role === "owner" || isOwnerEmail(data.email)))
      throw new Error("Owners can't be changed to admin");
    await sql`
      insert into admins (email, role, added_by) values (${data.email}, ${data.role}, ${me.email})
      on conflict (email) do update set role = excluded.role`;
    return { ok: true };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ email: z.string().trim().toLowerCase().max(254) }))
  .handler(async ({ data }) => {
    const { sql } = await owner();
    const { isOwnerEmail } = await import("./security.server");
    if (isOwnerEmail(data.email)) throw new Error("Owners can't be removed");
    const [target] = await sql<{ role: string }>`select role from admins where email = ${data.email}`;
    if (!target) return { ok: true };
    if (target.role === "owner") throw new Error("Owners can't be removed");
    await sql`delete from admins where email = ${data.email}`;
    return { ok: true };
  });
