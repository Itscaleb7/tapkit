-- Entitlements, plan limits, usage metering and RPCs.

-- ---------------------------------------------------------------------------
-- Entitlement (server-verified; written only from RevenueCat webhook/sync)
-- ---------------------------------------------------------------------------
create or replace function public.is_pro(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and s.entitlement = 'pro' and s.is_active
      and (s.expires_at is null or s.expires_at > now() or (s.grace_period_expires_at is not null and s.grace_period_expires_at > now()))
  );
$$;

create or replace function public.current_plan(uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when public.is_pro(uid) then 'pro' else 'free' end;
$$;

create or replace function public.plan_limit(uid uuid, limit_key text) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select value from public.plan_limits where plan = public.current_plan(uid) and key = limit_key), 0);
$$;

create or replace function public.month_start() returns timestamptz
language sql stable set search_path = '' as $$
  select date_trunc('month', now() at time zone 'utc') at time zone 'utc';
$$;

create or replace function public.ai_generations_used(uid uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.ai_usage where user_id = uid and metered and status = 'ok' and created_at >= public.month_start();
$$;

create or replace function public.exports_used(uid uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.export_usage where user_id = uid and created_at >= public.month_start();
$$;

-- Users must not call internal helpers for other users.
revoke execute on function public.is_pro(uuid), public.current_plan(uuid), public.plan_limit(uuid, text),
  public.ai_generations_used(uuid), public.exports_used(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Limit enforcement triggers (apply to client inserts; service role included)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_proof_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare used int; lim int;
begin
  select count(*) into used from public.proof_entries where user_id = new.user_id;
  lim := public.plan_limit(new.user_id, 'proofEntries');
  if used >= lim then
    raise exception 'LIMIT_REACHED: Proof Bank is limited to % entries on your plan', lim using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger proof_limit before insert on public.proof_entries for each row execute function public.enforce_proof_limit();

create or replace function public.enforce_experiment_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare used int; lim int;
begin
  if new.status not in ('planned','running') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('planned','running') then return new; end if;
  select count(*) into used from public.experiments where user_id = new.user_id and status in ('planned','running') and id <> new.id;
  lim := public.plan_limit(new.user_id, 'activeExperiments');
  if used >= lim then
    raise exception 'LIMIT_REACHED: You can run % active experiment(s) on your plan', lim using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger experiment_limit before insert or update of status on public.experiments for each row execute function public.enforce_experiment_limit();

create or replace function public.enforce_offer_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare used int; lim int;
begin
  select count(*) into used from public.offers where user_id = new.user_id and status <> 'archived';
  lim := public.plan_limit(new.user_id, 'offers');
  if used >= lim then
    raise exception 'LIMIT_REACHED: You can have % offer(s) on your plan', lim using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger offer_limit before insert on public.offers for each row execute function public.enforce_offer_limit();

create or replace function public.enforce_portfolio_item_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare used int; lim int;
begin
  select count(*) into used from public.portfolio_items where user_id = new.user_id;
  lim := public.plan_limit(new.user_id, 'portfolioItems');
  if used >= lim then
    raise exception 'LIMIT_REACHED: Your portfolio can show % items on your plan', lim using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger portfolio_item_limit before insert on public.portfolio_items for each row execute function public.enforce_portfolio_item_limit();

-- Accent colour customisation is a Pro feature.
create or replace function public.enforce_portfolio_customisation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if upper(new.accent_color) <> '#FF6A13' and not public.is_pro(new.user_id) then
    if tg_op = 'UPDATE' and upper(old.accent_color) = upper(new.accent_color) then return new; end if;
    raise exception 'PRO_REQUIRED: Custom portfolio colours require TapKit Pro' using errcode = 'P0001';
  end if;
  if new.is_published and (tg_op = 'INSERT' or not old.is_published) then new.published_at := now(); end if;
  return new;
end $$;
create trigger portfolio_customisation before insert or update on public.portfolios for each row execute function public.enforce_portfolio_customisation();

-- ---------------------------------------------------------------------------
-- RPC: entitlement + usage summary for the signed-in user
-- ---------------------------------------------------------------------------
create or replace function public.get_entitlement() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_plan text; lim jsonb; sub record;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  v_plan := public.current_plan(uid);
  select jsonb_object_agg(pl.key, pl.value) into lim from public.plan_limits pl where pl.plan = v_plan;
  select * into sub from public.subscriptions where user_id = uid;
  return jsonb_build_object(
    'plan', v_plan,
    'limits', lim,
    'usage', jsonb_build_object(
      'aiGenerationsThisMonth', public.ai_generations_used(uid),
      'exportsThisMonth', public.exports_used(uid),
      'proofEntries', (select count(*) from public.proof_entries where user_id = uid),
      'activeExperiments', (select count(*) from public.experiments where user_id = uid and status in ('planned','running')),
      'offers', (select count(*) from public.offers where user_id = uid and status <> 'archived'),
      'weeklyReviewsThisMonth', (select count(*) from public.weekly_reviews where user_id = uid and created_at >= public.month_start())
    ),
    'subscription', case when sub.user_id is null then null else jsonb_build_object(
      'is_active', sub.is_active, 'product_id', sub.product_id, 'expires_at', sub.expires_at, 'will_renew', sub.will_renew,
      'billing_issue', sub.billing_issue_detected_at is not null, 'environment', sub.environment, 'store', sub.store,
      'unsubscribed', sub.unsubscribe_detected_at is not null, 'last_synced_at', sub.last_synced_at) end
  );
end $$;
grant execute on function public.get_entitlement() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: record a carousel export (server-enforced export limit + premium themes)
-- ---------------------------------------------------------------------------
create or replace function public.record_export(p_content_id uuid, p_slide_count int, p_theme_id text, p_kind text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); used int; lim int; premium boolean;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.content_projects where id = p_content_id and user_id = uid) then
    raise exception 'Content not found' using errcode = 'P0002';
  end if;
  if p_slide_count < 1 or p_slide_count > 20 or p_kind not in ('images','zip') then
    raise exception 'Invalid export' using errcode = '22023';
  end if;
  premium := p_theme_id in ('sunrise','editorial','grid');
  if premium and not public.is_pro(uid) then
    return jsonb_build_object('allowed', false, 'reason', 'PRO_THEME', 'message', 'This theme is part of TapKit Pro.');
  end if;
  -- Serialise concurrent exports per user so the limit cannot be raced.
  perform pg_advisory_xact_lock(hashtext('export:' || uid::text));
  used := public.exports_used(uid);
  lim := public.plan_limit(uid, 'exportsPerMonth');
  if used >= lim then
    return jsonb_build_object('allowed', false, 'reason', 'LIMIT_REACHED', 'message', format('You''ve used all %s exports this month.', lim), 'limit', lim);
  end if;
  insert into public.export_usage (user_id, content_id, slide_count, theme_id, kind) values (uid, p_content_id, p_slide_count, p_theme_id, p_kind);
  return jsonb_build_object('allowed', true, 'remaining', lim - used - 1, 'limit', lim);
end $$;
grant execute on function public.record_export(uuid, int, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: accept a blueprint → updates brand profile + pillars + version history
-- ---------------------------------------------------------------------------
create or replace function public.brand_snapshot(uid uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'brand', (select to_jsonb(b) - 'user_id' from public.brand_profiles b where b.user_id = uid),
    'pillars', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'description', p.description, 'is_active', p.is_active) order by p.position)
                         from public.content_pillars p where p.user_id = uid and p.is_active), '[]'::jsonb)
  );
