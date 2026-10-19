import { Ionicons } from "@expo/vector-icons";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { colors, space } from "@/theme/tokens";
import { Notice } from "./states";
import { Button, Text, tap } from "./ui";

const MAX_MS = 10 * 60 * 1000;
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

/** Records an m4a voice note. Calls onRecorded with the local file uri and duration. */
export function VoiceRecorder({ onRecorded, recordedUri, onDiscard }: { onRecorded: (uri: string, durationMs: number) => void; recordedUri?: string | null; onDiscard: () => void }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string>();

  const start = async () => {
    setError(undefined);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return setDenied(true);
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      tap();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const stop = async () => {
    const duration = state.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    tap();
    if (recorder.uri) onRecorded(recorder.uri, Math.min(duration, MAX_MS));
  };

  useEffect(() => {
    if (state.isRecording && state.durationMillis >= MAX_MS) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isRecording, state.durationMillis]);

  if (denied) {
    return <Notice tone="warning" title="Microphone access is off" body="Enable it in Settings to record voice notes, or type your note instead." action="Open Settings" onAction={() => Linking.openSettings()} />;
  }

  if (recordedUri && !state.isRecording) {
    return (
      <View style={styles.box}>
        <Ionicons name="checkmark-circle" size={28} color={colors.success} />
        <Text variant="bodyStrong">Voice note recorded</Text>
        <Button title="Record again" variant="ghost" size="sm" onPress={onDiscard} />
      </View>
    );
  }

  return (
    <View style={styles.box}>
      {error && <Notice tone="danger" title={error} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state.isRecording ? "Stop recording" : "Start recording"}
        onPress={state.isRecording ? stop : start}
        style={[styles.mic, state.isRecording && { backgroundColor: colors.danger }]}
      >
        <Ionicons name={state.isRecording ? "stop" : "mic"} size={36} color={colors.white} />
      </Pressable>
      <Text variant="heading" accessibilityLiveRegion="polite">
        {state.isRecording ? fmt(state.durationMillis) : "Tap to record"}
      </Text>
      <Text variant="small" color={colors.muted} center>
        Talk it through like you'd tell a friend. Up to 10 minutes.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", gap: space.sm, padding: space.xl, backgroundColor: colors.surface, borderRadius: 20 },
  mic: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
});
