import { engagementRate, formatPercent, latestPerContent, type MetricRecord, weekStartOf } from "@tapkit/core";
import { router } from "expo-router";
import { useState } from "react";
import { useWindowDimensions } from "react-native";
import { BarChart } from "@/components/charts";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, Loading, Notice } from "@/components/states";
import { Badge, Button, Card, Row, SectionHeader, Stack, StatTile, Text } from "@/components/ui";
import { useEntitlement, useIsPro } from "@/lib/entitlement";
import type { AppError } from "@/lib/errors";
import { useContentList, useDecideRecommendation, useDecisions, useExperiments, useGenerateWeeklyReview, useMetrics, useRecommendations, useWeeklyReviews } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

const STATUS_TONE = { planned: "neutral", running: "brand", completed: "success", abandoned: "neutral" } as const;

export default function Insights() {
  const { width } = useWindowDimensions();
  const experiments = useExperiments();
  const reviews = useWeeklyReviews();
  const recs = useRecommendations();
  const decisions = useDecisions();
  const metrics = useMetrics({ all: true });
  const content = useContentList("published");
  const ent = useEntitlement();
  const isPro = useIsPro();
  const genReview = useGenerateWeeklyReview();
  const decide = useDecideRecommendation();
  const [reviewError, setReviewError] = useState<AppError | null>(null);
  const [thisWeek] = useState(() => weekStartOf(new Date()));
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  if (experiments.isLoading) return <Loading />;
  if (experiments.error) return <ErrorState error={experiments.error} onRetry={() => experiments.refetch()} />;

  const latest = latestPerContent((metrics.data ?? []) as (MetricRecord & { recorded_at?: string })[]);
  const published = content.data ?? [];
  const chart = published
    .slice(0, 8)
    .reverse()
    .map((c) => {
      const m = latest.find((r) => r.content_id === c.id);
      return { label: c.title, value: m ? m.reach ?? m.impressions ?? null : null };
    });
  const avgEngagement = (() => {
    const rates = latest.map(engagementRate).filter((v): v is number => v !== null);
    return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  })();
  const pendingRecs = (recs.data ?? []).filter((r) => r.status === "pending" || r.status === "deferred");
  const active = (experiments.data ?? []).filter((e) => e.status === "planned" || e.status === "running");
  const history = (experiments.data ?? []).filter((e) => e.status === "completed" || e.status === "abandoned");
  const historyLimit = ent.data?.limits.experimentHistory ?? 3;

  const startReview = () => {
    setReviewError(null);
    genReview.mutate(undefined, { onSuccess: (r) => router.push(`/reviews/${r.review.id}`), onError: (e) => setReviewError(e as AppError) });
  };

  return (
    <Screen title="Insights" subtitle="Learn from real results — not guesses." refreshing={experiments.isRefetching} onRefresh={() => { experiments.refetch(); reviews.refetch(); recs.refetch(); metrics.refetch(); content.refetch(); }}>
      <Row gap={space.sm}>
        <StatTile label="Published" value={String(published.length)} />
        <StatTile label="With results" value={String(latest.length)} />
        <StatTile label="Avg. engagement" value={formatPercent(avgEngagement)} hint={latest.length < 3 ? "Too few posts to compare" : undefined} />
      </Row>

      {chart.some((c) => c.value !== null) ? (
        <Card>
          <Text variant="subheading">Reach by post</Text>
          <Text variant="caption" color={colors.muted}>
            Latest recorded reach (or impressions). Blank = no data recorded.
          </Text>
          <BarChart title="Reach by post" data={chart} width={width - space.xl * 2 - space.lg * 2} />
        </Card>
      ) : (
        published.length > 0 && <Notice tone="info" title="Record results to see trends" body="Open a published post and tap “Record results”." />
      )}

      {pendingRecs.map((r) => (
        <Card key={r.id} tone="brand">
          <Stack gap={space.sm}>
            <Row style={{ justifyContent: "space-between" }}>
              <Badge label="Strategy suggestion" tone="brand" icon="bulb" />
              {r.status === "deferred" && <Badge label="Deferred" />}
            </Row>
            <Text variant="subheading">{r.title}</Text>
            <Text variant="small">{r.rationale}</Text>
            <Text variant="small" color={colors.inkSoft}>
              <Text variant="smallStrong">Proposed: </Text>
              {r.proposed_change}
            </Text>
            <Text variant="caption" color={colors.muted}>
              Accepting records your decision. TapKit won't rewrite your brand — you can apply the change in My Brand.
            </Text>
            <Row gap={space.sm}>
              <Button title="Accept" size="sm" style={{ flex: 1 }} onPress={() => decide.mutate({ id: r.id, status: "accepted" })} />
              <Button title="Defer" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => decide.mutate({ id: r.id, status: "deferred" })} />
              <Button title="Reject" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => decide.mutate({ id: r.id, status: "rejected" })} />
            </Row>
          </Stack>
        </Card>
      ))}

      <SectionHeader title="Weekly review" subtitle="What you made, what you learned, what's next." />
      {reviewError && <Notice tone="danger" title={reviewError.message} action={reviewError.upgrade ? "See TapKit Pro" : undefined} onAction={() => router.push("/paywall")} />}
      {reviews.data?.[0]?.week_start === thisWeek ? (
        <Card onPress={() => router.push(`/reviews/${reviews.data![0]!.id}`)} accessibilityLabel="Open this week's review">
          <Text variant="bodyStrong">Week of {thisWeek}</Text>
          <Text variant="small" color={colors.muted} numberOfLines={2}>
            {(reviews.data[0]!.review as { summary?: string }).summary}
          </Text>
        </Card>
      ) : (
        <Button title="Review my week" icon="calendar-outline" loading={genReview.isPending} onPress={startReview} />
      )}
      {(reviews.data ?? []).slice(reviews.data?.[0]?.week_start === thisWeek ? 1 : 0, 6).map((r) => (
        <Card key={r.id} onPress={() => router.push(`/reviews/${r.id}`)} accessibilityLabel={`Review for week of ${r.week_start}`}>
          <Text variant="smallStrong">Week of {r.week_start}</Text>
        </Card>
      ))}
      {!isPro && <Text variant="caption" color={colors.muted}>Free plan: {ent.data?.limits.weeklyReviewsPerMonth ?? 1} AI review per month. Weeks without activity don't use your allowance.</Text>}

      <SectionHeader title="Growth experiments" action="New" onAction={() => router.push("/experiments/new")} />
      {active.length === 0 && history.length === 0 ? (
        <EmptyState icon="flask-outline" title="Test, don't guess" body="Pick one idea — like personal stories vs tips — and test it over a few posts." action="Plan an experiment" onAction={() => router.push("/experiments/new")} />
      ) : (
        active.map((e) => (
          <Card key={e.id} onPress={() => router.push(`/experiments/${e.id}`)} accessibilityLabel={e.title}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {e.title}
              </Text>
              <Badge label={e.end_date < today ? "Ready to review" : e.status} tone={STATUS_TONE[e.status]} />
            </Row>
            <Text variant="small" color={colors.muted} numberOfLines={2}>
              {e.hypothesis}
            </Text>
          </Card>
        ))
      )}
      {history.slice(0, historyLimit).map((e) => (
        <Card key={e.id} tone="muted" onPress={() => router.push(`/experiments/${e.id}`)} accessibilityLabel={e.title}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text variant="smallStrong" style={{ flex: 1 }}>
              {e.title}
            </Text>
            <Badge label={e.status} tone={STATUS_TONE[e.status]} />
          </Row>
          {e.conclusion && (
            <Text variant="caption" color={colors.muted} numberOfLines={2}>
              {e.conclusion}
            </Text>
          )}
        </Card>
      ))}
      {history.length > historyLimit && <Button title={`See ${history.length - historyLimit} older experiments with Pro`} variant="ghost" onPress={() => router.push("/paywall")} />}

      <SectionHeader title="Brand evolution" action="All" onAction={() => router.push("/brand/history")} />
      {(decisions.data ?? []).slice(0, 4).map((d) => (
        <Row key={d.id} align="flex-start">
          <Badge label={new Date(d.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
          <Text variant="small" style={{ flex: 1 }}>
            {d.decision}
          </Text>
        </Row>
      ))}
      {!decisions.data?.length && <Text color={colors.muted}>Your strategic decisions will appear here.</Text>}
    </Screen>
  );
}
