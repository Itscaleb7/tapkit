import type { SupabaseClient } from "@supabase/supabase-js";
import { mapSubscriber, type RcSubscriber, type SubscriptionRow } from "./revenuecatMapping.ts";

const API_BASE = () => Deno.env.get("REVENUECAT_API_BASE") ?? "https://api.revenuecat.com";

export function revenueCatConfigured(): boolean {
  return Boolean(Deno.env.get("REVENUECAT_SECRET_API_KEY"));
}

/** Fetch the authoritative subscriber record from RevenueCat (server-side secret key). */
export async function fetchSubscriber(appUserId: string): Promise<RcSubscriber> {
  const key = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!key) throw new Error("REVENUECAT_SECRET_API_KEY is not configured");
  const res = await fetch(`${API_BASE()}/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`RevenueCat responded ${res.status}`);
  const body = await res.json();
  return body.subscriber as RcSubscriber;
}

export async function syncSubscription(db: SupabaseClient, userId: string, lastEventType: string | null = null): Promise<SubscriptionRow> {
  const subscriber = await fetchSubscriber(userId);
  const row = mapSubscriber(userId, subscriber, new Date(), lastEventType);
  const { error } = await db.from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
  return row;
}

export async function deleteSubscriber(appUserId: string): Promise<void> {
  const key = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!key) return;
  await fetch(`${API_BASE()}/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15_000),
  }).catch(() => undefined);
}
