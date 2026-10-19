import { LEAD_KINDS, LEAD_STAGES, type LeadKind, leadInputSchema, type LeadStage } from "@tapkit/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Field, Input } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { Notice } from "@/components/states";
import { Button, ChipGroup, Text } from "@/components/ui";
import { useLead, useOffers, useSaveLead } from "@/lib/queries";
import { colors } from "@/theme/tokens";

export default function EditLead() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const lead = useLead(id ?? "");
  const offers = useOffers();
  const save = useSaveLead();
  const [f, setF] = useState({ name: "", company: "", kind: "client" as LeadKind, stage: "identified" as LeadStage, email: "", url: "", notes: "", next_follow_up: "", offer_id: null as string | null });
  const [error, setError] = useState<string>();

  useEffect(() => {
    const l = lead.data;
    if (l) setF({ name: l.name, company: l.company ?? "", kind: l.kind, stage: l.stage, email: l.email ?? "", url: l.url ?? "", notes: l.notes ?? "", next_follow_up: l.next_follow_up ?? "", offer_id: l.offer_id });
  }, [lead.data]);

  const submit = () => {
    const parsed = leadInputSchema.safeParse({ ...f, email: f.email || null, url: f.url || null, next_follow_up: f.next_follow_up || null });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    save.mutate({ id, ...parsed.data }, { onSuccess: (l) => router.replace(`/leads/${l.id}`), onError: (e) => setError((e as Error).message) });
  };

  return (
    <Screen edges={["bottom"]} footer={<Button title="Save" size="lg" loading={save.isPending} onPress={submit} />}>
      <Text variant="small" color={colors.muted}>
        Track real conversations you start or receive. TapKit doesn't send messages for you or collect contact details from other sites.
      </Text>
      {error && <Notice tone="danger" title={error} />}
      <Field label="Name">
        <Input value={f.name} onChangeText={(t) => setF({ ...f, name: t })} maxLength={120} />
      </Field>
      <Field label="Company" optional>
        <Input value={f.company} onChangeText={(t) => setF({ ...f, company: t })} maxLength={120} />
      </Field>
      <Field label="Type">
        <ChipGroup options={LEAD_KINDS} value={[f.kind]} onChange={(v) => v[0] && setF({ ...f, kind: v[0] })} />
      </Field>
      <Field label="Stage">
        <ChipGroup options={LEAD_STAGES} value={[f.stage]} onChange={(v) => v[0] && setF({ ...f, stage: v[0] })} />
      </Field>
      {(offers.data?.length ?? 0) > 0 && (
        <Field label="Related offer" optional>
          <ChipGroup options={(offers.data ?? []).map((o) => ({ id: o.id, label: o.title }))} value={f.offer_id ? [f.offer_id] : []} onChange={(v) => setF({ ...f, offer_id: v[0] ?? null })} />
        </Field>
      )}
      <Field label="Email" optional>
        <Input value={f.email} onChangeText={(t) => setF({ ...f, email: t })} autoCapitalize="none" keyboardType="email-address" />
      </Field>
      <Field label="Link" optional>
        <Input value={f.url} onChangeText={(t) => setF({ ...f, url: t })} autoCapitalize="none" keyboardType="url" placeholder="https://" />
      </Field>
      <Field label="Next follow-up" optional hint="YYYY-MM-DD">
        <Input value={f.next_follow_up} onChangeText={(t) => setF({ ...f, next_follow_up: t })} maxLength={10} keyboardType="numbers-and-punctuation" />
      </Field>
      <Field label="Notes" optional>
        <Input value={f.notes} onChangeText={(t) => setF({ ...f, notes: t })} multiline maxLength={2000} />
      </Field>
    </Screen>
  );
}
