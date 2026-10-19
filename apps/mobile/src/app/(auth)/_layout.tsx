import { Stack } from "expo-router";
import { colors, fonts } from "@/theme/tokens";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.semibold },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ title: "" }} />
      <Stack.Screen name="sign-up" options={{ title: "" }} />
      <Stack.Screen name="forgot-password" options={{ title: "" }} />
    </Stack>
  );
}
