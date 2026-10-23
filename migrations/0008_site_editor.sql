-- Visual editor (Puck). One site document holds every editable thing:
--   { v: 1, texts: {key: value overrides}, theme, nav, pages: {slug: page} }
-- Missing parts fall back to the code defaults (src/site/doc.ts), so a doc of
-- just {"v":1,"texts":{}} renders the original design and copy exactly.
--
-- site_docs has exactly two rows:
--   'draft'     — what the editor autosaves to (admins only; preview mode)
--   'published' — what visitors see. Only an explicit Publish copies the
--                 draft here (and records a site_versions row).
-- `revision` is bumped on every write (optimistic concurrency for autosave).
create table if not exists site_docs (
  id text primary key check (id in ('draft', 'published')),
  doc jsonb not null,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Every publish is a snapshot; any one can be restored into the draft.
create table if not exists site_versions (
  id serial primary key,
  doc jsonb not null,
  kind text not null default 'publish' check (kind in ('original', 'publish', 'restore-point')),
  note text not null default '',
  created_at timestamptz not null default now(),
  created_by text
);
create index if not exists site_versions_created_idx on site_versions (created_at desc);

-- Fold the old per-key overrides (content_blocks) into the doc's texts, for
-- both draft and published, so nothing the owner already edited is lost.
insert into site_docs (id, doc, updated_by)
select id, jsonb_build_object(
  'v', 1,
  'texts', coalesce((select jsonb_object_agg(key, value) from content_blocks), '{}'::jsonb)
), 'migration-0008'
from (values ('draft'), ('published')) as ids(id)
on conflict (id) do nothing;

insert into site_versions (doc, kind, note, created_by)
select doc, 'original', 'Original site (before the visual editor)', 'migration-0008'
from site_docs where id = 'published';

-- One source of truth: the old table is kept read-only for reference only.
alter table content_blocks rename to content_blocks_legacy;

-- Better Auth rate limits stored in the database (rateLimit.storage =
-- "database"), so the email+password fallback sign-in is throttled across all
-- serverless instances, not just per instance.
create table if not exists "rateLimit" (
  "id" text not null primary key,
  "key" text not null unique,
  "count" integer not null,
  "lastRequest" bigint not null
);
