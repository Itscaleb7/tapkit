import { z } from "zod";
import {
  CONTENT_FORMAT_IDS,
  CONTENT_STATUS_IDS,
  GENERATION_SOURCE_IDS,
  LEAD_KIND_IDS,
  LEAD_STAGE_IDS,
  OFFER_TYPE_IDS,
  PROOF_KIND_IDS,
} from "./domain.ts";

/* ------------------------------------------------------------------ */
/* Shared primitives                                                    */
/* ------------------------------------------------------------------ */

const text = (max: number) => z.string().trim().max(max);
const reqText = (max: number, label = "This field") =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`);
const tagList = (maxItems: number, maxLen = 60) => z.array(z.string().trim().min(1).max(maxLen)).max(maxItems);

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .refine((p) => /[A-Za-z]/.test(p) && /[0-9]/.test(p), "Include at least one letter and one number");

export const signUpSchema = z.object({ email: emailSchema, password: passwordSchema, displayName: reqText(60, "Name") });
export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password") });

export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url("Enter a valid URL")
  .refine((u) => /^https?:\/\//i.test(u), "Only http(s) links are supported");

/* ------------------------------------------------------------------ */
/* Onboarding                                                           */
/* ------------------------------------------------------------------ */

export const onboardingAnswersSchema = z.object({
  displayName: text(60).optional(),
  primaryGoal: text(40).optional(),
  goalDetail: text(600).optional(),
  interests: tagList(20).optional(),
  skills: tagList(20).optional(),
  knowledge: text(1200).optional(),
  experience: text(1500).optional(),
  hobbies: tagList(20).optional(),
  ambitions: text(800).optional(),
  enjoyTopics: tagList(20).optional(),
  intendedAudience: text(600).optional(),
  platforms: tagList(8, 20).optional(),
  stage: text(20).optional(),
  personality: tagList(8, 30).optional(),
  communicationStyle: tagList(5, 30).optional(),
  longTermObjectives: text(800).optional(),
  monetisationInterests: tagList(8, 30).optional(),
  startingFromZero: z.boolean().optional(),
});
export type OnboardingAnswers = z.infer<typeof onboardingAnswersSchema>;

/** Minimum needed before the blueprint can be generated. */
export function onboardingReadiness(a: OnboardingAnswers): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!a.primaryGoal) missing.push("primary goal");
  const signal = (a.interests?.length ?? 0) + (a.skills?.length ?? 0) + (a.enjoyTopics?.length ?? 0) + (a.hobbies?.length ?? 0);
  if (signal === 0 && !a.knowledge && !a.experience) missing.push("at least one interest, skill or topic");
  if (!a.stage) missing.push("current stage");
  return { ready: missing.length === 0, missing };
}

/* ------------------------------------------------------------------ */
/* AI output: Brand Blueprint                                           */
/* ------------------------------------------------------------------ */

const basis = z.enum(["user_fact", "hypothesis"]).describe("user_fact if directly supported by the user's answers; hypothesis if it is an assumption to validate");

export const blueprintPillarSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().min(1).max(300),
  example_topics: z.array(z.string().min(1).max(140)).min(2).max(5),
  rationale: z.string().min(1).max(400),
  basis,
});

export const brandBlueprintSchema = z.object({
  positioning_statement: z.string().min(1).max(400),
  positioning_rationale: z.string().min(1).max(600),
  target_audience: z.object({
    description: z.string().min(1).max(400),
    needs: z.array(z.string().min(1).max(160)).min(1).max(6),
    interests: z.array(z.string().min(1).max(120)).min(1).max(6),
    basis,
  }),
  differentiators: z.array(z.object({ point: z.string().min(1).max(200), basis })).min(1).max(5),
  brand_promise: z.string().min(1).max(300),
  brand_voice: z.object({
    summary: z.string().min(1).max(300),
    traits: z.array(z.string().min(1).max(40)).min(2).max(6),
    do: z.array(z.string().min(1).max(160)).min(1).max(5),
    avoid: z.array(z.string().min(1).max(160)).min(1).max(5),
  }),
  core_values: z.array(z.string().min(1).max(60)).min(2).max(6),
  content_pillars: z.array(blueprintPillarSchema).min(3).max(5),
  recommended_formats: z.array(z.object({ format: z.string().min(1).max(60), why: z.string().min(1).max(240) })).min(1).max(5),
  initial_content_ideas: z
    .array(
      z.object({
        title: z.string().min(1).max(140),
        pillar: z.string().min(1).max(60),
        format: z.enum(CONTENT_FORMAT_IDS),
        angle: z.string().min(1).max(300),
        uses_user_experience: z.boolean(),
      }),
    )
    .min(3)
    .max(8),
  publishing_cadence: z.object({
    posts_per_week: z.number().int().min(1).max(14),
    rationale: z.string().min(1).max(300),
  }),
  first_week_plan: z.array(z.object({ day: z.number().int().min(1).max(7), task: z.string().min(1).max(200), why: z.string().min(1).max(240) })).min(3).max(7),
  monetisation_paths: z
    .array(
      z.object({
        path: z.string().min(1).max(80),
        description: z.string().min(1).max(300),
        readiness: z.enum(["now", "soon", "later"]),
        rationale: z.string().min(1).max(300),
      }),
    )
    .min(1)
    .max(5),
  facts_used: z.array(z.string().min(1).max(200)).max(15).describe("Facts taken directly from the user's answers"),
  hypotheses: z.array(z.string().min(1).max(240)).max(10).describe("Assumptions TapKit is making that the user should validate"),
});
export type BrandBlueprint = z.infer<typeof brandBlueprintSchema>;

export const alternativePositioningSchema = z.object({
  alternatives: z
    .array(
      z.object({
        label: z.string().min(1).max(60),
        positioning_statement: z.string().min(1).max(400),
        target_audience: z.string().min(1).max(300),
        tradeoffs: z.string().min(1).max(400),
        best_if: z.string().min(1).max(300),
      }),
    )
    .min(2)
    .max(3),
});
export type AlternativePositioning = z.infer<typeof alternativePositioningSchema>;

/* ------------------------------------------------------------------ */
/* My Brand (editable identity)                                         */
/* ------------------------------------------------------------------ */

export const brandProfileUpdateSchema = z.object({
  positioning: text(400).optional(),
  audience: text(600).optional(),
  audience_needs: tagList(8, 160).optional(),
  brand_promise: text(300).optional(),
  differentiators: tagList(6, 200).optional(),
  voice_summary: text(300).optional(),
  voice_traits: tagList(8, 40).optional(),
  values: tagList(8, 60).optional(),
  goals: tagList(8, 200).optional(),
  platforms: tagList(8, 20).optional(),
  visual_preferences: text(400).optional(),
  stage: text(20).optional(),
  long_term_objectives: text(800).optional(),
  monetisation_interests: tagList(8, 30).optional(),
});
export type BrandProfileUpdate = z.infer<typeof brandProfileUpdateSchema>;

export const pillarInputSchema = z.object({
  name: reqText(60, "Pillar name"),
  description: text(300).optional(),
  example_topics: tagList(8, 140).optional(),
});

/* ------------------------------------------------------------------ */
/* Proof Bank                                                           */
/* ------------------------------------------------------------------ */

export const proofEntryInputSchema = z
  .object({
    kind: z.enum(PROOF_KIND_IDS),
    title: text(140).optional(),
    body: text(8000).optional(),
    link_url: httpUrl.optional().or(z.literal("").transform(() => undefined)),
    occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    tags: tagList(12, 40).optional(),
    pillar_id: z.string().uuid().nullable().optional(),
  })
  .refine((v) => Boolean(v.body?.length || v.title?.length || v.link_url), {
    message: "Add a few words, a title or a link",
    path: ["body"],
  })
  .refine((v) => v.kind !== "link" || Boolean(v.link_url), { message: "Add the link you want to save", path: ["link_url"] });
export type ProofEntryInput = z.infer<typeof proofEntryInputSchema>;

export const proofClassificationSchema = z.object({
  kind: z.enum(PROOF_KIND_IDS),
  pillar: z.string().max(60).nullable().describe("Exact name of the best-matching content pillar, or null"),
  key_insight: z.string().min(1).max(280),
  audience_relevance: z.string().min(1).max(280),
  content_angles: z.array(z.string().min(1).max(200)).min(1).max(5),
  tags: z.array(z.string().min(1).max(40)).max(6),
  suggested_title: z.string().min(1).max(100),
});
export type ProofClassification = z.infer<typeof proofClassificationSchema>;

/* ------------------------------------------------------------------ */
/* Content Studio                                                       */
/* ------------------------------------------------------------------ */

export const SLIDE_LAYOUTS = ["hook", "title_body", "list", "checklist", "quote", "comparison", "myth_fact", "big_number", "cta"] as const;
export type SlideLayout = (typeof SLIDE_LAYOUTS)[number];

export const slideSchema = z.object({
  id: z.string().min(1).max(40),
  layout: z.enum(SLIDE_LAYOUTS),
  heading: z.string().max(200),
  body: z.string().max(700),
  items: z.array(z.string().max(160)).max(7),
  left_title: z.string().max(60),
  right_title: z.string().max(60),
  left_items: z.array(z.string().max(120)).max(5),
  right_items: z.array(z.string().max(120)).max(5),
  kicker: z.string().max(60),
});
export type Slide = z.infer<typeof slideSchema>;
export const slidesSchema = z.array(slideSchema).max(20);

/** What the model returns for slides (no ids — we assign them). */
export const aiSlideSchema = slideSchema.omit({ id: true });

export const contentGenerationRequestSchema = z.object({
  format: z.enum(CONTENT_FORMAT_IDS),
  source: z.enum(GENERATION_SOURCE_IDS),
  proof_entry_ids: z.array(z.string().uuid()).max(5).optional(),
  pillar_id: z.string().uuid().nullable().optional(),
  topic: text(500).optional(),
  previous_content_id: z.string().uuid().optional(),
  experiment_id: z.string().uuid().optional(),
  slide_count: z.number().int().min(1).max(10).optional(),
  extra_instructions: text(500).optional(),
});
export type ContentGenerationRequest = z.infer<typeof contentGenerationRequestSchema>;

export const generatedContentSchema = z.object({
  title: z.string().min(1).max(120),
  hook: z.string().min(1).max(200),
  slides: z.array(aiSlideSchema).max(10),
  caption: z.string().min(1).max(2200),
  cta: z.string().max(200),
  hashtags: z.array(z.string().min(1).max(40)).max(10),
  alternative_hooks: z.array(z.string().min(1).max(200)).max(5),
  series_ideas: z.array(z.string().min(1).max(160)).max(5),
  grounding_notes: z.string().max(500).describe("Which of the user's real experiences were used, and anything you deliberately did not claim"),
});
export type GeneratedContent = z.infer<typeof generatedContentSchema>;

export const contentUpdateSchema = z.object({
  title: reqText(120, "Title").optional(),
  caption: text(2200).optional(),
  hook: text(200).optional(),
  cta: text(200).optional(),
  hashtags: tagList(30, 40).optional(),
  status: z.enum(CONTENT_STATUS_IDS).optional(),
  theme_id: text(40).optional(),
  slides: slidesSchema.optional(),
  pillar_id: z.string().uuid().nullable().optional(),
  published_url: httpUrl.nullable().optional(),
  published_at: z.string().datetime({ offset: true }).nullable().optional(),
  platform: text(20).nullable().optional(),
});

/* ------------------------------------------------------------------ */
/* Growth Experiments                                                   */
/* ------------------------------------------------------------------ */

export const experimentInputSchema = z
  .object({
    title: reqText(120, "Title"),
    hypothesis: reqText(500, "Hypothesis"),
    objective: text(300).optional(),
    pillar_id: z.string().uuid().nullable().optional(),
    format: text(40).optional(),
    platform: text(20).optional(),
    planned_posts: z.number().int().min(1).max(30),
    success_metrics: z.array(z.string()).min(1, "Choose at least one success metric").max(5),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  })
  .refine((v) => v.end_date >= v.start_date, { message: "End date must be on or after the start date", path: ["end_date"] });
export type ExperimentInput = z.infer<typeof experimentInputSchema>;

const metricValue = z.number().int().min(0).max(1_000_000_000).nullable().optional();
export const metricSnapshotInputSchema = z
  .object({
    content_id: z.string().uuid().nullable().optional(),
    experiment_id: z.string().uuid().nullable().optional(),
    platform: reqText(20, "Platform"),
    captured_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reach: metricValue,
    impressions: metricValue,
    likes: metricValue,
    comments: metricValue,
    saves: metricValue,
    shares: metricValue,
    profile_visits: metricValue,
    follower_change: z.number().int().min(-10_000_000).max(10_000_000).nullable().optional(),
    link_clicks: metricValue,
    enquiries: metricValue,
    notes: text(500).optional(),
  })
  .refine(
    (v) =>
      ["reach", "impressions", "likes", "comments", "saves", "shares", "profile_visits", "follower_change", "link_clicks", "enquiries"].some(
        (k) => v[k as keyof typeof v] !== null && v[k as keyof typeof v] !== undefined,
      ),
    { message: "Enter at least one metric", path: ["reach"] },
  );
export type MetricSnapshotInput = z.infer<typeof metricSnapshotInputSchema>;

export const experimentAnalysisSchema = z.object({
  what_happened: z.string().min(1).max(800),
  metric_changes: z.array(z.string().min(1).max(240)).max(8),
  reasonable_inferences: z.array(z.string().min(1).max(300)).max(5),
  uncertainties: z.array(z.string().min(1).max(300)).min(1).max(5),
  next_test: z.string().min(1).max(400),
  suggested_conclusion: z.string().min(1).max(400),
});
export type ExperimentAnalysis = z.infer<typeof experimentAnalysisSchema>;

/* ------------------------------------------------------------------ */
/* Brand Evolution                                                      */
/* ------------------------------------------------------------------ */

export const weeklyReviewAiSchema = z.object({
  summary: z.string().min(1).max(800),
  lessons: z.array(z.string().min(1).max(300)).max(5),
  themes_to_test: z.array(z.string().min(1).max(240)).max(4),
  goal_progress: z.string().min(1).max(600),
  priorities_next_week: z.array(z.object({ title: z.string().min(1).max(120), why: z.string().min(1).max(300) })).min(1).max(4),
  data_gaps: z.array(z.string().min(1).max(240)).max(5),
  strategy_recommendation: z
    .object({
      title: z.string().min(1).max(120),
      rationale: z.string().min(1).max(600),
      change_type: z.enum(["pillar", "format", "cadence", "audience", "positioning", "other"]),
      proposed_change: z.string().min(1).max(400),
    })
    .nullable()
    .describe("Only when recorded results genuinely support a change; otherwise null"),
});
export type WeeklyReviewAi = z.infer<typeof weeklyReviewAiSchema>;

/* ------------------------------------------------------------------ */
/* Monetisation                                                         */
/* ------------------------------------------------------------------ */

export const offerInputSchema = z.object({
  title: reqText(120, "Offer name"),
  offer_type: z.enum(OFFER_TYPE_IDS),
  audience: text(400).optional(),
  problem: text(600).optional(),
  deliverables: tagList(10, 200).optional(),
  pricing_hypothesis: text(300).optional(),
  price_amount: z.number().min(0).max(1_000_000).nullable().optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  differentiation: text(600).optional(),
  description: text(2000).optional(),
  evidence_entry_ids: z.array(z.string().uuid()).max(10).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  is_public: z.boolean().optional(),
  cta_url: httpUrl.nullable().optional(),
});
export type OfferInput = z.infer<typeof offerInputSchema>;

export const offerAssistSchema = z.object({
  title: z.string().min(1).max(120),
  audience: z.string().min(1).max(400),
  problem: z.string().min(1).max(600),
  deliverables: z.array(z.string().min(1).max(200)).min(1).max(8),
  pricing_hypothesis: z.string().min(1).max(300),
  differentiation: z.string().min(1).max(600),
  description: z.string().min(1).max(2000),
  validation_steps: z.array(z.string().min(1).max(240)).min(1).max(5),
  evidence_used: z.array(z.string().min(1).max(200)).max(8),
  missing_evidence: z.array(z.string().min(1).max(240)).max(5),
});
export type OfferAssist = z.infer<typeof offerAssistSchema>;

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED_SLUGS = new Set(["admin", "api", "app", "login", "signup", "support", "privacy", "terms", "help", "tapkit", "p", "www", "settings"]);
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_RE, "Use 3–40 lowercase letters, numbers or hyphens")
  .refine((s) => !RESERVED_SLUGS.has(s), "That address is reserved");

export const portfolioSettingsSchema = z.object({
  slug: slugSchema,
  display_name: reqText(80, "Name"),
  headline: text(140).optional(),
  bio: text(1200).optional(),
  positioning: text(400).optional(),
  skills: tagList(15, 40).optional(),
  experience: text(1500).optional(),
  contact_email: emailSchema.nullable().optional().or(z.literal("").transform(() => null)),
  contact_url: httpUrl.nullable().optional().or(z.literal("").transform(() => null)),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  enquiries_enabled: z.boolean().optional(),
  show_offers: z.boolean().optional(),
  show_content: z.boolean().optional(),
});
export type PortfolioSettingsInput = z.infer<typeof portfolioSettingsSchema>;

export const leadInputSchema = z.object({
  name: reqText(120, "Name"),
  company: text(120).optional(),
  kind: z.enum(LEAD_KIND_IDS),
  stage: z.enum(LEAD_STAGE_IDS),
  email: emailSchema.nullable().optional().or(z.literal("").transform(() => null)),
  url: httpUrl.nullable().optional().or(z.literal("").transform(() => null)),
  notes: text(2000).optional(),
  value_amount: z.number().min(0).max(100_000_000).nullable().optional(),
  next_follow_up: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  offer_id: z.string().uuid().nullable().optional(),
});
export type LeadInput = z.infer<typeof leadInputSchema>;

export const enquirySchema = z.object({
  slug: slugSchema,
  name: reqText(120, "Name"),
  email: emailSchema,
  message: reqText(2000, "Message"),
  /** Honeypot: must be empty. */
  website: z.string().max(0).optional(),
});
export type EnquiryInput = z.infer<typeof enquirySchema>;

/** Format a ZodError into a field → message map for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
