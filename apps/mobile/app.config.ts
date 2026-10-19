import type { ExpoConfig } from "expo/config";

// Client-safe configuration only. Never put server secrets in EXPO_PUBLIC_* variables:
// they are embedded in the app binary.
const config: ExpoConfig = {
  name: "TapKit",
  slug: "tapkit",
  scheme: "tapkit",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  backgroundColor: "#FFFFFF",
  ios: {
    bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER ?? "app.tapkit.ios",
    buildNumber: "1",
    supportsTablet: false,
    deploymentTarget: "16.4",
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSMicrophoneUsageDescription: "TapKit uses the microphone to record voice notes for your Proof Bank.",
      NSPhotoLibraryAddUsageDescription: "TapKit saves your exported carousel images to your photo library.",
      NSPhotoLibraryUsageDescription: "TapKit lets you choose a profile photo for your public portfolio.",
      ITSAppUsesNonExemptEncryption: false,
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults", NSPrivacyAccessedAPITypeReasons: ["CA92.1"] },
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp", NSPrivacyAccessedAPITypeReasons: ["C617.1"] },
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace", NSPrivacyAccessedAPITypeReasons: ["E174.1"] },
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime", NSPrivacyAccessedAPITypeReasons: ["35F9.1"] },
      ],
    },
  },
  web: { bundler: "metro", output: "single", favicon: "./assets/favicon.png" },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    ["expo-splash-screen", { image: "./assets/splash-icon.png", imageWidth: 180, resizeMode: "contain", backgroundColor: "#FF6A13" }],
    ["expo-audio", { microphonePermission: "TapKit uses the microphone to record voice notes for your Proof Bank." }],
    ["expo-image-picker", { photosPermission: "TapKit lets you choose a profile photo for your public portfolio." }],
    ["expo-media-library", { savePhotosPermission: "TapKit saves your exported carousel images to your photo library.", isAccessMediaLocationEnabled: false }],
  ],
  experiments: { typedRoutes: false },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? "https://tapkit.app",
    supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "support@tapkit.app",
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
};

export default config;
