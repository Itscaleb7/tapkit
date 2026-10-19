import { PLAN_LIMITS } from "@tapkit/core";
import { router } from "expo-router";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { ErrorState, Loading, Notice } from "@/components/states";
import { Badge, Button, Card, ProgressBar, Row, SectionHeader, Stack, Text } from "@/components/ui";
import { useEntitlement, useSyncSubscription } from "@/lib/entitlement";
import { billingAvailability, openManageSubscriptions, restore } from "@/lib/purchases";
import { colors, space } from "@/theme/tokens";

export default function Subscription() {
  const ent = useEntitlement();
  const sync = useSyncSubscription();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  if (ent.isLoading) return <Loading />;
  if (ent.error || !ent.data) return <ErrorState error={ent.error} onRetry={() => ent.refetch()} />;
  const e = ent.data;
  const sub = e.subscription;
  const isPro = e.plan === "pro";

  const doRestore = async () => {
    setBusy(true);
    setMessage(undefined);
    try {
      await restore();
      const r = await sync();
      setMessage(r.plan === "pro" ? "TapKit Pro restored." : "No active subscription found for this Apple ID.");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const usage = [
    { label: "AI generations this month", used: e.usage.aiGenerationsThisMonth, limit: e.limits.aiGenerationsPerMonth },
    { label: "Exports this month", used: e.usage.exportsThisMonth, limit: e.limits.exportsPerMonth },
    { label: "Proof Bank entries", used: e.usage.proofEntries, limit: e.limits.proofEntries },
    { label: "Active experiments", used: e.usage.activeExperiments, limit: e.limits.activeExperiments },
    { label: "Offers", used: e.usage.offers, limit: e.limits.offers },
  ];

  return (
    <Screen edges={["bottom"]}>
      <Card tone={isPro ? "brand" : "muted"}>
        <Row style={{ justifyContent: "space-between" }}>
          <Text variant="heading">{isPro ? "TapKit Pro" : "Free plan"}</Text>
          <Badge label={isPro ? "Active" : "Free"} tone={isPro ? "success" : "neutral"} />
        </Row>
        {sub && (
          <Stack gap={4} style={{ marginTop: space.sm }}>
            {sub.expires_at && (
              <Text variant="small">
                {sub.will_renew && sub.is_active ? "Renews" : isPro ? "Access until" : "Expired"} {new Date(sub.expires_at).toLocaleDateString()}
              </Text>
            )}
            {sub.environment === "SANDBOX" && <Badge label="Sandbox (test) purchase" tone="info" />}
          </Stack>
        )}
      </Card>
      {sub?.billing_issue && <Notice tone="warning" title="Billing problem" body="Apple couldn't charge your payment method. Update it in your App Store account to keep Pro." />}
      {sub?.unsubscribed && isPro && <Notice tone="info" title="Cancellation scheduled" body="You'll keep Pro until the end of your current period." />}
      {message && <Notice tone="info" title={message} />}

      {!isPro && <Button title="See TapKit Pro" icon="sparkles" size="lg" onPress={() => router.push("/paywall")} />}
      {isPro && <Button title="Manage subscription" variant="secondary" onPress={openManageSubscriptions} />}
      {billingAvailability().available && <Button title="Restore purchases" variant="ghost" loading={busy} onPress={doRestore} />}

      <SectionHeader title="Usage" subtitle="Monthly allowances reset on the 1st (UTC)." />
      <Card>
        <Stack gap={space.md}>
          {usage.map((u) => (
            <Stack key={u.label} gap={4}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text variant="small">{u.label}</Text>
                <Text variant="smallStrong">
                  {u.used} / {u.limit.toLocaleString()}
                </Text>
              </Row>
              <ProgressBar value={u.used / Math.max(1, u.limit)} color={u.used >= u.limit ? colors.danger : colors.brand} label={u.label} />
            </Stack>
          ))}
        </Stack>
      </Card>
      <Text variant="caption" color={colors.subtle}>
        Pro includes {PLAN_LIMITS.pro.aiGenerationsPerMonth} AI generations and {PLAN_LIMITS.pro.exportsPerMonth} exports per month.
      </Text>
    </Screen>
  );
}
