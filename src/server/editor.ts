/**
 * Visual editor (/editor) server functions. EVERY function runs
 * `authMiddleware` (blocks cross-site requests) and then `requireAdmin`
 * (403 unless the caller is signed in and on the admins allowlist, checked
 * server-side against the database). Inputs are validated with zod and the
 * whole site document again by `validateDoc` (src/server/site-doc.server.ts),
 * which also sanitizes rich text with an allowlist.
 *
 * Draft vs published: the editor only ever writes the 'draft' row. Visitors
 * read 'published', which changes only in `publishSite` (an explicit click +
 * confirm in the editor). Nothing here runs on a timer or publishes by itself.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { SiteDoc } from "@/site/doc";
import { PREVIEW_COOKIE } from "./public";

async function admin() {
  const sql = await getSql();
  const { requireAdmin } = await import("./security.server");
  return { sql, me: await requireAdmin(sql) };
}

export type EditorState = {
  doc: SiteDoc;
  revision: number;
  updatedAt: string | null;
  updatedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  /** Draft differs from what visitors see. */
  unpublished: boolean;
  me: { email: string; role: "owner" | "admin" };
};

export const loadEditor = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<EditorState> => {
    const { sql, me } = await admin();
    const { loadDoc, canonical } = await import("./site-doc.server");
    const [draft, published] = await Promise.all([
      loadDoc(sql, "draft"),
      loadDoc(sql, "published"),
    ]);
    return {
      doc: draft.doc,
      revision: draft.revision,
      updatedAt: draft.updatedAt,
      updatedBy: draft.updatedBy,
      publishedAt: published.updatedAt,
      publishedBy: published.updatedBy,
      unpublished: canonical(draft.doc) !== canonical(published.doc),
      me: { email: me.email, role: me.role },
    };
  });

const docInput = z.object({ doc: z.unknown(), revision: z.number().int().min(0) });

/** Autosave target. Validates the whole doc; refuses if another window saved in between. */
export const saveDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(docInput)
  .handler(async ({ data }) => {
    const { sql, me } = await admin();
    const { validateDoc, writeDraft, loadDoc, canonical } = await import("./site-doc.server");
    const doc = validateDoc(data.doc);
    const revision = await writeDraft(sql, doc, me.email, data.revision);
    const published = await loadDoc(sql, "published");
    return { revision, unpublished: canonical(doc) !== canonical(published.doc) };
  });

/** Publish: the draft (as saved) becomes the live site, and a version snapshot is kept. */
export const publishSite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({ revision: z.number().int().min(0), note: z.string().trim().max(200).default("") }),
  )
  .handler(async ({ data }) => {
    const { sql, me } = await admin();
    const { loadDoc, validateDoc, ConflictError } = await import("./site-doc.server");
    const draft = await loadDoc(sql, "draft");
    if (draft.revision !== data.revision) throw new ConflictError();
    const doc = validateDoc(draft.doc);
    const json = JSON.stringify(doc);
    await sql`
      insert into site_docs (id, doc, revision, updated_at, updated_by) values ('published', ${json}::jsonb, 1, now(), ${me.email})
      on conflict (id) do update set doc = excluded.doc, revision = site_docs.revision + 1, updated_at = now(), updated_by = excluded.updated_by`;
    const [version] = await sql<{ id: number }>`
      insert into site_versions (doc, kind, note, created_by) values (${json}::jsonb, 'publish', ${data.note}, ${me.email}) returning id`;
    return { ok: true, versionId: version.id };
  });

export type VersionRow = {
  id: number;
  kind: "original" | "publish" | "restore-point";
  note: string;
  created_at: string;
  created_by: string | null;
};

export const listVersions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<VersionRow[]> => {
    const { sql } = await admin();
    return sql<VersionRow>`
      select id, kind, note, created_at::text as created_at, created_by from site_versions order by id desc limit 100`;
  });

/**
 * Restore a version INTO THE DRAFT (visitors see nothing until Publish). The
 * current draft is saved as a "restore point" version first, so restoring is
 * itself reversible.
 */
export const restoreVersion = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive(), revision: z.number().int().min(0) }))
  .handler(async ({ data }) => {
    const { sql, me } = await admin();
    const { canonical, loadDoc, validateDoc, writeDraft } = await import("./site-doc.server");
    const [row] = await sql<{ doc: unknown }>`select doc from site_versions where id = ${data.id}`;
    if (!row) throw new Error("Version not found");
    const raw = typeof row.doc === "string" ? JSON.parse(row.doc) : row.doc;
    const doc = validateDoc({
      v: 1,
      texts: {},
      pages: {},
      nav: null,
      theme: {},
      ...(raw as object),
    });
    const [current, published] = await Promise.all([
      loadDoc(sql, "draft"),
      loadDoc(sql, "published"),
    ]);
    const revision = await writeDraft(sql, doc, me.email, data.revision);
    await sql`
      insert into site_versions (doc, kind, note, created_by)
      values (${JSON.stringify(current.doc)}::jsonb, 'restore-point', ${`Draft before restoring version ${data.id}`}, ${me.email})`;
    return { ok: true, revision, doc, unpublished: canonical(doc) !== canonical(published.doc) };
  });

/** Throw away unpublished changes: the draft becomes the published site again. */
export const discardDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ revision: z.number().int().min(0) }))
  .handler(async ({ data }) => {
    const { sql, me } = await admin();
    const { loadDoc, writeDraft } = await import("./site-doc.server");
    const [current, published] = await Promise.all([
      loadDoc(sql, "draft"),
      loadDoc(sql, "published"),
    ]);
    const revision = await writeDraft(sql, published.doc, me.email, data.revision);
    await sql`
      insert into site_versions (doc, kind, note, created_by)
      values (${JSON.stringify(current.doc)}::jsonb, 'restore-point', 'Draft before discarding changes', ${me.email})`;
    return { ok: true, revision, doc: published.doc, unpublished: false };
  });

/** Photo upload from the editor (already resized + re-encoded in the browser). */
export const uploadEditorImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().trim().max(120),
      mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
      dataBase64: z.string().max(4_100_000),
    }),
  )
  .handler(async ({ data }) => {
    const { sql, me } = await admin();
    const { cleanImage } = await import("./image.server");
    const { mime, bytes } = cleanImage(Buffer.from(data.dataBase64, "base64"), data.mime);
    const name = data.name.replace(/[^\w .-]/g, "").slice(0, 120) || "photo";
    const [row] = await sql<{ id: number }>`
      insert into media (name, mime, bytes, data, created_by)
      values (${name}, ${mime}, ${bytes.length}, ${bytes.toString("base64")}, ${me.email}) returning id`;
    return { url: `/media/${row.id}` };
  });

export const listEditorMedia = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { sql } = await admin();
    return sql<{ id: number; name: string; created_at: string }>`
      select id, name, created_at::text as created_at from media where mime in ('image/jpeg','image/png','image/webp') order by id desc limit 120`;
  });

/**
 * Preview mode: a cookie that makes the public pages render the DRAFT — but
 * only for a signed-in admin (getPublicData re-checks the admin on every
 * request; for anyone else the cookie does nothing).
 */
export const setPreview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ on: z.boolean() }))
  .handler(async ({ data }) => {
    const { setCookie, deleteCookie } = await import("@tanstack/react-start/server");
    if (!data.on) {
      deleteCookie(PREVIEW_COOKIE, { path: "/" });
      return { ok: true };
    }
    await admin();
    setCookie(PREVIEW_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 4,
    });
    return { ok: true };
  });
