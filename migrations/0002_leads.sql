-- Leads captured by the public forms (contact, tour, waitlist, reservation).
-- Written anonymously by the public submitLead server function; read only by
-- allowlisted admins (server-side check in src/server/admin.ts).
create table if not exists leads (
  id serial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type text not null check (type in ('contact', 'tour', 'waitlist', 'reservation')),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  name text not null,
  email text not null,
  phone text,
  interest text,
  lot_id text,
  lot2_id text,
  plan_slug text,
  tour_date date,
  tour_window text,
  tour_lots text,
  move_timeline text,
  bedrooms text,
  phase1_news boolean not null default false,
  financing text,
  ack_nonbinding boolean not null default false,
  realtor boolean not null default false,
  agent_name text,
  brokerage text,
  note text,
  consent boolean not null default false,
  source_page text,
  ip_hash text,
  user_agent text,
  notify_status text not null default 'pending'
    check (notify_status in ('pending', 'sent', 'failed', 'not_configured', 'client')),
  notify_error text,
  notify_token text,
  notified_at timestamptz,
  status_changed_by text
);

create index if not exists leads_created_idx on leads (created_at desc);
create index if not exists leads_status_idx on leads (status);
create index if not exists leads_type_idx on leads (type);

-- One row per form submission attempt, keyed by a salted SHA-256 of the
-- client IP (the raw IP is never stored). Used for the per-IP rate limit.
create table if not exists form_rate_limits (
  id serial primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists form_rate_limits_ip_idx on form_rate_limits (ip_hash, created_at);
