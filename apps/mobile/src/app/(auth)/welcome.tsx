import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Text } from "@/components/ui";
import { colors, radius, space } from "@/theme/tokens";

const STEPS = [
  { icon: "compass-outline", title: "Discover your brand", body: "Find what you should be known for — even from zero." },
  { icon: "archive-outline", title: "Capture real experiences", body: "Your Proof Bank turns lessons into content no one can copy." },
  { icon: "albums-outline", title: "Create & learn", body: "Make carousels, record results, and improve every week." },
] as const;

export default function Welcome() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.brand }}>
      <View style={styles.hero}>
        <View style={styles.logo} accessibilityLabel="TapKit logo">
          <Text variant="display" color={colors.brand}>
            T
          </Text>
        </View>
        <Text variant="display" color={colors.white} style={{ fontSize: 40, lineHeight: 46 }} accessibilityRole="header">
          Build your personal brand from zero.
        </Text>
        <Text variant="body" color="#FFE3D1">
          TapKit helps you decide what to be known for, create content from your real experiences, and turn your reputation into opportunities.
        </Text>
      </View>
      <View style={styles.sheet}>
        {STEPS.map((s) => (
          <View key={s.title} style={styles.step}>
            <View style={styles.stepIcon}>
              <Ionicons name={s.icon} size={20} color={colors.brandText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{s.title}</Text>
              <Text variant="small" color={colors.muted}>
                {s.body}
              </Text>
            </View>
          </View>
        ))}
        <View style={{ gap: space.sm, marginTop: space.md }}>
          <Button title="Get started — it's free" size="lg" onPress={() => router.push("/(auth)/sign-up")} />
          <Button title="I already have an account" variant="ghost" onPress={() => router.push("/(auth)/sign-in")} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, padding: space.xxl, justifyContent: "center", gap: space.lg },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl + 8, borderTopRightRadius: radius.xl + 8, padding: space.xxl, gap: space.lg, paddingBottom: space.xxxl },
  step: { flexDirection: "row", gap: space.md, alignItems: "center" },
  stepIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
});
