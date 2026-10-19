import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const config = {
  supabaseUrl: extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  revenueCatIosKey: extra.revenueCatIosKey ?? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "",
  webUrl: extra.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "https://tapkit.app",
  supportEmail: extra.supportEmail ?? process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "support@tapkit.app",
};

export const isBackendConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
export const isBillingConfigured = Boolean(config.revenueCatIosKey);
export const legalUrls = {
  privacy: `${config.webUrl}/privacy`,
  terms: `${config.webUrl}/terms`,
  support: `${config.webUrl}/support`,
  appleEula: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
};
