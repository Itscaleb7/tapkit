import { describe, expect, it } from "vitest";
import { computeExperimentStats, engagementRate, evidenceLevel, formatLift, interactions, latestPerContent, metricsForPlatform } from "../src/experiments.ts";

describe("experiment calculations", () => {
  it("computes interactions and engagement only from reported values", () => {
    expect(interactions({})).toBeNull();
    expect(interactions({ likes: 10, saves: 5 })).toBe(15);
    expect(engagementRate({ likes: 10, saves: 5, reach: 300 })).toBeCloseTo(0.05);
    expect(engagementRate({ likes: 10 })).toBeNull();
    expect(engagementRate({ likes: 10, reach: 0 })).toBeNull();
  });
  it("never claims strong evidence from one post", () => {
    expect(evidenceLevel(0)).toBe("none");
    expect(evidenceLevel(1)).toBe("anecdotal");
    expect(evidenceLevel(2)).toBe("anecdotal");
    expect(evidenceLevel(4)).toBe("early");
    expect(evidenceLevel(8, 2)).toBe("early");
    expect(evidenceLevel(8, 6)).toBe("moderate");
  });
  it("uses the latest snapshot per post", () => {
    const rows = latestPerContent([
      { content_id: "a", captured_on: "2026-01-01", likes: 1 },
      { content_id: "a", captured_on: "2026-01-05", likes: 9 },
      { content_id: "b", captured_on: "2026-01-02", likes: 3 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.content_id === "a")?.likes).toBe(9);
  });
  it("computes lift against baseline", () => {
    const test = [1, 2, 3].map((i) => ({ content_id: `t${i}`, captured_on: "2026-01-01", saves: 20, reach: 1000, likes: 30 }));
    const base = [1, 2, 3].map((i) => ({ content_id: `b${i}`, captured_on: "2026-01-01", saves: 10, reach: 1000, likes: 30 }));
    const s = computeExperimentStats(test, base, { plannedPosts: 4, successMetrics: ["saves"] });
    expect(s.postsWithData).toBe(3);
    expect(s.primaryMetric).toBe("saves");
    expect(s.primaryRelativeLift).toBeCloseTo(1);
    expect(formatLift(s.primaryRelativeLift)).toBe("+100%");
    expect(s.evidence).toBe("early");
  });
  it("only offers metrics the platform exposes", () => {
    expect(metricsForPlatform("newsletter")).not.toContain("saves");
    expect(metricsForPlatform("instagram")).toContain("saves");
    expect(metricsForPlatform(undefined).length).toBe(10);
  });
});
