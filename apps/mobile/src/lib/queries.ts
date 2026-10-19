// Data hooks. All reads/writes go through Supabase (RLS-protected) or Edge Functions.
import type {
  AlternativePositioning,
  BrandProfileUpdate,
  ContentGenerationRequest,
  OfferAssist,
  OnboardingAnswers,
  Slide,
  Tables,
  TablesInsert,
  TablesUpdate,
  UserProgressState,
} from "@tapkit/core";
import { type QueryKey, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ai, invoke, must } from "./api";
import { useAuth } from "./auth";
import { entitlementKey } from "./entitlement";
import { AppError } from "./errors";
import { enqueueCapture } from "./outbox";
import { supabase } from "./supabase";

export type Profile = Tables<"profiles">;
export type Blueprint = Omit<Tables<"blueprints">, "content"> & { content: import("@tapkit/core").BrandBlueprint };
export type BrandProfile = Tables<"brand_profiles">;
export type Pillar = Tables<"content_pillars">;
export type ProofEntry = Tables<"proof_entries">;
export type Content = Omit<Tables<"content_projects">, "slides"> & { slides: Slide[] };
export type Experiment = Tables<"experiments">;
export type Metric = Tables<"metric_snapshots">;
export type WeeklyReview = Tables<"weekly_reviews">;
export type Recommendation = Tables<"recommendations">;
export type Decision = Tables<"strategic_decisions">;
export type Offer = Tables<"offers">;
export type Portfolio = Tables<"portfolios">;
export type PortfolioItem = Tables<"portfolio_items">;
export type Lead = Tables<"leads">;
export type LeadActivity = Tables<"lead_activities">;

export const keys = {
  profile: ["profile"] as const,
  onboarding: ["onboarding"] as const,
  blueprints: ["blueprints"] as const,
  brand: ["brand"] as const,
  pillars: ["pillars"] as const,
  versions: ["brand-versions"] as const,
  proof: (f?: object) => ["proof", f ?? {}] as const,
  proofOne: (id: string) => ["proof", "one", id] as const,
  content: (f?: object) => ["content", f ?? {}] as const,
  contentOne: (id: string) => ["content", "one", id] as const,
  experiments: ["experiments"] as const,
  experiment: (id: string) => ["experiments", id] as const,
  metrics: (f: object) => ["metrics", f] as const,
  reviews: ["reviews"] as const,
  recommendations: ["recommendations"] as const,
  decisions: ["decisions"] as const,
  offers: ["offers"] as const,
  portfolio: ["portfolio"] as const,
  portfolioItems: ["portfolio-items"] as const,
  leads: ["leads"] as const,
  lead: (id: string) => ["leads", id] as const,
  leadActivities: (id: string) => ["lead-activities", id] as const,
  home: ["home"] as const,
};

function useUid() {
  const { session } = useAuth();
  return session?.user.id ?? "";
}

function useInvalidate() {
  const qc = useQueryClient();
  return (...ks: QueryKey[]) => Promise.all(ks.map((k) => qc.invalidateQueries({ queryKey: k })));
}

/* ------------------------------- Profile ------------------------------- */

export function useProfile() {
  const uid = useUid();
  return useQuery({ queryKey: keys.profile, enabled: !!uid, queryFn: async () => must(await supabase.from("profiles").select("*").eq("id", uid).single()) });
}

export function useUpdateProfile() {
  const uid = useUid();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"profiles">) => must(await supabase.from("profiles").update(patch).eq("id", uid).select().single()),
    onSuccess: () => inv(keys.profile),
  });
}

export function useHomeState() {
  const uid = useUid();
  return useQuery({ queryKey: keys.home, enabled: !!uid, queryFn: async () => must(await supabase.rpc("get_home_state")) as unknown as UserProgressState });
}

/* ------------------------------ Onboarding ----------------------------- */

export function useOnboarding() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.onboarding,
    enabled: !!uid,
    queryFn: async () => {
      const row = must(await supabase.from("onboarding_responses").select("*").eq("user_id", uid).maybeSingle());
      return { answers: (row?.answers ?? {}) as OnboardingAnswers, step: row?.current_step ?? 0 };
    },
  });
}

export function useSaveOnboarding() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ answers, step }: { answers: OnboardingAnswers; step: number }) =>
      must(await supabase.from("onboarding_responses").upsert({ user_id: uid, answers: answers as never, current_step: step }).select().single()),
    onSuccess: (_d, v) => qc.setQueryData(keys.onboarding, { answers: v.answers, step: v.step }),
  });
}

