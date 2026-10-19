// Returns a JSON export of everything TapKit stores about the signed-in user.
import { json, serve } from "../_shared/http.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

const TABLES = [
  ["onboarding_responses", "user_id"], ["brand_profiles", "user_id"], ["blueprints", "user_id"], ["content_pillars", "user_id"],
  ["brand_versions", "user_id"], ["proof_entries", "user_id"], ["content_projects", "user_id"], ["content_sources", "user_id"],
  ["experiments", "user_id"], ["metric_snapshots", "user_id"], ["weekly_reviews", "user_id"], ["recommendations", "user_id"],
  ["strategic_decisions", "user_id"], ["offers", "user_id"], ["portfolios", "user_id"], ["portfolio_items", "user_id"],
  ["leads", "user_id"], ["lead_activities", "user_id"], ["subscriptions", "user_id"], ["ai_usage", "user_id"], ["export_usage", "user_id"],
] as const;

serve(async (req) => {
  const db = adminClient();
  const user = await requireUser(req, db);
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), account: { id: user.id, email: user.email } };
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  out.profile = profile;
  for (const [table, col] of TABLES) {
    const { data, error } = await db.from(table).select("*").eq(col, user.id).limit(10_000);
    out[table] = error ? { error: "unavailable" } : data;
  }
  return json(req, out);
});
