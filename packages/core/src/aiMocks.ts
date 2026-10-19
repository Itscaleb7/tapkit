/**
 * Deterministic, schema-valid outputs used ONLY by the "mock" AI provider in
 * local development and automated tests (AI_PROVIDER=mock). The edge function
 * refuses to use the mock provider when ENVIRONMENT=production.
 * Outputs are templated from the request so tests can verify context flows through.
 */
import type {
  AlternativePositioning,
  BrandBlueprint,
  ExperimentAnalysis,
  GeneratedContent,
  OfferAssist,
  ProofClassification,
  WeeklyReviewAi,
} from "./schemas.ts";

export function mockBlueprint(seed: { interests?: string[]; goal?: string } = {}): BrandBlueprint {
  const topic = seed.interests?.[0] ?? "your craft";
  return {
    positioning_statement: `[MOCK] I help beginners make steady progress in ${topic} by sharing what I learn as I go.`,
    positioning_rationale: "[MOCK] Based on the interests and goal you shared.",
    target_audience: { description: `People starting out in ${topic}`, needs: ["Clear first steps"], interests: [topic], basis: "hypothesis" },
    differentiators: [{ point: "Learning in public from zero", basis: "user_fact" }],
    brand_promise: "Honest, practical progress notes every week.",
    brand_voice: { summary: "Warm and direct", traits: ["Warm", "Direct"], do: ["Use real examples"], avoid: ["Hype"] },
    core_values: ["Honesty", "Consistency"],
    content_pillars: [
      { name: "Lessons learned", description: "What I learned this week", example_topics: ["A mistake I made", "What I'd do differently"], rationale: "Builds trust", basis: "user_fact" },
      { name: `${topic} basics`, description: `Beginner guides for ${topic}`, example_topics: ["Getting started", "Common myths"], rationale: "Useful to newcomers", basis: "hypothesis" },
      { name: "Behind the scenes", description: "The process, not just results", example_topics: ["My routine", "Tools I use"], rationale: "Makes you relatable", basis: "hypothesis" },
    ],
    recommended_formats: [{ format: "Instagram carousel", why: "Saves and shares reward useful, structured posts" }],
    initial_content_ideas: [
      { title: "Why I'm starting from zero", pillar: "Behind the scenes", format: "personal_story", angle: "Introduce yourself", uses_user_experience: true },
      { title: `3 ${topic} myths`, pillar: `${topic} basics`, format: "myth_fact", angle: "Correct misconceptions", uses_user_experience: false },
      { title: "My first lesson", pillar: "Lessons learned", format: "carousel", angle: "One clear lesson", uses_user_experience: true },
    ],
    publishing_cadence: { posts_per_week: 3, rationale: "Sustainable for a beginner" },
    first_week_plan: [
      { day: 1, task: "Capture three experiences in your Proof Bank", why: "Raw material" },
      { day: 2, task: "Publish an introduction carousel", why: "Sets expectations" },
      { day: 4, task: "Publish a myth vs fact post", why: "Tests educational content" },
    ],
    monetisation_paths: [{ path: "Freelance services", description: "Offer a small starter service", readiness: "later", rationale: "Build proof first" }],
    facts_used: seed.goal ? [`Goal: ${seed.goal}`] : [],
    hypotheses: ["Your audience is other beginners"],
  };
}

export function mockAlternatives(): AlternativePositioning {
  return {
    alternatives: [
      { label: "[MOCK] Specialist", positioning_statement: "Narrow focus on one audience.", target_audience: "A narrower group", tradeoffs: "Smaller but more engaged", best_if: "You want clients fast" },
      { label: "[MOCK] Documentarian", positioning_statement: "Document the whole journey.", target_audience: "Fellow learners", tradeoffs: "Slower to monetise", best_if: "You are starting from zero" },
    ],
  };
}

