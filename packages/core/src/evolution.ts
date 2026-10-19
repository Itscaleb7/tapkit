/** Brand Evolution: deterministic "next action" selection and weekly fact gathering. */

export interface UserProgressState {
  onboardingCompleted: boolean;
  hasAcceptedBlueprint: boolean;
  hasPendingBlueprint: boolean;
  proofEntryCount: number;
  contentCount: number;
  draftCount: number;
  readyCount: number;
  publishedCount: number;
  /** Published content with no recorded metrics, older than 2 days. */
  publishedAwaitingResults: number;
  activeExperiments: number;
  experimentsEndedAwaitingConclusion: number;
  lastWeeklyReviewAt: string | null;
  pendingRecommendations: number;
  pillarCount: number;
  hasPortfolio: boolean;
  now?: string;
}

export interface NextAction {
  id: string;
  title: string;
  detail: string;
  cta: string;
  route: string;
  /** Lower = more important. */
  priority: number;
}

const DAY = 86_400_000;

export function rankActions(s: UserProgressState): NextAction[] {
  const now = s.now ? new Date(s.now).getTime() : Date.now();
  const out: NextAction[] = [];
  const push = (a: NextAction) => out.push(a);

  if (!s.onboardingCompleted) {
    push({ id: "finish_onboarding", title: "Finish discovering your brand", detail: "A few more questions and TapKit will draft your Brand Blueprint.", cta: "Continue", route: "/onboarding", priority: 0 });
    return out;
  }
  if (!s.hasAcceptedBlueprint) {
    push(
      s.hasPendingBlueprint
        ? { id: "review_blueprint", title: "Review your Brand Blueprint", detail: "Accept, edit or regenerate the strategy TapKit drafted for you.", cta: "Review", route: "/brand/blueprint", priority: 1 }
        : { id: "generate_blueprint", title: "Generate your Brand Blueprint", detail: "Turn your answers into a positioning, pillars and a first-week plan.", cta: "Generate", route: "/onboarding/generate", priority: 1 },
    );
  }
  if (s.proofEntryCount < 3) {
    push({ id: "capture_proof", title: s.proofEntryCount === 0 ? "Capture your first experience" : "Add to your Proof Bank", detail: "Real stories, lessons and opinions make your content impossible to copy.", cta: "Capture", route: "/proof/new", priority: 2 });
  }
  if (s.experimentsEndedAwaitingConclusion > 0) {
    push({ id: "conclude_experiment", title: "Wrap up your experiment", detail: "Your test period has ended. Record results and decide what to try next.", cta: "Review", route: "/(tabs)/insights", priority: 2 });
  }
  if (s.publishedAwaitingResults > 0) {
    push({ id: "record_results", title: "Record your results", detail: `${s.publishedAwaitingResults} published post${s.publishedAwaitingResults > 1 ? "s have" : " has"} no results yet. A minute of data makes next week smarter.`, cta: "Add results", route: "/(tabs)/insights", priority: 3 });
  }
  if (s.readyCount > 0) {
    push({ id: "publish_ready", title: "Publish what's ready", detail: `You have ${s.readyCount} post${s.readyCount > 1 ? "s" : ""} ready. Mark it published once it's live.`, cta: "Open", route: "/(tabs)/create", priority: 4 });
  }
  if (s.draftCount > 0) {
    push({ id: "finish_draft", title: "Finish a draft", detail: `${s.draftCount} draft${s.draftCount > 1 ? "s are" : " is"} waiting for you.`, cta: "Edit", route: "/(tabs)/create", priority: 5 });
  }
  if (s.hasAcceptedBlueprint && s.contentCount === 0) {
    push({ id: "create_first", title: "Create your first carousel", detail: s.proofEntryCount > 0 ? "Turn one of your Proof Bank entries into a post." : "Start from one of your content pillars.", cta: "Create", route: "/content/new", priority: 3 });
  }
  const reviewAge = s.lastWeeklyReviewAt ? now - new Date(s.lastWeeklyReviewAt).getTime() : Infinity;
  if (s.contentCount > 0 && reviewAge > 7 * DAY) {
    push({ id: "weekly_review", title: "Review your week", detail: "See what you made, what you learned and what to focus on next.", cta: "Start review", route: "/reviews/new", priority: 6 });
  }
  if (s.pendingRecommendations > 0) {
    push({ id: "recommendations", title: "Decide on a strategy suggestion", detail: "TapKit spotted something in your results. Accept, reject or defer it.", cta: "Decide", route: "/(tabs)/insights", priority: 6 });
  }
  if (s.publishedCount >= 2 && s.activeExperiments === 0) {
    push({ id: "start_experiment", title: "Run a growth experiment", detail: "Test one idea for a couple of weeks instead of posting at random.", cta: "Plan test", route: "/experiments/new", priority: 7 });
  }
  if (s.hasAcceptedBlueprint && !s.hasPortfolio && s.contentCount >= 1) {
    push({ id: "portfolio", title: "Publish your portfolio", detail: "A shareable page for clients, partners and employers.", cta: "Set up", route: "/portfolio/edit", priority: 8 });
  }
  if (s.hasAcceptedBlueprint && s.pillarCount < 3) {
    push({ id: "improve_blueprint", title: "Strengthen your content pillars", detail: "Three to five clear pillars make it easier to know what to post.", cta: "Edit pillars", route: "/(tabs)/brand", priority: 8 });
  }
  if (out.length === 0) {
    push({ id: "create", title: "Create something new", detail: "Turn a recent experience into your next post.", cta: "Create", route: "/content/new", priority: 9 });
  }
  return out.sort((a, b) => a.priority - b.priority);
}

