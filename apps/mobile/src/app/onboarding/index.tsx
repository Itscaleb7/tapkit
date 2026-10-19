import { COMMUNICATION_STYLES, MONETISATION_INTERESTS, type OnboardingAnswers, onboardingReadiness, PLATFORMS, PRIMARY_GOALS, BRAND_STAGES } from "@tapkit/core";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Field, Input, TagInput, ToggleRow } from "@/components/forms";
import { Screen } from "@/components/Screen";
import { ErrorState, Loading, Notice } from "@/components/states";
import { Button, Card, ChipGroup, IconButton, ProgressBar, Row, Stack, Text, tap } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useOnboarding, useProfile, useSaveOnboarding } from "@/lib/queries";
import { colors, radius, space } from "@/theme/tokens";

const INTEREST_IDEAS = ["Fitness", "Design", "Startups", "Marketing", "Cooking", "Personal finance", "Productivity", "Tech", "Writing", "Career growth", "Mental health", "Travel"];
const SKILL_IDEAS = ["Teaching", "Writing", "Coding", "Sales", "Photography", "Coaching", "Research", "Public speaking", "Project management", "Video editing"];
const PERSONALITY = ["Curious", "Honest", "Funny", "Calm", "Ambitious", "Thoughtful", "Energetic", "Nerdy", "Rebellious", "Kind"] as const;

type StepProps = { a: OnboardingAnswers; set: (patch: Partial<OnboardingAnswers>) => void };

