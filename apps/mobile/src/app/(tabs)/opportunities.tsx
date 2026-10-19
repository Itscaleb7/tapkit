import { labelOf, LEAD_STAGES, OFFER_TYPES, portfolioUrl } from "@tapkit/core";
import { router } from "expo-router";
import { Share, View } from "react-native";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, Loading } from "@/components/states";
import { Badge, Button, Card, Row, SectionHeader, Stack, Text } from "@/components/ui";
import { config } from "@/lib/config";
import { useLeads, useOffers, usePortfolio } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

const ACTIVE_STAGES = ["identified", "contacted", "replied", "meeting", "proposal"];

export default function Opportunities() {
  const offers = useOffers();
  const portfolio = usePortfolio();
  const leads = useLeads();

  if (offers.isLoading || portfolio.isLoading) return <Loading />;
  if (offers.error) return <ErrorState error={offers.error} onRetry={() => offers.refetch()} />;

  const p = portfolio.data;
  const url = p ? portfolioUrl(config.webUrl, p.slug) : null;
  const today = new Date().toISOString().slice(0, 10);
  const followUps = (leads.data ?? []).filter((l) => l.next_follow_up && l.next_follow_up <= today && ACTIVE_STAGES.includes(l.stage));
  const enquiries = (leads.data ?? []).filter((l) => l.source === "portfolio_enquiry" && l.stage === "identified");

  return (
    <Screen title="Opportunities" subtitle="Turn your reputation into real work." refreshing={offers.isRefetching} onRefresh={() => { offers.refetch(); portfolio.refetch(); leads.refetch(); }}>
      <SectionHeader title="Public portfolio" />
      <Card tone={p?.is_published ? "default" : "brand"}>
        {p ? (
          <Stack gap={space.sm}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text variant="bodyStrong">{p.display_name}</Text>
              <Badge label={p.is_published ? "Live" : "Not published"} tone={p.is_published ? "success" : "neutral"} />
            </Row>
            <Text variant="small" color={colors.brandText} selectable>
              {url}
            </Text>
            <Row gap={space.sm}>
              <Button title="Edit" size="sm" variant="secondary" onPress={() => router.push("/portfolio/edit")} />
              {p.is_published && url && <Button title="Share link" size="sm" icon="share-outline" onPress={() => Share.share({ message: url, url })} />}
            </Row>
          </Stack>
        ) : (
          <Stack gap={space.sm}>
            <Text variant="bodyStrong">Create a shareable portfolio</Text>
            <Text variant="small" color={colors.inkSoft}>
              A simple web page for clients, partners and employers — no app needed to view it. You choose exactly what's public.
            </Text>
            <Button title="Set up portfolio" size="sm" style={{ alignSelf: "flex-start" }} onPress={() => router.push("/portfolio/edit")} />
          </Stack>
        )}
      </Card>

      <SectionHeader title="Offers" action="New" onAction={() => router.push("/offers/edit")} />
      {offers.data?.length ? (
        offers.data.map((o) => (
          <Card key={o.id} onPress={() => router.push({ pathname: "/offers/edit", params: { id: o.id } })} accessibilityLabel={o.title}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {o.title}
              </Text>
              <Badge label={o.status} tone={o.status === "active" ? "success" : "neutral"} />
            </Row>
            <Text variant="caption" color={colors.muted}>
              {labelOf(OFFER_TYPES, o.offer_type)}
              {o.is_public ? " · On portfolio" : ""}
            </Text>
          </Card>
        ))
      ) : (
        <EmptyState icon="pricetags-outline" title="Define what you offer" body="Freelance service, coaching, a digital product or a 'hire me' pitch — make it clear and honest." action="Build an offer" onAction={() => router.push("/offers/edit")} />
      )}

      <SectionHeader title="Pipeline" action="Add" onAction={() => router.push("/leads/edit")} />
      {enquiries.length > 0 && (
        <Card tone="brand" onPress={() => router.push(`/leads/${enquiries[0]!.id}`)} accessibilityLabel="New portfolio enquiry">
          <Text variant="bodyStrong">
            {enquiries.length} new enquir{enquiries.length > 1 ? "ies" : "y"} from your portfolio
          </Text>
        </Card>
      )}
      {followUps.length > 0 && (
        <Card tone="muted">
          <Text variant="smallStrong">Follow-ups due</Text>
          {followUps.map((l) => (
            <Button key={l.id} title={`${l.name}${l.company ? ` · ${l.company}` : ""}`} variant="ghost" size="sm" style={{ alignSelf: "flex-start" }} onPress={() => router.push(`/leads/${l.id}`)} />
          ))}
        </Card>
      )}
      {leads.data?.length ? (
        LEAD_STAGES.map((stage) => {
          const items = (leads.data ?? []).filter((l) => l.stage === stage.id);
          if (!items.length) return null;
          return (
            <View key={stage.id} style={{ gap: space.sm }}>
              <Text variant="overline" color={colors.muted}>
                {stage.label} · {items.length}
              </Text>
              {items.map((l) => (
                <Card key={l.id} onPress={() => router.push(`/leads/${l.id}`)} accessibilityLabel={l.name}>
                  <Row style={{ justifyContent: "space-between" }}>
                    <Text variant="bodyStrong" style={{ flex: 1 }}>
                      {l.name}
                      {l.company ? <Text variant="small" color={colors.muted}>{`  ${l.company}`}</Text> : null}
                    </Text>
                    {l.next_follow_up && <Badge label={`Follow up ${l.next_follow_up}`} tone={l.next_follow_up <= today ? "warning" : "neutral"} />}
                  </Row>
                </Card>
              ))}
            </View>
          );
        })
      ) : (
        <EmptyState icon="people-outline" title="Track your opportunities" body="Potential clients, partners, recruiters — log outreach, replies and follow-ups in one place." action="Add an opportunity" onAction={() => router.push("/leads/edit")} />
      )}
    </Screen>
  );
}
