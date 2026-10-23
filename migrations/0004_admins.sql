-- Admin allowlist. Emails are stored lowercased. The OWNER_EMAILS env var
-- (default in src/data/site-config.ts) is an always-owner fallback so the owner
-- can never be locked out, even if this table is emptied.
create table if not exists admins (
  email text primary key check (email = lower(email)),
  role text not null default 'admin' check (role in ('owner', 'admin')),
  added_by text,
  created_at timestamptz not null default now()
);

insert into admins (email, role, added_by)
values ('realtor.deleguardia@gmail.com', 'owner', 'seed')
on conflict (email) do nothing;
