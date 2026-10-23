/**
 * Site document storage + validation (server only). See src/site/doc.ts for
 * the shape and migrations/0008_site_editor.sql for the tables.
 */
import sanitizeHtml from "sanitize-html";
import { SOCIAL_NETWORKS, isSocialUrl, socialKey } from "@/site/social-icons";
import { z } from "zod";
import type { Sql } from "@/lib/db";
import { blockDefByKey } from "@/data/content";
import {
  COLOR_ROLES,
  FONTS,
  HEX_RE,
  ORIGINAL_PAGE,
  SLUG_RE,
  compactDoc,
  normalizeDoc,
  stableJson,
  isLibraryType,
  isValidCustomSlug,
  systemPageBySlug,
  type SiteDoc,
} from "@/site/doc";

export type DocId = "draft" | "published";
export type StoredDoc = {
  doc: SiteDoc;
  revision: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

const EMPTY: SiteDoc = { v: 1, texts: {}, pages: {}, nav: null, theme: {} };

export async function loadDoc(sql: Sql, id: DocId): Promise<StoredDoc> {
  const [row] = await sql<{
    doc: SiteDoc;
    revision: number;
    updated_at: string | null;
    updated_by: string | null;
  }>`
    select doc, revision, updated_at::text as updated_at, updated_by from site_docs where id = ${id}`;
  if (!row) return { doc: EMPTY, revision: 0, updatedAt: null, updatedBy: null };
  const doc = typeof row.doc === "string" ? (JSON.parse(row.doc) as SiteDoc) : row.doc;
  return {
    doc: sanitizeDoc({ ...EMPTY, ...doc }),
    revision: row.revision,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/* -------------------------------------------------------------- sanitize */

const RICH_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "a",
    "ul",
    "ol",
    "li",
    "h2",
    "h3",
    "h4",
    "blockquote",
    "hr",
    "code",
  ],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const external = /^https?:\/\//i.test(attribs.href ?? "");
      return {
        tagName,
        attribs: {
          href: attribs.href ?? "#",
          ...(external || attribs.target === "_blank"
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {}),
        },
      };
    },
  },
};

/** Allowlist sanitizer for rich text (block props named `html` / `*Html`). */
export function sanitizeRich(html: string): string {
  return sanitizeHtml(html, RICH_OPTIONS);
}

function sanitizeProps(value: unknown, key = ""): unknown {
  if (typeof value === "string")
    return key === "html" || key.endsWith("Html") ? sanitizeRich(value) : value;
  if (Array.isArray(value)) return value.map((v) => sanitizeProps(v));
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeProps(v, k)]));
  return value;
}

/** Sanitize every rich-text prop in a doc (on save, publish, restore and load). */
export function sanitizeDoc(doc: SiteDoc): SiteDoc {
  const pages: SiteDoc["pages"] = {};
  for (const [slug, page] of Object.entries(doc.pages ?? {}))
    pages[slug] = {
      ...page,
      content: page.content.map((b) => ({ ...b, props: sanitizeProps(b.props) as typeof b.props })),
    };
  return { ...doc, pages };
}

/* ------------------------------------------------------------- validate */

const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string().max(20000),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValue).max(80),
    z.record(z.string().max(60), jsonValue),
  ]),
);

const blockSchema = z.object({
  type: z.string().max(40),
  props: z.record(z.string().max(60), jsonValue).and(z.object({ id: z.string().min(1).max(80) })),
});

const pageSchema = z.object({
  title: z.string().trim().min(1).max(80),
  content: z.array(blockSchema).max(80),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(320).optional(),
  draftOnly: z.boolean().optional(),
});

const hrefSchema = z
  .string()
  .trim()
  .max(400)
  .refine(
    (h) =>
      /^\/[a-z0-9\-/#?=&]*$/i.test(h) ||
      /^https?:\/\/[^\s]+$/i.test(h) ||
      /^(mailto|tel):[^\s]+$/i.test(h),
    "Link must be a site page (/…) or a full web address (https://…)",
  );

const navSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(80),
      href: hrefSchema,
      label: z.string().trim().max(60).optional(),
      labelKey: z.string().max(120).optional(),
      hidden: z.boolean().optional(),
      external: z.boolean().optional(),
    }),
  )
  .max(16);

const hex = z.string().regex(HEX_RE);
const fontId = z.enum(FONTS.map((f) => f.id) as [string, ...string[]]);
const themeSchema = z
  .object({
    colors: z
      .object(Object.fromEntries(COLOR_ROLES.map((c) => [c.role, hex.optional()])))
      .partial()
      .optional(),
    fonts: z.object({ display: fontId.optional(), body: fontId.optional() }).optional(),
    buttons: z.object({ shape: z.enum(["square", "soft", "pill"]).optional() }).optional(),
    spacing: z.enum(["compact", "normal", "roomy"]).optional(),
    logo: z
      .object({
        mode: z.enum(["text", "image"]).optional(),
        src: z.string().max(400).optional(),
        alt: z.string().max(200).optional(),
        height: z.number().int().min(24).max(96).optional(),
      })
      .optional(),
  })
  .strict();

