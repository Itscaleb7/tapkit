import { router } from "expo-router";
import Constants from "expo-constants";
import { alert } from "@/lib/confirm";

import { Screen } from "@/components/Screen";
import { Badge, Button, Card, ListRow, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useEntitlement } from "@/lib/entitlement";
import { colors } from "@/theme/tokens";

export default function Settings() {
  const { session, signOut } = useAuth();
  const ent = useEntitlement();
  return (
    <Screen edges={["bottom"]}>
      <Card>
        <Text variant="caption" color={colors.muted}>
          Signed in as
        </Text>
        <Text variant="bodyStrong">{session?.user.email}</Text>
      </Card>
      <Card>
        <ListRow icon="sparkles-outline" title="Subscription" subtitle={ent.data?.plan === "pro" ? "TapKit Pro" : "Free plan"} right={<Badge label={ent.data?.plan === "pro" ? "Pro" : "Free"} tone={ent.data?.plan === "pro" ? "brand" : "neutral"} />} onPress={() => router.push("/settings/subscription")} />
        <ListRow icon="person-outline" title="Account" subtitle="Name, handle, password, delete account" onPress={() => router.push("/settings/account")} />
        <ListRow icon="shield-checkmark-outline" title="Privacy & data" subtitle="What's private, export your data" onPress={() => router.push("/settings/privacy")} />
        <ListRow icon="help-circle-outline" title="Help & support" onPress={() => router.push("/settings/help")} />
      </Card>
      <Button
        title="Sign out"
        variant="secondary"
        icon="log-out-outline"
        onPress={() => alert("Sign out?", "Your work is saved to your account.", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: () => signOut() }])}
      />
      <Text variant="caption" color={colors.subtle} center>
        TapKit {Constants.expoConfig?.version}
      </Text>
    </Screen>
  );
}