/* ------------------------------- Blueprint ----------------------------- */

export function useBlueprints() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.blueprints,
    enabled: !!uid,
    queryFn: async () => must(await supabase.from("blueprints").select("*").eq("user_id", uid).order("version", { ascending: false })) as unknown as Blueprint[],
  });
}

export function useGenerateBlueprint() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (feedback?: string) => ai<{ blueprint: Blueprint }>("blueprint", feedback ? { feedback } : {}),
    onSuccess: () => inv(keys.blueprints, keys.home, entitlementKey),
  });
}

export function useAcceptBlueprint() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, replacePillars = true }: { id: string; replacePillars?: boolean }) =>
      must(await supabase.rpc("accept_blueprint", { p_blueprint_id: id, p_replace_pillars: replacePillars })),
    onSuccess: () => inv(keys.blueprints, keys.brand, keys.pillars, keys.versions, keys.home, keys.profile, keys.decisions),
  });
}

export function useUpdateBlueprint() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Blueprint, "status" | "content">> }) =>
      must(await supabase.from("blueprints").update({ ...patch, content: patch.content as never, decided_at: patch.status ? new Date().toISOString() : undefined }).eq("id", id).select().single()),
    onSuccess: () => inv(keys.blueprints, keys.home),
  });
}

/* ------------------------------- My Brand ------------------------------ */

export function useBrand() {
  const uid = useUid();
  return useQuery({ queryKey: keys.brand, enabled: !!uid, queryFn: async () => must(await supabase.from("brand_profiles").select("*").eq("user_id", uid).maybeSingle()) });
}

export function useSaveBrand() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ patch, summary }: { patch: BrandProfileUpdate & { posts_per_week?: number }; summary: string }) =>
      must(await supabase.rpc("save_brand_profile", { p_patch: patch as never, p_change_summary: summary })),
    onSuccess: () => inv(keys.brand, keys.versions),
  });
}

export function usePillars(includeInactive = false) {
  const uid = useUid();
  return useQuery({
    queryKey: [...keys.pillars, includeInactive],
    enabled: !!uid,
    queryFn: async () => {
      let q = supabase.from("content_pillars").select("*").eq("user_id", uid).order("position");
      if (!includeInactive) q = q.eq("is_active", true);
      return must(await q);
    },
  });
}

export function useSavePillar() {
  const uid = useUid();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (p: { id?: string; name: string; description?: string; example_topics?: string[]; position?: number; is_active?: boolean }) => {
      if (p.id) return must(await supabase.from("content_pillars").update(p).eq("id", p.id).select().single());
      return must(await supabase.from("content_pillars").insert({ ...p, user_id: uid, origin: "user" }).select().single());
    },
    onSuccess: () => inv(keys.pillars, keys.home),
  });
}

export function useBrandVersions() {
  const uid = useUid();
  return useQuery({ queryKey: keys.versions, enabled: !!uid, queryFn: async () => must(await supabase.from("brand_versions").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50)) });
}

export function useAlternatives() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: () => ai<AlternativePositioning>("alternative_positioning"), onSettled: () => inv(entitlementKey) });
}

/* ------------------------------ Proof Bank ----------------------------- */

export interface ProofFilter {
  search?: string;
  kind?: string | null;
  pillarId?: string | null;
  pinnedOnly?: boolean;
}

export function useProofEntries(filter: ProofFilter = {}) {
  const uid = useUid();
  return useQuery({
    queryKey: keys.proof(filter),
    enabled: !!uid,
    queryFn: async () => {
      let q = supabase.from("proof_entries").select("*").eq("user_id", uid).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(200);
      if (filter.kind) q = q.eq("kind", filter.kind as never);
      if (filter.pillarId) q = q.eq("pillar_id", filter.pillarId);
      if (filter.pinnedOnly) q = q.eq("pinned", true);
      const term = filter.search?.trim();
      if (term) {
        // Full-text search over title, body, transcript, insight and tags (Postgres tsvector + GIN index),
        // with a prefix match on the title for partial words.
        const safe = term.replace(/[,()%*"\\]/g, " ").replace(/\s+/g, " ").trim();
        if (safe) q = q.or(`search.wfts(english)."${safe}",title.ilike."%${safe}%"`);
      }
      return must(await q);
    },
  });
}

export function useProofEntry(id: string) {
  return useQuery({ queryKey: keys.proofOne(id), enabled: !!id, queryFn: async () => must(await supabase.from("proof_entries").select("*").eq("id", id).single()) });
}

export function useCreateProof() {
  const uid = useUid();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"proof_entries">, "user_id">): Promise<{ entry: ProofEntry | null; queued: boolean }> => {
      try {
        const entry = must(await supabase.from("proof_entries").insert({ tags: [], content_angles: [], ...input, user_id: uid }).select().single());
        return { entry, queued: false };
      } catch (err) {
        // Never lose a capture: queue it locally when offline and sync later.
        if ((err as AppError).code === "offline") {
          await enqueueCapture(uid, input);
          return { entry: null, queued: true };
        }
        throw err;
      }
    },
    onSuccess: () => inv(keys.proof(), keys.home, entitlementKey),
  });
}

