import { describe, expect, it } from "vitest";
import {
  brandBlueprintSchema, experimentInputSchema, metricSnapshotInputSchema, onboardingReadiness, passwordSchema,
  portfolioSettingsSchema, proofEntryInputSchema, signUpSchema, slugSchema, enquirySchema, fieldErrors, contentUpdateSchema,
} from "../src/schemas.ts";
import { mockBlueprint } from "../src/aiMocks.ts";

describe("auth validation", () => {
  it("validates email and password strength", () => {
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "abcdefg1", displayName: "A" }).success).toBe(true);
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("allletters").success).toBe(false);
    const r = signUpSchema.safeParse({ email: "nope", password: "abcdefg1", displayName: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(fieldErrors(r.error))).toEqual(expect.arrayContaining(["email", "displayName"]));
  });
});

describe("onboarding", () => {
  it("supports users starting from zero but needs a minimum of signal", () => {
    expect(onboardingReadiness({}).ready).toBe(false);
    expect(onboardingReadiness({ primaryGoal: "career", stage: "starting", interests: ["running"] }).ready).toBe(true);
    expect(onboardingReadiness({ primaryGoal: "career", stage: "starting", experience: "Two years in retail" }).ready).toBe(true);
  });
});

describe("proof bank input", () => {
  it("requires some content", () => {
    expect(proofEntryInputSchema.safeParse({ kind: "note" }).success).toBe(false);
    expect(proofEntryInputSchema.safeParse({ kind: "note", body: "Learned X" }).success).toBe(true);
  });
  it("requires a URL for links and rejects non-http schemes", () => {
    expect(proofEntryInputSchema.safeParse({ kind: "link", title: "x" }).success).toBe(false);
    expect(proofEntryInputSchema.safeParse({ kind: "link", link_url: "javascript:alert(1)" }).success).toBe(false);
    expect(proofEntryInputSchema.safeParse({ kind: "link", link_url: "https://example.com/a" }).success).toBe(true);
  });
});

describe("experiments + metrics", () => {
  const base = { title: "T", hypothesis: "H", planned_posts: 4, success_metrics: ["saves"], start_date: "2026-01-01", end_date: "2026-01-14" };
  it("rejects end before start", () => {
    expect(experimentInputSchema.safeParse({ ...base, end_date: "2025-12-01" }).success).toBe(false);
    expect(experimentInputSchema.safeParse(base).success).toBe(true);
  });
  it("needs at least one metric and rejects negatives except follower change", () => {
    const m = { platform: "instagram", captured_on: "2026-01-02" };
    expect(metricSnapshotInputSchema.safeParse(m).success).toBe(false);
    expect(metricSnapshotInputSchema.safeParse({ ...m, likes: -1 }).success).toBe(false);
    expect(metricSnapshotInputSchema.safeParse({ ...m, follower_change: -3 }).success).toBe(true);
    expect(metricSnapshotInputSchema.safeParse({ ...m, saves: 0 }).success).toBe(true);
  });
});

describe("portfolio", () => {
  it("validates slugs", () => {
    expect(slugSchema.safeParse("alex-builds").success).toBe(true);
    expect(slugSchema.safeParse("Alex Builds").success).toBe(false);
    expect(slugSchema.safeParse("admin").success).toBe(false);
    expect(slugSchema.safeParse("-bad").success).toBe(false);
    expect(slugSchema.parse("  ALEX  ")).toBe("alex");
  });
  it("normalises empty contact fields to null", () => {
    const r = portfolioSettingsSchema.parse({ slug: "alex", display_name: "Alex", contact_email: "", contact_url: "" });
    expect(r.contact_email).toBeNull();
    expect(r.contact_url).toBeNull();
  });
  it("enquiry honeypot must be empty", () => {
    const e = { slug: "alex", name: "Sam", email: "sam@example.com", message: "Hi" };
    expect(enquirySchema.safeParse(e).success).toBe(true);
    expect(enquirySchema.safeParse({ ...e, website: "spam" }).success).toBe(false);
  });
});

describe("AI output validation", () => {
  it("accepts a well-formed blueprint and rejects malformed ones", () => {
    expect(brandBlueprintSchema.safeParse(mockBlueprint()).success).toBe(true);
    const bad = { ...mockBlueprint(), content_pillars: mockBlueprint().content_pillars.slice(0, 2) };
    expect(brandBlueprintSchema.safeParse(bad).success).toBe(false);
    expect(brandBlueprintSchema.safeParse({ positioning_statement: "x" }).success).toBe(false);
  });
  it("content updates validate slide arrays and urls", () => {
    expect(contentUpdateSchema.safeParse({ published_url: "ftp://x" }).success).toBe(false);
    expect(contentUpdateSchema.safeParse({ slides: [{ id: "a" }] }).success).toBe(false);
  });
});
