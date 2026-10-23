-- Two owner inboxes, and one Web3Forms submission per access key.
--
-- 1) belmoreestates@gmail.com joins realtor.deleguardia@gmail.com as an owner
--    (both are also in the OWNER_EMAILS fallback; owners cannot be removed).
-- 2) Leads record each notification attempt in notify_results (one entry per
--    key: {key: "…last4", ok, error, at}); notify_status gains 'partial' for
--    "some sends failed".
insert into admins (email, role, added_by)
values ('belmoreestates@gmail.com', 'owner', 'seed'),
       ('realtor.deleguardia@gmail.com', 'owner', 'seed')
on conflict (email) do update set role = 'owner';

alter table leads add column if not exists notify_results jsonb not null default '[]'::jsonb;
alter table leads drop constraint if exists leads_notify_status_check;
alter table leads add constraint leads_notify_status_check
  check (notify_status in ('pending', 'sent', 'partial', 'failed', 'not_configured', 'client'));