const STEPS: { title: string; subtitle: string; canSkip: boolean; render: (p: StepProps) => React.ReactNode; valid?: (a: OnboardingAnswers) => boolean }[] = [
  {
    title: "What do you want your personal brand to do for you?",
    subtitle: "Pick the one that matters most right now. You can change it later.",
    canSkip: false,
    valid: (a) => !!a.primaryGoal,
    render: ({ a, set }) => (
      <Stack>
        {PRIMARY_GOALS.map((g) => {
          const selected = a.primaryGoal === g.id;
          return (
            <Pressable
              key={g.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                tap();
                set({ primaryGoal: g.id });
              }}
              style={{ padding: space.lg, borderRadius: radius.md, borderWidth: 1.5, borderColor: selected ? colors.brand : colors.border, backgroundColor: selected ? colors.brandSoft : colors.white }}
            >
              <Text variant="bodyStrong">{g.label}</Text>
            </Pressable>
          );
        })}
        <Field label="Anything specific?" optional>
          <Input value={a.goalDetail ?? ""} onChangeText={(t) => set({ goalDetail: t })} placeholder="e.g. land 3 freelance design clients this year" multiline multilineHeight={80} maxLength={600} />
        </Field>
      </Stack>
    ),
  },
  {
    title: "Where are you starting from?",
    subtitle: "No judgement — most TapKit users start with zero followers.",
    canSkip: false,
    valid: (a) => !!a.stage,
    render: ({ a, set }) => (
      <Stack>
        {BRAND_STAGES.map((s) => {
          const selected = a.stage === s.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                tap();
                set({ stage: s.id, startingFromZero: s.id === "starting" ? true : a.startingFromZero });
              }}
              style={{ padding: space.lg, borderRadius: radius.md, borderWidth: 1.5, borderColor: selected ? colors.brand : colors.border, backgroundColor: selected ? colors.brandSoft : colors.white }}
            >
              <Text variant="bodyStrong">{s.label}</Text>
              <Text variant="small" color={colors.muted}>
                {s.detail}
              </Text>
            </Pressable>
          );
        })}
        <ToggleRow label="I don't have a portfolio or audience yet" value={!!a.startingFromZero} onChange={(v) => set({ startingFromZero: v })} />
      </Stack>
    ),
  },
  {
    title: "What are you into?",
    subtitle: "Interests and hobbies — big or small. These often become your best content.",
    canSkip: false,
    valid: (a) => (a.interests?.length ?? 0) + (a.hobbies?.length ?? 0) > 0,
    render: ({ a, set }) => (
      <Stack>
        <Field label="Interests">
          <TagInput value={a.interests ?? []} onChange={(v) => set({ interests: v })} suggestions={INTEREST_IDEAS} placeholder="Add an interest" />
        </Field>
        <Field label="Hobbies" optional>
          <TagInput value={a.hobbies ?? []} onChange={(v) => set({ hobbies: v })} placeholder="e.g. bouldering, baking" />
        </Field>
      </Stack>
    ),
  },
  {
    title: "What are you good at?",
    subtitle: "Skills you use, and things you know more about than most people around you.",
    canSkip: true,
    render: ({ a, set }) => (
      <Stack>
        <Field label="Skills">
          <TagInput value={a.skills ?? []} onChange={(v) => set({ skills: v })} suggestions={SKILL_IDEAS} placeholder="Add a skill" />
        </Field>
        <Field label="Knowledge" optional hint="What do friends or colleagues ask you about?">
          <Input value={a.knowledge ?? ""} onChangeText={(t) => set({ knowledge: t })} multiline maxLength={1200} placeholder="e.g. how to budget on a student income" />
        </Field>
      </Stack>
    ),
  },
  {
    title: "What have you done so far?",
    subtitle: "Work, study, projects, side-hustles, setbacks. It's fine if it feels small.",
    canSkip: true,
    render: ({ a, set }) => (
      <Stack>
        <Field label="Experience" optional>
          <Input value={a.experience ?? ""} onChangeText={(t) => set({ experience: t })} multiline maxLength={1500} placeholder="e.g. 2 years in retail, learning UX design at night, lost 15kg in 2024" />
        </Field>
        <Field label="Personal ambitions" optional>
          <Input value={a.ambitions ?? ""} onChangeText={(t) => set({ ambitions: t })} multiline multilineHeight={90} maxLength={800} placeholder="What would you love to be true in two years?" />
        </Field>
      </Stack>
    ),
  },
  {
    title: "What could you talk about for hours?",
    subtitle: "Topics you genuinely enjoy discussing.",
    canSkip: true,
    render: ({ a, set }) => <TagInput value={a.enjoyTopics ?? []} onChange={(v) => set({ enjoyTopics: v })} suggestions={[...(a.interests ?? []), ...(a.skills ?? [])]} placeholder="Add a topic" />,
  },
  {
    title: "Who do you want to reach?",
    subtitle: "Describe the people you'd most like to help or impress.",
    canSkip: true,
    render: ({ a, set }) => (
      <Stack>
        <Field label="Intended audience" optional hint="Not sure? Think of yourself two years ago.">
          <Input value={a.intendedAudience ?? ""} onChangeText={(t) => set({ intendedAudience: t })} multiline multilineHeight={90} maxLength={600} placeholder="e.g. early-career designers trying to land their first client" />
        </Field>
        <Field label="Where will you post?">
          <ChipGroup options={PLATFORMS} value={(a.platforms ?? []) as never[]} onChange={(v) => set({ platforms: v })} multiple max={4} />
        </Field>
      </Stack>
    ),
  },
  {
    title: "How do you come across?",
    subtitle: "This shapes your brand voice.",
    canSkip: true,
    render: ({ a, set }) => (
      <Stack>
        <Field label="Personality (pick up to 4)">
          <ChipGroup options={PERSONALITY.map((p) => ({ id: p, label: p }))} value={(a.personality ?? []) as never[]} onChange={(v) => set({ personality: v })} multiple max={4} />
        </Field>
        <Field label="Communication style (up to 3)">
          <ChipGroup options={COMMUNICATION_STYLES.map((p) => ({ id: p, label: p }))} value={(a.communicationStyle ?? []) as never[]} onChange={(v) => set({ communicationStyle: v })} multiple max={3} />
        </Field>
      </Stack>
    ),
  },
  {
    title: "Thinking long-term",
    subtitle: "Where could your reputation take you?",
    canSkip: true,
    render: ({ a, set }) => (
      <Stack>
        <Field label="Long-term objectives" optional>
          <Input value={a.longTermObjectives ?? ""} onChangeText={(t) => set({ longTermObjectives: t })} multiline multilineHeight={90} maxLength={800} placeholder="e.g. go full-time freelance, start a studio, become known in my industry" />
        </Field>
        <Field label="Ways you might earn from it">
          <ChipGroup options={MONETISATION_INTERESTS} value={(a.monetisationInterests ?? []) as never[]} onChange={(v) => set({ monetisationInterests: v })} multiple />
        </Field>
      </Stack>
    ),
  },
];

