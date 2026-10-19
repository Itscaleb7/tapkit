// TapKit AI edge function. One endpoint, task-routed:
//   POST /functions/v1/ai  { task: "blueprint" | "alternative_positioning" | "classify_proof" | "generate_content"
//                            | "analyze_experiment" | "weekly_review" | "offer_assist", ... }
// Every task: verifies the user, rate-limits, enforces plan limits, sends the
// smallest relevant context, validates the model output, persists it, and logs usage.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import * as mocks from "../_shared/core/aiMocks.ts";
import { CONTENT_FORMATS, GENERATION_SOURCES } from "../_shared/core/domain.ts";
import { computeExperimentStats, EVIDENCE_COPY, type MetricRecord } from "../_shared/core/experiments.ts";
import { gatherWeeklyFacts, weekStartOf } from "../_shared/core/evolution.ts";
import { type NumericLimitKey, PLAN_LIMITS, type PlanId } from "../_shared/core/plans.ts";
import * as P from "../_shared/core/prompts.ts";
import {
  alternativePositioningSchema,
  brandBlueprintSchema,
  contentGenerationRequestSchema,
  experimentAnalysisSchema,
  generatedContentSchema,
  offerAssistSchema,
  offerInputSchema,
  onboardingAnswersSchema,
  onboardingReadiness,
  proofClassificationSchema,
  type WeeklyReviewAi,
  weeklyReviewAiSchema,
} from "../_shared/core/schemas.ts";
import { slidesFromAi, slidesToPlainText } from "../_shared/core/carousel/slides.ts";
import { AiError, getProvider, type AiRequest, type AiResult } from "../_shared/ai/index.ts";
import { HttpError, json, readJson, serve } from "../_shared/http.ts";
import { adminClient, requireUser, type AuthedUser } from "../_shared/supabase.ts";

const RATE_LIMIT_PER_MINUTE = Number(Deno.env.get("AI_RATE_LIMIT_PER_MINUTE") ?? "8");

interface Ctx {
  req: Request;
  db: SupabaseClient;
  user: AuthedUser;
  plan: PlanId;
}

/* ------------------------------------------------------------------ */
/* Metering                                                             */
/* ------------------------------------------------------------------ */

async function planOf(db: SupabaseClient, userId: string): Promise<PlanId> {
  const { data, error } = await db.rpc("current_plan", { uid: userId });
  if (error) throw error;
  return data === "pro" ? "pro" : "free";
}

async function guardRate(ctx: Ctx) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await ctx.db.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", ctx.user.id).gte("created_at", since);
  if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    throw new HttpError(429, "rate_limited", "You're going a little fast. Please wait a minute and try again.");
  }
}

async function guardMonthly(ctx: Ctx) {
  const { data: used } = await ctx.db.rpc("ai_generations_used", { uid: ctx.user.id });
  const limit = PLAN_LIMITS[ctx.plan].aiGenerationsPerMonth;
  if ((used ?? 0) >= limit) {
    throw new HttpError(402, "limit_reached", ctx.plan === "free"
      ? `You've used all ${limit} AI generations this month on the Free plan.`
      : `You've used all ${limit} AI generations this month.`, { limit, upgrade: ctx.plan === "free" });
  }
}

function requirePro(ctx: Ctx, feature: keyof typeof PLAN_LIMITS.free) {
  if (!PLAN_LIMITS[ctx.plan][feature]) throw new HttpError(402, "pro_required", "This feature is part of TapKit Pro.", { upgrade: true });
}

async function countGuard(ctx: Ctx, key: NumericLimitKey, used: number, label: string) {
  const limit = PLAN_LIMITS[ctx.plan][key];
  if (used >= limit) throw new HttpError(402, "limit_reached", `You've reached the limit of ${limit} ${label} on your plan.`, { limit, upgrade: ctx.plan === "free" });
}

