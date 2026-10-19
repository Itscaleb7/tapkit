import { createClient } from "@supabase/supabase-js";
import type { Database } from "@tapkit/core";
import { AppState, Platform } from "react-native";
import { config } from "./config";
import { secureStorage } from "./secureStorage";

export const supabase = createClient<Database>(config.supabaseUrl || "http://localhost", config.supabaseAnonKey || "missing", {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

// Refresh tokens only while the app is in the foreground (Supabase guidance for RN).
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
