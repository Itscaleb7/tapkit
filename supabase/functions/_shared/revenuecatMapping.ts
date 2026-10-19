// Pure mapping from RevenueCat's REST subscriber payload to our subscriptions row.
// No Deno APIs here so it can be unit-tested from Node.

export const PRO_ENTITLEMENT = "pro";

export interface RcEntitlement {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
  product_identifier: string;
  purchase_date?: string;
}
export interface RcSubscription {
  expires_date: string | null;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
  grace_period_expires_date?: string | null;
  is_sandbox?: boolean;
  period_type?: string;
  store?: string;
  refunded_at?: string | null;
}
export interface RcSubscriber {
  entitlements: Record<string, RcEntitlement>;
  subscriptions: Record<string, RcSubscription>;
}

export interface SubscriptionRow {
  user_id: string;
  entitlement: string;
  is_active: boolean;
  product_id: string | null;
  store: string | null;
  period_type: string | null;
  environment: "SANDBOX" | "PRODUCTION" | null;
  expires_at: string | null;
  will_renew: boolean | null;
  unsubscribe_detected_at: string | null;
  billing_issue_detected_at: string | null;
  grace_period_expires_at: string | null;
  last_event_type: string | null;
  last_synced_at: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID_RE.test(s);

export function mapSubscriber(userId: string, sub: RcSubscriber, now = new Date(), lastEventType: string | null = null): SubscriptionRow {
  const ent = sub.entitlements?.[PRO_ENTITLEMENT];
  const product = ent?.product_identifier ?? null;
  const s = product ? sub.subscriptions?.[product] : undefined;
  const expires = ent?.expires_date ?? null;
  const grace = ent?.grace_period_expires_date ?? s?.grace_period_expires_date ?? null;
  const refunded = Boolean(s?.refunded_at);
  const active =
    !!ent && !refunded && (expires === null || new Date(expires) > now || (grace !== null && new Date(grace) > now));
  return {
    user_id: userId,
    entitlement: PRO_ENTITLEMENT,
    is_active: active,
    product_id: product,
    store: s?.store ?? null,
    period_type: s?.period_type ?? null,
    environment: s ? (s.is_sandbox ? "SANDBOX" : "PRODUCTION") : null,
    expires_at: expires,
    will_renew: s ? !s.unsubscribe_detected_at && !refunded : null,
    unsubscribe_detected_at: s?.unsubscribe_detected_at ?? null,
    billing_issue_detected_at: s?.billing_issues_detected_at ?? null,
    grace_period_expires_at: grace,
    last_event_type: lastEventType,
    last_synced_at: now.toISOString(),
  };
}

/** Pick our Supabase user id from a webhook event (app_user_id, original id or aliases). */
export function userIdFromEvent(event: { app_user_id?: string; original_app_user_id?: string; aliases?: string[]; transferred_to?: string[] }): string | null {
  const candidates = [event.app_user_id, event.original_app_user_id, ...(event.transferred_to ?? []), ...(event.aliases ?? [])];
  return candidates.find(isUuid) ?? null;
}
