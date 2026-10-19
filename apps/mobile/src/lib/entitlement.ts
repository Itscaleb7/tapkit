import { type NumericLimitKey, PLAN_LIMITS, type PlanId } from "@tapkit/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke, must } from "./api";
import { supabase } from "./supabase";

export interface Entitlement {
  plan: PlanId;
  limits: Record<NumericLimitKey, number>;
  usage: {
    aiGenerationsThisMonth: number;
    exportsThisMonth: number;
    proofEntries: number;
    activeExperiments: number;
    offers: number;
    weeklyReviewsThisMonth: number;
  };
  subscription: {
    is_active: boolean;
    product_id: string | null;
    expires_at: string | null;
    will_renew: boolean | null;
    billing_issue: boolean;
    unsubscribed: boolean;
    environment: string | null;
    store: string | null;
    last_synced_at: string;
  } | null;
}

export const entitlementKey = ["entitlement"] as const;

/** Server-verified plan + usage. This — not the client SDK — gates features. */
export function useEntitlement() {
  return useQuery({
    queryKey: entitlementKey,
    queryFn: async () => must(await supabase.rpc("get_entitlement")) as unknown as Entitlement,
    staleTime: 30_000,
  });
}

export function useIsPro(): boolean {
  return useEntitlement().data?.plan === "pro";
}

export function planFeatures(plan: PlanId | undefined) {
  return PLAN_LIMITS[plan ?? "free"];
}

/** Ask the server to re-verify with RevenueCat, then refresh local entitlement state. */
export function useSyncSubscription() {
  const qc = useQueryClient();
  return async () => {
    const result = await invoke<{ plan: PlanId }>("subscription-sync", {});
    await qc.invalidateQueries({ queryKey: entitlementKey });
    return result;
  };
}
