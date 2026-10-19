-- TapKit core schema
-- All user-owned tables carry user_id → auth.users(id) ON DELETE CASCADE so
-- account deletion removes every private record.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.proof_kind as enum ('note','idea','opinion','lesson','story','achievement','challenge','project_update','observation','link','voice');
create type public.classification_status as enum ('pending','done','failed','skipped','manual');
create type public.content_format as enum ('carousel','single_image','educational','personal_story','opinion','how_to','list','myth_fact','comparison','caption','hooks');
create type public.content_status as enum ('idea','draft','ready','published','archived');
create type public.experiment_status as enum ('planned','running','completed','abandoned');
create type public.blueprint_status as enum ('generated','accepted','rejected','superseded');
create type public.recommendation_status as enum ('pending','accepted','rejected','deferred');
create type public.offer_type as enum ('freelance','consulting','digital_product','partnership','newsletter','speaking','career','other');
create type public.offer_status as enum ('draft','active','archived');
create type public.lead_kind as enum ('client','lead','partner','employer','collaborator');
create type public.lead_stage as enum ('identified','contacted','replied','meeting','proposal','won','lost');
create type public.lead_activity_kind as enum ('outreach','reply','meeting','proposal','note','outcome');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles & onboarding
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  handle text check (char_length(handle) <= 40),
  onboarding_completed_at timestamptz,
  timezone text not null default 'UTC' check (char_length(timezone) <= 64),
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create table public.onboarding_responses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 65536),
  current_step int not null default 0 check (current_step between 0 and 50),
  updated_at timestamptz not null default now()
);
create trigger onboarding_updated before update on public.onboarding_responses for each row execute function public.set_updated_at();

-- Create profile + onboarding row automatically on sign-up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', ''), 80))
  on conflict (id) do nothing;
  insert into public.onboarding_responses (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Brand
-- ---------------------------------------------------------------------------
create table public.blueprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version int not null,
  status public.blueprint_status not null default 'generated',
  source text not null default 'ai' check (source in ('ai','manual')),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  input_snapshot jsonb,
  prompt_version text,
  model text,
  feedback text check (char_length(feedback) <= 1000),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (user_id, version)
);
create index blueprints_user_idx on public.blueprints (user_id, created_at desc);

