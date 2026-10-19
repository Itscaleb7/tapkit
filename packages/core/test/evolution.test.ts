import { describe, expect, it } from "vitest";
import { gatherWeeklyFacts, nextAction, rankActions, weekStartOf, type UserProgressState } from "../src/evolution.ts";

const base: UserProgressState = {
  onboardingCompleted: true, hasAcceptedBlueprint: true, hasPendingBlueprint: false, proofEntryCount: 5, contentCount: 3, draftCount: 0,
  readyCount: 0, publishedCount: 0, publishedAwaitingResults: 0, activeExperiments: 0, experimentsEndedAwaitingConclusion: 0,
  lastWeeklyReviewAt: new Date().toISOString(), pendingRecommendations: 0, pillarCount: 3, hasPortfolio: true,
};

describe("next action", () => {
  it("prioritises onboarding above everything", () => {
    expect(nextAction({ ...base, onboardingCompleted: false }).id).toBe("finish_onboarding");
    expect(rankActions({ ...base, onboardingCompleted: false })).toHaveLength(1);
  });
  it("asks to review a pending blueprint", () => {
    expect(nextAction({ ...base, hasAcceptedBlueprint: false, hasPendingBlueprint: true }).id).toBe("review_blueprint");
  });
  it("suggests capturing proof when the bank is nearly empty", () => {
    expect(nextAction({ ...base, proofEntryCount: 0 }).id).toBe("capture_proof");
  });
  it("asks for results on published posts", () => {
    expect(nextAction({ ...base, publishedAwaitingResults: 2 }).id).toBe("record_results");
  });
  it("suggests a weekly review when a week has passed", () => {
    expect(nextAction({ ...base, lastWeeklyReviewAt: null }).id).toBe("weekly_review");
  });
  it("always returns something useful", () => {
    expect(nextAction(base).id).toBeTruthy();
  });
});

describe("weekly facts", () => {
  it("computes the Monday week start", () => {
    expect(weekStartOf(new Date("2026-10-18T12:00:00Z"))).toBe("2026-10-12"); // Sunday → previous Monday
    expect(weekStartOf(new Date("2026-10-19T00:00:00Z"))).toBe("2026-10-19");
  });
  it("only counts what actually happened and flags missing data", () => {
    const facts = gatherWeeklyFacts({
      weekStart: "2026-10-12",
      content: [
        { id: "1", title: "A", format: "carousel", status: "published", pillar: "Lessons", created_at: "2026-10-13T10:00:00Z", published_at: "2026-10-14T10:00:00Z" },
        { id: "2", title: "B", format: "carousel", status: "ready", pillar: "Lessons", created_at: "2026-10-15T10:00:00Z" },
        { id: "3", title: "Old", format: "carousel", status: "published", created_at: "2026-09-01T10:00:00Z", published_at: "2026-09-02T10:00:00Z" },
      ],
      metrics: [],
      proofEntries: [{ id: "p", kind: "lesson", created_at: "2026-10-12T08:00:00Z" }],
      experiments: [],
      goals: ["Get 3 clients"],
    });
    expect(facts.content_created).toBe(2);
    expect(facts.confirmed_published).toBe(1);
    expect(facts.results_recorded).toBe(0);
    expect(facts.pillars_used).toEqual({ Lessons: 2 });
    expect(facts.data_gaps).toContain("Published posts have no recorded results yet.");
    expect(facts.sufficient_data).toBe(true);
  });
  it("reports insufficient data for an empty week", () => {
    const facts = gatherWeeklyFacts({ weekStart: "2026-10-12", content: [], metrics: [], proofEntries: [], experiments: [], goals: [] });
    expect(facts.sufficient_data).toBe(false);
  });
});
