import { BRAND_STAGES, labelOf, MONETISATION_INTERESTS, PLATFORMS } from "@tapkit/core";
import { router } from "expo-router";
import { View } from "react-native";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, Loading } from "@/components/states";
import { Badge, Button, Card, ListRow, Row, SectionHeader, Stack, Text } from "@/components/ui";
import { useIsPro } from "@/lib/entitlement";
import { useBlueprints, useBrand, usePillars } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

type FieldDef = { key: string; label: string; value: string | string[] | null | undefined };

export default function MyBrand() {
  const brand = useBrand();
  const pillars = usePillars();
  const blueprints = useBlueprints();
  const isPro = useIsPro();

  if (brand.isLoading) return <Loading />;
  if (brand.error) return <ErrorState error={brand.error} onRetry={() => brand.refetch()} />;
  const b = brand.data;
  const pending = blueprints.data?.find((x) => x.status === "generated");

  if (!b) {
    return (
      <Screen title="My Brand">
        <EmptyState
          icon="person-circle-outline"
          title="Your brand starts here"
          body={pending ? "You have a Brand Blueprint waiting for your review." : "Answer a few questions and TapKit will draft your positioning, pillars and voice."}
          action={pending ? "Review blueprint" : "Discover my brand"}
          onAction={() => router.push(pending ? "/brand/blueprint" : "/onboarding")}
        />
      </Screen>
    );
  }

  const identity: FieldDef[] = [
    { key: "positioning", label: "Positioning", value: b.positioning },
    { key: "audience", label: "Audience", value: b.audience },
    { key: "brand_promise", label: "Brand promise", value: b.brand_promise },
    { key: "differentiators", label: "Differentiators", value: b.differentiators },
    { key: "voice_summary", label: "Tone of voice", value: b.voice_summary },
    { key: "values", label: "Values", value: b.values },
  ];
  const direction: FieldDef[] = [
    { key: "goals", label: "Goals", value: b.goals },
    { key: "platforms", label: "Platforms", value: b.platforms.map((p) => labelOf(PLATFORMS, p)) },
    { key: "stage", label: "Current stage", value: labelOf(BRAND_STAGES, b.stage) },
    { key: "long_term_objectives", label: "Long-term objectives", value: b.long_term_objectives },
    { key: "monetisation_interests", label: "Monetisation interests", value: b.monetisation_interests.map((m) => labelOf(MONETISATION_INTERESTS, m)) },
    { key: "visual_preferences", label: "Visual preferences", value: b.visual_preferences },
  ];

  return (
    <Screen title="My Brand" subtitle="Your accepted identity. TapKit uses the latest version for everything it creates." refreshing={brand.isRefetching} onRefresh={() => { brand.refetch(); pillars.refetch(); }}>
      {pending && (
        <Card tone="brand" onPress={() => router.push({ pathname: "/brand/blueprint", params: { id: pending.id } })} accessibilityLabel="Review new blueprint">
          <Text variant="bodyStrong">A new blueprint version is waiting</Text>
          <Text variant="small" color={colors.inkSoft}>
            Your current brand won't change unless you accept it.
          </Text>
        </Card>
      )}

      <SectionHeader title="Identity" />
      <Card>
        <Stack gap={space.md}>
          {identity.map((f) => (
            <FieldRow key={f.key} f={f} />
          ))}
        </Stack>
      </Card>

      <SectionHeader title="Content pillars" action="Manage" onAction={() => router.push("/brand/pillars")} />
      <Card onPress={() => router.push("/brand/pillars")} accessibilityLabel="Manage content pillars">
        {pillars.data?.length ? (
          <Stack gap={space.sm}>
            {pillars.data.map((p, i) => (
              <Row key={p.id} align="flex-start">
                <Badge label={String(i + 1)} tone="brand" />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{p.name}</Text>
                  {p.description && (
                    <Text variant="small" color={colors.muted} numberOfLines={2}>
                      {p.description}
                    </Text>
                  )}
                </View>
              </Row>
            ))}
          </Stack>
        ) : (
          <Text color={colors.muted}>No pillars yet — add 3 to 5 themes you want to be known for.</Text>
        )}
      </Card>

      <SectionHeader title="Direction" />
      <Card>
        <Stack gap={space.md}>
          {direction.map((f) => (
            <FieldRow key={f.key} f={f} />
          ))}
        </Stack>
      </Card>

      <SectionHeader title="Refine" />
      <Card>
        <ListRow icon="document-text-outline" title="Brand Blueprint" subtitle="See the strategy and its rationale" onPress={() => router.push("/brand/blueprint")} />
        <ListRow icon="git-compare-outline" title="Explore alternative positioning" subtitle={isPro ? "See different directions with trade-offs" : "TapKit Pro"} onPress={() => router.push(isPro ? "/brand/alternatives" : "/paywall")} />
        <ListRow icon="refresh-outline" title="Update my answers" subtitle="Revisit onboarding and regenerate" onPress={() => router.push("/onboarding")} />
        <ListRow icon="time-outline" title="Version history" subtitle="Every strategic change, with what it replaced" onPress={() => router.push("/brand/history")} />
      </Card>
      <Button title="Capture an experience" icon="add" variant="secondary" onPress={() => router.push("/proof/new")} />
    </Screen>
  );
}

function FieldRow({ f }: { f: FieldDef }) {
  const empty = !f.value || (Array.isArray(f.value) && f.value.length === 0);
  return (
    <Row align="flex-start">
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="caption" color={colors.muted}>
          {f.label}
        </Text>
        {empty ? (
          <Text variant="small" color={colors.subtle}>
            Not set
          </Text>
        ) : Array.isArray(f.value) ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
            {f.value.map((v) => (
              <Badge key={v} label={v} />
            ))}
          </View>
        ) : (
          <Text>{f.value}</Text>
        )}
      </View>
      <Button title={empty ? "Add" : "Edit"} variant="ghost" size="sm" onPress={() => router.push({ pathname: "/brand/edit", params: { field: f.key } })} />
    </Row>
  );
}
