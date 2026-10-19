import { assertEquals } from "jsr:@std/assert@1";
import { mapSubscriber, userIdFromEvent } from "./revenuecatMapping.ts";

const uid = "11111111-2222-3333-4444-555555555555";
const now = new Date("2026-10-19T00:00:00Z");
const sub = (expires: string | null, extra: Record<string, unknown> = {}, entExtra: Record<string, unknown> = {}) => ({
  entitlements: { pro: { expires_date: expires, product_identifier: "tapkit_pro_annual", ...entExtra } },
  subscriptions: { tapkit_pro_annual: { expires_date: expires, is_sandbox: false, store: "app_store", period_type: "normal", ...extra } },
});

Deno.test("active subscription is Pro", () => {
  const row = mapSubscriber(uid, sub("2026-11-01T00:00:00Z"), now);
  assertEquals(row.is_active, true);
  assertEquals(row.environment, "PRODUCTION");
  assertEquals(row.will_renew, true);
});

Deno.test("expired subscription is not Pro", () => {
  assertEquals(mapSubscriber(uid, sub("2026-10-01T00:00:00Z"), now).is_active, false);
});

Deno.test("billing grace period keeps access", () => {
  const row = mapSubscriber(uid, sub("2026-10-10T00:00:00Z", { billing_issues_detected_at: "2026-10-10T00:00:00Z" }, { grace_period_expires_date: "2026-10-25T00:00:00Z" }), now);
  assertEquals(row.is_active, true);
  assertEquals(row.billing_issue_detected_at, "2026-10-10T00:00:00Z");
});

Deno.test("cancelled but unexpired keeps access and won't renew", () => {
  const row = mapSubscriber(uid, sub("2026-11-01T00:00:00Z", { unsubscribe_detected_at: "2026-10-15T00:00:00Z" }), now);
  assertEquals(row.is_active, true);
  assertEquals(row.will_renew, false);
});

Deno.test("refund removes access", () => {
  assertEquals(mapSubscriber(uid, sub("2026-11-01T00:00:00Z", { refunded_at: "2026-10-16T00:00:00Z" }), now).is_active, false);
});

Deno.test("no entitlement means Free", () => {
  assertEquals(mapSubscriber(uid, { entitlements: {}, subscriptions: {} }, now).is_active, false);
});

Deno.test("user id resolution ignores anonymous ids", () => {
  assertEquals(userIdFromEvent({ app_user_id: "$RCAnonymousID:abc", aliases: [uid] }), uid);
  assertEquals(userIdFromEvent({ app_user_id: "$RCAnonymousID:abc" }), null);
});