create table public.brand_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  positioning text check (char_length(positioning) <= 400),
  audience text check (char_length(audience) <= 600),
  audience_needs text[] not null default '{}',
  brand_promise text check (char_length(brand_promise) <= 300),
  differentiators text[] not null default '{}',
  voice_summary text check (char_length(voice_summary) <= 300),
  voice_traits text[] not null default '{}',
  voice_do text[] not null default '{}',
  voice_avoid text[] not null default '{}',
  values text[] not null default '{}',
  goals text[] not null default '{}',
  platforms text[] not null default '{}',
  visual_preferences text check (char_length(visual_preferences) <= 400),
  stage text check (char_length(stage) <= 20),
  long_term_objectives text check (char_length(long_term_objectives) <= 800),
  monetisation_interests text[] not null default '{}',
  posts_per_week int check (posts_per_week between 0 and 21),
  current_blueprint_id uuid references public.blueprints(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger brand_profiles_updated before update on public.brand_profiles for each row execute function public.set_updated_at();

create table public.content_pillars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 300),
  example_topics text[] not null default '{}',
  rationale text check (char_length(rationale) <= 400),
  position int not null default 0,
  is_active boolean not null default true,
  origin text not null default 'user' check (origin in ('ai','user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_pillars_user_idx on public.content_pillars (user_id, is_active, position);
create trigger content_pillars_updated before update on public.content_pillars for each row execute function public.set_updated_at();

-- Version history for important strategy changes.
create table public.brand_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  change_summary text not null check (char_length(change_summary) <= 300),
  source text not null default 'user' check (source in ('user','blueprint','recommendation')),
  created_at timestamptz not null default now()
);
create index brand_versions_user_idx on public.brand_versions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Proof Bank
-- ---------------------------------------------------------------------------
create or replace function public.tags_to_text(tags text[]) returns text
language sql immutable parallel safe set search_path = '' as $$ select coalesce(array_to_string(tags, ' '), '') $$;

create table public.proof_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.proof_kind not null default 'note',
  title text check (char_length(title) <= 140),
  body text check (char_length(body) <= 8000),
  transcript text check (char_length(transcript) <= 20000),
  transcription_status text check (transcription_status in ('pending','done','failed','unavailable')),
  audio_path text check (char_length(audio_path) <= 300),
  audio_duration_ms int check (audio_duration_ms between 0 and 900000),
  link_url text check (char_length(link_url) <= 2048 and link_url ~* '^https?://'),
  link_title text check (char_length(link_title) <= 300),
  occurred_on date,
  pillar_id uuid references public.content_pillars(id) on delete set null,
  tags text[] not null default '{}',
  key_insight text check (char_length(key_insight) <= 400),
  audience_relevance text check (char_length(audience_relevance) <= 400),
  content_angles text[] not null default '{}',
  classification_status public.classification_status not null default 'pending',
  ai_suggestion jsonb,
  pinned boolean not null default false,
  used_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(body, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(transcript, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(key_insight, '')), 'C') ||
    setweight(to_tsvector('simple'::regconfig, public.tags_to_text(tags)), 'A')
  ) stored
);
create index proof_entries_user_idx on public.proof_entries (user_id, pinned desc, created_at desc);
create index proof_entries_search_idx on public.proof_entries using gin (search);
create index proof_entries_title_trgm on public.proof_entries using gin (title extensions.gin_trgm_ops);
create index proof_entries_kind_idx on public.proof_entries (user_id, kind);
create index proof_entries_pillar_idx on public.proof_entries (pillar_id);
create trigger proof_entries_updated before update on public.proof_entries for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Content Studio
-- ---------------------------------------------------------------------------
create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  hypothesis text not null check (char_length(hypothesis) between 1 and 500),
  objective text check (char_length(objective) <= 300),
  pillar_id uuid references public.content_pillars(id) on delete set null,
  format text check (char_length(format) <= 40),
  platform text check (char_length(platform) <= 20),
  planned_posts int not null default 3 check (planned_posts between 1 and 30),
  success_metrics text[] not null default '{}',
  start_date date not null,
  end_date date not null,
  status public.experiment_status not null default 'planned',
  results_summary text check (char_length(results_summary) <= 2000),
  conclusion text check (char_length(conclusion) <= 1000),
  next_action text check (char_length(next_action) <= 500),
  analysis jsonb,
  analysis_stats jsonb,
  analysed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index experiments_user_idx on public.experiments (user_id, status, start_date desc);
create trigger experiments_updated before update on public.experiments for each row execute function public.set_updated_at();

create table public.content_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  format public.content_format not null default 'carousel',
  status public.content_status not null default 'draft',
  pillar_id uuid references public.content_pillars(id) on delete set null,
  generation_source text check (char_length(generation_source) <= 30),
  topic text check (char_length(topic) <= 500),
  hook text check (char_length(hook) <= 200),
  caption text check (char_length(caption) <= 2200),
  cta text check (char_length(cta) <= 200),
  hashtags text[] not null default '{}',
  alternative_hooks text[] not null default '{}',
  series_name text check (char_length(series_name) <= 80),
  series_ideas text[] not null default '{}',
  theme_id text not null default 'tapkit' check (char_length(theme_id) <= 40),
  slides jsonb not null default '[]'::jsonb check (jsonb_typeof(slides) = 'array' and jsonb_array_length(slides) <= 20 and pg_column_size(slides) < 200000),
  grounding_notes text check (char_length(grounding_notes) <= 500),
  generation_meta jsonb,
  user_edited boolean not null default false,
  experiment_id uuid references public.experiments(id) on delete set null,
  platform text check (char_length(platform) <= 20),
  published_at timestamptz,
  published_url text check (char_length(published_url) <= 2048 and published_url ~* '^https?://'),
  published_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Content is only "published" when the user confirmed it (or a verified integration did).
  constraint published_requires_confirmation check (status <> 'published' or (published_confirmed and published_at is not null))
);
create index content_projects_user_idx on public.content_projects (user_id, status, updated_at desc);
create index content_projects_experiment_idx on public.content_projects (experiment_id);
create index content_projects_pillar_idx on public.content_projects (pillar_id);
create trigger content_projects_updated before update on public.content_projects for each row execute function public.set_updated_at();

