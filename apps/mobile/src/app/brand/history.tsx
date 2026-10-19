import { View } from "react-native";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, Loading } from "@/components/states";
import { Badge, Card, Row, SectionHeader, Stack, Text } from "@/components/ui";
import { useBrandVersions, useDecisions } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function BrandHistory() {
  const versions = useBrandVersions();
  const decisions = useDecisions();
  if (versions.isLoading) return <Loading />;
  if (versions.error) return <ErrorState error={versions.error} onRetry={() => versions.refetch()} />;
  return (
    <Screen edges={["bottom"]}>
      <SectionHeader title="Strategic decisions" subtitle="What you decided and why." />
      {decisions.data?.length ? (
        decisions.data.map((d) => (
          <Card key={d.id}>
            <Text variant="bodyStrong">{d.decision}</Text>
            {d.rationale && (
              <Text variant="small" color={colors.muted}>
                {d.rationale}
              </Text>
            )}
            <Text variant="caption" color={colors.subtle} style={{ marginTop: 4 }}>
              {fmt(d.created_at)}
            </Text>
          </Card>
        ))
      ) : (
        <Text color={colors.muted}>No decisions recorded yet.</Text>
      )}
      <SectionHeader title="Previous versions" subtitle="Snapshots saved before each change." />
      {versions.data?.length ? (
        versions.data.map((v) => {
          const snap = v.snapshot as { brand?: { positioning?: string | null } | null; pillars?: { name: string }[] };
          return (
            <Card key={v.id}>
              <Stack gap={space.xs}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    {v.change_summary}
                  </Text>
                  <Badge label={fmt(v.created_at)} />
                </Row>
                <Text variant="caption" color={colors.muted}>
                  Before this change:
                </Text>
                <Text variant="small">{snap.brand?.positioning || "No positioning yet"}</Text>
                {snap.pillars?.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {snap.pillars.map((p) => (
                      <Badge key={p.name} label={p.name} />
                    ))}
                  </View>
                ) : null}
              </Stack>
            </Card>
          );
        })
      ) : (
        <EmptyState icon="time-outline" title="No history yet" body="When you edit your brand, the previous version is saved here." />
      )}
    </Screen>
  );
}
