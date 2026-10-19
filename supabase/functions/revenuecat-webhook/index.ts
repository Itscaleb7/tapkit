// RevenueCat webhook. Authenticated with a shared secret configured as the
// webhook's Authorization header in the RevenueCat dashboard.
// On every event we re-fetch the subscriber from RevenueCat (source of truth)
// rather than trusting the event body, and dedupe events by id.
import { HttpError, json, readJson, serve } from "../_shared/http.ts";
import { syncSubscription } from "../_shared/revenuecat.ts";
import { userIdFromEvent } from "../_shared/revenuecatMapping.ts";
import { adminClient } from "../_shared/supabase.ts";

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

serve(async (req) => {
  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!secret) throw new HttpError(503, "not_configured", "Webhook not configured");
  const auth = req.headers.get("Authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "");
  if (!timingSafeEqual(provided, secret)) throw new HttpError(401, "unauthorized", "Invalid webhook secret");

  const body = (await readJson(req, 256_000)) as { event?: Record<string, unknown> };
  const event = body.event;
  if (!event || typeof event.id !== "string" || typeof event.type !== "string") throw new HttpError(400, "invalid_event", "Missing event");

  const db = adminClient();
  const { error: dupErr } = await db.from("revenuecat_events").insert({ id: event.id, event_type: event.type, app_user_id: String(event.app_user_id ?? "") });
  if (dupErr) {
    if (dupErr.code === "23505") return json(req, { ok: true, duplicate: true });
    throw dupErr;
  }
  if (event.type === "TEST") return json(req, { ok: true, test: true });

  const userId = userIdFromEvent(event as never);
  if (!userId) return json(req, { ok: true, ignored: "no_app_user" });
  const { data: exists } = await db.auth.admin.getUserById(userId);
  if (!exists?.user) return json(req, { ok: true, ignored: "unknown_user" });

  try {
    const row = await syncSubscription(db, userId, event.type);
    return json(req, { ok: true, active: row.is_active });
  } catch (err) {
    // Remove the dedupe marker so RevenueCat's retry is processed.
    await db.from("revenuecat_events").delete().eq("id", event.id);
    console.error("webhook sync failed", err instanceof Error ? err.message : String(err));
    throw new HttpError(502, "sync_failed", "Could not sync subscriber");
  }
});
