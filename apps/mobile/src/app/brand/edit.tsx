import { BRAND_STAGES, brandProfileUpdateSchema, MONETISATION_INTERESTS, PLATFORMS } from "@tapkit/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Field, Input, TagInput } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { Loading, Notice } from "@/components/states";
import { Button, ChipGroup, Text } from "@/components/ui";
import { useBrand, useSaveBrand } from "@/lib/queries";
import { colors } from "@/theme/tokens";

type Kind = "text" | "long" | "tags" | "stage" | "platforms" | "monetisation";
const FIELDS: Record<string, { label: string; kind: Kind; max?: number; hint?: string }> = {
  positioning: { label: "Positioning", kind: "long", max: 400, hint: "One or two sentences: who you help, with what, and how you're different." },
  audience: { label: "Audience", kind: "long", max: 600 },
  brand_promise: { label: "Brand promise", kind: "long", max: 300, hint: "What people can count on from you." },
  differentiators: { label: "Differentiators", kind: "tags" },
  voice_summary: { label: "Tone of voice", kind: "long", max: 300 },
  values: { label: "Values", kind: "tags" },
  goals: { label: "Goals", kind: "tags", hint: "Specific outcomes, e.g. “3 paying clients by June”." },
  platforms: { label: "Platforms", kind: "platforms" },
  stage: { label: "Current stage", kind: "stage" },
  long_term_objectives: { label: "Long-term objectives", kind: "long", max: 800 },
  monetisation_interests: { label: "Monetisation interests", kind: "monetisation" },
  visual_preferences: { label: "Visual preferences", kind: "long", max: 400, hint: "Colours, mood, styles you like — used to suggest carousel themes." },
};

export default function EditBrandField() {
  const { field = "positioning" } = useLocalSearchParams<{ field: string }>();
  const def = FIELDS[field];
  const brand = useBrand();
  const save = useSaveBrand();
  const [value, setValue] = useState<string | string[]>("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (brand.data && def) setValue((brand.data as unknown as Record<string, string | string[] | null>)[field] ?? (def.kind === "text" || def.kind === "long" || def.kind === "stage" ? "" : []));
  }, [brand.data, field, def]);

  if (!def) return <Notice tone="danger" title="Unknown field" />;
  if (brand.isLoading) return <Loading />;

  const submit = () => {
    const patch = { [field]: value };
    const parsed = brandProfileUpdateSchema.safeParse(patch);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    save.mutate({ patch: parsed.data, summary: `Updated ${def.label.toLowerCase()}` }, { onSuccess: () => router.back(), onError: (e) => setError((e as Error).message) });
  };

  return (
    <Screen edges={["bottom"]} footer={<Button title="Save" size="lg" loading={save.isPending} onPress={submit} />}>
      <Text variant="title">{def.label}</Text>
      <Text variant="small" color={colors.muted}>
        Your previous version is kept in Brand history.
      </Text>
      {error && <Notice tone="danger" title={error} />}
      <Field label={def.label} hint={def.hint}>
        {def.kind === "long" || def.kind === "text" ? (
          <Input value={value as string} onChangeText={setValue} multiline={def.kind === "long"} maxLength={def.max} autoFocus accessibilityLabel={def.label} />
        ) : def.kind === "tags" ? (
          <TagInput value={value as string[]} onChange={setValue} />
        ) : def.kind === "stage" ? (
          <ChipGroup options={BRAND_STAGES} value={value ? [value as never] : []} onChange={(v) => setValue(v[0] ?? "")} />
        ) : def.kind === "platforms" ? (
          <ChipGroup options={PLATFORMS} value={value as never[]} onChange={setValue} multiple />
        ) : (
          <ChipGroup options={MONETISATION_INTERESTS} value={value as never[]} onChange={setValue} multiple />
        )}
      </Field>
    </Screen>
  );
}
