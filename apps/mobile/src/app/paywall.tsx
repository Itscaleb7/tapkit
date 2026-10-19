import { Ionicons } from "@expo/vector-icons";
import { proFeatureList } from "@tapkit/core";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { SafeAreaView } from "react-native-safe-area-context";
import { Notice } from "@/components/states";
import { Badge, Button, IconButton, Row, Stack, Text, tap } from "@/components/ui";
import { legalUrls } from "@/lib/config";
import { useEntitlement, useSyncSubscription } from "@/lib/entitlement";
import type { AppError } from "@/lib/errors";
import { billingAvailability, getCurrentOffering, purchase, restore } from "@/lib/purchases";
import { colors, radius, space } from "@/theme/tokens";

function periodLabel(p: PurchasesPackage) {
  switch (p.packageType) {
    case "ANNUAL":
      return { title: "Annual", unit: "year" };
    case "MONTHLY":
      return { title: "Monthly", unit: "month" };
    default:
      return { title: p.product.title || p.identifier, unit: p.product.subscriptionPeriod ?? "period" };
  }
}

export default function Paywall() {
  const ent = useEntitlement();
  const sync = useSyncSubscription();
  const availability = billingAvailability();
  const offering = useQuery({ queryKey: ["offering"], queryFn: getCurrentOffering, enabled: availability.available, retry: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [message, setMessage] = useState<{ tone: "danger" | "success" | "info"; text: string } | null>(null);

  const packages = offering.data?.availablePackages ?? [];
  const chosen = packages.find((p) => p.identifier === selected) ?? packages.find((p) => p.packageType === "ANNUAL") ?? packages[0];
  const isPro = ent.data?.plan === "pro";

  const afterStoreChange = async (successText: string) => {
    // Never trust the device: the server re-verifies with RevenueCat before unlocking.
    try {
      const r = await sync();
      if (r.plan === "pro") {
        setMessage({ tone: "success", text: successText });
        setTimeout(() => router.back(), 900);
      } else setMessage({ tone: "info", text: "We couldn't find an active TapKit Pro subscription for this Apple ID." });
    } catch (e) {
      setMessage({ tone: "danger", text: `Purchase recorded by the App Store, but we couldn't verify it yet: ${(e as Error).message} Try "Restore purchases" in a moment.` });
    }
  };

  const buy = async () => {
    if (!chosen) return;
    setBusy("buy");
    setMessage(null);
    try {
      await purchase(chosen);
      await afterStoreChange("Welcome to TapKit Pro!");
    } catch (e) {
      const err = e as AppError;
      if (err.code !== "cancelled") setMessage({ tone: err.code === "pending" ? "info" : "danger", text: err.message });
    } finally {
      setBusy(null);
    }
  };

  const doRestore = async () => {
    setBusy("restore");
    setMessage(null);
    try {
      await restore();
      await afterStoreChange("Purchases restored. TapKit Pro is active.");
    } catch (e) {
      setMessage({ tone: "danger", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top", "bottom"]}>
      <Row style={{ justifyContent: "flex-end", paddingHorizontal: space.md }}>
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
      </Row>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingTop: 0 }}>
        <Stack gap={space.sm}>
          <Badge label="TapKit Pro" tone="brand" icon="sparkles" />
          <Text variant="display" accessibilityRole="header">
            Build your brand faster
          </Text>
          <Text color={colors.muted}>More AI help, more exports and deeper insights — so you can create consistently and learn from every post.</Text>
        </Stack>

        {isPro && <Notice tone="success" title="You're on TapKit Pro" body="Thanks for supporting TapKit." />}

        <Stack gap={space.sm}>
          {proFeatureList().map((f) => (
            <Row key={f.title} align="flex-start">
              <Ionicons name="checkmark-circle" size={20} color={colors.brand} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{f.title}</Text>
                <Text variant="small" color={colors.muted}>
                  {f.detail}
                </Text>
              </View>
            </Row>
          ))}
        </Stack>

        {!availability.available ? (
          <Notice tone="info" title="Subscriptions unavailable here" body={availability.reason} />
        ) : offering.isLoading ? (
          <Text color={colors.muted}>Loading plans…</Text>
        ) : offering.error || packages.length === 0 ? (
          <Notice tone="warning" title="Plans couldn't be loaded" body="Check your connection and try again. If this continues, the App Store products may not be available yet." action="Retry" onAction={() => offering.refetch()} />
        ) : (
          <Stack gap={space.sm}>
            {packages.map((p) => {
              const { title, unit } = periodLabel(p);
              const active = chosen?.identifier === p.identifier;
              const intro = p.product.introPrice;
              return (
                <Pressable
                  key={p.identifier}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${title}, ${p.product.priceString} per ${unit}`}
                  onPress={() => {
                    tap();
                    setSelected(p.identifier);
                  }}
                  style={[styles.plan, active && styles.planActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{title}</Text>
                    <Text variant="small" color={colors.muted}>
                      {p.product.priceString} / {unit}
                      {intro ? ` · ${intro.priceString === "$0.00" || intro.price === 0 ? "free trial" : `intro ${intro.priceString}`} for ${intro.periodNumberOfUnits} ${intro.periodUnit.toLowerCase()}${intro.periodNumberOfUnits > 1 ? "s" : ""}` : ""}
                    </Text>
                  </View>
                  {p.packageType === "ANNUAL" && <Badge label="Best value" tone="brand" />}
                  <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={22} color={active ? colors.brand : colors.subtle} />
                </Pressable>
              );
            })}
          </Stack>
        )}

        {message && <Notice tone={message.tone} title={message.text} />}

        {availability.available && !isPro && chosen && (
          <Button title={`Continue · ${chosen.product.priceString}`} size="lg" loading={busy === "buy"} disabled={!!busy} onPress={buy} />
        )}
        {availability.available && <Button title="Restore purchases" variant="ghost" loading={busy === "restore"} disabled={!!busy} onPress={doRestore} />}

        <Text variant="caption" color={colors.muted}>
          Payment is charged to your Apple ID at confirmation. The subscription renews automatically at the same price for the same period unless cancelled at least 24 hours before the end of the current period. You can manage or cancel it anytime in your App Store account settings. Any unused free-trial time is forfeited when you purchase a subscription.
        </Text>
        <Row gap={space.lg} style={{ justifyContent: "center" }}>
          <Text variant="caption" color={colors.brandText} accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(legalUrls.appleEula)}>
            Terms of Use (EULA)
          </Text>
          <Text variant="caption" color={colors.brandText} accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(legalUrls.privacy)}>
            Privacy Policy
          </Text>
        </Row>
        <Text variant="caption" color={colors.subtle} center>
          The Free plan stays free: a Brand Blueprint, Proof Bank, monthly AI generations and exports, experiments and a public portfolio.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  plan: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border },
  planActive: { borderColor: colors.brand, backgroundColor: colors.brandSofter },
});