export const siteDocSchema = z.object({
  v: z.literal(1),
  texts: z.record(z.string().max(120), z.string().max(8000)),
  pages: z.record(z.string().max(60), pageSchema),
  nav: navSchema.nullable(),
  theme: themeSchema,
});

/** Parse + check a doc from the editor. Throws a readable Error on anything off. */
export function validateDoc(input: unknown): SiteDoc {
  // Text and settings only (photos are /media/ links), so 1.5 MB is generous.
  if (JSON.stringify(input ?? null).length > 1_500_000)
    throw new Error("The site is too large to save");
  const doc = siteDocSchema.parse(input) as SiteDoc;
  for (const [key, value] of Object.entries(doc.texts)) {
    const def = blockDefByKey[key];
    if (!def) {
      delete doc.texts[key];
      continue;
    }
    if (def.image && value && !/^(\/(?!\/)|https:\/\/)/.test(value))
      throw new Error(`Photo for ${key} must be an uploaded photo or https:// address`);
    if (key.startsWith("global.social.")) {
      const url = value.trim();
      const name = SOCIAL_NETWORKS.find((n) => socialKey(n.id) === key)?.label ?? key;
      if (url && !isSocialUrl(url))
        throw new Error(
          `${name} link must be a full https:// address (e.g. https://www.example.com/yourpage), or empty to hide the icon`,
        );
      doc.texts[key] = url;
    }
    if (key === "global.footer.fairhousing.url" || key === "global.footer.sop.url") {
      const url = value.trim();
      if (url && !isSocialUrl(url))
        throw new Error(
          `${key.includes("sop") ? "Standardized Operating Procedures" : "Fair Housing Notice"} link must be a full https:// address, or empty`,
        );
      doc.texts[key] = url;
    }
    if (key === "global.legal.enabled") {
      const v = value.trim().toLowerCase();
      if (v !== "" && v !== "on" && v !== "off")
        throw new Error('Legal notices setting must be "on" or empty');
      doc.texts[key] = v === "on" ? "on" : "";
    }
  }
  const slugs = Object.keys(doc.pages);
  if (slugs.length > 60) throw new Error("Too many pages");
  for (const slug of slugs) {
    const sys = systemPageBySlug[slug];
    if (!sys && !isValidCustomSlug(slug)) throw new Error(`Page address "${slug}" is not allowed`);
    for (const block of doc.pages[slug].content) {
      if (isLibraryType(block.type)) continue;
      if (ORIGINAL_PAGE[block.type] !== slug)
        throw new Error(`Section ${block.type} can't go on page ${slug}`);
    }
  }
  if (doc.theme.logo?.src && !/^(\/(?!\/)|https:\/\/)/.test(doc.theme.logo.src))
    throw new Error("Logo must be an uploaded photo");
  for (const item of doc.nav ?? []) {
    if (item.labelKey && !blockDefByKey[item.labelKey]) throw new Error("Unknown menu label");
    if (!item.labelKey && !item.label) throw new Error("Menu links need a name");
  }
  void SLUG_RE;
  return compactDoc(sanitizeDoc(doc));
}

/* ---------------------------------------------------------------- write */

export class ConflictError extends Error {
  readonly status = 409;
  constructor() {
    super("The draft was changed in another window. Reload the editor to get the latest version.");
    this.name = "ConflictError";
  }
}

/**
 * Overwrite the draft. With `expectedRevision`, only if nobody else saved in
 * between (optimistic concurrency); returns the new revision.
 */
export async function writeDraft(
  sql: Sql,
  doc: SiteDoc,
  by: string,
  expectedRevision?: number,
): Promise<number> {
  const json = JSON.stringify(doc);
  const rows =
    expectedRevision === undefined
      ? await sql<{ revision: number }>`
          insert into site_docs (id, doc, revision, updated_at, updated_by) values ('draft', ${json}::jsonb, 1, now(), ${by})
          on conflict (id) do update set doc = excluded.doc, revision = site_docs.revision + 1, updated_at = now(), updated_by = excluded.updated_by
          returning revision`
      : await sql<{ revision: number }>`
          update site_docs set doc = ${json}::jsonb, revision = revision + 1, updated_at = now(), updated_by = ${by}
          where id = 'draft' and revision = ${expectedRevision} returning revision`;
  if (!rows.length) throw new ConflictError();
  return rows[0].revision;
}

/** Stable JSON of the compacted doc: equal strings = same visible site. */
export function canonical(doc: SiteDoc): string {
  return stableJson(compactDoc(normalizeDoc(doc)));
}