$$;

create or replace function public.accept_blueprint(p_blueprint_id uuid, p_replace_pillars boolean default true)
returns void language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); bp record; c jsonb; pillar jsonb; i int := 0;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  select * into bp from public.blueprints where id = p_blueprint_id and user_id = uid for update;
  if not found then raise exception 'Blueprint not found' using errcode = 'P0002'; end if;
  c := bp.content;

  insert into public.brand_versions (user_id, snapshot, change_summary, source)
  values (uid, public.brand_snapshot(uid), format('Before accepting Brand Blueprint v%s', bp.version), 'blueprint');

  update public.blueprints set status = 'superseded' where user_id = uid and status = 'accepted' and id <> bp.id;
  update public.blueprints set status = 'accepted', decided_at = now() where id = bp.id;

  insert into public.brand_profiles as b (user_id, positioning, audience, audience_needs, brand_promise, differentiators,
    voice_summary, voice_traits, voice_do, voice_avoid, values, posts_per_week, current_blueprint_id)
  values (
    uid,
    left(c->>'positioning_statement', 400),
    left(c#>>'{target_audience,description}', 600),
    coalesce(array(select left(x, 160) from jsonb_array_elements_text(c#>'{target_audience,needs}') x), '{}'),
    left(c->>'brand_promise', 300),
    coalesce(array(select left(x->>'point', 200) from jsonb_array_elements(c->'differentiators') x), '{}'),
    left(c#>>'{brand_voice,summary}', 300),
    coalesce(array(select left(x, 40) from jsonb_array_elements_text(c#>'{brand_voice,traits}') x), '{}'),
    coalesce(array(select left(x, 160) from jsonb_array_elements_text(c#>'{brand_voice,do}') x), '{}'),
    coalesce(array(select left(x, 160) from jsonb_array_elements_text(c#>'{brand_voice,avoid}') x), '{}'),
    coalesce(array(select left(x, 60) from jsonb_array_elements_text(c->'core_values') x), '{}'),
    nullif(c#>>'{publishing_cadence,posts_per_week}', '')::int,
    bp.id
  )
  on conflict (user_id) do update set
    positioning = excluded.positioning, audience = excluded.audience, audience_needs = excluded.audience_needs,
    brand_promise = excluded.brand_promise, differentiators = excluded.differentiators, voice_summary = excluded.voice_summary,
    voice_traits = excluded.voice_traits, voice_do = excluded.voice_do, voice_avoid = excluded.voice_avoid,
    values = excluded.values, posts_per_week = excluded.posts_per_week, current_blueprint_id = excluded.current_blueprint_id;

  if p_replace_pillars then
    update public.content_pillars set is_active = false where user_id = uid and is_active;
  end if;
  for pillar in select * from jsonb_array_elements(c->'content_pillars') loop
    insert into public.content_pillars (user_id, name, description, example_topics, rationale, position, origin)
    values (uid, left(pillar->>'name', 60), left(pillar->>'description', 300),
            coalesce(array(select left(x, 140) from jsonb_array_elements_text(pillar->'example_topics') x), '{}'),
            left(pillar->>'rationale', 400), i, 'ai');
    i := i + 1;
  end loop;

  insert into public.strategic_decisions (user_id, decision, rationale)
  values (uid, format('Accepted Brand Blueprint v%s', bp.version), left(c->>'positioning_rationale', 1000));

  update public.profiles set onboarding_completed_at = coalesce(onboarding_completed_at, now()) where id = uid;
end $$;
grant execute on function public.accept_blueprint(uuid, boolean) to authenticated;

-- Save edits to My Brand with a version-history entry (never silently overwrites).
create or replace function public.save_brand_profile(p_patch jsonb, p_change_summary text)
returns void language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); allowed text[] := array['positioning','audience','audience_needs','brand_promise','differentiators','voice_summary',
  'voice_traits','values','goals','platforms','visual_preferences','stage','long_term_objectives','monetisation_interests','posts_per_week'];
  k text;
begin
  if uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  for k in select jsonb_object_keys(p_patch) loop
    if not k = any(allowed) then raise exception 'Field % cannot be edited', k using errcode = '22023'; end if;
  end loop;
  insert into public.brand_versions (user_id, snapshot, change_summary, source)
  values (uid, public.brand_snapshot(uid), left(coalesce(nullif(p_change_summary, ''), 'Edited brand'), 300), 'user');
  insert into public.brand_profiles (user_id) values (uid) on conflict do nothing;
  update public.brand_profiles b set
    positioning = case when p_patch ? 'positioning' then p_patch->>'positioning' else b.positioning end,
    audience = case when p_patch ? 'audience' then p_patch->>'audience' else b.audience end,
    audience_needs = case when p_patch ? 'audience_needs' then array(select jsonb_array_elements_text(p_patch->'audience_needs')) else b.audience_needs end,
    brand_promise = case when p_patch ? 'brand_promise' then p_patch->>'brand_promise' else b.brand_promise end,
    differentiators = case when p_patch ? 'differentiators' then array(select jsonb_array_elements_text(p_patch->'differentiators')) else b.differentiators end,
    voice_summary = case when p_patch ? 'voice_summary' then p_patch->>'voice_summary' else b.voice_summary end,
    voice_traits = case when p_patch ? 'voice_traits' then array(select jsonb_array_elements_text(p_patch->'voice_traits')) else b.voice_traits end,
    values = case when p_patch ? 'values' then array(select jsonb_array_elements_text(p_patch->'values')) else b.values end,
    goals = case when p_patch ? 'goals' then array(select jsonb_array_elements_text(p_patch->'goals')) else b.goals end,
    platforms = case when p_patch ? 'platforms' then array(select jsonb_array_elements_text(p_patch->'platforms')) else b.platforms end,
    visual_preferences = case when p_patch ? 'visual_preferences' then p_patch->>'visual_preferences' else b.visual_preferences end,
    stage = case when p_patch ? 'stage' then p_patch->>'stage' else b.stage end,
    long_term_objectives = case when p_patch ? 'long_term_objectives' then p_patch->>'long_term_objectives' else b.long_term_objectives end,
    monetisation_interests = case when p_patch ? 'monetisation_interests' then array(select jsonb_array_elements_text(p_patch->'monetisation_interests')) else b.monetisation_interests end,
    posts_per_week = case when p_patch ? 'posts_per_week' then (p_patch->>'posts_per_week')::int else b.posts_per_week end
  where b.user_id = uid;
end $$;
grant execute on function public.save_brand_profile(jsonb, text) to authenticated;

-- Decide on an adaptive-strategy recommendation; accepted ones are logged as strategic decisions.
create or replace function public.decide_recommendation(p_id uuid, p_status public.recommendation_status, p_note text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); r record;
begin
  if p_status = 'pending' then raise exception 'Choose accept, reject or defer' using errcode = '22023'; end if;
  select * into r from public.recommendations where id = p_id and user_id = uid for update;
  if not found then raise exception 'Recommendation not found' using errcode = 'P0002'; end if;
  update public.recommendations set status = p_status, decision_note = left(p_note, 500), decided_at = now() where id = p_id;
  if p_status in ('accepted','rejected') then
    insert into public.strategic_decisions (user_id, decision, rationale, recommendation_id)
    values (uid, left(format('%s: %s', initcap(p_status::text), r.title), 300), left(coalesce(p_note, r.rationale), 1000), r.id);
  end if;
end $$;
grant execute on function public.decide_recommendation(uuid, public.recommendation_status, text) to authenticated;

-- Home screen state for next-action selection (one round trip).
create or replace function public.get_home_state() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'onboardingCompleted', coalesce((select onboarding_completed_at is not null from public.profiles where id = auth.uid()), false),
    'hasAcceptedBlueprint', exists (select 1 from public.blueprints where user_id = auth.uid() and status = 'accepted'),
    'hasPendingBlueprint', exists (select 1 from public.blueprints where user_id = auth.uid() and status = 'generated'),
    'proofEntryCount', (select count(*) from public.proof_entries where user_id = auth.uid()),
    'contentCount', (select count(*) from public.content_projects where user_id = auth.uid() and status <> 'archived'),
    'draftCount', (select count(*) from public.content_projects where user_id = auth.uid() and status in ('idea','draft')),
    'readyCount', (select count(*) from public.content_projects where user_id = auth.uid() and status = 'ready'),
    'publishedCount', (select count(*) from public.content_projects where user_id = auth.uid() and status = 'published'),
    'publishedAwaitingResults', (select count(*) from public.content_projects c where c.user_id = auth.uid() and c.status = 'published'
        and c.published_at < now() - interval '2 days' and not exists (select 1 from public.metric_snapshots m where m.content_id = c.id)),
    'activeExperiments', (select count(*) from public.experiments where user_id = auth.uid() and status in ('planned','running')),
    'experimentsEndedAwaitingConclusion', (select count(*) from public.experiments where user_id = auth.uid() and status in ('planned','running') and end_date < current_date),
    'lastWeeklyReviewAt', (select max(created_at) from public.weekly_reviews where user_id = auth.uid()),
    'pendingRecommendations', (select count(*) from public.recommendations where user_id = auth.uid() and status = 'pending'),
    'pillarCount', (select count(*) from public.content_pillars where user_id = auth.uid() and is_active),
    'hasPortfolio', exists (select 1 from public.portfolios where user_id = auth.uid() and is_published)
  );
$$;
grant execute on function public.get_home_state() to authenticated;

-- ---------------------------------------------------------------------------
-- Public portfolio (anon-readable, returns ONLY intentionally published fields)
-- ---------------------------------------------------------------------------
create or replace function public.get_public_portfolio(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p record; item_limit int;
begin
  select * into p from public.portfolios where slug = lower(p_slug) and is_published;
  if not found then return null; end if;
  item_limit := public.plan_limit(p.user_id, 'portfolioItems');
  return jsonb_build_object(
    'slug', p.slug,
    'display_name', p.display_name,
    'headline', p.headline,
    'bio', p.bio,
    'positioning', p.positioning,
    'skills', to_jsonb(p.skills),
    'experience', p.experience,
    'avatar_path', p.avatar_path,
    'contact_email', p.contact_email,
    'contact_url', p.contact_url,
    'accent_color', p.accent_color,
    'enquiries_enabled', p.enquiries_enabled,
    'items', coalesce((
      select jsonb_agg(x.obj order by x.position) from (
        select i.position, jsonb_build_object(
          'kind', i.kind, 'title', i.title, 'description', i.description, 'url', i.url,
          'content', case when i.kind = 'content' then (
            select jsonb_build_object('format', c.format, 'caption', c.caption, 'published_url', c.published_url,
              'theme_id', c.theme_id, 'slides', c.slides)
            from public.content_projects c where c.id = i.content_id and c.status = 'published' and c.user_id = p.user_id) end
        ) as obj
        from public.portfolio_items i
        where i.user_id = p.user_id and i.is_visible
          and (i.kind <> 'content' or (p.show_content and exists (select 1 from public.content_projects c where c.id = i.content_id and c.status = 'published' and c.user_id = p.user_id)))
        order by i.position limit item_limit
      ) x), '[]'::jsonb),
    'offers', case when p.show_offers then coalesce((
      select jsonb_agg(jsonb_build_object('title', o.title, 'offer_type', o.offer_type, 'audience', o.audience, 'problem', o.problem,
        'deliverables', to_jsonb(o.deliverables), 'description', o.description, 'pricing_hypothesis', o.pricing_hypothesis, 'cta_url', o.cta_url) order by o.created_at)
      from public.offers o where o.user_id = p.user_id and o.is_public and o.status = 'active'), '[]'::jsonb) else '[]'::jsonb end
  );
end $$;
grant execute on function public.get_public_portfolio(text) to anon, authenticated;

-- Public enquiry form → creates a lead for the portfolio owner. Rate limited per portfolio per day.
create or replace function public.submit_portfolio_enquiry(p_slug text, p_name text, p_email text, p_message text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p record; cnt int;
begin
  if char_length(coalesce(trim(p_name), '')) not between 1 and 120
     or char_length(coalesce(trim(p_message), '')) not between 1 and 2000
     or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(p_email) > 254 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select user_id, enquiries_enabled into p from public.portfolios where slug = lower(p_slug) and is_published;
  if not found or not p.enquiries_enabled then return jsonb_build_object('ok', false, 'error', 'unavailable'); end if;
  insert into public.enquiry_rate (portfolio_user_id, day, count) values (p.user_id, current_date, 1)
  on conflict (portfolio_user_id, day) do update set count = public.enquiry_rate.count + 1
  returning count into cnt;
  if cnt > 20 then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  insert into public.leads (user_id, name, email, kind, stage, source, enquiry_message)
  values (p.user_id, trim(p_name), lower(trim(p_email)), 'lead', 'identified', 'portfolio_enquiry', trim(p_message));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.submit_portfolio_enquiry(text, text, text, text) to anon, authenticated;

-- Slug availability check for the portfolio editor.
create or replace function public.is_slug_available(p_slug text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.portfolios where slug = lower(p_slug) and user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
$$;
grant execute on function public.is_slug_available(text) to authenticated;