export function useUpdateProof() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"proof_entries"> }) => must(await supabase.from("proof_entries").update(patch).eq("id", id).select().single()),
    onSuccess: (e) => inv(keys.proof(), keys.proofOne(e.id)),
  });
}

export function useDeleteProof() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (entry: Pick<ProofEntry, "id" | "audio_path">) => {
      if (entry.audio_path) await supabase.storage.from("voice-notes").remove([entry.audio_path]);
      must(await supabase.from("proof_entries").delete().eq("id", entry.id));
    },
    onSuccess: () => inv(keys.proof(), keys.home, entitlementKey),
  });
}

export function useClassifyProof() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (entryId: string) => ai<{ entry: ProofEntry }>("classify_proof", { entry_id: entryId }),
    onSettled: (_d, _e, id) => inv(keys.proof(), keys.proofOne(id)),
  });
}

export function useTranscribe() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (entryId: string) => invoke<{ available: boolean; message?: string; entry?: ProofEntry }>("transcribe", { entry_id: entryId }),
    onSettled: (_d, _e, id) => inv(keys.proof(), keys.proofOne(id)),
  });
}

/* ---------------------------- Content Studio --------------------------- */

export function useContentList(status?: string | null) {
  const uid = useUid();
  return useQuery({
    queryKey: keys.content({ status }),
    enabled: !!uid,
    queryFn: async () => {
      let q = supabase.from("content_projects").select("*").eq("user_id", uid).order("updated_at", { ascending: false }).limit(200);
      if (status) q = q.eq("status", status as never);
      else q = q.neq("status", "archived");
      return must(await q) as unknown as Content[];
    },
  });
}

export function useContent(id: string) {
  return useQuery({ queryKey: keys.contentOne(id), enabled: !!id, queryFn: async () => must(await supabase.from("content_projects").select("*").eq("id", id).single()) as unknown as Content });
}

export function useContentSources(contentId: string) {
  return useQuery({
    queryKey: ["content-sources", contentId],
    enabled: !!contentId,
    queryFn: async () => must(await supabase.from("content_sources").select("proof_entry_id, proof_entries(id,title,kind)").eq("content_id", contentId)),
  });
}

export function useGenerateContent() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (req: ContentGenerationRequest) => ai<{ content: Content }>("generate_content", req as unknown as Record<string, unknown>),
    onSuccess: () => inv(keys.content(), keys.home, entitlementKey, keys.proof()),
    onError: () => inv(entitlementKey),
  });
}

export function useCreateContent() {
  const uid = useUid();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"content_projects">, "user_id">) =>
      must(await supabase.from("content_projects").insert({ hashtags: [], alternative_hooks: [], series_ideas: [], ...input, user_id: uid }).select().single()) as unknown as Content,
    onSuccess: () => inv(keys.content(), keys.home),
  });
}

export function useUpdateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Omit<TablesUpdate<"content_projects">, "slides"> & { slides?: Slide[] } }) =>
      must(await supabase.from("content_projects").update({ ...patch, slides: patch.slides as never }).eq("id", id).select().single()) as unknown as Content,
    onSuccess: (c) => {
      qc.setQueryData(keys.contentOne(c.id), c);
      qc.invalidateQueries({ queryKey: ["content"] });
      qc.invalidateQueries({ queryKey: keys.home });
    },
  });
}

export function useDeleteContent() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => must(await supabase.from("content_projects").delete().eq("id", id)),
    onSuccess: () => inv(["content"], keys.home),
  });
}

export function useRecordExport() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (args: { contentId: string; slideCount: number; themeId: string; kind: "images" | "zip" }) => {
      const r = must(await supabase.rpc("record_export", { p_content_id: args.contentId, p_slide_count: args.slideCount, p_theme_id: args.themeId, p_kind: args.kind })) as unknown as {
        allowed: boolean;
        reason?: string;
        message?: string;
        remaining?: number;
      };
      if (!r.allowed) throw new AppError(r.message ?? "Export not available", r.reason === "PRO_THEME" ? "pro_required" : "limit_reached", true);
      return r;
    },
    onSettled: () => inv(entitlementKey),
  });
}

