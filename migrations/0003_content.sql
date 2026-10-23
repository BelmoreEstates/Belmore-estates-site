-- Editable site content. Public pages read these through getPublicData and
-- fall back to the static defaults in src/data/* when a row (or the whole
-- table) is missing. `updated_by` is null for seeded rows and set to the admin
-- email once an owner edits a row; content imports only overwrite null rows.

create table if not exists content_blocks (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists lots (
  id text primary key,
  sort integer not null default 0,
  phase text not null default '1',
  street text not null default '',
  note text not null default '',
  area_sqft integer,
  area_acres text,
  frontage text,
  depth text,
  status text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  price_text text not null default 'On request',
  premium text not null default 'TBD',
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists plans (
  slug text primary key,
  sort integer not null default 0,
  hidden boolean not null default false,
  name text not null,
  plan_number text not null default '',
  beds integer not null default 0,
  baths text not null default '',
  sqft integer not null default 0,
  sqft_first text not null default '',
  sqft_second text not null default '',
  stories text not null default '',
  garage text not null default '',
  width text not null default '',
  depth text not null default '',
  footprint text not null default '',
  style text not null default '',
  price_text text not null default 'TBD',
  architect text not null default 'GLA Architecture',
  gla_url text not null default '',
  rendering_image text not null default '/images/plan-placeholder.svg',
  rendering_alt text not null default '',
  floor_plan_image text not null default '/images/plan-placeholder.svg',
  images_pending boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Small images uploaded from /admin (base64 text). Capped at ~1 MB per file in
-- the upload server function. Served by src/routes/media.$id.ts.
create table if not exists media (
  id serial primary key,
  name text not null default '',
  mime text not null,
  bytes integer not null,
  data text not null,
  created_at timestamptz not null default now(),
  created_by text
);
