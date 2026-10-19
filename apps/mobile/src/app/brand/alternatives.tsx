import { router } from "expo-router";
import { Alert } from "react-native";
import { Screen } from "@/components/Screen";
import { Notice } from "@/components/states";
import { Button, Card, Stack, Text } from "@/components/ui";
import type { AppError } from "@/lib/errors";
import { useAlternatives, useSaveBrand } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

export default function Alternatives() {
  const alt = useAlternatives();
  const save = useSaveBrand();
  const err = alt.error as AppError | null;

  const apply = (positioning: string, audience: string, label: string) =>
    Alert.alert("Use this positioning?", "Your current positioning is saved in Brand history, so you can switch back.", [
      { text: "Cancel", style: "cancel" },
      { text: "Use it", onPress: () => save.mutate({ patch: { positioning, audience }, summary: `Switched to alternative positioning: ${label}` }, { onSuccess: () => router.back() }) },
    ]);

  return (
    <Screen edges={["bottom"]}>
      <Text color={colors.muted}>See genuinely different directions for your brand, each with honest trade-offs. Nothing changes unless you choose it.</Text>
      {err && <Notice tone="danger" title={err.message} action={err.upgrade ? "See TapKit Pro" : undefined} onAction={() => router.push("/paywall")} />}
      {!alt.data && <Button title="Explore alternatives" icon="sparkles" loading={alt.isPending} onPress={() => alt.mutate()} />}
      {alt.data?.alternatives.map((a) => (
        <Card key={a.label}>
          <Stack gap={space.sm}>
            <Text variant="overline" color={colors.brandText}>
              {a.label}
            </Text>
            <Text variant="heading">{a.positioning_statement}</Text>
            <Text variant="small">
              <Text variant="smallStrong">Audience: </Text>
              {a.target_audience}
            </Text>
            <Text variant="small">
              <Text variant="smallStrong">Trade-offs: </Text>
              {a.tradeoffs}
            </Text>
            <Text variant="small">
              <Text variant="smallStrong">Best if: </Text>
              {a.best_if}
            </Text>
            <Button title="Use this positioning" variant="secondary" size="sm" style={{ alignSelf: "flex-start" }} onPress={() => apply(a.positioning_statement, a.target_audience, a.label)} />
          </Stack>
        </Card>
      ))}
      {alt.data && <Button title="Generate different options" variant="ghost" loading={alt.isPending} onPress={() => alt.mutate()} />}
    </Screen>
  );
}
