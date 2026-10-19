// End-to-end backend journey through the real Edge Functions (served locally with
// AI_PROVIDER=mock and a mock RevenueCat REST server). Requires:
//   supabase start && supabase functions serve --env-file tests/integration/functions.env
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, createUser, deleteUser, SUPABASE_URL, type TestUser, ANON_KEY } from "./src/env.ts";

const DENO_PORTS: Record<string, number> = { ai: 54401, "subscription-sync": 54402, "revenuecat-webhook": 54403, "account-delete": 54404, "account-export": 54405, transcribe: 54406 };
/** FUNCTIONS_MODE=deno → functions served by scripts/serve-functions-deno.sh; otherwise via the Supabase gateway. */
const fnUrl = (name: string) => (process.env.FUNCTIONS_MODE === "deno" ? `http://127.0.0.1:${DENO_PORTS[name]}` : `${SUPABASE_URL}/functions/v1/${name}`);
let user: TestUser;
let rcServer: Server;
/** What the mock RevenueCat API returns for each app_user_id. */
const rcState = new Map<string, unknown>();

async function call(fn: string, body: unknown, token = user.accessToken) {
  const res = await fetch(fnUrl(fn), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const activeSubscriber = (expires: string, opts: { unsubscribed?: boolean; billing?: boolean } = {}) => ({
  subscriber: {
    entitlements: { pro: { expires_date: expires, product_identifier: "tapkit_pro_monthly", purchase_date: new Date().toISOString() } },
    subscriptions: {
      tapkit_pro_monthly: {
        expires_date: expires,
        is_sandbox: true,
        period_type: "normal",
        store: "app_store",
        unsubscribe_detected_at: opts.unsubscribed ? new Date().toISOString() : null,
        billing_issues_detected_at: opts.billing ? new Date().toISOString() : null,
      },
    },
  },
});

beforeAll(async () => {
  rcServer = createServer((req, res) => {
    if (req.headers.authorization !== "Bearer test_rc_secret") {
      res.writeHead(401).end();
      return;
    }
    const id = decodeURIComponent((req.url ?? "").split("/").pop() ?? "");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rcState.get(id) ?? { subscriber: { entitlements: {}, subscriptions: {} } }));
  });
  await new Promise<void>((r) => rcServer.listen(54399, "0.0.0.0", r));
  user = await createUser("journey");
  // Wait for the functions server to be ready.
  for (let i = 0; i < 60; i++) {
    const r = await fetch(fnUrl("ai"), { method: "OPTIONS" }).catch(() => null);
    if (r && r.status < 500) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
});

afterAll(async () => {
  await deleteUser(user).catch(() => undefined);
  await new Promise((r) => rcServer.close(r));
});

describe("auth on edge functions", () => {
  it("rejects missing or forged tokens", async () => {
    const res = await fetch(fnUrl("ai"), { method: "POST", headers: { apikey: ANON_KEY, "Content-Type": "application/json" }, body: "{}" });
    expect(res.status).toBe(401);
    const forged = await call("ai", { task: "blueprint" }, ANON_KEY);
    expect(forged.status).toBe(401);
  });
  it("rejects unknown tasks", async () => {
    expect((await call("ai", { task: "hack" })).status).toBe(400);
  });
});

describe("full TapKit journey (backend)", () => {
  let blueprintId: string;
  let entryId: string;
  let contentId: string;
  let experimentId: string;

  it("refuses to generate a blueprint before onboarding has enough signal", async () => {
    const r = await call("ai", { task: "blueprint" });
    expect(r.status).toBe(400);
    expect(r.data.error.code).toBe("onboarding_incomplete");
  });

  it("completes onboarding and generates + persists a Brand Blueprint", async () => {
    await user.client
      .from("onboarding_responses")
      .update({ answers: { primaryGoal: "attract_clients", interests: ["strength training"], skills: ["coaching"], stage: "starting", startingFromZero: true }, current_step: 12 })
      .eq("user_id", user.id);
    const r = await call("ai", { task: "blueprint" });
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    expect(r.data.blueprint.content.positioning_statement).toContain("strength training");
    expect(r.data.blueprint.status).toBe("generated");
    blueprintId = r.data.blueprint.id;
    const { data } = await user.client.from("blueprints").select("id,version").eq("id", blueprintId).single();
    expect(data?.version).toBe(1);
    const { error } = await user.client.rpc("accept_blueprint", { p_blueprint_id: blueprintId });
    expect(error).toBeNull();
  });

  it("captures a Proof Bank entry and classifies it without overwriting user fields", async () => {
    const { data: entry } = await user.client
      .from("proof_entries")
      .insert({ user_id: user.id, kind: "lesson", title: "My own title", body: "I coached my first client and learned to simplify programmes." })
      .select()
      .single();
    entryId = entry!.id;
    const r = await call("ai", { task: "classify_proof", entry_id: entryId });
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    expect(r.data.entry.title).toBe("My own title"); // user's title preserved
    expect(r.data.entry.classification_status).toBe("done");
    expect(r.data.entry.key_insight).toContain("[MOCK]");
    expect(r.data.entry.pillar_id).not.toBeNull();
  });

  it("cannot classify another user's entry", async () => {
    const other = await createUser("other");
    try {
      const r = await call("ai", { task: "classify_proof", entry_id: entryId }, other.accessToken);
      expect(r.status).toBe(404);
    } finally {
      await deleteUser(other);
    }
  });

  it("generates a carousel from the entry, grounded in it, and saves a draft", async () => {
    const r = await call("ai", { task: "generate_content", format: "carousel", source: "proof", proof_entry_ids: [entryId], slide_count: 6 });
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    const c = r.data.content;
    contentId = c.id;
    expect(c.status).toBe("draft");
    expect(c.slides).toHaveLength(6);
    expect(c.slides[0].layout).toBe("hook");
    expect(c.slides.at(-1).layout).toBe("cta");
    expect(c.grounding_notes).toContain("My own title");
    const { data: sources } = await user.client.from("content_sources").select("proof_entry_id").eq("content_id", contentId);
    expect(sources).toEqual([{ proof_entry_id: entryId }]);
    const { data: e } = await user.client.from("proof_entries").select("used_count").eq("id", entryId).single();
    expect(e?.used_count).toBe(1);
  });

  it("rejects content generation from someone else's entries", async () => {
    const other = await createUser("other2");
    try {
      const r = await call("ai", { task: "generate_content", format: "carousel", source: "proof", proof_entry_ids: [entryId] }, other.accessToken);
      expect(r.status).toBe(404);
    } finally {
      await deleteUser(other);
    }
  });

  it("creates an experiment, records results and analyses them", async () => {
    const { data: exp, error } = await user.client
      .from("experiments")
      .insert({ user_id: user.id, title: "Lessons vs tips", hypothesis: "Personal lessons get more saves", planned_posts: 3, success_metrics: ["saves"], start_date: "2026-10-01", end_date: "2026-10-20", platform: "instagram", status: "running" })
      .select()
      .single();
    expect(error).toBeNull();
    experimentId = exp!.id;
    const noData = await call("ai", { task: "analyze_experiment", experiment_id: experimentId });
    expect(noData.status).toBe(400);
    await user.client.from("content_projects").update({ experiment_id: experimentId, status: "published", published_confirmed: true, published_at: new Date().toISOString() }).eq("id", contentId);
    const m = await user.client.from("metric_snapshots").insert({ user_id: user.id, content_id: contentId, experiment_id: experimentId, platform: "instagram", captured_on: new Date().toISOString().slice(0, 10), reach: 400, likes: 30, saves: 12 });
    expect(m.error).toBeNull();
    const r = await call("ai", { task: "analyze_experiment", experiment_id: experimentId });
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    expect(r.data.stats.postsWithData).toBe(1);
    expect(r.data.stats.evidence).toBe("anecdotal");
    expect(r.data.experiment.analysis.uncertainties.length).toBeGreaterThan(0);
  });

  it("generates a weekly review from real recorded data", async () => {
    const r = await call("ai", { task: "weekly_review", week_start: new Date(Date.now() - ((new Date().getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10) });
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    expect(r.data.review.facts.content_created).toBeGreaterThanOrEqual(1);
    expect(r.data.review.facts.results_recorded).toBe(1);
    expect(r.data.review.review.summary).toBeTruthy();
  });

  it("enforces the free weekly review limit", async () => {
    const r = await call("ai", { task: "weekly_review", week_start: "2026-01-05" });
    expect(r.status).toBe(402);
    expect(r.data.error.code).toBe("limit_reached");
  });

  it("gates Pro-only AI features on Free", async () => {
    const r = await call("ai", { task: "offer_assist", draft: { title: "Coaching" } });
    expect(r.status).toBe(402);
    expect(r.data.error.code).toBe("pro_required");
  });

  it("logs metered AI usage", async () => {
    const { data } = await user.client.rpc("get_entitlement");
    expect(data.usage.aiGenerationsThisMonth).toBeGreaterThanOrEqual(4);
  });
});

describe("subscriptions", () => {
  it("syncs a sandbox purchase from RevenueCat and unlocks Pro", async () => {
    rcState.set(user.id, activeSubscriber(new Date(Date.now() + 30 * 86_400_000).toISOString()));
    const r = await call("subscription-sync", {});
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    expect(r.data.plan).toBe("pro");
    const { data } = await user.client.rpc("get_entitlement");
    expect(data.plan).toBe("pro");
    expect(data.subscription.environment).toBe("SANDBOX");
    const offer = await call("ai", { task: "offer_assist", draft: { title: "Coaching" } });
    expect(offer.status, JSON.stringify(offer.data)).toBe(200);
  });

  it("keeps access after cancellation until expiry, and flags billing issues", async () => {
    rcState.set(user.id, activeSubscriber(new Date(Date.now() + 5 * 86_400_000).toISOString(), { unsubscribed: true, billing: true }));
    await call("subscription-sync", {});
    const { data } = await user.client.rpc("get_entitlement");
    expect(data.plan).toBe("pro");
    expect(data.subscription.will_renew).toBe(false);
    expect(data.subscription.billing_issue).toBe(true);
  });

  it("webhook rejects bad secrets and dedupes events", async () => {
    const bad = await fetch(fnUrl("revenuecat-webhook"), { method: "POST", headers: { Authorization: "Bearer nope", "Content-Type": "application/json" }, body: "{}" });
    expect(bad.status).toBe(401);
    rcState.set(user.id, activeSubscriber(new Date(Date.now() - 1000).toISOString()));
    const event = { event: { id: `evt-${Date.now()}`, type: "EXPIRATION", app_user_id: user.id } };
    const send = () => fetch(fnUrl("revenuecat-webhook"), { method: "POST", headers: { Authorization: "Bearer test_webhook_secret", "Content-Type": "application/json" }, body: JSON.stringify(event) }).then((r) => r.json());
    const first = await send();
    expect(first).toMatchObject({ ok: true, active: false });
    const second = await send();
    expect(second).toMatchObject({ ok: true, duplicate: true });
    const { data } = await user.client.rpc("get_entitlement");
    expect(data.plan).toBe("free");
  });

  it("restores a purchase (re-sync) after expiry handling", async () => {
    rcState.set(user.id, activeSubscriber(new Date(Date.now() + 365 * 86_400_000).toISOString()));
    const r = await call("subscription-sync", {});
    expect(r.data.plan).toBe("pro");
  });
});

describe("account management", () => {
  it("exports the user's data", async () => {
    const r = await call("account-export", {});
    expect(r.status).toBe(200);
    expect(r.data.proof_entries.length).toBeGreaterThan(0);
    expect(r.data.account.id).toBe(user.id);
  });

  it("requires explicit confirmation, then deletes the account and all data", async () => {
    expect((await call("account-delete", {})).status).toBe(400);
    await user.client.storage.from("voice-notes").upload(`${user.id}/n.m4a`, new Blob([new Uint8Array([1])], { type: "audio/m4a" }), { contentType: "audio/m4a" });
    const r = await call("account-delete", { confirm: "DELETE" });
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    const db = admin();
    for (const t of ["proof_entries", "content_projects", "blueprints", "subscriptions", "experiments", "metric_snapshots"]) {
      const { count } = await db.from(t).select("*", { count: "exact", head: true }).eq("user_id", user.id);
      expect(count, t).toBe(0);
    }
    const { data: files } = await db.storage.from("voice-notes").list(user.id);
    expect(files ?? []).toHaveLength(0);
    const signIn = await anon().auth.signInWithPassword({ email: user.email, password: user.password });
    expect(signIn.error).not.toBeNull();
  });
});
