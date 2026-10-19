/**
 * Centralised plan configuration. The same limits are mirrored into the
 * `plan_limits` table by migration and verified by the integration tests, so
 * the server enforces exactly what the app displays.
 */

export type PlanId = "free" | "pro";

export const PRO_ENTITLEMENT_ID = "pro";

/** App Store product identifiers (must match App Store Connect + RevenueCat). */
export const PRODUCT_IDS = {
  monthly: "tapkit_pro_monthly",
  annual: "tapkit_pro_annual",
} as const;

/**
 * Test-price hypotheses only. The paywall always displays the localized price
 * string returned by RevenueCat/StoreKit; these are used for docs and fallbacks
 * in non-purchasable environments (web preview, tests).
 */
export const PRICE_HYPOTHESES_USD = {
  monthly: 9.99,
  annual: 59.99,
} as const;

export interface PlanLimits {
  /** AI generations (blueprints, content, analysis, reviews) per calendar month (UTC). */
  aiGenerationsPerMonth: number;
  /** Maximum stored Proof Bank entries. */
  proofEntries: number;
  /** Carousel exports per calendar month (UTC). */
  exportsPerMonth: number;
  /** Concurrently planned/running experiments. */
  activeExperiments: number;
  /** Completed experiments retained in history views. */
  experimentHistory: number;
  /** Blueprint regenerations (versions) allowed in total. */
  blueprintVersions: number;
  /** Offers in the Monetisation Hub. */
  offers: number;
  /** Portfolio items shown publicly. */
  portfolioItems: number;
  /** AI weekly reviews per month. */
  weeklyReviewsPerMonth: number;
  premiumThemes: boolean;
  alternativePositioning: boolean;
  offerAssistant: boolean;
  portfolioCustomisation: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    aiGenerationsPerMonth: 20,
    proofEntries: 50,
    exportsPerMonth: 5,
    activeExperiments: 1,
    experimentHistory: 3,
    blueprintVersions: 2,
    offers: 1,
    portfolioItems: 6,
    weeklyReviewsPerMonth: 1,
    premiumThemes: false,
    alternativePositioning: false,
    offerAssistant: false,
    portfolioCustomisation: false,
  },
  pro: {
    aiGenerationsPerMonth: 400,
    proofEntries: 5000,
    exportsPerMonth: 300,
    activeExperiments: 10,
    experimentHistory: 1000,
    blueprintVersions: 50,
    offers: 25,
    portfolioItems: 60,
    weeklyReviewsPerMonth: 6,
    premiumThemes: true,
    alternativePositioning: true,
    offerAssistant: true,
    portfolioCustomisation: true,
  },
};

/** Numeric limits mirrored in SQL (`plan_limits` table). */
export const NUMERIC_LIMIT_KEYS = [
  "aiGenerationsPerMonth",
  "proofEntries",
  "exportsPerMonth",
  "activeExperiments",
  "experimentHistory",
  "blueprintVersions",
  "offers",
  "portfolioItems",
  "weeklyReviewsPerMonth",
] as const satisfies readonly (keyof PlanLimits)[];

export type NumericLimitKey = (typeof NUMERIC_LIMIT_KEYS)[number];

export function limitsFor(plan: PlanId): PlanLimits {
  return PLAN_LIMITS[plan];
}

export interface UsageSnapshot {
  aiGenerationsThisMonth: number;
  exportsThisMonth: number;
  proofEntries: number;
  activeExperiments: number;
  offers: number;
  weeklyReviewsThisMonth: number;
}

export type LimitCheck =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0; reason: string; upgradeHelps: boolean };

export function checkLimit(plan: PlanId, key: NumericLimitKey, used: number, label: string): LimitCheck {
  const limit = PLAN_LIMITS[plan][key];
  if (used < limit) return { allowed: true, remaining: limit - used };
  const upgradeHelps = plan === "free" && PLAN_LIMITS.pro[key] > limit;
  return {
    allowed: false,
    remaining: 0,
    upgradeHelps,
    reason: upgradeHelps
      ? `You've used all ${limit} ${label} on the Free plan. Upgrade to TapKit Pro for more.`
      : `You've reached the limit of ${limit} ${label}.`,
  };
}

/** Pro feature descriptions used by the paywall. Kept factual — these are the actual limits. */
export function proFeatureList(): { title: string; detail: string }[] {
  const f = PLAN_LIMITS.free;
  const p = PLAN_LIMITS.pro;
  return [
    { title: "More AI generations", detail: `${p.aiGenerationsPerMonth} per month (Free: ${f.aiGenerationsPerMonth})` },
    { title: "Expanded Proof Bank", detail: `Up to ${p.proofEntries.toLocaleString("en-US")} entries (Free: ${f.proofEntries})` },
    { title: "More carousel exports", detail: `${p.exportsPerMonth} per month (Free: ${f.exportsPerMonth})` },
    { title: "Premium carousel themes", detail: "Editorial, Sunrise, Grid and more" },
    { title: "Advanced brand refinement", detail: "Explore alternative positioning and more blueprint versions" },
    { title: "Extended experiment history", detail: `${p.activeExperiments} active experiments, full history` },
    { title: "Personalised weekly reviews", detail: `Up to ${p.weeklyReviewsPerMonth} AI reviews per month` },
    { title: "Advanced monetisation tools", detail: `Offer assistant and up to ${p.offers} offers` },
    { title: "Portfolio customisation", detail: "Accent colours and more portfolio items" },
  ];
}

/** Start of the current usage period (calendar month, UTC). */
export function usagePeriodStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