export function nextAction(s: UserProgressState): NextAction {
  return rankActions(s)[0]!;
}

/* ---------------- Weekly review facts (deterministic, fed to AI) ---------------- */

export interface WeeklyFactsInput {
  weekStart: string; // YYYY-MM-DD (Monday)
  content: { id: string; title: string; format: string; status: string; pillar?: string | null; created_at: string; published_at?: string | null }[];
  metrics: { content_id?: string | null; captured_on: string; [k: string]: unknown }[];
  proofEntries: { id: string; kind: string; created_at: string; title?: string | null }[];
  experiments: { id: string; title: string; status: string; start_date: string; end_date: string; conclusion?: string | null }[];
  goals: string[];
}

export interface WeeklyFacts {
  week_start: string;
  week_end: string;
  content_created: number;
  content_created_titles: string[];
  confirmed_published: number;
  published_titles: string[];
  results_recorded: number;
  proof_entries_added: number;
  proof_kinds: Record<string, number>;
  pillars_used: Record<string, number>;
  experiments_active: string[];
  experiments_concluded: { title: string; conclusion: string | null }[];
  metric_totals: Record<string, number>;
  goals: string[];
  sufficient_data: boolean;
  data_gaps: string[];
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekStartOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

const inWeek = (iso: string | null | undefined, start: string, endExclusive: string) => {
  if (!iso) return false;
  const day = iso.slice(0, 10);
  return day >= start && day < endExclusive;
};

export function gatherWeeklyFacts(input: WeeklyFactsInput): WeeklyFacts {
  const start = input.weekStart;
  const endEx = addDays(start, 7);
  const created = input.content.filter((c) => inWeek(c.created_at, start, endEx));
  const published = input.content.filter((c) => c.status === "published" && inWeek(c.published_at, start, endEx));
  const metrics = input.metrics.filter((m) => inWeek(m.captured_on, start, endEx));
  const proof = input.proofEntries.filter((p) => inWeek(p.created_at, start, endEx));
  const proofKinds: Record<string, number> = {};
  proof.forEach((p) => (proofKinds[p.kind] = (proofKinds[p.kind] ?? 0) + 1));
  const pillars: Record<string, number> = {};
  created.forEach((c) => {
    if (c.pillar) pillars[c.pillar] = (pillars[c.pillar] ?? 0) + 1;
  });
  const totals: Record<string, number> = {};
  for (const m of metrics) {
    for (const [k, v] of Object.entries(m)) {
      if (typeof v === "number" && k !== "captured_on") totals[k] = (totals[k] ?? 0) + v;
    }
  }
  const active = input.experiments.filter((e) => e.status === "running" || (e.status === "planned" && e.start_date < endEx));
  const concluded = input.experiments.filter((e) => e.status === "completed" && e.end_date >= start && e.end_date < endEx);
  const gaps: string[] = [];
  if (created.length === 0) gaps.push("No content was created this week.");
  if (published.length === 0) gaps.push("No posts were confirmed as published this week.");
  if (published.length > 0 && metrics.length === 0) gaps.push("Published posts have no recorded results yet.");
  if (metrics.length > 0 && metrics.length < 3) gaps.push("Only a few results were recorded, so patterns are not reliable yet.");
  return {
    week_start: start,
    week_end: addDays(start, 6),
    content_created: created.length,
    content_created_titles: created.slice(0, 12).map((c) => c.title),
    confirmed_published: published.length,
    published_titles: published.slice(0, 12).map((c) => c.title),
    results_recorded: metrics.length,
    proof_entries_added: proof.length,
    proof_kinds: proofKinds,
    pillars_used: pillars,
    experiments_active: active.map((e) => e.title),
    experiments_concluded: concluded.map((e) => ({ title: e.title, conclusion: e.conclusion ?? null })),
    metric_totals: totals,
    goals: input.goals.slice(0, 8),
    sufficient_data: created.length + published.length + metrics.length + proof.length > 0,
    data_gaps: gaps,
  };
}
