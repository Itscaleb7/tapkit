import { LEAD_ACTIVITY_KINDS, LEAD_KINDS, LEAD_STAGES, labelOf, type LeadActivityKind } from "@tapkit/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking } from "react-native";
import { Field, Input } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { ErrorState, Loading } from "@/components/states";
import { Badge, Button, Card, Chip, ChipGroup, Row, SectionHeader, Stack, Text } from "@/components/ui";
import { useAddLeadActivity, useDeleteLead, useLead, useLeadActivities, useSaveLead } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";
import { alert } from "@/lib/confirm";

const ACTIVITY_LABEL: Record<LeadActivityKind, string> = { outreach: "Outreach", reply: "Reply", meeting: "Meeting", proposal: "Proposal", note: "Note", outcome: "Outcome" };

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lead = useLead(id);
  const activities = useLeadActivities(id);
  const add = useAddLeadActivity();
  const save = useSaveLead();
  const del = useDeleteLead();
  const [kind, setKind] = useState<LeadActivityKind>("outreach");
  const [summary, setSummary] = useState("");

  if (lead.isLoading) return <Loading />;
  if (lead.error || !lead.data) return <ErrorState error={lead.error ?? "Not found"} onRetry={() => lead.refetch()} />;
  const l = lead.data;

  const log = () => {
    if (!summary.trim()) return;
    add.mutate({ lead_id: l.id, kind, summary: summary.trim() }, { onSuccess: () => setSummary("") });
  };

  return (
    <Screen edges={["bottom"]}>
      <Row style={{ justifyContent: "space-between" }} align="flex-start">
        <Stack gap={2} style={{ flex: 1 }}>
          <Text variant="title">{l.name}</Text>
          {l.company && <Text color={colors.muted}>{l.company}</Text>}
        </Stack>
        <Button title="Edit" size="sm" variant="secondary" onPress={() => router.push({ pathname: "/leads/edit", params: { id: l.id } })} />
      </Row>
      <Row gap={6} style={{ flexWrap: "wrap" }}>
        <Badge label={labelOf(LEAD_KINDS, l.kind)} />
        {l.source === "portfolio_enquiry" && <Badge label="Portfolio enquiry" tone="brand" icon="globe-outline" />}
        {l.next_follow_up && <Badge label={`Follow up ${l.next_follow_up}`} tone="warning" />}
      </Row>
      {l.enquiry_message && (
        <Card tone="brand">
          <Text variant="overline" color={colors.brandText}>
            Their message
          </Text>
          <Text style={{ marginTop: 4 }}>{l.enquiry_message}</Text>
        </Card>
      )}
      <Field label="Stage">
        <Row gap={space.sm} style={{ flexWrap: "wrap" }}>
          {LEAD_STAGES.map((s) => (
            <Chip key={s.id} label={s.label} selected={l.stage === s.id} onPress={() => save.mutate({ id: l.id, stage: s.id })} />
          ))}
        </Row>
      </Field>
      {(l.email || l.url) && (
        <Row gap={space.sm}>
          {l.email && <Button title="Email" icon="mail-outline" size="sm" variant="secondary" onPress={() => Linking.openURL(`mailto:${l.email}`)} />}
          {l.url && <Button title="Open link" icon="open-outline" size="sm" variant="secondary" onPress={() => Linking.openURL(l.url!)} />}
        </Row>
      )}
      {l.notes && (
        <Card tone="muted">
          <Text variant="small">{l.notes}</Text>
        </Card>
      )}

      <SectionHeader title="Activity" />
      <Card>
        <Stack gap={space.sm}>
          <ChipGroup options={LEAD_ACTIVITY_KINDS.map((k) => ({ id: k, label: ACTIVITY_LABEL[k] }))} value={[kind]} onChange={(v) => v[0] && setKind(v[0])} />
          <Input value={summary} onChangeText={setSummary} placeholder="What happened?" multiline multilineHeight={70} maxLength={1000} />
          <Button title="Log activity" size="sm" style={{ alignSelf: "flex-start" }} loading={add.isPending} onPress={log} />
        </Stack>
      </Card>
      {(activities.data ?? []).map((a) => (
        <Row key={a.id} align="flex-start">
          <Badge label={ACTIVITY_LABEL[a.kind]} tone="info" />
          <Stack gap={2} style={{ flex: 1 }}>
            <Text variant="small">{a.summary}</Text>
            <Text variant="caption" color={colors.subtle}>
              {new Date(a.occurred_at).toLocaleString()}
            </Text>
          </Stack>
        </Row>
      ))}
      <Button
        title="Delete"
        variant="danger"
        onPress={() => alert("Delete this opportunity?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => del.mutate(l.id, { onSuccess: () => router.back() }) }])}
      />
    </Screen>
  );
}