/* --------------------------- Growth Experiments ------------------------ */

export function useExperiments() {
  const uid = useUid();
  return useQuery({ queryKey: keys.experiments, enabled: !!uid, queryFn: async () => must(await supabase.from("experiments").select("*").eq("user_id", uid).order("created_at", { ascending: false })) });
}

export function useExperiment(id: string) {
  return useQuery({ queryKey: keys.experiment(id), enabled: !!id, queryFn: async () => must(await supabase.from("experiments").select("*").eq("id", id).single()) });
}

export function useSaveExperiment() {
  const uid = useUid();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (e: { id?: string } & Omit<TablesUpdate<"experiments">, "user_id">) => {
      const { id, ...rest } = e;
      if (id) return must(await supabase.from("experiments").update(rest).eq("id", id).select().single());
      return must(await supabase.from("experiments").insert({ ...(rest as TablesInsert<"experiments">), user_id: uid }).select().single());
    },
    onSuccess: (e) => inv(keys.experiments, keys.experiment(e.id), keys.home, entitlementKey),
  });
}

export function useDeleteExperiment() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async (id: string) => must(await supabase.from("experiments").delete().eq("id", id)), onSuccess: () => inv(keys.experiments, keys.home, entitlementKey) });
}

export function useAnalyzeExperiment() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: (id: string) => ai<{ experiment: Experiment }>("analyze_experiment", { experiment_id: id }), onSettled: (_d, _e, id) => inv(keys.experiment(id), keys.experiments, entitlementKey) });
}

export function useMetrics(filter: { contentId?: string; experimentId?: string; all?: boolean }) {
  const uid = useUid();
  return useQuery({
    queryKey: keys.metrics(filter),
    enabled: !!uid && (!!filter.contentId || !!filter.experimentId || !!filter.all),
    queryFn: async () => {
      let q = supabase.from("metric_snapshots").select("*").eq("user_id", uid).order("captured_on", { ascending: false }).limit(500);
      if (filter.contentId) q = q.eq("content_id", filter.contentId);
      if (filter.experimentId) q = q.eq("experiment_id", filter.experimentId);
      return must(await q);
    },
  });
}

export function useAddMetric() {
  const uid = useUid();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (m: Omit<TablesInsert<"metric_snapshots">, "user_id">) => must(await supabase.from("metric_snapshots").insert({ ...m, user_id: uid }).select().single()),
    onSuccess: () => inv(["metrics"], keys.home),
  });
}

export function useDeleteMetric() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async (id: string) => must(await supabase.from("metric_snapshots").delete().eq("id", id)), onSuccess: () => inv(["metrics"], keys.home) });
}

/* ---------------------------- Brand Evolution -------------------------- */

export function useWeeklyReviews() {
  const uid = useUid();
  return useQuery({ queryKey: keys.reviews, enabled: !!uid, queryFn: async () => must(await supabase.from("weekly_reviews").select("*").eq("user_id", uid).order("week_start", { ascending: false }).limit(52)) });
}

export function useGenerateWeeklyReview() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (weekStart?: string) => ai<{ review: WeeklyReview; recommendation: Recommendation | null }>("weekly_review", weekStart ? { week_start: weekStart } : {}),
    onSettled: () => inv(keys.reviews, keys.recommendations, keys.home, entitlementKey),
  });
}

export function useRecommendations() {
  const uid = useUid();
  return useQuery({ queryKey: keys.recommendations, enabled: !!uid, queryFn: async () => must(await supabase.from("recommendations").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50)) });
}

export function useDecideRecommendation() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (a: { id: string; status: "accepted" | "rejected" | "deferred"; note?: string }) => must(await supabase.rpc("decide_recommendation", { p_id: a.id, p_status: a.status, p_note: a.note })),
    onSuccess: () => inv(keys.recommendations, keys.decisions, keys.home),
  });
}

export function useDecisions() {
  const uid = useUid();
  return useQuery({ queryKey: keys.decisions, enabled: !!uid, queryFn: async () => must(await supabase.from("strategic_decisions").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100)) });
}

export function useAddDecision() {
  const uid = useUid();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (d: { decision: string; rationale?: string }) => must(await supabase.from("strategic_decisions").insert({ ...d, user_id: uid }).select().single()),
    onSuccess: () => inv(keys.decisions),
  });
}

