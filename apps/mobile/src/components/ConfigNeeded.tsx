import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, space } from "@/theme/tokens";
import { Text } from "./ui";

/** Shown instead of crashing when a build is missing its backend configuration. */
export function ConfigNeeded() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: space.xxl, gap: space.md, flex: 1, justifyContent: "center" }}>
        <Text variant="title">TapKit isn't configured yet</Text>
        <Text color={colors.muted}>
          This build is missing EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to apps/mobile/.env (see .env.example) and restart the
          bundler.
        </Text>
      </View>
    </SafeAreaView>
  );
}
