import { OFFER_TYPES, type OfferAssist, offerInputSchema, type OfferType } from "@tapkit/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { alert } from "@/lib/confirm";

import { Field, Input, TagInput, ToggleRow } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { Loading, Notice } from "@/components/states";
import { Button, Card, Chip, ChipGroup, Row, Stack, Text } from "@/components/ui";
import { useIsPro } from "@/lib/entitlement";
import type { AppError } from "@/lib/errors";
import { useDeleteOffer, useOfferAssist, useOffers, useProofEntries, useSaveOffer } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

interface Draft {
  title: string;
  offer_type: OfferType;
  audience: string;
  problem: string;
  deliverables: string[];
  pricing_hypothesis: string;
  differentiation: string;
  description: string;
  evidence_entry_ids: string[];
  status: "draft" | "active" | "archived";
  is_public: boolean;
  cta_url: string;
}

const empty: Draft = { title: "", offer_type: "freelance", audience: "", problem: "", deliverables: [], pricing_hypothesis: "", differentiation: "", description: "", evidence_entry_ids: [], status: "draft", is_public: false, cta_url: "" };

export default function EditOffer() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const offers = useOffers();
  const proof = useProofEntries({});
  const save = useSaveOffer();
  const del = useDeleteOffer();
  const assist = useOfferAssist();
  const isPro = useIsPro();
  const [d, setD] = useState<Draft>(empty);
  const [suggestion, setSuggestion] = useState<OfferAssist | null>(null);
  const [error, setError] = useState<string>();
  const existing = offers.data?.find((o) => o.id === id);

  useEffect(() => {
    if (existing)
      setD({
        title: existing.title,
        offer_type: existing.offer_type,
        audience: existing.audience ?? "",
        problem: existing.problem ?? "",
        deliverables: existing.deliverables,
        pricing_hypothesis: existing.pricing_hypothesis ?? "",
        differentiation: existing.differentiation ?? "",
        description: existing.description ?? "",
        evidence_entry_ids: existing.evidence_entry_ids,
        status: existing.status,
        is_public: existing.is_public,
        cta_url: existing.cta_url ?? "",
      });
  }, [existing]);

  if (id && offers.isLoading) return <Loading />;
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  const submit = () => {
    const parsed = offerInputSchema.safeParse({ ...d, cta_url: d.cta_url || null });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    save.mutate({ id, ...parsed.data }, { onSuccess: () => router.back(), onError: (e) => setError((e as Error).message) });
  };

  const runAssist = () => {
    if (!isPro) return router.push("/paywall");
    assist.mutate({ draft: { ...d, cta_url: undefined }, evidence_entry_ids: d.evidence_entry_ids }, { onSuccess: setSuggestion });
  };

  const apply = () => {
    if (!suggestion) return;
    set({
      title: suggestion.title,
      audience: suggestion.audience,
      problem: suggestion.problem,
      deliverables: suggestion.deliverables,
      pricing_hypothesis: suggestion.pricing_hypothesis,
      differentiation: suggestion.differentiation,
      description: suggestion.description,
    });
    setSuggestion(null);
  };

  return (
    <Screen edges={["bottom"]} footer={<Button title="Save offer" size="lg" loading={save.isPending} onPress={submit} />}>
      {error && <Notice tone="danger" title={error} action={/limit/i.test(error) ? "See TapKit Pro" : undefined} onAction={() => router.push("/paywall")} />}
      <Field label="Offer name">
        <Input value={d.title} onChangeText={(t) => set({ title: t })} maxLength={120} placeholder="e.g. Brand starter session" />
      </Field>
      <Field label="Type">
        <ChipGroup options={OFFER_TYPES} value={[d.offer_type]} onChange={(v) => v[0] && set({ offer_type: v[0] })} />
      </Field>
      <Field label="Who it's for">
        <Input value={d.audience} onChangeText={(t) => set({ audience: t })} multiline multilineHeight={70} maxLength={400} />
      </Field>
      <Field label="Problem it solves">
        <Input value={d.problem} onChangeText={(t) => set({ problem: t })} multiline multilineHeight={70} maxLength={600} />
      </Field>
      <Field label="Deliverables">
        <TagInput value={d.deliverables} onChange={(v) => set({ deliverables: v })} max={10} placeholder="e.g. 60-minute call" />
      </Field>
      <Field label="Pricing hypothesis" hint="A starting point to test with real people — not a market rate.">
        <Input value={d.pricing_hypothesis} onChangeText={(t) => set({ pricing_hypothesis: t })} maxLength={300} placeholder="e.g. Test $150 with my first 3 clients" />
      </Field>
      <Field label="What makes it different">
        <Input value={d.differentiation} onChangeText={(t) => set({ differentiation: t })} multiline multilineHeight={70} maxLength={600} />
      </Field>
      <Field label="Description">
        <Input value={d.description} onChangeText={(t) => set({ description: t })} multiline maxLength={2000} />
      </Field>
      <Field label="Evidence from your Proof Bank" hint="Real experiences that support this offer. Never shown publicly.">
        <Row gap={space.sm} style={{ flexWrap: "wrap" }}>
          {(proof.data ?? []).slice(0, 25).map((e) => (
            <Chip
              key={e.id}
              label={(e.title || e.body || "Entry").slice(0, 40)}
              selected={d.evidence_entry_ids.includes(e.id)}
              onPress={() => set({ evidence_entry_ids: d.evidence_entry_ids.includes(e.id) ? d.evidence_entry_ids.filter((x) => x !== e.id) : [...d.evidence_entry_ids, e.id].slice(0, 10) })}
            />
          ))}
        </Row>
      </Field>

      <Card tone="brand">
        <Stack gap={space.sm}>
          <Text variant="subheading">Offer assistant {isPro ? "" : "· Pro"}</Text>
          <Text variant="small" color={colors.inkSoft}>
            Sharpen your offer using only your real evidence. TapKit flags what proof is missing instead of inventing it.
          </Text>
          {assist.error && <Notice tone="danger" title={(assist.error as AppError).message} />}
          <Button title={isPro ? "Improve with TapKit" : "Unlock with Pro"} icon="sparkles" size="sm" style={{ alignSelf: "flex-start" }} loading={assist.isPending} onPress={runAssist} />
        </Stack>
      </Card>
      {suggestion && (
        <Card>
          <Stack gap={space.sm}>
            <Text variant="overline" color={colors.brandText}>
              Suggested draft
            </Text>
            <Text variant="bodyStrong">{suggestion.title}</Text>
            <Text variant="small">{suggestion.description}</Text>
            <Text variant="small">
              <Text variant="smallStrong">Pricing to test: </Text>
              {suggestion.pricing_hypothesis}
            </Text>
            <Text variant="smallStrong">Validate it by:</Text>
            {suggestion.validation_steps.map((s, i) => (
              <Text key={i} variant="small">
                • {s}
              </Text>
            ))}
            {suggestion.missing_evidence.length > 0 && <Notice tone="warning" title="Evidence you could add" body={suggestion.missing_evidence.join("\n")} />}
            <Row gap={space.sm}>
              <Button title="Discard" size="sm" variant="secondary" onPress={() => setSuggestion(null)} />
              <Button title="Apply to form" size="sm" onPress={apply} />
            </Row>
          </Stack>
        </Card>
      )}

      <Field label="Status">
        <ChipGroup options={[{ id: "draft", label: "Draft" }, { id: "active", label: "Active" }, { id: "archived", label: "Archived" }]} value={[d.status]} onChange={(v) => v[0] && set({ status: v[0] as Draft["status"] })} />
      </Field>
      <ToggleRow label="Show on my public portfolio" hint="Only active offers are shown." value={d.is_public} onChange={(v) => set({ is_public: v })} />
      {d.is_public && (
        <Field label="Booking / enquiry link" optional>
          <Input value={d.cta_url} onChangeText={(t) => set({ cta_url: t })} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        </Field>
      )}
      {id && (
        <Button
          title="Delete offer"
          variant="danger"
          onPress={() => alert("Delete offer?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => del.mutate(id, { onSuccess: () => router.back() }) }])}
        />
      )}
    </Screen>
  );
}