create table public.content_sources (
  content_id uuid not null references public.content_projects(id) on delete cascade,
  proof_entry_id uuid not null references public.proof_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (content_id, proof_entry_id)
);
create index content_sources_entry_idx on public.content_sources (proof_entry_id);

-- ---------------------------------------------------------------------------
-- Results / metrics
-- ---------------------------------------------------------------------------
create table public.metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid references public.content_projects(id) on delete cascade,
  experiment_id uuid references public.experiments(id) on delete set null,
  platform text not null check (char_length(platform) between 1 and 20),
  captured_on date not null default current_date,
  reach int check (reach >= 0),
  impressions int check (impressions >= 0),
  likes int check (likes >= 0),
  comments int check (comments >= 0),
  saves int check (saves >= 0),
  shares int check (shares >= 0),
  profile_visits int check (profile_visits >= 0),
  follower_change int,
  link_clicks int check (link_clicks >= 0),
  enquiries int check (enquiries >= 0),
  source text not null default 'manual' check (source in ('manual')),
  notes text check (char_length(notes) <= 500),
  recorded_at timestamptz not null default now()
);
create index metric_snapshots_user_idx on public.metric_snapshots (user_id, captured_on desc);
create index metric_snapshots_content_idx on public.metric_snapshots (content_id);
create index metric_snapshots_experiment_idx on public.metric_snapshots (experiment_id);

-- ---------------------------------------------------------------------------
-- Brand Evolution
-- ---------------------------------------------------------------------------
create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  facts jsonb not null,
  review jsonb not null,
  prompt_version text,
  model text,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);
create index weekly_reviews_user_idx on public.weekly_reviews (user_id, week_start desc);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('weekly_review','experiment')),
  source_id uuid,
  change_type text not null check (char_length(change_type) <= 30),
  title text not null check (char_length(title) <= 120),
  rationale text not null check (char_length(rationale) <= 600),
  proposed_change text not null check (char_length(proposed_change) <= 400),
  status public.recommendation_status not null default 'pending',
  decision_note text check (char_length(decision_note) <= 500),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index recommendations_user_idx on public.recommendations (user_id, status, created_at desc);

create table public.strategic_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (char_length(decision) between 1 and 300),
  rationale text check (char_length(rationale) <= 1000),
  recommendation_id uuid references public.recommendations(id) on delete set null,
  created_at timestamptz not null default now()
);
create index strategic_decisions_user_idx on public.strategic_decisions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Monetisation Hub
-- ---------------------------------------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  offer_type public.offer_type not null default 'freelance',
  audience text check (char_length(audience) <= 400),
  problem text check (char_length(problem) <= 600),
  deliverables text[] not null default '{}',
  pricing_hypothesis text check (char_length(pricing_hypothesis) <= 300),
  price_amount numeric(12,2) check (price_amount >= 0),
  currency char(3) not null default 'USD',
  differentiation text check (char_length(differentiation) <= 600),
  description text check (char_length(description) <= 2000),
  evidence_entry_ids uuid[] not null default '{}',
  cta_url text check (char_length(cta_url) <= 2048 and cta_url ~* '^https?://'),
  status public.offer_status not null default 'draft',
  is_public boolean not null default false,
  ai_assist jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index offers_user_idx on public.offers (user_id, status);
create trigger offers_updated before update on public.offers for each row execute function public.set_updated_at();

