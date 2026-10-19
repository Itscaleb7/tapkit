/** Metric definitions and deterministic experiment calculations. */

export const METRIC_KEYS = [
  "reach",
  "impressions",
  "likes",
  "comments",
  "saves",
  "shares",
  "profile_visits",
  "follower_change",
  "link_clicks",
  "enquiries",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export const METRIC_DEFINITIONS: Record<MetricKey, { label: string; definition: string }> = {
  reach: { label: "Reach", definition: "Unique accounts that saw the post" },
  impressions: { label: "Impressions", definition: "Total times the post was shown, including repeat views" },
  likes: { label: "Likes", definition: "Likes / hearts on the post" },
  comments: { label: "Comments", definition: "Comments on the post" },
  saves: { label: "Saves", definition: "Times the post was saved or bookmarked" },
  shares: { label: "Shares", definition: "Times the post was shared or sent" },
  profile_visits: { label: "Profile visits", definition: "Visits to your profile attributed to the post" },
  follower_change: { label: "Follower change", definition: "Net followers gained (or lost) attributed to the post" },
  link_clicks: { label: "Link clicks", definition: "Clicks on links (bio, sticker or post link)" },
  enquiries: { label: "Enquiries", definition: "Messages or leads that came from the post" },
};

/**
 * Which metrics each platform's native analytics typically expose. This drives
 * the metric entry form so we never ask for (or imply) data a platform does not provide.
 */
export const PLATFORM_METRICS: Record<string, MetricKey[]> = {
  instagram: ["reach", "impressions", "likes", "comments", "saves", "shares", "profile_visits", "follower_change", "link_clicks", "enquiries"],
  tiktok: ["reach", "impressions", "likes", "comments", "saves", "shares", "profile_visits", "follower_change", "enquiries"],
  linkedin: ["impressions", "reach", "likes", "comments", "shares", "profile_visits", "follower_change", "link_clicks", "enquiries"],
  x: ["impressions", "likes", "comments", "shares", "saves", "profile_visits", "follower_change", "link_clicks", "enquiries"],
  youtube: ["impressions", "reach", "likes", "comments", "shares", "follower_change", "link_clicks", "enquiries"],
  threads: ["reach", "likes", "comments", "shares", "follower_change", "enquiries"],
  newsletter: ["reach", "link_clicks", "follower_change", "enquiries"],
  other: [...METRIC_KEYS],
};

export function metricsForPlatform(platform: string | null | undefined): MetricKey[] {
  return PLATFORM_METRICS[platform ?? "other"] ?? PLATFORM_METRICS.other!;
}

export type MetricRecord = Partial<Record<MetricKey, number | null>> & { content_id?: string | null; captured_on?: string };

/** Interactions = likes + comments + saves + shares (only reported values). */
export function interactions(m: MetricRecord): number | null {
  const parts = [m.likes, m.comments, m.saves, m.shares].filter((v): v is number => typeof v === "number");
  return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
}

/** Engagement rate on reach (falls back to impressions). Null when the denominator is unknown or zero. */
export function engagementRate(m: MetricRecord): number | null {
  const i = interactions(m);
  const denom = m.reach ?? m.impressions ?? null;
  if (i === null || !denom) return null;
  return i / denom;
}

export function saveRate(m: MetricRecord): number | null {
  const denom = m.reach ?? m.impressions ?? null;
  if (typeof m.saves !== "number" || !denom) return null;
  return m.saves / denom;
}

/** Use only the latest snapshot per content item so repeated entries don't double count. */
export function latestPerContent<T extends MetricRecord & { recorded_at?: string }>(rows: T[]): T[] {
  const byKey = new Map<string, T>();
  rows.forEach((r, i) => {
    const key = r.content_id ?? `row-${i}`;
    const prev = byKey.get(key);
    const stamp = (x: T) => `${x.captured_on ?? ""}|${x.recorded_at ?? ""}`;
    if (!prev || stamp(r) >= stamp(prev)) byKey.set(key, r);
  });
  return [...byKey.values()];
}

export interface MetricSummary {
  key: MetricKey;
  label: string;
  total: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  n: number;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function summariseMetrics(rows: MetricRecord[]): MetricSummary[] {
  return METRIC_KEYS.flatMap((key) => {
    const vals = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
    if (!vals.length) return [];
    const total = vals.reduce((a, b) => a + b, 0);
    return [{ key, label: METRIC_DEFINITIONS[key].label, total, mean: total / vals.length, median: median(vals), min: Math.min(...vals), max: Math.max(...vals), n: vals.length }];
  });
}

export type EvidenceLevel = "none" | "anecdotal" | "early" | "moderate";

/**
 * How much the recorded data can support a conclusion. Deliberately conservative:
 * one post is never enough to declare a format "works".
 */
export function evidenceLevel(postsWithData: number, comparisonPosts = 0): EvidenceLevel {
  if (postsWithData === 0) return "none";
  if (postsWithData < 3) return "anecdotal";
  if (postsWithData < 6 || (comparisonPosts > 0 && comparisonPosts < 3)) return "early";
  return "moderate";
}

export const EVIDENCE_COPY: Record<EvidenceLevel, string> = {
  none: "No results recorded yet.",
  anecdotal: "Too few posts to draw conclusions — treat this as an anecdote, not a pattern.",
  early: "Early signal. Worth continuing the test before changing strategy.",
  moderate: "A reasonable amount of data for a personal brand, though still not statistically conclusive.",
};

export interface ExperimentStats {
  postsPlanned: number;
  postsWithData: number;
  baselinePosts: number;
  evidence: EvidenceLevel;
  summaries: MetricSummary[];
  meanEngagementRate: number | null;
  baselineEngagementRate: number | null;
  /** Relative difference vs baseline (e.g. 0.25 = 25% higher). Null if either side is unknown. */
  relativeLift: number | null;
  primaryMetric: MetricKey | null;
  primaryMean: number | null;
  baselinePrimaryMean: number | null;
  primaryRelativeLift: number | null;
}

const meanOf = (vals: (number | null)[]) => {
  const v = vals.filter((x): x is number => typeof x === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const lift = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : (a - b) / b);

/**
 * @param testRows metric snapshots for content in the experiment
 * @param baselineRows metric snapshots for the user's other recent content (comparison)
 */
export function computeExperimentStats(
  testRows: MetricRecord[],
  baselineRows: MetricRecord[],
  opts: { plannedPosts: number; successMetrics: string[] },
): ExperimentStats {
  const test = latestPerContent(testRows);
  const base = latestPerContent(baselineRows);
  const primaryMetric = (opts.successMetrics.find((m) => (METRIC_KEYS as readonly string[]).includes(m)) as MetricKey | undefined) ?? null;
  const primaryMean = primaryMetric ? meanOf(test.map((r) => r[primaryMetric] ?? null)) : null;
  const baselinePrimaryMean = primaryMetric ? meanOf(base.map((r) => r[primaryMetric] ?? null)) : null;
  const meanEngagementRate = meanOf(test.map(engagementRate));
  const baselineEngagementRate = meanOf(base.map(engagementRate));
  return {
    postsPlanned: opts.plannedPosts,
    postsWithData: test.length,
    baselinePosts: base.length,
    evidence: evidenceLevel(test.length, base.length),
    summaries: summariseMetrics(test),
    meanEngagementRate,
    baselineEngagementRate,
    relativeLift: lift(meanEngagementRate, baselineEngagementRate),
    primaryMetric,
    primaryMean,
    baselinePrimaryMean,
    primaryRelativeLift: lift(primaryMean, baselinePrimaryMean),
  };
}

export function formatPercent(v: number | null, digits = 1): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

export function formatLift(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  const p = Math.round(v * 100);
  return `${p > 0 ? "+" : ""}${p}%`;
}