async function runAi<T>(ctx: Ctx, req: AiRequest<T>): Promise<AiResult<T>> {
  const metered = P.METERED_TASKS.includes(req.task);
  await guardRate(ctx);
  if (metered) await guardMonthly(ctx);
  const started = Date.now();
  const log = (status: string, r?: AiResult<T>) =>
    ctx.db.from("ai_usage").insert({
      user_id: ctx.user.id,
      task: req.task,
      metered,
      status,
      model: r?.model ?? null,
      prompt_version: P.PROMPT_VERSIONS[req.task],
      input_tokens: r?.inputTokens ?? null,
      output_tokens: r?.outputTokens ?? null,
      latency_ms: Date.now() - started,
    });
  try {
    const provider = getProvider();
    const result = await provider.generate(req);
    await log("ok", result);
    return result;
  } catch (err) {
    if (err instanceof AiError) {
      await log(err.kind === "refused" ? "refused" : err.kind === "invalid_output" ? "invalid_output" : err.kind === "rate_limited" ? "rate_limited" : "error");
      const status = err.kind === "config" ? 503 : err.kind === "rate_limited" ? 429 : err.kind === "refused" ? 422 : 502;
      throw new HttpError(status, `ai_${err.kind}`, err.kind === "config" ? "AI is not configured on the server yet." : err.message);
    }
    await log("error");
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Context loaders (minimal, owner-scoped)                              */
/* ------------------------------------------------------------------ */

async function loadBrand(ctx: Ctx): Promise<P.BrandContext> {
  const [{ data: brand }, { data: pillars }, { data: profile }] = await Promise.all([
    ctx.db.from("brand_profiles").select("positioning,audience,audience_needs,brand_promise,differentiators,voice_summary,voice_traits,values,goals,platforms,stage").eq("user_id", ctx.user.id).maybeSingle(),
    ctx.db.from("content_pillars").select("id,name,description").eq("user_id", ctx.user.id).eq("is_active", true).order("position"),
    ctx.db.from("profiles").select("display_name,handle").eq("id", ctx.user.id).maybeSingle(),
  ]);
  return { ...(brand ?? {}), pillars: pillars ?? [], display_name: profile?.display_name ?? null };
}

async function loadAnswers(ctx: Ctx) {
  const { data } = await ctx.db.from("onboarding_responses").select("answers").eq("user_id", ctx.user.id).maybeSingle();
  const parsed = onboardingAnswersSchema.safeParse(data?.answers ?? {});
  return parsed.success ? parsed.data : {};
}

/* ------------------------------------------------------------------ */
/* Tasks                                                                */
/* ------------------------------------------------------------------ */

const blueprintBody = z.object({ feedback: z.string().trim().max(1000).optional() });

async function taskBlueprint(ctx: Ctx, body: unknown) {
  const { feedback } = blueprintBody.parse(body);
  const answers = await loadAnswers(ctx);
  const readiness = onboardingReadiness(answers);
  if (!readiness.ready) throw new HttpError(400, "onboarding_incomplete", `Please add your ${readiness.missing.join(", ")} first.`);
  const { data: existing } = await ctx.db.from("blueprints").select("version,content").eq("user_id", ctx.user.id).order("version", { ascending: false });
  await countGuard(ctx, "blueprintVersions", existing?.length ?? 0, "blueprint versions");
  const previousPositioning = (existing?.[0]?.content as { positioning_statement?: string } | undefined)?.positioning_statement;

  const result = await runAi(ctx, {
    task: "blueprint",
    system: P.SYSTEM_PROMPTS.blueprint,
    user: P.blueprintUserPrompt(answers, feedback ? { positioning: previousPositioning, feedback } : undefined),
    schema: brandBlueprintSchema,
    effort: "medium",
    maxTokens: 16000,
    mock: () => mocks.mockBlueprint({ interests: answers.interests, goal: answers.primaryGoal }),
  });

  await ctx.db.from("blueprints").update({ status: "superseded" }).eq("user_id", ctx.user.id).eq("status", "generated");
  const { data: row, error } = await ctx.db
    .from("blueprints")
    .insert({
      user_id: ctx.user.id,
      version: (existing?.[0]?.version ?? 0) + 1,
      content: result.data,
      input_snapshot: answers,
      prompt_version: P.PROMPT_VERSIONS.blueprint,
      model: result.model,
      feedback: feedback ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return { blueprint: row };
}

async function taskAlternatives(ctx: Ctx) {
  requirePro(ctx, "alternativePositioning");
  const [brand, answers] = await Promise.all([loadBrand(ctx), loadAnswers(ctx)]);
  const result = await runAi(ctx, {
    task: "alternative_positioning",
    system: P.SYSTEM_PROMPTS.alternative_positioning,
    user: P.alternativesUserPrompt(brand, answers),
    schema: alternativePositioningSchema,
    effort: "medium",
    maxTokens: 8000,
    mock: () => mocks.mockAlternatives(),
  });
  return result.data;
}

const classifyBody = z.object({ entry_id: z.string().uuid() });

async function taskClassify(ctx: Ctx, body: unknown) {
  const { entry_id } = classifyBody.parse(body);
  const { data: entry } = await ctx.db.from("proof_entries").select("*").eq("id", entry_id).eq("user_id", ctx.user.id).maybeSingle();
  if (!entry) throw new HttpError(404, "not_found", "Entry not found");
  const brand = await loadBrand(ctx);
  const pillarNames = (brand.pillars ?? []).map((p) => p.name);
  try {
    const result = await runAi(ctx, {
      task: "classify_proof",
      system: P.SYSTEM_PROMPTS.classify_proof,
      user: P.classifyUserPrompt(entry, pillarNames, brand),
      schema: proofClassificationSchema,
      effort: "low",
      maxTokens: 4000,
      mock: () => mocks.mockClassification(entry, pillarNames),
    });
    const c = result.data;
    const pillar = (brand.pillars as { id: string; name: string }[]).find((p) => p.name.toLowerCase() === (c.pillar ?? "").toLowerCase());
    // Suggestions fill empty fields only — never overwrite what the user wrote.
    const patch: Record<string, unknown> = { ai_suggestion: c, classification_status: "done" };
    if (!entry.title) patch.title = c.suggested_title;
    if (!entry.key_insight) patch.key_insight = c.key_insight;
    if (!entry.audience_relevance) patch.audience_relevance = c.audience_relevance;
    if (!entry.content_angles?.length) patch.content_angles = c.content_angles;
    if (!entry.tags?.length) patch.tags = c.tags;
    if (!entry.pillar_id && pillar) patch.pillar_id = pillar.id;
    const { data: updated, error } = await ctx.db.from("proof_entries").update(patch).eq("id", entry.id).eq("user_id", ctx.user.id).select().single();
    if (error) throw error;
    return { entry: updated };
  } catch (err) {
    // The entry is already saved; mark classification as failed so the UI can offer a retry.
    await ctx.db.from("proof_entries").update({ classification_status: "failed" }).eq("id", entry.id).eq("user_id", ctx.user.id);
    throw err;
  }
}

async function taskGenerateContent(ctx: Ctx, body: unknown) {
  const input = contentGenerationRequestSchema.parse(body);
  const brand = await loadBrand(ctx);
  const uid = ctx.user.id;

  const proofIds = input.proof_entry_ids ?? [];
  const { data: proof } = proofIds.length
    ? await ctx.db.from("proof_entries").select("id,kind,title,body,transcript,key_insight,occurred_on").eq("user_id", uid).in("id", proofIds)
    : { data: [] as Record<string, unknown>[] };
  if ((proof?.length ?? 0) !== proofIds.length) throw new HttpError(404, "not_found", "One of the selected Proof Bank entries was not found");

  const pillar = input.pillar_id ? (brand.pillars as { id: string; name: string; description: string | null }[]).find((p) => p.id === input.pillar_id) ?? null : null;
  if (input.pillar_id && !pillar) throw new HttpError(404, "not_found", "Content pillar not found");

  let previousPost = null;
  if (input.previous_content_id) {
    const { data } = await ctx.db.from("content_projects").select("title,caption,slides").eq("id", input.previous_content_id).eq("user_id", uid).maybeSingle();
    if (!data) throw new HttpError(404, "not_found", "Previous post not found");
    previousPost = { title: data.title, caption: data.caption, slides_text: slidesToPlainText(data.slides ?? []).slice(0, 3000) };
  }
  let experiment = null;
  if (input.experiment_id) {
    const { data } = await ctx.db.from("experiments").select("hypothesis,format").eq("id", input.experiment_id).eq("user_id", uid).maybeSingle();
    if (!data) throw new HttpError(404, "not_found", "Experiment not found");
    experiment = data;
  }
  const { data: profile } = await ctx.db.from("profiles").select("handle").eq("id", uid).maybeSingle();
  const formatLabel = CONTENT_FORMATS.find((f) => f.id === input.format)!.label;
  const sourceLabel = GENERATION_SOURCES.find((s) => s.id === input.source)!.label;
  const proofForPrompt = (proof ?? []).map((p) => ({
    kind: p.kind as string,
    title: p.title as string | null,
    body: (((p.body as string) ?? "") + (p.transcript ? `\n${p.transcript}` : "")).slice(0, 3000),
    key_insight: p.key_insight as string | null,
    occurred_on: p.occurred_on as string | null,
  }));

  const result = await runAi(ctx, {
    task: "generate_content",
    system: P.SYSTEM_PROMPTS.generate_content,
    user: P.contentUserPrompt(brand, {
      format: input.format,
      formatLabel,
      source: input.source,
      sourceLabel,
      slideCount: input.slide_count ?? null,
      topic: input.topic,
      pillar,
      proofEntries: proofForPrompt,
      previousPost,
      experiment,
      preferences: brand.voice_summary ? `Voice: ${brand.voice_summary}` : null,
      extraInstructions: input.extra_instructions,
      handle: profile?.handle,
    }),
    schema: generatedContentSchema,
    effort: "medium",
    maxTokens: 16000,
    mock: () => mocks.mockContent({ format: input.format, topic: input.topic, proofTitles: proofForPrompt.map((p) => p.title ?? p.kind), slideCount: input.slide_count }),
  });

  const g = result.data;
  const { data: content, error } = await ctx.db
    .from("content_projects")
    .insert({
      user_id: uid,
      title: g.title,
      format: input.format,
      status: "draft",
      pillar_id: pillar?.id ?? null,
      generation_source: input.source,
      topic: input.topic ?? null,
      hook: g.hook,
      caption: g.caption,
      cta: g.cta,
      hashtags: g.hashtags,
      alternative_hooks: g.alternative_hooks,
      series_ideas: g.series_ideas,
      slides: slidesFromAi(g.slides),
      grounding_notes: g.grounding_notes,
      experiment_id: input.experiment_id ?? null,
      generation_meta: { model: result.model, prompt_version: P.PROMPT_VERSIONS.generate_content, request: input },
    })
    .select()
    .single();
  if (error) throw error;
  if (proof?.length) {
    await ctx.db.from("content_sources").insert(proof.map((p) => ({ content_id: content.id, proof_entry_id: p.id, user_id: uid })));
    for (const p of proof) await ctx.db.rpc("increment_proof_usage", { p_entry_id: p.id, p_user_id: uid });
  }
  return { content };
}

const experimentBody = z.object({ experiment_id: z.string().uuid() });

async function taskAnalyzeExperiment(ctx: Ctx, body: unknown) {
  const { experiment_id } = experimentBody.parse(body);
  const uid = ctx.user.id;
  const { data: exp } = await ctx.db.from("experiments").select("*").eq("id", experiment_id).eq("user_id", uid).maybeSingle();
  if (!exp) throw new HttpError(404, "not_found", "Experiment not found");
  const { data: posts } = await ctx.db.from("content_projects").select("id,title,format,published_at").eq("experiment_id", exp.id).eq("user_id", uid);
  const postIds = (posts ?? []).map((p) => p.id);
  const { data: testMetrics } = await ctx.db.from("metric_snapshots").select("*").eq("user_id", uid).or(`experiment_id.eq.${exp.id}${postIds.length ? `,content_id.in.(${postIds.join(",")})` : ""}`);
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const { data: baseline } = await ctx.db.from("metric_snapshots").select("*").eq("user_id", uid).gte("captured_on", since).is("experiment_id", null);
  const baselineRows = (baseline ?? []).filter((m) => !m.content_id || !postIds.includes(m.content_id)) as MetricRecord[];
  const stats = computeExperimentStats((testMetrics ?? []) as MetricRecord[], baselineRows, { plannedPosts: exp.planned_posts, successMetrics: exp.success_metrics });

  if (stats.postsWithData === 0) {
    throw new HttpError(400, "no_results", "Record results for at least one post before analysing this experiment.");
  }
  const result = await runAi(ctx, {
    task: "analyze_experiment",
    system: P.SYSTEM_PROMPTS.analyze_experiment,
    user: P.experimentUserPrompt(
      { title: exp.title, hypothesis: exp.hypothesis, objective: exp.objective, format: exp.format, platform: exp.platform, planned_posts: exp.planned_posts, success_metrics: exp.success_metrics, start_date: exp.start_date, end_date: exp.end_date },
      { ...stats, evidence_note: EVIDENCE_COPY[stats.evidence] },
      (testMetrics ?? []).slice(0, 30).map((m) => ({ ...m, user_id: undefined, id: undefined, post: posts?.find((p) => p.id === m.content_id)?.title ?? null })),
    ),
    schema: experimentAnalysisSchema,
    effort: "medium",
    maxTokens: 8000,
    mock: () => mocks.mockExperimentAnalysis(stats.postsWithData),
  });
  const { data: updated, error } = await ctx.db
    .from("experiments")
    .update({ analysis: result.data, analysis_stats: stats, analysed_at: new Date().toISOString() })
    .eq("id", exp.id)
    .eq("user_id", uid)
    .select()
    .single();
  if (error) throw error;
  return { experiment: updated, stats };
}

const weeklyBody = z.object({ week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

async function taskWeeklyReview(ctx: Ctx, body: unknown) {
  const { week_start } = weeklyBody.parse(body);
  const uid = ctx.user.id;
  const weekStart = week_start ?? weekStartOf(new Date()); // default: the current week (Monday–Sunday)
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const { count: reviewsThisMonth } = await ctx.db.from("weekly_reviews").select("id", { count: "exact", head: true }).eq("user_id", uid).gte("created_at", monthStart);
  await countGuard(ctx, "weeklyReviewsPerMonth", reviewsThisMonth ?? 0, "AI weekly reviews this month");

  const from = new Date(`${weekStart}T00:00:00Z`);
  const fromIso = new Date(from.getTime() - 86_400_000).toISOString();
  const [content, metrics, proof, experiments, brand, decisions] = await Promise.all([
    ctx.db.from("content_projects").select("id,title,format,status,created_at,published_at,content_pillars(name)").eq("user_id", uid).or(`created_at.gte.${fromIso},published_at.gte.${fromIso}`),
    ctx.db.from("metric_snapshots").select("content_id,captured_on,reach,impressions,likes,comments,saves,shares,profile_visits,follower_change,link_clicks,enquiries").eq("user_id", uid).gte("captured_on", weekStart),
    ctx.db.from("proof_entries").select("id,kind,title,created_at").eq("user_id", uid).gte("created_at", fromIso),
    ctx.db.from("experiments").select("id,title,status,start_date,end_date,conclusion").eq("user_id", uid),
    loadBrand(ctx),
    ctx.db.from("strategic_decisions").select("decision").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
  ]);
  const facts = gatherWeeklyFacts({
    weekStart,
    content: (content.data ?? []).map((c) => ({ ...c, pillar: (c.content_pillars as unknown as { name: string } | null)?.name ?? null })),
    metrics: metrics.data ?? [],
    proofEntries: proof.data ?? [],
    experiments: experiments.data ?? [],
    goals: brand.goals ?? [],
  });

  let review: WeeklyReviewAi;
  let model: string | null = null;
  if (!facts.sufficient_data) {
    // No AI call needed (and no credit used) when there is nothing to review.
    review = {
      summary: "There isn't enough recorded activity this week to review yet. That's okay — next week is a fresh start.",
      lessons: [],
      themes_to_test: [],
      goal_progress: "No progress can be measured without recorded activity.",
      priorities_next_week: [
        { title: "Capture two experiences in your Proof Bank", why: "Real material makes content easier to create." },
        { title: "Publish one post and mark it as published", why: "TapKit can only learn from confirmed activity." },
      ],
      data_gaps: facts.data_gaps,
      strategy_recommendation: null,
    };
  } else {
    const result = await runAi(ctx, {
      task: "weekly_review",
      system: P.SYSTEM_PROMPTS.weekly_review,
      user: P.weeklyUserPrompt(brand, facts, (decisions.data ?? []).map((d) => d.decision)),
      schema: weeklyReviewAiSchema,
      effort: "medium",
      maxTokens: 8000,
      mock: () => mocks.mockWeeklyReview(facts),
    });
    review = result.data;
    model = result.model;
  }
  const { data: row, error } = await ctx.db
    .from("weekly_reviews")
    .upsert({ user_id: uid, week_start: weekStart, facts, review, prompt_version: P.PROMPT_VERSIONS.weekly_review, model, created_at: new Date().toISOString() }, { onConflict: "user_id,week_start" })
    .select()
    .single();
  if (error) throw error;
  let recommendation = null;
  if (review.strategy_recommendation) {
    const r = review.strategy_recommendation;
    const { data } = await ctx.db
      .from("recommendations")
      .insert({ user_id: uid, source: "weekly_review", source_id: row.id, change_type: r.change_type, title: r.title, rationale: r.rationale, proposed_change: r.proposed_change })
      .select()
      .single();
    recommendation = data;
  }
  return { review: row, recommendation };
}

const offerBody = z.object({ draft: offerInputSchema.partial(), evidence_entry_ids: z.array(z.string().uuid()).max(10).optional() });

async function taskOfferAssist(ctx: Ctx, body: unknown) {
  requirePro(ctx, "offerAssistant");
  const { draft, evidence_entry_ids = [] } = offerBody.parse(body);
  const brand = await loadBrand(ctx);
  const { data: evidence } = evidence_entry_ids.length
    ? await ctx.db.from("proof_entries").select("kind,title,body,key_insight").eq("user_id", ctx.user.id).in("id", evidence_entry_ids)
    : { data: [] };
  const result = await runAi(ctx, {
    task: "offer_assist",
    system: P.SYSTEM_PROMPTS.offer_assist,
    user: P.offerUserPrompt(brand, draft, (evidence ?? []).map((e) => ({ ...e, body: (e.body ?? "").slice(0, 1500) }))),
    schema: offerAssistSchema,
    effort: "medium",
    maxTokens: 8000,
    mock: () => mocks.mockOfferAssist(draft.title ?? ""),
  });
  return result.data;
}

/* ------------------------------------------------------------------ */

const taskSchema = z.object({ task: z.enum(P.AI_TASKS) });

serve(async (req) => {
  const db = adminClient();
  const user = await requireUser(req, db);
  const body = (await readJson(req)) as Record<string, unknown>;
  const parsedTask = taskSchema.safeParse(body);
  if (!parsedTask.success) throw new HttpError(400, "invalid_task", "Unknown AI task");
  const ctx: Ctx = { req, db, user, plan: await planOf(db, user.id) };
  try {
    switch (parsedTask.data.task) {
      case "blueprint":
        return json(req, await taskBlueprint(ctx, body));
      case "alternative_positioning":
        return json(req, await taskAlternatives(ctx));
      case "classify_proof":
        return json(req, await taskClassify(ctx, body));
      case "generate_content":
        return json(req, await taskGenerateContent(ctx, body));
      case "analyze_experiment":
        return json(req, await taskAnalyzeExperiment(ctx, body));
      case "weekly_review":
        return json(req, await taskWeeklyReview(ctx, body));
      case "offer_assist":
        return json(req, await taskOfferAssist(ctx, body));
    }
  } catch (err) {
    if (err instanceof z.ZodError) throw new HttpError(400, "invalid_request", err.issues[0]?.message ?? "Invalid request");
    throw err;
  }
});