create table public.portfolios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  is_published boolean not null default false,
  display_name text not null check (char_length(display_name) between 1 and 80),
  headline text check (char_length(headline) <= 140),
  bio text check (char_length(bio) <= 1200),
  positioning text check (char_length(positioning) <= 400),
  skills text[] not null default '{}',
  experience text check (char_length(experience) <= 1500),
  avatar_path text check (char_length(avatar_path) <= 300),
  contact_email text check (char_length(contact_email) <= 254),
  contact_url text check (char_length(contact_url) <= 2048 and contact_url ~* '^https?://'),
  accent_color text not null default '#FF6A13' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  enquiries_enabled boolean not null default false,
  show_offers boolean not null default true,
  show_content boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger portfolios_updated before update on public.portfolios for each row execute function public.set_updated_at();

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('content','project','link')),
  content_id uuid references public.content_projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 600),
  url text check (char_length(url) <= 2048 and url ~* '^https?://'),
  position int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'content' or content_id is not null)
);
create index portfolio_items_user_idx on public.portfolio_items (user_id, position);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  company text check (char_length(company) <= 120),
  kind public.lead_kind not null default 'lead',
  stage public.lead_stage not null default 'identified',
  source text not null default 'manual' check (source in ('manual','portfolio_enquiry')),
  email text check (char_length(email) <= 254),
  url text check (char_length(url) <= 2048 and url ~* '^https?://'),
  notes text check (char_length(notes) <= 2000),
  enquiry_message text check (char_length(enquiry_message) <= 2000),
  value_amount numeric(14,2) check (value_amount >= 0),
  offer_id uuid references public.offers(id) on delete set null,
  next_follow_up date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_user_idx on public.leads (user_id, stage, next_follow_up);
create trigger leads_updated before update on public.leads for each row execute function public.set_updated_at();

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  kind public.lead_activity_kind not null,
  summary text not null check (char_length(summary) between 1 and 1000),
  occurred_at timestamptz not null default now()
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Subscriptions & usage (written only by trusted server code)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entitlement text not null default 'pro',
  is_active boolean not null default false,
  product_id text,
  store text,
  period_type text,
  environment text check (environment in ('SANDBOX','PRODUCTION')),
  expires_at timestamptz,
  will_renew boolean,
  unsubscribe_detected_at timestamptz,
  billing_issue_detected_at timestamptz,
  grace_period_expires_at timestamptz,
  last_event_type text,
  last_synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.revenuecat_events (
  id text primary key,
  event_type text not null,
  app_user_id text,
  received_at timestamptz not null default now()
);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task text not null,
  metered boolean not null default true,
  status text not null check (status in ('ok','error','invalid_output','refused','rate_limited')),
  model text,
  prompt_version text,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  created_at timestamptz not null default now()
);
create index ai_usage_user_idx on public.ai_usage (user_id, created_at desc);

create table public.export_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid references public.content_projects(id) on delete set null,
  slide_count int not null check (slide_count between 1 and 20),
  theme_id text,
  kind text not null check (kind in ('images','zip')),
  created_at timestamptz not null default now()
);
create index export_usage_user_idx on public.export_usage (user_id, created_at desc);

create table public.enquiry_rate (
  portfolio_user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (portfolio_user_id, day)
);

-- Plan limits mirrored from packages/core/src/plans.ts (verified by integration tests).
create table public.plan_limits (
  plan text not null check (plan in ('free','pro')),
  key text not null,
  value int not null,
  primary key (plan, key)
);
insert into public.plan_limits (plan, key, value) values
  ('free','aiGenerationsPerMonth',20), ('pro','aiGenerationsPerMonth',400),
  ('free','proofEntries',50), ('pro','proofEntries',5000),
  ('free','exportsPerMonth',5), ('pro','exportsPerMonth',300),
  ('free','activeExperiments',1), ('pro','activeExperiments',10),
  ('free','experimentHistory',3), ('pro','experimentHistory',1000),
  ('free','blueprintVersions',2), ('pro','blueprintVersions',50),
  ('free','offers',1), ('pro','offers',25),
  ('free','portfolioItems',6), ('pro','portfolioItems',60),
  ('free','weeklyReviewsPerMonth',1), ('pro','weeklyReviewsPerMonth',6);