/* ---------------------------- Monetisation Hub ------------------------- */

export function useOffers() {
  const uid = useUid();
  return useQuery({ queryKey: keys.offers, enabled: !!uid, queryFn: async () => must(await supabase.from("offers").select("*").eq("user_id", uid).order("created_at", { ascending: false })) });
}

export function useSaveOffer() {
  const uid = useUid();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (o: { id?: string } & Omit<TablesUpdate<"offers">, "user_id">) => {
      const { id, ...rest } = o;
      if (id) return must(await supabase.from("offers").update(rest).eq("id", id).select().single());
      return must(await supabase.from("offers").insert({ deliverables: [], evidence_entry_ids: [], ...(rest as TablesInsert<"offers">), user_id: uid }).select().single());
    },
    onSuccess: () => inv(keys.offers, entitlementKey),
  });
}

export function useDeleteOffer() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async (id: string) => must(await supabase.from("offers").delete().eq("id", id)), onSuccess: () => inv(keys.offers, entitlementKey) });
}

export function useOfferAssist() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: (a: { draft: Record<string, unknown>; evidence_entry_ids: string[] }) => ai<OfferAssist>("offer_assist", a),
    onSettled: () => inv(entitlementKey),
  });
}

export function usePortfolio() {
  const uid = useUid();
  return useQuery({ queryKey: keys.portfolio, enabled: !!uid, queryFn: async () => must(await supabase.from("portfolios").select("*").eq("user_id", uid).maybeSingle()) });
}

export function useSavePortfolio() {
  const uid = useUid();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (p: Omit<TablesInsert<"portfolios">, "user_id">) => must(await supabase.from("portfolios").upsert({ ...p, user_id: uid }).select().single()),
    onSuccess: () => inv(keys.portfolio, keys.home),
  });
}

export function usePortfolioItems() {
  const uid = useUid();
  return useQuery({ queryKey: keys.portfolioItems, enabled: !!uid, queryFn: async () => must(await supabase.from("portfolio_items").select("*").eq("user_id", uid).order("position")) });
}

export function useSavePortfolioItem() {
  const uid = useUid();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (i: { id?: string } & Omit<TablesUpdate<"portfolio_items">, "user_id">) => {
      const { id, ...rest } = i;
      if (id) return must(await supabase.from("portfolio_items").update(rest).eq("id", id).select().single());
      return must(await supabase.from("portfolio_items").insert({ ...(rest as TablesInsert<"portfolio_items">), user_id: uid }).select().single());
    },
    onSuccess: () => inv(keys.portfolioItems),
  });
}

export function useDeletePortfolioItem() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async (id: string) => must(await supabase.from("portfolio_items").delete().eq("id", id)), onSuccess: () => inv(keys.portfolioItems) });
}

export function useLeads() {
  const uid = useUid();
  return useQuery({ queryKey: keys.leads, enabled: !!uid, queryFn: async () => must(await supabase.from("leads").select("*").eq("user_id", uid).order("updated_at", { ascending: false })) });
}

export function useLead(id: string) {
  return useQuery({ queryKey: keys.lead(id), enabled: !!id, queryFn: async () => must(await supabase.from("leads").select("*").eq("id", id).single()) });
}

export function useSaveLead() {
  const uid = useUid();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (l: { id?: string } & Omit<TablesUpdate<"leads">, "user_id">) => {
      const { id, ...rest } = l;
      if (id) return must(await supabase.from("leads").update(rest).eq("id", id).select().single());
      return must(await supabase.from("leads").insert({ ...(rest as TablesInsert<"leads">), user_id: uid }).select().single());
    },
    onSuccess: (l) => inv(keys.leads, keys.lead(l.id)),
  });
}

export function useDeleteLead() {
  const inv = useInvalidate();
  return useMutation({ mutationFn: async (id: string) => must(await supabase.from("leads").delete().eq("id", id)), onSuccess: () => inv(keys.leads) });
}

export function useLeadActivities(leadId: string) {
  return useQuery({ queryKey: keys.leadActivities(leadId), enabled: !!leadId, queryFn: async () => must(await supabase.from("lead_activities").select("*").eq("lead_id", leadId).order("occurred_at", { ascending: false })) });
}

export function useAddLeadActivity() {
  const uid = useUid();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (a: Omit<TablesInsert<"lead_activities">, "user_id">) => must(await supabase.from("lead_activities").insert({ ...a, user_id: uid }).select().single()),
    onSuccess: (a) => inv(keys.leadActivities(a.lead_id), keys.leads),
  });
}
