import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Notice } from "@/components/states";
import { Button, Stack, Text } from "@/components/ui";
import type { AppError } from "@/lib/errors";
import { useGenerateBlueprint } from "@/lib/queries";
import { colors, space } from "@/theme/tokens";

const MESSAGES = ["Reading your answers…", "Finding what makes you different…", "Drafting your content pillars…", "Planning your first week…"];

export default function GenerateBlueprint() {
  const gen = useGenerateBlueprint();
  const started = useRef(false);
  const [msg, setMsg] = useState(0);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    gen.mutate(undefined, { onSuccess: (r) => router.replace({ pathname: "/brand/blueprint", params: { id: r.blueprint.id, onboarding: "1" } }) });
  }, [gen]);

  useEffect(() => {
    const t = setInterval(() => setMsg((m) => (m + 1) % MESSAGES.length), 2500);
    return () => clearInterval(t);
  }, []);

  const err = gen.error as AppError | null;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: space.xxl, justifyContent: "center" }}>
        {err ? (
          <Stack>
            <Notice tone="danger" title="We couldn't generate your blueprint" body={err.message} />
            {err.upgrade && <Button title="See TapKit Pro" onPress={() => router.push("/paywall")} />}
            <Button title="Try again" onPress={() => gen.mutate(undefined, { onSuccess: (r) => router.replace({ pathname: "/brand/blueprint", params: { id: r.blueprint.id, onboarding: "1" } }) })} />
            <Button title="Edit my answers" variant="secondary" onPress={() => router.replace("/onboarding")} />
          </Stack>
        ) : (
          <Stack gap={space.lg} style={{ alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text variant="title" center accessibilityLiveRegion="polite">
              {MESSAGES[msg]}
            </Text>
            <Text color={colors.muted} center>
              This usually takes less than a minute. Your answers are saved, so you can leave and come back.
            </Text>
          </Stack>
        )}
      </View>
    </SafeAreaView>
  );
}
