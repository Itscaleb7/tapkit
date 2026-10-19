import type { WeeklyFacts, WeeklyReviewAi } from "@tapkit/core";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { ErrorState, Loading, Notice } from "@/components/states";
import { Badge, Button, Card, Row, SectionHeader, Stack, StatTile, Text } from "@/components/ui";
import { useRecommendations, useWeeklyReviews } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

export default function ReviewDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviews = useWeeklyReviews();
  const recs = useRecommendations();
  if (reviews.isLoading) return <Loading />;
  const row = reviews.data?.find((r) => r.id === id);
  if (reviews.error || !row) return <ErrorState error={reviews.error ?? "Review not found"} onRetry={() => reviews.refetch()} />;
  const facts = row.facts as unknown as WeeklyFacts;
  const review = row.review as unknown as WeeklyReviewAi;
  const rec = recs.data?.find((r) => r.source_id === row.id);

  return (
    <Screen edges={["bottom"]}>
      <Text variant="caption" color={colors.muted}>
        {facts.week_start} – {facts.week_end}
      </Text>
      <Text variant="title">Your week</Text>
      {!facts.sufficient_data && <Notice tone="info" title="Not much data this week" body="TapKit only reviews what you actually recorded, so this review is short." />}
      <Row gap={space.sm}>
        <StatTile label="Created" value={String(facts.content_created)} />
        <StatTile label="Published" value={String(facts.confirmed_published)} hint="Confirmed by you" />
        <StatTile label="Results" value={String(facts.results_recorded)} />
      </Row>
      <Row gap={space.sm}>
        <StatTile label="Proof added" value={String(facts.proof_entries_added)} />
        <StatTile label="Reach recorded" value={facts.metric_totals.reach !== undefined ? String(facts.metric_totals.reach) : "—"} />
        <StatTile label="Saves recorded" value={facts.metric_totals.saves !== undefined ? String(facts.metric_totals.saves) : "—"} />
      </Row>

      <Card>
        <Text>{review.summary}</Text>
      </Card>
      {review.lessons.length > 0 && <ListCard title="Lessons" items={review.lessons} />}
      {review.themes_to_test.length > 0 && <ListCard title="Worth testing" items={review.themes_to_test} />}
      <Card tone="muted">
        <Text variant="overline" color={colors.brandText}>
          Progress toward your goals
        </Text>
        <Text variant="small" style={{ marginTop: 4 }}>
          {review.goal_progress}
        </Text>
      </Card>

      <SectionHeader title="Priorities for next week" />
      {review.priorities_next_week.map((p, i) => (
        <Card key={i}>
          <Row align="flex-start">
            <Badge label={String(i + 1)} tone="brand" />
            <Stack gap={2} style={{ flex: 1 }}>
              <Text variant="bodyStrong">{p.title}</Text>
              <Text variant="small" color={colors.muted}>
                {p.why}
              </Text>
            </Stack>
          </Row>
        </Card>
      ))}

      {review.data_gaps.length > 0 && <ListCard title="Missing data" items={review.data_gaps} />}
      {rec && (
        <Notice tone="brand" title={`Suggestion: ${rec.title}`} body={`${rec.rationale}\nStatus: ${rec.status}`} action={rec.status === "pending" ? "Decide in Insights" : undefined} onAction={() => router.push("/(tabs)/insights")} />
      )}
      <Text variant="caption" color={colors.subtle}>
        Based only on activity you recorded in TapKit. No follower or engagement figures are estimated.
      </Text>
      <Button title="Plan next week's content" icon="sparkles" variant="secondary" onPress={() => router.push("/content/new")} />
    </Screen>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <Stack gap={4}>
        <Text variant="overline" color={colors.brandText}>
          {title}
        </Text>
        {items.map((t, i) => (
          <Text key={i} variant="small">
            • {t}
          </Text>
        ))}
      </Stack>
    </Card>
  );
}
