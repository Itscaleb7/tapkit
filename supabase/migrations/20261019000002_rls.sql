-- Row Level Security. Every user-owned table is private to its owner.
-- Cross-table references (pillar_id, experiment_id, ...) are validated with
-- EXISTS subqueries which themselves run under RLS, so a user can only link
-- to rows they own.

alter table public.profiles enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.blueprints enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.content_pillars enable row level security;
alter table public.brand_versions enable row level security;
alter table public.proof_entries enable row level security;
alter table public.experiments enable row level security;
alter table public.content_projects enable row level security;
alter table public.content_sources enable row level security;
alter table public.metric_snapshots enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.recommendations enable row level security;
alter table public.strategic_decisions enable row level security;
alter table public.offers enable row level security;
alter table public.portfolios enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.subscriptions enable row level security;
alter table public.revenuecat_events enable row level security;
alter table public.ai_usage enable row level security;
alter table public.export_usage enable row level security;
alter table public.enquiry_rate enable row level security;
alter table public.plan_limits enable row level security;

-- Profiles (row created by trigger)
create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Simple owner-only tables
create policy onboarding_all on public.onboarding_responses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy brand_profiles_all on public.brand_profiles for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (current_blueprint_id is null or exists (select 1 from public.blueprints b where b.id = current_blueprint_id)));

create policy pillars_all on public.content_pillars for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy brand_versions_select on public.brand_versions for select to authenticated using (user_id = (select auth.uid()));
create policy brand_versions_insert on public.brand_versions for insert to authenticated with check (user_id = (select auth.uid()));

-- Blueprints: created by the AI edge function (service role); users can read, edit and decide.
create policy blueprints_select on public.blueprints for select to authenticated using (user_id = (select auth.uid()));
create policy blueprints_update on public.blueprints for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy proof_all on public.proof_entries for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (pillar_id is null or exists (select 1 from public.content_pillars p where p.id = pillar_id)));

create policy experiments_all on public.experiments for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (pillar_id is null or exists (select 1 from public.content_pillars p where p.id = pillar_id)));

create policy content_all on public.content_projects for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (pillar_id is null or exists (select 1 from public.content_pillars p where p.id = pillar_id))
    and (experiment_id is null or exists (select 1 from public.experiments e where e.id = experiment_id))
  );

create policy content_sources_select on public.content_sources for select to authenticated using (user_id = (select auth.uid()));
create policy content_sources_delete on public.content_sources for delete to authenticated using (user_id = (select auth.uid()));
create policy content_sources_insert on public.content_sources for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.content_projects c where c.id = content_id)
    and exists (select 1 from public.proof_entries e where e.id = proof_entry_id)
  );

create policy metrics_all on public.metric_snapshots for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (content_id is null or exists (select 1 from public.content_projects c where c.id = content_id))
    and (experiment_id is null or exists (select 1 from public.experiments e where e.id = experiment_id))
  );

create policy weekly_reviews_select on public.weekly_reviews for select to authenticated using (user_id = (select auth.uid()));
create policy weekly_reviews_delete on public.weekly_reviews for delete to authenticated using (user_id = (select auth.uid()));

create policy recommendations_select on public.recommendations for select to authenticated using (user_id = (select auth.uid()));
create policy recommendations_update on public.recommendations for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy recommendations_delete on public.recommendations for delete to authenticated using (user_id = (select auth.uid()));

create policy decisions_all on public.strategic_decisions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (recommendation_id is null or exists (select 1 from public.recommendations r where r.id = recommendation_id)));

create policy offers_all on public.offers for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy portfolios_all on public.portfolios for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy portfolio_items_all on public.portfolio_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (content_id is null or exists (select 1 from public.content_projects c where c.id = content_id)));

create policy leads_all on public.leads for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (offer_id is null or exists (select 1 from public.offers o where o.id = offer_id)));

create policy lead_activities_all on public.lead_activities for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.leads l where l.id = lead_id));

-- Server-written tables: users may only read their own rows.
create policy subscriptions_select on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy ai_usage_select on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));
create policy export_usage_select on public.export_usage for select to authenticated using (user_id = (select auth.uid()));

-- Plan limits are public configuration.
create policy plan_limits_read on public.plan_limits for select to anon, authenticated using (true);

-- revenuecat_events and enquiry_rate: no policies → inaccessible to anon/authenticated.

-- Defence in depth: remove broad default privileges on server-only tables.
revoke insert, update, delete on public.subscriptions, public.ai_usage, public.export_usage, public.revenuecat_events, public.enquiry_rate, public.plan_limits from anon, authenticated;
revoke insert, delete on public.blueprints, public.weekly_reviews from anon, authenticated;
revoke insert, delete on public.recommendations from anon, authenticated;
revoke insert, delete on public.profiles from anon, authenticated;
revoke all on all tables in schema public from anon;
grant select on public.plan_limits to anon;