export default function Onboarding() {
  const { signOut } = useAuth();
  const onboarding = useOnboarding();
  const profile = useProfile();
  const save = useSaveOnboarding();
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [step, setStep] = useState(0);
  const hydrated = useRef(false);

  useEffect(() => {
    if (onboarding.data && !hydrated.current) {
      hydrated.current = true;
      setAnswers({ displayName: profile.data?.display_name ?? undefined, ...onboarding.data.answers });
      setStep(Math.min(onboarding.data.step, STEPS.length));
    }
  }, [onboarding.data, profile.data]);

  if (onboarding.isLoading) return <Loading />;
  if (onboarding.error) return <ErrorState error={onboarding.error} onRetry={() => onboarding.refetch()} />;

  const set = (patch: Partial<OnboardingAnswers>) => setAnswers((prev) => ({ ...prev, ...patch }));
  const persist = (nextStep: number) => save.mutateAsync({ answers, step: nextStep }).catch(() => undefined);
  const go = async (nextStep: number) => {
    await persist(nextStep);
    setStep(nextStep);
  };

  const isReview = step >= STEPS.length;
  const current = STEPS[step];
  const readiness = onboardingReadiness(answers);

  return (
    <Screen
      edges={["top", "bottom"]}
      footer={
        isReview ? (
          <Stack gap={space.sm}>
            <Button title="Generate my Brand Blueprint" icon="sparkles" size="lg" disabled={!readiness.ready} loading={save.isPending} onPress={async () => {
              await persist(STEPS.length);
              router.replace("/onboarding/generate");
            }} />
            <Button title="Back" variant="ghost" onPress={() => setStep(STEPS.length - 1)} />
          </Stack>
        ) : (
          <Row gap={space.sm}>
            {current!.canSkip && <Button title="Skip" variant="secondary" style={{ flex: 1 }} onPress={() => go(step + 1)} />}
            <Button title="Continue" iconRight="arrow-forward" style={{ flex: 2 }} disabled={current!.valid ? !current!.valid(answers) : false} loading={save.isPending} onPress={() => go(step + 1)} />
          </Row>
        )
      }
    >
      <Row style={{ justifyContent: "space-between" }}>
        {step > 0 ? <IconButton icon="chevron-back" label="Previous question" onPress={() => setStep(step - 1)} /> : <View style={{ width: 40 }} />}
        <Text variant="caption" color={colors.muted}>
          {isReview ? "Review" : `${step + 1} of ${STEPS.length}`}
        </Text>
        <Button title="Sign out" variant="ghost" size="sm" onPress={signOut} />
      </Row>
      <ProgressBar value={Math.min(1, step / STEPS.length)} label="Onboarding progress" />
      {isReview ? (
        <Stack>
          <Text variant="title" accessibilityRole="header">
            Ready when you are
          </Text>
          <Text color={colors.muted}>TapKit will draft a strategy from your answers. You'll be able to edit, regenerate or reject anything.</Text>
          {!readiness.ready && <Notice tone="warning" title={`Please add your ${readiness.missing.join(", ")}.`} />}
          <Card tone="muted">
            <Stack gap={space.sm}>
              <Summary label="Goal" value={PRIMARY_GOALS.find((g) => g.id === answers.primaryGoal)?.label} onEdit={() => setStep(0)} />
              <Summary label="Stage" value={BRAND_STAGES.find((s) => s.id === answers.stage)?.label} onEdit={() => setStep(1)} />
              <Summary label="Interests" value={[...(answers.interests ?? []), ...(answers.hobbies ?? [])].join(", ")} onEdit={() => setStep(2)} />
              <Summary label="Skills" value={answers.skills?.join(", ")} onEdit={() => setStep(3)} />
              <Summary label="Topics" value={answers.enjoyTopics?.join(", ")} onEdit={() => setStep(5)} />
              <Summary label="Audience" value={answers.intendedAudience} onEdit={() => setStep(6)} />
            </Stack>
          </Card>
        </Stack>
      ) : (
        <Stack>
          <Text variant="title" accessibilityRole="header">
            {current!.title}
          </Text>
          <Text color={colors.muted}>{current!.subtitle}</Text>
          {current!.render({ a: answers, set })}
        </Stack>
      )}
    </Screen>
  );
}

function Summary({ label, value, onEdit }: { label: string; value?: string | null; onEdit: () => void }) {
  return (
    <Row align="flex-start">
      <View style={{ flex: 1 }}>
        <Text variant="caption" color={colors.muted}>
          {label}
        </Text>
        <Text variant="small">{value || "—"}</Text>
      </View>
      <Button title="Edit" variant="ghost" size="sm" onPress={onEdit} />
    </Row>
  );
}
