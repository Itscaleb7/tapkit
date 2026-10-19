import { Ionicons } from "@expo/vector-icons";
import { CONTENT_STATUSES, labelOf, rankActions } from "@tapkit/core";
import { Redirect, router } from "expo-router";
import { View } from "react-native";
import { Screen } from "@/components/Screen";
import { ErrorState, Loading, Notice } from "@/components/states";
import { Badge, Button, Card, IconButton, ProgressBar, Row, SectionHeader, Stack, StatTile, Text } from "@/components/ui";
import { useEntitlement } from "@/lib/entitlement";
import { useBrand, useContentList, useHomeState, useProfile } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Home() {
  const home = useHomeState();
  const profile = useProfile();
  const brand = useBrand();
  const content = useContentList();
  const ent = useEntitlement();

  if (home.isLoading) return <Loading />;
  if (home.error || !home.data) return <ErrorState error={home.error} onRetry={() => home.refetch()} />;

  const state = home.data;
  // Brand-new (or mid-onboarding) users go straight to the questions; progress is resumable.
  if (!state.onboardingCompleted && !state.hasPendingBlueprint && !state.hasAcceptedBlueprint) return <Redirect href="/onboarding" />;
  const actions = rankActions(state);
  const [next, ...rest] = actions;
  const firstName = profile.data?.display_name?.split(" ")[0];
  const journey = [
    { label: "Blueprint", done: state.hasAcceptedBlueprint },
    { label: "Proof Bank", done: state.proofEntryCount >= 3 },
    { label: "First post", done: state.contentCount > 0 },
    { label: "Published", done: state.publishedCount > 0 },
    { label: "Results", done: state.publishedCount > 0 && state.publishedAwaitingResults === 0 },
    { label: "Portfolio", done: state.hasPortfolio },
  ];
  const progress = journey.filter((j) => j.done).length / journey.length;

  return (
    <Screen
      title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
      subtitle={brand.data?.positioning ? undefined : "Let's build your brand, one step at a time."}
      headerRight={<IconButton icon="settings-outline" label="Settings" onPress={() => router.push("/settings")} />}
      refreshing={home.isRefetching}
      onRefresh={() => {
        home.refetch();
        content.refetch();
        ent.refetch();
      }}
    >
      {brand.data?.positioning && (
        <Card tone="muted">
          <Text variant="overline" color={colors.brandText}>
            What you're building toward
          </Text>
          <Text variant="bodyStrong" style={{ marginTop: 4 }}>
            {brand.data.positioning}
          </Text>
        </Card>
      )}

      {next && (
        <Card tone="dark" onPress={() => router.push(next.route as never)} accessibilityLabel={`Next step: ${next.title}`}>
          <Stack gap={space.sm}>
            <Badge label="Your next step" tone="brand" icon="arrow-forward-circle" />
            <Text variant="title" color={colors.white}>
              {next.title}
            </Text>
            <Text variant="body" color="#D9CFC7">
              {next.detail}
            </Text>
            <Button title={next.cta} iconRight="arrow-forward" style={{ alignSelf: "flex-start", marginTop: space.xs }} onPress={() => router.push(next.route as never)} />
          </Stack>
        </Card>
      )}

      {state.onboardingCompleted && (
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <Text variant="subheading">Your brand journey</Text>
            <Text variant="smallStrong" color={colors.brandText}>
              {Math.round(progress * 100)}%
            </Text>
          </Row>
          <View style={{ marginVertical: space.md }}>
            <ProgressBar value={progress} label="Brand journey progress" />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {journey.map((j) => (
              <Badge key={j.label} label={j.label} tone={j.done ? "success" : "neutral"} icon={j.done ? "checkmark" : "ellipse-outline"} />
            ))}
          </View>
        </Card>
      )}

      {state.onboardingCompleted && (
        <Row gap={space.sm}>
          <Button title="Capture" icon="mic-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push("/proof/new")} />
          <Button title="Create" icon="sparkles-outline" style={{ flex: 1 }} onPress={() => router.push("/content/new")} />
        </Row>
      )}

      {rest.length > 0 && (
        <Stack gap={space.sm}>
          <SectionHeader title="Also worth doing" />
          {rest.slice(0, 3).map((a) => (
            <Card key={a.id} onPress={() => router.push(a.route as never)} accessibilityLabel={a.title}>
              <Row>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{a.title}</Text>
                  <Text variant="small" color={colors.muted}>
                    {a.detail}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
              </Row>
            </Card>
          ))}
        </Stack>
      )}

      {state.onboardingCompleted && (
        <Row gap={space.sm}>
          <StatTile label="Proof Bank" value={String(state.proofEntryCount)} icon="archive-outline" />
          <StatTile label="Content" value={String(state.contentCount)} icon="albums-outline" />
          <StatTile label="Published" value={String(state.publishedCount)} icon="checkmark-done-outline" />
        </Row>
      )}

      {(content.data?.length ?? 0) > 0 && (
        <Stack gap={space.sm}>
          <SectionHeader title="Recent content" action="See all" onAction={() => router.push("/(tabs)/create")} />
          {content.data!.slice(0, 3).map((c) => (
            <Card key={c.id} onPress={() => router.push(`/content/${c.id}`)} accessibilityLabel={c.title}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {c.title}
                </Text>
                <Badge label={labelOf(CONTENT_STATUSES, c.status)} tone={c.status === "published" ? "success" : c.status === "ready" ? "brand" : "neutral"} />
              </Row>
            </Card>
          ))}
        </Stack>
      )}

      {ent.data?.subscription?.billing_issue && (
        <Notice tone="warning" title="There's a problem with your payment" body="Update your payment method in the App Store to keep TapKit Pro." action="Manage subscription" onAction={() => router.push("/settings/subscription")} />
      )}
    </Screen>
  );
}
