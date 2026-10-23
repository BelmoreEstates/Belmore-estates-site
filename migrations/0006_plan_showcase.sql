-- Plan showcase: Stonebridge is the approved model home; Applewood, Saranac and
-- Cravenwood are the three similar plans shown with it on Home and /plans.
-- All 15 GLA plans stay visible on /plans; Home only shows flagged plans.
alter table plans add column if not exists is_model boolean not null default false;
alter table plans add column if not exists featured boolean not null default false;

update plans set is_model = (slug = 'stonebridge'),
  featured = slug in ('stonebridge', 'applewood', 'saranac', 'cravenwood');

-- Showcase first, then the rest in their existing order.
with ranked as (
  select slug, row_number() over (
    order by case slug when 'stonebridge' then 1 when 'applewood' then 2 when 'saranac' then 3
      when 'cravenwood' then 4 else 5 end, sort, slug) as n
  from plans
)
update plans set sort = ranked.n from ranked where plans.slug = ranked.slug;
