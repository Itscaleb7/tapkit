import { describe, expect, it } from "vitest";
import { checkLimit, PLAN_LIMITS, NUMERIC_LIMIT_KEYS, proFeatureList, usagePeriodStart } from "../src/plans.ts";

describe("plan limits", () => {
  it("pro is at least as generous as free for every numeric limit", () => {
    for (const k of NUMERIC_LIMIT_KEYS) expect(PLAN_LIMITS.pro[k]).toBeGreaterThanOrEqual(PLAN_LIMITS.free[k]);
  });
  it("free tier still provides genuine value", () => {
    expect(PLAN_LIMITS.free.aiGenerationsPerMonth).toBeGreaterThanOrEqual(10);
    expect(PLAN_LIMITS.free.exportsPerMonth).toBeGreaterThan(0);
    expect(PLAN_LIMITS.free.proofEntries).toBeGreaterThanOrEqual(25);
  });
  it("checkLimit allows under the limit and blocks at it with an upgrade hint", () => {
    expect(checkLimit("free", "exportsPerMonth", 0, "exports")).toEqual({ allowed: true, remaining: PLAN_LIMITS.free.exportsPerMonth });
    const blocked = checkLimit("free", "exportsPerMonth", PLAN_LIMITS.free.exportsPerMonth, "exports");
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.upgradeHelps).toBe(true);
    const proBlocked = checkLimit("pro", "exportsPerMonth", PLAN_LIMITS.pro.exportsPerMonth, "exports");
    if (!proBlocked.allowed) expect(proBlocked.upgradeHelps).toBe(false);
  });
  it("paywall copy reflects real limits", () => {
    const list = proFeatureList();
    expect(list.find((f) => f.title === "More AI generations")?.detail).toContain(String(PLAN_LIMITS.pro.aiGenerationsPerMonth));
  });
  it("usage period starts on the first of the month in UTC", () => {
    expect(usagePeriodStart(new Date("2026-03-17T23:00:00-05:00")).toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});
