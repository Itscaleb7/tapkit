import { mockBlueprint, } from "../../packages/core/src/aiMocks.ts";
import { NUMERIC_LIMIT_KEYS, PLAN_LIMITS, blankSlide } from "@tapkit/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, createUser, deleteUser, makePro, type TestUser } from "./src/env.ts";

let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  alice = await createUser("alice");
  bob = await createUser("bob");
});
afterAll(async () => {
  await deleteUser(alice);
  await deleteUser(bob);
});

async function insertBlueprint(userId: string, version = 1) {
  const { data, error } = await admin()
    .from("blueprints")
    .insert({ user_id: userId, version, content: mockBlueprint({ interests: ["running"], goal: "career" }), prompt_version: "test", model: "mock" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

describe("plan limits parity", () => {
  it("SQL plan_limits matches packages/core PLAN_LIMITS", async () => {
    const { data, error } = await anon().from("plan_limits").select("*");
    expect(error).toBeNull();
    for (const plan of ["free", "pro"] as const) {
      for (const key of NUMERIC_LIMIT_KEYS) {
        expect(data!.find((r) => r.plan === plan && r.key === key)?.value, `${plan}.${key}`).toBe(PLAN_LIMITS[plan][key]);
      }
    }
  });
});

describe("authentication + profile bootstrap", () => {
  it("creates a profile and onboarding row on sign-up", async () => {
    const { data: profile } = await alice.client.from("profiles").select("*").single();
    expect(profile?.display_name).toBe("alice");
    const { data: onboarding } = await alice.client.from("onboarding_responses").select("*").single();
    expect(onboarding?.current_step).toBe(0);
  });
  it("persists onboarding progress so it can be resumed", async () => {
    const answers = { primaryGoal: "career", interests: ["running"], stage: "starting" };
    const { error } = await alice.client.from("onboarding_responses").update({ answers, current_step: 3 }).eq("user_id", alice.id);
    expect(error).toBeNull();
    const { data } = await alice.client.from("onboarding_responses").select("answers,current_step").single();
    expect(data).toEqual({ answers, current_step: 3 });
  });
  it("signs in again with the same credentials and sees the same data", async () => {
    const c = anon();
    const { error } = await c.auth.signInWithPassword({ email: alice.email, password: alice.password });
    expect(error).toBeNull();
    const { data } = await c.from("onboarding_responses").select("current_step").single();
    expect(data?.current_step).toBe(3);
    await c.auth.signOut();
    const after = await c.from("onboarding_responses").select("*");
    expect(after.data ?? []).toHaveLength(0);
  });
  it("rejects a wrong password", async () => {
    const { error } = await anon().auth.signInWithPassword({ email: alice.email, password: "wrong-password-1" });
    expect(error).not.toBeNull();
  });
});

describe("row level security", () => {
  it("isolates private data between users", async () => {
    const { data: entry, error } = await alice.client.from("proof_entries").insert({ user_id: alice.id, kind: "lesson", body: "Alice's private lesson" }).select().single();
    expect(error).toBeNull();
    const { data: seen } = await bob.client.from("proof_entries").select("*").eq("id", entry!.id);
    expect(seen).toEqual([]);
    const upd = await bob.client.from("proof_entries").update({ body: "hacked" }).eq("id", entry!.id).select();
    expect(upd.data).toEqual([]);
    const del = await bob.client.from("proof_entries").delete().eq("id", entry!.id).select();
    expect(del.data).toEqual([]);
    const { data: still } = await alice.client.from("proof_entries").select("body").eq("id", entry!.id).single();
    expect(still?.body).toBe("Alice's private lesson");
  });
  it("prevents inserting rows for another user", async () => {
    const { error } = await bob.client.from("proof_entries").insert({ user_id: alice.id, kind: "note", body: "spoof" });
    expect(error).not.toBeNull();
  });
  it("prevents linking to another user's pillar or experiment", async () => {
    const { data: pillar } = await alice.client.from("content_pillars").insert({ user_id: alice.id, name: "Alice pillar" }).select().single();
    const { error } = await bob.client.from("proof_entries").insert({ user_id: bob.id, kind: "note", body: "x", pillar_id: pillar!.id });
    expect(error).not.toBeNull();
    const { data: exp } = await alice.client
      .from("experiments")
      .insert({ user_id: alice.id, title: "E", hypothesis: "H", start_date: "2026-10-01", end_date: "2026-10-14", success_metrics: ["saves"] })
      .select()
      .single();
    const { error: e2 } = await bob.client.from("content_projects").insert({ user_id: bob.id, title: "x", experiment_id: exp!.id });
    expect(e2).not.toBeNull();
    await alice.client.from("experiments").delete().eq("id", exp!.id);
  });
  it("anonymous users cannot read any private table", async () => {
    const a = anon();
    for (const table of ["profiles", "proof_entries", "content_projects", "brand_profiles", "blueprints", "leads", "offers", "subscriptions", "ai_usage", "metric_snapshots", "weekly_reviews"]) {
      const { data } = await a.from(table).select("*").limit(1);
      expect(data ?? [], table).toEqual([]);
    }
  });
  it("users cannot grant themselves Pro or forge usage", async () => {
    const sub = await alice.client.from("subscriptions").insert({ user_id: alice.id, is_active: true, expires_at: "2099-01-01" });
    expect(sub.error).not.toBeNull();
    const usage = await alice.client.from("ai_usage").insert({ user_id: alice.id, task: "x", status: "ok" });
    expect(usage.error).not.toBeNull();
    const bp = await alice.client.from("blueprints").insert({ user_id: alice.id, version: 99, content: {} });
    expect(bp.error).not.toBeNull();
    const { data } = await alice.client.rpc("get_entitlement");
    expect(data.plan).toBe("free");
  });
  it("internal helper functions are not callable by clients", async () => {
    const { error } = await alice.client.rpc("is_pro", { uid: alice.id });
    expect(error).not.toBeNull();
  });
});

describe("brand blueprint acceptance", () => {
  it("accepts a blueprint into My Brand with pillars and version history", async () => {
    const bp = await insertBlueprint(alice.id);
    const { error } = await alice.client.rpc("accept_blueprint", { p_blueprint_id: bp.id, p_replace_pillars: true });
    expect(error).toBeNull();
    const { data: brand } = await alice.client.from("brand_profiles").select("*").single();
    expect(brand?.positioning).toContain("running");
    expect(brand?.current_blueprint_id).toBe(bp.id);
    const { data: pillars } = await alice.client.from("content_pillars").select("name").eq("is_active", true);
    expect(pillars?.length).toBe(3);
    const { data: versions } = await alice.client.from("brand_versions").select("*");
    expect(versions?.length).toBeGreaterThanOrEqual(1);
    const { data: profile } = await alice.client.from("profiles").select("onboarding_completed_at").single();
    expect(profile?.onboarding_completed_at).not.toBeNull();
    const { data: decisions } = await alice.client.from("strategic_decisions").select("decision");
    expect(decisions?.some((d) => d.decision.includes("Accepted Brand Blueprint"))).toBe(true);
  });
  it("bob cannot accept alice's blueprint", async () => {
    const bp = await insertBlueprint(alice.id, 2);
    const { error } = await bob.client.rpc("accept_blueprint", { p_blueprint_id: bp.id });
    expect(error).not.toBeNull();
  });
  it("saves brand edits with a history entry and rejects unknown fields", async () => {
    const before = (await alice.client.from("brand_versions").select("id")).data!.length;
    const { error } = await alice.client.rpc("save_brand_profile", { p_patch: { positioning: "New positioning", values: ["Craft", "Honesty"] }, p_change_summary: "Updated positioning" });
    expect(error).toBeNull();
    const { data: brand } = await alice.client.from("brand_profiles").select("positioning,values").single();
    expect(brand).toEqual({ positioning: "New positioning", values: ["Craft", "Honesty"] });
    expect((await alice.client.from("brand_versions").select("id")).data!.length).toBe(before + 1);
    const bad = await alice.client.rpc("save_brand_profile", { p_patch: { user_id: bob.id }, p_change_summary: "x" });
    expect(bad.error).not.toBeNull();
  });
});

describe("proof bank search", () => {
  it("finds entries by full-text search and tags", async () => {
    const ins = await alice.client.from("proof_entries").insert([
      { user_id: alice.id, kind: "story", title: "First marathon", body: "I finished my first marathon after failing twice", tags: ["running"] },
      { user_id: alice.id, kind: "opinion", title: "Hot take", body: "Most productivity advice is procrastination in disguise", tags: [] },
    ]);
    expect(ins.error).toBeNull();
    const { data } = await alice.client.from("proof_entries").select("title").textSearch("search", "marathon", { type: "websearch", config: "english" });
    expect(data?.map((d) => d.title)).toContain("First marathon");
    const { data: tagged } = await alice.client.from("proof_entries").select("title").contains("tags", ["running"]);
    expect(tagged?.map((d) => d.title)).toEqual(["First marathon"]);
  });
});

describe("content persistence + publication rules", () => {
  it("stores slides and refuses 'published' without confirmation", async () => {
    const slides = [blankSlide("hook", { heading: "Hi" }), blankSlide("cta", { heading: "Bye" })];
    const { data: c, error } = await alice.client.from("content_projects").insert({ user_id: alice.id, title: "Post", slides, status: "draft" }).select().single();
    expect(error).toBeNull();
    expect(c!.slides).toEqual(slides);
    const bad = await alice.client.from("content_projects").update({ status: "published" }).eq("id", c!.id);
    expect(bad.error?.message).toContain("published_requires_confirmation");
    const ok = await alice.client.from("content_projects").update({ status: "published", published_confirmed: true, published_at: new Date().toISOString() }).eq("id", c!.id);
    expect(ok.error).toBeNull();
  });
  it("rejects non-http published URLs", async () => {
    const { error } = await alice.client.from("content_projects").insert({ user_id: alice.id, title: "x", published_url: "javascript:alert(1)" });
    expect(error).not.toBeNull();
  });
});

describe("free-tier limits", () => {
  it("enforces the export limit server-side and blocks premium themes on Free", async () => {
    const { data: c } = await bob.client.from("content_projects").insert({ user_id: bob.id, title: "Export me", slides: [blankSlide("hook")] }).select().single();
    const premium = await bob.client.rpc("record_export", { p_content_id: c!.id, p_slide_count: 1, p_theme_id: "editorial", p_kind: "zip" });
    expect(premium.data).toMatchObject({ allowed: false, reason: "PRO_THEME" });
    for (let i = 0; i < PLAN_LIMITS.free.exportsPerMonth; i++) {
      const r = await bob.client.rpc("record_export", { p_content_id: c!.id, p_slide_count: 1, p_theme_id: "tapkit", p_kind: "images" });
      expect(r.data.allowed, `export ${i}`).toBe(true);
    }
    const blocked = await bob.client.rpc("record_export", { p_content_id: c!.id, p_slide_count: 1, p_theme_id: "tapkit", p_kind: "images" });
    expect(blocked.data).toMatchObject({ allowed: false, reason: "LIMIT_REACHED" });
    // Alice cannot record exports against Bob's content.
    const foreign = await alice.client.rpc("record_export", { p_content_id: c!.id, p_slide_count: 1, p_theme_id: "tapkit", p_kind: "images" });
    expect(foreign.error).not.toBeNull();
  });
  it("Pro (verified server-side) lifts the limits; expiry removes them", async () => {
    await makePro(bob.id);
    const { data: ent } = await bob.client.rpc("get_entitlement");
    expect(ent.plan).toBe("pro");
    const { data: c } = await bob.client.from("content_projects").select("id").limit(1).single();
    const r = await bob.client.rpc("record_export", { p_content_id: c!.id, p_slide_count: 1, p_theme_id: "editorial", p_kind: "zip" });
    expect(r.data.allowed).toBe(true);
    await makePro(bob.id, -1000); // expired
    const { data: ent2 } = await bob.client.rpc("get_entitlement");
    expect(ent2.plan).toBe("free");
  });
  it("enforces active experiment limits", async () => {
    const u = await createUser("explimit");
    try {
      const mk = () => u.client.from("experiments").insert({ user_id: u.id, title: "E", hypothesis: "H", start_date: "2026-10-01", end_date: "2026-10-14", success_metrics: ["saves"] });
      expect((await mk()).error).toBeNull();
      const second = await mk();
      expect(second.error?.message).toContain("LIMIT_REACHED");
    } finally {
      await deleteUser(u);
    }
  });
  it("enforces the free offer limit", async () => {
    const u = await createUser("offerlimit");
    try {
      const mk = () => u.client.from("offers").insert({ user_id: u.id, title: "Offer" });
      expect((await mk()).error).toBeNull();
      expect((await mk()).error?.message).toContain("LIMIT_REACHED");
    } finally {
      await deleteUser(u);
    }
  });
});

describe("public portfolio privacy", () => {
  it("only exposes intentionally published information", async () => {
    const slug = `alice-${Date.now().toString(36)}`;
    const { data: published } = await alice.client
      .from("content_projects")
      .insert({ user_id: alice.id, title: "Public post", status: "published", published_confirmed: true, published_at: new Date().toISOString(), caption: "Public caption" })
      .select()
      .single();
    const { data: draft } = await alice.client.from("content_projects").insert({ user_id: alice.id, title: "Secret draft", caption: "SECRET DRAFT CAPTION" }).select().single();
    await alice.client.from("offers").delete().eq("user_id", alice.id);
    await alice.client.from("offers").insert({ user_id: alice.id, title: "Public offer", status: "active", is_public: true });
    const pf = await alice.client.from("portfolios").insert({ user_id: alice.id, slug, display_name: "Alice", bio: "Hi", is_published: false, enquiries_enabled: true });
    expect(pf.error).toBeNull();
    await alice.client.from("portfolio_items").insert([
      { user_id: alice.id, kind: "content", content_id: published!.id, title: "Public post", position: 0 },
      { user_id: alice.id, kind: "content", content_id: draft!.id, title: "Secret draft", position: 1 },
    ]);

    const a = anon();
    expect((await a.rpc("get_public_portfolio", { p_slug: slug })).data).toBeNull(); // unpublished → invisible

    await alice.client.from("portfolios").update({ is_published: true }).eq("user_id", alice.id);
    const { data } = await a.rpc("get_public_portfolio", { p_slug: slug });
    expect(data.display_name).toBe("Alice");
    const json = JSON.stringify(data);
    expect(json).toContain("Public caption");
    expect(json).toContain("Public offer");
    expect(json).not.toContain("SECRET DRAFT CAPTION");
    expect(json).not.toContain("Alice's private lesson");
    expect(json).not.toContain(alice.email);
    expect(json).not.toContain(alice.id);
    expect(data.items).toHaveLength(1);

    // Anonymous visitors still cannot read the tables directly.
    expect((await a.from("portfolios").select("*")).data ?? []).toEqual([]);
  });
  it("accepts rate-limited enquiries and turns them into leads", async () => {
    const { data: pf } = await alice.client.from("portfolios").select("slug").single();
    const a = anon();
    const ok = await a.rpc("submit_portfolio_enquiry", { p_slug: pf!.slug, p_name: "Sam", p_email: "sam@example.com", p_message: "Can we work together?" });
    expect(ok.data).toEqual({ ok: true });
    const bad = await a.rpc("submit_portfolio_enquiry", { p_slug: pf!.slug, p_name: "Sam", p_email: "not-an-email", p_message: "x" });
    expect(bad.data.ok).toBe(false);
    const { data: leads } = await alice.client.from("leads").select("*").eq("source", "portfolio_enquiry");
    expect(leads?.[0]?.enquiry_message).toBe("Can we work together?");
    expect((await bob.client.from("leads").select("*").eq("source", "portfolio_enquiry")).data).toEqual([]);
  });
  it("blocks custom portfolio colours on Free", async () => {
    const { error } = await alice.client.from("portfolios").update({ accent_color: "#123456" }).eq("user_id", alice.id);
    expect(error?.message).toContain("PRO_REQUIRED");
  });
});

describe("storage", () => {
  it("keeps voice notes private to their owner", async () => {
    const path = `${alice.id}/test.m4a`;
    const up = await alice.client.storage.from("voice-notes").upload(path, new Blob([new Uint8Array([1, 2, 3])], { type: "audio/m4a" }), { contentType: "audio/m4a" });
    expect(up.error).toBeNull();
    const bobRead = await bob.client.storage.from("voice-notes").download(path);
    expect(bobRead.error).not.toBeNull();
    const bobUpload = await bob.client.storage.from("voice-notes").upload(`${alice.id}/evil.m4a`, new Blob([new Uint8Array([1])]), { contentType: "audio/m4a" });
    expect(bobUpload.error).not.toBeNull();
    const own = await alice.client.storage.from("voice-notes").download(path);
    expect(own.error).toBeNull();
  });
  it("rejects disallowed file types", async () => {
    const up = await alice.client.storage.from("portfolio-media").upload(`${alice.id}/x.html`, new Blob(["<script>"], { type: "text/html" }), { contentType: "text/html" });
    expect(up.error).not.toBeNull();
  });
});

describe("home state", () => {
  it("returns counts used for next-action selection", async () => {
    const { data, error } = await alice.client.rpc("get_home_state");
    expect(error).toBeNull();
    expect(data.hasAcceptedBlueprint).toBe(true);
    expect(data.proofEntryCount).toBeGreaterThan(0);
  });
});
