import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useNetwork } from "@/lib/network";
import { colors, radius, space } from "@/theme/tokens";
import { Button, type IconName, Text } from "./ui";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text variant="small" color={colors.muted}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, body, action, onAction, secondary, onSecondary }: { icon: IconName; title: string; body: string; action?: string; onAction?: () => void; secondary?: string; onSecondary?: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.brand} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      <Text variant="body" color={colors.muted} center>
        {body}
      </Text>
      {action && onAction && <Button title={action} onPress={onAction} style={{ marginTop: space.sm }} />}
      {secondary && onSecondary && <Button title={secondary} variant="ghost" onPress={onSecondary} />}
    </View>
  );
}

export function ErrorState({ error, onRetry, title = "Something went wrong" }: { error?: unknown; onRetry?: () => void; title?: string }) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Please check your connection and try again.";
  return (
    <View style={styles.empty} accessibilityRole="alert">
      <View style={[styles.emptyIcon, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      <Text variant="body" color={colors.muted} center>
        {message}
      </Text>
      {onRetry && <Button title="Try again" variant="secondary" icon="refresh" onPress={onRetry} />}
    </View>
  );
}

export function Notice({ tone = "info", title, body, icon, action, onAction }: { tone?: "info" | "warning" | "success" | "danger" | "brand"; title: string; body?: string; icon?: IconName; action?: string; onAction?: () => void }) {
  const map = {
    info: [colors.infoSoft, colors.info, "information-circle"],
    warning: [colors.warningSoft, colors.warning, "alert-circle"],
    success: [colors.successSoft, colors.success, "checkmark-circle"],
    danger: [colors.dangerSoft, colors.danger, "warning"],
    brand: [colors.brandSoft, colors.brandText, "sparkles"],
  } as const;
  const [bg, fg, defIcon] = map[tone];
  return (
    <View style={[styles.notice, { backgroundColor: bg }]} accessibilityRole={tone === "danger" ? "alert" : undefined}>
      <Ionicons name={icon ?? defIcon} size={20} color={fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="smallStrong" color={colors.ink}>
          {title}
        </Text>
        {body && (
          <Text variant="small" color={colors.inkSoft}>
            {body}
          </Text>
        )}
        {action && onAction && <Button title={action} variant="ghost" size="sm" onPress={onAction} style={{ alignSelf: "flex-start", marginLeft: -12 }} />}
      </View>
    </View>
  );
}

export function OfflineBanner() {
  const { online } = useNetwork();
  if (online) return null;
  return (
    <View style={styles.offline} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline" size={16} color={colors.white} />
      <Text variant="smallStrong" color={colors.white}>
        You're offline. Captures are saved and will sync later.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xxl, minHeight: 200 },
  empty: { alignItems: "center", gap: space.sm, paddingVertical: space.xxxl, paddingHorizontal: space.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  notice: { flexDirection: "row", gap: space.md, padding: space.md, borderRadius: radius.md },
  offline: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, backgroundColor: colors.inkSoft, paddingVertical: 8, paddingHorizontal: space.lg },
});
