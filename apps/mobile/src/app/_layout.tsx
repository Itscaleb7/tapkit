import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from "@expo-google-fonts/inter";
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConfigNeeded } from "@/components/ConfigNeeded";
import { OutboxSync } from "@/components/OutboxSync";
import { AuthProvider, useAuth } from "@/lib/auth";
import { isBackendConfigured } from "@/lib/config";
import "@/lib/network";
import { colors, fonts } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { session, initialising } = useAuth();
  useEffect(() => {
    if (!initialising) SplashScreen.hideAsync().catch(() => undefined);
  }, [initialising]);
  if (initialising) return null;
  const signedIn = !!session;
  const modal = { presentation: "modal" as const, headerShown: true };
  return (
    <>
      {signedIn && <OutboxSync />}
      <Stack
        screenOptions={{
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="proof/new" options={{ ...modal, title: "Capture" }} />
          <Stack.Screen name="proof/[id]" options={{ title: "Proof Bank entry" }} />
          <Stack.Screen name="content/new" options={{ ...modal, title: "Create content" }} />
          <Stack.Screen name="content/[id]/index" options={{ title: "Content" }} />
          <Stack.Screen name="content/[id]/editor" options={{ title: "Edit slides" }} />
          <Stack.Screen name="content/[id]/export" options={{ ...modal, title: "Export" }} />
          <Stack.Screen name="content/[id]/results" options={{ ...modal, title: "Record results" }} />
          <Stack.Screen name="brand/blueprint" options={{ title: "Brand Blueprint" }} />
          <Stack.Screen name="brand/edit" options={{ ...modal, title: "Edit brand" }} />
          <Stack.Screen name="brand/pillars" options={{ title: "Content pillars" }} />
          <Stack.Screen name="brand/history" options={{ title: "Brand history" }} />
          <Stack.Screen name="brand/alternatives" options={{ title: "Alternative positioning" }} />
          <Stack.Screen name="experiments/new" options={{ ...modal, title: "New experiment" }} />
          <Stack.Screen name="experiments/[id]" options={{ title: "Experiment" }} />
          <Stack.Screen name="reviews/[id]" options={{ title: "Weekly review" }} />
          <Stack.Screen name="offers/edit" options={{ ...modal, title: "Offer" }} />
          <Stack.Screen name="portfolio/edit" options={{ title: "Portfolio" }} />
          <Stack.Screen name="leads/edit" options={{ ...modal, title: "Opportunity" }} />
          <Stack.Screen name="leads/[id]" options={{ title: "Opportunity" }} />
          <Stack.Screen name="paywall" options={{ presentation: "modal", headerShown: false }} />
          <Stack.Screen name="settings/index" options={{ title: "Settings" }} />
          <Stack.Screen name="settings/subscription" options={{ title: "Subscription" }} />
          <Stack.Screen name="settings/account" options={{ title: "Account" }} />
          <Stack.Screen name="settings/privacy" options={{ title: "Privacy & data" }} />
          <Stack.Screen name="settings/help" options={{ title: "Help" }} />
        </Stack.Protected>
        <Stack.Screen name="reset-password" options={{ title: "New password" }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: (count, err) => count < 2 && (err as { code?: string })?.code !== "unauthenticated", staleTime: 15_000 },
          mutations: { retry: 0 },
        },
      }),
  );
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    DMSerifDisplay_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {!isBackendConfigured ? (
          <ConfigNeeded />
        ) : (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </QueryClientProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