export function mockClassification(entry: { kind: string; body?: string | null; title?: string | null }, pillars: string[]): ProofClassification {
  const text = (entry.body ?? entry.title ?? "entry").slice(0, 80);
  return {
    kind: entry.kind === "voice" || entry.kind === "link" ? entry.kind : (entry.kind as ProofClassification["kind"]),
    pillar: pillars[0] ?? null,
    key_insight: `[MOCK] ${text}`,
    audience_relevance: "[MOCK] Relevant to people a step behind you.",
    content_angles: ["[MOCK] Turn this into a short lesson carousel"],
    tags: ["mock"],
    suggested_title: text.slice(0, 60) || "Untitled",
  };
}

export function mockContent(input: { format: string; topic?: string | null; proofTitles: string[]; slideCount?: number | null }): GeneratedContent {
  const subject = input.proofTitles[0] ?? input.topic ?? "your topic";
  const empty = { heading: "", body: "", items: [] as string[], left_title: "", right_title: "", left_items: [] as string[], right_items: [] as string[], kicker: "" };
  const wantSlides = input.format === "caption" || input.format === "hooks" ? 0 : input.format === "single_image" ? 1 : Math.max(3, Math.min(10, input.slideCount ?? 5));
  const slides: GeneratedContent["slides"] = [];
  if (wantSlides >= 1) slides.push({ ...empty, layout: "hook", kicker: "[MOCK]", heading: `What I learned from ${subject}`.slice(0, 70), body: "Swipe →" });
  for (let i = 1; i < wantSlides - 1; i++) slides.push({ ...empty, layout: i % 2 ? "title_body" : "list", heading: `Point ${i}`, body: i % 2 ? `Detail about ${subject}.` : "", items: i % 2 ? [] : ["First", "Second", "Third"] });
  if (wantSlides >= 2) slides.push({ ...empty, layout: "cta", heading: "Found this useful?", body: "Save it for later.", kicker: "Follow for more" });
  return {
    title: `[MOCK] ${subject}`.slice(0, 120),
    hook: `What I learned from ${subject}`.slice(0, 200),
    slides,
    caption: `[MOCK] A post about ${subject}.`,
    cta: "Save this for later",
    hashtags: ["personalbrand"],
    alternative_hooks: input.format === "hooks" ? ["Hook 1", "Hook 2", "Hook 3", "Hook 4", "Hook 5"] : ["Alt hook"],
    series_ideas: ["Part 2"],
    grounding_notes: input.proofTitles.length ? `Used: ${input.proofTitles.join(", ")}` : "No personal experiences were provided.",
  };
}

export function mockExperimentAnalysis(postsWithData: number): ExperimentAnalysis {
  return {
    what_happened: `[MOCK] ${postsWithData} post(s) have recorded results.`,
    metric_changes: ["[MOCK] See deterministic stats"],
    reasonable_inferences: postsWithData >= 3 ? ["[MOCK] Early signal"] : [],
    uncertainties: ["[MOCK] Small sample size"],
    next_test: "[MOCK] Repeat with two more posts",
    suggested_conclusion: postsWithData >= 3 ? "[MOCK] Promising, keep testing" : "[MOCK] Not enough data yet",
  };
}

export function mockWeeklyReview(facts: { content_created: number; sufficient_data: boolean; data_gaps: string[] }): WeeklyReviewAi {
  return {
    summary: facts.sufficient_data ? `[MOCK] You created ${facts.content_created} piece(s) of content.` : "[MOCK] Not enough data this week to review.",
    lessons: [],
    themes_to_test: [],
    goal_progress: "[MOCK] Progress is based only on recorded activity.",
    priorities_next_week: [{ title: "Create one post", why: "Builds momentum" }],
    data_gaps: facts.data_gaps.slice(0, 5),
    strategy_recommendation: null,
  };
}

export function mockOfferAssist(title: string): OfferAssist {
  return {
    title: title || "[MOCK] Starter offer",
    audience: "[MOCK] Beginners",
    problem: "[MOCK] They don't know where to start",
    deliverables: ["[MOCK] One 45-minute session"],
    pricing_hypothesis: "[MOCK] Test a low introductory price with 3 people",
    differentiation: "[MOCK] Based on your own recent experience",
    description: "[MOCK] A short offer description.",
    validation_steps: ["[MOCK] Ask three people if they'd pay"],
    evidence_used: [],
    missing_evidence: ["[MOCK] A result you achieved for someone else"],
  };
}
